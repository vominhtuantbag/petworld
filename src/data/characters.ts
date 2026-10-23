import type { HairColorId, OutfitColorId } from './colors';
import type { Emblem, Gender, HairStyle, OutfitStyle } from '../types/game';

/**
 * Eleven professions. Gender is chosen after the icon, so each job has a
 * male and a female silhouette. The original ids (`m-ranger`, `f-archer`, …)
 * stay valid for saved characters.
 *
 * Add a profession by appending one object and its two ids to the server
 * avatar list. Reuse a hair, outfit, and emblem, or extend those unions
 * and `CharacterAvatar` when the drawing is new.
 */

type Silhouette = {
  id: string;
  skin: string;
  hairStyle: HairStyle;
  outfitStyle: OutfitStyle;
  defaultHairId: HairColorId;
  defaultOutfitId: OutfitColorId;
};

export type ProfessionDefinition = {
  id: string;
  title: string;
  titleEn: string;
  blurb: string;
  emblem: Emblem;
  male: Silhouette;
  female: Silhouette;
};

export type CharacterDefinition = {
  /** Stable id written into the player snapshot. Do not rename after release. */
  id: string;
  professionId: string;
  gender: Gender;
  title: string;
  titleEn: string;
  blurb: string;
  skin: string;
  hairStyle: HairStyle;
  outfitStyle: OutfitStyle;
  emblem: Emblem;
  defaultHairId: HairColorId;
  defaultOutfitId: OutfitColorId;
};

export const PROFESSIONS: readonly ProfessionDefinition[] = [
  {
    id: 'ranger',
    title: 'Thợ săn',
    titleEn: 'Ranger',
    blurb: 'Bước nhẹ dưới tán cây.',
    emblem: 'leaf',
    male: { id: 'm-ranger', skin: '#e0aa78', hairStyle: 'spikes', outfitStyle: 'vest', defaultHairId: 'brown', defaultOutfitId: 'forest' },
    female: { id: 'f-ranger', skin: '#f6ddc8', hairStyle: 'ponytail', outfitStyle: 'tunic', defaultHairId: 'blonde', defaultOutfitId: 'forest' },
  },
  {
    id: 'knight',
    title: 'Hiệp sĩ',
    titleEn: 'Knight',
    blurb: 'Giữ nhịp chậm và vững.',
    emblem: 'chevron',
    male: { id: 'm-knight', skin: '#c68642', hairStyle: 'swept', outfitStyle: 'armor', defaultHairId: 'ink', defaultOutfitId: 'dusk' },
    female: { id: 'f-knight', skin: '#e0aa78', hairStyle: 'braids', outfitStyle: 'plate', defaultHairId: 'auburn', defaultOutfitId: 'dusk' },
  },
  {
    id: 'mage',
    title: 'Pháp sư',
    titleEn: 'Mage',
    blurb: 'Mang theo một vì sao nhỏ.',
    emblem: 'star',
    male: { id: 'm-mage', skin: '#f6ddc8', hairStyle: 'mage', outfitStyle: 'robe', defaultHairId: 'silver', defaultOutfitId: 'ocean' },
    female: { id: 'f-mage', skin: '#f0c9a0', hairStyle: 'waves', outfitStyle: 'robe', defaultHairId: 'silver', defaultOutfitId: 'ocean' },
  },
  {
    id: 'scout',
    title: 'Trinh sát',
    titleEn: 'Scout',
    blurb: 'Đọc gió trước khi đi.',
    emblem: 'compass',
    male: { id: 'm-scout', skin: '#8d5524', hairStyle: 'sidePart', outfitStyle: 'jacket', defaultHairId: 'auburn', defaultOutfitId: 'sand' },
    female: { id: 'f-scout', skin: '#c68642', hairStyle: 'bob', outfitStyle: 'jacket', defaultHairId: 'brown', defaultOutfitId: 'sand' },
  },
  {
    id: 'monk',
    title: 'Tu sĩ',
    titleEn: 'Monk',
    blurb: 'Đi bộ như đang thở.',
    emblem: 'bead',
    male: { id: 'm-monk', skin: '#f0c9a0', hairStyle: 'topknot', outfitStyle: 'wrap', defaultHairId: 'night', defaultOutfitId: 'ivory' },
    female: { id: 'f-monk', skin: '#f6ddc8', hairStyle: 'bun', outfitStyle: 'wrap', defaultHairId: 'night', defaultOutfitId: 'ivory' },
  },
  {
    id: 'archer',
    title: 'Cung thủ',
    titleEn: 'Archer',
    blurb: 'Mũi tên nghỉ trên vai.',
    emblem: 'bow',
    male: { id: 'm-archer', skin: '#e0aa78', hairStyle: 'spikes', outfitStyle: 'vest', defaultHairId: 'brown', defaultOutfitId: 'forest' },
    female: { id: 'f-archer', skin: '#f6ddc8', hairStyle: 'ponytail', outfitStyle: 'tunic', defaultHairId: 'blonde', defaultOutfitId: 'forest' },
  },
  {
    id: 'healer',
    title: 'Y sư',
    titleEn: 'Healer',
    blurb: 'Giữ ấm cho cả nhóm.',
    emblem: 'heart',
    male: { id: 'm-healer', skin: '#c68642', hairStyle: 'swept', outfitStyle: 'wrap', defaultHairId: 'brown', defaultOutfitId: 'ivory' },
    female: { id: 'f-healer', skin: '#e0aa78', hairStyle: 'waves', outfitStyle: 'dress', defaultHairId: 'brown', defaultOutfitId: 'ivory' },
  },
  {
    id: 'rogue',
    title: 'Đạo tặc',
    titleEn: 'Rogue',
    blurb: 'Im lặng, rồi mỉm cười.',
    emblem: 'mask',
    male: { id: 'm-rogue', skin: '#8d5524', hairStyle: 'sidePart', outfitStyle: 'cloak', defaultHairId: 'ink', defaultOutfitId: 'dusk' },
    female: { id: 'f-rogue', skin: '#8d5524', hairStyle: 'bob', outfitStyle: 'cloak', defaultHairId: 'ink', defaultOutfitId: 'dusk' },
  },
  {
    id: 'guardian',
    title: 'Hộ vệ',
    titleEn: 'Guardian',
    blurb: 'Đứng giữa và không vội.',
    emblem: 'shield',
    male: { id: 'm-guardian', skin: '#c68642', hairStyle: 'topknot', outfitStyle: 'armor', defaultHairId: 'auburn', defaultOutfitId: 'crimson' },
    female: { id: 'f-guardian', skin: '#c68642', hairStyle: 'braids', outfitStyle: 'plate', defaultHairId: 'auburn', defaultOutfitId: 'crimson' },
  },
  {
    id: 'wanderer',
    title: 'Lãng khách',
    titleEn: 'Wanderer',
    blurb: 'Lối nào cũng là đường.',
    emblem: 'strap',
    male: { id: 'm-wanderer', skin: '#e0aa78', hairStyle: 'swept', outfitStyle: 'travel', defaultHairId: 'night', defaultOutfitId: 'sand' },
    female: { id: 'f-wanderer', skin: '#f0c9a0', hairStyle: 'bun', outfitStyle: 'travel', defaultHairId: 'night', defaultOutfitId: 'sand' },
  },
  {
    id: 'bard',
    title: 'Sát Thủ',
    titleEn: 'Assassin',
    blurb: 'Một nhát, rồi biến mất.',
    emblem: 'dagger',
    male: { id: 'm-bard', skin: '#f6ddc8', hairStyle: 'sidePart', outfitStyle: 'jacket', defaultHairId: 'blonde', defaultOutfitId: 'ocean' },
    female: { id: 'f-bard', skin: '#f0c9a0', hairStyle: 'waves', outfitStyle: 'dress', defaultHairId: 'blonde', defaultOutfitId: 'ocean' },
  },
];

