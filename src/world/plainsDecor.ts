import { hashString, mulberry32 } from './grid';
import { placeHazards } from './hazards';
import { PLACE_TRIES, placementBlocked } from './spacing';
import type { FieldState, MapZone, Rect } from './types';
import { pick, placeHazard, placeIn, zoneCtx } from './zoneDecor';

/**
 * Plains combat dressing for one sector.
 *
 * The same zone id always rebuilds the same meadow. Tune the look here:
 * - `PLAINS_DENSITY` — how many flower clusters, tufts, puddles, and interior obstacles.
 * - `PLAINS_BORDER` — pine and boulder wall inset from each edge. Raise `depth`
 *   or `TREE_W` / `ROCK_W` when the forest should block a wider path.
 * The far sky and mountain band is not drawn. The meadow uses the full viewport.
 *
 * Flowers, grass bushes, grass patches, mushrooms, and water are walked over.
 * Water (`vungnuoc`) is 3× the png. Standing in it is ×0.85 speed and −2 thể lực each second.
 * Trees, single rocks, and rock piles are solids. Their rect is the footprint
 * at the base, smaller than the painted sprite. A new solid or puddle is moved
 * when that picture would touch a tree, rock, flower, or another puddle.
 * A cross through the middle, plus the pad outside town, stays empty so the
 * gates are never walled off.
 */

export const PLAINS_GRASS = '#7ad44a';
export const PLAINS_MEADOW = '#7CB342';
export const PLAINS_DAMP = '#66BB6A';
export const PLAINS_DEEP = '#43A047';
export const PLAINS_SUN = '#FFF59D';

/**
 * How far the backdrop drifts compared with the meadow.
 * 0 stays glued to the screen. 1 scrolls as fast as the player.
 */
export const PLAINS_PARALLAX = {
  clouds: 0.08,
  mountains: 0.16,
  forest: 0.4,
};

/** How many of each prop a 2048² plains sector tries to place. */
export const PLAINS_DENSITY = {
  grassPatches: 18,
  bushes: 14,
  flowerPatches: 16,
  flowersPerPatch: 5,
  mushrooms: 12,
  puddles: 6,
  treeClusters: 5,
  treesPerCluster: 2,
  rocks: 8,
  piles: 6,
};

/**
 * Edge wall. `depth` is how far trunks and boulders sit in from the rim.
 * The painted mountains are the far view; these rects are what actually stop
 * the player and the monsters.
 */
export const PLAINS_BORDER = {
  depth: 78,
  treeStep: 96,
  rockStep: 230,
};

/**
 * Footprints. These match the trunk row, the rock base, and the water
 * oval in the pngs. The painted sprite is wider and taller than the box.
 */
const TREE_W = 108;
const TREE_H = 18;
const ROCK_W = 58;
const ROCK_H = 16;
const PILE_W = 118;
const PILE_H = 20;
const PATH_HALF = 96;
const SPAWN_CLEAR = 170;

const FLOWER_COLORS = ['#ff4f93', '#ff77b0', '#e23b86', '#ff9ac4', '#f06292'];
const PINE_COLORS = ['#143d22', '#1b5230', '#0f301c', '#24663a'];

export type PlainsDressing = {
  soft: Rect[];
  solids: Rect[];
};

