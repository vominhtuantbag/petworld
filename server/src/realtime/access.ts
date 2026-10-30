/**
 * Map entry rules. Keep the windows aligned with `src/world/atlas.ts`
 * `tierWindow` and `specialRegionOpen` in the Expo app.
 *
 * A level band may enter every hunting map from 1 up through its current
 * map and the next one. Towns of unlocked ring regions are always open.
 */

const MAP_TIERS = 10;
const TIER_LEVELS = 10;
const RING = ['plains', 'mountains', 'forest', 'swamp', 'beach', 'ocean', 'tundra', 'savannah', 'volcano', 'desert'];

export const LOCKED_LAND = 'vùng đất chưa mở';

const SPECIAL_LEVEL: Record<string, number> = {
  dark: 51,
  light: 86,
  heaven: 141,
  hell: 161,
  chaos: 71,
  'outer-space': 101,
};

export function entryDenial(level: number, zoneId: string): string | null {
  const provinceId = zoneId.startsWith('town:') ? zoneId.slice(5) : (zoneId.split(':')[0] ?? '');
  const unlock = SPECIAL_LEVEL[provinceId];
  if (zoneId.startsWith('town:')) {
    if (unlock != null && level < unlock) return LOCKED_LAND;
    return null;
  }
  if (unlock != null && level < unlock) return LOCKED_LAND;

  const parts = zoneId.split(':');
  const band = parts[1];
  if (!RING.includes(provinceId) || parts.length !== 2 || !band?.startsWith('m')) return null;
  const tier = Number(band.slice(1));
  if (!Number.isInteger(tier) || tier < 1 || tier > MAP_TIERS) return null;
  const window = tierWindow(level);
  if (tier <= window.high) return null;
  return `Cấp của bạn chưa đủ để vào bản đồ ${tier}. Bạn vào được bản đồ 1 đến ${window.high}.`;
}

function tierWindow(level: number): { low: number; high: number } {
  const band = Math.max(1, Math.min(MAP_TIERS, Math.ceil(Math.max(1, level) / TIER_LEVELS)));
  return { low: 1, high: Math.min(MAP_TIERS, band + 1) };
}
