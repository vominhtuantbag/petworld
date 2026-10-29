import mongoose, { Schema, type InferSchemaType } from 'mongoose';

import { freshStats, statsForRecord } from '../combat/stats.js';
import type { AccountStore, CharacterInput, CharacterRecord, LinkResult, LinkedLogin, NewUser, SocialProvider, UserRecord } from '../domain.js';
import { isNewerSave, saveSchema, type GameSave } from '../saves/schema.js';

/**
 * MongoDB models. `passwordHash` is selected only inside the login lookup.
 * One character document per user (`userId` is unique).
 */

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    sessionId: { type: String, default: '' },
    guest: { type: Boolean, default: false },
    providers: {
      type: [{ provider: { type: String, required: true }, subject: { type: String, required: true } }],
      default: [],
    },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

const characterSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
    name: { type: String, required: true },
    gender: { type: String, required: true, enum: ['male', 'female'] },
    baseAvatarId: { type: String, required: true },
    hairColor: { type: String, required: true },
    outfitColor: { type: String, required: true },
    startingRegion: { type: String, required: true },
    stats: {
      hp: { type: Number, required: true },
      attack: { type: Number, required: true },
      defense: { type: Number, required: true },
      level: { type: Number, required: true },
      wins: { type: Number, required: true },
      losses: { type: Number, required: true },
    },
  },
  { versionKey: false },
);

const UserModel = mongoose.models.User ?? mongoose.model('User', userSchema);
const CharacterModel = mongoose.models.PlayerCharacter ?? mongoose.model('PlayerCharacter', characterSchema);

const adventureSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
    payload: { type: Schema.Types.Mixed, required: true },
  },
  { versionKey: false },
);

const AdventureModel = mongoose.models.AdventureSave ?? mongoose.model('AdventureSave', adventureSchema);

type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
type CharacterDoc = InferSchemaType<typeof characterSchema> & { _id: mongoose.Types.ObjectId };

function asUser(doc: UserDoc & { passwordHash?: string }): UserRecord {
  return {
    id: doc._id.toString(),
    username: doc.username,
    email: doc.email,
    passwordHash: doc.passwordHash ?? '',
    createdAt: new Date(doc.createdAt ?? Date.now()).toISOString(),
    sessionId: doc.sessionId ?? '',
    guest: Boolean(doc.guest),
    providers: Array.isArray(doc.providers)
      ? doc.providers.flatMap((entry) => {
          const provider = entry?.provider;
          const subject = entry?.subject;
          if (provider !== 'google' && provider !== 'apple' && provider !== 'facebook') return [];
          if (typeof subject !== 'string' || !subject) return [];
          return [{ provider, subject }];
        })
      : [],
  };
}

function asCharacter(doc: CharacterDoc): CharacterRecord {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    name: doc.name,
    gender: doc.gender,
    baseAvatarId: doc.baseAvatarId,
    hairColor: doc.hairColor,
    outfitColor: doc.outfitColor,
    startingRegion: doc.startingRegion as CharacterRecord['startingRegion'],
    stats: doc.stats ?? freshStats(),
  };
}

export class MongoAccountStore implements AccountStore {
  async createUser(input: NewUser): Promise<UserRecord> {
    const doc = await UserModel.create({
      username: input.username,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      guest: Boolean(input.guest),
      providers: input.providers ?? [],
    });
    return asUser(doc as unknown as UserDoc & { passwordHash: string });
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').lean();
    return doc ? asUser(doc as unknown as UserDoc & { passwordHash: string }) : null;
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const doc = await UserModel.findOne({ username: new RegExp(`^${escapeRegex(username)}$`, 'i') }).lean();
    return doc ? asUser(doc as unknown as UserDoc) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await UserModel.findById(id).lean();
    return doc ? asUser(doc as unknown as UserDoc) : null;
  }

  async findUserByProvider(provider: SocialProvider, subject: string): Promise<UserRecord | null> {
    const doc = await UserModel.findOne({ providers: { $elemMatch: { provider, subject } } }).select('+passwordHash').lean();
    return doc ? asUser(doc as unknown as UserDoc & { passwordHash: string }) : null;
  }

