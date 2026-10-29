import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { hashPassword } from '../auth/tokens.js';
import { statsAtLevel } from '../combat/stats.js';
import { config } from '../config.js';
import { FileAccountStore } from '../db/fileStore.js';
import { connectMongo, MongoAccountStore } from '../db/mongoStore.js';
import type { AvatarId, Gender, RegionId } from '../catalog.js';
import type { AccountStore } from '../domain.js';
import { sampleSave, type GameSave } from '../saves/schema.js';

export const TEST_PASSWORD = 'Test1234!';
export const TEST_LEVEL = 20;
export const TEST_TICKETS = 99;

type SeedSpec = {
  username: string;
  email: string;
  name: string;
  gender: Gender;
  baseAvatarId: AvatarId;
  hairColor: string;
  outfitColor: string;
  startingRegion: RegionId;
};

export const TEST_ACCOUNTS: SeedSpec[] = [
  {
    username: 'testuser1',
    email: 'testuser1@game.com',
    name: 'Kỵ sĩ Thử',
    gender: 'male',
    baseAvatarId: 'm-knight',
    hairColor: '#3d2a1c',
    outfitColor: '#4a5d8c',
    startingRegion: 'plains',
  },
  {
    username: 'testuser2',
    email: 'testuser2@game.com',
    name: 'Pháp sư Thử',
    gender: 'female',
    baseAvatarId: 'f-mage',
    hairColor: '#6b3a8c',
    outfitColor: '#3e6b9a',
    startingRegion: 'forest',
  },
  {
    username: 'testuser3',
    email: 'testuser3@game.com',
    name: 'Lâm tặc Thử',
    gender: 'male',
    baseAvatarId: 'm-ranger',
    hairColor: '#5a3a22',
    outfitColor: '#3d6b45',
    startingRegion: 'savannah',
  },
];

export type SeededAccount = {
  username: string;
  email: string;
  created: boolean;
  level: number;
  tickets: number;
};

export async function seedTestAccounts(
  store: AccountStore,
  options: { onlyMissing?: boolean } = {},
): Promise<SeededAccount[]> {
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const stats = statsAtLevel(TEST_LEVEL);
  const results: SeededAccount[] = [];

  for (const spec of TEST_ACCOUNTS) {
    const existing = await store.findUserByEmail(spec.email);
    if (existing && options.onlyMissing) {
      results.push({
        username: spec.username,
        email: spec.email,
        created: false,
        level: TEST_LEVEL,
        tickets: TEST_TICKETS,
      });
      continue;
    }

    let created = false;
    let user = existing;
    if (!user) {
      const taken = await store.findUserByUsername(spec.username);
      if (taken) throw new Error(`Username ${spec.username} is already used by another account.`);
      user = await store.createUser({
        username: spec.username,
        email: spec.email,
        passwordHash,
      });
      created = true;
    } else {
      await store.setPasswordHash(user.id, passwordHash);
    }

    await store.upsertCharacter(user.id, {
      name: spec.name,
      gender: spec.gender,
      baseAvatarId: spec.baseAvatarId,
      hairColor: spec.hairColor,
      outfitColor: spec.outfitColor,
      startingRegion: spec.startingRegion,
    });
    await store.setCharacterStats(user.id, stats);

    const previous = await store.findAdventure(user.id);
    const save = testSave(spec, stats, previous);
    await store.saveAdventure(user.id, save);

    results.push({
      username: spec.username,
      email: spec.email,
      created,
      level: TEST_LEVEL,
      tickets: TEST_TICKETS,
    });
  }

  return results;
}

/** Create the three test logins if they are missing. Existing rows are left alone. */
export async function ensureTestAccounts(store: AccountStore): Promise<SeededAccount[]> {
  return seedTestAccounts(store, { onlyMissing: true });
}

export async function openSeedStore(): Promise<AccountStore> {
  if (config.driver === 'mongo') {
    await connectMongo(config.mongoUri);
    return new MongoAccountStore();
  }
  return new FileAccountStore(path.join(process.cwd(), 'data', 'accounts.json'));
}

function testSave(spec: SeedSpec, stats: ReturnType<typeof statsAtLevel>, previous: GameSave | null): GameSave {
  const now = new Date().toISOString();
  const region = spec.startingRegion;
  const draft = sampleSave(now, 50_000, (previous?.revision ?? 0) + 1);
  draft.profile = {
    name: spec.name,
    level: TEST_LEVEL,
    exp: 0,
    gender: spec.gender,
    baseCharacterId: spec.baseAvatarId,
    hairColor: spec.hairColor,
    outfitColor: spec.outfitColor,
    selectedRegion: region,
  };
  draft.status = {
    hp: stats.hp,
    maxHp: stats.hp,
    mp: 80 + TEST_LEVEL * 4,
    maxMp: 80 + TEST_LEVEL * 4,
    stamina: 40 + TEST_LEVEL * 2,
    maxStamina: 40 + TEST_LEVEL * 2,
    gold: 50_000,
  };
  draft.inventory = {
    bag: [
      { itemId: 'mine-ticket', qty: TEST_TICKETS },
      { itemId: 'hp-potion', qty: 20 },
      { itemId: 'mana-potion', qty: 20 },
      { itemId: 'stamina-potion', qty: 10 },
      { itemId: 'net', qty: 10 },
      { itemId: 'evo-shard', qty: 20 },
    ],
    storage: [],
    weapon: { itemId: 'might-blade', plus: 0 },
    armor: { itemId: 'armor', plus: 0 },
  };
  draft.world = {
    ...draft.world,
    scene: 'town',
    regionId: region,
    zoneId: `town:${region}`,
    homeRegion: region,
    unlocked: ['forest', 'beach', 'mountains', 'ocean', 'volcano', 'desert', 'plains', 'tundra', 'swamp', 'savannah'],
    baseAttack: stats.attack,
    baseDefense: stats.defense,
    adventureLevel: TEST_LEVEL,
    adventureExp: 0,
    mineFloor: 10,
  };
  draft.avatar = { kind: 'preset', characterId: spec.baseAvatarId };
  draft.quests = {
    day: now.slice(0, 10),
    winsToday: 0,
    feedsToday: 0,
    scrollsToday: 0,
    mineEntriesToday: 0,
    totalWins: 0,
    claimed: [],
  };
  return draft;
}

const startedDirectly = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;
if (startedDirectly) {
  openSeedStore()
    .then((store) => seedTestAccounts(store))
    .then((accounts) => {
      console.log(`[seed] ${accounts.length} test accounts ready. Password: ${TEST_PASSWORD}`);
      for (const account of accounts) {
        console.log(`[seed] ${account.created ? 'created' : 'updated'} ${account.email}  lv${account.level}  vé x${account.tickets}`);
      }
    })
    .catch((error: unknown) => {
      console.error('[seed] failed', error);
      process.exit(1);
    });
}
