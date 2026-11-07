/**
 * Exploration curves. Level 1 is the base. Each later level adds the
 * per-level step. Guardians and knights keep the largest health pools.
 * Mages and healers keep the largest mana pools. Rogues and assassins
 * (profession id `bard`) are the fastest.
 *
 * Battle loadouts are rolled in `src/world/combat/kits.ts`: a hero keeps
 * two of three class skills, and a monster keeps one species basic attack
 * plus two of the first three skills of its biome system. The counts below
 * remain for older callers.
 */

import { heroAdvanced } from './combat/advanced';
import { biomeSkillList } from './combat/biomeSkills';
import { combatElement, type BiomeId } from './combat/elements';

export const CLASS_SKILL_SLOTS = 2;
export const CLASS_SKILLS_UNLOCKED = 1;
export const CLASS_SECOND_SKILL_LEVEL = 8;

export const MONSTER_SKILL_SLOTS = 3;
export const MONSTER_SKILLS_UNLOCKED = 2;
export const MONSTER_THIRD_SKILL_LEVEL = 16;

export type MonsterElement = BiomeId;

export type CharacterCombatStats = {
  lv: number;
  exp: number;
  hp: number;
  mp: number;
  stamina: number;
  attack: number;
  defense: number;
  speed: number;
  tgh: number;
  maxTgh: number;
  armPen: number;
  res: number;
  critRate: number;
  critDamage: number;
  eva: number;
  acc: number;
};

export type MonsterCombatStats = {
  lv: number;
  exp: number;
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  speed: number;
  element: MonsterElement;
  tgh: number;
  maxTgh: number;
  armPen: number;
  res: number;
  critRate: number;
  critDamage: number;
  eva: number;
  acc: number;
  /** Optional aliases for skill / data pipelines. */
  arm_pen?: number;
  crit_rate?: number;
  crit_dmg?: number;
};

type Curve = {
  hp: number;
  hpPer: number;
  mp: number;
  mpPer: number;
  stamina: number;
  staminaPer: number;
  attack: number;
  attackPer: number;
  defense: number;
  defensePer: number;
  speed: number;
  speedPer: number;
};

const CURVES: Record<string, Curve> = {
  guardian: { hp: 128, hpPer: 14, mp: 28, mpPer: 2, stamina: 34, staminaPer: 2, attack: 11, attackPer: 2, defense: 8, defensePer: 2, speed: 76, speedPer: 1 },
  knight: { hp: 120, hpPer: 12, mp: 32, mpPer: 2, stamina: 36, staminaPer: 2, attack: 12, attackPer: 2, defense: 7, defensePer: 1, speed: 82, speedPer: 1 },
  mage: { hp: 84, hpPer: 6, mp: 68, mpPer: 8, stamina: 30, staminaPer: 2, attack: 13, attackPer: 2, defense: 3, defensePer: 1, speed: 86, speedPer: 1 },
  healer: { hp: 90, hpPer: 7, mp: 62, mpPer: 7, stamina: 32, staminaPer: 2, attack: 9, attackPer: 1, defense: 4, defensePer: 1, speed: 80, speedPer: 1 },
  rogue: { hp: 94, hpPer: 7, mp: 40, mpPer: 4, stamina: 46, staminaPer: 3, attack: 12, attackPer: 2, defense: 4, defensePer: 1, speed: 108, speedPer: 2 },
  bard: { hp: 88, hpPer: 6, mp: 42, mpPer: 4, stamina: 44, staminaPer: 3, attack: 13, attackPer: 2, defense: 3, defensePer: 1, speed: 116, speedPer: 2 },
  archer: { hp: 96, hpPer: 7, mp: 40, mpPer: 4, stamina: 40, staminaPer: 2, attack: 13, attackPer: 2, defense: 4, defensePer: 1, speed: 96, speedPer: 1 },
  ranger: { hp: 100, hpPer: 8, mp: 36, mpPer: 3, stamina: 48, staminaPer: 3, attack: 12, attackPer: 2, defense: 5, defensePer: 1, speed: 98, speedPer: 1 },
  scout: { hp: 92, hpPer: 7, mp: 38, mpPer: 3, stamina: 44, staminaPer: 3, attack: 11, attackPer: 2, defense: 4, defensePer: 1, speed: 104, speedPer: 2 },
  monk: { hp: 108, hpPer: 9, mp: 44, mpPer: 4, stamina: 50, staminaPer: 3, attack: 11, attackPer: 2, defense: 5, defensePer: 1, speed: 92, speedPer: 1 },
  wanderer: { hp: 100, hpPer: 8, mp: 40, mpPer: 4, stamina: 40, staminaPer: 2, attack: 11, attackPer: 2, defense: 4, defensePer: 1, speed: 90, speedPer: 1 },
};

const MP_BODY: Record<BiomeId, number> = {
  plains: 14,
  mountain: 13,
  forest: 16,
  swamp: 16,
  beach: 16,
  ocean: 20,
  frost: 17,
  savanna: 14,
  volcano: 18,
  desert: 13,
  darkness: 16,
  light: 17,
  heaven: 18,
  hell: 18,
  chaos: 16,
  cosmic: 20,
};

function step(base: number, per: number, level: number): number {
  return base + Math.max(0, level - 1) * per;
}

export function professionPools(professionId: string | undefined, level: number): CharacterCombatStats {
  const curve = CURVES[professionId ?? ''] ?? CURVES.wanderer;
  const lv = Math.max(1, level);
  const advanced = heroAdvanced(professionId, lv);
  return {
    lv,
    exp: 0,
    hp: step(curve.hp, curve.hpPer, lv),
    mp: step(curve.mp, curve.mpPer, lv),
    stamina: step(curve.stamina, curve.staminaPer, lv),
    attack: step(curve.attack, curve.attackPer, lv),
    defense: step(curve.defense, curve.defensePer, lv),
    speed: step(curve.speed, curve.speedPer, lv),
    tgh: advanced.maxTgh,
    maxTgh: advanced.maxTgh,
    armPen: advanced.armPen,
    res: advanced.res,
    critRate: advanced.critRate,
    critDamage: advanced.critDamage,
    eva: advanced.eva,
    acc: advanced.acc,
  };
}

export function classSkillCount(level: number): number {
  return level >= CLASS_SECOND_SKILL_LEVEL ? CLASS_SKILL_SLOTS : CLASS_SKILLS_UNLOCKED;
}

export function monsterSkillCount(level: number): number {
  return level >= MONSTER_THIRD_SKILL_LEVEL ? MONSTER_SKILL_SLOTS : MONSTER_SKILLS_UNLOCKED;
}

/** Combat biome for mana curves. Same mapping as the skill catalog. */
export function monsterElement(kindId: string): MonsterElement {
  return combatElement(kindId);
}

export function monsterMana(kindId: string, level: number): number {
  const lv = Math.max(1, level);
  return MP_BODY[monsterElement(kindId)] + (lv - 1) * 2;
}

type SkillShape = { id: string; name: string; mana: number; power: number; cooldown: number };

/** All five biome skills. Callers slice to the unlocked count. */
export function monsterKit(kindId: string): SkillShape[] {
  return biomeSkillList(combatElement(kindId)).map((skill) => ({
    id: skill.id,
    name: skill.name,
    mana: skill.mana,
    power: skill.power,
    cooldown: skill.cooldown,
  }));
}
