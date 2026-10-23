import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import { HAIR_COLORS, OUTFIT_COLORS, findHair, findOutfit, type HairColorId, type OutfitColorId } from '../data/colors';
import { characterFor, getCharacter, getProfession, type CharacterDefinition, type ProfessionDefinition } from '../data/characters';
import { getRegion, isRegionPlayable, type RegionDefinition } from '../data/regions';
import type { Gender, InitializedPlayer, SetupStep } from '../types/game';
import { buildPlayer, type SetupDraft } from './buildPlayer';

/**
 * Setup state for character creation, then the starting region.
 *
 * Screens read this context. Presentational components (avatar, cards,
 * swatches) stay unaware of it so they can be reused in gameplay later.
 *
 * "Chọn vùng" stays off until the name, profession, and gender are set.
 * "Vào game" stays off until an available region is chosen too. Those
 * rules live here, not in the buttons.
 */

type SetupState = SetupDraft & {
  step: SetupStep;
  player: InitializedPlayer | null;
};

type Action =
  | { type: 'set-name'; name: string }
  | { type: 'select-profession'; professionId: string }
  | { type: 'select-gender'; gender: Gender }
  | { type: 'set-hair'; colorId: HairColorId }
  | { type: 'set-outfit'; colorId: OutfitColorId }
  | { type: 'select-region'; regionId: string }
  | { type: 'go-character' }
  | { type: 'go-region' }
  | { type: 'commit-start'; player: InitializedPlayer }
  | { type: 'edit-setup' }
  | { type: 'apply-saved'; player: InitializedPlayer; draft: SetupDraft }
  | { type: 'reset' };

const INITIAL_STATE: SetupState = {
  name: '',
  professionId: null,
  gender: null,
  characterId: null,
  hairColorId: 'brown',
  outfitColorId: 'forest',
  regionId: null,
  step: 'character',
  player: null,
};

function withBody(state: SetupState, professionId: string | null, gender: Gender | null, keepColors: boolean): SetupState {
  const character = characterFor(professionId, gender);
  if (!character) {
    return { ...state, professionId, gender, characterId: null };
  }
  return {
    ...state,
    professionId,
    gender,
    characterId: character.id,
    hairColorId: keepColors ? state.hairColorId : character.defaultHairId,
    outfitColorId: keepColors ? state.outfitColorId : character.defaultOutfitId,
  };
}

function reducer(state: SetupState, action: Action): SetupState {
  switch (action.type) {
    case 'set-name':
      return { ...state, name: action.name };
    case 'select-profession': {
      const profession = getProfession(action.professionId);
      if (!profession || profession.id === state.professionId) return state;
      const next = withBody(state, profession.id, state.gender, false);
      if (next.characterId) return next;
      return {
        ...next,
        hairColorId: profession.male.defaultHairId,
        outfitColorId: profession.male.defaultOutfitId,
      };
    }
    case 'select-gender':
      if (action.gender === state.gender) return state;
      return withBody(state, state.professionId, action.gender, true);
    case 'set-hair':
      return { ...state, hairColorId: action.colorId };
    case 'set-outfit':
      return { ...state, outfitColorId: action.colorId };
    case 'select-region': {
      const region = getRegion(action.regionId);
      if (!isRegionPlayable(region)) return state;
      return { ...state, regionId: region.id };
    }
    case 'go-character':
      return { ...state, step: 'character' };
    case 'go-region':
      if (!state.name.trim() || !characterFor(state.professionId, state.gender)) return state;
      return { ...state, step: 'region' };
    case 'commit-start':
      return { ...state, step: 'gameplay', player: action.player };
    case 'edit-setup':
      return { ...state, step: 'character', player: null };
    case 'apply-saved':
      return { ...action.draft, step: 'gameplay', player: action.player };
    case 'reset':
      return INITIAL_STATE;
    default:
      return state;
  }
}

