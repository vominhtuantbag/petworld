/**
 * Simultaneous round resolution and advanced strike math.
 *
 * Hit = ACC vs EVA. Effective DEF = Target DEF * (1 - ARM_PEN).
 * Crit multiplies final damage. Toughness chips on armor-break / weakness
 * style skills. Status application goes through RES.
 */

import {
  advancedAtLevel,
  doesHit,
  effectiveDefense,
  isArmorBreakSkill,
  normalizeAdvanced,
  resolveStatusApplication,
  toughnessDamage,
  type AdvancedInput,
  type StatusId,
} from './advanced.js';

export type CombatAction = 'attack' | 'skill' | 'defend';

export type Striker = {
  name: string;
  attack: number;
  defense: number;
  level?: number;
  armPen?: number;
  res?: number;
  critRate?: number;
  critDamage?: number;
  eva?: number;
  acc?: number;
  tgh?: number;
  maxTgh?: number;
  staggered?: boolean;
};

export type StrikeResult = {
  damage: number;
  dodged: boolean;
  miss: boolean;
  crit: boolean;
  staggered: boolean;
  tgh: number;
  maxTgh: number;
  text: string;
};

const DODGE_CHANCE = 0.28;

export function strike(
  attacker: Striker,
  defender: Striker,
  action: CombatAction,
  defenderAction: CombatAction,
  rng: () => number = Math.random,
  options?: { power?: number; skillName?: string },
): StrikeResult {
  const atkAdv = normalizeAdvanced(advancedFrom(attacker));
  const defAdv = normalizeAdvanced(advancedFrom(defender));
  const maxTgh = Math.max(1, Number.isFinite(defender.maxTgh) ? Number(defender.maxTgh) : defAdv.maxTgh);
  const currentTgh = Number.isFinite(defender.tgh) ? Number(defender.tgh) : maxTgh;

  if (defenderAction === 'defend' && rng() < DODGE_CHANCE) {
    return {
      damage: 0,
      dodged: true,
      miss: false,
      crit: false,
      staggered: false,
      tgh: currentTgh,
      maxTgh,
      text: `${defender.name} né được đòn của ${attacker.name}.`,
    };
  }

  if (!doesHit(atkAdv.acc, defAdv.eva, rng())) {
    return {
      damage: 0,
      dodged: false,
      miss: true,
      crit: false,
      staggered: false,
      tgh: currentTgh,
      maxTgh,
      text: `${attacker.name} đánh trượt ${defender.name}.`,
    };
  }

  const powerMult =
    action === 'skill'
      ? Math.max(1, Number.isFinite(options?.power) ? Number(options?.power) : 1.65)
      : 1;
  const livingDef = defender.staggered ? Math.max(0, Math.round((defender.defense || 0) * 0.5)) : defender.defense || 0;
  const def = effectiveDefense(livingDef, atkAdv.armPen);
  // Keep a floor similar to the old pierce curve so legacy DPS stays recognizable.
  const pierced = action === 'skill' ? Math.floor(def / 3) : Math.floor(def / 2);
  const rawPower = Math.round((Number.isFinite(attacker.attack) ? attacker.attack : 0) * powerMult);
  let damage = Math.max(1, rawPower - pierced);
  const crit = atkAdv.critRate > 0 && rng() < atkAdv.critRate;
  if (crit) damage = Math.max(1, Math.round(damage * atkAdv.critDamage));
  if (defenderAction === 'defend') damage = Math.max(1, Math.round(damage * 0.45));

  const armorBreak = action === 'skill' && isArmorBreakSkill(powerMult, options?.skillName);
  const chip = toughnessDamage(maxTgh, { weakness: false, armorBreak, skillPower: powerMult });
  let nextTgh = Math.max(0, currentTgh - chip);
  let staggered = false;
  if (chip > 0 && nextTgh <= 0) {
    staggered = true;
    nextTgh = maxTgh;
  }

  const verb = action === 'skill' ? 'dùng kỹ năng vào' : 'tấn công';
  const notes = [
    defenderAction === 'defend' ? 'Đòn bị chặn bớt' : '',
    crit ? 'chí mạng' : '',
    staggered ? 'gục ngã' : '',
  ].filter(Boolean);
  const suffix = notes.length ? ` (${notes.join(', ')})` : '';
  return {
    damage,
    dodged: false,
    miss: false,
    crit,
    staggered,
    tgh: nextTgh,
    maxTgh,
    text: `${attacker.name} ${verb} ${defender.name}, gây ${damage} sát thương.${suffix}`,
  };
}

export function tryStatus(
  chance: number,
  duration: number,
  res: number,
  roll: number = Math.random(),
): { applied: boolean; duration: number; status?: StatusId } {
  const result = resolveStatusApplication(chance, duration, res, roll);
  return { applied: result.applied, duration: result.duration };
}

export function isCombatAction(value: unknown): value is CombatAction {
  return value === 'attack' || value === 'skill' || value === 'defend';
}

function advancedFrom(fighter: Striker): AdvancedInput {
  const fallback = advancedAtLevel(fighter.level ?? 1, 'hero');
  return {
    maxTgh: fighter.maxTgh ?? fallback.maxTgh,
    tgh: fighter.tgh,
    armPen: fighter.armPen ?? fallback.armPen,
    res: fighter.res ?? fallback.res,
    critRate: fighter.critRate ?? fallback.critRate,
    critDamage: fighter.critDamage ?? fallback.critDamage,
    eva: fighter.eva ?? fallback.eva,
    acc: fighter.acc ?? fallback.acc,
  };
}
