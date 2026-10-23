import { hashString, mulberry32 } from './grid';
import { placeHazards } from './hazards';
import { PLACE_TRIES, placementBlocked } from './spacing';
import type { FieldState, Rect } from './types';

/**
 * Plains combat dressing for one sector.
 *
 * The same zone id always rebuilds the same meadow. Tune the look here:
 * - `PLAINS_DENSITY` — how many flower clusters, tufts, puddles, and interior obstacles.
 * - `PLAINS_BORDER` — pine and boulder wall inset from each edge. Raise `depth`
 *   or `TREE_W` / `ROCK_W` when the forest should block a wider path.
 * - `PLAINS_HORIZON` — share of the screen used by sky, peaks, and the pine line.
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

/** Fraction of the viewport given to the sky, mountains, and forest line. */
export const PLAINS_HORIZON = 0.34;

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
  return field.provinceId === 'plains' && field.chunkSize > 0 && !field.decor.some((rect) => rect.label === 'plains-vista-8');
}

/** True when a monster body would be standing inside a solid prop. */
export function hitsSolid(x: number, y: number, radius: number, blocks: Rect[]): boolean {
  return blocks.some((block) => x > block.x - radius && x < block.x + block.w + radius && y > block.y - radius && y < block.y + block.h + radius);
}
