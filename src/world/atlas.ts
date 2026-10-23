import type { RegionId } from '../types/game';
import { SECTOR_CHUNKS } from './grid';
import { MAP_TIERS, tierRange, tierZoneId } from './tiers';

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

/**
 * Home town, tier 1, is the training yard. Every other hunting map asks
 * you to be within `slack` levels of its easiest monster. Expansion
 * sectors keep the old corner-sector rule.
 */
export function entryBlock(adventureLevel: number, zoneId: string, homeProvince: string): string | null {
  const tier = parseTier(zoneId);
  if (tier) {
    const training = tier.tier === 1 && tier.province.id === homeProvince;
    if (training) return null;
    const slack = 4;
    if (adventureLevel + slack < tier.levelMin) {
      return `${tier.province.nameVi} bản đồ ${tier.tier} là cấp ${tier.levelMin}. Hãy đạt cấp ${Math.max(1, tier.levelMin - slack)} trước.`;
    }
    return null;
  }
  const sector = parseSector(zoneId);
  if (!sector) return null;
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
