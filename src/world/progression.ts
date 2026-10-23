/**
 * Slow adventure curve. This is separate from the PvP level stored on the
 * account (that one still comes from duel wins).
 *
 * Level 1 needs a handful of fights. Later levels ask for hundreds.
 * Change the exponent here, then mirror the same numbers in
 * `server/src/tournament/brackets.ts` level bands if a bracket boundary moves.
 *
 *   expForNextLevel(1)  ≈ 90
 *   expForNextLevel(20) ≈ 22_000
 *   expForNextLevel(50) ≈ 126_000
 *   expForNextLevel(100) ≈ 450_000
 */

export const ADVENTURE_LEVEL_CAP = 200;

export function expForNextLevel(level: number): number {
  const safe = Math.max(1, level);
  return Math.floor(90 * Math.pow(safe, 1.85));
}

export function expFromMonster(level: number, elite: boolean): number {
  return (8 + level * 3) * (elite ? 8 : 1);
}

/**
 * Low drop rate on purpose. Farming a zone far below you pays almost
 * nothing. Elites are the reliable reward, and they are rare.
 */
export function dropChance(playerLevel: number, monsterLevel: number, elite: boolean): number {
  if (elite) return 0.28;
  const gap = monsterLevel - playerLevel;
  if (gap <= -10) return 0.03;
  if (gap >= 8) return 0.16;
  return 0.1;
}

export type LevelBand = { tier: 1 | 2 | 3; levelMin: number; levelMax: number; nameVi: string };

/** Tournament and danger bands. Tier 3 stays open-ended past 100. */
export const LEVEL_BANDS: LevelBand[] = [
  { tier: 1, levelMin: 1, levelMax: 20, nameVi: 'Tân thủ' },
  { tier: 2, levelMin: 21, levelMax: 50, nameVi: 'Trung cấp' },
  { tier: 3, levelMin: 51, levelMax: 200, nameVi: 'Cao cấp' },
];

export function bandForLevel(level: number): LevelBand {
  return LEVEL_BANDS.find((band) => level >= band.levelMin && level <= band.levelMax) ?? LEVEL_BANDS[LEVEL_BANDS.length - 1];
}

/** Stamina spent per pixel walked on a hunting map. Full speed is about 1 per second. */
export const MARCH_STAMINA_PER_PX = 0.0044;
/** Stamina restored per second while standing still on a hunting map. */
export const MARCH_REGEN_PER_SEC = 0.55;
