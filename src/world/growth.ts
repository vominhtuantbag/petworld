/**
 * Exploration curves. Level 1 is the base. Each later level adds the
 * per-level step. Guardians and knights keep the largest health pools.
 * Mages and healers keep the largest mana pools. Rogues and assassins
 * (profession id `bard`) are the fastest.
 *
 * Battle loadouts are rolled in `src/world/combat/kits.ts`: a hero keeps
 * two of three class skills, and a monster keeps one species basic attack
 * plus two of the first three skills of its element. The counts below
 * remain for older callers.
 */

export const CLASS_SKILL_SLOTS = 2;
export const CLASS_SKILLS_UNLOCKED = 1;
export const CLASS_SECOND_SKILL_LEVEL = 8;

export const MONSTER_SKILL_SLOTS = 3;
export const MONSTER_SKILLS_UNLOCKED = 2;
export const MONSTER_THIRD_SKILL_LEVEL = 16;

export type MonsterElement = 'water' | 'fire' | 'ice' | 'earth' | 'poison' | 'beast';

export type CharacterCombatStats = {
  lv: number;
  exp: number;
  hp: number;
  mp: number;
  stamina: number;
  attack: number;
  defense: number;
  speed: number;
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

const MP_BODY: Record<MonsterElement, number> = {
  water: 20,
  fire: 18,
  ice: 17,
  poison: 16,
  earth: 13,
  beast: 12,
};

function step(base: number, per: number, level: number): number {
  return base + Math.max(0, level - 1) * per;
}

export function professionPools(professionId: string | undefined, level: number): CharacterCombatStats {
  const curve = CURVES[professionId ?? ''] ?? CURVES.wanderer;
  const lv = Math.max(1, level);
  return {
    lv,
    exp: 0,
    hp: step(curve.hp, curve.hpPer, lv),
    mp: step(curve.mp, curve.mpPer, lv),
    stamina: step(curve.stamina, curve.staminaPer, lv),
    attack: step(curve.attack, curve.attackPer, lv),
    defense: step(curve.defense, curve.defensePer, lv),
    speed: step(curve.speed, curve.speedPer, lv),
  };
}

export function classSkillCount(level: number): number {
  return level >= CLASS_SECOND_SKILL_LEVEL ? CLASS_SKILL_SLOTS : CLASS_SKILLS_UNLOCKED;
}

export function monsterSkillCount(level: number): number {
  return level >= MONSTER_THIRD_SKILL_LEVEL ? MONSTER_SKILL_SLOTS : MONSTER_SKILLS_UNLOCKED;
}

/** Ocean, shore, swamp, and the wet grassland species share the water kit. */
export function monsterElement(kindId: string): MonsterElement {
  if (/dart-frog|mamba|tarantula/.test(kindId)) return 'poison';
  if (
    kindId.startsWith('ocean-') ||
    kindId.startsWith('beach-') ||
    kindId.startsWith('swamp-') ||
    /frog|toad|crab|turtle|fish|whale|shark|seal|penguin|orca|manta|octopus|moray|seahorse|jelly/.test(kindId)
  ) {
    return 'water';
  }
  if (kindId.startsWith('volcano-')) return 'fire';
  if (kindId.startsWith('tundra-')) return 'ice';
  if (kindId.startsWith('desert-')) return 'earth';
  if (/snake|mamba|dart-frog|spider|tarantula|scorpion|gila/.test(kindId)) return 'poison';
  return 'beast';
}

export function monsterMana(kindId: string, level: number): number {
  const lv = Math.max(1, level);
  return MP_BODY[monsterElement(kindId)] + (lv - 1) * 2;
}

type SkillShape = { id: string; name: string; mana: number; power: number; cooldown: number };

const KITS: Record<MonsterElement, SkillShape[]> = {
  water: [
    { id: 'water-gun', name: 'Súng nước', mana: 6, power: 1.35, cooldown: 1 },
    { id: 'rain-dance', name: 'Vũ điệu mưa', mana: 10, power: 1.6, cooldown: 2 },
    { id: 'tide', name: 'Thủy triều', mana: 14, power: 1.85, cooldown: 3 },
  ],
  fire: [
    { id: 'ember', name: 'Tàn lửa', mana: 6, power: 1.4, cooldown: 1 },
    { id: 'blaze', name: 'Bùng cháy', mana: 11, power: 1.7, cooldown: 2 },
    { id: 'erupt', name: 'Phun trào', mana: 15, power: 1.95, cooldown: 3 },
  ],
  ice: [
    { id: 'frost', name: 'Lạnh buốt', mana: 6, power: 1.3, cooldown: 1 },
    { id: 'shard', name: 'Mảnh băng', mana: 10, power: 1.6, cooldown: 2 },
    { id: 'blizzard', name: 'Bão tuyết', mana: 14, power: 1.85, cooldown: 3 },
  ],
  earth: [
    { id: 'pebble', name: 'Đá vụn', mana: 5, power: 1.25, cooldown: 1 },
    { id: 'quake', name: 'Rung đất', mana: 10, power: 1.55, cooldown: 2 },
    { id: 'wall', name: 'Tường đá', mana: 13, power: 1.75, cooldown: 3 },
  ],
  poison: [
    { id: 'spit', name: 'Phun độc', mana: 6, power: 1.35, cooldown: 1 },
    { id: 'sting', name: 'Chích', mana: 8, power: 1.5, cooldown: 2 },
    { id: 'venom', name: 'Độc tố', mana: 12, power: 1.8, cooldown: 3 },
  ],
  beast: [
    { id: 'bite', name: 'Cắn', mana: 5, power: 1.3, cooldown: 1 },
    { id: 'claw', name: 'Cào', mana: 7, power: 1.5, cooldown: 1 },
    { id: 'howl', name: 'Gầm', mana: 11, power: 1.75, cooldown: 3 },
  ],
};

/** All three monster slots. Callers slice to the unlocked count. */
export function monsterKit(kindId: string): SkillShape[] {
  return KITS[monsterElement(kindId)];
}
