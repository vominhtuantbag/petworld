/**
 * Shared setup types.
 *
 * Character silhouettes are a closed set: add a style here, then draw it in
 * `CharacterAvatar`. The roster itself is open — new people are data entries.
 *
 * Regions are a closed catalog on purpose. Gameplay should branch on `RegionId`,
 * and `REGION_CATALOG` is checked against this union at compile time.
 */

export type Gender = 'male' | 'female';

export type SetupStep = 'character' | 'region' | 'gameplay';

export type HairStyle =
  | 'spikes'
  | 'swept'
  | 'mage'
  | 'sidePart'
  | 'topknot'
  | 'ponytail'
  | 'waves'
  | 'bob'
  | 'braids'
  | 'bun';

export type OutfitStyle =
  | 'vest'
  | 'armor'
  | 'robe'
  | 'jacket'
  | 'wrap'
  | 'tunic'
  | 'dress'
  | 'cloak'
  | 'plate'
  | 'travel';

export type Emblem =
  | 'leaf'
  | 'chevron'
  | 'star'
  | 'compass'
  | 'bead'
  | 'bow'
  | 'heart'
  | 'mask'
  | 'shield'
  | 'strap'
  | 'dagger';

export type RegionStatus = 'available' | 'locked';

export type RegionCatalog = 'starter' | 'expansion';

export type RegionId =
  | 'forest'
  | 'beach'
  | 'mountains'
  | 'ocean'
  | 'volcano'
  | 'desert'
  | 'plains'
  | 'tundra'
  | 'swamp'
  | 'savannah'
  | 'light'
  | 'dark'
  | 'chaos'
  | 'outer-space';

export type RegionMotifId =
  | 'forest'
  | 'beach'
  | 'mountains'
  | 'ocean'
  | 'volcano'
  | 'desert'
  | 'plains'
  | 'tundra'
  | 'swamp'
  | 'savannah'
  | 'light'
  | 'dark'
  | 'chaos'
  | 'space';

/**
 * Frozen snapshot emitted when Start Game is pressed.
 * Add new traits here so every future system reads one object.
 */
export type InitializedPlayer = {
  name: string;
  gender: Gender;
  baseCharacterId: string;
  hairColor: string;
  outfitColor: string;
  selectedRegion: RegionId;
};
