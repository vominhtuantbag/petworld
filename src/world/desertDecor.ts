import { hashString, mulberry32 } from './grid';
import { placeHazards } from './hazards';
import { PLACE_TRIES, placementBlocked } from './spacing';
import type { FieldState, MapZone, Rect } from './types';
import { pick, placeHazard, placeIn, zoneCtx } from './zoneDecor';

/**
 * Desert dressing for one Sa Mạc map. The same zone id always rebuilds
 * the same dunes, rocks, oasis, and cactus.
 *
 * Solids (player and monsters cannot overlap): cồn cát, cụm đá, ốc đảo, xương rồng.
 * A new solid or hazard is moved when its picture would touch anything already placed.
 * Walked over: đất nứt nẻ (×0.90), cát lún (×0.80, −2 máu mỗi giây), cỏ rơm vàng.
 * Cracked earth and quicksand are 3× the png, trigger and picture together.
 * Plains water is not placed here. The gate pads stay outside those zones.
 *
 * Hunting maps use `generateDesertMap` (vector, 5 hidden zones) instead.
 */

export const DESERT_SAND = '#e8c98a';
export const DESERT_GOLD = '#E6B85C';
export const DESERT_OCHRE = '#D49A3A';
export const DESERT_SANDSTONE = '#B85D3B';
export const DESERT_OASIS = '#2E8B57';
export const DESERT_POOL = '#48C9B0';

/** How many of each prop a 2048² desert sector tries to place. Larger maps scale up. */
export const DESERT_DENSITY = {
  dunes: 5,
  rocks: 7,
  cactus: 9,
  oasis: 2,
  crack: 6,
  quicksand: 4,
  grass: 8,
};

/**
 * Collision boxes. Sprites hang outside these rects. Only this size
 * blocks the player and monsters, or applies a terrain slow.
 */
export const DESERT_HITBOX = {
  dune: { w: 220, h: 28 },
  rock: { w: 96, h: 22 },
  oasis: { w: 200, h: 78 },
  cactus: { w: 40, h: 16 },
  straw: { w: 150, h: 28 },
};

const PATH_HALF = 96;
const SPAWN_CLEAR = 170;
const MARKER = 'desert-vista-6';

export type DesertDressing = {
  soft: Rect[];
  solids: Rect[];
};

export function generateDesert(zoneId: string, width: number, height: number): DesertDressing {
  const rng = mulberry32(hashString(`${zoneId}:desert`));
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const occupied: Rect[] = [];
  const n = (base: number) => tally(base, width, height);

  scatter(solids, occupied, width, height, rng, n(DESERT_DENSITY.dunes), 'dune', DESERT_HITBOX.dune, true);
  scatter(solids, occupied, width, height, rng, n(DESERT_DENSITY.rocks), 'rock', DESERT_HITBOX.rock, true);
  scatter(solids, occupied, width, height, rng, n(DESERT_DENSITY.oasis), 'oasis', DESERT_HITBOX.oasis, true);
  scatter(solids, occupied, width, height, rng, n(DESERT_DENSITY.cactus), 'cactus', DESERT_HITBOX.cactus, true);
  scatter(soft, occupied, width, height, rng, n(DESERT_DENSITY.grass), 'straw', DESERT_HITBOX.straw, false);
  placeHazards(soft, occupied, width, height, rng, n(DESERT_DENSITY.crack), 'crack');
  placeHazards(soft, occupied, width, height, rng, n(DESERT_DENSITY.quicksand), 'quicksand');
  soft.push({ x: 0, y: 0, w: 1, h: 1, label: MARKER });

  return { soft, solids };
}

/** Saved desert maps that still use the old walkable dunes are rebuilt. */
export function desertNeedsDressing(field: FieldState): boolean {
  if (field.provinceId !== 'desert' || field.chunkSize <= 0) return false;
  if (field.tier >= 1 && (field.zones?.length ?? 0) >= 5) {
    return !field.blocks.some((rect) => rect.kind === 'oasispalm');
  }
  return !field.decor.some((rect) => rect.label === MARKER);
}

export const DESERT_MAP_DENSITY = {
  edge: { sand: 14, grass: 12, rocks: 8 },
  ridges: { stone: 12, scrub: 14, dunes: 8, rocks: 8 },
  oasis: { green: 10, pools: 8, palms: 16, scrub: 8 },
  dunes: { sand: 12, trails: 8, cacti: 14, dust: 10 },
  badlands: { stone: 12, dunes: 8, cacti: 10, dust: 8 },
  dust: 40,
  catlun_samac: 6,
  datnut_samac: 6,
};

