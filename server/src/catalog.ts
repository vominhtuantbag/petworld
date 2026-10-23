/**
 * Ids the client is allowed to store.
 * Keep these aligned with `src/data/characters.ts` and `src/types/game.ts`
 * in the Expo app. Gameplay branches on these ids, never on translated names.
 */

export const AVATAR_IDS = [
  'm-ranger',
  'f-ranger',
  'm-knight',
  'f-knight',
  'm-mage',
  'f-mage',
  'm-scout',
  'f-scout',
  'm-monk',
  'f-monk',
  'm-archer',
  'f-archer',
  'm-healer',
  'f-healer',
  'm-rogue',
  'f-rogue',
  'm-guardian',
  'f-guardian',
  'm-wanderer',
  'f-wanderer',
  'm-bard',
  'f-bard',
] as const;

export const REGION_IDS = [
  'forest',
  'beach',
  'mountains',
  'ocean',
  'volcano',
  'desert',
  'plains',
  'tundra',
  'swamp',
  'savannah',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];
export type RegionId = (typeof REGION_IDS)[number];
export type Gender = 'male' | 'female';
