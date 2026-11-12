/**
 * Skill pools and loadout rolls — Single Source of Truth for PvE and PvP.
 */

import { heroAdvanced, type AdvancedStats } from './advanced.js';
import { CLASS_KITS } from './characterSkills.js';
import { biomeSkillList } from './biomeSkills.js';
import { combatElement, type ElementId } from './elements.js';
import type { HeroStats, Skill } from './model.js';
import { locomotionBasicSkills as locomotionBasics, locomotionKit } from './petSkills.js';
import { hashString, mulberry32 } from './rng.js';

export { CLASS_KITS } from './characterSkills.js';
export {
  LOCOMOTION_IDS,
  LOCOMOTION_TITLE,
  locomotionBasicSkills,
  locomotionOf,
  locomotionTitle,
  type LocomotionId,
} from './petSkills.js';

export type SpeciesId = 'beast' | 'bug' | 'reptile' | 'avian' | 'aquatic' | 'spirit';

export type HeroTraits = HeroStats &
  AdvancedStats & {
    element: ElementId;
  };

const HERO_TRAITS: Record<string, HeroTraits> = {
  guardian: { element: 'mountain', mastery: 0.12, initiative: true, ...heroAdvanced('guardian') },
  knight: { element: 'mountain', mastery: 0.1, initiative: true, ...heroAdvanced('knight') },
  mage: { element: 'chaos', mastery: 0.15, initiative: true, ...heroAdvanced('mage') },
  healer: { element: 'light', mastery: 0.1, initiative: true, ...heroAdvanced('healer') },
  rogue: { element: 'darkness', mastery: 0.08, initiative: true, ...heroAdvanced('rogue') },
  bard: { element: 'darkness', mastery: 0.08, initiative: true, ...heroAdvanced('bard') },
  archer: { element: 'plains', mastery: 0.1, initiative: true, ...heroAdvanced('archer') },
  ranger: { element: 'forest', mastery: 0.14, initiative: true, ...heroAdvanced('ranger') },
  scout: { element: 'plains', mastery: 0.1, initiative: true, ...heroAdvanced('scout') },
  monk: { element: 'heaven', mastery: 0.12, initiative: true, ...heroAdvanced('monk') },
  wanderer: { element: 'savanna', mastery: 0.1, initiative: true, ...heroAdvanced('wanderer') },
};

function elementPool(element: ElementId): Skill[] {
  return biomeSkillList(element);
}

export function speciesOf(kindId: string): SpeciesId {
  if (/^(shade|chaos|warden|shard|void)$/.test(kindId) || /golem|phoenix/.test(kindId)) return 'spirit';
  if (/falcon|eagle|owl|heron|toucan|macaw|seagull|ostrich|secretary|penguin/.test(kindId)) return 'avian';
  if (/fish|whale|shark|seal|orca|manta|octopus|jelly|seahorse|moray|tang|clown|walrus|oyster|starfish|snail/.test(kindId)) {
    return 'aquatic';
  }
  if (/snake|lizard|alligator|crocodile|turtle|frog|toad|salamander|slug|gila|anaconda|tortoise/.test(kindId)) return 'reptile';
  if (/crab|scorpion|spider|beetle|mosquito|dragonfly|butterfly|crayfish|tarantula|hermit/.test(kindId)) return 'bug';
  return 'beast';
}

export function heroTraits(professionId: string | undefined): HeroTraits {
  return HERO_TRAITS[professionId ?? ''] ?? HERO_TRAITS.wanderer;
}

export function masteryOf(professionId: string | undefined): number {
  return heroTraits(professionId).mastery;
}

export function applyMastery<T extends { attack: number; defense: number }>(fighter: T, mastery: number): T {
  if (mastery <= 0) return fighter;
  return {
    ...fighter,
    attack: Math.max(1, Math.round(fighter.attack * (1 + mastery))),
    defense: Math.max(0, Math.round(fighter.defense * (1 + mastery))),
  };
}

function rngFor(seed: string): () => number {
  return mulberry32(hashString(seed));
}

