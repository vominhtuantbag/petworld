import type { ImageSourcePropType } from 'react-native';

import { resolveMonsterArt } from '../components/world/monsterArt';
import { MAP1_ROSTER } from './monsters';
import type { ItemId } from './types';

/**
 * Pixel icons under `assets/item/`. Regional badges live in `assets/huyhieu/`.
 * Monster shards use that species' avatar.
 * A regional shard with no species still shows the first creature of its land.
 * Missing ids keep the tint swatch fallback.
 */
const ITEM_ART: Partial<Record<ItemId, ImageSourcePropType>> = {
  'hp-potion': require('../../assets/item/smallHP.png'),
  'hp-potion-m': require('../../assets/item/midHP.png'),
  'hp-potion-l': require('../../assets/item/bigHP.png'),
  'mana-potion': require('../../assets/item/smallMP.png'),
  'mana-potion-m': require('../../assets/item/midMP.png'),
  'mana-potion-l': require('../../assets/item/bigMP.png'),
  'stamina-potion': require('../../assets/item/smallSP.png'),
  'stamina-potion-m': require('../../assets/item/midSP.png'),
  'stamina-potion-l': require('../../assets/item/bigSP.png'),
  banana: require('../../assets/item/chuoi.png'),
  grape: require('../../assets/item/nho.png'),
  apple: require('../../assets/item/tao.png'),
  net: require('../../assets/item/luoi.png'),
  'town-scroll': require('../../assets/item/doicanh.png'),
  'mine-ticket': require('../../assets/item/ticket.png'),
  'badge-plains': require('../../assets/huyhieu/dongbang.png'),
  'badge-mountains': require('../../assets/huyhieu/nuinon.png'),
  'badge-forest': require('../../assets/huyhieu/rungram.png'),
  'badge-swamp': require('../../assets/huyhieu/damlay.png'),
  'badge-beach': require('../../assets/huyhieu/baibien.png'),
  'badge-ocean': require('../../assets/huyhieu/daiduong.png'),
  'badge-tundra': require('../../assets/huyhieu/banggia.png'),
  'badge-savannah': require('../../assets/huyhieu/thaonguyen.png'),
  'badge-volcano': require('../../assets/huyhieu/nuilua.png'),
  'badge-desert': require('../../assets/huyhieu/samac.png'),
  'badge-light': require('../../assets/huyhieu/anhsang.png'),
  'badge-dark': require('../../assets/huyhieu/bongtoi.png'),
  'badge-heaven': require('../../assets/huyhieu/thienduong.png'),
  'badge-hell': require('../../assets/huyhieu/dianguc.png'),
  'badge-chaos': require('../../assets/huyhieu/honmang.png'),
  'badge-outer-space': require('../../assets/huyhieu/vutru.png'),
};

const SHARD_FAUNA: Partial<Record<ItemId, string>> = {
  'shard-plains': 'plains',
  'shard-mountains': 'mountains',
  'shard-forest': 'forest',
  'shard-swamp': 'swamp',
  'shard-beach': 'beach',
  'shard-ocean': 'ocean',
  'shard-tundra': 'tundra',
  'shard-savannah': 'savannah',
  'shard-volcano': 'volcano',
  'shard-desert': 'desert',
};

function portraitOf(kindId: string): ImageSourcePropType | null {
  return resolveMonsterArt(kindId)?.source ?? null;
}

function faunaPortrait(itemId: ItemId): ImageSourcePropType | null {
  const fauna = SHARD_FAUNA[itemId];
  const kindId = fauna ? MAP1_ROSTER[fauna]?.[0]?.[0]?.id : undefined;
  return kindId ? portraitOf(kindId) : null;
}

export function itemArt(itemId: ItemId | string | undefined | null, kindId?: string | null): ImageSourcePropType | null {
  if (!itemId) return null;
  const id = itemId as ItemId;
  if (kindId && id in SHARD_FAUNA) {
    const face = portraitOf(kindId);
    if (face) return face;
  }
  if (id in SHARD_FAUNA) {
    const face = faunaPortrait(id);
    if (face) return face;
  }
  return ITEM_ART[id] ?? null;
}
