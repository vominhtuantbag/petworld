import type { RegionId } from '../types/game';

/**
 * Local exploration types. Combat numbers for a real battle scene should
 * read `Encounter`, not invent a second monster shape.
 */

export type ItemId =
  | 'hp-potion'
  | 'mana-potion'
  | 'stamina-potion'
  | 'ration'
  | 'town-scroll'
  | 'antidote'
  | 'berry'
  | 'mana-fruit'
  | 'hearty-fruit'
  | 'net'
  | 'sword'
  | 'armor';

export type ServiceId = 'store' | 'smith' | 'storage' | 'travel' | 'inn' | 'pvp' | 'cup';

export type Vec = { x: number; y: number };

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  label?: string;
  /** When set, the town draws a cozy shop instead of a flat block. */
  roof?: string;
  awning?: string;
  /**
   * Map prop. Solids stop the player and monsters. The rest is walked over.
   * Plains solids: `tree`, `rock`, `pile`. Plains decor: `flower`, `bush`, `grass`, `shroom`, `light`, `puddle` (×0.85, −2 thể lực/giây).
   * Savannah solids: `acacia`, `rock`. Savannah decor: `grass`.
   * Desert solids: `dune`, `rock`, `oasis`, `cactus` (also older `saguaro`, `barrel`, `bunny`, `palm`).
   * Desert decor: `crack` (×0.90), `quicksand` (×0.80, −2 máu/giây), `straw`. Older `bush` and `tumbleweed` still draw.
   * Swamp solids: `mangrove`, `log`, `boulder`. Swamp decor: `dry`, `mud`,
   * `moss`, `reed`, `lily`, `shroom`, `fog`, `firefly`, `bubble`.
   * `slow` is a speed multiplier while the player stands inside.
   */
  kind?:
    | 'tree'
    | 'acacia'
    | 'rock'
    | 'pile'
    | 'flower'
    | 'puddle'
    | 'grass'
    | 'light'
    | 'dune'
    | 'straw'
    | 'bush'
    | 'oasis'
    | 'tumbleweed'
    | 'saguaro'
    | 'barrel'
    | 'bunny'
    | 'cactus'
    | 'palm'
    | 'crack'
    | 'quicksand'
    | 'dry'
    | 'mud'
    | 'moss'
    | 'reed'
    | 'lily'
    | 'shroom'
    | 'fog'
    | 'firefly'
    | 'bubble'
    | 'mangrove'
    | 'log'
    | 'boulder';
  /** Pixels per second. Tumbleweeds, fireflies, and bubbles drift by this. */
  drift?: { vx: number; vy: number };
  /** Speed multiplier while the player stands inside. Mud, cracked earth, quicksand, and plains water use a value below 1. */
  slow?: number;
};

export type Stack = { itemId: ItemId; qty: number };

export type Gear = { itemId: 'sword' | 'armor'; plus: number };

export type Vitals = {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
};

export type Pet = {
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
};

export type Sensor = {
  id: string;
  x: number;
  y: number;
  r: number;
  label: string;
  /** Building service, or a map transition. */
  service?: ServiceId;
  toZone?: string;
  /** Region unlocked when this gate is used. */
  unlock?: RegionId;
  arrive?: Vec;
};

export type MonsterActor = {
  id: string;
  kindId: string;
  name: string;
  level: number;
  x: number;
  y: number;
  r: number;
  tint: string;
  hp: number;
  maxHp: number;
  /** Mana pool. Field creatures start full. */
  mp: number;
  maxMp: number;
  /** Experience toward the next monster level. Wild spawns begin at 0. */
  exp: number;
  attack: number;
  defense: number;
  agro: number;
  speed: number;
  bounds: Rect;
  homeX: number;
  homeY: number;
  calm: number;
  nextDrop: number;
  pause: number;
  /** When set, the monster walks this loop instead of a single home point. */
  patrol: Vec[];
  patrolIndex: number;
  elite: boolean;
  /**
   * Index into `FieldState.zones`. The monster may chase and wander only
   * inside that cell. Expansion maps leave this at 0 and use `bounds`.
   */
  zoneIndex: number;
  /**
   * Locomotion pose. The sim writes these every step for plains species
   * and for anyone currently in a water tile. Missing values mean the
   * monster still uses the plain patrol step.
   */
  gait?: 'trot' | 'hop' | 'slither' | 'scuttle' | 'burst' | 'swim';
  /** Pause remaining, or a negative value while a scorpion is bursting. */
  gaitTimer?: number;
  /** Shared clock for bob, slither, scuttle, and swim. */
  phase?: number;
  /** Body facing in radians. Crabs look perpendicular to their travel. */
  facing?: number;
  /** 0 while idle. A hop in progress runs from just above 0 to 1. */
  hopT?: number;
  hopFromX?: number;
  hopFromY?: number;
  hopToX?: number;
  hopToY?: number;
};