export function generatePlains(zoneId: string, width: number, height: number): PlainsDressing {
  const rng = mulberry32(hashString(`${zoneId}:plains`));
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const occupied: Rect[] = [];

  // Sunlight falls in long diagonal bands. These are decor only.
  for (let band = 0; band < 8; band += 1) {
    soft.push({
      x: -120,
      y: (height / 8) * band - 30,
      w: width + 240,
      h: 128,
      kind: 'light',
      label: band === 0 ? 'plains-vista-8' : undefined,
      fill: band % 2 === 0 ? 'rgba(255, 236, 150, 0.42)' : 'rgba(24, 110, 32, 0.2)',
    });
  }

  for (let index = 0; index < PLAINS_DENSITY.grassPatches; index += 1) {
    const grassW = 96 + rng() * 24;
    place(soft, occupied, width, height, rng, {
      w: grassW,
      h: grassW * (202 / 426),
      kind: 'grass',
      fill: '#7ad44a',
    }, false);
  }

  for (let index = 0; index < PLAINS_DENSITY.bushes; index += 1) {
    place(soft, occupied, width, height, rng, {
      w: 50,
      h: 44,
      kind: 'bush',
      fill: '#3c8f45',
    }, false);
  }

  for (let index = 0; index < PLAINS_DENSITY.mushrooms; index += 1) {
    place(soft, occupied, width, height, rng, {
      w: 50,
      h: 44,
      kind: 'shroom',
      fill: '#d4543c',
    }, false);
  }

  for (let patch = 0; patch < PLAINS_DENSITY.flowerPatches; patch += 1) {
    const originX = margin(width, rng);
    const originY = margin(height, rng);
    plantFlowers(soft, occupied, width, height, rng, originX, originY);
  }

  // Extra clusters across the middle of the meadow, where the camera usually sits.
  for (let patch = 0; patch < 10; patch += 1) {
    plantFlowers(soft, occupied, width, height, rng, 260 + rng() * (width - 520), height * 0.36 + rng() * height * 0.28);
  }

  layBorder(solids, occupied, width, height);

  for (let cluster = 0; cluster < PLAINS_DENSITY.treeClusters; cluster += 1) {
    const originX = margin(width, rng);
    const originY = margin(height, rng);
    for (let tree = 0; tree < PLAINS_DENSITY.treesPerCluster; tree += 1) {
      place(solids, occupied, width, height, rng, {
        x: originX + (rng() - 0.5) * 110,
        y: originY + (rng() - 0.5) * 80,
        w: TREE_W,
        h: TREE_H,
        kind: 'tree',
        fill: PINE_COLORS[Math.floor(rng() * PINE_COLORS.length)],
      },
      true,
    );
    }
  }

  for (let index = 0; index < PLAINS_DENSITY.rocks; index += 1) {
    const scale = 0.85 + rng() * 0.4;
    place(solids, occupied, width, height, rng, {
      w: ROCK_W * scale,
      h: ROCK_H * scale,
      kind: 'rock',
      fill: '#8d97a3',
    }, true);
  }

  for (let index = 0; index < PLAINS_DENSITY.piles; index += 1) {
    const scale = 0.9 + rng() * 0.35;
    place(solids, occupied, width, height, rng, {
      w: PILE_W * scale,
      h: PILE_H * scale,
      kind: 'pile',
      fill: '#7c868f',
    }, true);
  }

  const span = Math.sqrt((width * height) / (2048 * 2048));
  const puddles = Math.max(PLAINS_DENSITY.puddles, Math.round(PLAINS_DENSITY.puddles * Math.min(4, Math.max(1, span))));
  placeHazards(soft, occupied, width, height, rng, puddles, 'puddle');

  return { soft, solids };
}

function plantFlowers(soft: Rect[], occupied: Rect[], width: number, height: number, rng: () => number, originX: number, originY: number) {
  for (let bloom = 0; bloom < PLAINS_DENSITY.flowersPerPatch; bloom += 1) {
    place(
      soft,
      occupied,
      width,
      height,
      rng,
      {
        x: originX + (rng() - 0.5) * 90,
        y: originY + (rng() - 0.5) * 56,
        w: 52,
        h: 46,
        kind: 'flower',
        fill: FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)],
      },
      false,
    );
  }
}

/**
 * Pines on every rim, boulders just inside them. The gate cross is skipped
 * so sector exits and the town pad stay open.
 */
