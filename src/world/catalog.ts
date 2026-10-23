import { getRegion } from '../data/regions';
import type { RegionId } from '../types/game';
import {
  bossChunkKey,
  gateLabel,
  isRingTown,
  nextProvince,
  parseSector,
  parseTier,
  resolveZoneId,
  ringNeighbors,
  SECTOR_COLS,
  SECTOR_ROWS,
  sectorZoneId,
} from './atlas';
import { CHUNK_SIZE, hashString, mulberry32, SECTOR_SIZE, TIER_MAP_H, TIER_MAP_W } from './grid';
import { generateDesert, DESERT_SAND, desertNeedsDressing } from './desertDecor';
import { omitHazardsOnPads } from './hazards';
import { locomotion } from './gait';
import { monsterMana } from './growth';
import { ITEMS } from './items';
import { expansionSpecies, MAP1_ROSTER_VERSION, townSpecies, type MonsterSpecies } from './monsters';
import { generatePlains, hitsSolid, PLAINS_GRASS, plainsNeedsVista } from './plainsDecor';
import { generateSavannah, SAVANNAH_GRASS } from './savannahDecor';
import { generateScatter } from './scatterDecor';
import { generateSwamp, SWAMP_GROUND, swampNeedsDressing } from './swampDecor';
import {
  buildZones,
  clearPads,
  eastGate,
  entrancePad,
  huntingSensors,
  inwardPad,
  MAP_TIERS,
  returnGate,
  sampleInZone,
  tierZoneId,
  westGate,
  ZONE_COUNT,
  zoneIndexAt,
  ascentReturnPad,
} from './tiers';
import type { FieldState, ItemId, LootActor, MonsterActor, Rect, Sensor, ServiceId } from './types';

/**
 * Maps, monsters, and loot.
 *
 * Starter towns use the ring in `atlas.ts` and the tier maps in `tiers.ts`.
 * A town gate opens tier 1. Old ids `region:outskirts` and `region:depths`
 * alias to tiers 1 and 2. Expansion provinces still build a sector grid.
 *
 * Town monsters live in `monsters.ts`. Map 1 of each ring town spawns the
 * two species of the chunk's sub-zone. Maps 2–10 reuse that same pair
 * at the higher band. Expansion provinces keep their own species.
 * `monsterStats` scales hp, attack, defense, and agro. Do not bake the
 * level into the species.
 *
 * Add a drop: extend `lootTable`. Weights are relative.
 */

const TOWN_W = 1600;
const TOWN_H = 900;

type LootWeight = { weight: number; kind: 'gold'; min: number; max: number } | { weight: number; kind: 'item'; itemId: ItemId };

export function townZoneId(regionId: RegionId): string {
  return `town:${regionId}`;
}

export function outskirtsId(regionId: RegionId): string {
  return `${regionId}:outskirts`;
}

export function depthsId(regionId: RegionId): string {
  return `${regionId}:depths`;
}

export function nextRegion(regionId: RegionId): string | null {
  const ring = ringNeighbors(regionId);
  if (ring) return ring.next.id;
  return nextProvince(regionId)?.id ?? null;
}

export function createField(zoneId: string): FieldState {
  const resolved = resolveZoneId(zoneId);
  if (resolved.startsWith('town:')) {
    return createTown(resolved.slice(5) as RegionId);
  }
  if (parseTier(resolved)) return createTierMap(resolved);
  const sector = parseSector(resolved);
  if (!sector) return createTown('forest');
  return createSector(sector.zoneId);
}

/** Saved maps from the old sector grid are rebuilt the next time they load. */
export function fieldNeedsRebuild(field: FieldState): boolean {
  if (plainsNeedsVista(field) || desertNeedsDressing(field) || swampNeedsDressing(field)) return true;
  if (field.chunkSize > 0 && isRingTown(field.provinceId)) {
    if (field.tier < 1 || field.width < TIER_MAP_W || field.height < TIER_MAP_H) return true;
    if (!field.zones || field.zones.length !== ZONE_COUNT) return true;
    if (field.faunaRoster !== MAP1_ROSTER_VERSION) return true;
  }
  return false;
}

export function monsterStats(kind: MonsterSpecies, level: number) {
  const steps = Math.max(0, level - 1);
  return {
    hp: kind.hp + steps * (8 + Math.floor(level / 12)),
    mp: monsterMana(kind.id, level),
    attack: kind.attack + Math.floor(steps * 1.6),
    defense: kind.defense + Math.floor(steps * 0.85),
    agro: kind.agro + Math.min(90, Math.floor(level * 1.1)),
  };
}

