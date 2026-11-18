import type { ImageSourcePropType } from 'react-native';

import { LOCOMOTION_IDS, locomotionBasicSkills, numberedClassSkills } from './combat/kits';

/**
 * Class skill icons in `assets/skills/char/<class>/1.png` … `5.png`.
 * Slot order matches Kỹ Năng: basics first, then the three class skills.
 */
const CLASS_FOLDER: Record<string, string> = {
  ranger: 'thosan',
  knight: 'hiepsi',
  mage: 'phapsu',
  scout: 'trinhsat',
  monk: 'tusi',
  archer: 'cungthu',
  healer: 'ysu',
  rogue: 'daotac',
  guardian: 'hove',
  wanderer: 'langkhach',
  bard: 'satthu',
};

const CLASS_ICONS: Record<string, Record<number, ImageSourcePropType>> = {
  thosan: {
    1: require('../../assets/skills/char/thosan/1.png'),
    2: require('../../assets/skills/char/thosan/2.png'),
    3: require('../../assets/skills/char/thosan/3.png'),
    4: require('../../assets/skills/char/thosan/4.png'),
    5: require('../../assets/skills/char/thosan/5.png'),
  },
  hiepsi: {
    1: require('../../assets/skills/char/hiepsi/1.png'),
    2: require('../../assets/skills/char/hiepsi/2.png'),
    3: require('../../assets/skills/char/hiepsi/3.png'),
    4: require('../../assets/skills/char/hiepsi/4.png'),
    5: require('../../assets/skills/char/hiepsi/5.png'),
  },
  phapsu: {
    1: require('../../assets/skills/char/phapsu/1.png'),
    2: require('../../assets/skills/char/phapsu/2.png'),
    3: require('../../assets/skills/char/phapsu/3.png'),
    4: require('../../assets/skills/char/phapsu/4.png'),
    5: require('../../assets/skills/char/phapsu/5.png'),
  },
  trinhsat: {
    1: require('../../assets/skills/char/trinhsat/1.png'),
    2: require('../../assets/skills/char/trinhsat/2.png'),
    3: require('../../assets/skills/char/trinhsat/3.png'),
    4: require('../../assets/skills/char/trinhsat/4.png'),
    5: require('../../assets/skills/char/trinhsat/5.png'),
  },
  tusi: {
    1: require('../../assets/skills/char/tusi/1.png'),
    2: require('../../assets/skills/char/tusi/2.png'),
    3: require('../../assets/skills/char/tusi/3.png'),
    4: require('../../assets/skills/char/tusi/4.png'),
    5: require('../../assets/skills/char/tusi/5.png'),
  },
  cungthu: {
    1: require('../../assets/skills/char/cungthu/1.png'),
    2: require('../../assets/skills/char/cungthu/2.png'),
    3: require('../../assets/skills/char/cungthu/3.png'),
    4: require('../../assets/skills/char/cungthu/4.png'),
    5: require('../../assets/skills/char/cungthu/5.png'),
  },
  ysu: {
    1: require('../../assets/skills/char/ysu/1.png'),
    2: require('../../assets/skills/char/ysu/2.png'),
    3: require('../../assets/skills/char/ysu/3.png'),
    4: require('../../assets/skills/char/ysu/4.png'),
    5: require('../../assets/skills/char/ysu/5.png'),
  },
  daotac: {
    1: require('../../assets/skills/char/daotac/1.png'),
    2: require('../../assets/skills/char/daotac/2.png'),
    3: require('../../assets/skills/char/daotac/3.png'),
    4: require('../../assets/skills/char/daotac/4.png'),
    5: require('../../assets/skills/char/daotac/5.png'),
  },
  hove: {
    1: require('../../assets/skills/char/hove/1.png'),
    2: require('../../assets/skills/char/hove/2.png'),
    3: require('../../assets/skills/char/hove/3.png'),
    4: require('../../assets/skills/char/hove/4.png'),
    5: require('../../assets/skills/char/hove/5.png'),
  },
  langkhach: {
    1: require('../../assets/skills/char/langkhach/1.png'),
    2: require('../../assets/skills/char/langkhach/2.png'),
    3: require('../../assets/skills/char/langkhach/3.png'),
    4: require('../../assets/skills/char/langkhach/4.png'),
    5: require('../../assets/skills/char/langkhach/5.png'),
  },
  satthu: {
    1: require('../../assets/skills/char/satthu/1.png'),
    2: require('../../assets/skills/char/satthu/2.png'),
    3: require('../../assets/skills/char/satthu/3.png'),
    4: require('../../assets/skills/char/satthu/4.png'),
    5: require('../../assets/skills/char/satthu/5.png'),
  },
};

export const NET_SKILL_ART: ImageSourcePropType = require('../../assets/skills/char/luoi.png');
export const DEFEND_SKILL_ART: ImageSourcePropType = require('../../assets/skills/char/phongthu.png');
export const PET_DEFEND_ART: ImageSourcePropType = require('../../assets/skills/pet/phongthu.png');

