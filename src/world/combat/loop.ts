/**
 * Unified turn-by-turn combat loop constants shared by adventure,
 * mines, dungeons, arena casual, and ranked PvP.
 *
 * Pipeline (Steps A–E):
 *   A Timeline / SPD queue      — active unit jumps to front of TurnTimeline
 *   B Pre-turn statuses         — DoT, stun/freeze/stagger skip, silence→basic
 *   C Action input + 30s timer  — human pick or auto on expiry; AI acts alone
 *   D Damage pipeline           — ACC/EVA → TGH → ARM_PEN → CRIT → status/RES
 *   E UI + Socket sync          — bars, CD, floats, CourtFx broadcast
 */

export const TURN_MS = 30_000;
export const STANCE_MS = 340;
export const SLASH_MS = 500;
export const IMPACT_MS = 160;
export const TEAR_MS = 500;
/** Pixels the active unit steps toward its target while anticipating. */
export const STANCE_PX = 28;

export type CombatFloatKind = 'damage' | 'heal' | 'crit' | 'miss';

export type CombatFloat = {
  id: number;
  fighterId: string;
  amount: number;
  kind: CombatFloatKind;
};

export type LastHitView = {
  attackerId: string;
  targetId: string;
  damage: number;
  crit: boolean;
  miss: boolean;
  skillName?: string;
};

/** Classify a combat-log line into a float kind for CRIT / MISS popups. */
export function floatKindFromLog(line: string | undefined, delta: number): CombatFloatKind {
  if (delta > 0) return 'heal';
  const text = (line ?? '').toLowerCase();
  if (text.includes('trượt') || text.includes('miss') || text.includes('né')) return 'miss';
  if (text.includes('chí mạng') || text.includes('crit')) return 'crit';
  return 'damage';
}

export function classifyLastHit(hit: LastHitView | null | undefined, targetId: string, delta: number): CombatFloatKind {
  if (delta > 0) return 'heal';
  if (!hit || hit.targetId !== targetId) return floatKindFromLog(undefined, delta);
  if (hit.miss) return 'miss';
  if (hit.crit) return 'crit';
  return 'damage';
}