function toCharacter(profession: ProfessionDefinition, gender: Gender): CharacterDefinition {
  const body = profession[gender];
  return {
    id: body.id,
    professionId: profession.id,
    gender,
    title: profession.title,
    titleEn: profession.titleEn,
    blurb: profession.blurb,
    skin: body.skin,
    hairStyle: body.hairStyle,
    outfitStyle: body.outfitStyle,
    emblem: profession.emblem,
    defaultHairId: body.defaultHairId,
    defaultOutfitId: body.defaultOutfitId,
  };
}

export const CHARACTERS: readonly CharacterDefinition[] = PROFESSIONS.flatMap((profession) => [
  toCharacter(profession, 'male'),
  toCharacter(profession, 'female'),
]);

const CHARACTERS_BY_ID = new Map(CHARACTERS.map((character) => [character.id, character]));
const PROFESSIONS_BY_ID = new Map(PROFESSIONS.map((profession) => [profession.id, profession]));

if (__DEV__) {
  if (CHARACTERS_BY_ID.size !== CHARACTERS.length) {
    throw new Error('Character ids must be unique.');
  }
  if (PROFESSIONS_BY_ID.size !== PROFESSIONS.length) {
    throw new Error('Profession ids must be unique.');
  }
}

export function getCharacter(id: string | null | undefined): CharacterDefinition | null {
  if (!id) return null;
  return CHARACTERS_BY_ID.get(id) ?? null;
}

export function getProfession(id: string | null | undefined): ProfessionDefinition | null {
  if (!id) return null;
  return PROFESSIONS_BY_ID.get(id) ?? null;
}

export function characterFor(professionId: string | null | undefined, gender: Gender | null | undefined): CharacterDefinition | null {
  const profession = getProfession(professionId);
  if (!profession || !gender) return null;
  return toCharacter(profession, gender);
}

export function charactersByGender(gender: Gender): CharacterDefinition[] {
  return CHARACTERS.filter((character) => character.gender === gender);
}
