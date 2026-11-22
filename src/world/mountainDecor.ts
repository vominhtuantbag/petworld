import type { FieldState, MapZone, Rect } from './types';
import { pick, placeHazard, placeIn, zoneCtx } from './zoneDecor';

export type MountainDressing = { soft: Rect[]; solids: Rect[] };

export const MOUNTAIN_MOSS = '#4A6B53';
export const MOUNTAIN_GRAVEL = '#8C9298';
export const MOUNTAIN_SLATE = '#5B6770';
export const MOUNTAIN_SNOW = '#CFD8DC';

/** Cliff solids only come from the zoned hunting map and sit clear of the pads. */
export function mountainNeedsDressing(field: FieldState): boolean {
  return field.provinceId === 'mountains' && field.chunkSize > 0 && field.tier >= 1 && !field.blocks.some((rect) => rect.kind === 'cliff');
}

export const MOUNTAIN_DENSITY = {
  foothills: { moss: 16, gravel: 10, pines: 28, flowers: 36, stream: 6, grass: 14 },
  crags: { cliffs: 16, walls: 10, trails: 10, abyss: 8 },
  ridges: { cliffs: 10, grass: 22, nests: 10, pines: 8 },
  bamboo: { fog: 12, bamboo: 32, caves: 8, pines: 6 },
  peak: { snow: 16, pillars: 8, fog: 10, walls: 4 },
  clouds: 18,
  eagles: 8,
  gioloc: 6,
  dalo: 6,
};

export const MOUNTAIN_HITBOX = {
  cliff: { w: 220, h: 70 },
  abyss: { w: 180, h: 48 },
  stonewall: { w: 90, h: 40 },
  pillar: { w: 48, h: 36 },
};

const FLOWER = ['#e07a8a', '#f2d36b', '#8ec5e8', '#f6f1e7'];
const BRIDGE_W = 28;

/**
 * Núi Non hunting map, dressed per hidden zone from `buildZones`:
 *
 * - 0 Foothills — moss, gravel, pines, flowers, and a mountain stream.
 * - 1 Steep Crags — cliff walls, stone barriers, trails, rope bridges over abysses.
 * - 2 Falcon Ridges — wind-swept grass, cliff ledges, and cliffside nests.
 * - 3 Misty Bamboo — cloud banks, bamboo, and dark cave mouths.
 * - 4 Snowy Peak — snow patches, stone pillars, sea of clouds.
 *
 * Gió lốc (gioloc) and đá lở (dalo) are 8× hazards kept off every gate.
 */
