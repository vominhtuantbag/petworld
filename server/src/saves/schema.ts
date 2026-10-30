import { z } from 'zod';

import { AVATAR_IDS } from '../catalog.js';

/**
 * Adventure document stored per account.
 * Keep the ids aligned with the Expo client's `parseSave` output.
 * Broken fields are rejected here; the client already drops them locally.
 */

const REGION_IDS = [
  'forest',
  'beach',
  'mountains',
  'ocean',
  'volcano',
  'desert',
  'plains',
  'tundra',
  'swamp',
  'savannah',
  'light',
  'dark',
  'chaos',
  'outer-space',
  'heaven',
  'hell',
] as const;

const ITEM_IDS = [
  'hp-potion',
  'hp-potion-m',
  'hp-potion-l',
  'mana-potion',
  'mana-potion-m',
  'mana-potion-l',
  'stamina-potion',
  'stamina-potion-m',
  'stamina-potion-l',
  'ration',
  'town-scroll',
  'antidote',
  'banana',
  'grape',
  'apple',
  'net',
  'sword',
  'sword-rare',
  'sword-special',
  'might-blade',
  'armor',
  'armor-rare',
  'armor-special',
  'helm',
  'helm-rare',
  'helm-special',
  'shoes',
  'shoes-rare',
  'shoes-special',
  'ring',
  'ring-rare',
  'ring-special',
  'mine-ticket',
  'evo-shard',
  'rainbow-shard',
  'shard-plains',
  'shard-mountains',
  'shard-forest',
  'shard-swamp',
  'shard-beach',
  'shard-ocean',
  'shard-tundra',
  'shard-savannah',
  'shard-volcano',
  'shard-desert',
] as const;

const ITEM_ALIASES: Record<string, (typeof ITEM_IDS)[number]> = {
  berry: 'banana',
  'mana-fruit': 'grape',
  'hearty-fruit': 'apple',
};

const GEAR_IDS = ITEM_IDS.filter((id) =>
  /^(sword|might-blade|armor|helm|shoes|ring)/.test(id),
) as [(typeof ITEM_IDS)[number], ...(typeof ITEM_IDS)[number][]];

const stackSchema = z.object({
  itemId: z.enum(ITEM_IDS),
  qty: z.number().int().min(1).max(999),
  plus: z.number().int().min(0).max(5).optional(),
});

const gearSchema = z.object({
  itemId: z.enum(GEAR_IDS),
  plus: z.number().int().min(0).max(5),
});

const tamedSchema = z.object({
  id: z.string().regex(/^[a-z0-9:_-]{1,80}$/i),
  kindId: z.string().regex(/^[a-z0-9:_-]{1,80}$/i),
  name: z.string().trim().min(1).max(40),
  level: z.number().int().min(1).max(200),
  exp: z.number().int().min(0).max(10_000_000),
  tint: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  maxHp: z.number().int().min(1).max(99_999),
  maxMp: z.number().int().min(0).max(99_999),
  hp: z.number().int().min(0).max(99_999),
  mp: z.number().int().min(0).max(99_999),
  attack: z.number().int().min(0).max(99_999),
  defense: z.number().int().min(0).max(99_999),
  speed: z.number().int().min(0).max(9_999),
  basicId: z.string().regex(/^[a-z0-9:_-]{1,80}$/i).optional(),
  skillIds: z.array(z.string().regex(/^[a-z0-9:_-]{1,80}$/i)).max(4).optional(),
  evoStage: z.number().int().min(0).max(2).optional(),
});

export const saveSchema = z.object({
  version: z.literal(1),
  revision: z.number().int().min(0).max(1_000_000_000),
  updatedAt: z.string().min(16).max(40),
  profile: z.object({
    name: z.string().trim().min(1).max(18),
    level: z.number().int().min(1).max(200),
    exp: z.number().int().min(0).max(10_000_000),
    gender: z.enum(['male', 'female']),
    baseCharacterId: z.enum(AVATAR_IDS),
    hairColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    outfitColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    selectedRegion: z.enum(REGION_IDS),
  }),
  status: z.object({
    hp: z.number().int().min(0).max(99_999),
    maxHp: z.number().int().min(1).max(99_999),
    mp: z.number().int().min(0).max(99_999),
    maxMp: z.number().int().min(0).max(99_999),
    stamina: z.number().int().min(0).max(99_999),
    maxStamina: z.number().int().min(1).max(99_999),
    gold: z.number().int().min(0).max(9_999_999),
  }),
  inventory: z.object({
    bag: z.array(stackSchema).max(64),
    storage: z.array(stackSchema).max(64),
    weapon: gearSchema.nullable(),
    armor: gearSchema.nullable(),
    helm: gearSchema.nullable().optional(),
    shoes: gearSchema.nullable().optional(),
    ring: gearSchema.nullable().optional(),
  }),
  roster: z.array(tamedSchema).max(200),
  quests: z.object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    winsToday: z.number().int().min(0).max(9_999),
    feedsToday: z.number().int().min(0).max(9_999),
    scrollsToday: z.number().int().min(0).max(9_999),
    mineEntriesToday: z.number().int().min(0).max(9_999).optional(),
    totalWins: z.number().int().min(0).max(999_999),
    claimed: z.array(z.string().min(1).max(40)).max(100),
  }),
  codex: z.object({
    species: z.array(z.string().regex(/^[a-z0-9:_-]{1,80}$/i)).max(300),
    skills: z.array(z.string().regex(/^[a-z0-9:_-]{1,80}$/i)).max(400),
  }),
  world: z.object({
    scene: z.enum(['town', 'wilds']),
    regionId: z.enum(REGION_IDS),
    zoneId: z.string().regex(/^[a-z0-9:_-]{1,80}$/i),
    homeRegion: z.enum(REGION_IDS),
    unlocked: z.array(z.enum(REGION_IDS)).max(20),
    baseAttack: z.number().int().min(1).max(99_999),
    baseDefense: z.number().int().min(0).max(99_999),
    innReadyAt: z.number().min(0).max(10_000_000_000_000),
    pet: z.object({
      name: z.string().trim().min(1).max(40),
      hp: z.number().int().min(0).max(99_999),
      maxHp: z.number().int().min(1).max(99_999),
      mp: z.number().int().min(0).max(99_999),
      maxMp: z.number().int().min(0).max(99_999),
      stamina: z.number().int().min(0).max(99_999),
      maxStamina: z.number().int().min(1).max(99_999),
    }),
    heroSkills: z
      .object({
        professionId: z.string().regex(/^[a-z-]{1,32}$/),
        basicId: z.string().regex(/^[a-z0-9:_-]{1,80}$/i),
        skillIds: z.array(z.string().regex(/^[a-z0-9:_-]{1,80}$/i)).max(4),
      })
      .nullable(),
    adventureLevel: z.number().int().min(1).max(200),
    adventureExp: z.number().int().min(0).max(10_000_000),
    mineFloor: z.number().int().min(1).max(10).optional(),
  }),
  avatar: z
    .union([
      z.object({ kind: z.literal('preset'), characterId: z.enum(AVATAR_IDS) }),
      z.object({ kind: z.literal('custom'), uri: z.string().min(1).max(120_000) }),
    ])
    .nullable(),
});

