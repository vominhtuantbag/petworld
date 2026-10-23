import { hashString, mulberry32 } from './grid';
import { placeHazards } from './hazards';
import { PLACE_TRIES, placementBlocked } from './spacing';
import type { FieldState, Rect } from './types';

/**
 * Desert dressing for one Sa Mạc map. The same zone id always rebuilds
 * the same dunes, rocks, oasis, and cactus.
 *
 * Solids (player and monsters cannot overlap): cồn cát, cụm đá, ốc đảo, xương rồng.
 * A new solid or hazard is moved when its picture would touch anything already placed.
 * Walked over: đất nứt nẻ (×0.90), cát lún (×0.80, −2 máu mỗi giây), cỏ rơm vàng.
 * Cracked earth and quicksand are 3× the png, trigger and picture together.
 * Plains water is not placed here. The gate pads stay outside those zones.
 */

export const DESERT_SAND = '#e8c98a';

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
  return !field.decor.some((rect) => rect.label === MARKER);
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