export function generateMountain(zoneId: string, width: number, height: number, zones: readonly MapZone[]): MountainDressing {
  const ctx = zoneCtx(`${zoneId}:mountain-map`, width, height, zones);
  const { rng } = ctx;
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const add = (bucket: Rect[], rect: Rect | null) => {
    if (rect) bucket.push(rect);
    return rect;
  };

  const hills = MOUNTAIN_DENSITY.foothills;
  for (let index = 0; index < hills.moss; index += 1) {
    const w = 140 + rng() * 140;
    add(soft, placeIn(ctx, 0, { w, h: w * 0.42, kind: 'foothill', fill: MOUNTAIN_MOSS }, false, false, 0.22));
  }
  for (let index = 0; index < hills.gravel; index += 1) {
    const w = 90 + rng() * 80;
    add(soft, placeIn(ctx, 0, { w, h: w * 0.36, kind: 'gravel', fill: MOUNTAIN_GRAVEL }, false, false, 0.22));
  }
  const stream: Rect[] = [];
  for (let index = 0; index < hills.stream; index += 1) {
    const w = 220 + rng() * 160;
    const run = add(soft, placeIn(ctx, 0, { w, h: 28 + rng() * 10, kind: 'stream', fill: '#7ec8e8' }, false));
    if (run) stream.push(run);
  }
  for (let index = 0; index < hills.flowers; index += 1) {
    const bank = stream[index % Math.max(1, stream.length)];
    const at = bank
      ? { x: bank.x + rng() * bank.w, y: bank.y + (rng() > 0.5 ? -18 : bank.h + 18) }
      : undefined;
    add(soft, placeIn(ctx, 0, { w: 22, h: 22, kind: 'wildflower', fill: pick(rng, FLOWER), at }, false, true));
  }
  for (let index = 0; index < hills.pines; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 46, h: 28, kind: 'pine', fill: '#2d4a34' }, false));
  }
  for (let index = 0; index < hills.grass; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 70, h: 36, kind: 'mtngrass', fill: '#4f7a4a' }, false));
  }

  const crags = MOUNTAIN_DENSITY.crags;
  const cliffs: Rect[] = [];
  for (let index = 0; index < crags.cliffs; index += 1) {
    const scale = 0.85 + rng() * 0.5;
    const wall = add(
      solids,
      placeIn(ctx, 1, { w: MOUNTAIN_HITBOX.cliff.w * scale, h: MOUNTAIN_HITBOX.cliff.h * scale, kind: 'cliff', fill: MOUNTAIN_SLATE }, true),
    );
    if (wall) cliffs.push(wall);
  }
  for (let index = 0; index < crags.walls; index += 1) {
    add(solids, placeIn(ctx, 1, { ...MOUNTAIN_HITBOX.stonewall, kind: 'stonewall', fill: '#6a737a' }, true));
  }
  for (let index = 0; index < crags.trails; index += 1) {
    const w = 160 + rng() * 140;
    add(soft, placeIn(ctx, 1, { w, h: 22, kind: 'trail', fill: '#9aa3a8' }, false));
  }
  const pits: Rect[] = [];
  for (let index = 0; index < crags.abyss; index += 1) {
    const pit = add(solids, placeIn(ctx, 1, { ...MOUNTAIN_HITBOX.abyss, kind: 'abyss', fill: '#1a1e22' }, true));
    if (pit) pits.push(pit);
  }
  for (const pit of pits) {
    const bridge: Rect = {
      x: pit.x - 18,
      y: pit.y + pit.h / 2 - BRIDGE_W / 2,
      w: pit.w + 36,
      h: BRIDGE_W,
      kind: 'ropebridge',
      fill: '#8a5a32',
    };
    soft.push(bridge);
  }

  const ridges = MOUNTAIN_DENSITY.ridges;
  const ledges: Rect[] = [];
  for (let index = 0; index < ridges.cliffs; index += 1) {
    const scale = 0.7 + rng() * 0.4;
    const ledge = add(
      solids,
      placeIn(ctx, 2, { w: MOUNTAIN_HITBOX.cliff.w * scale, h: MOUNTAIN_HITBOX.cliff.h * 0.7 * scale, kind: 'cliff', fill: '#4e5962' }, true),
    );
    if (ledge) ledges.push(ledge);
  }
  for (let index = 0; index < ridges.grass; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 90, h: 44, kind: 'mtngrass', fill: '#6b8a5a' }, false));
  }
  for (let index = 0; index < ridges.nests; index += 1) {
    const ledge = ledges[index % Math.max(1, ledges.length)];
    const at = ledge ? { x: ledge.x + ledge.w * 0.5, y: ledge.y - 8 } : undefined;
    add(soft, placeIn(ctx, 2, { w: 54, h: 28, kind: 'nest', fill: '#8a6a3a', at }, false, true));
  }
  for (let index = 0; index < ridges.pines; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 40, h: 24, kind: 'pine', fill: '#24382c' }, false));
  }

  const grove = MOUNTAIN_DENSITY.bamboo;
  for (let index = 0; index < grove.fog; index += 1) {
    const w = 340 + rng() * 260;
    add(soft, placeIn(ctx, 3, { w, h: w * 0.3, kind: 'mtcloud', fill: 'rgba(236, 242, 246, 0.22)' }, false, true));
  }
  for (let index = 0; index < grove.bamboo; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 70, h: 90, kind: 'bamboo', fill: '#3e8a4a' }, false));
  }
  for (let index = 0; index < grove.caves; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 70, h: 52, kind: 'cave', fill: '#1c2024' }, false));
  }
  for (let index = 0; index < grove.pines; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 44, h: 26, kind: 'pine', fill: '#2d4a34' }, false));
  }

  const peak = MOUNTAIN_DENSITY.peak;
  for (let index = 0; index < peak.snow; index += 1) {
    const w = 160 + rng() * 140;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.4, kind: 'snow', fill: MOUNTAIN_SNOW }, false));
  }
  for (let index = 0; index < peak.pillars; index += 1) {
    add(solids, placeIn(ctx, 4, { ...MOUNTAIN_HITBOX.pillar, kind: 'pillar', fill: '#9aa3a8' }, true));
  }
  for (let index = 0; index < peak.walls; index += 1) {
    add(solids, placeIn(ctx, 4, { ...MOUNTAIN_HITBOX.stonewall, kind: 'stonewall', fill: '#cfd8dc' }, true));
  }
  for (let index = 0; index < peak.fog; index += 1) {
    const w = 380 + rng() * 240;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.34, kind: 'mtcloud', fill: 'rgba(255, 255, 255, 0.28)' }, false, true));
  }

  for (let index = 0; index < MOUNTAIN_DENSITY.gioloc; index += 1) {
    add(soft, placeHazard(ctx, 'gioloc', [1, 2, 4]));
  }
  for (let index = 0; index < MOUNTAIN_DENSITY.dalo; index += 1) {
    add(soft, placeHazard(ctx, 'dalo', [1, 2, 3]));
  }

  for (let index = 0; index < MOUNTAIN_DENSITY.clouds; index += 1) {
    const w = 280 + rng() * 220;
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w,
      h: w * 0.28,
      kind: 'mtcloud',
      fill: 'rgba(255, 255, 255, 0.18)',
      drift: { vx: 12 + rng() * 10, vy: (rng() - 0.5) * 4 },
    });
  }
  for (let index = 0; index < MOUNTAIN_DENSITY.eagles; index += 1) {
    const left = rng() > 0.5;
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 90,
      h: 36,
      kind: 'eagle',
      fill: 'rgba(20, 22, 26, 0.35)',
      drift: { vx: left ? 80 : -80, vy: (rng() - 0.5) * 12 },
    });
  }

  return { soft, solids };
}

