import { hashString, mulberry32 } from './grid';
import type { FieldState, Rect } from './types';

/**
 * Swamp combat dressing for one sector. The same zone id always rebuilds
 * the same mud, trees, and fog.
 *
 * Tune the map here:
 * - `SWAMP_DENSITY` — how many of each prop a sector tries to place.
 * - `SWAMP_HITBOX` — collision size for mangroves, logs, and boulders.
 *   Drawings hang outside the box; widen these to stop the player sooner.
 * - `SWAMP_SLOW` — speed multiplier inside a mud pool. 0.7 is a light drag.
 *   Lower it to make the marsh stickier.
 *
 * Mangroves, logs, and mossy boulders are solid. Dry earth, mud, moss,
 * reeds, lilies, mushrooms, fog, fireflies, and bubbles are walked over.
 * The gate cross and the pad outside town stay empty of solids.
 */

export const SWAMP_GROUND = '#1e2a22';

/** Speed multiplier while standing in mud. */
export const SWAMP_SLOW = 0.7;

/** How many of each prop a 2048² swamp sector tries to place. */
export const SWAMP_DENSITY = {
  dryPatches: 14,
  mudPools: 7,
  moss: 16,
  mangroves: 8,
  logs: 6,
  boulders: 6,
  reedsPerPool: 5,
  liliesPerPool: 3,
  shrooms: 8,
  fog: 5,
  fireflies: 10,
  bubbles: 8,
};

/** Collision boxes. The canopy, roots, and moss cap are drawn larger. */
export const SWAMP_HITBOX = {
  mangrove: { w: 40, h: 32 },
  log: { w: 72, h: 24 },
  boulder: { w: 48, h: 32 },
};

const PATH_HALF = 96;
const SPAWN_CLEAR = 170;
const SHROOM_COLORS = ['#c4474a', '#7a4ea8', '#d4e07a', '#e07a3a'];

export type SwampDressing = {
  soft: Rect[];
  solids: Rect[];
};

export function generateSwamp(zoneId: string, width: number, height: number): SwampDressing {
  const rng = mulberry32(hashString(`${zoneId}:swamp`));
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const occupied: Rect[] = [];

  for (let index = 0; index < SWAMP_DENSITY.dryPatches; index += 1) {
    soft.push({
      x: rng() * (width - 180),
      y: rng() * (height - 100),
      w: 90 + rng() * 80,
      h: 36 + rng() * 22,
      kind: 'dry',
      label: index === 0 ? 'swamp-marsh-2' : undefined,
      fill: index % 2 === 0 ? '#a07848' : '#6e5434',
    });
  }

  for (let index = 0; index < SWAMP_DENSITY.mudPools; index += 1) {
    const pool = placePool(soft, occupied, width, height, rng);
    if (pool) ringPool(soft, occupied, width, height, rng, pool);
  }
  layOpening(soft, solids, occupied, width, height, rng);

  for (let index = 0; index < SWAMP_DENSITY.moss; index += 1) {
    place(soft, occupied, width, height, rng, {
      w: 20 + rng() * 16,
      h: 12,
      kind: 'moss',
      fill: rng() > 0.5 ? '#3d6a3a' : '#2a4a30',
    }, false);
  }

  const trunks: Rect[] = [];
  for (let index = 0; index < SWAMP_DENSITY.mangroves; index += 1) {
    const trunk = place(solids, occupied, width, height, rng, { ...SWAMP_HITBOX.mangrove, kind: 'mangrove', fill: '#1c3a24' }, true);
    if (trunk) trunks.push(trunk);
  }
  for (let index = 0; index < SWAMP_DENSITY.logs; index += 1) {
    place(solids, occupied, width, height, rng, { ...SWAMP_HITBOX.log, kind: 'log', fill: '#5c4030' }, true);
  }
  for (let index = 0; index < SWAMP_DENSITY.boulders; index += 1) {
    const scale = 0.8 + rng() * 0.45;
    place(solids, occupied, width, height, rng, {
      w: SWAMP_HITBOX.boulder.w * scale,
      h: SWAMP_HITBOX.boulder.h * scale,
      kind: 'boulder',
      fill: '#5d6a58',
    }, true);
  }

  for (let index = 0; index < SWAMP_DENSITY.shrooms; index += 1) {
    const trunk = trunks[index % Math.max(1, trunks.length)];
    place(soft, occupied, width, height, rng, {
      x: trunk ? trunk.x + (rng() > 0.5 ? trunk.w + 6 : -22) : undefined,
      y: trunk ? trunk.y + trunk.h - 8 : undefined,
      w: 16,
      h: 14,
      kind: 'shroom',
      fill: SHROOM_COLORS[Math.floor(rng() * SHROOM_COLORS.length)],
    }, false);
  }

  for (let index = 0; index < SWAMP_DENSITY.fog; index += 1) {
    soft.push({
      x: rng() * (width - 280),
      y: rng() * (height - 140),
      w: 180 + rng() * 120,
      h: 70 + rng() * 30,
      kind: 'fog',
      fill: 'rgba(188, 206, 176, 0.16)',
    });
  }

  for (let index = 0; index < SWAMP_DENSITY.fireflies; index += 1) {
    const angle = rng() * Math.PI * 2;
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 8,
      h: 8,
      kind: 'firefly',
      fill: '#e6f27a',
      drift: { vx: Math.cos(angle) * 16, vy: Math.sin(angle) * 12 },
    });
  }

  for (let index = 0; index < SWAMP_DENSITY.bubbles; index += 1) {
    soft.push({
      x: 40 + rng() * (width - 80),
      y: rng() * height,
      w: 8 + rng() * 6,
      h: 8 + rng() * 6,
      kind: 'bubble',
      fill: 'rgba(210, 230, 210, 0.7)',
      drift: { vx: (rng() - 0.5) * 8, vy: -(18 + rng() * 10) },
    });
  }

  return { soft, solids };
}