  async linkProvider(userId: string, login: LinkedLogin, email: string | null): Promise<LinkResult> {
    if (!mongoose.isValidObjectId(userId)) return 'missing';
    const owner = (await UserModel.findOne({ providers: { $elemMatch: { provider: login.provider, subject: login.subject } } }).lean()) as { _id: { toString(): string } } | null;
    if (owner && owner._id.toString() !== userId) return 'taken';
    const user = await UserModel.findById(userId);
    if (!user) return 'missing';
    const nextEmail = email?.toLowerCase() ?? '';
    const realEmail = nextEmail.includes('@') && !nextEmail.endsWith('@guest.local') && !nextEmail.endsWith('@players.local');
    if (realEmail) {
      const holder = (await UserModel.findOne({ email: nextEmail }).lean()) as { _id: { toString(): string } } | null;
      if (holder && holder._id.toString() !== userId) return 'email_used';
      if (user.guest) user.email = nextEmail;
    }
    const providers: LinkedLogin[] = Array.isArray(user.providers) ? user.providers.flatMap((entry: { provider?: unknown; subject?: unknown }) => normalizeLogin(entry)) : [];
    if (!providers.some((entry) => entry.provider === login.provider && entry.subject === login.subject)) {
      providers.push(login);
      user.providers = providers;
    }
    if (user.guest && providers.length > 0) user.guest = false;
    await user.save();
    return 'linked';
  }

  async setSession(userId: string, sessionId: string): Promise<void> {
    if (!mongoose.isValidObjectId(userId)) return;
    await UserModel.updateOne({ _id: userId }, { sessionId });
  }

  async findCharacterByUserId(userId: string): Promise<CharacterRecord | null> {
    if (!mongoose.isValidObjectId(userId)) return null;
    const doc = await CharacterModel.findOne({ userId }).lean();
    return doc ? asCharacter(doc as unknown as CharacterDoc) : null;
  }

  async setCharacterStats(userId: string, stats: CharacterRecord['stats']): Promise<void> {
    if (!mongoose.isValidObjectId(userId)) return;
    await CharacterModel.updateOne({ userId }, { stats });
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    if (!mongoose.isValidObjectId(userId)) return;
    await UserModel.updateOne({ _id: userId }, { passwordHash });
  }

  async upsertCharacter(userId: string, input: CharacterInput): Promise<CharacterRecord> {
    const existing = await CharacterModel.findOne({ userId });
    if (!existing) {
      const created = await CharacterModel.create({ userId, ...input, stats: freshStats() });
      return asCharacter(created as unknown as CharacterDoc);
    }
    existing.name = input.name;
    existing.gender = input.gender;
    existing.baseAvatarId = input.baseAvatarId;
    existing.hairColor = input.hairColor;
    existing.outfitColor = input.outfitColor;
    existing.startingRegion = input.startingRegion;
    await existing.save();
    return asCharacter(existing as unknown as CharacterDoc);
  }

  async recordResult(userId: string, outcome: 'win' | 'loss' | 'draw'): Promise<void> {
    if (outcome === 'draw') return;
    const character = await CharacterModel.findOne({ userId });
    if (!character) return;
    const wins = character.stats.wins + (outcome === 'win' ? 1 : 0);
    const losses = character.stats.losses + (outcome === 'loss' ? 1 : 0);
    character.stats = statsForRecord(wins, losses);
    await character.save();
  }

  async findAdventure(userId: string): Promise<GameSave | null> {
    if (!mongoose.isValidObjectId(userId)) return null;
    const doc = (await AdventureModel.findOne({ userId }).lean()) as { payload?: unknown } | null;
    if (!doc || Array.isArray(doc)) return null;
    const parsed = saveSchema.safeParse(doc.payload);
    return parsed.success ? parsed.data : null;
  }

  async saveAdventure(userId: string, save: GameSave): Promise<{ accepted: boolean; save: GameSave }> {
    const existing = await this.findAdventure(userId);
    if (existing && !isNewerSave(save, existing)) return { accepted: false, save: existing };
    await AdventureModel.findOneAndUpdate({ userId }, { userId, payload: save }, { upsert: true, new: true });
    return { accepted: true, save };
  }
}

export async function connectMongo(uri: string): Promise<void> {
  await mongoose.connect(uri);
}

function normalizeLogin(entry: { provider?: unknown; subject?: unknown }): LinkedLogin[] {
  const provider = entry?.provider;
  const subject = entry?.subject;
  if (provider !== 'google' && provider !== 'apple' && provider !== 'facebook') return [];
  if (typeof subject !== 'string' || !subject) return [];
  return [{ provider, subject }];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
