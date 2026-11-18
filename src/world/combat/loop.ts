/**
 * Client entry for the shared combat flow.
 * Edit `shared/combat/flow.ts` — adventure, mines, dungeons, challenges, and ranked PvP all call it.
 *
 * Pipeline (Steps A–E):
 *   A Timeline / SPD queue      — active unit jumps to front of TurnTimeline
 *   B Pre-turn statuses         — DoT, stun/freeze/stagger skip, silence→basic
 *   C Action input + 30s timer  — human pick or auto on expiry; AI acts alone
 *   D Damage pipeline           — ACC/EVA → TGH → ARM_PEN → CRIT → status/RES
 *   E UI + Socket sync          — bars, CD, floats, CourtFx broadcast
 */

export {
  IMPACT_MS,
  SLASH_MS,
  STANCE_MS,
  STANCE_PX,
  TEAR_MS,
  TURN_GAP_MS,
  TURN_MS,
  actorRestMs,
  hpStrikeFacts,
  strikeFlow,
  type StrikeFlow,
  type StrikeFlowInput,
} from '@game/combat/flow';

export type CombatFloatKind = 'damage' | 'heal' | 'crit' | 'miss' | 'mana';

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

/** Names fully avoided by this action. HP loss must not reuse these as a miss label. */
export function dodgeNamesFromLog(line: string | undefined): string[] {
  if (!line) return [];
  const names: string[] = [];
  const miss = /Trượt ([^.]+)\./gi;
  const hidden = /([^.]{1,48}?) đang ẩn, né đòn\./gi;
  let match: RegExpExecArray | null;
  while ((match = miss.exec(line))) names.push(match[1].trim());
  while ((match = hidden.exec(line))) names.push(match[1].trim());
  return names;
}

/**
 * Classify a combat-log line into a float kind.
 * A real HP loss is damage or a crit. "Né tránh" is only for a unit that lost no HP.
 */
export function floatKindFromLog(line: string | undefined, delta: number): CombatFloatKind {
  if (delta > 0) return 'heal';
  if (delta < 0) {
    const text = (line ?? '').toLowerCase();
    if (text.includes('chí mạng') || text.includes('crit')) return 'crit';
    return 'damage';
  }
  return 'damage';
}

export function classifyLastHit(hit: LastHitView | null | undefined, targetId: string, delta: number): CombatFloatKind {
  if (delta > 0) return 'heal';
  if (delta < 0) {
    if (hit && hit.targetId === targetId && hit.crit && !hit.miss && hit.damage > 0) return 'crit';
    return 'damage';
  }
  if (hit && hit.targetId === targetId && hit.miss && hit.damage <= 0) return 'miss';
  return 'damage';
}
