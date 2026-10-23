import type { RegionId } from '../types/game';
import { hashString, mulberry32 } from './grid';
import type { MapZone, Rect, Sensor, Vec } from './types';

/**
 * Hunting-map configuration for the ten towns.
 *
 * Tiers
 * -----
 * Every town has `MAP_TIERS` maps. Tier 1 is levels 1–10, tier 2 is 11–20,
 * and tier 10 is 91–100. The id is `town:m{tier}` (for example `plains:m1`).
 * Old ids still resolve in `atlas.ts`: `town:outskirts` is tier 1 and
 * `town:depths` is tier 2.
 *
 * Uneven zones
 * ------------
 * Each map is split into `ZONE_COUNT` cells. Cell 0 is levels n+0..n+1
 * (1–2 on tier 1) and cell 4 is n+8..n+9 (9–10 on tier 1). A cell is the
 * set of points whose squared distance to its seed, minus `weight`, is the
 * smallest. Weights differ on purpose, so the bands are not equal strips,
 * and the seeds are jittered per map so two towns do not share a layout.
 * Cell 0 is pinned near the entrance. Cell 4 is pinned far away, which is
 * also where the ascent gate is allowed to sit.
 *
 * Gates
 * -----
 * Three gates, plus the road home:
 * - West and east link to the previous and next town in `TOWN_RING`, at
 *   the same tier. Town 1 (`plains`) meets town 2 and town 10.
 * - `ascent` leads to tier + 1 of this same town. It is rolled far from
 *   the entrance so the walk spends stamina. Tier 10 has no ascent.
 * - `return` on tier 1 goes back to town. On later tiers it drops you
 *   beside the previous map's ascent gate, so the walk back is real too.
 * Arrival pads sit `ARRIVE_GAP` px inside the gate, outside its radius,
 * so stepping through does not immediately step back.
 */

export const MAP_TIERS = 10;
export const TIER_LEVELS = 10;
export const ZONE_COUNT = 5;

export const GATE_INSET = 96;
export const GATE_RADIUS = 46;
export const ASCENT_RADIUS = 54;
/** How far an arrival pad sits inside a gate. Must exceed the gate radius. */
export const ARRIVE_GAP = 170;

const ZONE_TINTS = ['#efe0a4', '#d7b15a', '#8fb56a', '#d4844a', '#b64b3c'];
/** Relative cell sizes. 1 and 3 are the wide bands; 0 stays the small starter. */
const ZONE_FACTORS = [0.75, 1.25, 0.85, 1.4, 0.95];

export type RingStop = {
  id: string;
  regionId: RegionId;
  label: string;
};

export function tierZoneId(townId: string, tier: number): string {
  return `${townId}:m${tier}`;
}

export function tierFromZoneId(zoneId: string): number | null {
  const match = /:m(\d+)$/.exec(zoneId);
  if (!match) return null;
  const tier = Number(match[1]);
  if (!Number.isInteger(tier) || tier < 1 || tier > MAP_TIERS) return null;
  return tier;
}

/** Level window for one map. Tier 1 → 1–10, tier 10 → 91–100. */
export function tierRange(tier: number): { levelMin: number; levelMax: number } {
  const levelMin = (tier - 1) * TIER_LEVELS + 1;
  return { levelMin, levelMax: levelMin + TIER_LEVELS - 1 };
}

/** Two-level band inside a tier. Index 0 is the easiest cell. */
export function zoneBand(tier: number, index: number): { levelMin: number; levelMax: number } {
  const base = tierRange(tier).levelMin + index * 2;
  return { levelMin: base, levelMax: base + 1 };
}

export function entrancePad(width: number, height: number): Vec {
  return { x: width * 0.22, y: height - 280 };
}

export function returnGate(width: number, height: number): Vec {
  return { x: width * 0.22, y: height - 96 };
}

export function westGate(width: number, height: number): Vec {
  return { x: GATE_INSET, y: height * 0.36 };
}

export function eastGate(width: number, height: number): Vec {
  return { x: width - GATE_INSET, y: height * 0.64 };
}

export function inwardPad(gate: Vec, width: number, height: number, gap = ARRIVE_GAP): Vec {
  return stepToward(gate, { x: width / 2, y: height / 2 }, gap, width, height);
}