type SetupContextValue = {
  name: string;
  step: SetupStep;
  profession: ProfessionDefinition | null;
  gender: Gender | null;
  character: CharacterDefinition | null;
  region: RegionDefinition | null;
  hairColorId: HairColorId;
  outfitColorId: OutfitColorId;
  hairHex: string;
  outfitHex: string;
  hairLabel: string;
  outfitLabel: string;
  player: InitializedPlayer | null;
  canPickGender: boolean;
  canPickName: boolean;
  canContinue: boolean;
  canStart: boolean;
  setName: (name: string) => void;
  selectProfession: (professionId: string) => void;
  selectGender: (gender: Gender) => void;
  setHairColor: (colorId: HairColorId) => void;
  setOutfitColor: (colorId: OutfitColorId) => void;
  selectRegion: (regionId: string) => void;
  goToCharacter: () => void;
  goToRegion: () => void;
  startGame: () => void;
  editSetup: () => void;
  buildSnapshot: () => InitializedPlayer | null;
  applySavedPlayer: (player: InitializedPlayer) => void;
  resetSetup: () => void;
};

const SetupContext = createContext<SetupContextValue | null>(null);

export function SetupProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const character = characterFor(state.professionId, state.gender);
  const profession = getProfession(state.professionId);
  const region = getRegion(state.regionId);
  const hair = findHair(state.hairColorId);
  const outfit = findOutfit(state.outfitColorId);

  const canPickGender = profession !== null;
  const canPickName = character !== null;
  const canContinue = state.name.trim().length > 0 && character !== null;
  const canStart = buildPlayer(state) !== null;

  const startGame = useCallback(() => {
    const player = buildPlayer(state);
    if (!player) return;
    console.log('[Game Thư Giãn] Initialized player state', player);
    dispatch({ type: 'commit-start', player });
  }, [state]);

  const value = useMemo<SetupContextValue>(
    () => ({
      name: state.name,
      step: state.step,
      profession,
      gender: state.gender,
      character,
      region,
      hairColorId: state.hairColorId,
      outfitColorId: state.outfitColorId,
      hairHex: hair.hex,
      outfitHex: outfit.hex,
      hairLabel: hair.label,
      outfitLabel: outfit.label,
      player: state.player,
      canPickGender,
      canPickName,
      canContinue,
      canStart,
      setName: (name) => dispatch({ type: 'set-name', name }),
      selectProfession: (professionId) => dispatch({ type: 'select-profession', professionId }),
      selectGender: (gender) => dispatch({ type: 'select-gender', gender }),
      setHairColor: (colorId) => dispatch({ type: 'set-hair', colorId }),
      setOutfitColor: (colorId) => dispatch({ type: 'set-outfit', colorId }),
      selectRegion: (regionId) => dispatch({ type: 'select-region', regionId }),
      goToCharacter: () => dispatch({ type: 'go-character' }),
      goToRegion: () => dispatch({ type: 'go-region' }),
      startGame,
      editSetup: () => dispatch({ type: 'edit-setup' }),
      buildSnapshot: () => buildPlayer(state),
      applySavedPlayer: (player) => {
        const saved = getCharacter(player.baseCharacterId);
        const region = getRegion(player.selectedRegion);
        if (!saved || !region) return;
        const body = characterFor(saved.professionId, player.gender) ?? saved;
        dispatch({
          type: 'apply-saved',
          player,
          draft: {
            name: player.name,
            professionId: saved.professionId,
            gender: player.gender,
            characterId: body.id,
            hairColorId: colorId(HAIR_COLORS, player.hairColor, body.defaultHairId),
            outfitColorId: colorId(OUTFIT_COLORS, player.outfitColor, body.defaultOutfitId),
            regionId: region.id,
          },
        });
      },
      resetSetup: () => dispatch({ type: 'reset' }),
    }),
    [
      state.name,
      state.step,
      state.gender,
      state.hairColorId,
      state.outfitColorId,
      state.player,
      profession,
      character,
      region,
      hair.hex,
      hair.label,
      outfit.hex,
      outfit.label,
      canPickGender,
      canPickName,
      canContinue,
      canStart,
      startGame,
    ],
  );

  return <SetupContext.Provider value={value}>{children}</SetupContext.Provider>;
}

function colorId<T extends { id: string; hex: string }>(list: readonly T[], hex: string, fallback: T['id']): T['id'] {
  return list.find((item) => item.hex.toLowerCase() === hex.toLowerCase())?.id ?? fallback;
}

export function useSetup(): SetupContextValue {
  const value = useContext(SetupContext);
  if (!value) {
    throw new Error('useSetup must be used within SetupProvider');
  }
  return value;
}
