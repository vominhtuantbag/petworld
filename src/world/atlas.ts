import type { RegionId } from '../types/game';
import { SECTOR_CHUNKS } from './grid';
import { MAP_TIERS, TIER_LEVELS, tierRange, tierZoneId } from './tiers';

/**
 * Two maps live side by side.
 *
 * Town ring — the ten starter regions, in road order:
 *   1 Đồng bằng, 2 Núi non, 3 Rừng rậm, 4 Đầm lầy, 5 Bãi biển,
 *   6 Đại dương, 7 Băng giá, 8 Thảo Nguyên Hoang Dã, 9 Núi lửa, 10 Sa mạc.
 * Each town has `MAP_TIERS` hunting maps (`town:m1` … `town:m10`) covering
 * levels 1–100. West and east gates stay on the same tier and walk the
 * ring: map 1 of Đồng bằng meets Núi non and Sa mạc. The far gate climbs
 * to the next tier of the same town. See `tiers.ts` for seeds and pads.
 *
 * Expansion — Dark, Chaos, Light, Outer Space, and the Void stay a 6×6
 * sector grid. A sector id is `province:col:row`.
 *
 * Old starter ids still resolve: `region:outskirts` → tier 1,
 * `region:depths` → tier 2, and `region:col:row` → tier `col + row + 1`.
 */

export const SECTOR_COLS = 6;
export const SECTOR_ROWS = 6;

export type ProvinceId = RegionId | 'void';

export type ProvinceDef = {
  id: ProvinceId;
  /** Visual region. Void has no setup-screen region, so it borrows a dark sky. */
  regionId: RegionId;
  nameVi: string;
  fauna: string;
  levelMin: number;
  levelMax: number;
  /** Tier 3 sectors spawn a roaming boss and hazard patches. */
  endgame: boolean;
  ground: string;
};

/**
 * Ring towns span levels 1–100 across their ten maps. The numbers here are
 * the whole town, not one sector. Expansion provinces keep a narrower band.
 */
export const PROVINCES: ProvinceDef[] = [
  { id: 'forest', regionId: 'forest', nameVi: 'Rừng rậm', fauna: 'forest', levelMin: 1, levelMax: 100, endgame: false, ground: '#2d5a38' },
  { id: 'plains', regionId: 'plains', nameVi: 'Đồng bằng', fauna: 'plains', levelMin: 1, levelMax: 100, endgame: false, ground: '#6ea24e' },
  { id: 'beach', regionId: 'beach', nameVi: 'Bãi biển', fauna: 'beach', levelMin: 1, levelMax: 100, endgame: false, ground: '#e6d2a8' },
  { id: 'swamp', regionId: 'swamp', nameVi: 'Đầm lầy', fauna: 'swamp', levelMin: 1, levelMax: 100, endgame: false, ground: '#2a3a2c' },
  { id: 'savannah', regionId: 'savannah', nameVi: 'Thảo Nguyên Hoang Dã', fauna: 'savannah', levelMin: 1, levelMax: 100, endgame: false, ground: '#c6a15a' },
  { id: 'desert', regionId: 'desert', nameVi: 'Sa mạc', fauna: 'desert', levelMin: 1, levelMax: 100, endgame: false, ground: '#e2c48a' },
  { id: 'mountains', regionId: 'mountains', nameVi: 'Núi non', fauna: 'mountains', levelMin: 1, levelMax: 100, endgame: false, ground: '#5c6b73' },
  { id: 'ocean', regionId: 'ocean', nameVi: 'Đại dương', fauna: 'ocean', levelMin: 1, levelMax: 100, endgame: false, ground: '#134868' },
  { id: 'tundra', regionId: 'tundra', nameVi: 'Băng giá', fauna: 'tundra', levelMin: 1, levelMax: 100, endgame: false, ground: '#eef5f8' },
  { id: 'volcano', regionId: 'volcano', nameVi: 'Núi lửa', fauna: 'volcano', levelMin: 1, levelMax: 100, endgame: false, ground: '#3a2420' },
  { id: 'dark', regionId: 'dark', nameVi: 'Bóng tối', fauna: 'dark', levelMin: 51, levelMax: 70, endgame: true, ground: '#14101f' },
  { id: 'chaos', regionId: 'chaos', nameVi: 'Hỗn mang', fauna: 'chaos', levelMin: 71, levelMax: 85, endgame: true, ground: '#2a1438' },
  { id: 'light', regionId: 'light', nameVi: 'Ánh sáng', fauna: 'light', levelMin: 86, levelMax: 100, endgame: true, ground: '#f7e7b8' },
  { id: 'outer-space', regionId: 'outer-space', nameVi: 'Vũ trụ', fauna: 'space', levelMin: 101, levelMax: 120, endgame: true, ground: '#16132a' },
  { id: 'void', regionId: 'dark', nameVi: 'Hư không', fauna: 'void', levelMin: 121, levelMax: 140, endgame: true, ground: '#120818' },
  { id: 'heaven', regionId: 'heaven', nameVi: 'Thiên đường', fauna: 'heaven', levelMin: 141, levelMax: 160, endgame: true, ground: '#f6e7b4' },
  { id: 'hell', regionId: 'hell', nameVi: 'Địa ngục', fauna: 'hell', levelMin: 161, levelMax: 180, endgame: true, ground: '#3a1214' },
];

