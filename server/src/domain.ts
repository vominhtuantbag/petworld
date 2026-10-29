import type { Gender, RegionId } from './catalog.js';
import type { GameSave } from './saves/schema.js';

/**
 * Records stored for an account. `passwordHash` never leaves the server.
 * Add a column/field here and in both store implementations together.
 */

export type SocialProvider = 'google' | 'apple' | 'facebook';

export type LinkedLogin = {
  provider: SocialProvider;
  subject: string;
};

export type UserRecord = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  /** Latest login. An older token for this account is no longer valid. */
  sessionId?: string;
  /** True until this anonymous account is bound to a social login. */
  guest?: boolean;
  providers?: LinkedLogin[];
};

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  guest: boolean;
  providers: SocialProvider[];
};

export type CharacterStats = {
  /** Max hit points. The live duel copies this at match start. */
  hp: number;
  attack: number;
  defense: number;
  level: number;
  wins: number;
  losses: number;
};

export type CharacterRecord = {
  id: string;
  userId: string;
  name: string;
  gender: Gender;
  baseAvatarId: string;
  hairColor: string;
  outfitColor: string;
  startingRegion: RegionId;
  stats: CharacterStats;
};

export type CharacterInput = {
  name: string;
  gender: Gender;
  baseAvatarId: string;
  hairColor: string;
  outfitColor: string;
  startingRegion: RegionId;
};

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    guest: Boolean(user.guest),
    providers: (user.providers ?? []).map((entry) => entry.provider),
  };
}

/**
 * One character per account. Cosmetic edits keep wins, losses, and level.
 * A brand-new character starts at level 1.
 */
export type NewUser = {
  username: string;
  email: string;
  passwordHash: string;
  guest?: boolean;
  providers?: LinkedLogin[];
};

export type LinkResult = 'linked' | 'taken' | 'email_used' | 'missing';

export interface AccountStore {
  createUser(input: NewUser): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByProvider(provider: SocialProvider, subject: string): Promise<UserRecord | null>;
  /** Binds a social login onto this user id. Progress stays on the same account. */
  linkProvider(userId: string, login: LinkedLogin, email: string | null): Promise<LinkResult>;
  setSession(userId: string, sessionId: string): Promise<void>;
  findCharacterByUserId(userId: string): Promise<CharacterRecord | null>;
  upsertCharacter(userId: string, input: CharacterInput): Promise<CharacterRecord>;
  setCharacterStats(userId: string, stats: CharacterStats): Promise<void>;
  setPasswordHash(userId: string, passwordHash: string): Promise<void>;
  recordResult(userId: string, outcome: 'win' | 'loss' | 'draw'): Promise<void>;
  findAdventure(userId: string): Promise<GameSave | null>;
  saveAdventure(userId: string, save: GameSave): Promise<{ accepted: boolean; save: GameSave }>;
}
