import type { CharacterStats } from '../domain.js';

/**
 * Stat curve. Raise the per-level numbers here when you want longer fights
 * or a steeper climb. Wins move the level; the duel copies these numbers
 * once, when the room is created.
 */
export function levelForWins(wins: number): number {
  return 1 + Math.floor(Math.max(0, wins) / 2);
}

export function statsForRecord(wins: number, losses: number): CharacterStats {
  const level = levelForWins(wins);
  return {
    level,
    wins,
    losses,
    hp: 80 + level * 20,
    attack: 10 + level * 3,
    defense: 4 + level * 2,
  };
}

export function freshStats(): CharacterStats {
  return statsForRecord(0, 0);
}
