import { wildBasic, wildSkills } from './combat';
import { monsterStats } from './catalog';
import { MAP1_ROSTER, type MonsterSpecies } from './monsters';

/**
 * Species cards always shown in PET as "Chưa gặp" placeholders. Empty for now:
 * rabbit, mouse, and tree frog still spawn in the wild, but none is listed.
 * A tamed copy of any species still shows from `world.tamed`.
 */

const LISTED: readonly { id: string; levelMin: number; levelMax: number }[] = [];

export type CollectionSpecies = {
  id: string;
  name: string;
  tint: string;
  levelMin: number;
  levelMax: number;
  hp: number;
  mp: number;
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
  skills: string[];
};

export function collectionSpecies(): CollectionSpecies[] {
  return LISTED.map((entry) => {
    const kind = findSpecies(entry.id);
    const level = entry.levelMin;
    const stats = monsterStats(kind, level);
    return {
      id: kind.id,
      name: kind.name,
      tint: kind.tint,
      levelMin: entry.levelMin,
      levelMax: entry.levelMax,
      hp: stats.hp,
      mp: stats.mp,
      attack: stats.attack,
      defense: stats.defense,
      speed: kind.speed,
      tgh: stats.tgh,
      maxTgh: stats.maxTgh,
      armPen: stats.armPen,
      res: stats.res,
      critRate: stats.critRate,
      critDamage: stats.critDamage,
      eva: stats.eva,
      acc: stats.acc,
      skills: [wildBasic(kind.id).name, ...wildSkills(kind.id, level).map((skill) => skill.name)],
    };
  });
}

function findSpecies(id: string): MonsterSpecies {
  for (const pairs of Object.values(MAP1_ROSTER)) {
    for (const pair of pairs) {
      for (const species of pair) {
        if (species.id === id) return species;
      }
    }
  }
  throw new Error(`Collection species ${id} is missing from the map roster.`);
}
