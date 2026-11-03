/**
 * Percent-based damage with ACC / EVA, ARM_PEN, CRIT, and element.
 *
 * Hit = ACC vs EVA. A miss deals 0.
 * Effective DEF = Target DEF * (1 - Attacker ARM_PEN)
 * Base = ATK * skill multiplier
 * Crit = CRIT_DMG when the roll is within CRIT_RATE, otherwise 1
 * Element = 2, 1, or 0.5
 * Final = max(1, floor(raw * 100 / (100 + effective DEF))) when the attack lands
 */

import { doesHit, effectiveDefense, normalizeAdvanced, type AdvancedInput } from './advanced';
import { elementMultiplier, type ElementId } from './elements';

export { DEFAULT_CRIT_DAMAGE } from './advanced';

export type DamageInput = {
  attack: number;
  multiplier: number;
  critRate: number;
  critDamage: number;
  attackerElement: ElementId;
  defenderElement: ElementId;
  defense: number;
  /** Armor penetration fraction. Missing values fall back to 0. */
  armPen?: number;
  /** Accuracy fraction. Missing values fall back to a safe default. */
  acc?: number;
  /** Evasion fraction. Missing values fall back to a safe default. */
  eva?: number;
  /** Uniform roll in [0, 1] for the hit check. */
  hitRoll?: number;
  /** Uniform roll in [0, 1]. A crit lands when this is less than or equal to critRate. */
  critRoll: number;
};

export type DamageResult = {
  damage: number;
  miss: boolean;
  crit: boolean;
  element: 2 | 1 | 0.5;
  effectiveDefense: number;
};

export function finalDamage(input: DamageInput): DamageResult {
  const advanced = normalizeAdvanced({
    armPen: input.armPen,
    acc: input.acc,
    eva: input.eva,
    critRate: input.critRate,
    critDamage: input.critDamage,
  } satisfies AdvancedInput);
  const hitRoll = Number.isFinite(input.hitRoll) ? Number(input.hitRoll) : Math.random();
  const landed = doesHit(advanced.acc, advanced.eva, hitRoll);
  const element = elementMultiplier(input.attackerElement, input.defenderElement);
  const def = effectiveDefense(input.defense, advanced.armPen);
  if (!landed) {
    return { damage: 0, miss: true, crit: false, element, effectiveDefense: def };
  }
  const attack = Math.max(0, Number.isFinite(input.attack) ? input.attack : 0);
  const multiplier = Number.isFinite(input.multiplier) ? Math.max(0, input.multiplier) : 1;
  const base = attack * multiplier;
  const critRoll = Number.isFinite(input.critRoll) ? input.critRoll : 1;
  const crit = advanced.critRate > 0 && critRoll < advanced.critRate;
  const critMult = crit ? advanced.critDamage : 1;
  const raw = base * critMult * element;
  const reduced = raw * (100 / (100 + def));
  return {
    damage: Math.max(1, Math.floor(Number.isFinite(reduced) ? reduced : 1)),
    miss: false,
    crit,
    element,
    effectiveDefense: def,
  };
}
