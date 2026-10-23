import { wildBasic, wildSkills } from './combat';
import { monsterStats } from './catalog';
import { MAP1_ROSTER, type MonsterSpecies } from './monsters';

/**
 * Plains species the collection screen always lists. They already spawn:
 * rabbit and mouse in the level 1–2 band, tree frog in the level 3–4 band.
 * Taming one adds a live copy to `world.tamed`; this registry is the species card.
 */

const LISTED: readonly { id: string; levelMin: number; levelMax: number }[] = [
  { id: 'plains-rabbit', levelMin: 1, levelMax: 2 },
  { id: 'plains-mouse', levelMin: 1, levelMax: 2 },
  { id: 'plains-tree-frog', levelMin: 3, levelMax: 4 },
];

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
