import type { FieldState, MapZone, Rect } from './types';
import { pick, placeHazard, placeIn, zoneCtx } from './zoneDecor';

export type FrostDressing = { soft: Rect[]; solids: Rect[] };

export const FROST_SNOW = '#ECEFF1';
export const FROST_JADE = '#80DEEA';
export const FROST_COBALT = '#006064';

/** Ice pillars only come from the zoned hunting map and sit clear of the pads. */
export function frostNeedsDressing(field: FieldState): boolean {
  return (
    field.provinceId === 'tundra' &&
    field.chunkSize > 0 &&
    field.tier >= 1 &&
    !field.blocks.some((rect) => rect.kind === 'icepillar')
  );
}

export const FROST_DENSITY = {
  foothills: { snow: 16, drifts: 12, bushes: 18, stones: 8 },
  shelves: { jade: 10, cracks: 8, ridges: 10, drifts: 8 },
  cavern: { jade: 8, pillars: 16, shards: 20, glare: 8 },
  blizzard: { wind: 12, drifts: 14, snow: 8, glare: 6 },
  abyss: { cobalt: 12, cliffs: 8, pillars: 10, shards: 16, wind: 6 },
  flakes: 60,
  baotruyet: 6,
  khebang: 6,
};

export const FROST_HITBOX = {
  glacierock: { w: 90, h: 48 },
  icepillar: { w: 36, h: 28 },
  frostcliff: { w: 200, h: 60 },
};

const SHARD = ['#b2ebf2', '#e0f7fa', '#4dd0e1', '#80DEEA'];

/**
 * Băng Giá hunting map, dressed per hidden zone from `buildZones`:
 *
 * - 0 Snowy Foothill Slopes — white snow, frozen bushes, light stones.
 * - 1 Cracked Glacial Shelves — jade ice sheets and frost ridges.
 * - 2 Blue Ice Cavern Depths — ice pillars and turquoise crystal shards.
 * - 3 Howling Blizzard Wasteland — wind banks, heavy drifts, glare.
 * - 4 Eternal Frost Abyss Core — cobalt ice, cliffs, primordial crystals.
 *
 * Bão tuyết (baotruyet) and khe băng (khebang) are 8× hazards kept off every gate.
 */