/** Circular road. Index 0 meets index 1 and index 9 at the same map tier. */
export const TOWN_RING: readonly ProvinceId[] = [
  'plains',
  'mountains',
  'forest',
  'swamp',
  'beach',
  'ocean',
  'tundra',
  'savannah',
  'volcano',
  'desert',
];

const BY_ID = new Map(PROVINCES.map((province) => [province.id, province]));

export type SectorAddress = {
  province: ProvinceDef;
  col: number;
  row: number;
  level: number;
  zoneId: string;
};

export type TierAddress = {
  province: ProvinceDef;
  tier: number;
  levelMin: number;
  levelMax: number;
  zoneId: string;
};

export function isRingTown(id: string): id is ProvinceId {
  return (TOWN_RING as readonly string[]).includes(id);
}

export function gateLabel(province: ProvinceDef): string {
  if (province.id === 'savannah') return 'Hoang dã';
  return province.nameVi;
}

export function ringNeighbors(id: ProvinceId): { prev: ProvinceDef; next: ProvinceDef } | null {
  const index = TOWN_RING.indexOf(id);
  if (index < 0) return null;
  const prev = BY_ID.get(TOWN_RING[(index - 1 + TOWN_RING.length) % TOWN_RING.length]);
  const next = BY_ID.get(TOWN_RING[(index + 1) % TOWN_RING.length]);
  if (!prev || !next) return null;
  return { prev, next };
}

export function sectorZoneId(provinceId: string, col: number, row: number): string {
  return `${provinceId}:${col}:${row}`;
}

export function resolveZoneId(zoneId: string): string {
  const parts = zoneId.split(':');
  const provinceId = parts[0] ?? '';
  const band = parts[1];
  if (isRingTown(provinceId)) {
    if (band === 'outskirts') return tierZoneId(provinceId, 1);
    if (band === 'depths') return tierZoneId(provinceId, 2);
    if (band?.startsWith('m') && parts.length === 2) return `${provinceId}:${band}`;
    if (parts.length === 3) {
      const col = Number(parts[1]);
      const row = Number(parts[2]);
      if (Number.isInteger(col) && Number.isInteger(row)) {
        const tier = Math.max(1, Math.min(MAP_TIERS, col + row + 1));
        return tierZoneId(provinceId, tier);
      }
    }
  }
  if (band === 'outskirts') return sectorZoneId(provinceId, 0, 0);
  if (band === 'depths') return sectorZoneId(provinceId, 1, 0);
  return zoneId;
}

export function parseTier(zoneId: string): TierAddress | null {
  const resolved = resolveZoneId(zoneId);
  const parts = resolved.split(':');
  if (parts.length !== 2 || !parts[1]?.startsWith('m')) return null;
  const province = BY_ID.get(parts[0] as ProvinceId);
  const tier = Number(parts[1].slice(1));
  if (!province || !isRingTown(province.id)) return null;
  if (!Number.isInteger(tier) || tier < 1 || tier > MAP_TIERS) return null;
  return { province, tier, ...tierRange(tier), zoneId: tierZoneId(province.id, tier) };
}

export function parseSector(zoneId: string): SectorAddress | null {
  const resolved = resolveZoneId(zoneId);
  const parts = resolved.split(':');
  if (parts.length !== 3) return null;
  const province = BY_ID.get(parts[0] as ProvinceId);
  const col = Number(parts[1]);
  const row = Number(parts[2]);
  if (!province || isRingTown(province.id) || !Number.isInteger(col) || !Number.isInteger(row)) return null;
  if (col < 0 || row < 0 || col >= SECTOR_COLS || row >= SECTOR_ROWS) return null;
  return { province, col, row, level: sectorLevel(province, col, row), zoneId: resolved };
}

