/**
 * Skill pools and the rolls that fill a fighter's loadout.
 *
 * A monster species has three basic attacks. Generation keeps one.
 * An element has five skills. The fighter is offered the first three,
 * then keeps two of those three.
 * A hero class has two basic attacks (the player picks one before the
 * fight) and three skills, of which two are rolled when the hero is built.
 */

import { hashString, mulberry32 } from '../grid';
import { heroAdvanced, type AdvancedStats } from './advanced';
import { CLASS_KITS } from './characterSkills';
import { combatElement, type ElementId } from './elements';
import type { HeroStats, Skill } from './model';

export { CLASS_KITS } from './characterSkills';

export type SpeciesId = 'beast' | 'bug' | 'reptile' | 'avian' | 'aquatic' | 'spirit';

export type HeroTraits = HeroStats &
  AdvancedStats & {
    element: ElementId;
  };

const HERO_TRAITS: Record<string, HeroTraits> = {
  guardian: { element: 'metal', mastery: 0.12, initiative: true, ...heroAdvanced('guardian') },
  knight: { element: 'metal', mastery: 0.1, initiative: true, ...heroAdvanced('knight') },
  mage: { element: 'arcane', mastery: 0.15, initiative: true, ...heroAdvanced('mage') },
  healer: { element: 'light', mastery: 0.1, initiative: true, ...heroAdvanced('healer') },
  rogue: { element: 'dark', mastery: 0.08, initiative: true, ...heroAdvanced('rogue') },
  bard: { element: 'dark', mastery: 0.08, initiative: true, ...heroAdvanced('bard') },
  archer: { element: 'wind', mastery: 0.1, initiative: true, ...heroAdvanced('archer') },
  ranger: { element: 'nature', mastery: 0.14, initiative: true, ...heroAdvanced('ranger') },
  scout: { element: 'wind', mastery: 0.1, initiative: true, ...heroAdvanced('scout') },
  monk: { element: 'spirit', mastery: 0.12, initiative: true, ...heroAdvanced('monk') },
  wanderer: { element: 'earth', mastery: 0.1, initiative: true, ...heroAdvanced('wanderer') },
};

function move(id: string, name: string, mana: number, power: number, cooldown: number): Skill {
  return { id, name, mana, power, cooldown };
}

function basicTrio(prefix: string, names: readonly [string, string, string], powers: readonly [number, number, number]): Skill[] {
  return names.map((name, index) => move(`${prefix}-basic-${index + 1}`, name, 0, powers[index], 0));
}

/** Six body families. World species ids are grouped into these pools. */
const SPECIES_BASICS: Record<SpeciesId, Skill[]> = {
  beast: basicTrio('beast', ['Cắn', 'Húc', 'Vồ'], [1, 1.05, 1.1]),
  bug: basicTrio('bug', ['Chích', 'Kẹp', 'Cắn'], [1, 1.05, 1.08]),
  reptile: basicTrio('reptile', ['Quật', 'Cắn', 'Phun'], [1, 1.08, 1.02]),
  avian: basicTrio('avian', ['Mổ', 'Cào', 'Lao'], [1, 1.05, 1.12]),
  aquatic: basicTrio('aquatic', ['Đớp', 'Quẫy', 'Siết'], [1, 1.05, 1.1]),
  spirit: basicTrio('spirit', ['Chạm', 'Xé', 'Nổ'], [1, 1.08, 1.15]),
};

const ELEMENT_NAMES: Record<ElementId, readonly [string, string, string, string, string]> = {
  fire: ['Tàn lửa', 'Bùng cháy', 'Phun trào', 'Cột lửa', 'Thiêu đốt'],
  water: ['Súng nước', 'Vũ điệu mưa', 'Thủy triều', 'Xoáy nước', 'Sóng thần'],
  earth: ['Đá vụn', 'Rung đất', 'Tường đá', 'Hố sâu', 'Sụp núi'],
  wind: ['Gió cắt', 'Lốc xoáy', 'Cơn gió', 'Bão tố', 'Xé gió'],
  ice: ['Lạnh buốt', 'Mảnh băng', 'Bão tuyết', 'Đóng băng', 'Giáo băng'],
  lightning: ['Tia chớp', 'Sét đánh', 'Phóng điện', 'Tiếng sấm', 'Lôi kích'],
  nature: ['Lá sắc', 'Dây leo', 'Nở hoa', 'Rễ siết', 'Mầm độc'],
  poison: ['Phun độc', 'Chích độc', 'Độc tố', 'Sương độc', 'Ăn mòn'],
  metal: ['Mảnh kim', 'Chém thép', 'Khiên sắt', 'Mũi giáo', 'Búa nặng'],
  light: ['Tia sáng', 'Hào quang', 'Phán xét', 'Bình minh', 'Thánh kích'],
  dark: ['Bóng tối', 'Nuốt chửng', 'Hút hồn', 'Đêm đen', 'Vực thẳm'],
  arcane: ['Tia phép', 'Ấn chú', 'Nổ sao', 'Cổng phép', 'Hỗn mang'],
  lava: ['Nham thạch', 'Dòng nham', 'Phun nham', 'Hồ dung', 'Nổ nham'],
  storm: ['Gió sấm', 'Mưa đá', 'Lốc sét', 'Bão lớn', 'Sấm sét'],
  sand: ['Cát bay', 'Bão cát', 'Chôn vùi', 'Xương cát', 'Cát lún'],
  spirit: ['Linh khí', 'Hồn ảnh', 'Phán linh', 'Xuyên hồn', 'Vô ảnh'],
};

