/**
 * Percent-based damage.
 *
 * Base = ATK * skill multiplier
 * Crit = CRIT_DMG when the roll is within CRIT_RATE, otherwise 1
 * Element = 2, 1, or 0.5
 * Final = max(1, floor(raw * 100 / (100 + target DEF)))
 */

import { elementMultiplier, type ElementId } from './elements';

export const DEFAULT_CRIT_DAMAGE = 1.5;

export type DamageInput = {
  attack: number;
  multiplier: number;
  critRate: number;
  critDamage: number;
  attackerElement: ElementId;
  defenderElement: ElementId;
  defense: number;
  /** Uniform roll in [0, 1]. A crit lands when this is less than or equal to critRate. */
  critRoll: number;
};

export type DamageResult = {
  damage: number;
  crit: boolean;
  element: 2 | 1 | 0.5;
};

export function finalDamage(input: DamageInput): DamageResult {
  const base = input.attack * input.multiplier;
  const crit = input.critRoll <= input.critRate;
  const critMult = crit ? input.critDamage : 1;
  const element = elementMultiplier(input.attackerElement, input.defenderElement);
  const raw = base * critMult * element;
  const defense = Math.max(0, input.defense);
  const reduced = raw * (100 / (100 + defense));
  return { damage: Math.max(1, Math.floor(reduced)), crit, element };
}
