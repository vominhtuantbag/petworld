import type { RegionId } from '../types/game';
import { getRegion } from '../data/regions';
import { isRingTown, sectorZoneId } from './atlas';
import { SECTOR_SIZE, TIER_MAP_H, TIER_MAP_W } from './grid';
import { TRAVEL_COST } from './items';
import { MAP1_ROSTER_VERSION } from './monsters';
import { getRegionalTown, listExpansionTowns, listRingTowns, type RegionalTownConfig } from './regionConfig';
import { clearPads, entrancePad, tierZoneId } from './tiers';
import {
  TOWN_GRID_BLOCKS,
  TOWN_MAP_SIZE,
  TOWN_NAV_VERSION,
  snapTownWalk,
  townGridBlocksFor,
} from './townGridNav';
import type { FieldState, Rect, Sensor, ServiceId, Vec } from './types';

/**
 * Town hub architecture — all 16 regional towns.
 *
 * Canvas is a fixed 5000×5000 world matching `assets/towns/*-town.jpg`.
 * Shared red/green valley mask (`townGridNav`) gates movement: red solids
 * block, green corridors + center plaza are walkable. NPC sensors snap onto
 * green paths. Hunting maps stay separate (`MAP_SCALE` in `grid.ts`).
 */

export const TOWN_W = TOWN_MAP_SIZE;
export const TOWN_H = TOWN_MAP_SIZE;
/** @deprecated Prefer TOWN_W — kept for callers that scaled the old 1600 board. */
export const TOWN_LAYOUT_W = TOWN_MAP_SIZE;
/** @deprecated Prefer TOWN_H */
export const TOWN_LAYOUT_H = TOWN_MAP_SIZE;
/** World pixels equal art pixels on the 5000 canvas. */
export const TOWN_SCALE = 1;

/** Gold fee charged by the Teleporter NPC for unlocked destinations. */
export const TELEPORT_FEE = TRAVEL_COST;

const SERVICE_R = 56;
const GATE_R = 64;

export type TownServiceDef = {
  id: ServiceId;
  label: string;
  role: string;
  /** World coordinates on the 5000×5000 canvas. */
  x: number;
  y: number;
  r: number;
};

/**
 * Preferred landmarks around the center plaza / green spokes.
 * `servicesFor` snaps each onto the walkable mask.
 */
export const TOWN_SERVICES: readonly TownServiceDef[] = [
  { id: 'store', label: 'Tạp hóa', role: 'General Store — HP, Mana, and stamina consumables', x: 2550, y: 2800, r: SERVICE_R },
  { id: 'smith', label: 'Thợ rèn', role: 'Blacksmith — buy and upgrade weapons / gear', x: 2800, y: 2500, r: SERVICE_R },
  { id: 'inn', label: 'Nhà nghỉ', role: 'Inn — full restore for hero and active pets', x: 2500, y: 2200, r: SERVICE_R },
  { id: 'storage', label: 'Kho đồ', role: 'Storage — secure vault for items and pets', x: 2200, y: 2500, r: SERVICE_R },
  { id: 'travel', label: 'Dịch chuyển', role: 'Teleporter — fast travel between unlocked hubs', x: 2500, y: 2500, r: SERVICE_R },
  { id: 'cup', label: 'Giải đấu', role: 'Tournament board', x: 2700, y: 2700, r: SERVICE_R },
  { id: 'pvp', label: 'Đấu trường', role: 'Arena entrance', x: 2300, y: 2700, r: SERVICE_R },
] as const;

export type TownExit = {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  toZone: string;
  arrive: Vec;
};

function servicesFor(regionId: RegionId): readonly TownServiceDef[] {
  const blocks = townGridBlocksFor(regionId);
  return TOWN_SERVICES.map((spot) => {
    const at = snapTownWalk(spot.x, spot.y, 400, blocks);
    return { ...spot, x: at.x, y: at.y };
  });
}

export function townZoneId(regionId: RegionId): string {
  return `town:${regionId}`;
}

export function isTownZone(zoneId: string): boolean {
  return zoneId.startsWith('town:');
}

export function townRegionFromZone(zoneId: string): RegionId | null {
  if (!isTownZone(zoneId)) return null;
  return zoneId.slice(5) as RegionId;
}

/** East gate on the green ring corridor → open-world hunting map / sector. */
export function openWorldExit(regionId: RegionId): TownExit {
  const ring = isRingTown(regionId);
  const gate = snapTownWalk(4900, 2500, 400, townGridBlocksFor(regionId));
  return {
    id: 'gate',
    x: gate.x,
    y: gate.y,
    r: GATE_R,
    label: 'Cổng ra ngoài',
    toZone: ring ? tierZoneId(regionId, 1) : sectorZoneId(regionId, 0, 0),
    arrive: ring ? entrancePad(TIER_MAP_W, TIER_MAP_H) : { x: 180, y: SECTOR_SIZE / 2 },
  };
}

