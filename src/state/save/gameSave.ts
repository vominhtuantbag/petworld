import type { AvatarLook } from '../avatarLook';
import { getCharacter, PROFESSIONS } from '../../data/characters';
import { getRegion } from '../../data/regions';
import type { InitializedPlayer, RegionId } from '../../types/game';
import { professionPools } from '../../world/growth';
import { BAG_SLOTS, canonicalItemId, gearSlot, isGearItem, ITEMS, UPGRADE_CAP } from '../../world/items';
import { speciesById } from '../../world/monsters';
import { ADVENTURE_LEVEL_CAP } from '../../world/progression';
import { emptyQuests, normalizeQuests, type QuestTrack } from '../../world/quests';
import { townZoneId } from '../../world/catalog';
import type { FieldScene, Gear, GearSlot, ItemId, Pet, Stack, Vitals } from '../../world/types';
import type { TamedMonster } from '../../world/combat';
import type { HeroSkillLoadout } from '../../world/combat/kits';

/**
 * Versioned adventure document.
 *
 * Version 1 is the first shape. `parseSave` drops broken fields instead of
 * throwing, so an older or newer document cannot take the app down. The
 * object it returns is what both AsyncStorage and the server store.
 */

export const SAVE_VERSION = 1;

const PROFESSION_IDS = new Set(PROFESSIONS.map((profession) => profession.id));
const HEX = /^#[0-9a-fA-F]{6}$/;
const ZONE = /^[a-z0-9:_-]{1,80}$/i;
const TOKEN = /^[a-z0-9:_-]{1,80}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type SavePet = {
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stamina: number;
  maxStamina: number;
};

export type GameSave = {
  version: typeof SAVE_VERSION;
  revision: number;
  updatedAt: string;
  profile: {
    name: string;
    level: number;
    exp: number;
    gender: 'male' | 'female';
    baseCharacterId: string;
    hairColor: string;
    outfitColor: string;
    selectedRegion: RegionId;
  };
  status: {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    stamina: number;
    maxStamina: number;
    gold: number;
  };
  inventory: {
    bag: Stack[];
    storage: Stack[];
    weapon: Gear | null;
    armor: Gear | null;
    helm: Gear | null;
    shoes: Gear | null;
    ring: Gear | null;
  };
  roster: TamedMonster[];
  quests: QuestTrack;
  codex: {
    species: string[];
    skills: string[];
  };
  world: {
    scene: 'town' | 'wilds';
    regionId: RegionId;
    zoneId: string;
    homeRegion: RegionId;
    unlocked: RegionId[];
    baseAttack: number;
    baseDefense: number;
    innReadyAt: number;
    pet: SavePet;
    heroSkills: HeroSkillLoadout | null;
    adventureLevel: number;
    adventureExp: number;
    mineFloor: number;
  };
  avatar: AvatarLook | null;
};

export type SaveSource = {
  ready: boolean;
  scene: FieldScene;
  regionId: RegionId;
  zoneId: string;
  vitals: Vitals;
  pet: Pet;
  gold: number;
  bag: Stack[];
  storage: Stack[];
  weapon: Gear | null;
  armor: Gear | null;
  helm: Gear | null;
  shoes: Gear | null;
  ring: Gear | null;
  baseAttack: number;
  baseDefense: number;
  innReadyAt: number;
  unlocked: RegionId[];
  homeRegion: RegionId;
  adventureLevel: number;
  adventureExp: number;
  mineFloor: number;
  tamed: TamedMonster[];
  heroSkills: HeroSkillLoadout | null;
  quests: QuestTrack;
  discovered: string[];
  knownSkills: string[];
};

export type WorldSnapshot = {
  ready: boolean;
  scene: FieldScene;
  regionId: RegionId;
  zoneId: string;
  vitals: Vitals;
  pet: Pet;
  gold: number;
  bag: Stack[];
  storage: Stack[];
  weapon: Gear | null;
  armor: Gear | null;
  helm: Gear | null;
  shoes: Gear | null;
  ring: Gear | null;
  baseAttack: number;
  baseDefense: number;
  innReadyAt: number;
  unlocked: RegionId[];
  homeRegion: RegionId;
    adventureLevel: number;
    adventureExp: number;
    mineFloor: number;
    encounter: null;
  squad: null;
  tamed: TamedMonster[];
  heroSkills: HeroSkillLoadout | null;
  quests: QuestTrack;
  notice: null;
  fields: Record<string, never>;
  arrival: null;
  discovered: string[];
  knownSkills: string[];
};