function createTown(regionId: RegionId): FieldState {
  const region = getRegion(regionId);
  const road = region?.accent ?? '#e4c27a';
  // Spots sit on the cottages and signposts painted in assets/maps/town-valley.jpg.
  // The picture is isometric, so these are markers, not solid building blocks.
  const spots: { id: ServiceId; label: string; x: number; y: number }[] = [
    { id: 'store', label: 'Tạp hóa', x: 540, y: 300 },
    { id: 'smith', label: 'Thợ rèn', x: 880, y: 200 },
    { id: 'inn', label: 'Nhà nghỉ', x: 980, y: 430 },
    { id: 'storage', label: 'Kho đồ', x: 1240, y: 340 },
    { id: 'travel', label: 'Dịch chuyển', x: 700, y: 560 },
    { id: 'cup', label: 'Giải đấu', x: 250, y: 690 },
    { id: 'pvp', label: 'Đấu trường', x: 460, y: 500 },
  ];
  const sensors: Sensor[] = spots.map((spot) => ({
    id: spot.id,
    x: spot.x,
    y: spot.y,
    r: 42,
    label: spot.label,
    service: spot.id,
  }));
  sensors.push({
    id: 'gate',
    x: TOWN_W - 90,
    y: 520,
    r: 48,
    label: 'Cổng ra ngoài',
    toZone: isRingTown(regionId) ? tierZoneId(regionId, 1) : sectorZoneId(regionId, 0, 0),
    arrive: isRingTown(regionId) ? entrancePad(TIER_MAP_W, TIER_MAP_H) : { x: 180, y: SECTOR_SIZE / 2 },
  });

  return {
    zoneId: townZoneId(regionId),
    regionId,
    title: `Thị trấn ${region?.nameVi ?? regionId}`,
    levelMin: 0,
    levelMax: 0,
    width: TOWN_W,
    height: TOWN_H,
    ground: '#7ea85a',
    road,
    player: { x: 400, y: 620, r: 18 },
    blocks: [],
    decor: [],
    sensors,
    monsters: [],
    loot: [],
    heldSensorId: null,
    chunkSize: 0,
    chunks: {},
    activeKeys: [],
    provinceId: regionId,
    sectorCol: 0,
    sectorRow: 0,
    provinceCols: 1,
    provinceRows: 1,
    hazards: [],
    bossChunkKey: null,
    fauna: regionId,
    faunaRoster: MAP1_ROSTER_VERSION,
    tier: 0,
    zones: [],
    quietSpawn: null,
  };
}

