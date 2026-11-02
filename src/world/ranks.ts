/** Client copy of the ranked ladder. Keep the names aligned with `server/src/realtime/ranks.ts`. */

export const RANK_TIERS = ['Đồng', 'Bạc', 'Vàng', 'Bạch kim', 'Kim cương', 'Cao thủ', 'Huyền thoại'] as const;
export const STARS_PER_TIER = 5;

export function rankTitle(rankIndex: number): string {
  const index = Math.max(0, Math.min(RANK_TIERS.length - 1, Math.round(rankIndex || 0)));
  return RANK_TIERS[index] ?? RANK_TIERS[0];
}

export function rankTint(rankIndex: number): string {
  if (rankIndex >= 6) return '#e8d48a';
  if (rankIndex >= 5) return '#c9a0ff';
  if (rankIndex >= 4) return '#7ecbff';
  if (rankIndex >= 3) return '#b8c4d4';
  if (rankIndex >= 2) return '#e4c27a';
  if (rankIndex >= 1) return '#d9dde6';
  return '#c47a3a';
}
