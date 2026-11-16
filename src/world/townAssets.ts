import type { ImageSourcePropType } from 'react-native';

import type { RegionId } from '../types/game';

/**
 * Local art for the 16 regional hubs.
 * Files live under `assets/towns/` (e.g. `E:\game tong hop\assets\towns\dongbang-town.jpg`).
 * Metro/Expo loads them via relative `require` — absolute OS paths are not bundle-safe.
 */

export const TOWN_ASSET_FILES = {
  plains: 'dongbang-town.jpg',
  mountains: 'nuinon-town.jpg',
  forest: 'rungram-town.jpg',
  swamp: 'damlay-town.jpg',
  beach: 'baibien-town.jpg',
  ocean: 'daiduong-town.jpg',
  tundra: 'banggia-town.jpg',
  savannah: 'thaonguyen-town.jpg',
  volcano: 'nuilua-town.jpg',
  desert: 'samac-town.jpg',
  light: 'anhsang-town.jpg',
  dark: 'bongtoi-town.jpg',
  heaven: 'thienduong-town.jpg',
  hell: 'dianguc-town.jpg',
  chaos: 'honmang-town.jpg',
  'outer-space': 'vutru-town.jpg',
} as const satisfies Record<RegionId, string>;

const TOWN_SOURCES: Record<RegionId, ImageSourcePropType> = {
  plains: require('../../assets/towns/dongbang-town.jpg'),
  mountains: require('../../assets/towns/nuinon-town.jpg'),
  forest: require('../../assets/towns/rungram-town.jpg'),
  swamp: require('../../assets/towns/damlay-town.jpg'),
  beach: require('../../assets/towns/baibien-town.jpg'),
  ocean: require('../../assets/towns/daiduong-town.jpg'),
  tundra: require('../../assets/towns/banggia-town.jpg'),
  savannah: require('../../assets/towns/thaonguyen-town.jpg'),
  volcano: require('../../assets/towns/nuilua-town.jpg'),
  desert: require('../../assets/towns/samac-town.jpg'),
  light: require('../../assets/towns/anhsang-town.jpg'),
  dark: require('../../assets/towns/bongtoi-town.jpg'),
  heaven: require('../../assets/towns/thienduong-town.jpg'),
  hell: require('../../assets/towns/dianguc-town.jpg'),
  chaos: require('../../assets/towns/honmang-town.jpg'),
  'outer-space': require('../../assets/towns/vutru-town.jpg'),
};

export function townMapSource(regionId: string): ImageSourcePropType {
  if (Object.prototype.hasOwnProperty.call(TOWN_SOURCES, regionId)) {
    return TOWN_SOURCES[regionId as RegionId];
  }
  return TOWN_SOURCES.plains;
}

/** Absolute workspace path helper for tooling / docs (not used by Metro). */
export function townAssetAbsolutePath(regionId: RegionId): string {
  return `E:\\game tong hop\\assets\\towns\\${TOWN_ASSET_FILES[regionId]}`;
}