/** Pad used when a hunting map returns the player to town. */
export function townReturnPad(regionId: RegionId = 'plains'): Vec {
  return snapTownWalk(4700, 2500, 400, townGridBlocksFor(regionId));
}

/** Fresh spawn on the center plaza. */
export function townSpawnPad(regionId: RegionId = 'plains'): Vec {
  return snapTownWalk(2500, 2500, 400, townGridBlocksFor(regionId));
}

export function townServiceSensors(regionId: RegionId = 'plains'): Sensor[] {
  return servicesFor(regionId).map((spot) => ({
    id: spot.id,
    x: spot.x,
    y: spot.y,
    r: spot.r,
    label: spot.label,
    service: spot.id,
  }));
}

export function townSensors(regionId: RegionId): Sensor[] {
  const exit = openWorldExit(regionId);
  return [
    ...townServiceSensors(regionId),
    {
      id: exit.id,
      x: exit.x,
      y: exit.y,
      r: exit.r,
      label: exit.label,
      toZone: exit.toZone,
      arrive: exit.arrive,
    },
  ];
}

export function townTheme(regionId: RegionId): RegionalTownConfig | null {
  return getRegionalTown(regionId);
}

function townBlocks(regionId: RegionId, pads: readonly Vec[]): Rect[] {
  const mask = townGridBlocksFor(regionId);
  // Hand-drawn masks are authoritative: red stays solid, so no carving around pads.
  if (mask !== TOWN_GRID_BLOCKS) return [...mask];
  return clearPads([...mask], pads, 48);
}

/** Rebuild when size, nav version, or stale loot caches change. */
export function townNeedsResize(
  field: Pick<FieldState, 'zoneId' | 'width' | 'height' | 'blocks' | 'sectorCol' | 'loot'>,
): boolean {
  if (!isTownZone(field.zoneId)) return false;
  if (field.width !== TOWN_W || field.height !== TOWN_H) return true;
  if (field.loot.length > 0) return true;
  if (field.sectorCol !== TOWN_NAV_VERSION) return true;
  const mask = townGridBlocksFor(townRegionFromZone(field.zoneId));
  if (field.blocks.length < Math.floor(mask.length * 0.5)) return true;
  return false;
}

/**
 * Walkable hub for any of the 16 regional towns.
 * No monsters, no chunks, no ground loot — shared green-path collision.
 */
export function createTownField(regionId: RegionId): FieldState {
  const region = getRegion(regionId);
  const theme = getRegionalTown(regionId);
  const road = theme?.palette.road ?? region?.accent ?? '#e4c27a';
  const ground = theme?.palette.primary ?? region?.ground ?? '#7ea85a';
  const spawn = townSpawnPad(regionId);
  const sensors = townSensors(regionId);
  const pads = [spawn, ...sensors.map((sensor) => ({ x: sensor.x, y: sensor.y }))];

  return {
    zoneId: townZoneId(regionId),
    regionId,
    title: `Thị trấn ${region?.nameVi ?? regionId}`,
    levelMin: 0,
    levelMax: 0,
    width: TOWN_W,
    height: TOWN_H,
    ground,
    road,
    player: { x: spawn.x, y: spawn.y, r: 18 },
    blocks: townBlocks(regionId, pads),
    decor: [],
    sensors,
    monsters: [],
    loot: [],
    heldSensorId: null,
    chunkSize: 0,
    chunks: {},
    activeKeys: [],
    provinceId: regionId,
    sectorCol: TOWN_NAV_VERSION,
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

export type TravelDestination = {
  regionId: RegionId;
  nameVi: string;
  name: string;
  kind: 'ring' | 'expansion';
  unlockLevel: number;
  fee: number;
};

export function travelDestinations(adventureLevel: number): TravelDestination[] {
  const ring = listRingTowns().map((town) => toDestination(town, 'ring'));
  const expansion = listExpansionTowns().map((town) => toDestination(town, 'expansion'));
  return [...ring, ...expansion].filter((dest) => adventureLevel >= dest.unlockLevel || dest.kind === 'expansion');
}

function toDestination(town: RegionalTownConfig, kind: 'ring' | 'expansion'): TravelDestination {
  const region = getRegion(town.id);
  return {
    regionId: town.id,
    nameVi: town.nameVi,
    name: region?.name ?? town.biomeLabel,
    kind,
    unlockLevel: town.unlockLevel,
    fee: TELEPORT_FEE,
  };
}

export function travelFeeFor(_regionId: RegionId): number {
  return TELEPORT_FEE;
}

export const CORE_TOWN_SERVICES: readonly ServiceId[] = ['store', 'smith', 'storage', 'travel', 'inn'];
