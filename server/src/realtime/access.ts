/**
 * Map entry rules. Keep the windows aligned with `src/world/atlas.ts`
 * `tierWindow` and `specialRegionOpen` in the Expo app.
 *
 * Levels 1–10 may enter map 1 and map 2. Levels 11–20 may enter map 2 and
 * map 3. Each later band shifts the pair up by one map.
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
  if (unlock != null && level < unlock) return LOCKED_LAND;

  const parts = zoneId.split(':');
  const band = parts[1];
  if (!RING.includes(provinceId) || parts.length !== 2 || !band?.startsWith('m')) return null;
  const tier = Number(band.slice(1));
  if (!Number.isInteger(tier) || tier < 1 || tier > MAP_TIERS) return null;
  const window = tierWindow(level);
  if (tier >= window.low && tier <= window.high) return null;
  const levelMin = (tier - 1) * TIER_LEVELS + 1;
  if (level < levelMin) return `Cấp của bạn chưa đủ để vào bản đồ ${tier}.`;
  const allowed = window.low === window.high ? `bản đồ ${window.low}` : `bản đồ ${window.low} và ${window.high}`;
  return `Cấp của bạn không vào được bản đồ ${tier}. Bạn chỉ vào được ${allowed}.`;
}

function tierWindow(level: number): { low: number; high: number } {
  const band = Math.max(1, Math.min(MAP_TIERS, Math.ceil(Math.max(1, level) / TIER_LEVELS)));
  return { low: band, high: Math.min(MAP_TIERS, band + 1) };
}