function layBorder(solids: Rect[], occupied: Rect[], width: number, height: number) {
  const edge = PLAINS_BORDER.depth;
  const span = Math.max(width, height);
  // A 2048px edge keeps the base step. The 10× hunting maps would otherwise
  // plant a trunk every 54px and flood collision.
  const treeStep = Math.max(PLAINS_BORDER.treeStep, Math.round(span / 40));
  const rockStep = Math.max(PLAINS_BORDER.rockStep, Math.round(span / 28));
  for (let x = 12; x < width - TREE_W - 12; x += treeStep) {
    addSolid(solids, occupied, width, height, {
      x,
      y: 22,
      w: TREE_W,
      h: TREE_H,
      kind: 'tree',
      fill: PINE_COLORS[(x / treeStep) % PINE_COLORS.length | 0],
    });
    addSolid(solids, occupied, width, height, {
      x,
      y: height - 22 - TREE_H,
      w: TREE_W,
      h: TREE_H,
      kind: 'tree',
      fill: PINE_COLORS[((x / treeStep) + 1) % PINE_COLORS.length | 0],
    });
  }
  for (let y = edge; y < height - edge; y += treeStep) {
    addSolid(solids, occupied, width, height, {
      x: 16,
      y,
      w: TREE_W,
      h: TREE_H,
      kind: 'tree',
      fill: PINE_COLORS[(y / treeStep) % PINE_COLORS.length | 0],
    });
    addSolid(solids, occupied, width, height, {
      x: width - 16 - TREE_W,
      y,
      w: TREE_W,
      h: TREE_H,
      kind: 'tree',
      fill: PINE_COLORS[((y / treeStep) + 2) % PINE_COLORS.length | 0],
    });
  }
  for (let x = 160; x < width - 160; x += rockStep) {
    addSolid(solids, occupied, width, height, { x, y: edge + 8, w: ROCK_W, h: ROCK_H, kind: 'rock', fill: '#8b949e' });
    addSolid(solids, occupied, width, height, {
      x: x + 40,
      y: height - edge - ROCK_H - 8,
      w: ROCK_W * 0.9,
      h: ROCK_H * 0.9,
      kind: 'rock',
      fill: '#6e7884',
    });
  }
  for (let y = 200; y < height - 200; y += rockStep) {
    addSolid(solids, occupied, width, height, { x: edge + 6, y, w: ROCK_W * 0.85, h: ROCK_H, kind: 'rock', fill: '#9aa3ad' });
    addSolid(solids, occupied, width, height, {
      x: width - edge - ROCK_W,
      y: y + 24,
      w: ROCK_W,
      h: ROCK_H * 0.85,
      kind: 'rock',
      fill: '#7c868f',
    });
  }
}

type Prop = { x?: number; y?: number; w: number; h: number; kind: NonNullable<Rect['kind']>; fill: string };

function addSolid(solids: Rect[], occupied: Rect[], width: number, height: number, prop: Prop) {
  const rect: Rect = { x: prop.x ?? 0, y: prop.y ?? 0, w: prop.w, h: prop.h, kind: prop.kind, fill: prop.fill };
  if (rect.x < 8 || rect.y < 8 || rect.x + rect.w > width - 8 || rect.y + rect.h > height - 8) return;
  if (blocksPath(rect, width, height)) return;
  if (occupied.some((other) => placementBlocked(rect, other, 'plains'))) return;
  solids.push(rect);
  occupied.push(rect);
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
    const nudge = attempt * 22;
    const x = (prop.x ?? 90 + rng() * (width - prop.w - 180)) + (rng() - 0.5) * nudge;
    const y = (prop.y ?? 90 + rng() * (height - prop.h - 180)) + (rng() - 0.5) * nudge;
    const rect: Rect = { x, y, w: prop.w, h: prop.h, kind: prop.kind, fill: prop.fill };
    if (x < 24 || y < 24 || x + prop.w > width - 24 || y + prop.h > height - 24) continue;
    if (avoidGates && blocksPath(rect, width, height)) continue;
    if (occupied.some((other) => placementBlocked(rect, other, 'plains'))) continue;
    bucket.push(rect);
    occupied.push(rect);
    return;
  }
}

function blocksPath(rect: Rect, width: number, height: number): boolean {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const midX = width / 2;
  const midY = height / 2;
  if (Math.abs(cy - midY) < PATH_HALF) return true;
  if (Math.abs(cx - midX) < PATH_HALF) return true;
  return Math.hypot(cx - 180, cy - midY) < SPAWN_CLEAR;
}

function margin(size: number, rng: () => number): number {
  return 160 + rng() * (size - 320);
}