type Meta = { revision: number; updatedAt: string };

export function parseSave(raw: unknown): GameSave | null {
  try {
    const root = unwrap(raw);
    if (!root) return null;
    const profile = parseProfile(root.profile, root.world);
    if (!profile) return null;
    const world = parseWorld(root.world, profile);
    const status = parseStatus(root.status);
    const inventory = parseInventory(root.inventory);
    const roster = parseRoster(root.roster);
    const quests = parseQuests(root.quests);
    const codex = parseCodex(root.codex, roster);
    return {
      version: SAVE_VERSION,
      revision: int(root.revision, 0, 1_000_000_000, 0),
      updatedAt: stamp(root.updatedAt),
      profile: {
        ...profile,
        level: world.adventureLevel,
        exp: world.adventureExp,
      },
      status,
      inventory,
      roster,
      quests,
      codex,
      world,
      avatar: parseAvatar(root.avatar),
    };
  } catch (error) {
    console.warn('[Game Thư Giãn] Bỏ qua bản lưu không đọc được.', error);
    return null;
  }
}

export function captureGameSave(state: SaveSource, player: InitializedPlayer, avatar: AvatarLook | null, meta: Meta): GameSave | null {
  const scene = resumeScene(state.scene);
  const region = getRegion(state.regionId)?.id ?? player.selectedRegion;
  const home = getRegion(state.homeRegion)?.id ?? region;
  const draft: GameSave = {
    version: SAVE_VERSION,
    revision: meta.revision,
    updatedAt: meta.updatedAt,
    profile: {
      name: player.name.trim().slice(0, 18),
      level: state.adventureLevel,
      exp: state.adventureExp,
      gender: player.gender,
      baseCharacterId: player.baseCharacterId,
      hairColor: player.hairColor,
      outfitColor: player.outfitColor,
      selectedRegion: player.selectedRegion,
    },
    status: {
      hp: state.vitals.hp,
      maxHp: state.vitals.maxHp,
      mp: state.vitals.mana,
      maxMp: state.vitals.maxMana,
      stamina: state.vitals.stamina,
      maxStamina: state.vitals.maxStamina,
      gold: state.gold,
    },
    inventory: {
      bag: state.bag,
      storage: state.storage,
      weapon: state.weapon,
      armor: state.armor,
      helm: state.helm,
      shoes: state.shoes,
      ring: state.ring,
    },
    roster: state.tamed,
    quests: state.quests,
    codex: {
      species: learnedSpecies(state),
      skills: learnedSkillIds(state),
    },
    world: {
      scene,
      regionId: region,
      zoneId: state.zoneId,
      homeRegion: home,
      unlocked: state.unlocked,
      baseAttack: state.baseAttack,
      baseDefense: state.baseDefense,
      innReadyAt: state.innReadyAt,
      pet: {
        name: state.pet.name,
        hp: state.pet.hp,
        maxHp: state.pet.maxHp,
        mp: state.pet.mana,
        maxMp: state.pet.maxMana,
        stamina: state.pet.stamina,
        maxStamina: state.pet.maxStamina,
      },
      heroSkills: state.heroSkills,
      adventureLevel: state.adventureLevel,
      adventureExp: state.adventureExp,
      mineFloor: state.mineFloor,
    },
    avatar,
  };
  return parseSave(draft);
}

