/**
 * Ranked PvP ladder. Five stars fill a tier, then the player promotes.
 * MMR is a separate number used only for matchmaking bands.
 */

export const RANK_TIERS = ['Đồng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương', 'Cao thủ', 'Huyền thoại'] as const;
export const STARS_PER_TIER = 5;
export const DEFAULT_MMR = 1000;

export type RankState = {
  stars: number;
  rankIndex: number;
  mmr: number;
};

export function normalizeRank(stats?: { stars?: number; rankIndex?: number; mmr?: number } | null): RankState {
  const rankIndex = clamp(stats?.rankIndex ?? 0, 0, RANK_TIERS.length - 1);
  const stars = clamp(stats?.stars ?? 0, 0, STARS_PER_TIER);
  const mmr = clamp(stats?.mmr ?? DEFAULT_MMR, 100, 4000);
  return { stars, rankIndex, mmr };
}

export function rankTitle(rankIndex: number): string {
  return RANK_TIERS[clamp(rankIndex, 0, RANK_TIERS.length - 1)] ?? RANK_TIERS[0];
}

export function applyStarResult(current: RankState, outcome: 'win' | 'loss' | 'draw'): RankState {
  const next = { ...normalizeRank(current) };
  if (outcome === 'draw') return next;
  if (outcome === 'win') {
    next.mmr = clamp(next.mmr + 20, 100, 4000);
    if (next.stars < STARS_PER_TIER) {
      next.stars += 1;
      return next;
    }
    if (next.rankIndex < RANK_TIERS.length - 1) {
      next.rankIndex += 1;
      next.stars = 0;
      return next;
    }
    next.stars = STARS_PER_TIER;
    return next;
  }
  next.mmr = clamp(next.mmr - 20, 100, 4000);
  if (next.stars > 0) {
    next.stars -= 1;
    return next;
  }
  if (next.rankIndex > 0) {
    next.rankIndex -= 1;
    next.stars = STARS_PER_TIER - 1;
  }
  return next;
}

export function mmrBand(waitMs: number): number {
  if (waitMs <= 5_000) return 0.05;
  if (waitMs <= 12_000) return 0.15;
  return 0.3;
}

export function mmrClose(a: number, b: number, band: number): boolean {
  const base = Math.max(100, a);
  return Math.abs(a - b) / base <= band + 1e-9;
}

export const BOT_NAMES = ['Minh', 'Linh', 'Hùng', 'Trang', 'Đức', 'Mai', 'Khoa', 'Hà', 'Long', 'Yến', 'Nam', 'Thảo', 'Phúc', 'Ngọc', 'Dũng', 'Hương', 'Quang', 'Tuấn', 'My', 'An'];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
