/**
 * Faint / KO helpers — shared by PvE and PvP targeting + HUD.
 * Units at HP <= 0 stay on the court as unselectable placeholders (revive-ready).
 */

import type { Skill } from './model.js';

/** Strict 50% opacity for knocked-out court sprites (all modes). */
export const FAINT_OPACITY = 0.5;

export function isFainted(unit: { hp: number } | null | undefined): boolean {
  return !unit || unit.hp <= 0;
}

export function isLiving(unit: { hp: number } | null | undefined): boolean {
  return Boolean(unit && unit.hp > 0);
}

/**
 * Ally heal/rescue skills may pick a unit at 0 HP.
 * Enemy skills and non-heal buffs never may.
 */
export function allowsFallenTargets(skill: Skill | null | undefined): boolean {
  if (!skill) return false;
  const target = skill.target ?? 'enemy';
  if (target === 'enemy' || target === 'enemies' || target === 'enemy_back' || target === 'enemy_pets') {
    return false;
  }
  const skillAllowsAlly = skill.target === 'ally' || skill.target === 'ally_pet';
  if (!skillAllowsAlly) return false;
  return (skill.effects ?? []).some((effect) => {
    if (effect.type !== 'heal') return false;
    const healTarget = effect.target ?? 'ally';
    return healTarget === 'ally' || healTarget === 'ally_lowest';
  });
}

/** Filter a target pool for UI / engine selection. */
export function selectableCombatants<T extends { hp: number }>(
  units: readonly T[],
  skill?: Skill | null,
): T[] {
  const fallenOk = allowsFallenTargets(skill ?? null);
  return units.filter((unit) => unit.hp > 0 || fallenOk);
}
