import type { RegionId } from '../types/game';
import { type SpecialRegionId } from './atlas';
import { countItem, ITEMS } from './items';
import type { ItemId, Stack } from './types';

/**
 * Five badges must sit in the bag (Vật phẩm) to teleport into a special land.
 * They are not spent. Ánh sáng and Thiên đường share the same set.
 */
export const BADGE_SETS: Record<SpecialRegionId, readonly RegionId[]> = {
  dark: ['forest', 'swamp', 'savannah', 'volcano', 'desert'],
  light: ['plains', 'mountains', 'beach', 'ocean', 'tundra'],
  hell: ['forest', 'ocean', 'volcano', 'desert', 'dark'],
  heaven: ['plains', 'mountains', 'beach', 'ocean', 'tundra'],
  chaos: ['forest', 'swamp', 'volcano', 'dark', 'hell'],
  'outer-space': ['plains', 'volcano', 'savannah', 'light', 'heaven'],
};

const BADGE_IDS = new Set<ItemId>([
  'badge-plains',
  'badge-mountains',
  'badge-forest',
  'badge-swamp',
  'badge-beach',
  'badge-ocean',
  'badge-tundra',
  'badge-savannah',
  'badge-volcano',
  'badge-desert',
  'badge-light',
  'badge-dark',
  'badge-heaven',
  'badge-hell',
  'badge-chaos',
  'badge-outer-space',
]);

export function badgeItemId(regionId: string): ItemId | null {
  const id = `badge-${regionId}` as ItemId;
  return BADGE_IDS.has(id) ? id : null;
}

export function hasBadgeSet(regionId: SpecialRegionId, bag: Stack[]): boolean {
  return BADGE_SETS[regionId].every((source) => {
    const itemId = badgeItemId(source);
    return itemId != null && countItem(bag, itemId) >= 1;
  });
}

export function badgeSetNotice(regionId: SpecialRegionId): string {
  const names = BADGE_SETS[regionId]
    .map((source) => {
      const itemId = badgeItemId(source);
      return itemId ? ITEMS[itemId].nameVi : source;
    })
    .join(', ');
  return `Cần bộ huy hiệu trong Vật phẩm: ${names}.`;
}