export function applyGameSave(save: GameSave): WorldSnapshot {
  return {
    ready: true,
    scene: save.world.scene,
    regionId: save.world.regionId,
    zoneId: save.world.zoneId,
    vitals: {
      hp: save.status.hp,
      maxHp: save.status.maxHp,
      mana: save.status.mp,
      maxMana: save.status.maxMp,
      stamina: save.status.stamina,
      maxStamina: save.status.maxStamina,
    },
    pet: {
      name: save.world.pet.name,
      hp: save.world.pet.hp,
      maxHp: save.world.pet.maxHp,
      mana: save.world.pet.mp,
      maxMana: save.world.pet.maxMp,
      stamina: save.world.pet.stamina,
      maxStamina: save.world.pet.maxStamina,
    },
    gold: save.status.gold,
    bag: save.inventory.bag,
    storage: save.inventory.storage,
    weapon: save.inventory.weapon,
    armor: save.inventory.armor,
    helm: save.inventory.helm,
    shoes: save.inventory.shoes,
    ring: save.inventory.ring,
    baseAttack: save.world.baseAttack,
    baseDefense: save.world.baseDefense,
    innReadyAt: save.world.innReadyAt,
    unlocked: save.world.unlocked,
    homeRegion: save.world.homeRegion,
    adventureLevel: save.world.adventureLevel,
    adventureExp: save.world.adventureExp,
    mineFloor: save.world.mineFloor,
    encounter: null,
    squad: null,
    tamed: save.roster,
    heroSkills: save.world.heroSkills,
    quests: normalizeQuests(save.quests),
    notice: null,
    fields: {},
    arrival: null,
    discovered: save.codex.species,
    knownSkills: save.codex.skills,
  };
}

export function createStarterWorld(player: InitializedPlayer): WorldSnapshot {
  const pools = professionPools(getCharacter(player.baseCharacterId)?.professionId, 1);
  const region = getRegion(player.selectedRegion)?.id ?? 'plains';
  return {
    ready: true,
    scene: 'town',
    regionId: region,
    zoneId: townZoneId(region),
    vitals: {
      hp: pools.hp,
      maxHp: pools.hp,
      mana: pools.mp,
      maxMana: pools.mp,
      stamina: pools.stamina,
      maxStamina: pools.stamina,
    },
    pet: { name: 'Sóc nhỏ', hp: 18, maxHp: 18, mana: 8, maxMana: 8, stamina: 12, maxStamina: 12 },
    gold: 40,
    bag: [
      { itemId: 'hp-potion', qty: 2 },
      { itemId: 'mana-potion', qty: 1 },
      { itemId: 'antidote', qty: 1 },
      { itemId: 'town-scroll', qty: 1 },
      { itemId: 'banana', qty: 2 },
      { itemId: 'ration', qty: 1 },
      { itemId: 'net', qty: 3 },
    ],
    storage: [],
    weapon: null,
    armor: null,
    helm: null,
    shoes: null,
    ring: null,
    baseAttack: pools.attack,
    baseDefense: pools.defense,
    innReadyAt: 0,
    unlocked: [region],
    homeRegion: region,
    adventureLevel: 1,
    adventureExp: 0,
    mineFloor: 1,
    encounter: null,
    squad: null,
    tamed: [],
    heroSkills: null,
    quests: emptyQuests(),
    notice: null,
    fields: {},
    arrival: null,
    discovered: [],
    knownSkills: [],
  };
}

/** Stable text for the persisted slice. Timestamps stay out so a rewrite is not a new edit. */
export function saveFingerprint(state: SaveSource, player: InitializedPlayer, avatar: AvatarLook | null): string {
  const save = captureGameSave(state, player, avatar, { revision: 0, updatedAt: '1970-01-01T00:00:00.000Z' });
  if (!save) return '';
  const { revision: _revision, updatedAt: _updatedAt, ...rest } = save;
  return JSON.stringify(rest);
}

export function learnedSpecies(state: Pick<SaveSource, 'discovered' | 'tamed'>): string[] {
  const ids = [...state.discovered, ...state.tamed.map((monster) => monster.kindId)];
  return unique(ids.filter((id) => speciesById(id) !== null)).slice(0, 300);
}

export function learnedSkillIds(state: Pick<SaveSource, 'knownSkills' | 'heroSkills' | 'tamed'>): string[] {
  const ids = [
    ...state.knownSkills,
    ...(state.heroSkills ? [state.heroSkills.basicId, ...state.heroSkills.skillIds] : []),
    ...state.tamed.flatMap((monster) => [monster.basicId, ...(monster.skillIds ?? [])]),
  ];
  return unique(ids.filter((id): id is string => typeof id === 'string' && TOKEN.test(id))).slice(0, 400);
}

export function isNewerSave(left: GameSave, right: GameSave): boolean {
  const a = Date.parse(left.updatedAt);
  const b = Date.parse(right.updatedAt);
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a > b;
  return left.revision >= right.revision;
}

