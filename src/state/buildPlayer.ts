import { findHair, findOutfit } from '../data/colors';
import { characterFor } from '../data/characters';
import { getRegion, isRegionPlayable } from '../data/regions';
import type { HairColorId, OutfitColorId } from '../data/colors';
import type { Gender, InitializedPlayer } from '../types/game';

export type SetupDraft = {
  name: string;
  professionId: string | null;
  gender: Gender | null;
  characterId: string | null;
  hairColorId: HairColorId;
  outfitColorId: OutfitColorId;
  regionId: string | null;
};

/**
 * The only place a draft becomes the object gameplay is allowed to trust.
 * Returns null until profession, gender, name, and a playable region are set.
 */
export function buildPlayer(draft: SetupDraft): InitializedPlayer | null {
  const name = draft.name.trim();
  const character = characterFor(draft.professionId, draft.gender);
  const region = getRegion(draft.regionId);
  if (!name || !draft.gender || !character || !isRegionPlayable(region)) {
    return null;
  }

  return {
    name,
    gender: draft.gender,
    baseCharacterId: character.id,
    hairColor: findHair(draft.hairColorId).hex,
    outfitColor: findOutfit(draft.outfitColorId).hex,
    selectedRegion: region.id,
  };
}