/** Generic swamp sectors had no marsh dressing. Rebuild those. */
export function swampNeedsDressing(field: FieldState): boolean {
  return field.provinceId === 'swamp' && field.chunkSize > 0 && !field.decor.some((rect) => rect.label === 'swamp-marsh-2');
}

function layOpening(soft: Rect[], solids: Rect[], occupied: Rect[], width: number, height: number, rng: () => number) {
  const pool = placePool(soft, occupied, width, height, rng, 520, height * 0.4);
  if (pool) ringPool(soft, occupied, width, height, rng, pool);
  place(solids, occupied, width, height, rng, {
    x: 360,
    y: height * 0.62,
    ...SWAMP_HITBOX.mangrove,
    kind: 'mangrove',
    fill: '#1c3a24',
  }, true);
  place(solids, occupied, width, height, rng, {
    x: 700,
    y: height * 0.62,
    ...SWAMP_HITBOX.log,
    kind: 'log',
    fill: '#6a4834',
  }, true);
  place(soft, occupied, width, height, rng, {
    x: 300,
    y: height * 0.4,
    w: 16,
    h: 14,
    kind: 'shroom',
    fill: '#d4e07a',
  }, false);
  for (let index = 0; index < 4; index += 1) {
    soft.push({
      x: 480 + rng() * 220,
      y: height * 0.36 + rng() * 80,
      w: 8,
      h: 8,
      kind: 'firefly',
      fill: '#e6f27a',
      drift: { vx: (rng() - 0.5) * 28, vy: (rng() - 0.5) * 20 },
    });
  }
}

function placePool(
  soft: Rect[],
  occupied: Rect[],
  width: number,
  height: number,
  rng: () => number,
  x?: number,
  y?: number,
): Rect | null {
  const rect = place(soft, occupied, width, height, rng, {
    x,
    y,
    w: 120 + rng() * 70,
    h: 64 + rng() * 28,
    kind: 'mud',
    fill: '#16343a',
    slow: SWAMP_SLOW,
  }, true);
  return rect;
}

function ringPool(soft: Rect[], occupied: Rect[], width: number, height: number, rng: () => number, pool: Rect) {
  for (let index = 0; index < SWAMP_DENSITY.reedsPerPool; index += 1) {
    const angle = (Math.PI * 2 * index) / SWAMP_DENSITY.reedsPerPool;
    place(soft, occupied, width, height, rng, {
      x: pool.x + pool.w / 2 + Math.cos(angle) * (pool.w * 0.42) - 8,
      y: pool.y + pool.h / 2 + Math.sin(angle) * (pool.h * 0.42) - 10,
      w: 16,
      h: 22,
      kind: 'reed',
      fill: '#6a5030',
    }, false);
  }
  for (let index = 0; index < SWAMP_DENSITY.liliesPerPool; index += 1) {
    place(soft, occupied, width, height, rng, {
      x: pool.x + 16 + rng() * (pool.w - 36),
      y: pool.y + 10 + rng() * (pool.h - 28),
      w: 16,
      h: 12,
      kind: 'lily',
      fill: rng() > 0.5 ? '#d7e7c4' : '#f2d0dc',
    }, false);
  }
}

type Prop = {
  x?: number;
  y?: number;
  w: number;
  h: number;
  kind: NonNullable<Rect['kind']>;
  fill: string;
  slow?: number;
};

function place(
  bucket: Rect[],
  occupied: Rect[],
  width: number,
  height: number,
  rng: () => number,
  prop: Prop,
  avoidGates: boolean,
): Rect | null {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const nudge = attempt * 24;
    const x = (prop.x ?? 110 + rng() * (width - prop.w - 220)) + (rng() - 0.5) * nudge;
    const y = (prop.y ?? 110 + rng() * (height - prop.h - 220)) + (rng() - 0.5) * nudge;
    const rect: Rect = { x, y, w: prop.w, h: prop.h, kind: prop.kind, fill: prop.fill, slow: prop.slow };
    if (x < 28 || y < 28 || x + prop.w > width - 28 || y + prop.h > height - 28) continue;
    if (avoidGates && blocksPath(rect, width, height)) continue;
    if (occupied.some((other) => overlaps(rect, other, 8))) continue;
    bucket.push(rect);
    occupied.push(rect);
    return rect;
  }
  return null;
}

function blocksPath(rect: Rect, width: number, height: number): boolean {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  if (Math.abs(cy - height / 2) < PATH_HALF) return true;
  if (Math.abs(cx - width / 2) < PATH_HALF) return true;
  return Math.hypot(cx - 180, cy - height / 2) < SPAWN_CLEAR;
}

function overlaps(a: Rect, b: Rect, pad: number): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}