function pickDistinct<T>(items: readonly T[], count: number, rng: () => number): T[] {
  const pool = items.slice();
  const picked: T[] = [];
  const take = Math.min(count, pool.length);
  for (let index = 0; index < take; index += 1) {
    const at = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    const [choice] = pool.splice(at, 1);
    picked.push(choice);
  }
  return picked;
}

export type MonsterKit = { basic: Skill; skills: Skill[] };
export type HeroKit = { basics: Skill[]; skills: Skill[] };

export function rollMonsterKit(kindId: string, seed: string): MonsterKit {
  const basics = locomotionKit(kindId).basics;
  const offered = elementPool(combatElement(kindId)).slice(0, 3);
  const rng = rngFor(`${seed}:monster`);
  const [basic] = pickDistinct(basics, 1, rng);
  return { basic, skills: pickDistinct(offered, 2, rng) };
}

export function rollHeroKit(professionId: string | undefined, seed?: string): HeroKit {
  const kit = CLASS_KITS[professionId ?? ''] ?? CLASS_KITS.wanderer;
  const rng = rngFor(`hero:${professionId ?? 'wanderer'}:${seed ?? 'class'}`);
  return { basics: [...kit.basics], skills: pickDistinct(kit.skills, 2, rng) };
}

export type SkillLoadout = { basicId: string; skillIds: string[] };
export type HeroSkillLoadout = SkillLoadout & { professionId: string };

function classId(professionId: string | undefined): string {
  return professionId && CLASS_KITS[professionId] ? professionId : 'wanderer';
}

export function classCatalog(professionId: string | undefined): { basics: Skill[]; skills: Skill[] } {
  const kit = CLASS_KITS[classId(professionId)];
  return { basics: [...kit.basics], skills: [...kit.skills] };
}

export function monsterCatalog(kindId: string): { basics: Skill[]; skills: Skill[] } {
  return {
    basics: [...locomotionKit(kindId).basics],
    skills: elementPool(combatElement(kindId)),
  };
}

export const SPECIES_IDS: readonly SpeciesId[] = ['beast', 'bug', 'reptile', 'avian', 'aquatic', 'spirit'];

const SPECIES_TITLE: Record<SpeciesId, string> = {
  beast: 'Thú',
  bug: 'Côn trùng',
  reptile: 'Bò sát',
  avian: 'Chim',
  aquatic: 'Thủy sinh',
  spirit: 'Linh',
};

export function speciesTitle(id: SpeciesId): string {
  return SPECIES_TITLE[id];
}

/** @deprecated Prefer locomotionBasicSkills. */
export function speciesBasicSkills(id: SpeciesId): Skill[] {
  const mapped = {
    beast: 'quadruped',
    spirit: 'biped',
    reptile: 'leaping',
    bug: 'crawling',
    aquatic: 'swimming',
    avian: 'flying',
  } as const;
  return locomotionBasics(mapped[id]);
}

export function elementSkillList(element: ElementId): Skill[] {
  return elementPool(element);
}

export function biomeCatalogSkills(element: ElementId): Skill[] {
  return elementPool(element);
}

export function skillKind(skill: Skill): 'basic' | 'active' | 'heal' | 'utility' {
  const ultimate = /(?:-5)$/.test(skill.id);
  if (!ultimate && skill.mana <= 0 && skill.cooldown <= 0) return 'basic';
  const hasHeal = (skill.effects ?? []).some((effect) => effect.type === 'heal');
  if (skill.power <= 0 && hasHeal) return 'heal';
  if (skill.power <= 0) return 'utility';
  return 'active';
}

const TARGET_LABEL: Record<string, string> = {
  enemy: 'Một kẻ địch',
  enemy_back: 'Hàng sau',
  enemies: 'Toàn bộ địch',
  enemy_pets: 'Pet địch',
  ally: 'Một đồng minh',
  ally_pet: 'Một pet',
  self: 'Bản thân',
  party: 'Cả đội',
  party_pets: 'Mọi pet',
  none: 'Không cần mục tiêu',
};

export function skillTarget(skill: Skill): string {
  if (skill.target) return TARGET_LABEL[skill.target] ?? skill.target;
  return skillKind(skill) === 'heal' || skillKind(skill) === 'utility' ? 'Bản thân / đồng minh' : 'Một kẻ địch';
}