export function generateFrost(zoneId: string, width: number, height: number, zones: readonly MapZone[]): FrostDressing {
  const ctx = zoneCtx(`${zoneId}:frost-map`, width, height, zones);
  const { rng } = ctx;
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const add = (bucket: Rect[], rect: Rect | null) => {
    if (rect) bucket.push(rect);
    return rect;
  };

  const hills = FROST_DENSITY.foothills;
  for (let index = 0; index < hills.snow; index += 1) {
    const w = 160 + rng() * 140;
    add(soft, placeIn(ctx, 0, { w, h: w * 0.4, kind: 'frostsnow', fill: FROST_SNOW }, false, false, 0.22));
  }
  for (let index = 0; index < hills.drifts; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 90 + rng() * 70, h: 36 + rng() * 16, kind: 'snowdrift', fill: '#f7fafc' }, false));
  }
  for (let index = 0; index < hills.bushes; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 36, h: 28, kind: 'frostbush', fill: '#90a4ae' }, false));
  }
  for (let index = 0; index < hills.stones; index += 1) {
    add(solids, placeIn(ctx, 0, { ...FROST_HITBOX.glacierock, kind: 'glacierock', fill: '#90a4ae' }, true));
  }

  const shelves = FROST_DENSITY.shelves;
  for (let index = 0; index < shelves.jade; index += 1) {
    const w = 180 + rng() * 140;
    add(soft, placeIn(ctx, 1, { w, h: w * 0.38, kind: 'jadeice', fill: FROST_JADE }, false));
  }
  for (let index = 0; index < shelves.cracks; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 140 + rng() * 80, h: 24, kind: 'iceglare', fill: 'rgba(224, 247, 250, 0.35)' }, false, true));
  }
  for (let index = 0; index < shelves.ridges; index += 1) {
    add(solids, placeIn(ctx, 1, { ...FROST_HITBOX.glacierock, kind: 'glacierock', fill: '#78909c' }, true));
  }
  for (let index = 0; index < shelves.drifts; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 100 + rng() * 60, h: 34, kind: 'snowdrift', fill: '#eceff1' }, false));
  }

  const cavern = FROST_DENSITY.cavern;
  for (let index = 0; index < cavern.jade; index += 1) {
    const w = 160 + rng() * 120;
    add(soft, placeIn(ctx, 2, { w, h: w * 0.4, kind: 'jadeice', fill: '#4dd0e1' }, false));
  }
  for (let index = 0; index < cavern.pillars; index += 1) {
    const scale = 0.85 + rng() * 0.4;
    add(
      solids,
      placeIn(
        ctx,
        2,
        { w: FROST_HITBOX.icepillar.w * scale, h: FROST_HITBOX.icepillar.h * scale, kind: 'icepillar', fill: '#b2ebf2' },
        true,
      ),
    );
  }
  for (let index = 0; index < cavern.shards; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 20, h: 24, kind: 'crystalshard', fill: pick(rng, SHARD) }, false));
  }
  for (let index = 0; index < cavern.glare; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 70, h: 120, kind: 'iceglare', fill: 'rgba(178, 235, 242, 0.22)' }, false, true));
  }

  const storm = FROST_DENSITY.blizzard;
  for (let index = 0; index < storm.wind; index += 1) {
    const w = 280 + rng() * 200;
    add(soft, placeIn(ctx, 3, { w, h: w * 0.28, kind: 'frostwind', fill: 'rgba(236, 239, 241, 0.2)' }, false, true));
  }
  for (let index = 0; index < storm.drifts; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 120 + rng() * 80, h: 40, kind: 'snowdrift', fill: '#fafafa' }, false));
  }
  for (let index = 0; index < storm.snow; index += 1) {
    const w = 160 + rng() * 120;
    add(soft, placeIn(ctx, 3, { w, h: w * 0.36, kind: 'frostsnow', fill: FROST_SNOW }, false));
  }
  for (let index = 0; index < storm.glare; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 80, h: 140, kind: 'iceglare', fill: 'rgba(255,255,255,0.18)' }, false, true));
  }

  const abyss = FROST_DENSITY.abyss;
  for (let index = 0; index < abyss.cobalt; index += 1) {
    const w = 180 + rng() * 140;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.4, kind: 'cobaltice', fill: FROST_COBALT }, false));
  }
  for (let index = 0; index < abyss.cliffs; index += 1) {
    add(solids, placeIn(ctx, 4, { ...FROST_HITBOX.frostcliff, kind: 'frostcliff', fill: '#004d56' }, true));
  }
  for (let index = 0; index < abyss.pillars; index += 1) {
    add(solids, placeIn(ctx, 4, { ...FROST_HITBOX.icepillar, kind: 'icepillar', fill: '#4dd0e1' }, true));
  }
  for (let index = 0; index < abyss.shards; index += 1) {
    add(soft, placeIn(ctx, 4, { w: 24, h: 28, kind: 'crystalshard', fill: pick(rng, SHARD) }, false));
  }
  for (let index = 0; index < abyss.wind; index += 1) {
    const w = 300 + rng() * 180;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.3, kind: 'frostwind', fill: 'rgba(0, 96, 100, 0.18)' }, false, true));
  }

  for (let index = 0; index < FROST_DENSITY.baotruyet; index += 1) {
    add(soft, placeHazard(ctx, 'baotruyet', [1, 3, 4]));
  }
  for (let index = 0; index < FROST_DENSITY.khebang; index += 1) {
    add(soft, placeHazard(ctx, 'khebang', [1, 2, 4]));
  }

  for (let index = 0; index < FROST_DENSITY.flakes; index += 1) {
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 6 + rng() * 6,
      h: 6 + rng() * 6,
      kind: 'snowflake',
      fill: '#ffffff',
      drift: { vx: (rng() - 0.5) * 18, vy: 28 + rng() * 24 },
    });
  }

  return { soft, solids };
}
