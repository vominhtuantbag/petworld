/**
 * Single combat-flow schedule for adventure, mines, dungeons, challenges, and ranked PvP.
 *
 * PvE, the socket battle hook, and the duel/raid server all call `strikeFlow`.
 * Change the timings or the steps here and every mode follows.
 *
 * After a command: strike effects play immediately, the swing finishes,
 * then a quiet gap, and only then the next unit becomes active.
 * A unit already at 0 HP is not given that gap — callers skip the schedule.
 */

export const TURN_MS = 30_000;
/** Quiet gap after one unit's turn ends, before the next unit becomes active. */
export const TURN_GAP_MS = 1500;
export const STANCE_MS = 340;
export const SLASH_MS = 500;
export const IMPACT_MS = 160;
export const TEAR_MS = 500;
/** Pixels the active unit steps toward its target while anticipating. */
export const STANCE_PX = 28;

export type StrikeFlowInput = {
  /** At least one unit lost HP and was not just captured. */
  struck: boolean;
  /** One of those units reached 0 HP. */
  lethal: boolean;
  /** A tame capture resolved on this action. */
  captured: boolean;
  /** The acting unit changes after this resolution. */
  turnChanged: boolean;
  /** The battle ended on this resolution. */
  over: boolean;
};

export type StrikeFlow = {
  /** Slash and impact play at once. */
  playStrike: boolean;
  /** Time from the strike (or capture) until units step home. */
  swingMs: number;
  /** Quiet rest after stepping home, before the next turn is active. */
  gapMs: number;
  /** swingMs + gapMs. The next actor's clock starts after this. */
  restMs: number;
};

export function strikeFlow(input: StrikeFlowInput): StrikeFlow {
  const gapMs = !input.over && input.turnChanged ? TURN_GAP_MS : 0;
  if (!input.struck) {
    if (input.captured && input.turnChanged) {
      return { playStrike: false, swingMs: TEAR_MS, gapMs, restMs: TEAR_MS + gapMs };
    }
    if (input.turnChanged && !input.over) {
      return { playStrike: false, swingMs: 0, gapMs, restMs: gapMs };
    }
    return { playStrike: false, swingMs: 0, gapMs: 0, restMs: 0 };
  }
  const swingMs = input.lethal ? SLASH_MS + TEAR_MS : SLASH_MS;
  return { playStrike: true, swingMs, gapMs, restMs: swingMs + gapMs };
}

export function hpStrikeFacts(
  before: readonly { id: string; hp: number }[],
  after: readonly { id: string; hp: number }[],
): { struck: boolean; lethal: boolean } {
  const nextHp = new Map(after.map((unit) => [unit.id, unit.hp]));
  let struck = false;
  let lethal = false;
  for (const unit of before) {
    const hp = nextHp.get(unit.id);
    if (hp == null || hp >= unit.hp) continue;
    struck = true;
    if (hp <= 0) lethal = true;
  }
  return { struck, lethal };
}

/**
 * Rest before the next living actor, for a battle that is still going.
 * Same window `strikeFlow` gives PvE.
 */
export function actorRestMs(
  before: readonly { id: string; hp: number }[],
  after: readonly { id: string; hp: number }[],
): number {
  const facts = hpStrikeFacts(before, after);
  return strikeFlow({ ...facts, captured: false, turnChanged: true, over: false }).restMs;
}