/** Higher means more adventure progress. Gold and item counts are left out so spending them is not treated as a reset. */
export function progressScore(save: GameSave): number {
  const gear =
    (save.inventory.weapon ? 1 : 0) +
    (save.inventory.armor ? 1 : 0) +
    (save.inventory.helm ? 1 : 0) +
    (save.inventory.shoes ? 1 : 0) +
    (save.inventory.ring ? 1 : 0);
  return (
    save.profile.level * 1_000_000 +
    save.roster.length * 100_000 +
    save.profile.exp +
    save.quests.totalWins * 1_000 +
    save.codex.species.length +
    save.codex.skills.length +
    gear * 10 +
    (save.avatar ? 1 : 0)
  );
}

/**
 * The device copy stays unless the server has gone further (higher level,
 * more pets, more exp, more of the codex). A newer but equal or weaker Render
 * copy — including one written after a reset — does not replace gold, items,
 * or position stored on this device.
 */
export function preferSave(local: GameSave, remote: GameSave): GameSave {
  if (progressScore(remote) > progressScore(local)) return remote;
  return local;
}

export function playerFromSave(save: GameSave): InitializedPlayer | null {
  const region = getRegion(save.profile.selectedRegion);
  if (!region || !save.profile.name) return null;
  return {
    name: save.profile.name,
    gender: save.profile.gender,
    baseCharacterId: save.profile.baseCharacterId,
    hairColor: save.profile.hairColor,
    outfitColor: save.profile.outfitColor,
    selectedRegion: region.id,
  };
}

/** Drop a huge custom portrait so the rest of the save still fits the API body. */
export function toServerSave(save: GameSave): GameSave {
  if (save.avatar?.kind === 'custom' && save.avatar.uri.length > 48_000) {
    return { ...save, avatar: null };
  }
  return save;
}

function unwrap(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === 'string') {
    try {
      return unwrap(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }
  if (!isRecord(raw)) return null;
  if (isRecord(raw.save)) return raw.save;
  if (isRecord(raw.payload)) return raw.payload;
  return raw;
}

function parseProfile(value: unknown, world: unknown): GameSave['profile'] | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim().slice(0, 18) : '';
  const character = getCharacter(typeof value.baseCharacterId === 'string' ? value.baseCharacterId : null);
  if (!name || !character) return null;
  const gender = value.gender === 'male' || value.gender === 'female' ? value.gender : character.gender;
  const region =
    asRegion(value.selectedRegion) ??
    asRegion(isRecord(world) ? world.regionId : null) ??
    asRegion(isRecord(world) ? world.homeRegion : null) ??
    'plains';
  const hair = typeof value.hairColor === 'string' && HEX.test(value.hairColor) ? value.hairColor : '#7a4630';
  const outfit = typeof value.outfitColor === 'string' && HEX.test(value.outfitColor) ? value.outfitColor : '#3e6b4d';
  return {
    name,
    level: 1,
    exp: 0,
    gender,
    baseCharacterId: character.id,
    hairColor: hair,
    outfitColor: outfit,
    selectedRegion: region,
  };
}

function parseWorld(value: unknown, profile: GameSave['profile']): GameSave['world'] {
  const row = isRecord(value) ? value : {};
  const region = asRegion(row.regionId) ?? profile.selectedRegion;
  const homeRegion = asRegion(row.homeRegion) ?? region;
  const unlocked = unique(
    [...(Array.isArray(row.unlocked) ? row.unlocked : []), homeRegion, region]
      .map((id) => asRegion(id))
      .filter((id): id is RegionId => id !== null),
  );
  const zone = typeof row.zoneId === 'string' && ZONE.test(row.zoneId) ? row.zoneId : townZoneId(region);
  const level = int(row.adventureLevel, 1, ADVENTURE_LEVEL_CAP, 1);
  return {
    scene: row.scene === 'wilds' ? 'wilds' : 'town',
    regionId: region,
    zoneId: zone,
    homeRegion,
    unlocked,
    baseAttack: int(row.baseAttack, 1, 99_999, 10),
    baseDefense: int(row.baseDefense, 0, 99_999, 4),
    innReadyAt: capInn(row.innReadyAt),
    pet: parsePet(row.pet),
    heroSkills: parseHeroSkills(row.heroSkills),
    adventureLevel: level,
    adventureExp: int(row.adventureExp, 0, 10_000_000, 0),
    mineFloor: int(row.mineFloor, 1, 10, 1),
  };
}

