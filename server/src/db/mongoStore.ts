import mongoose, { Schema, type InferSchemaType } from 'mongoose';

import { freshStats, statsForRecord } from '../combat/stats.js';
import type { AccountStore, CharacterInput, CharacterRecord, UserRecord } from '../domain.js';
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
  async createUser(input: { username: string; email: string; passwordHash: string }): Promise<UserRecord> {
    const doc = await UserModel.create({
      username: input.username,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
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

  async setSession(userId: string, sessionId: string): Promise<void> {
    if (!mongoose.isValidObjectId(userId)) return;
    await UserModel.updateOne({ _id: userId }, { sessionId });
  }

  async findCharacterByUserId(userId: string): Promise<CharacterRecord | null> {
    if (!mongoose.isValidObjectId(userId)) return null;
    const doc = await CharacterModel.findOne({ userId }).lean();
    return doc ? asCharacter(doc as unknown as CharacterDoc) : null;
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