export function classSkillArt(professionId: string | undefined, slot: number): ImageSourcePropType | null {
  const folder = CLASS_FOLDER[professionId ?? ''];
  if (!folder || slot < 1 || slot > 5) return null;
  return CLASS_ICONS[folder]?.[slot] ?? null;
}

export function classSkillIcon(professionId: string | undefined, skillId: string | undefined): ImageSourcePropType | null {
  if (!professionId || !skillId) return null;
  const slot = numberedClassSkills(professionId).find((entry) => entry.skill.id === skillId)?.slot;
  if (!slot) return null;
  return classSkillArt(professionId, slot);
}

const BASIC_ICONS: Record<number, ImageSourcePropType> = {
  1: require('../../assets/skills/pet/danhthuong/1.png'),
  2: require('../../assets/skills/pet/danhthuong/2.png'),
  3: require('../../assets/skills/pet/danhthuong/3.png'),
  4: require('../../assets/skills/pet/danhthuong/4.png'),
  5: require('../../assets/skills/pet/danhthuong/5.png'),
  6: require('../../assets/skills/pet/danhthuong/6.png'),
  7: require('../../assets/skills/pet/danhthuong/7.png'),
  8: require('../../assets/skills/pet/danhthuong/8.png'),
  9: require('../../assets/skills/pet/danhthuong/9.png'),
  10: require('../../assets/skills/pet/danhthuong/10.png'),
  11: require('../../assets/skills/pet/danhthuong/11.png'),
  12: require('../../assets/skills/pet/danhthuong/12.png'),
};

const BIOME_FOLDER: Record<string, string> = {
  plains: 'dongbang',
  mountain: 'nuinon',
  forest: 'rungram',
  swamp: 'damlay',
  beach: 'baibien',
  ocean: 'daiduong',
  frost: 'banggia',
  savanna: 'thaonguyen',
  volcano: 'nuilua',
  desert: 'samac',
  darkness: 'bongtoi',
  light: 'anhsang',
  heaven: 'thienduong',
  hell: 'dianguc',
  chaos: 'honmang',
  cosmic: 'vutru',
};

