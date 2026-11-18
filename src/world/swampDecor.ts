import { hashString, mulberry32 } from './grid';
import type { FieldState, MapZone, Rect } from './types';
import { pick, placeHazard, placeIn, zoneCtx } from './zoneDecor';

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

/** Generic swamp sectors had no marsh dressing, and older hunting maps had no zones. Rebuild those. */
export function swampNeedsDressing(field: FieldState): boolean {
  if (field.provinceId !== 'swamp' || field.chunkSize <= 0) return false;
  // Cypress solids only come from the zoned map and always sit clear of the pads.
  if (field.tier >= 1) return !field.blocks.some((rect) => rect.kind === 'cypress');
  return !field.decor.some((rect) => rect.label === 'swamp-marsh-2');
}

/** Terrain ramp from the town gate to the core: damp mud, moss, olive pools, black mud. */
export const SWAMP_MUD = '#5C4B3B';
export const SWAMP_MOSS = '#2E473B';
export const SWAMP_OLIVE = '#4A5D3F';
export const SWAMP_CORE = '#232924';
/** How many of each prop the 10× hunting map tries to place, per zone. */
export const SWAMP_MAP_DENSITY = {
  edge: { dry: 14, cattails: 34, tallreeds: 16, pools: 4, lilies: 22, duckweed: 14 },
  mudflats: { pools: 9, sunkenlogs: 9, logs: 10, boulders: 10, duckweed: 12, bubbles: 8 },
  maze: { cypress: 36, shrooms: 12, tallreeds: 8, pools: 3 },
  grove: { fog: 14, shrooms: 30, cypress: 10, pools: 4, bubbles: 6 },
  core: { pools: 8, bones: 10, ruins: 5, cypress: 6, fog: 6, shrooms: 8 },
  fireflies: 48,
  dragonflies: 16,
  bunlay: 6,
  khidoc: 6,
};

/** Collision boxes for the hunting map. Canopies, roots, and vines hang outside. */
export const SWAMP_MAP_HITBOX = {
  cypress: { w: 60, h: 44 },
  log: { w: 110, h: 34 },
  boulder: { w: 64, h: 42 },
  vineruin: { w: 130, h: 70 },
};

const PASTEL_LILY = ['#f6c6d8', '#fbe3a8', '#d9c8f6', '#f2f2f2'];
const GLOW_SHROOM = ['#b46bff', '#38e0ff', '#d07bff', '#5ef0e0'];
const PLANK_W = 34;

/**
 * Đầm Lầy hunting map, dressed per hidden zone from `buildZones`:
 *
 * - 0 Cattail Marsh Edge — dry earth by the gate, cattails, reeds, lilies.
 * - 1 Rotting Log Mudflats — olive pools linked by plank bridges, sunken logs,
 *   solid logs and mossy boulders.
 * - 2 Mangrove Root Maze — dense twisted cypress with roots and vines.
 * - 3 Foggy Toxic Grove — thick fog banks and glowing mushroom clusters.
 * - 4 Dark Abyssal Core — black mud pools, old bones, vine-covered ruins.
 *
 * Fireflies and dragonflies drift across the whole marsh. Deep mud (bunlay)
 * and toxic gas (khidoc) are 8× hazards kept off every gate.
 */
