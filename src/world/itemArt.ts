import type { ImageSourcePropType } from 'react-native';

import type { ItemId } from './types';

/**
 * Pixel icons under `assets/item/`. Missing ids keep the tint swatch fallback.
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
};

export function itemArt(itemId: ItemId | string | undefined | null): ImageSourcePropType | null {
  if (!itemId) return null;
  return ITEM_ART[itemId as ItemId] ?? null;
}
