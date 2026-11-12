/**
 * Absolute Single Source of Truth for one combatant’s action.
 * PvE, Arena, Raid, and proximity PvP all call this — no mode branches.
 */

import { DEFEND_DAMAGE_MULT } from './damage.js';
import { allowsFallenTargets } from './faint.js';
import type { Skill } from './model.js';
import {
  beginTurnAuras,
  castSkill,
  DEFEND_STATUS_ID,
  findUnit,
  isSilenced,
  isUltimateSkill,
  manaCost,
  needsAllyTarget,
  needsEnemyTarget,
  putUnit,
  retargetAttack,
  shouldSkipTurn,
  tickFighterTimers,
  type EffectBattleState,
  type EffectFighter,
} from './skillEffects.js';

export type CombatActionKind = 'attack' | 'skill' | 'defend';

export type ExecuteCombatInput = {
  state: EffectBattleState;
  actorId: string;
  action: CombatActionKind;
  /** Prefer explicit Skill; otherwise skillIndex into actor.skills. */
  skill?: Skill | null;
  skillIndex?: number;
  targetId?: string | null;
  rng?: () => number;
  /** Run begin-turn auras / control skips for this actor (default true). */
  beginTurn?: boolean;
};

export type ExecuteCombatResult = {
  state: EffectBattleState;
  log: string;
  skipped?: boolean;
  focusId: string | null;
  skillName?: string;
};

export function tickCombatCooldowns<T extends { cooldowns: Record<string, number> }>(fighter: T): T {
  const cooldowns: Record<string, number> = {};
  for (const [id, value] of Object.entries(fighter.cooldowns ?? {})) {
    const next = Math.max(0, (value ?? 0) - 1);
    if (next > 0) cooldowns[id] = next;
  }
  return { ...fighter, cooldowns };
}

export function isSkillReady(fighter: EffectFighter, skill: Skill): boolean {
  if ((fighter.cooldowns[skill.id] ?? 0) > 0) return false;
  if (fighter.statuses?.some((entry) => entry.id === 'sealed' && entry.turns > 0) && isUltimateSkill(skill)) {
    return false;
  }
  return fighter.mp >= manaCost(fighter, skill);
}

/**
 * Resolve one unit action with identical rules for every mode and every combatant.
 */
export function executeCombatAction(input: ExecuteCombatInput): ExecuteCombatResult {
  const rng = input.rng ?? Math.random;
  const beginTurn = input.beginTurn !== false;
  let state = input.state;
  const actorId = input.actorId;

  let actor = findUnit(state, actorId);
  if (!actor || actor.hp <= 0) {
    return { state, log: 'Đơn vị đã ngã.', skipped: true, focusId: null };
  }

  if (beginTurn) {
    state = beginTurnAuras(state, actorId);
    actor = findUnit(state, actorId);
    if (!actor || actor.hp <= 0) {
      return { state, log: 'Đơn vị đã ngã.', skipped: true, focusId: null };
    }
  }

  if (actor.staggered) {
    const cleared = { ...actor, staggered: false };
    state = putUnit(state, cleared);
    return {
      state,
      log: `${actor.name} gục ngã và bỏ lượt (−50% DEF hết).`,
      skipped: true,
      focusId: null,
    };
  }

  const skip = shouldSkipTurn(actor);
  if (skip) {
    const ticked = tickFighterTimers(tickCombatCooldowns(actor));
    state = putUnit(state, ticked);
    return { state, log: `${actor.name} ${skip} và bỏ lượt.`, skipped: true, focusId: null };
  }

  let ready = tickFighterTimers(tickCombatCooldowns(actor));

  if (input.action === 'defend') {
    const others = (ready.statuses ?? []).filter((entry) => entry.id !== DEFEND_STATUS_ID);
    ready = {
      ...ready,
      statuses: [...others, { id: DEFEND_STATUS_ID, turns: 99, power: 1 - DEFEND_DAMAGE_MULT }],
    };
    state = putUnit(state, ready);
    return {
      state,
      log: `${ready.name} phòng thủ (−25% sát thương đến lượt sau).`,
      focusId: null,
      skillName: 'defend',
    };
  }

  let skill: Skill | null = null;
  if (input.action === 'skill') {
    skill =
      input.skill ??
      (typeof input.skillIndex === 'number' ? ready.skills[input.skillIndex] ?? ready.skills[0] ?? null : null);
    if (!skill) {
      return { state: putUnit(state, ready), log: 'Kỹ năng không hợp lệ.', skipped: true, focusId: null };
    }
    if (!isSkillReady(ready, skill)) {
      state = putUnit(state, ready);
      return { state, log: `${skill.name} chưa sẵn sàng.`, skipped: true, focusId: null };
    }
    if (isSilenced(ready)) {
      state = putUnit(state, ready);
      return { state, log: `${ready.name} bị câm lặng — chỉ đánh thường.`, skipped: true, focusId: null };
    }
    ready = {
      ...ready,
      mp: ready.mp - manaCost(ready, skill),
      cooldowns: { ...ready.cooldowns, [skill.id]: skill.cooldown },
    };
  }

  // Charged basic release is handled inside castSkill when skill is null.
  state = putUnit(state, ready);

  let focusId = input.targetId ?? null;
  const move = skill ?? ready.basic;

  if (needsEnemyTarget(move)) {
    const intended = focusId ? findUnit(state, focusId) ?? null : null;
    const foe = retargetAttack(state, ready, intended && intended.hp > 0 ? intended : null);
    if (!foe) {
      return { state, log: 'Hãy chọn một mục tiêu còn sống.', skipped: true, focusId: null };
    }
    focusId = foe.id;
  } else if (needsAllyTarget(move)) {
    const fallenOk = allowsFallenTargets(move);
    const team = ready.side === 'wild' ? state.foes : [state.player, ...state.allies];
    const intended = team.find((entry) => entry.id === focusId && (entry.hp > 0 || fallenOk));
    if (intended) {
      focusId = intended.id;
    } else if (!focusId || !fallenOk) {
      focusId = team.find((entry) => entry.hp > 0)?.id ?? ready.id;
    } else {
      return { state, log: 'Hãy chọn một đồng minh hợp lệ.', skipped: true, focusId: null };
    }
  }

  const cast = castSkill(state, ready.id, skill, focusId, rng);
  const skillName = skill ? skill.name : ready.basic.name;
  const log = `${ready.name} dùng ${skillName}. ${cast.log}`.trim();
  return { state: cast.state, log, focusId, skillName };
}
