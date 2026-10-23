import { placementBlocked, type MapArt } from './spacing';
import { eastGate, entrancePad, returnGate, westGate } from './tiers';
import type { Rect, Vec } from './types';

/**
 * Ground hazards. Sa mạc uses cracked earth and quicksand. Đồng bằng uses
 * water. Each trigger is the native png, multiplied by `HAZARD_SCALE` on
 * both axes, and the sprite is drawn at that same box.
 *
 * Speed is a multiplier on the player's base pace while their point is
 * inside. Quicksand and water also tick once per second. The sim drops
 * that clock on the frame the player steps out, so a partial second does
 * not linger and no extra timer is left running.
 */

export const HAZARD_SCALE = 3;

/** Native pixel size of assets/desert/datnutne.png, catlun.png, and assets/plains/vungnuoc.png. */
export const HAZARD_ART = {
  crack: { w: 301, h: 162 },
  quicksand: { w: 236, h: 176 },
  puddle: { w: 283, h: 169 },
} as const;

export type HazardKind = keyof typeof HAZARD_ART;

/** `playerSpeed = baseSpeed * multiplier` while standing inside. */
export const HAZARD_SPEED: Record<HazardKind, number> = {
  crack: 0.9,
  quicksand: 0.8,
  puddle: 0.85,
};

export const HAZARD_TICK_SEC = 1;
export const HAZARD_HP_PER_TICK = 2;
export const HAZARD_STAMINA_PER_TICK = 2;

export function hazardSize(kind: HazardKind): { w: number; h: number } {
  const art = HAZARD_ART[kind];
  return { w: art.w * HAZARD_SCALE, h: art.h * HAZARD_SCALE };
}

const PAD_MARGIN = 72;

const HAZARD_TRIES = 96;

/**
 * Scatter walkable hazards onto free ground. Each try is rejected when the
 * picture would touch a dune, tree, rock, flower, or another hazard.
 * Returns how many were placed.
 */
export function placeHazards(
  bucket: Rect[],
  occupied: Rect[],
  width: number,
  height: number,
  rng: () => number,
  count: number,
  kind: HazardKind,
): number {
  const box = hazardSize(kind);
  if (box.w + 80 >= width || box.h + 80 >= height || count <= 0) return 0;
  const art: MapArt = kind === 'puddle' ? 'plains' : 'desert';
  const slow = HAZARD_SPEED[kind];
  let placed = 0;
  for (let index = 0; index < count; index += 1) {
    const rect = roll(width, height, rng, box, kind, slow, occupied, art);
    if (!rect) continue;
    bucket.push(rect);
    occupied.push(rect);
    placed += 1;
  }
  if (placed === 0) {
    const forced = force(width, height, box, kind, slow, occupied, art);
    if (forced) {
      bucket.push(forced);
      occupied.push(forced);
      placed += 1;
    }
  }
  return placed;
}

/**
 * Drop a hazard whose box covers a gate or an arrival pad. Sunlight bands
 * and other decor are left alone. Used after the tier-map pads are known,
 * including the far ascent gate.
 */
export function omitHazardsOnPads(rects: Rect[], pads: readonly Vec[], margin = PAD_MARGIN): Rect[] {
  return rects.filter((rect) => {
    if (!isHazardKind(rect.kind)) return true;
    return pads.every((pad) => !coversPoint(rect, pad, margin));
  });
}

function roll(
  width: number,
  height: number,
  rng: () => number,
  box: { w: number; h: number },
  kind: HazardKind,
  slow: number,
  occupied: Rect[],
  art: MapArt,
): Rect | null {
  for (let attempt = 0; attempt < HAZARD_TRIES; attempt += 1) {
    const x = 48 + rng() * (width - box.w - 96);
    const y = 48 + rng() * (height - box.h - 96);
    const rect: Rect = { x, y, w: box.w, h: box.h, kind, slow };
    if (!insideMap(rect, width, height)) continue;
    if (occupied.some((other) => placementBlocked(rect, other, art))) continue;
    if (coversRingPads(rect, width, height)) continue;
    return rect;
  }
  return null;
}

function force(
  width: number,
  height: number,
  box: { w: number; h: number },
  kind: HazardKind,
  slow: number,
  occupied: Rect[],
  art: MapArt,
): Rect | null {
  const spots = [
    { x: width * 0.62, y: height * 0.12 },
    { x: width * 0.12, y: height * 0.12 },
    { x: width * 0.62, y: height * 0.55 },
    { x: 48, y: 48 },
  ];
  for (const spot of spots) {
    const rect: Rect = {
      x: clamp(48, width - box.w - 48, spot.x),
      y: clamp(48, height - box.h - 48, spot.y),
      w: box.w,
      h: box.h,
      kind,
      slow,
    };
    if (!insideMap(rect, width, height)) continue;
    if (occupied.some((other) => placementBlocked(rect, other, art))) continue;
    if (coversRingPads(rect, width, height)) continue;
    return rect;
  }
  return null;
}

function coversRingPads(rect: Rect, width: number, height: number): boolean {
  const pads = [entrancePad(width, height), returnGate(width, height), westGate(width, height), eastGate(width, height)];
  return pads.some((pad) => coversPoint(rect, pad, PAD_MARGIN));
}

function coversPoint(rect: Rect, point: Vec, margin: number): boolean {
  return (
    point.x >= rect.x - margin &&
    point.x <= rect.x + rect.w + margin &&
    point.y >= rect.y - margin &&
    point.y <= rect.y + rect.h + margin
  );
}

function insideMap(rect: Rect, width: number, height: number): boolean {
  return rect.x >= 24 && rect.y >= 24 && rect.x + rect.w <= width - 24 && rect.y + rect.h <= height - 24;
}

function isHazardKind(kind: Rect['kind']): kind is HazardKind {
  return kind === 'crack' || kind === 'quicksand' || kind === 'puddle';
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}