function createSector(zoneId: string): FieldState {
  const sector = parseSector(zoneId);
  if (!sector) return createTown('forest');
  const { province, col, row, level } = sector;
  const region = getRegion(province.regionId);
  const mid = SECTOR_SIZE / 2;
  const sensors: Sensor[] = [];
  if (col === 0 && row === 0) {
    sensors.push({ id: 'back-town', x: 70, y: mid, r: 48, label: 'Về thị trấn', toZone: townZoneId(province.regionId) });
  }
  if (col > 0) {
    sensors.push({
      id: 'west',
      x: 70,
      y: mid,
      r: 46,
      label: 'Phía tây',
      toZone: sectorZoneId(province.id, col - 1, row),
      arrive: { x: SECTOR_SIZE - 160, y: mid },
    });
  }
  if (col < SECTOR_COLS - 1) {
    sensors.push({
      id: 'east',
      x: SECTOR_SIZE - 70,
      y: mid,
      r: 46,
      label: 'Phía đông',
      toZone: sectorZoneId(province.id, col + 1, row),
      arrive: { x: 160, y: mid },
    });
  } else {
    const next = nextProvince(province.id);
    if (next) {
      sensors.push({
        id: 'province',
        x: SECTOR_SIZE - 70,
        y: mid,
        r: 50,
        label: `Sang ${next.nameVi}`,
        toZone: sectorZoneId(next.id, 0, 0),
        unlock: next.regionId,
        arrive: { x: 180, y: mid },
      });
    }
  }
  if (row > 0) {
    sensors.push({
      id: 'north',
      x: mid,
      y: 70,
      r: 46,
      label: 'Phía bắc',
      toZone: sectorZoneId(province.id, col, row - 1),
      arrive: { x: mid, y: SECTOR_SIZE - 160 },
    });
  }
  if (row < SECTOR_ROWS - 1) {
    sensors.push({
      id: 'south',
      x: mid,
      y: SECTOR_SIZE - 70,
      r: 46,
      label: 'Phía nam',
      toZone: sectorZoneId(province.id, col, row + 1),
      arrive: { x: mid, y: 160 },
    });
  }

  const hazards = province.endgame
    ? [
        { id: 'hazard-a', x: 700, y: 420, w: 220, h: 140, fill: 'rgba(180, 60, 90, 0.28)', label: 'Độc địa' },
        { id: 'hazard-b', x: 1280, y: 1100, w: 260, h: 160, fill: 'rgba(90, 40, 140, 0.28)', label: 'Hư hại' },
      ]
    : [];
  const plains = province.id === 'plains' ? generatePlains(sector.zoneId, SECTOR_SIZE, SECTOR_SIZE) : null;
  const desert = province.id === 'desert' ? generateDesert(sector.zoneId, SECTOR_SIZE, SECTOR_SIZE) : null;
  const swamp = province.id === 'swamp' ? generateSwamp(sector.zoneId, SECTOR_SIZE, SECTOR_SIZE) : null;
  const dressed = plains ?? desert ?? swamp;

  return {
    zoneId: sector.zoneId,
    regionId: province.regionId,
    title: `${province.nameVi} · khu ${col},${row}`,
    levelMin: level,
    levelMax: level,
    width: SECTOR_SIZE,
    height: SECTOR_SIZE,
    ground: plains ? PLAINS_GRASS : desert ? DESERT_SAND : swamp ? SWAMP_GROUND : province.ground || region?.ground || '#244232',
    road: region?.accent ?? '#c9d4c4',
    player: { x: 180, y: mid, r: 18 },
    blocks: dressed
      ? dressed.solids
      : [
          { x: 640, y: 280, w: 100, h: 80, fill: 'rgba(0,0,0,0.18)' },
          { x: 1200, y: 1500, w: 130, h: 90, fill: 'rgba(0,0,0,0.18)' },
        ],
    decor: dressed ? dressed.soft : [{ x: 40, y: mid - 28, w: SECTOR_SIZE - 80, h: 56, fill: 'rgba(255,255,255,0.05)' }],
    sensors,
    monsters: [],
    loot: [],
    heldSensorId: null,
    chunkSize: CHUNK_SIZE,
    chunks: {},
    activeKeys: [],
    provinceId: province.id,
    sectorCol: col,
    sectorRow: row,
    provinceCols: SECTOR_COLS,
    provinceRows: SECTOR_ROWS,
    hazards,
    bossChunkKey: province.endgame ? bossChunkKey() : null,
    fauna: province.fauna,
    faunaRoster: MAP1_ROSTER_VERSION,
    tier: 0,
    zones: [],
    quietSpawn: { x: 180, y: mid },
  };
}

function createTierMap(zoneId: string): FieldState {
  const map = parseTier(zoneId);
  if (!map) return createTown('forest');
  const { province, tier, levelMin, levelMax } = map;
  const region = getRegion(province.regionId);
  const width = TIER_MAP_W;
  const height = TIER_MAP_H;
  const zones = buildZones(map.zoneId, width, height, tier);
  const neighbors = ringNeighbors(province.id);
  const sensors: Sensor[] = neighbors
    ? huntingSensors({
        townId: province.id,
        regionId: province.regionId,
        tier,
        width,
        height,
        zones,
        west: { id: neighbors.prev.id, regionId: neighbors.prev.regionId, label: gateLabel(neighbors.prev) },
        east: { id: neighbors.next.id, regionId: neighbors.next.regionId, label: gateLabel(neighbors.next) },
        townArrive: { x: TOWN_W - 220, y: 520 },
      })
    : [];
  const dressed = dressMap(province.id, map.zoneId, width, height);
  const entrance = entrancePad(width, height);
  const pads = [
    entrance,
    returnGate(width, height),
    westGate(width, height),
    eastGate(width, height),
    inwardPad(westGate(width, height), width, height),
    inwardPad(eastGate(width, height), width, height),
    ...(tier < MAP_TIERS ? [ascentReturnPad(map.zoneId, width, height)] : []),
    ...sensors.map((sensor) => ({ x: sensor.x, y: sensor.y })),
  ];
  return {
    zoneId: map.zoneId,
    regionId: province.regionId,
    title: `${province.nameVi} · bản đồ ${tier}/${MAP_TIERS}`,
    levelMin,
    levelMax,
    width,
    height,
    ground: dressed.ground || province.ground || region?.ground || '#244232',
    road: region?.accent ?? '#c9d4c4',
    player: { x: entrance.x, y: entrance.y, r: 18 },
    blocks: clearPads(dressed.solids, pads, 240),
    decor: omitHazardsOnPads(clearPads(dressed.soft, pads, 150), pads),
    sensors,
    monsters: [],
    loot: [],
    heldSensorId: null,
    chunkSize: CHUNK_SIZE,
    chunks: {},
    activeKeys: [],
    provinceId: province.id,
    sectorCol: tier - 1,
    sectorRow: 0,
    provinceCols: MAP_TIERS,
    provinceRows: 1,
    hazards: [],
    bossChunkKey: null,
    fauna: province.fauna,
    faunaRoster: MAP1_ROSTER_VERSION,
    tier,
    zones,
    quietSpawn: entrance,
  };
}

