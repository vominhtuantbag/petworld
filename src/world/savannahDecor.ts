import { hashString, mulberry32 } from './grid';
import type { FieldState, MapZone, Rect } from './types';
import { placeHazard, placeIn, zoneCtx } from './zoneDecor';

export type SavannahDressing = { soft: Rect[]; solids: Rect[] };

/** Temperate edge near town → golden plains → dry apex. */
export const SAVANNAH_TEMP = '#8BC34A';
export const SAVANNAH_GRASS = '#c9a24e';
export const SAVANNAH_OCHRE = '#B8860B';
export const SAVANNAH_EARTH = '#A67C52';

/** Flat-top acacias mark a dressed hunting map and sit clear of the pads. */
export function savannahNeedsDressing(field: FieldState): boolean {
  return (
    field.provinceId === 'savannah' &&
    field.chunkSize > 0 &&
    field.tier >= 1 &&
    !field.blocks.some((rect) => rect.kind === 'savacacia')
  );
}

export const SAVANNAH_DENSITY = {
  edge: { temp: 14, mounds: 10, flowers: 16, rocks: 6 },
  streams: { gold: 8, streams: 10, stones: 14, grass: 12 },
  plains: { gold: 12, acacias: 18, earth: 10, shimmer: 8 },
  reeds: { reeds: 16, gold: 8, wind: 10, rocks: 8 },
  apex: { earth: 12, acacias: 10, shimmer: 10, rocks: 8 },
  shimmer: 40,
  giothaonguyen: 6,
  datnutthaonguyen: 6,
};

export const SAVANNAH_HITBOX = {
  savacacia: { w: 72, h: 36 },
  savrock: { w: 56, h: 32 },
};

const GOLD = ['#c9a24e', '#d4b05a', '#b8923a', '#a67c2e'];
const GREEN = ['#8BC34A', '#9CCC65', '#7CB342', '#AED581'];

/**
 * Sparse acacia plain for non-zoned / sector fallbacks. Counts stay fixed
 * when the map grows so a 10× hunting map does not plant ten times the trees.
 */
export function generateSavannah(zoneId: string, width: number, height: number): SavannahDressing {
  const rng = mulberry32(hashString(`${zoneId}:savannah`));
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  for (let index = 0; index < 6; index += 1) {
    soft.push({
      x: -80,
      y: (height / 6) * index,
      w: width + 160,
      h: 90,
      kind: 'light',
      fill: index % 2 === 0 ? 'rgba(255, 214, 120, 0.28)' : 'rgba(120, 90, 30, 0.12)',
    });
  }
  for (let index = 0; index < 36; index += 1) {
    soft.push({
      x: 80 + rng() * (width - 200),
      y: 80 + rng() * (height - 200),
      w: 28 + rng() * 40,
      h: 14 + rng() * 12,
      kind: 'grass',
      fill: rng() > 0.5 ? 'rgba(196, 168, 64, 0.7)' : 'rgba(90, 120, 48, 0.55)',
    });
  }
  for (let index = 0; index < 14; index += 1) {
    solids.push({
      x: 100 + rng() * (width - 260),
      y: 100 + rng() * (height - 260),
      w: SAVANNAH_HITBOX.savacacia.w,
      h: SAVANNAH_HITBOX.savacacia.h,
      kind: 'acacia',
      fill: rng() > 0.4 ? '#6f8f3a' : '#8aa64a',
    });
  }
  for (let index = 0; index < 8; index += 1) {
    solids.push({
      x: 100 + rng() * (width - 260),
      y: 100 + rng() * (height - 260),
      w: SAVANNAH_HITBOX.savrock.w,
      h: SAVANNAH_HITBOX.savrock.h,
      kind: 'rock',
      fill: rng() > 0.5 ? '#b08968' : '#8c6a4a',
    });
  }
  return { soft, solids };
}

/**
 * Thảo Nguyên hunting map, dressed per hidden zone from `buildZones`:
 *
 * - 0 Temperate Grass Edge — lush green grass and gentle mounds.
 * - 1 Breezy Grasslands & Shallow Streams — tall grass, clear streams, flat stones.
 * - 2 Acacia Savanna Plains — golden grass and flat-topped acacias.
 * - 3 Gale Reeds & Tall Grasslands — reeds and wide ambush wind banks.
 * - 4 Harsh Savanna Apex Core — dry earth, heat shimmer, apex predators.
 *
 * Gió thảo nguyên (giothaonguyen) and đất nứt (datnutthaonguyen) are 8×
 * hazards kept off every gate.
 */
