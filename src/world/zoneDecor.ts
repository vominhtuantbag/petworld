import { hashString, mulberry32 } from './grid';
import { VECTOR_HAZARD_SPEED, vectorHazardSize, type VectorHazardKind } from './hazards';
import { eastGate, entrancePad, returnGate, westGate, zoneIndexAt } from './tiers';
import type { FieldState, MapZone, Rect, Vec } from './types';

/**
 * Placement helpers for maps dressed per hidden zone (Đại Dương, Đầm Lầy).
 * Each prop lands with its center inside one zone from `buildZones`.
 * Solids and hazards keep clear of every gate and pad.
 */

const PAD_CLEAR = 260;

export type ZoneCtx = {
  rng: () => number;
  width: number;
  height: number;
  zones: readonly MapZone[];
  pads: Vec[];
  occupied: Rect[];
};

export type ZoneProp = {
  w: number;
  h: number;
  kind: NonNullable<Rect['kind']>;
  fill?: string;
  slow?: number;
  drift?: Rect['drift'];
  /** Fixed center. Placement still rejects it outside the map or on a gate. */
  at?: Vec;
};

export function zoneCtx(seed: string, width: number, height: number, zones: readonly MapZone[]): ZoneCtx {
  return {
    rng: mulberry32(hashString(seed)),
    width,
    height,
    zones,
    pads: [entrancePad(width, height), returnGate(width, height), westGate(width, height), eastGate(width, height)],
    occupied: [],
  };
}

/**
 * A random spot whose center lies in `zone`. `spread` is how far from the
 * zone seed props may land, as a share of the short map side.
 * Overlay props (fog, bubbles, drifting life) skip the overlap check.
 */
export function placeIn(
  ctx: ZoneCtx,
  zone: number,
  prop: ZoneProp,
  solid: boolean,
  overlay = false,
  spread = 0.3,
): Rect | null {
  const seed = ctx.zones[zone]?.seed;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let cx: number;
    let cy: number;
    if (prop.at && attempt === 0) {
      cx = prop.at.x;
      cy = prop.at.y;
    } else if (prop.at) {
      cx = prop.at.x + (ctx.rng() - 0.5) * attempt * 12;
      cy = prop.at.y + (ctx.rng() - 0.5) * attempt * 12;
    } else {
      const reach = Math.min(ctx.width, ctx.height) * (0.04 + ctx.rng() * spread);
      const angle = ctx.rng() * Math.PI * 2;
      cx = seed ? seed.x + Math.cos(angle) * reach : 80 + ctx.rng() * (ctx.width - 160);
      cy = seed ? seed.y + Math.sin(angle) * reach : 80 + ctx.rng() * (ctx.height - 160);
    }
    const rect: Rect = { x: cx - prop.w / 2, y: cy - prop.h / 2, w: prop.w, h: prop.h, kind: prop.kind, fill: prop.fill };
    if (prop.slow != null) rect.slow = prop.slow;
    if (prop.drift) rect.drift = prop.drift;
    if (!inside(rect, ctx.width, ctx.height)) continue;
    if (!prop.at && ctx.zones.length > 0 && zoneIndexAt(cx, cy, ctx.zones) !== zone) continue;
    if (solid && nearPad(rect, ctx.pads, PAD_CLEAR)) continue;
    if (!overlay && ctx.occupied.some((other) => overlaps(rect, other, solid ? 24 : 6))) continue;
    if (!overlay) ctx.occupied.push(rect);
    return rect;
  }
  return null;
}

/** An 8× hazard anywhere on the map, or inside `zones` when given. */
export function placeHazard(ctx: ZoneCtx, kind: VectorHazardKind, zones?: readonly number[]): Rect | null {
  const box = vectorHazardSize(kind);
  if (box.w + 160 >= ctx.width || box.h + 160 >= ctx.height) return null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const rect: Rect = {
      x: 60 + ctx.rng() * (ctx.width - box.w - 120),
      y: 60 + ctx.rng() * (ctx.height - box.h - 120),
      w: box.w,
      h: box.h,
      kind,
      slow: VECTOR_HAZARD_SPEED[kind],
    };
    if (zones && ctx.zones.length > 0) {
      const zone = zoneIndexAt(rect.x + rect.w / 2, rect.y + rect.h / 2, ctx.zones);
      if (!zones.includes(zone)) continue;
    }
    if (nearPad(rect, ctx.pads, PAD_CLEAR)) continue;
    if (ctx.occupied.some((other) => overlaps(rect, other, 40))) continue;
    ctx.occupied.push(rect);
    return rect;
  }
  return null;
}

/**
 * Screen gradient axis: 0 at the town return gate, 1 at the farthest zone
 * seed. Points past either end clamp.
 */
export function depthAxis(field: Pick<FieldState, 'width' | 'height' | 'zones'>): { from: Vec; to: Vec } {
  const from = returnGate(field.width, field.height);
  const far = field.zones?.[field.zones.length - 1]?.seed;
  const to = far ?? { x: field.width * 0.88, y: field.height * 0.12 };
  return { from, to };
}

export function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] ?? list[0]!;
}

function nearPad(rect: Rect, pads: readonly Vec[], margin: number): boolean {
  return pads.some(
    (pad) => pad.x >= rect.x - margin && pad.x <= rect.x + rect.w + margin && pad.y >= rect.y - margin && pad.y <= rect.y + rect.h + margin,
  );
}

function inside(rect: Rect, width: number, height: number): boolean {
  return rect.x >= 32 && rect.y >= 32 && rect.x + rect.w <= width - 32 && rect.y + rect.h <= height - 32;
}

function overlaps(a: Rect, b: Rect, pad: number): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}
