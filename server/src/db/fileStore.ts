import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { freshStats, statsForRecord } from '../combat/stats.js';
import { isNewerSave, saveSchema, type GameSave } from '../saves/schema.js';
import type { AccountStore, CharacterInput, CharacterRecord, LinkResult, LinkedLogin, NewUser, SocialProvider, UserRecord } from '../domain.js';

type AdventureRow = {
  userId: string;
  payload: GameSave;
};

type FileShape = {
  users: UserRecord[];
  characters: CharacterRecord[];
  adventures: AdventureRow[];
};

/**
 * Local account store. Same fields as the Mongo models, saved as JSON so the
 * game runs before MongoDB is installed. Switch with DB_DRIVER=mongo.
 */
export class FileAccountStore implements AccountStore {
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  createUser(input: NewUser): Promise<UserRecord> {
    return this.update((db) => {
      const user: UserRecord = {
        id: randomUUID(),
        username: input.username,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        createdAt: new Date().toISOString(),
        sessionId: '',
        guest: Boolean(input.guest),
        providers: input.providers ?? [],
      };
      db.users.push(user);
      return user;
    });
  }

  findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.read((db) => db.users.find((user) => user.email === email.toLowerCase()) ?? null);
  }

  findUserByUsername(username: string): Promise<UserRecord | null> {
    return this.read((db) => db.users.find((user) => user.username.toLowerCase() === username.toLowerCase()) ?? null);
  }

  findUserById(id: string): Promise<UserRecord | null> {
    return this.read((db) => db.users.find((user) => user.id === id) ?? null);
  }

  findUserByProvider(provider: SocialProvider, subject: string): Promise<UserRecord | null> {
    return this.read((db) => db.users.find((user) => (user.providers ?? []).some((entry) => entry.provider === provider && entry.subject === subject)) ?? null);
  }

  linkProvider(userId: string, login: LinkedLogin, email: string | null): Promise<LinkResult> {
    return this.update((db) => linkOnto(db.users, userId, login, email));
  }

  setSession(userId: string, sessionId: string): Promise<void> {
    return this.update((db) => {
      const user = db.users.find((entry) => entry.id === userId);
      if (user) user.sessionId = sessionId;
    });
  }

  findCharacterByUserId(userId: string): Promise<CharacterRecord | null> {
    return this.read((db) => db.characters.find((character) => character.userId === userId) ?? null);
  }

  setCharacterStats(userId: string, stats: CharacterRecord['stats']): Promise<void> {
    return this.update((db) => {
      const character = db.characters.find((entry) => entry.userId === userId);
      if (character) character.stats = { ...stats };
    });
  }

  setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    return this.update((db) => {
      const user = db.users.find((entry) => entry.id === userId);
      if (user) user.passwordHash = passwordHash;
    });
  }

  upsertCharacter(userId: string, input: CharacterInput): Promise<CharacterRecord> {
    return this.update((db) => {
      const existing = db.characters.find((character) => character.userId === userId);
      if (!existing) {
        const created: CharacterRecord = {
          id: randomUUID(),
          userId,
          ...input,
          stats: freshStats(),
        };
        db.characters.push(created);
        return created;
      }
      existing.name = input.name;
      existing.gender = input.gender;
      existing.baseAvatarId = input.baseAvatarId;
      existing.hairColor = input.hairColor;
      existing.outfitColor = input.outfitColor;
      existing.startingRegion = input.startingRegion;
      return existing;
    });
  }

  recordResult(userId: string, outcome: 'win' | 'loss' | 'draw'): Promise<void> {
    return this.update((db) => {
      const character = db.characters.find((entry) => entry.userId === userId);
      if (!character || outcome === 'draw') return;
      const wins = character.stats.wins + (outcome === 'win' ? 1 : 0);
      const losses = character.stats.losses + (outcome === 'loss' ? 1 : 0);
      character.stats = statsForRecord(wins, losses);
    });
  }

  findAdventure(userId: string): Promise<GameSave | null> {
    return this.read((db) => {
      const row = db.adventures.find((entry) => entry.userId === userId);
      if (!row) return null;
      const parsed = saveSchema.safeParse(row.payload);
      return parsed.success ? parsed.data : null;
    });
  }

  saveAdventure(userId: string, save: GameSave): Promise<{ accepted: boolean; save: GameSave }> {
    return this.update((db) => {
      const existing = db.adventures.find((entry) => entry.userId === userId);
      const current = existing ? saveSchema.safeParse(existing.payload) : null;
      if (current?.success && !isNewerSave(save, current.data)) {
        return { accepted: false, save: current.data };
      }
      if (existing) existing.payload = save;
      else db.adventures.push({ userId, payload: save });
      return { accepted: true, save };
    });
  }

  private read<T>(fn: (db: FileShape) => T): Promise<T> {
    return this.enqueue(async () => fn(await this.load()));
  }

  private update<T>(fn: (db: FileShape) => T): Promise<T> {
    return this.enqueue(async () => {
      const db = await this.load();
      const result = fn(db);
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify(db, null, 2), 'utf8');
      return result;
    });
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async load(): Promise<FileShape> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as FileShape;
      return {
        users: parsed.users ?? [],
        characters: parsed.characters ?? [],
        adventures: parsed.adventures ?? [],
      };
    } catch (error) {
      const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
      if (missing) return { users: [], characters: [], adventures: [] };
      throw error;
    }
  }
}

function linkOnto(users: UserRecord[], userId: string, login: LinkedLogin, email: string | null): LinkResult {
  const owner = users.find((user) => (user.providers ?? []).some((entry) => entry.provider === login.provider && entry.subject === login.subject));
  if (owner && owner.id !== userId) return 'taken';
  const user = users.find((entry) => entry.id === userId);
  if (!user) return 'missing';
  const nextEmail = email?.toLowerCase() ?? '';
  const realEmail = nextEmail.includes('@') && !nextEmail.endsWith('@guest.local') && !nextEmail.endsWith('@players.local');
  if (realEmail) {
    const holder = users.find((entry) => entry.email === nextEmail);
    if (holder && holder.id !== userId) return 'email_used';
    if (user.guest) user.email = nextEmail;
  }
  user.providers = user.providers ?? [];
  if (!user.providers.some((entry) => entry.provider === login.provider && entry.subject === login.subject)) {
    user.providers.push(login);
  }
  if (user.guest && user.providers.length > 0) user.guest = false;
  return 'linked';
}