const ELEMENT_POWERS = [1.3, 1.55, 1.85, 1.65, 2.05] as const;
const ELEMENT_MANA = [6, 10, 14, 12, 16] as const;
const ELEMENT_COOLDOWN = [1, 2, 3, 2, 3] as const;

function elementPool(element: ElementId): Skill[] {
  return ELEMENT_NAMES[element].map((name, index) =>
    move(`${element}-${index + 1}`, name, ELEMENT_MANA[index], ELEMENT_POWERS[index], ELEMENT_COOLDOWN[index]),
  );
}

export function speciesOf(kindId: string): SpeciesId {
  if (/^(shade|chaos|warden|shard|void)$/.test(kindId) || /golem|phoenix/.test(kindId)) return 'spirit';
  if (/falcon|eagle|owl|heron|toucan|macaw|seagull|ostrich|secretary|penguin/.test(kindId)) return 'avian';
  if (/fish|whale|shark|seal|orca|manta|octopus|jelly|seahorse|moray|tang|clown|walrus|oyster|starfish|snail/.test(kindId)) return 'aquatic';
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

/** Adds the hero's mastery to an ally's attack and defense. */
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

/** One basic attack, and two skills taken from the element's first three. */
export function rollMonsterKit(kindId: string, seed: string): MonsterKit {
  const basics = SPECIES_BASICS[speciesOf(kindId)];
  const offered = elementPool(combatElement(kindId)).slice(0, 3);
  const rng = rngFor(`${seed}:monster`);
  const [basic] = pickDistinct(basics, 1, rng);
  return { basic, skills: pickDistinct(offered, 2, rng) };
}

/**
 * Both class basics stay available. Exactly two of the three skills are kept.
 * `seed` is the hero's name so the roll happens once per character and stays put.
 */
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

/** Every basic attack and class skill for one profession. */
export function classCatalog(professionId: string | undefined): { basics: Skill[]; skills: Skill[] } {
  const kit = CLASS_KITS[classId(professionId)];
  return { basics: [...kit.basics], skills: [...kit.skills] };
}

/** Three species basics, then all five element skills. The first three skills can be equipped. */
export function monsterCatalog(kindId: string): { basics: Skill[]; skills: Skill[] } {
  return {
    basics: [...SPECIES_BASICS[speciesOf(kindId)]],
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

/** The three normal attacks shared by one body family. */
export function speciesBasicSkills(id: SpeciesId): Skill[] {
  return SPECIES_BASICS[id].map((skill) => ({ ...skill }));
}

/** All five skills of one element. Pets can equip the first three. */
export function elementSkillList(element: ElementId): Skill[] {
  return elementPool(element);
}

export function skillKind(skill: Skill): 'basic' | 'active' | 'heal' | 'utility' {
  if (skill.mana <= 0 && skill.cooldown <= 0) return 'basic';
  const hasHeal = (skill.effects ?? []).some((effect) => effect.type === 'heal');
  if (skill.power <= 0 && hasHeal) return 'heal';
  if (skill.power <= 0) return 'utility';
  return 'active';
}

const TARGET_LABEL: Record<string, string> = {
  enemy: 'Một kẻ địch',
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

/** Dictionary copy. Prefers author `blurb` when present. */
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

/** Keeps a saved pair when it still belongs to this profession. Otherwise uses the hero's rolled pair. */
export function resolveHeroLoadout(saved: HeroSkillLoadout | null | undefined, professionId: string | undefined, seed?: string): HeroSkillLoadout {
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
  if (unique.length < 2) return { basicId, skillIds: fallback.skills.map((skill) => skill.id) };
  return { basicId, skillIds: unique };
}

/** An equipped skill moves to the first slot. A new skill replaces the second slot. */
export function placeActiveSkill(current: readonly string[], skillId: string, allowed: readonly string[]): string[] {
  if (!allowed.includes(skillId) || current.length === 0) return [...current];
  if (current.includes(skillId)) {
    if (current[0] === skillId) return [...current];
    const rest = current.filter((id) => id !== skillId);
    return [skillId, ...rest].slice(0, 2);
  }
  return [current[0], skillId];
}
