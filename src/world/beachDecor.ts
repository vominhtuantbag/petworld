import type { FieldState, MapZone, Rect } from './types';
import { pick, placeHazard, placeIn, zoneCtx } from './zoneDecor';

export type BeachDressing = { soft: Rect[]; solids: Rect[] };

export const BEACH_SAND = '#F4D03F';
export const BEACH_WET = '#E8C96A';
export const BEACH_WATER = '#40E0D0';

/** Leaning palms only come from the zoned hunting map and sit clear of the pads. */
export function beachNeedsDressing(field: FieldState): boolean {
  return (
    field.provinceId === 'beach' &&
    field.chunkSize > 0 &&
    field.tier >= 1 &&
    !field.blocks.some((rect) => rect.kind === 'leanpalm')
  );
}

export const BEACH_DENSITY = {
  resort: { sand: 16, shells: 28, chairs: 8, umbrellas: 8, palms: 12, seaweed: 6 },
  shallows: { wet: 10, water: 8, starfish: 18, sandbars: 6, shells: 10 },
  reefs: { rocks: 16, foam: 10, palms: 6, seaweed: 8 },
  surf: { water: 12, foam: 18, seaweed: 6 },
  dunes: { sand: 14, rocks: 8, huts: 5, shells: 8 },
  sunrays: 12,
  seagulls: 8,
  catnong: 6,
  vosoc: 6,
};

export const BEACH_HITBOX = {
  coastrock: { w: 90, h: 48 },
  leanpalm: { w: 42, h: 28 },
  tikihut: { w: 110, h: 56 },
};

const SHELL = ['#f6f1e7', '#e07a8a', '#f2d36b', '#c9e26a', '#8ec5e8'];

/**
 * Bãi Biển hunting map, dressed per hidden zone from `buildZones`:
 *
 * - 0 Sunny Sand & Resort Edge — golden sand, shells, chairs, umbrellas, palms.
 * - 1 Shallow Shell Shallows — wet sand, turquoise water, starfish, sandbars.
 * - 2 Wave-Washed Rocky Reefs — coastal rocks, foam, palms.
 * - 3 White Foam Surf Zone — deeper turquoise water and rolling foam.
 * - 4 Hermit Crab Dune Core — dry dunes, rocks, tiki hut frames.
 *
 * Cát nóng (catnong) and vỏ sò sắc (vosoc) are 8× hazards kept off every gate.
 */
