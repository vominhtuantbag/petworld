import type { CharacterStats } from '../domain.js';
import { normalizeRank } from '../realtime/ranks.js';

/**
 * Stat curve. Raise the per-level numbers here when you want longer fights
 * or a steeper climb. Wins move the level; the duel copies these numbers
 * once, when the room is created.
 */
export function levelForWins(wins: number): number {
  return 1 + Math.floor(Math.max(0, wins) / 2);
}

export function statsForRecord(
  wins: number,
  losses: number,
  keep?: { stars?: number; rankIndex?: number; mmr?: number; matchHistory?: CharacterStats['matchHistory'] } | null,
): CharacterStats {
  const level = levelForWins(wins);
  return {
    level,
    wins,
    losses,
    hp: 80 + level * 20,
    attack: 10 + level * 3,
    defense: 4 + level * 2,
    ...normalizeRank(keep),
    matchHistory: Array.isArray(keep?.matchHistory) ? keep.matchHistory : [],
  };
}

export function freshStats(): CharacterStats {
  return statsForRecord(0, 0);
}

/** PvP/raid body for a target adventure level. Wins are inferred from the level curve. */
export function statsAtLevel(level: number): CharacterStats {
  const lv = Math.max(1, Math.min(200, Math.round(level)));
  return statsForRecord(Math.max(0, (lv - 1) * 2), 0);
}