export function skillMark(skill: Skill): string {
  const kind = skillKind(skill);
  if (kind === 'heal') return '+';
  if (kind === 'utility') return '※';
  if (kind === 'basic') return 'Đ';
  return 'K';
}

export function skillEffect(skill: Skill): string {
  if (skill.blurb) return skill.blurb;
  const kind = skillKind(skill);
  if (kind === 'basic') {
    return `Đòn đánh thường. Sát thương × ${formatPower(skill.power)}. Không tốn mana.`;
  }
  if (kind === 'heal') return 'Hồi máu / hỗ trợ đồng minh.';
  if (kind === 'utility') return 'Kỹ năng hỗ trợ. Không gây sát thương trực tiếp.';
  return `Kỹ năng chủ động. Sát thương × ${formatPower(skill.power)}.`;
}

function formatPower(power: number): string {
  const rounded = Math.round(power * 100) / 100;
  const [whole, frac] = String(rounded).split('.');
  return frac ? `${whole},${frac}` : whole;
}

export function describeSkill(skill: Skill): string {
  const cd = skill.cooldown > 0 ? `, CD ${skill.cooldown}` : '';
  const mana = skill.mana > 0 ? ` · ${skill.mana} MP` : '';
  const body = skill.blurb ?? skillEffect(skill);
  return `${skill.name}${mana}${cd}. ${body}`;
}

export function defaultHeroLoadout(professionId: string | undefined, seed?: string): HeroSkillLoadout {
  const id = classId(professionId);
  const rolled = rollHeroKit(id, seed);
  return { professionId: id, basicId: classCatalog(id).basics[0].id, skillIds: rolled.skills.map((skill) => skill.id) };
}

export function resolveHeroLoadout(
  saved: HeroSkillLoadout | null | undefined,
  professionId: string | undefined,
  seed?: string,
): HeroSkillLoadout {
  const fresh = defaultHeroLoadout(professionId, seed);
  if (!saved || saved.professionId !== fresh.professionId) return fresh;
  const catalog = classCatalog(fresh.professionId);
  const basicId = catalog.basics.some((skill) => skill.id === saved.basicId) ? saved.basicId : fresh.basicId;
  const unique = [...new Set(saved.skillIds.filter((id) => catalog.skills.some((skill) => skill.id === id)))].slice(0, 2);
  for (const skill of catalog.skills) {
    if (unique.length >= 2) break;
    if (!unique.includes(skill.id)) unique.push(skill.id);
  }
  return { professionId: fresh.professionId, basicId, skillIds: unique };
}

export function resolvePetLoadout(monster: { id: string; kindId: string; basicId?: string; skillIds?: string[] }): SkillLoadout {
  const catalog = monsterCatalog(monster.kindId);
  const offered = catalog.skills.slice(0, 3);
  const fallback = rollMonsterKit(monster.kindId, monster.id);
  const basicId = catalog.basics.some((skill) => skill.id === monster.basicId) ? monster.basicId! : fallback.basic.id;
  const unique = [...new Set((monster.skillIds ?? []).filter((id) => offered.some((skill) => skill.id === id)))].slice(0, 2);
  // Pad from the rolled kit / offered pool — never discard a valid equipped id.
  for (const skill of [...fallback.skills, ...offered]) {
    if (unique.length >= 2) break;
    if (!unique.includes(skill.id)) unique.push(skill.id);
  }
  return { basicId, skillIds: unique.slice(0, 2) };
}

export function placeActiveSkill(current: readonly string[], skillId: string, allowed: readonly string[]): string[] {
  if (!allowed.includes(skillId) || current.length === 0) return [...current];
  if (current.includes(skillId)) {
    if (current[0] === skillId) return [...current];
    const rest = current.filter((id) => id !== skillId);
    return [skillId, ...rest].slice(0, 2);
  }
  return [current[0], skillId];
}

/** Map avatar id (`m-knight`, `f-mage`) onto a class kit id. */
export function professionFromAvatar(baseAvatarId: string | undefined): string {
  const raw = (baseAvatarId ?? '').replace(/^[mf]-/, '');
  return raw && CLASS_KITS[raw] ? raw : 'wanderer';
}