function dressMap(provinceId: string, zoneId: string, width: number, height: number): { ground: string | null; soft: Rect[]; solids: Rect[] } {
  if (provinceId === 'plains') {
    const dress = generatePlains(zoneId, width, height);
    return { ground: PLAINS_GRASS, ...dress };
  }
  if (provinceId === 'desert') {
    const dress = generateDesert(zoneId, width, height);
    return { ground: DESERT_SAND, ...dress };
  }
  if (provinceId === 'swamp') {
    const dress = generateSwamp(zoneId, width, height);
    return { ground: SWAMP_GROUND, ...dress };
  }
  if (provinceId === 'savannah') {
    const dress = generateSavannah(zoneId, width, height);
    return { ground: SAVANNAH_GRASS, ...dress };
  }
  const dress = generateScatter(zoneId, width, height);
  return { ground: null, ...dress };
}

/**
 * Fill one chunk the first time it wakes. Two roamers, or one boss in the
 * marked chunk. On a tier map the chunk's center picks the uneven zone.
 * Ring towns place that zone's two Map 1 species, one each, inside the
 * zone's two-level band. They may chase anywhere inside the zone; the
 * sim turns them around at the cell edge.
 */
export function createChunk(field: FieldState, cx: number, cy: number): { monsters: MonsterActor[]; loot: LootActor[] } {
  const size = field.chunkSize || CHUNK_SIZE;
  const originX = cx * size;
  const originY = cy * size;
  const rng = mulberry32(hashString(`${field.zoneId}:${cx}:${cy}`));
  const elite = field.bossChunkKey === `${cx}:${cy}`;
  const zones = field.zones ?? [];
  const zone = zones.length > 0 ? zones[zoneIndexAt(originX + size / 2, originY + size / 2, zones)] : null;
  const band = zone ? zone.levelMax - zone.levelMin : 0;
  const chunkBounds: Rect = { x: originX + 24, y: originY + 24, w: size - 48, h: size - 48 };
  const bounds: Rect = zone
    ? { x: 36, y: 36, w: field.width - 72, h: field.height - 72 }
    : elite
      ? { x: 80, y: 80, w: field.width - 160, h: field.height - 160 }
      : chunkBounds;
  const anchor = field.quietSpawn;
  const quiet = anchor != null && Math.floor(anchor.x / size) === cx && Math.floor(anchor.y / size) === cy;
  const monsters: MonsterActor[] = [];
  const count = elite ? 1 : quiet ? 0 : 2;
  for (let index = 0; index < count; index += 1) {
    const level = zone ? zone.levelMin + (rng() < 0.5 ? 0 : band) : field.levelMin + (elite ? 2 : 0);
    const pair = zone ? townSpecies(field.fauna, zone.index) : null;
    const kind = pair ? pair[elite ? 1 : index % pair.length] : expansionSpecies(field.fauna);
    const stats = monsterStats(kind, level);
    let x = chunkBounds.x + 40 + rng() * (chunkBounds.w - 80);
    let y = chunkBounds.y + 40 + rng() * (chunkBounds.h - 80);
    let placed = zone == null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const nx = chunkBounds.x + 40 + rng() * (chunkBounds.w - 80);
      const ny = chunkBounds.y + 40 + rng() * (chunkBounds.h - 80);
      if (hitsSolid(nx, ny, 18, field.blocks)) continue;
      if (zone && zoneIndexAt(nx, ny, zones) !== zone.index) continue;
      x = nx;
      y = ny;
      placed = true;
      break;
    }
    if (!placed) continue;
    const motion = locomotion(kind.id);
    const patrol = zone
      ? [0, 1, 2].map(() => sampleInZone(rng, zone, zones, field.width, field.height))
      : [0, 1, 2].map(() => ({
          x: chunkBounds.x + 30 + rng() * (chunkBounds.w - 60),
          y: chunkBounds.y + 30 + rng() * (chunkBounds.h - 60),
        }));
    monsters.push({
      id: `${kind.id}-${field.zoneId}-${cx}-${cy}-${index}`,
      kindId: kind.id,
      name: elite ? `Thủ lĩnh ${kind.deepName ?? kind.name}` : kind.name,
      level,
      x,
      y,
      r: elite ? 26 : 16,
      tint: kind.tint,
      hp: elite ? stats.hp * 4 : stats.hp,
      maxHp: elite ? stats.hp * 4 : stats.hp,
      mp: elite ? stats.mp * 2 : stats.mp,
      maxMp: elite ? stats.mp * 2 : stats.mp,
      exp: 0,
      attack: elite ? stats.attack + 6 : stats.attack,
      defense: elite ? stats.defense + 4 : stats.defense,
      agro: elite ? stats.agro + 40 : stats.agro,
      speed: elite ? kind.speed * 0.85 : kind.speed,
      bounds,
      homeX: x,
      homeY: y,
      calm: 0,
      nextDrop: 12 + rng() * 8,
      pause: 0,
      patrol,
      patrolIndex: 0,
      elite,
      zoneIndex: zone?.index ?? 0,
      gait: motion.gait,
      gaitTimer: motion.gait === 'hop' ? 0.4 + rng() * 2.2 : motion.gait === 'burst' ? 0.1 + rng() * 0.45 : 0,
      phase: rng() * Math.PI * 2,
      facing: rng() * Math.PI * 2,
      hopT: 0,
      hopFromX: x,
      hopFromY: y,
      hopToX: x,
      hopToY: y,
    });
  }
  const lootLevel = zone ? zone.levelMin : field.levelMin + (elite ? 2 : 0);
  const loot = elite ? [] : [rollLoot(lootLevel, originX + 80 + rng() * (size - 160), originY + 80 + rng() * (size - 160), rng)];
  return { monsters, loot };
}

