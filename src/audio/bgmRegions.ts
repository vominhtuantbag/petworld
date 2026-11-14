import type { RegionId } from '../types/game';
import { resolveZoneId } from '../world/atlas';

/**
 * Stable BGM dictionary keys (match `assets/audio/bgm/<key>_overworld.*`).
 * These are the thematic track ids from the audio design sheet — not always
 * identical to `RegionId` (e.g. mountains → mountain, tundra → frost).
 */
export type BgmRegionKey =
  | 'plains'
  | 'mountain'
  | 'forest'
  | 'swamp'
  | 'beach'
  | 'ocean'
  | 'frost'
  | 'savannah'
  | 'volcano'
  | 'desert'
  | 'darkness'
  | 'light'
  | 'heaven'
  | 'hell'
  | 'chaos'
  | 'cosmic';

export const BGM_REGION_KEYS: readonly BgmRegionKey[] = [
  'plains',
  'mountain',
  'forest',
  'swamp',
  'beach',
  'ocean',
  'frost',
  'savannah',
  'volcano',
  'desert',
  'darkness',
  'light',
  'heaven',
  'hell',
  'chaos',
  'cosmic',
] as const;

/** Game region → BGM dictionary key. */
export const REGION_TO_BGM: Record<RegionId, BgmRegionKey> = {
  plains: 'plains',
  mountains: 'mountain',
  forest: 'forest',
  swamp: 'swamp',
  beach: 'beach',
  ocean: 'ocean',
  tundra: 'frost',
  savannah: 'savannah',
  volcano: 'volcano',
  desert: 'desert',
  dark: 'darkness',
  light: 'light',
  heaven: 'heaven',
  hell: 'hell',
  chaos: 'chaos',
  'outer-space': 'cosmic',
};

const REGION_IDS = new Set<string>(Object.keys(REGION_TO_BGM));

function isRegionId(id: string): id is RegionId {
  return REGION_IDS.has(id);
}

/**
 * Resolve the overworld BGM key for a live wilds zone id (`plains:m3`, …).
 * Town hubs (`town:forest`) return null — town music is a separate system.
 */
export function bgmKeyForZone(zoneId: string): BgmRegionKey | null {
  const resolved = resolveZoneId(zoneId);
  if (resolved.startsWith('town:') || zoneId.startsWith('town:')) return null;
  const province = resolved.split(':')[0] ?? '';
  if (province === 'void') return 'darkness';
  if (!isRegionId(province)) return null;
  return REGION_TO_BGM[province];
}

/**
 * Overworld bed plays only on hunting / open-world maps.
 * Town hubs stay silent here — they get a separate town BGM later.
 */
export function sceneAllowsOverworldBgm(scene: string): boolean {
  return scene === 'wilds';
}