function stepToward(from: Vec, toward: Vec, gap: number, width: number, height: number): Vec {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: clamp(48, width - 48, from.x + (dx / len) * gap),
    y: clamp(48, height - 48, from.y + (dy / len) * gap),
  };
}

/**
 * Five weighted seeds. The same zone id always rebuilds the same split.
 * After relaxation, cell 0 still owns the entrance and cell 4 owns the
 * far corner, even when a heavy neighbor tries to swallow a light seed.
 */
export function buildZones(zoneId: string, width: number, height: number, tier: number): MapZone[] {
  const rng = mulberry32(hashString(`${zoneId}:zones`));
  const entrance = entrancePad(width, height);
  const pinned: Vec[] = [
    {
      x: clamp(120, width * 0.42, entrance.x + width * (0.02 + rng() * 0.06)),
      y: clamp(height * 0.5, height * 0.86, entrance.y - height * (0.1 + rng() * 0.08)),
    },
    { x: width * (0.16 + rng() * 0.2), y: height * (0.16 + rng() * 0.24) },
    { x: width * (0.36 + rng() * 0.18), y: height * (0.42 + rng() * 0.28) },
    { x: width * (0.52 + rng() * 0.16), y: height * (0.18 + rng() * 0.32) },
    { x: width * (0.72 + rng() * 0.16), y: height * (0.1 + rng() * 0.2) },
  ];
  const seeds = relaxSeeds(pinned, width, height);
  const span = Math.min(width, height);
  const base = (span * 0.28) ** 2;
  const zones: MapZone[] = seeds.map((seed, index) => {
    const band = zoneBand(tier, index);
    return {
      index,
      levelMin: band.levelMin,
      levelMax: band.levelMax,
      seed,
      weight: base * ZONE_FACTORS[index] * (0.9 + rng() * 0.2),
      tint: ZONE_TINTS[index],
    };
  });
  for (const zone of zones) claim(zones, zone.seed, zone.index, base);
  claim(zones, entrance, 0, base);
  claim(zones, zones[ZONE_COUNT - 1].seed, ZONE_COUNT - 1, base);
  return zones;
}

function relaxSeeds(pinned: Vec[], width: number, height: number): Vec[] {
  const next = pinned.map((seed) => ({ ...seed }));
  const minDist = Math.min(width, height) * 0.28;
  for (let pass = 0; pass < 12; pass += 1) {
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        let dx = next[j].x - next[i].x;
        let dy = next[j].y - next[i].y;
        const dist = Math.hypot(dx, dy) || 0.001;
        if (dist >= minDist) continue;
        const push = (minDist - dist) / 2;
        dx /= dist;
        dy /= dist;
        next[i].x -= dx * push;
        next[i].y -= dy * push;
        next[j].x += dx * push;
        next[j].y += dy * push;
      }
    }
    next[0] = { ...pinned[0] };
    next[ZONE_COUNT - 1] = { ...pinned[ZONE_COUNT - 1] };
    for (const seed of next) {
      seed.x = clamp(width * 0.08, width * 0.92, seed.x);
      seed.y = clamp(height * 0.08, height * 0.92, seed.y);
    }
  }
  return next;
}

/** Raise `index` until `point` belongs to it. A seed must own itself. */
function claim(zones: MapZone[], point: Vec, index: number, step: number) {
  for (let guard = 0; guard < 8 && zoneIndexAt(point.x, point.y, zones) !== index; guard += 1) {
    zones[index].weight += step * 0.2;
  }
}

/** Weighted nearest seed. Lower score wins. */
export function zoneIndexAt(x: number, y: number, zones: readonly MapZone[]): number {
  let best = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let index = 0; index < zones.length; index += 1) {
    const dx = x - zones[index].seed.x;
    const dy = y - zones[index].seed.y;
    const score = dx * dx + dy * dy - zones[index].weight;
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
}

/**
 * The tier-up gate. Candidates are kept only when they sit in the highest
 * band and at least 58% of the map diagonal away from the entrance.
 */