export const DESERT_MAP_HITBOX = {
  desdune: { w: 180, h: 28 },
  sandridge: { w: 120, h: 36 },
  oasispalm: { w: 48, h: 20 },
  descactus: { w: 36, h: 16 },
  desrock: { w: 72, h: 28 },
};

const SAND = ['#E6B85C', '#D49A3A', '#e8c98a', '#c9a24e'];
const STONE = ['#B85D3B', '#a0522d', '#c4784a', '#8b4513'];

/**
 * Sa Mạc hunting map, dressed per hidden zone from `buildZones`:
 *
 * - 0 Sunlit Dune Edge — warm golden sand and sparse dry grass.
 * - 1 Sandstone Ridges & Scrubland — layered outcrops and desert scrub.
 * - 2 Oasis Palms & Greeneries — pools and palm groves.
 * - 3 Wind-Swept Dunes & Caravan Trails — wide sand and cacti.
 * - 4 Scorching Arid Badlands — harshest high-level zone.
 *
 * Cát lún (catlun_samac) and đất nứt (datnut_samac) are 8× hazards kept
 * off every gate.
 */
export function generateDesertMap(
  zoneId: string,
  width: number,
  height: number,
  zones: readonly MapZone[],
): DesertDressing {
  const ctx = zoneCtx(`${zoneId}:desert-map`, width, height, zones);
  const { rng } = ctx;
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const add = (bucket: Rect[], rect: Rect | null) => {
    if (rect) bucket.push(rect);
    return rect;
  };

  const edge = DESERT_MAP_DENSITY.edge;
  for (let index = 0; index < edge.sand; index += 1) {
    const w = 160 + rng() * 140;
    add(soft, placeIn(ctx, 0, { w, h: w * 0.36, kind: 'goldsand', fill: SAND[index % SAND.length] }, false, false, 0.22));
  }
  for (let index = 0; index < edge.grass; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 50 + rng() * 40, h: 18 + rng() * 10, kind: 'drygrass', fill: '#c9b06a' }, false));
  }
  for (let index = 0; index < edge.rocks; index += 1) {
    add(solids, placeIn(ctx, 0, { ...DESERT_MAP_HITBOX.desrock, kind: 'desrock', fill: '#a1887f' }, true));
  }

  const ridges = DESERT_MAP_DENSITY.ridges;
  for (let index = 0; index < ridges.stone; index += 1) {
    const w = 140 + rng() * 110;
    add(soft, placeIn(ctx, 1, { w, h: w * 0.34, kind: 'redstone', fill: STONE[index % STONE.length] }, false));
  }
  for (let index = 0; index < ridges.scrub; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 40 + rng() * 24, h: 28 + rng() * 12, kind: 'scrub', fill: '#8d6e4a' }, false));
  }
  for (let index = 0; index < ridges.dunes; index += 1) {
    add(solids, placeIn(ctx, 1, { ...DESERT_MAP_HITBOX.desdune, kind: 'desdune', fill: DESERT_OCHRE }, true));
  }
  for (let index = 0; index < ridges.rocks; index += 1) {
    add(solids, placeIn(ctx, 1, { ...DESERT_MAP_HITBOX.sandridge, kind: 'sandridge', fill: DESERT_SANDSTONE }, true));
  }

  const oasis = DESERT_MAP_DENSITY.oasis;
  for (let index = 0; index < oasis.green; index += 1) {
    const w = 140 + rng() * 100;
    add(soft, placeIn(ctx, 2, { w, h: w * 0.4, kind: 'oasisgreen', fill: DESERT_OASIS }, false));
  }
  for (let index = 0; index < oasis.pools; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 90 + rng() * 60, h: 48 + rng() * 24, kind: 'oasispool', fill: DESERT_POOL }, false));
  }
  for (let index = 0; index < oasis.palms; index += 1) {
    const scale = 0.85 + rng() * 0.35;
    add(
      solids,
      placeIn(
        ctx,
        2,
        {
          w: DESERT_MAP_HITBOX.oasispalm.w * scale,
          h: DESERT_MAP_HITBOX.oasispalm.h * scale,
          kind: 'oasispalm',
          fill: '#1b5e40',
        },
        true,
      ),
    );
  }
  for (let index = 0; index < oasis.scrub; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 36, h: 28, kind: 'scrub', fill: '#43a047' }, false));
  }

  const dunes = DESERT_MAP_DENSITY.dunes;
  for (let index = 0; index < dunes.sand; index += 1) {
    const w = 180 + rng() * 140;
    add(soft, placeIn(ctx, 3, { w, h: w * 0.32, kind: 'goldsand', fill: DESERT_GOLD }, false));
  }
  for (let index = 0; index < dunes.trails; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 220 + rng() * 140, h: 24 + rng() * 10, kind: 'caravantrail', fill: '#c9a06a' }, false));
  }
  for (let index = 0; index < dunes.cacti; index += 1) {
    add(solids, placeIn(ctx, 3, { ...DESERT_MAP_HITBOX.descactus, kind: 'descactus', fill: '#2e7d32' }, true));
  }
  for (let index = 0; index < dunes.dust; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 100, h: 80, kind: 'dustwisp', fill: 'rgba(230, 184, 92, 0.2)' }, false, true));
  }

  const bad = DESERT_MAP_DENSITY.badlands;
  for (let index = 0; index < bad.stone; index += 1) {
    const w = 160 + rng() * 120;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.36, kind: 'redstone', fill: '#8B4513' }, false));
  }
  for (let index = 0; index < bad.dunes; index += 1) {
    add(solids, placeIn(ctx, 4, { ...DESERT_MAP_HITBOX.desdune, kind: 'desdune', fill: '#b8860b' }, true));
  }
  for (let index = 0; index < bad.cacti; index += 1) {
    add(solids, placeIn(ctx, 4, { ...DESERT_MAP_HITBOX.descactus, kind: 'descactus', fill: '#1b5e20' }, true));
  }
  for (let index = 0; index < bad.dust; index += 1) {
    add(soft, placeIn(ctx, 4, { w: 120, h: 90, kind: 'dustwisp', fill: 'rgba(184, 93, 59, 0.22)' }, false, true));
  }

  for (let index = 0; index < DESERT_MAP_DENSITY.catlun_samac; index += 1) {
    add(soft, placeHazard(ctx, 'catlun_samac', [1, 3, 4]));
  }
  for (let index = 0; index < DESERT_MAP_DENSITY.datnut_samac; index += 1) {
    add(soft, placeHazard(ctx, 'datnut_samac', [2, 3, 4]));
  }

  for (let index = 0; index < DESERT_MAP_DENSITY.dust; index += 1) {
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 8 + rng() * 12,
      h: 6 + rng() * 10,
      kind: 'dustwisp',
      fill: pick(rng, ['rgba(230,184,92,0.35)', 'rgba(212,154,58,0.3)', 'rgba(255,236,179,0.25)']),
      drift: { vx: 12 + rng() * 18, vy: (rng() - 0.5) * 10 },
    });
  }

  return { soft, solids };
}