/** Relative weights. Gold and food are common. Gear is a rare find from level 6 up. */
export function lootTable(level: number): LootWeight[] {
  const table: LootWeight[] = [
    { weight: 50, kind: 'gold', min: 3 + level, max: 8 + level * 2 },
    { weight: 22, kind: 'item', itemId: 'ration' },
    { weight: 14, kind: 'item', itemId: 'hp-potion' },
    { weight: 8, kind: 'item', itemId: 'antidote' },
    { weight: 10, kind: 'item', itemId: 'berry' },
    { weight: 6, kind: 'item', itemId: 'net' },
    { weight: 8, kind: 'item', itemId: 'stamina-potion' },
  ];
  if (level >= 2) table.push({ weight: 4, kind: 'item', itemId: 'town-scroll' });
  if (level >= 4) table.push({ weight: 8, kind: 'item', itemId: 'mana-potion' });
  if (level >= 5) table.push({ weight: 6, kind: 'item', itemId: 'mana-fruit' });
  if (level >= 6) table.push({ weight: 3, kind: 'item', itemId: 'sword' });
  if (level >= 8) table.push({ weight: 4, kind: 'item', itemId: 'hearty-fruit' });
  if (level >= 10) table.push({ weight: 3, kind: 'item', itemId: 'armor' });
  return table;
}

export function rollLoot(level: number, x: number, y: number, rng: () => number = Math.random): LootActor {
  const table = lootTable(level);
  const total = table.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = rng() * total;
  let picked = table[0];
  for (const entry of table) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      picked = entry;
      break;
    }
  }
  if (picked.kind === 'gold') {
    const amount = picked.min + Math.floor(rng() * (picked.max - picked.min + 1));
    return { id: uid(), x, y, kind: 'gold', amount, label: `${amount} vàng`, tint: '#e4c27a' };
  }
  const item = ITEMS[picked.itemId];
  return { id: uid(), x, y, kind: 'item', amount: 1, itemId: picked.itemId, label: item.nameVi, tint: item.tint };
}


function uid(): string {
  return `loot-${Math.random().toString(36).slice(2, 9)}`;
}