export function generateSwampMap(zoneId: string, width: number, height: number, zones: readonly MapZone[]): SwampDressing {
  const ctx = zoneCtx(`${zoneId}:swamp-map`, width, height, zones);
  const { rng } = ctx;
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const add = (bucket: Rect[], rect: Rect | null) => {
    if (rect) bucket.push(rect);
    return rect;
  };
  const pools = (zone: number, count: number, fill: string) => {
    const placed: Rect[] = [];
    for (let index = 0; index < count; index += 1) {
      const w = 200 + rng() * 160;
      const pool = add(soft, placeIn(ctx, zone, { w, h: w * (0.5 + rng() * 0.2), kind: 'swamppool', fill }, false));
      if (pool) placed.push(pool);
    }
    return placed;
  };
  const near = (rect: Rect, dx: number, dy: number) => ({ x: rect.x + rect.w / 2 + dx, y: rect.y + rect.h / 2 + dy });

  const edge = SWAMP_MAP_DENSITY.edge;
  for (let index = 0; index < edge.dry; index += 1) {
    const w = 120 + rng() * 120;
    add(soft, placeIn(ctx, 0, { w, h: w * 0.4, kind: 'dry', fill: index % 2 === 0 ? '#8a6a44' : '#6e5434' }, false, false, 0.22));
  }
  const edgePools = pools(0, edge.pools, SWAMP_OLIVE);
  for (let index = 0; index < edge.lilies; index += 1) {
    const pool = edgePools[index % Math.max(1, edgePools.length)];
    const at = pool ? near(pool, (rng() - 0.5) * pool.w * 0.6, (rng() - 0.5) * pool.h * 0.5) : undefined;
    add(soft, placeIn(ctx, 0, { w: 34, h: 26, kind: 'waterlily', fill: pick(rng, PASTEL_LILY), at }, false, true));
  }
  for (let index = 0; index < edge.cattails; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 34, h: 70, kind: 'cattail' }, false));
  }
  for (let index = 0; index < edge.tallreeds; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 90, h: 80, kind: 'tallreed' }, false));
  }
  for (let index = 0; index < edge.duckweed; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 60 + rng() * 40, h: 30 + rng() * 16, kind: 'duckweed' }, false, true));
  }

  const flats = SWAMP_MAP_DENSITY.mudflats;
  const flatPools = pools(1, flats.pools, SWAMP_OLIVE);
  for (const plank of boardwalk(flatPools)) {
    soft.push(plank);
    ctx.occupied.push(plank);
  }
  for (let index = 0; index < flats.sunkenlogs; index += 1) {
    const pool = flatPools[index % Math.max(1, flatPools.length)];
    if (!pool) break;
    add(soft, placeIn(ctx, 1, { w: pool.w * 0.4, h: 26, kind: 'sunkenlog', at: near(pool, (rng() - 0.5) * pool.w * 0.3, (rng() - 0.5) * pool.h * 0.3) }, false, true));
  }
  for (let index = 0; index < flats.bubbles; index += 1) {
    const pool = flatPools[index % Math.max(1, flatPools.length)];
    if (!pool) break;
    add(soft, placeIn(ctx, 1, { w: 44, h: 90, kind: 'gasbubble', at: near(pool, (rng() - 0.5) * pool.w * 0.4, 0) }, false, true));
  }
  for (let index = 0; index < flats.logs; index += 1) {
    add(solids, placeIn(ctx, 1, { ...SWAMP_MAP_HITBOX.log, kind: 'log', fill: '#5c4030' }, true));
  }
  for (let index = 0; index < flats.boulders; index += 1) {
    const scale = 0.8 + rng() * 0.5;
    add(solids, placeIn(ctx, 1, { w: SWAMP_MAP_HITBOX.boulder.w * scale, h: SWAMP_MAP_HITBOX.boulder.h * scale, kind: 'boulder', fill: '#5d6a58' }, true));
  }
  for (let index = 0; index < flats.duckweed; index += 1) {
    const pool = flatPools[index % Math.max(1, flatPools.length)];
    const at = pool ? near(pool, (rng() - 0.5) * pool.w * 0.5, (rng() - 0.5) * pool.h * 0.4) : undefined;
    add(soft, placeIn(ctx, 1, { w: 60 + rng() * 30, h: 30, kind: 'duckweed', at }, false, true));
  }

  const trees = (zone: number, count: number) => {
    const placed: Rect[] = [];
    for (let index = 0; index < count; index += 1) {
      const scale = 0.85 + rng() * 0.35;
      const tree = add(solids, placeIn(ctx, zone, { w: SWAMP_MAP_HITBOX.cypress.w * scale, h: SWAMP_MAP_HITBOX.cypress.h * scale, kind: 'cypress', fill: '#1c3a24' }, true));
      if (tree) placed.push(tree);
    }
    return placed;
  };
  const shrooms = (zone: number, count: number, roots: readonly Rect[]) => {
    for (let index = 0; index < count; index += 1) {
      const root = roots.length > 0 && index % 2 === 0 ? roots[index % roots.length] : undefined;
      const at = root ? { x: root.x + (rng() > 0.5 ? root.w + 18 : -18), y: root.y + root.h - 6 } : undefined;
      add(soft, placeIn(ctx, zone, { w: 30, h: 28, kind: 'glowshroom', fill: pick(rng, GLOW_SHROOM), at }, false));
    }
  };
  const fog = (zone: number, count: number) => {
    for (let index = 0; index < count; index += 1) {
      const w = 340 + rng() * 260;
      add(soft, placeIn(ctx, zone, { w, h: w * 0.32, kind: 'swampfog', fill: 'rgba(196, 214, 184, 0.16)' }, false, true));
    }
  };

  const maze = SWAMP_MAP_DENSITY.maze;
  pools(2, maze.pools, SWAMP_OLIVE);
  const mazeTrees = trees(2, maze.cypress);
  shrooms(2, maze.shrooms, mazeTrees);
  for (let index = 0; index < maze.tallreeds; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 90, h: 80, kind: 'tallreed' }, false));
  }

  const grove = SWAMP_MAP_DENSITY.grove;
  const grovePools = pools(3, grove.pools, '#3c4a34');
  for (let index = 0; index < grove.bubbles; index += 1) {
    const pool = grovePools[index % Math.max(1, grovePools.length)];
    if (!pool) break;
    add(soft, placeIn(ctx, 3, { w: 44, h: 90, kind: 'gasbubble', at: near(pool, (rng() - 0.5) * pool.w * 0.4, 0) }, false, true));
  }
  const groveTrees = trees(3, grove.cypress);
  shrooms(3, grove.shrooms, groveTrees);
  fog(3, grove.fog);

  const core = SWAMP_MAP_DENSITY.core;
  pools(4, core.pools, SWAMP_CORE);
  for (let index = 0; index < core.ruins; index += 1) {
    add(solids, placeIn(ctx, 4, { ...SWAMP_MAP_HITBOX.vineruin, kind: 'vineruin', fill: '#4a4f48' }, true));
  }
  for (let index = 0; index < core.bones; index += 1) {
    add(soft, placeIn(ctx, 4, { w: 70, h: 40, kind: 'bones' }, false));
  }
  const coreTrees = trees(4, core.cypress);
  shrooms(4, core.shrooms, coreTrees);
  fog(4, core.fog);

  for (let index = 0; index < SWAMP_MAP_DENSITY.bunlay; index += 1) {
    add(soft, placeHazard(ctx, 'bunlay', [1, 2, 4]));
  }
  for (let index = 0; index < SWAMP_MAP_DENSITY.khidoc; index += 1) {
    add(soft, placeHazard(ctx, 'khidoc', [2, 3, 4]));
  }

  for (let index = 0; index < SWAMP_MAP_DENSITY.fireflies; index += 1) {
    const angle = rng() * Math.PI * 2;
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 10,
      h: 10,
      kind: 'firefly',
      fill: index % 4 === 0 ? '#9ef7ff' : '#e6f27a',
      drift: { vx: Math.cos(angle) * 14, vy: Math.sin(angle) * 10 },
    });
  }
  for (let index = 0; index < SWAMP_MAP_DENSITY.dragonflies; index += 1) {
    const angle = rng() * Math.PI * 2;
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 40,
      h: 30,
      kind: 'dragonfly',
      fill: index % 2 === 0 ? '#3aa0c8' : '#6ac87a',
      drift: { vx: Math.cos(angle) * 60, vy: Math.sin(angle) * 40 },
    });
  }

  return { soft, solids };
}

/**
 * Decayed boardwalk between neighboring pools: one horizontal and one
 * vertical run per link, so each plank stays an axis-aligned rect.
 */
function boardwalk(pools: readonly Rect[]): Rect[] {
  const planks: Rect[] = [];
  const order = [...pools].sort((a, b) => a.x - b.x);
  for (let index = 1; index < order.length; index += 1) {
    const a = order[index - 1]!;
    const b = order[index]!;
    const ax = a.x + a.w / 2;
    const ay = a.y + a.h / 2;
    const bx = b.x + b.w / 2;
    const by = b.y + b.h / 2;
    if (Math.hypot(bx - ax, by - ay) > 1100) continue;
    const left = Math.min(ax, bx);
    planks.push({ x: left, y: ay - PLANK_W / 2, w: Math.abs(bx - ax) + PLANK_W / 2, h: PLANK_W, kind: 'plank', fill: '#7a5a3a' });
    const top = Math.min(ay, by);
    if (Math.abs(by - ay) > PLANK_W) {
      planks.push({ x: bx - PLANK_W / 2, y: top, w: PLANK_W, h: Math.abs(by - ay), kind: 'plank', fill: '#7a5a3a' });
    }
  }
  return planks;
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