export type GameSave = z.infer<typeof saveSchema>;

export function saveIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue?.path.join('.') || 'save';
  return `Bản lưu không hợp lệ (${path}).`;
}

/** Accept `{ save }` or the document itself, and map mana fields onto mp. */
export function coerceSaveInput(body: unknown): unknown {
  if (!isRecord(body)) return body;
  const source = isRecord(body.save) ? body.save : body.version === 1 || isRecord(body.profile) ? body : null;
  if (!source) return body.save;
  const save: Record<string, unknown> = { ...source };
  if (isRecord(save.status)) save.status = aliasMana(save.status);
  if (isRecord(save.inventory)) save.inventory = remapInventory(save.inventory);
  if (isRecord(save.world)) {
    const world: Record<string, unknown> = { ...save.world };
    if (isRecord(world.pet)) world.pet = aliasMana(world.pet);
    save.world = world;
    if (isRecord(save.profile)) {
      const profile: Record<string, unknown> = { ...save.profile };
      if (profile.level == null && world.adventureLevel != null) profile.level = world.adventureLevel;
      if (profile.exp == null && world.adventureExp != null) profile.exp = world.adventureExp;
      save.profile = profile;
    }
  }
  return save;
}

function remapInventory(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    bag: remapStacks(row.bag),
    storage: remapStacks(row.storage),
    helm: row.helm ?? null,
    shoes: row.shoes ?? null,
    ring: row.ring ?? null,
  };
}

function remapStacks(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.itemId !== 'string') return entry;
    const itemId = ITEM_ALIASES[entry.itemId] ?? entry.itemId;
    return { ...entry, itemId };
  });
}

function aliasMana(row: Record<string, unknown>): Record<string, unknown> {
  const next = { ...row };
  if (next.mp == null && next.mana != null) next.mp = next.mana;
  if (next.maxMp == null && next.maxMana != null) next.maxMp = next.maxMana;
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNewerSave(incoming: GameSave, existing: GameSave): boolean {
  const next = Date.parse(incoming.updatedAt);
  const prev = Date.parse(existing.updatedAt);
  if (Number.isFinite(next) && Number.isFinite(prev)) return next >= prev;
  return incoming.revision >= existing.revision;
}

/** Minimal valid document for the smoke test. */
export function sampleSave(updatedAt: string, gold: number, revision = 1): GameSave {
  return {
    version: 1,
    revision,
    updatedAt,
    profile: {
      name: 'Lan',
      level: 1,
      exp: 0,
      gender: 'female',
      baseCharacterId: 'f-archer',
      hairColor: '#7a4630',
      outfitColor: '#3e6b4d',
      selectedRegion: 'forest',
    },
    status: { hp: 90, maxHp: 100, mp: 30, maxMp: 40, stamina: 20, maxStamina: 40, gold },
    inventory: {
      bag: [
        { itemId: 'net', qty: 3 },
        { itemId: 'hp-potion', qty: 2 },
      ],
      storage: [],
      weapon: null,
      armor: null,
      helm: null,
      shoes: null,
      ring: null,
    },
    roster: [],
    quests: { day: '2026-10-23', winsToday: 1, feedsToday: 0, scrollsToday: 0, totalWins: 1, claimed: [] },
    codex: { species: [], skills: [] },
    world: {
      scene: 'town',
      regionId: 'forest',
      zoneId: 'town:forest',
      homeRegion: 'forest',
      unlocked: ['forest'],
      baseAttack: 12,
      baseDefense: 4,
      innReadyAt: 0,
      pet: { name: 'Sóc nhỏ', hp: 18, maxHp: 18, mp: 8, maxMp: 8, stamina: 12, maxStamina: 12 },
      heroSkills: null,
      adventureLevel: 1,
      adventureExp: 0,
    },
    avatar: { kind: 'preset', characterId: 'f-archer' },
  };
}