function tally(base: number, width: number, height: number): number {
  const span = Math.sqrt((width * height) / (2048 * 2048));
  return Math.max(base, Math.round(base * Math.min(4, Math.max(1, span))));
}

type Prop = {
  x?: number;
  y?: number;
  w: number;
  h: number;
  kind: NonNullable<Rect['kind']>;
  fill?: string;
  slow?: number;
  label?: string;
};

function scatter(
  bucket: Rect[],
  occupied: Rect[],
  width: number,
  height: number,
  rng: () => number,
  count: number,
  kind: NonNullable<Rect['kind']>,
  box: { w: number; h: number },
  avoidGates: boolean,
  extra?: { slow?: number; label?: string },
) {
  for (let index = 0; index < count; index += 1) {
    const scale = 0.86 + rng() * 0.32;
    place(bucket, occupied, width, height, rng, {
      w: box.w * scale,
      h: box.h * scale,
      kind,
      slow: extra?.slow,
      label: index === 0 ? extra?.label : undefined,
    }, avoidGates);
  }
}

function place(
  bucket: Rect[],
  occupied: Rect[],
  width: number,
  height: number,
  rng: () => number,
  prop: Prop,
  avoidGates: boolean,
) {
  for (let attempt = 0; attempt < PLACE_TRIES; attempt += 1) {
    const nudge = attempt * 26;
    const x = (prop.x ?? 100 + rng() * (width - prop.w - 200)) + (rng() - 0.5) * nudge;
    const y = (prop.y ?? 100 + rng() * (height - prop.h - 200)) + (rng() - 0.5) * nudge;
    const rect: Rect = {
      x,
      y,
      w: prop.w,
      h: prop.h,
      kind: prop.kind,
      fill: prop.fill,
      slow: prop.slow,
      label: prop.label,
    };
    if (x < 28 || y < 28 || x + prop.w > width - 28 || y + prop.h > height - 28) continue;
    if (avoidGates && blocksPath(rect, width, height)) continue;
    if (occupied.some((other) => placementBlocked(rect, other, 'desert'))) continue;
    bucket.push(rect);
    occupied.push(rect);
    return;
  }
}

function blocksPath(rect: Rect, width: number, height: number): boolean {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  if (Math.abs(cy - height / 2) < PATH_HALF) return true;
  if (Math.abs(cx - width / 2) < PATH_HALF) return true;
  return Math.hypot(cx - 180, cy - height / 2) < SPAWN_CLEAR;
}

