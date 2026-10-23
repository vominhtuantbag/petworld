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
 * Eight stats carried by every fighter.
 * `critRate` is a fraction (0.15 is 15%). `critDamage` defaults to 1.5.
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
};

/** Leadership stats. Only the hero uses them. */
export type HeroStats = {
  /** Fraction added to each active ally's ATK and DEF. 0.1 is +10%. */
  mastery: number;
  /** When true, this hero acts before every monster in round 1. */
  initiative: boolean;
};
