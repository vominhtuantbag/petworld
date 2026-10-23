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
import { combatElement, type ElementId } from './elements';
import type { HeroStats } from './model';
import type { Skill } from './model';

export type SpeciesId = 'beast' | 'bug' | 'reptile' | 'avian' | 'aquatic' | 'spirit';

export type HeroTraits = HeroStats & {
  element: ElementId;
  critRate: number;
  critDamage: number;
};

const HERO_TRAITS: Record<string, HeroTraits> = {
  guardian: { element: 'metal', critRate: 0.08, critDamage: 1.5, mastery: 0.12, initiative: true },
  knight: { element: 'metal', critRate: 0.1, critDamage: 1.5, mastery: 0.1, initiative: true },
  mage: { element: 'arcane', critRate: 0.14, critDamage: 1.5, mastery: 0.15, initiative: true },
  healer: { element: 'light', critRate: 0.08, critDamage: 1.5, mastery: 0.1, initiative: true },
  rogue: { element: 'dark', critRate: 0.22, critDamage: 1.5, mastery: 0.08, initiative: true },
  bard: { element: 'dark', critRate: 0.2, critDamage: 1.5, mastery: 0.08, initiative: true },
  archer: { element: 'wind', critRate: 0.18, critDamage: 1.5, mastery: 0.1, initiative: true },
  ranger: { element: 'nature', critRate: 0.16, critDamage: 1.5, mastery: 0.14, initiative: true },
  scout: { element: 'wind', critRate: 0.16, critDamage: 1.5, mastery: 0.1, initiative: true },
  monk: { element: 'spirit', critRate: 0.12, critDamage: 1.5, mastery: 0.12, initiative: true },
  wanderer: { element: 'earth', critRate: 0.12, critDamage: 1.5, mastery: 0.1, initiative: true },
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

type ClassKit = { basics: [Skill, Skill]; skills: [Skill, Skill, Skill] };

const CLASS_KITS: Record<string, ClassKit> = {
  guardian: {
    basics: [move('guardian-bash', 'Đánh khiên', 0, 1, 0), move('guardian-shove', 'Húc vai', 0, 1.05, 0)],
    skills: [move('bash', 'Đập khiên', 6, 1.3, 1), move('ward', 'Hộ thể', 8, 0, 2), move('riposte', 'Phản đòn', 10, 1.5, 2)],
  },
  knight: {
    basics: [move('knight-cut', 'Chém kiếm', 0, 1, 0), move('knight-thrust', 'Đâm kiếm', 0, 1.08, 0)],
    skills: [move('slash', 'Chém', 6, 1.4, 1), move('oath', 'Lời thề', 10, 1.65, 2), move('smite', 'Khiên thánh', 12, 1.55, 2)],
  },
  mage: {
    basics: [move('mage-staff', 'Gậy', 0, 1, 0), move('mage-bolt', 'Cầu lửa', 0, 1.05, 0)],
    skills: [move('spark', 'Tia lửa', 8, 1.55, 1), move('nova', 'Nổ sao', 14, 1.9, 3), move('frost', 'Đóng băng', 10, 1.7, 2)],
  },
  healer: {
    basics: [move('healer-staff', 'Gậy', 0, 1, 0), move('healer-light', 'Ánh nhẹ', 0, 1, 0)],
    skills: [move('mend', 'Hồi máu', 8, 0, 1), move('smite', 'Ánh sáng', 10, 1.4, 2), move('bless', 'Ban phước', 12, 0, 2)],
  },
  rogue: {
    basics: [move('rogue-knife', 'Dao', 0, 1, 0), move('rogue-jab', 'Đâm nhanh', 0, 1.15, 0)],
    skills: [move('stab', 'Đâm lén', 6, 1.45, 1), move('venom', 'Dao độc', 10, 1.7, 2), move('hide', 'Ẩn kích', 9, 1.6, 2)],
  },
  bard: {
    basics: [move('bard-twin', 'Song đao', 0, 1, 0), move('bard-cross', 'Chém chéo', 0, 1.1, 0)],
    skills: [move('cut', 'Chém kép', 7, 1.5, 1), move('shade', 'Bóng dao', 12, 1.85, 3), move('end', 'Kết liễu', 14, 1.9, 3)],
  },
  archer: {
    basics: [move('archer-shot', 'Bắn', 0, 1, 0), move('archer-tip', 'Mũi nhọn', 0, 1.08, 0)],
    skills: [move('shot', 'Mũi tên', 6, 1.4, 1), move('rain', 'Mưa tên', 12, 1.75, 3), move('pierce', 'Xuyên tên', 10, 1.65, 2)],
  },
  ranger: {
    basics: [move('ranger-trap', 'Bẫy tay', 0, 1, 0), move('ranger-knife', 'Dao săn', 0, 1.05, 0)],
    skills: [move('trap', 'Bẫy', 7, 1.35, 1), move('mark', 'Ngắm', 11, 1.7, 2), move('sting', 'Mũi độc', 9, 1.6, 2)],
  },
  scout: {
    basics: [move('scout-jab', 'Lao', 0, 1, 0), move('scout-throw', 'Ném', 0, 1.05, 0)],
    skills: [move('pin', 'Ghim', 6, 1.35, 1), move('flare', 'Pháo sáng', 9, 1.55, 2), move('mark', 'Đánh dấu', 8, 1.5, 2)],
  },
  monk: {
    basics: [move('monk-fist', 'Quyền', 0, 1, 0), move('monk-kick', 'Cước', 0, 1.08, 0)],
    skills: [move('palm', 'Chưởng', 6, 1.35, 1), move('breath', 'Điều khí', 8, 0, 2), move('chain', 'Liên hoàn', 10, 1.55, 2)],
  },
  wanderer: {
    basics: [move('wanderer-draw', 'Đao', 0, 1, 0), move('wanderer-sweep', 'Chém ngang', 0, 1.05, 0)],
    skills: [move('draw', 'Rút đao', 7, 1.45, 1), move('arc', 'Vòng chém', 12, 1.8, 3), move('break', 'Phá đao', 10, 1.7, 2)],
  },
};

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

export function skillKind(skill: Skill): 'basic' | 'active' | 'heal' {
  if (skill.mana <= 0 && skill.cooldown <= 0) return 'basic';
  if (skill.power <= 0) return 'heal';
  return 'active';
}

export function skillTarget(skill: Skill): string {
  return skillKind(skill) === 'heal' ? 'Bản thân' : 'Một kẻ địch';
}

export function skillMark(skill: Skill): string {
  const kind = skillKind(skill);
  if (kind === 'heal') return '+';
  if (kind === 'basic') return 'Đ';
  return 'K';
}

/** Dictionary copy. Heal size matches `healAmount` in combat. */
export function skillEffect(skill: Skill): string {
  const kind = skillKind(skill);
  if (kind === 'basic') {
    return `Đòn đánh thường vào một kẻ địch. Sát thương bằng Tấn công × ${formatPower(skill.power)}. Không tốn mana, không thời gian hồi. Có thể chí mạng và chịu khắc hệ.`;
  }
  if (kind === 'heal') {
    return 'Hồi máu cho người dùng, khoảng 22% máu tối đa và không dưới 8 điểm. Không gây sát thương.';
  }
  return `Kỹ năng chủ động vào một kẻ địch. Sát thương bằng Tấn công × ${formatPower(skill.power)}. Có thể chí mạng và chịu khắc hệ.`;
}

function formatPower(power: number): string {
  const rounded = Math.round(power * 100) / 100;
  const [whole, frac] = String(rounded).split('.');
  return frac ? `${whole},${frac}` : whole;
}

export function describeSkill(skill: Skill): string {
  const kind = skillKind(skill);
  if (kind === 'basic') return `${skill.name}. Đòn đánh thường, hệ số sát thương ×${skill.power}. Không tốn mana.`;
  if (kind === 'heal') return `${skill.name}. Hồi máu. Tốn ${skill.mana} mana và hồi sau ${skill.cooldown} lượt.`;
  return `${skill.name}. Kỹ năng chủ động. Tốn ${skill.mana} mana, hồi ${skill.cooldown} lượt, hệ số sát thương ×${skill.power}.`;
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
