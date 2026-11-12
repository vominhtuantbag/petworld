/**
 * Shared combat shapes. Screens and the battle engine both import these
 * so a skill or a stat line has one definition.
 */

import type { ElementId } from './elements.js';

/** Who a skill primarily asks the player to pick (or auto-resolves). */
export type SkillTarget =
  | 'enemy'
  | 'enemy_back'
  | 'enemies'
  | 'enemy_pets'
  | 'ally'
  | 'ally_pet'
  | 'self'
  | 'party'
  | 'party_pets'
  | 'none';

export type ModStat = 'atk' | 'def' | 'spd' | 'eva' | 'acc' | 'critRate' | 'critDamage' | 'armPen';

/**
 * Declarative skill effects. The cast engine interprets these in order.
 * Legacy monster skills may omit `effects` and rely on `power` alone.
 */
export type SkillEffect =
  | {
      type: 'damage';
      /** Multiplier of ATK. Defaults to the skill's `power`. */
      power?: number;
      hits?: number;
      trueDamage?: boolean;
      armPenBonus?: number;
      critRateBonus?: number;
      critDamageBonus?: number;
      /** Bonus power when target HP% is above this threshold (0–1). */
      ifHpAbove?: number;
      bonusPower?: number;
      /** Finisher: multiply damage when target HP% is below this. */
      ifHpBelow?: number;
      finishMult?: number;
      /** Extra power when the target has any debuff status. */
      ifDebuffedBonus?: number;
      /** Damage = missingHpPower * attacker missing HP. */
      missingHpPower?: number;
      /** Use DEF instead of ATK as the damage base. */
      scaleFromDef?: boolean;
      /** Damage = damageTakenPower * damage absorbed this fight. */
      damageTakenPower?: number;
      /** Random power band [min, max]. */
      randomPower?: [number, number];
      /** AoE: primary uses `power`; others use `secondaryPower`. */
      aoe?: 'enemies' | 'enemy_pets' | 'all';
      secondaryPower?: number;
      /** Friendly-fire band when aoe includes allies. */
      allyHarmRange?: [number, number];
      fromStealthBonus?: number;
      /** Ignore the selected front-liner and strike the back row. */
      preferBackRow?: boolean;
      /** Extra damage equal to `defBonus * caster DEF` (after DEF mods). */
      defBonus?: number;
      /** Multiply power when caster DEF is greater than target DEF. */
      ifDefGreaterMult?: number;
      /** Extra power when the target is slowed. */
      ifSlowBonus?: number;
      /** Extra crit damage when the target is slowed. */
      ifSlowCritDamage?: number;
      /** +bonus power per HP-missing step (e.g. 0.1 per 10%). */
      missingTargetHpStep?: number;
      missingTargetHpBonus?: number;
      /** Heal caster for this fraction of damage dealt. */
      lifesteal?: number;
      /** True damage / DEF ignore when the defender's biome is listed. */
      bypassDefVs?: string[];
      /** Stun chance after the hit when the defender's biome is listed. */
      stunChanceVs?: string[];
      /** Damage = scaleFromTargetAtk * target ATK. */
      scaleFromTargetAtk?: number;
      /** Scale power by MP spent this cast (Ocean ultimate). */
      mpSpentPower?: boolean;
      /** Restore MP and reset cooldowns if the hit kills. */
      killRestore?: boolean;
      /** Toughness shredded per hit as a fraction of max TGH. */
      tghPct?: number;
      /** Random hit count [min, max]. */
      randomHits?: [number, number];
      statusOnHit?: { id: string; chance: number; turns: number };
      /** Bonus power when caster current HP is greater than the target's. */
      ifCasterHpGreater?: number;
      /** Convert enemy shields and buffs into this true-damage strike. */
      convertBuffsToDamage?: boolean;
    }
  | {
      type: 'heal';
      pctMax?: number;
      flat?: number;
      target?: 'self' | 'ally' | 'ally_lowest' | 'party' | 'party_pets' | 'party_lowest_two';
      cleanse?: ('poison' | 'bleed' | 'burn' | 'all_debuff')[];
    }
  | { type: 'restore_mp'; amount?: number; pctMax?: number; target?: 'self' | 'party_pets' | 'party' }
  | {
      type: 'status';
      id: string;
      chance: number;
      turns: number;
      power?: number;
      target?: 'enemy' | 'enemies' | 'enemies_top_hp' | 'ally' | 'self' | 'party_pets';
      count?: number;
    }
  | {
      type: 'mod';
      stat: ModStat;
      amount: number;
      turns: number;
      target?: 'self' | 'enemy' | 'enemies' | 'ally' | 'party' | 'party_pets';
      chance?: number;
    }
  | { type: 'chip_tgh'; pct: number; chance: number }
  | { type: 'mark'; turns: number; critBonus: number; ignoreDef: number }
  | { type: 'taunt'; turns: number }
  | { type: 'redirect_highest_hp'; turns: number }
  | { type: 'guard'; turns: number; absorb: number }
  | { type: 'stealth'; turns: number }
  | { type: 'charge'; power: number; trueDamage?: boolean }
  | { type: 'reflect'; turns: number; pct: number; charges?: number; target?: 'party_pets' | 'party' | 'self' }
  | { type: 'crit_block'; turns: number; target?: 'party' | 'self' }
  | { type: 'cleanse_enemy_buffs' }
  | { type: 'steal_buffs'; chance: number; successPower: number; failPower: number }
  | { type: 'cd_reduce'; amount: number; target?: 'party_pets' | 'party' | 'self' }
  | { type: 'bio_field'; turns: number; pctHeal: number }
  | { type: 'strip_def'; amount: number; chance?: number; hits?: number; randomTargets?: [number, number] }
  | { type: 'strip_buff'; stat: ModStat; count?: number }
  | { type: 'random'; options: SkillEffect[][]; chances?: number[] }
  | { type: 'shield'; pctMax: number; turns?: number }
  | { type: 'extra_turn' }
  | { type: 'delay_turn' }
  | { type: 'mp_cost_mult'; amount: number; turns: number }
  | { type: 'lock_energy'; turns: number; blockItems?: boolean }
  | { type: 'pull_lowest'; defAmount: number; turns: number }
  | { type: 'detonate_frost' }
  | { type: 'swap_hp_pct' }
  | { type: 'swap_stat'; stats: ('atk' | 'def')[] }
  | { type: 'transfer_debuffs' }
  | { type: 'seal_ultimate'; turns: number }
  | { type: 'sacrifice_hp'; pctCurrent?: number; pctMax?: number; target?: 'self' | 'ally' }
  | { type: 'reset_cds' }
  | { type: 'undying'; turns: number }
  | { type: 'endure' }
  | { type: 'next_skill_evade' }
  | { type: 'evade_basics'; turns: number }
  | { type: 'barrier'; target?: 'self' | 'party' }
  | { type: 'magic_reduce'; pct: number; turns: number }
  | { type: 'steal_stat'; stat: 'atk' | 'def'; pct: number; turns: number }
  | { type: 'absorb_def'; defAmount: number; absorb: number; turns: number }
  | { type: 'hp_mp_chant'; hpPct: number; mpPct: number; turns: number }
  | { type: 'burn_mp'; pct?: number }
  | { type: 'convert_def_to_atk'; pct: number; turns: number }
  | { type: 'next_attack_boost'; amount: number }
  | { type: 'melee_thorns'; pct: number; turns: number; burn?: boolean }
  | { type: 'enrage_below'; hpPct: number; atk: number; crit: number }
  | { type: 'trap_cast'; turns: number; pct: number }
  | { type: 'cleanse'; count?: number; target?: 'self' | 'ally' }
  | { type: 'frost_stack'; stacks?: number }
  | { type: 'cleanse_target_buffs' }
  | { type: 'steal_mp'; pct: number };

export type Skill = {
  id: string;
  name: string;
  /** Mana spent when the move is used. Basic attacks spend none. */
  mana: number;
  /**
   * Damage multiplier applied to ATK.
   * A value of 0 is a non-damaging / heal / utility skill.
   */
  power: number;
  cooldown: number;
  /** Short Vietnamese description for Skill Modal / dictionary. */
  blurb?: string;
  /** Primary targeting hint for the battle UI. */
  target?: SkillTarget;
  /** Declarative effects. Missing = legacy power-only strike. */
  effects?: SkillEffect[];
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

export type StatMod = {
  id: string;
  stat: ModStat;
  amount: number;
  turns: number;
};