/** Saved meadows from before this vista have no marker band. Rebuild those. */
export function plainsNeedsVista(field: FieldState): boolean {
  if (field.provinceId !== 'plains' || field.chunkSize <= 0) return false;
  if (field.tier >= 1 && (field.zones?.length ?? 0) >= 5) {
    return !field.blocks.some((rect) => rect.kind === 'plmtree');
  }
  return !field.decor.some((rect) => rect.label === 'plains-vista-8');
}

export const PLAINS_MAP_DENSITY = {
  meadow: { grass: 14, flowers: 16, rocks: 6 },
  stream: { damp: 10, reeds: 12, streams: 8, bushes: 8 },
  mounds: { hills: 12, grass: 8, rocks: 10, trees: 8 },
  thicket: { tall: 14, bushes: 12, flowers: 8, glow: 8 },
  deep: { grass: 12, trees: 12, bushes: 10, hills: 8 },
  glow: 36,
  bunlay_dongbang: 6,
  buigai_dongbang: 6,
};

export const PLAINS_MAP_HITBOX = {
  plmtree: { w: 72, h: 20 },
  plmrock: { w: 56, h: 24 },
  plmbush: { w: 44, h: 22 },
};

const GREEN = ['#7CB342', '#8BC34A', '#66BB6A', '#9CCC65'];
const FLOWER = ['#ff4f93', '#ff77b0', '#fff59d', '#81d4fa', '#ce93d8'];

/**
 * Đồng Bằng hunting map, dressed per hidden zone from `buildZones`:
 *
 * - 0 Sunlit Morning Meadow — fresh green grass and wildflowers.
 * - 1 Damp Stream & Reed Banks — damp grass and waterside edges.
 * - 2 Rolling Grass Mounds — gentle hills and low stones.
 * - 3 Tall Grass & Thicket Plains — taller grass and denser bushes.
 * - 4 Deep Great Plains — farthest high-level expanse.
 *
 * Bùn lầy (bunlay_dongbang) and bụi gai (buigai_dongbang) are 8× hazards
 * kept off every gate.
 */