function parseStatus(value: unknown): GameSave['status'] {
  const row = isRecord(value) ? value : {};
  const maxHp = int(row.maxHp, 1, 99_999, 100);
  const maxMp = int(row.maxMp ?? row.maxMana, 0, 99_999, 40);
  const maxStamina = int(row.maxStamina, 1, 99_999, 40);
  return {
    hp: int(row.hp, 0, maxHp, maxHp),
    maxHp,
    mp: int(row.mp ?? row.mana, 0, maxMp, maxMp),
    maxMp,
    stamina: int(row.stamina, 0, maxStamina, maxStamina),
    maxStamina,
    gold: int(row.gold, 0, 9_999_999, 0),
  };
}

function parseInventory(value: unknown): GameSave['inventory'] {
  const row = isRecord(value) ? value : {};
  return {
    bag: parseStacks(row.bag),
    storage: parseStacks(row.storage),
    weapon: parseEquipped(row.weapon, 'weapon'),
    armor: parseEquipped(row.armor, 'armor'),
    helm: parseEquipped(row.helm, 'helm'),
    shoes: parseEquipped(row.shoes, 'shoes'),
    ring: parseEquipped(row.ring, 'ring'),
  };
}

function parseStacks(value: unknown): Stack[] {
  if (!Array.isArray(value)) return [];
  const stacks: Stack[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.itemId !== 'string') continue;
    const itemId = canonicalItemId(entry.itemId);
    if (!itemId) continue;
    const qty = int(entry.qty, 1, 999, 1);
    if (!ITEMS[itemId].stack) {
      if (stacks.some((stack) => stack.itemId === itemId)) continue;
      stacks.push({ itemId, qty: 1, plus: int(entry.plus, 0, UPGRADE_CAP, 0) });
    } else {
      const existing = stacks.find((stack) => stack.itemId === itemId);
      if (existing) existing.qty = Math.min(999, existing.qty + qty);
      else stacks.push({ itemId, qty });
    }
    if (stacks.length >= BAG_SLOTS) break;
  }
  return stacks;
}

function parseEquipped(value: unknown, slot: GearSlot): Gear | null {
  if (!isRecord(value) || typeof value.itemId !== 'string') return null;
  const itemId = canonicalItemId(value.itemId);
  if (!itemId || !isGearItem(itemId) || gearSlot(itemId) !== slot) return null;
  return { itemId, plus: int(value.plus, 0, UPGRADE_CAP, 0) };
}

function parseRoster(value: unknown): TamedMonster[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const roster: TamedMonster[] = [];
  for (const entry of value) {
    const monster = parseTamed(entry);
    if (!monster || seen.has(monster.id)) continue;
    seen.add(monster.id);
    roster.push(monster);
    if (roster.length >= 200) break;
  }
  return roster;
}

function parseTamed(value: unknown): TamedMonster | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.kindId !== 'string') return null;
  const id = value.id.trim().slice(0, 80);
  const kind = speciesById(value.kindId);
  if (!id || !TOKEN.test(id) || !kind) return null;
  const name = typeof value.name === 'string' && value.name.trim() ? value.name.trim().slice(0, 40) : kind.name;
  const maxHp = int(value.maxHp, 1, 99_999, 1);
  const maxMp = int(value.maxMp, 0, 99_999, 0);
  const basicId = typeof value.basicId === 'string' && TOKEN.test(value.basicId) ? value.basicId : undefined;
  const skillIds = Array.isArray(value.skillIds)
    ? value.skillIds.filter((skill): skill is string => typeof skill === 'string' && TOKEN.test(skill)).slice(0, 4)
    : undefined;
  return {
    id,
    kindId: kind.id,
    name,
    level: int(value.level, 1, ADVENTURE_LEVEL_CAP, 1),
    exp: int(value.exp, 0, 10_000_000, 0),
    tint: typeof value.tint === 'string' && HEX.test(value.tint) ? value.tint : kind.tint,
    maxHp,
    maxMp,
    hp: int(value.hp, 0, maxHp, maxHp),
    mp: int(value.mp, 0, maxMp, maxMp),
    attack: int(value.attack, 0, 99_999, 1),
    defense: int(value.defense, 0, 99_999, 0),
    speed: int(value.speed, 0, 9_999, kind.speed),
    ...(basicId ? { basicId } : {}),
    ...(skillIds && skillIds.length > 0 ? { skillIds } : {}),
    evoStage: int(value.evoStage, 0, 2, 0),
  };
}

