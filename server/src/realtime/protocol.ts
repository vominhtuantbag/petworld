import type { CombatAction } from '../combat/rules.js';
import type { Gender, RegionId } from '../catalog.js';

/**
 * Socket payloads. The client mirrors this file in `src/net/protocol.ts`.
 * Add a field here first, then teach the arena to read it.
 */

export type DuelPet = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
};

export type FighterView = {
  userId: string;
  username: string;
  name: string;
  gender: Gender;
  baseAvatarId: string;
  hairColor: string;
  outfitColor: string;
  startingRegion: RegionId;
  level: number;
  attack: number;
  defense: number;
  maxHp: number;
  hp: number;
  /** Pets chosen on the squad screen. Empty when the fighter brought nobody. */
  pets?: DuelPet[];
  /** True once this fighter has locked an action for the current round. */
  ready: boolean;
};

export type BattleView = {
  roomId: string;
  round: number;
  /** Epoch milliseconds. The server decides when the round closes. */
  deadline: number;
  status: 'active' | 'finished';
  winnerId: string | null;
  log: string[];
  you: FighterView;
  opponent: FighterView;
};

export type QueueView = {
  state: 'idle' | 'queued';
  position: number;
};

export type { CombatAction };