export function generatePlainsMap(
  zoneId: string,
  width: number,
  height: number,
  zones: readonly MapZone[],
): PlainsDressing {
  const ctx = zoneCtx(`${zoneId}:plains-map`, width, height, zones);
  const { rng } = ctx;
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const add = (bucket: Rect[], rect: Rect | null) => {
    if (rect) bucket.push(rect);
    return rect;
  };

  const meadow = PLAINS_MAP_DENSITY.meadow;
  for (let index = 0; index < meadow.grass; index += 1) {
    const w = 160 + rng() * 140;
    add(soft, placeIn(ctx, 0, { w, h: w * 0.36, kind: 'meadow', fill: GREEN[index % GREEN.length] }, false, false, 0.22));
  }
  for (let index = 0; index < meadow.flowers; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 22, h: 18, kind: 'flowerbed', fill: pick(rng, FLOWER) }, false));
  }
  for (let index = 0; index < meadow.rocks; index += 1) {
    add(solids, placeIn(ctx, 0, { ...PLAINS_MAP_HITBOX.plmrock, kind: 'plmrock', fill: '#90a4ae' }, true));
  }

  const stream = PLAINS_MAP_DENSITY.stream;
  for (let index = 0; index < stream.damp; index += 1) {
    const w = 140 + rng() * 100;
    add(soft, placeIn(ctx, 1, { w, h: w * 0.38, kind: 'damppatch', fill: PLAINS_DAMP }, false));
  }
  for (let index = 0; index < stream.reeds; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 36 + rng() * 20, h: 44 + rng() * 16, kind: 'reed', fill: '#9e9d24' }, false));
  }
  for (let index = 0; index < stream.streams; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 180 + rng() * 120, h: 28 + rng() * 10, kind: 'stream', fill: '#64B5F6' }, false));
  }
  for (let index = 0; index < stream.bushes; index += 1) {
    add(solids, placeIn(ctx, 1, { ...PLAINS_MAP_HITBOX.plmbush, kind: 'plmbush', fill: '#558b2f' }, true));
  }

  const mounds = PLAINS_MAP_DENSITY.mounds;
  for (let index = 0; index < mounds.hills; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 100 + rng() * 80, h: 36 + rng() * 16, kind: 'hillock', fill: '#8BC34A' }, false));
  }
  for (let index = 0; index < mounds.grass; index += 1) {
    const w = 140 + rng() * 100;
    add(soft, placeIn(ctx, 2, { w, h: w * 0.34, kind: 'meadow', fill: PLAINS_MEADOW }, false));
  }
  for (let index = 0; index < mounds.rocks; index += 1) {
    add(solids, placeIn(ctx, 2, { ...PLAINS_MAP_HITBOX.plmrock, kind: 'plmrock', fill: '#78909c' }, true));
  }
  for (let index = 0; index < mounds.trees; index += 1) {
    const scale = 0.85 + rng() * 0.35;
    add(
      solids,
      placeIn(
        ctx,
        2,
        {
          w: PLAINS_MAP_HITBOX.plmtree.w * scale,
          h: PLAINS_MAP_HITBOX.plmtree.h * scale,
          kind: 'plmtree',
          fill: '#2e7d32',
        },
        true,
      ),
    );
  }

  const thicket = PLAINS_MAP_DENSITY.thicket;
  for (let index = 0; index < thicket.tall; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 70 + rng() * 50, h: 40 + rng() * 20, kind: 'thicketgrass', fill: '#558b2f' }, false));
  }
  for (let index = 0; index < thicket.bushes; index += 1) {
    add(solids, placeIn(ctx, 3, { ...PLAINS_MAP_HITBOX.plmbush, kind: 'plmbush', fill: '#33691e' }, true));
  }
  for (let index = 0; index < thicket.flowers; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 20, h: 16, kind: 'flowerbed', fill: pick(rng, FLOWER) }, false));
  }
  for (let index = 0; index < thicket.glow; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 80, h: 100, kind: 'dawnglow', fill: 'rgba(255, 245, 157, 0.18)' }, false, true));
  }

  const deep = PLAINS_MAP_DENSITY.deep;
  for (let index = 0; index < deep.grass; index += 1) {
    const w = 160 + rng() * 120;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.36, kind: 'meadow', fill: PLAINS_DEEP }, false));
  }
  for (let index = 0; index < deep.trees; index += 1) {
    add(solids, placeIn(ctx, 4, { ...PLAINS_MAP_HITBOX.plmtree, kind: 'plmtree', fill: '#1b5e20' }, true));
  }
  for (let index = 0; index < deep.bushes; index += 1) {
    add(solids, placeIn(ctx, 4, { ...PLAINS_MAP_HITBOX.plmbush, kind: 'plmbush', fill: '#33691e' }, true));
  }
  for (let index = 0; index < deep.hills; index += 1) {
    add(soft, placeIn(ctx, 4, { w: 120 + rng() * 80, h: 40, kind: 'hillock', fill: '#689f38' }, false));
  }

  for (let index = 0; index < PLAINS_MAP_DENSITY.bunlay_dongbang; index += 1) {
    add(soft, placeHazard(ctx, 'bunlay_dongbang', [1, 3, 4]));
  }
  for (let index = 0; index < PLAINS_MAP_DENSITY.buigai_dongbang; index += 1) {
    add(soft, placeHazard(ctx, 'buigai_dongbang', [2, 3, 4]));
  }

  for (let index = 0; index < PLAINS_MAP_DENSITY.glow; index += 1) {
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 10 + rng() * 14,
      h: 8 + rng() * 12,
      kind: 'dawnglow',
      fill: 'rgba(255, 245, 157, 0.28)',
      drift: { vx: (rng() - 0.5) * 10, vy: -6 - rng() * 10 },
    });
  }

  return { soft, solids };
}

/** True when a monster body would be standing inside a solid prop. */
export function hitsSolid(x: number, y: number, radius: number, blocks: Rect[]): boolean {
  return blocks.some((block) => x > block.x - radius && x < block.x + block.w + radius && y > block.y - radius && y < block.y + block.h + radius);
}