export function generateSavannahMap(
  zoneId: string,
  width: number,
  height: number,
  zones: readonly MapZone[],
): SavannahDressing {
  const ctx = zoneCtx(`${zoneId}:savannah-map`, width, height, zones);
  const { rng } = ctx;
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const add = (bucket: Rect[], rect: Rect | null) => {
    if (rect) bucket.push(rect);
    return rect;
  };

  const edge = SAVANNAH_DENSITY.edge;
  for (let index = 0; index < edge.temp; index += 1) {
    const w = 160 + rng() * 140;
    add(soft, placeIn(ctx, 0, { w, h: w * 0.38, kind: 'tempgrass', fill: GREEN[(index + 1) % GREEN.length] }, false, false, 0.22));
  }
  for (let index = 0; index < edge.mounds; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 70 + rng() * 50, h: 28 + rng() * 12, kind: 'mound', fill: '#9CCC65' }, false));
  }
  for (let index = 0; index < edge.flowers; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 18, h: 16, kind: 'tempgrass', fill: '#FFF59D' }, false));
  }
  for (let index = 0; index < edge.rocks; index += 1) {
    add(solids, placeIn(ctx, 0, { ...SAVANNAH_HITBOX.savrock, kind: 'savrock', fill: '#a1887f' }, true));
  }

  const streams = SAVANNAH_DENSITY.streams;
  for (let index = 0; index < streams.gold; index += 1) {
    const w = 140 + rng() * 100;
    add(soft, placeIn(ctx, 1, { w, h: w * 0.36, kind: 'goldgrass', fill: GOLD[index % GOLD.length] }, false));
  }
  for (let index = 0; index < streams.streams; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 180 + rng() * 120, h: 28 + rng() * 10, kind: 'savstream', fill: '#64B5F6' }, false));
  }
  for (let index = 0; index < streams.stones; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 36 + rng() * 20, h: 22 + rng() * 10, kind: 'flatstone', fill: '#b0bec5' }, false));
  }
  for (let index = 0; index < streams.grass; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 50 + rng() * 40, h: 20 + rng() * 10, kind: 'goldgrass', fill: '#AED581' }, false));
  }

  const plains = SAVANNAH_DENSITY.plains;
  for (let index = 0; index < plains.gold; index += 1) {
    const w = 180 + rng() * 140;
    add(soft, placeIn(ctx, 2, { w, h: w * 0.4, kind: 'goldgrass', fill: SAVANNAH_GRASS }, false));
  }
  for (let index = 0; index < plains.acacias; index += 1) {
    const scale = 0.85 + rng() * 0.35;
    add(
      solids,
      placeIn(
        ctx,
        2,
        {
          w: SAVANNAH_HITBOX.savacacia.w * scale,
          h: SAVANNAH_HITBOX.savacacia.h * scale,
          kind: 'savacacia',
          fill: rng() > 0.4 ? '#6f8f3a' : '#8aa64a',
        },
        true,
      ),
    );
  }
  for (let index = 0; index < plains.earth; index += 1) {
    const w = 120 + rng() * 90;
    add(soft, placeIn(ctx, 2, { w, h: w * 0.35, kind: 'dryearth', fill: SAVANNAH_EARTH }, false));
  }
  for (let index = 0; index < plains.shimmer; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 80, h: 100, kind: 'heatshimmer', fill: 'rgba(255, 224, 130, 0.18)' }, false, true));
  }

  const reeds = SAVANNAH_DENSITY.reeds;
  for (let index = 0; index < reeds.reeds; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 40 + rng() * 24, h: 48 + rng() * 20, kind: 'savreed', fill: '#9e9d24' }, false));
  }
  for (let index = 0; index < reeds.gold; index += 1) {
    const w = 160 + rng() * 120;
    add(soft, placeIn(ctx, 3, { w, h: w * 0.34, kind: 'goldgrass', fill: '#b89a3a' }, false));
  }
  for (let index = 0; index < reeds.wind; index += 1) {
    const w = 260 + rng() * 180;
    add(soft, placeIn(ctx, 3, { w, h: w * 0.26, kind: 'heatshimmer', fill: 'rgba(255, 236, 179, 0.16)' }, false, true));
  }
  for (let index = 0; index < reeds.rocks; index += 1) {
    add(solids, placeIn(ctx, 3, { ...SAVANNAH_HITBOX.savrock, kind: 'savrock', fill: '#8d6e63' }, true));
  }

  const apex = SAVANNAH_DENSITY.apex;
  for (let index = 0; index < apex.earth; index += 1) {
    const w = 160 + rng() * 120;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.38, kind: 'dryearth', fill: '#8d6e4a' }, false));
  }
  for (let index = 0; index < apex.acacias; index += 1) {
    add(solids, placeIn(ctx, 4, { ...SAVANNAH_HITBOX.savacacia, kind: 'savacacia', fill: '#558b2f' }, true));
  }
  for (let index = 0; index < apex.shimmer; index += 1) {
    add(soft, placeIn(ctx, 4, { w: 90, h: 130, kind: 'heatshimmer', fill: 'rgba(255, 193, 7, 0.2)' }, false, true));
  }
  for (let index = 0; index < apex.rocks; index += 1) {
    add(solids, placeIn(ctx, 4, { ...SAVANNAH_HITBOX.savrock, kind: 'savrock', fill: '#6d4c41' }, true));
  }

  for (let index = 0; index < SAVANNAH_DENSITY.giothaonguyen; index += 1) {
    add(soft, placeHazard(ctx, 'giothaonguyen', [1, 3, 4]));
  }
  for (let index = 0; index < SAVANNAH_DENSITY.datnutthaonguyen; index += 1) {
    add(soft, placeHazard(ctx, 'datnutthaonguyen', [2, 3, 4]));
  }

  for (let index = 0; index < SAVANNAH_DENSITY.shimmer; index += 1) {
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 10 + rng() * 14,
      h: 8 + rng() * 10,
      kind: 'heatshimmer',
      fill: 'rgba(255, 236, 179, 0.22)',
      drift: { vx: (rng() - 0.5) * 22, vy: -8 - rng() * 12 },
    });
  }

  return { soft, solids };
}