export function generateBeach(zoneId: string, width: number, height: number, zones: readonly MapZone[]): BeachDressing {
  const ctx = zoneCtx(`${zoneId}:beach-map`, width, height, zones);
  const { rng } = ctx;
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const add = (bucket: Rect[], rect: Rect | null) => {
    if (rect) bucket.push(rect);
    return rect;
  };

  const resort = BEACH_DENSITY.resort;
  for (let index = 0; index < resort.sand; index += 1) {
    const w = 160 + rng() * 140;
    add(soft, placeIn(ctx, 0, { w, h: w * 0.4, kind: 'driesand', fill: BEACH_SAND }, false, false, 0.22));
  }
  for (let index = 0; index < resort.shells; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 22, h: 18, kind: 'seashell', fill: pick(rng, SHELL) }, false));
  }
  for (let index = 0; index < resort.chairs; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 40, h: 28, kind: 'beachchair', fill: '#e07a4a' }, false));
  }
  for (let index = 0; index < resort.umbrellas; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 54, h: 36, kind: 'umbrella', fill: index % 2 === 0 ? '#e85a5a' : '#3a8fd4' }, false));
  }
  for (let index = 0; index < resort.palms; index += 1) {
    const scale = 0.85 + rng() * 0.4;
    add(
      solids,
      placeIn(
        ctx,
        0,
        { w: BEACH_HITBOX.leanpalm.w * scale, h: BEACH_HITBOX.leanpalm.h * scale, kind: 'leanpalm', fill: '#2d6b3a' },
        true,
      ),
    );
  }
  for (let index = 0; index < resort.seaweed; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 48, h: 28, kind: 'seaweed', fill: '#3e6a32' }, false));
  }

  const shallows = BEACH_DENSITY.shallows;
  for (let index = 0; index < shallows.wet; index += 1) {
    const w = 180 + rng() * 140;
    add(soft, placeIn(ctx, 1, { w, h: w * 0.38, kind: 'wetsand', fill: BEACH_WET }, false));
  }
  for (let index = 0; index < shallows.water; index += 1) {
    const w = 200 + rng() * 160;
    add(soft, placeIn(ctx, 1, { w, h: w * 0.42, kind: 'shallow', fill: BEACH_WATER }, false));
  }
  for (let index = 0; index < shallows.starfish; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 28, h: 28, kind: 'starfish', fill: '#3a7ec8' }, false));
  }
  for (let index = 0; index < shallows.sandbars; index += 1) {
    const w = 160 + rng() * 100;
    add(soft, placeIn(ctx, 1, { w, h: w * 0.28, kind: 'driesand', fill: '#f0d98a' }, false));
  }
  for (let index = 0; index < shallows.shells; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 20, h: 16, kind: 'seashell', fill: pick(rng, SHELL) }, false));
  }

  const reefs = BEACH_DENSITY.reefs;
  for (let index = 0; index < reefs.rocks; index += 1) {
    const scale = 0.8 + rng() * 0.5;
    add(
      solids,
      placeIn(
        ctx,
        2,
        { w: BEACH_HITBOX.coastrock.w * scale, h: BEACH_HITBOX.coastrock.h * scale, kind: 'coastrock', fill: '#6a737a' },
        true,
      ),
    );
  }
  for (let index = 0; index < reefs.foam; index += 1) {
    const w = 180 + rng() * 140;
    add(soft, placeIn(ctx, 2, { w, h: w * 0.28, kind: 'foam', fill: '#FFFFFF' }, false, true));
  }
  for (let index = 0; index < reefs.palms; index += 1) {
    add(solids, placeIn(ctx, 2, { ...BEACH_HITBOX.leanpalm, kind: 'leanpalm', fill: '#2d6b3a' }, true));
  }
  for (let index = 0; index < reefs.seaweed; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 52, h: 30, kind: 'seaweed', fill: '#3e6a32' }, false));
  }

  const surf = BEACH_DENSITY.surf;
  for (let index = 0; index < surf.water; index += 1) {
    const w = 240 + rng() * 180;
    add(soft, placeIn(ctx, 3, { w, h: w * 0.4, kind: 'shallow', fill: '#2ec4b6' }, false));
  }
  for (let index = 0; index < surf.foam; index += 1) {
    const w = 200 + rng() * 160;
    add(soft, placeIn(ctx, 3, { w, h: w * 0.26, kind: 'foam', fill: '#FFFFFF' }, false, true));
  }
  for (let index = 0; index < surf.seaweed; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 48, h: 28, kind: 'seaweed', fill: '#2f5a2c' }, false));
  }

  const dunes = BEACH_DENSITY.dunes;
  for (let index = 0; index < dunes.sand; index += 1) {
    const w = 180 + rng() * 160;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.36, kind: 'driesand', fill: '#e8c45a' }, false));
  }
  for (let index = 0; index < dunes.rocks; index += 1) {
    add(solids, placeIn(ctx, 4, { ...BEACH_HITBOX.coastrock, kind: 'coastrock', fill: '#8C9298' }, true));
  }
  for (let index = 0; index < dunes.huts; index += 1) {
    add(solids, placeIn(ctx, 4, { ...BEACH_HITBOX.tikihut, kind: 'tikihut', fill: '#8a5a32' }, true));
  }
  for (let index = 0; index < dunes.shells; index += 1) {
    add(soft, placeIn(ctx, 4, { w: 22, h: 18, kind: 'seashell', fill: pick(rng, SHELL) }, false));
  }

  for (let index = 0; index < BEACH_DENSITY.catnong; index += 1) {
    add(soft, placeHazard(ctx, 'catnong', [0, 1, 4]));
  }
  for (let index = 0; index < BEACH_DENSITY.vosoc; index += 1) {
    add(soft, placeHazard(ctx, 'vosoc', [1, 2, 3]));
  }

  for (let index = 0; index < BEACH_DENSITY.sunrays; index += 1) {
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 70,
      h: 160,
      kind: 'sunray',
      fill: 'rgba(255, 244, 170, 0.16)',
    });
  }
  for (let index = 0; index < BEACH_DENSITY.seagulls; index += 1) {
    const left = rng() > 0.5;
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 70,
      h: 28,
      kind: 'seagull',
      fill: 'rgba(40, 44, 48, 0.28)',
      drift: { vx: left ? 70 : -70, vy: (rng() - 0.5) * 10 },
    });
  }

  return { soft, solids };
}