export function ascentSite(zoneId: string, width: number, height: number, zones: readonly MapZone[]): Vec {
  const entrance = entrancePad(width, height);
  const minDist = Math.hypot(width, height) * 0.58;
  const high = zones.length - 1;
  const rng = mulberry32(hashString(`${zoneId}:ascent`));
  let best: Vec | null = null;
  let bestDist = 0;
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const x = clamp(140, width - 140, width * (0.58 + rng() * 0.34));
    const y = clamp(140, height - 140, height * (0.08 + rng() * 0.62));
    if (zoneIndexAt(x, y, zones) !== high) continue;
    const dist = Math.hypot(x - entrance.x, y - entrance.y);
    if (dist < minDist || dist <= bestDist) continue;
    bestDist = dist;
    best = { x, y };
  }
  if (best) return best;
  const seed = zones[high]?.seed ?? { x: width * 0.8, y: height * 0.2 };
  return { x: clamp(140, width - 140, seed.x), y: clamp(140, height - 140, seed.y) };
}

/** Where the next tier sends you back: just inside the previous ascent gate. */
export function ascentReturnPad(zoneId: string, width: number, height: number): Vec {
  const tier = tierFromZoneId(zoneId) ?? 1;
  const zones = buildZones(zoneId, width, height, tier);
  const gate = ascentSite(zoneId, width, height, zones);
  return stepToward(gate, entrancePad(width, height), ARRIVE_GAP, width, height);
}

export function sampleInZone(
  rng: () => number,
  zone: MapZone,
  zones: readonly MapZone[],
  width: number,
  height: number,
): Vec {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const reach = Math.min(width, height) * (0.1 + rng() * 0.26);
    const angle = rng() * Math.PI * 2;
    const x = zone.seed.x + Math.cos(angle) * reach;
    const y = zone.seed.y + Math.sin(angle) * reach;
    if (x < 48 || y < 48 || x > width - 48 || y > height - 48) continue;
    if (zoneIndexAt(x, y, zones) === zone.index) return { x, y };
  }
  return { x: zone.seed.x, y: zone.seed.y };
}

/**
 * West, east, return, and (except on tier 10) the far ascent.
 * West arrives on the neighbor's east pad, and east on their west pad,
 * because every hunting map uses the same width and height.
 */
export function huntingSensors(input: {
  townId: string;
  regionId: RegionId;
  tier: number;
  width: number;
  height: number;
  zones: readonly MapZone[];
  west: RingStop;
  east: RingStop;
  townArrive: Vec;
}): Sensor[] {
  const { width, height, tier, townId } = input;
  const back = returnGate(width, height);
  const west = westGate(width, height);
  const east = eastGate(width, height);
  const sensors: Sensor[] = [
    {
      id: 'return',
      x: back.x,
      y: back.y,
      r: GATE_RADIUS,
      label: tier === 1 ? 'Về thị trấn' : `Về bản đồ ${tier - 1}`,
      toZone: tier === 1 ? `town:${input.regionId}` : tierZoneId(townId, tier - 1),
      arrive: tier === 1 ? input.townArrive : ascentReturnPad(tierZoneId(townId, tier - 1), width, height),
    },
    {
      id: 'west',
      x: west.x,
      y: west.y,
      r: GATE_RADIUS,
      label: input.west.label,
      toZone: tierZoneId(input.west.id, tier),
      unlock: input.west.regionId,
      arrive: inwardPad(east, width, height),
    },
    {
      id: 'east',
      x: east.x,
      y: east.y,
      r: GATE_RADIUS,
      label: input.east.label,
      toZone: tierZoneId(input.east.id, tier),
      unlock: input.east.regionId,
      arrive: inwardPad(west, width, height),
    },
  ];
  if (tier < MAP_TIERS) {
    const gate = ascentSite(tierZoneId(townId, tier), width, height, input.zones);
    sensors.push({
      id: 'ascent',
      x: gate.x,
      y: gate.y,
      r: ASCENT_RADIUS,
      label: `Cổng xa ${tier + 1}`,
      toZone: tierZoneId(townId, tier + 1),
      arrive: entrancePad(width, height),
    });
  }
  return sensors;
}

export function clearPads<T extends Rect>(rects: T[], pads: readonly Vec[], radius: number): T[] {
  return rects.filter((rect) => {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    return pads.every((pad) => Math.hypot(cx - pad.x, cy - pad.y) >= radius);
  });
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}
