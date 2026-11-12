/**
 * Arena/Raid skill facade — always resolves full Skill objects from `@game/combat`.
 */

import { CLASS_KITS } from '@game/combat/characterSkills.js';
import { heroLoadoutSkills, type DuelSkillCard } from '@game/combat/duelBridge.js';
import { classCatalog, professionFromAvatar, type HeroSkillLoadout } from '@game/combat/kits.js';
import type { Skill } from '@game/combat/model.js';

export type ClassSkillCard = {
  id: string;
  name: string;
  mana: number;
  power: number;
  cooldown: number;
  effects?: Skill['effects'];
  target?: Skill['target'];
  blurb?: string;
};

export type ClassKitCards = {
  basics: [ClassSkillCard, ClassSkillCard];
  skills: [ClassSkillCard, ClassSkillCard, ClassSkillCard];
};

function toCard(skill: Skill): ClassSkillCard {
  return {
    id: skill.id,
    name: skill.name,
    mana: skill.mana,
    power: skill.power,
    cooldown: skill.cooldown,
    effects: skill.effects,
    target: skill.target,
    blurb: skill.blurb,
  };
}

export const CLASS_SKILLS: Record<string, ClassKitCards> = Object.fromEntries(
  Object.entries(CLASS_KITS).map(([id, kit]) => [
    id,
    {
      basics: [toCard(kit.basics[0]), toCard(kit.basics[1])] as [ClassSkillCard, ClassSkillCard],
      skills: [toCard(kit.skills[0]), toCard(kit.skills[1]), toCard(kit.skills[2])] as [
        ClassSkillCard,
        ClassSkillCard,
        ClassSkillCard,
      ],
    },
  ]),
);

export { professionFromAvatar };

/** Two equipped actives (saved loadout when present, else rolled pair). Full effects included. */
export function arenaSkills(
  professionId: string | undefined,
  saved?: HeroSkillLoadout | null,
  seed?: string,
): [DuelSkillCard, DuelSkillCard] {
  return heroLoadoutSkills(professionId, saved ?? null, seed).skills;
}

export function arenaBasic(
  professionId: string | undefined,
  saved?: HeroSkillLoadout | null,
  seed?: string,
): DuelSkillCard {
  return heroLoadoutSkills(professionId, saved ?? null, seed).basic;
}

export function arenaHeroKit(
  professionId: string | undefined,
  saved?: HeroSkillLoadout | null,
  seed?: string,
) {
  return heroLoadoutSkills(professionId, saved ?? null, seed);
}

export function arenaCatalog(professionId: string | undefined) {
  return classCatalog(professionId);
}
