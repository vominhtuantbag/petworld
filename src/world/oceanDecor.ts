import type { FieldState, MapZone, Rect } from './types';
import { pick, placeHazard, placeIn, zoneCtx } from './zoneDecor';

/**
 * Đại Dương dressing for one hunting map. The same zone id always rebuilds
 * the same sea. Props follow the five hidden zones from `buildZones`:
 *
 * - 0 Coral Shallows — pastel coral clusters and sandbars by the harbor.
 * - 1 Swaying Kelp Forest — dense dark-green kelp patches.
 * - 2 Rocky Reefs & Shipwreck — jagged sea rocks and one mossy wreck (solid).
 * - 3 Misty Currents — drifting mist banks and rising bubble clusters.
 * - 4 Bioluminescent Abyss — neon cyan/purple coral and sunken ruins (solid).
 *
 * Whirlpools and sharp reefs are scattered on open water, kept off every gate.
 * Zone borders are never drawn. Water color is a screen gradient along `depthAxis`.
 */

export const OCEAN_SHALLOW = '#40E0D0';
export const OCEAN_MID = '#1E90FF';
export const OCEAN_ABYSS = '#0B2545';

export const OCEAN_DENSITY = {
  coral: 18,
  sandbars: 6,
  kelp: 26,
  searocks: 14,
  mist: 9,
  bubbles: 12,
  glowcoral: 20,
  ruins: 4,
  whirlpools: 5,
  reefs: 5,
};

/** Collision boxes. Rocks, the wreck, and ruins are drawn a little taller than the box. */
export const OCEAN_HITBOX = {
  searock: { w: 70, h: 44 },
  wreck: { w: 260, h: 92 },
  ruin: { w: 120, h: 70 },
};

const PASTEL = ['#ffb3c7', '#ffd59e', '#c7b8ff', '#a8f0d8', '#ffc9a8'];
const GLOW = ['#38f5ff', '#b46bff', '#5effc8', '#e070ff'];

export type OceanDressing = { soft: Rect[]; solids: Rect[] };

export function generateOcean(zoneId: string, width: number, height: number, zones: readonly MapZone[]): OceanDressing {
  const ctx = zoneCtx(`${zoneId}:ocean`, width, height, zones);
  const { rng } = ctx;
  const soft: Rect[] = [];
  const solids: Rect[] = [];

  for (let index = 0; index < OCEAN_DENSITY.sandbars; index += 1) {
    const w = 220 + rng() * 160;
    const rect = placeIn(ctx, 0, { w, h: w * 0.32, kind: 'sandbar', fill: '#f2e2b4' }, false);
    if (rect) soft.push(rect);
  }
  for (let index = 0; index < OCEAN_DENSITY.coral; index += 1) {
    const size = 46 + rng() * 34;
    const rect = placeIn(ctx, 0, { w: size, h: size * 0.8, kind: 'coral', fill: pick(rng, PASTEL) }, false);
    if (rect) soft.push(rect);
  }

  for (let index = 0; index < OCEAN_DENSITY.kelp; index += 1) {
    const w = 70 + rng() * 60;
    const rect = placeIn(ctx, 1, { w, h: w * 1.2, kind: 'kelp', fill: index % 3 === 0 ? '#1f5a3a' : '#174a30' }, false);
    if (rect) soft.push(rect);
  }

  const wreck = placeIn(ctx, 2, { ...OCEAN_HITBOX.wreck, kind: 'wreck', fill: '#6a4a30' }, true);
  if (wreck) solids.push(wreck);
  for (let index = 0; index < OCEAN_DENSITY.searocks; index += 1) {
    const scale = 0.8 + rng() * 0.6;
    const rect = placeIn(ctx, 2, {
      w: OCEAN_HITBOX.searock.w * scale,
      h: OCEAN_HITBOX.searock.h * scale,
      kind: 'searock',
      fill: '#4c5a66',
    }, true);
    if (rect) solids.push(rect);
  }

  for (let index = 0; index < OCEAN_DENSITY.mist; index += 1) {
    const w = 320 + rng() * 260;
    const rect = placeIn(ctx, 3, { w, h: w * 0.34, kind: 'seamist', fill: 'rgba(214, 236, 255, 0.16)' }, false, true);
    if (rect) soft.push(rect);
  }
  for (let index = 0; index < OCEAN_DENSITY.bubbles; index += 1) {
    const rect = placeIn(ctx, 3, { w: 48, h: 120, kind: 'seabubble', fill: 'rgba(225, 245, 255, 0.75)' }, false, true);
    if (rect) soft.push(rect);
  }

  for (let index = 0; index < OCEAN_DENSITY.glowcoral; index += 1) {
    const size = 50 + rng() * 40;
    const rect = placeIn(ctx, 4, { w: size, h: size * 0.85, kind: 'glowcoral', fill: pick(rng, GLOW) }, false);
    if (rect) soft.push(rect);
  }
  for (let index = 0; index < OCEAN_DENSITY.ruins; index += 1) {
    const rect = placeIn(ctx, 4, { ...OCEAN_HITBOX.ruin, kind: 'ruin', fill: '#3a4a6a' }, true);
    if (rect) solids.push(rect);
  }

  for (let index = 0; index < OCEAN_DENSITY.whirlpools; index += 1) {
    const rect = placeHazard(ctx, 'whirlpool');
    if (rect) soft.push(rect);
  }
  for (let index = 0; index < OCEAN_DENSITY.reefs; index += 1) {
    const rect = placeHazard(ctx, 'reef');
    if (rect) soft.push(rect);
  }

  return { soft, solids };
}

/** Older ocean maps used the generic scatter. Sea rocks only come from this dressing and sit clear of the pads. */
export function oceanNeedsDressing(field: FieldState): boolean {
  return field.provinceId === 'ocean' && field.chunkSize > 0 && !field.blocks.some((rect) => rect.kind === 'searock');
}
