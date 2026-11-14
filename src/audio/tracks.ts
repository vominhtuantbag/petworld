/**
 * Overworld BGM catalog for Game Thư Giãn.
 *
 * Drop mastered loops at `assets/audio/bgm/<key>_overworld.mp3`.
 * Metro needs a static require path — do not build paths dynamically.
 *
 * Audio keys map onto game `RegionId`s in `bgmRegions.ts`.
 */
import type { BgmRegionKey } from './bgmRegions';

/** Default overworld bed level (0–1). Keep low so SFX can sit on top. */
export const OVERWORLD_BGM_DEFAULT_VOLUME = 0.45;

/** @deprecated Prefer OVERWORLD_BGM_DEFAULT_VOLUME. */
export const PLAINS_OVERWORLD_BGM_DEFAULT_VOLUME = OVERWORLD_BGM_DEFAULT_VOLUME;

/** Regional overworld beds — all MP3. */
export const OVERWORLD_BGM_SOURCES = {
  plains: require('../../assets/audio/bgm/plains_overworld.mp3'),
  mountain: require('../../assets/audio/bgm/mountain_overworld.mp3'),
  forest: require('../../assets/audio/bgm/forest_overworld.mp3'),
  swamp: require('../../assets/audio/bgm/swamp_overworld.mp3'),
  beach: require('../../assets/audio/bgm/beach_overworld.mp3'),
  ocean: require('../../assets/audio/bgm/ocean_overworld.mp3'),
  frost: require('../../assets/audio/bgm/frost_overworld.mp3'),
  savannah: require('../../assets/audio/bgm/savannah_overworld.mp3'),
  volcano: require('../../assets/audio/bgm/volcano_overworld.mp3'),
  desert: require('../../assets/audio/bgm/desert_overworld.mp3'),
  darkness: require('../../assets/audio/bgm/darkness_overworld.mp3'),
  light: require('../../assets/audio/bgm/light_overworld.mp3'),
  heaven: require('../../assets/audio/bgm/heaven_overworld.mp3'),
  hell: require('../../assets/audio/bgm/hell_overworld.mp3'),
  chaos: require('../../assets/audio/bgm/chaos_overworld.mp3'),
  cosmic: require('../../assets/audio/bgm/cosmic_overworld.mp3'),
} as const satisfies Record<BgmRegionKey, number>;

export type OverworldBgmSource = (typeof OVERWORLD_BGM_SOURCES)[BgmRegionKey];

/** @deprecated Plains-only path — use OVERWORLD_BGM_SOURCES.plains. */
export const PLAINS_OVERWORLD_BGM = OVERWORLD_BGM_SOURCES.plains;
export const PLAINS_OVERWORLD_BGM_ID = 'plains_overworld_bgm' as const;