export type Hazard = Rect & { id: string };

export type ChunkRecord = {
  cx: number;
  cy: number;
  monsters: MonsterActor[];
  loot: LootActor[];
  /** False until the player has come near. Keeps generation deterministic. */
  generated: boolean;
};

/**
 * One uneven level band on a hunting map. The cell is every point closer
 * to `seed` than to the other seeds, after subtracting `weight` from the
 * squared distance. A larger weight claims more ground, so the five bands
 * are not equal strips.
 */
export type MapZone = {
  index: number;
  levelMin: number;
  levelMax: number;
  seed: Vec;
  weight: number;
  tint: string;
};

export type LootActor = {
  id: string;
  x: number;
  y: number;
  kind: 'gold' | 'item';
  amount: number;
  itemId?: ItemId;
  label: string;
  tint: string;
};

/** One walkable map: a town square or a wilderness zone. */
export type FieldState = {
  zoneId: string;
  regionId: RegionId;
  title: string;
  levelMin: number;
  levelMax: number;
  width: number;
  height: number;
  ground: string;
  road: string;
  player: Vec & { r: number };
  blocks: Rect[];
  decor: Rect[];
  sensors: Sensor[];
  monsters: MonsterActor[];
  loot: LootActor[];
  /** Sensor the player is already standing on, so the door does not retrigger. */
  heldSensorId: string | null;
  /** 0 keeps the whole map awake (towns). Wilderness uses `CHUNK_SIZE`. */
  chunkSize: number;
  chunks: Record<string, ChunkRecord>;
  activeKeys: string[];
  provinceId: string;
  sectorCol: number;
  sectorRow: number;
  provinceCols: number;
  provinceRows: number;
  hazards: Hazard[];
  /** Chunk that may spawn one roaming boss. Null on safe maps. */
  bossChunkKey: string | null;
  fauna: string;
  /**
   * Which town roster the saved chunks were built from. A mismatch
   * rebuilds the map so Map 1 picks up the current species list.
   */
  faunaRoster: number;
  /** 0 on towns and expansion sectors. Hunting maps use 1–10. */
  tier: number;
  /** Empty outside the ten-town hunting maps. */
  zones: MapZone[];
  /** Chunk that contains this point stays empty so the arrival pad is safe. */
  quietSpawn: Vec | null;
};

export type FieldEvent =
  | { type: 'service'; service: ServiceId }
  | { type: 'travel'; toZone: string; unlock?: RegionId; arrive?: Vec }
  | { type: 'pickup'; loot: LootActor }
  | { type: 'encounter'; monster: MonsterActor }
  | { type: 'hazard'; dt: number }
  | { type: 'march'; distance: number; dt: number }
  | { type: 'quicksand' }
  | { type: 'puddle' };

export type Encounter = {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  /** Mana left on this creature. Omitted cards start a fight at full mana. */
  mp?: number;
  attack: number;
  defense: number;
  tint: string;
  elite?: boolean;
  /** Species id used to pick the wild skill pair. Falls back to `id`. */
  kindId?: string;
  speed?: number;
  /** Nearby monsters the player chooses from. The battle uses exactly three. */
  pool?: Encounter[];
};

export type FieldScene = 'town' | 'wilds' | 'pvp' | 'squad' | 'encounter' | 'cup';
