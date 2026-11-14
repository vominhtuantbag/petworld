import { bgmKeyForZone } from './bgmRegions';

/**
 * @deprecated Prefer `bgmKeyForZone` from `bgmRegions.ts`.
 * True when the zone resolves to the plains overworld bed.
 */
export function isPlainsOverworldZone(zoneId: string): boolean {
  return bgmKeyForZone(zoneId) === 'plains';
}