function parseQuests(value: unknown): QuestTrack {
  const blank = emptyQuests();
  if (!isRecord(value)) return blank;
  const day = typeof value.day === 'string' && DAY.test(value.day) ? value.day : blank.day;
  const claimed = Array.isArray(value.claimed)
    ? value.claimed.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 40).slice(0, 100)
    : [];
  return normalizeQuests({
    day,
    winsToday: int(value.winsToday, 0, 9_999, 0),
    feedsToday: int(value.feedsToday, 0, 9_999, 0),
    scrollsToday: int(value.scrollsToday, 0, 9_999, 0),
    mineEntriesToday: int(value.mineEntriesToday, 0, 9_999, 0),
    totalWins: int(value.totalWins, 0, 999_999, 0),
    claimed,
  });
}

function parseCodex(value: unknown, roster: TamedMonster[]): GameSave['codex'] {
  const row = isRecord(value) ? value : {};
  const species = unique(
    [...(Array.isArray(row.species) ? row.species : []), ...roster.map((monster) => monster.kindId)].filter(
      (id): id is string => typeof id === 'string' && speciesById(id) !== null,
    ),
  ).slice(0, 300);
  const skills = unique(
    (Array.isArray(row.skills) ? row.skills : []).filter((id): id is string => typeof id === 'string' && TOKEN.test(id)),
  ).slice(0, 400);
  return { species, skills };
}

function parseHeroSkills(value: unknown): HeroSkillLoadout | null {
  if (!isRecord(value) || typeof value.professionId !== 'string' || !PROFESSION_IDS.has(value.professionId)) return null;
  if (typeof value.basicId !== 'string' || !TOKEN.test(value.basicId)) return null;
  const skillIds = Array.isArray(value.skillIds)
    ? value.skillIds.filter((id): id is string => typeof id === 'string' && TOKEN.test(id)).slice(0, 4)
    : [];
  return { professionId: value.professionId, basicId: value.basicId, skillIds };
}

function parsePet(value: unknown): SavePet {
  const row = isRecord(value) ? value : {};
  const maxHp = int(row.maxHp, 1, 99_999, 18);
  const maxMp = int(row.maxMp ?? row.maxMana, 0, 99_999, 8);
  const maxStamina = int(row.maxStamina, 1, 99_999, 12);
  const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim().slice(0, 40) : 'Sóc nhỏ';
  return {
    name,
    hp: int(row.hp, 0, maxHp, maxHp),
    maxHp,
    mp: int(row.mp ?? row.mana, 0, maxMp, maxMp),
    maxMp,
    stamina: int(row.stamina, 0, maxStamina, maxStamina),
    maxStamina,
  };
}

function parseAvatar(value: unknown): AvatarLook | null {
  if (!isRecord(value)) return null;
  if (value.kind === 'preset' && typeof value.characterId === 'string' && getCharacter(value.characterId)) {
    return { kind: 'preset', characterId: value.characterId };
  }
  if (value.kind === 'custom' && typeof value.uri === 'string' && value.uri.length > 0 && value.uri.length <= 120_000) {
    return { kind: 'custom', uri: value.uri };
  }
  return null;
}

function resumeScene(scene: FieldScene): 'town' | 'wilds' {
  return scene === 'wilds' || scene === 'encounter' || scene === 'squad' ? 'wilds' : 'town';
}

function asRegion(value: unknown): RegionId | null {
  if (typeof value !== 'string') return null;
  return getRegion(value)?.id ?? null;
}

function capInn(value: unknown): number {
  const now = Date.now();
  const n = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, now + 86_400_000);
}

function stamp(value: unknown): string {
  if (typeof value === 'string' && Number.isFinite(Date.parse(value))) return new Date(Date.parse(value)).toISOString();
  return new Date(0).toISOString();
}

function int(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