export function sectorLevel(province: ProvinceDef, col: number, row: number): number {
  const span = province.levelMax - province.levelMin;
  const steps = Math.max(1, SECTOR_COLS + SECTOR_ROWS - 2);
  return province.levelMin + Math.round((span * (col + row)) / steps);
}

export function nextProvince(id: ProvinceId): ProvinceDef | null {
  const index = PROVINCES.findIndex((province) => province.id === id);
  if (index < 0 || index >= PROVINCES.length - 1) return null;
  return PROVINCES[index + 1];
}

export function provinceCount(): number {
  const expansion = PROVINCES.filter((province) => !isRingTown(province.id)).length;
  return TOWN_RING.length * MAP_TIERS + expansion * SECTOR_COLS * SECTOR_ROWS;
}

/** Shown when a special region has not reached its unlock level yet. */
export const LOCKED_LAND = 'vùng đất chưa mở';

/**
 * The six endgame lands. They stay shut until the adventurer reaches the
 * province's lowest level. Teleport and gates both use this list.
 */
export const SPECIAL_REGION_IDS = ['dark', 'light', 'heaven', 'hell', 'chaos', 'outer-space'] as const;

export type SpecialRegionId = (typeof SPECIAL_REGION_IDS)[number];

export function isSpecialRegion(id: string): id is SpecialRegionId {
  return (SPECIAL_REGION_IDS as readonly string[]).includes(id);
}

/**
 * Highest hunting map this level may enter, plus the next map as a look-ahead.
 * Every lower map stays open so a high-level walker can always walk home.
 */
export function tierWindow(level: number): { low: number; high: number } {
  const band = Math.max(1, Math.min(MAP_TIERS, Math.ceil(Math.max(1, level) / TIER_LEVELS)));
  return { low: 1, high: Math.min(MAP_TIERS, band + 1) };
}

export function specialUnlockLevel(id: string): number | null {
  if (!isSpecialRegion(id)) return null;
  return BY_ID.get(id)?.levelMin ?? null;
}

/** A special region opens once adventure level reaches its lowest monster. */
export function specialRegionOpen(id: string, adventureLevel: number): boolean {
  const need = specialUnlockLevel(id);
  if (need == null) return true;
  return adventureLevel >= need;
}

function zoneProvinceId(zoneId: string): string {
  if (zoneId.startsWith('town:')) return zoneId.slice(5);
  return zoneId.split(':')[0] ?? '';
}

/**
 * Hunting maps stay open from map 1 up through the current band (and the next
 * map). Higher-level players can always walk back through lower maps and into
 * any ring town. Special regions stay shut until their unlock level.
 */
export function entryBlock(adventureLevel: number, zoneId: string, homeProvince: string): string | null {
  const resolved = resolveZoneId(zoneId);
  const provinceId = zoneProvinceId(resolved);
  if (resolved.startsWith('town:') || zoneId.startsWith('town:')) {
    if (isSpecialRegion(provinceId) && !specialRegionOpen(provinceId, adventureLevel)) return LOCKED_LAND;
    return null;
  }
  if (isSpecialRegion(provinceId) && !specialRegionOpen(provinceId, adventureLevel)) return LOCKED_LAND;

  const tier = parseTier(resolved);
  if (tier) {
    const window = tierWindow(adventureLevel);
    if (tier.tier <= window.high) return null;
    const place = `${tier.province.nameVi} bản đồ ${tier.tier}`;
    return `Cấp của bạn chưa đủ để vào ${place}. Bạn vào được bản đồ 1 đến ${window.high}.`;
  }

  const sector = parseSector(resolved);
  if (!sector || isSpecialRegion(sector.province.id)) return null;
  const training = sector.province.id === homeProvince && sector.col + sector.row <= 1;
  if (training) return null;
  const slack = 4;
  if (adventureLevel + slack < sector.level) {
    return `${sector.province.nameVi} ${sector.col},${sector.row} là cấp ${sector.level}. Hãy đạt cấp ${Math.max(1, sector.level - slack)} trước.`;
  }
  return null;
}

export function bossChunkKey(): string {
  const mid = Math.floor(SECTOR_CHUNKS / 2);
  return `${mid}:${mid}`;
}
