/**
 * Shared combat shapes. Screens and the battle engine both import these
 * so a skill or a stat line has one definition.
 */

import type { ElementId } from './elements';

export type Skill = {
  id: string;
  name: string;
  /** Mana spent when the move is used. Basic attacks spend none. */
  mana: number;
  /**
   * Damage multiplier applied to ATK.
   * A value of 0 is a heal and does not enter the damage formula.
   */
  power: number;
  cooldown: number;
};

/**
 * Core stats carried by every fighter.
 * Advanced combat rates are fractions (0.15 is 15%).
 * `critDamage` defaults to 1.5. Toughness uses `tgh` / `maxTgh`.
 */
export type CoreStats = {
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
  element: ElementId;
  /** Current toughness. Breaks into Stagger at 0. */
  tgh: number;
  maxTgh: number;
  /** Armor penetration fraction. */
  armPen: number;
  /** Status resistance fraction. */
  res: number;
  /** Evasion fraction. */
  eva: number;
  /** Accuracy fraction. */
  acc: number;
};

/** Leadership stats. Only the hero uses them. */
export type HeroStats = {
  /** Fraction added to each active ally's ATK and DEF. 0.1 is +10%. */
  mastery: number;
  /** When true, this hero acts before every monster in round 1. */
  initiative: boolean;
};