const BIOME_ICONS: Record<string, Record<number, ImageSourcePropType>> = {
  dongbang: {
    1: require('../../assets/skills/pet/dongbang/1.png'),
    2: require('../../assets/skills/pet/dongbang/2.png'),
    3: require('../../assets/skills/pet/dongbang/3.png'),
    4: require('../../assets/skills/pet/dongbang/4.png'),
    5: require('../../assets/skills/pet/dongbang/5.png'),
  },
  nuinon: {
    1: require('../../assets/skills/pet/nuinon/1.png'),
    2: require('../../assets/skills/pet/nuinon/2.png'),
    3: require('../../assets/skills/pet/nuinon/3.png'),
    4: require('../../assets/skills/pet/nuinon/4.png'),
    5: require('../../assets/skills/pet/nuinon/5.png'),
  },
  rungram: {
    1: require('../../assets/skills/pet/rungram/1.png'),
    2: require('../../assets/skills/pet/rungram/2.png'),
    3: require('../../assets/skills/pet/rungram/3.png'),
    4: require('../../assets/skills/pet/rungram/4.png'),
    5: require('../../assets/skills/pet/rungram/5.png'),
  },
  damlay: {
    1: require('../../assets/skills/pet/damlay/1.png'),
    2: require('../../assets/skills/pet/damlay/2.png'),
    3: require('../../assets/skills/pet/damlay/3.png'),
    4: require('../../assets/skills/pet/damlay/4.png'),
    5: require('../../assets/skills/pet/damlay/5.png'),
  },
  baibien: {
    1: require('../../assets/skills/pet/baibien/1.png'),
    2: require('../../assets/skills/pet/baibien/2.png'),
    3: require('../../assets/skills/pet/baibien/3.png'),
    4: require('../../assets/skills/pet/baibien/4.png'),
    5: require('../../assets/skills/pet/baibien/5.png'),
  },
  daiduong: {
    1: require('../../assets/skills/pet/daiduong/1.png'),
    2: require('../../assets/skills/pet/daiduong/2.png'),
    3: require('../../assets/skills/pet/daiduong/3.png'),
    4: require('../../assets/skills/pet/daiduong/4.png'),
    5: require('../../assets/skills/pet/daiduong/5.png'),
  },
  banggia: {
    1: require('../../assets/skills/pet/banggia/1.png'),
    2: require('../../assets/skills/pet/banggia/2.png'),
    3: require('../../assets/skills/pet/banggia/3.png'),
    4: require('../../assets/skills/pet/banggia/4.png'),
    5: require('../../assets/skills/pet/banggia/5.png'),
  },
  thaonguyen: {
    1: require('../../assets/skills/pet/thaonguyen/1.png'),
    2: require('../../assets/skills/pet/thaonguyen/2.png'),
    3: require('../../assets/skills/pet/thaonguyen/3.png'),
    4: require('../../assets/skills/pet/thaonguyen/4.png'),
    5: require('../../assets/skills/pet/thaonguyen/5.png'),
  },
  nuilua: {
    1: require('../../assets/skills/pet/nuilua/1.png'),
    2: require('../../assets/skills/pet/nuilua/2.png'),
    3: require('../../assets/skills/pet/nuilua/3.png'),
    4: require('../../assets/skills/pet/nuilua/4.png'),
    5: require('../../assets/skills/pet/nuilua/5.png'),
  },
  samac: {
    1: require('../../assets/skills/pet/samac/1.png'),
    2: require('../../assets/skills/pet/samac/2.png'),
    3: require('../../assets/skills/pet/samac/3.png'),
    4: require('../../assets/skills/pet/samac/4.png'),
    5: require('../../assets/skills/pet/samac/5.png'),
  },
  bongtoi: {
    1: require('../../assets/skills/pet/bongtoi/1.png'),
    2: require('../../assets/skills/pet/bongtoi/2.png'),
    3: require('../../assets/skills/pet/bongtoi/3.png'),
    4: require('../../assets/skills/pet/bongtoi/4.png'),
    5: require('../../assets/skills/pet/bongtoi/5.png'),
  },
  anhsang: {
    1: require('../../assets/skills/pet/anhsang/1.png'),
    2: require('../../assets/skills/pet/anhsang/2.png'),
    3: require('../../assets/skills/pet/anhsang/3.png'),
    4: require('../../assets/skills/pet/anhsang/4.png'),
    5: require('../../assets/skills/pet/anhsang/5.png'),
  },
  thienduong: {
    1: require('../../assets/skills/pet/thienduong/1.png'),
    2: require('../../assets/skills/pet/thienduong/2.png'),
    3: require('../../assets/skills/pet/thienduong/3.png'),
    4: require('../../assets/skills/pet/thienduong/4.png'),
    5: require('../../assets/skills/pet/thienduong/5.png'),
  },
  dianguc: {
    1: require('../../assets/skills/pet/dianguc/1.png'),
    2: require('../../assets/skills/pet/dianguc/2.png'),
    3: require('../../assets/skills/pet/dianguc/3.png'),
    4: require('../../assets/skills/pet/dianguc/4.png'),
    5: require('../../assets/skills/pet/dianguc/5.png'),
  },
  honmang: {
    1: require('../../assets/skills/pet/honmang/1.png'),
    2: require('../../assets/skills/pet/honmang/2.png'),
    3: require('../../assets/skills/pet/honmang/3.png'),
    4: require('../../assets/skills/pet/honmang/4.png'),
    5: require('../../assets/skills/pet/honmang/5.png'),
  },
  vutru: {
    1: require('../../assets/skills/pet/vutru/1.png'),
    2: require('../../assets/skills/pet/vutru/2.png'),
    3: require('../../assets/skills/pet/vutru/3.png'),
    4: require('../../assets/skills/pet/vutru/4.png'),
    5: require('../../assets/skills/pet/vutru/5.png'),
  },
};

const BASIC_SLOT = new Map<string, number>();
{
  let slot = 0;
  for (const motion of LOCOMOTION_IDS) {
    for (const skill of locomotionBasicSkills(motion)) {
      slot += 1;
      BASIC_SLOT.set(skill.id, slot);
    }
  }
}

/** Global 1–12 index of a monster basic attack. */
export function petBasicSlot(skillId: string): number | null {
  return BASIC_SLOT.get(skillId) ?? null;
}

/** Monster basic attacks, in the same order as the Kỹ Năng list: 1 through 12. */
export function petBasicArt(slot: number): ImageSourcePropType | null {
  if (slot < 1 || slot > 12) return null;
  return BASIC_ICONS[slot] ?? null;
}

/** Numbered regional skill icon. Plains uses `assets/skills/pet/dongbang/1.png` … `5.png`. */
export function petBiomeArt(biome: string | undefined, slot: number): ImageSourcePropType | null {
  const folder = BIOME_FOLDER[biome ?? ''];
  if (!folder || slot < 1 || slot > 5) return null;
  return BIOME_ICONS[folder]?.[slot] ?? null;
}

/** Combat button for a monster skill: basic 1–12, or a regional skill such as `plains-2`. */
export function petSkillArt(skillId: string | undefined | null): ImageSourcePropType | null {
  if (!skillId) return null;
  const basic = petBasicSlot(skillId);
  if (basic) return petBasicArt(basic);
  const match = /^([a-z]+)-([1-5])$/.exec(skillId);
  if (!match || !BIOME_FOLDER[match[1]]) return null;
  return petBiomeArt(match[1], Number(match[2]));
}
