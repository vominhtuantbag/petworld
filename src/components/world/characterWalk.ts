import type { ImageSourcePropType } from 'react-native';

import type { Gender } from '../../types/game';

/** Compass facing on the field. +Y is down on the map. */
export type WalkDir = 'up' | 'down' | 'left' | 'right';

type WalkPack = Record<WalkDir, readonly [ImageSourcePropType, ImageSourcePropType, ImageSourcePropType]>;

/**
 * Directional walk cycles under `assets/characters/{nam|nu}/{class}/`.
 * Frame order: plant → mid → plant (ping-pong uses 0→1→2→1).
 */
const WALK_PACKS: Partial<Record<string, Partial<Record<Gender, WalkPack>>>> = {
  wanderer: {
    male: {
      up: [
        require('../../../assets/characters/nam/langkhach/len1.png'),
        require('../../../assets/characters/nam/langkhach/len2.png'),
        require('../../../assets/characters/nam/langkhach/len3.png'),
      ],
      down: [
        require('../../../assets/characters/nam/langkhach/xuong1.png'),
        require('../../../assets/characters/nam/langkhach/xuong2.png'),
        require('../../../assets/characters/nam/langkhach/xuong3.png'),
      ],
      left: [
        require('../../../assets/characters/nam/langkhach/trai1.png'),
        require('../../../assets/characters/nam/langkhach/trai2.png'),
        require('../../../assets/characters/nam/langkhach/trai3.png'),
      ],
      right: [
        require('../../../assets/characters/nam/langkhach/phai1.png'),
        require('../../../assets/characters/nam/langkhach/phai2.png'),
        require('../../../assets/characters/nam/langkhach/phai3.png'),
      ],
    },
  },
};

export type WalkIdentity = {
  professionId: string;
  gender: Gender;
};

/** Frame sheets (Lãng Khách) or modular puppets (Đạo Chích nam). */
export function hasWalkPack(identity: WalkIdentity | null | undefined): boolean {
  if (!identity) return false;
  if (identity.professionId === 'rogue' && identity.gender === 'male') return true;
  return WALK_PACKS[identity.professionId]?.[identity.gender] != null;
}

export function isFrameWalkPack(identity: WalkIdentity | null | undefined): boolean {
  if (!identity) return false;
  return WALK_PACKS[identity.professionId]?.[identity.gender] != null;
}

export function walkSource(
  identity: WalkIdentity,
  dir: WalkDir,
  frame: 0 | 1 | 2,
): ImageSourcePropType | null {
  const pack = WALK_PACKS[identity.professionId]?.[identity.gender];
  if (!pack) return null;
  return pack[dir][frame];
}

/**
 * Ping-pong through the three painted frames, locked to the stride clock.
 * Idle holds the mid step so the pose stays planted.
 */
export function walkCycleFrame(phase: number, weight: number): 0 | 1 | 2 {
  if (weight < 0.12) return 1;
  const turn = ((phase / (Math.PI * 2)) % 1 + 1) % 1;
  const step = Math.floor(turn * 4) % 4;
  if (step === 0) return 0;
  if (step === 1) return 1;
  if (step === 2) return 2;
  return 1;
}
