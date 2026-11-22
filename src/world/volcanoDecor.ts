import type { FieldState, MapZone, Rect } from './types';
import { pick, placeHazard, placeIn, zoneCtx } from './zoneDecor';

export type VolcanoDressing = { soft: Rect[]; solids: Rect[] };

/** Silent ash rim → dark basalt → searing magma core. */
export const VOLCANO_ASH = '#4A4E54';
export const VOLCANO_BASALT = '#26292E';
export const VOLCANO_CRIMSON = '#8E1600';
export const VOLCANO_MAGMA = '#FF5722';

/** Basalt crags mark a dressed hunting map and sit clear of the pads. */
export function volcanoNeedsDressing(field: FieldState): boolean {
  return (
    field.provinceId === 'volcano' &&
    field.chunkSize > 0 &&
    field.tier >= 1 &&
    !field.blocks.some((rect) => rect.kind === 'basaltcrag')
  );
}

export const VOLCANO_DENSITY = {
  ash: { soil: 14, vents: 10, drift: 12, rocks: 6 },
  pumice: { pads: 12, trails: 10, stones: 14, ash: 8 },
  basalt: { ridges: 10, cracks: 14, crags: 16, glow: 8 },
  channels: { magma: 12, ash: 10, cracks: 10, rocks: 8 },
  core: { magma: 14, crags: 10, glow: 12, cracks: 8 },
  embers: 48,
  hoinong_nuilua: 6,
  dungnham_nuilua: 6,
};

export const VOLCANO_HITBOX = {
  basaltcrag: { w: 88, h: 44 },
  volrock: { w: 56, h: 32 },
};

const ASH = ['#4A4E54', '#5a5e64', '#3e4248', '#6a6e74'];
const PUMICE = ['#8a8480', '#9a9490', '#7a7470', '#b0a8a0'];
const GLOW = ['#FF5722', '#ff7043', '#e64a19', '#ff8a65'];

/**
 * Núi Lửa hunting map, dressed per hidden zone from `buildZones`:
 *
 * - 0 Silent Ash Rim — quiet ash dust and sulfur vents.
 * - 1 Pumice & Cooling Lava Flats — porous pumice and cooling magma trails.
 * - 2 Basalt Crags & Heat Fissures — dark ridges and glowing heat cracks.
 * - 3 Ashfall & Magma Channels — drifting ash and molten streams.
 * - 4 Roaring Magma Core — churning magma and high-tier creatures.
 *
 * Hơi nóng (hoinong_nuilua) and dung nham (dungnham_nuilua) are 8× hazards
 * kept off every gate.
 */
export function generateVolcano(
  zoneId: string,
  width: number,
  height: number,
  zones: readonly MapZone[],
): VolcanoDressing {
  const ctx = zoneCtx(`${zoneId}:volcano-map`, width, height, zones);
  const { rng } = ctx;
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const add = (bucket: Rect[], rect: Rect | null) => {
    if (rect) bucket.push(rect);
    return rect;
  };

  const ash = VOLCANO_DENSITY.ash;
  for (let index = 0; index < ash.soil; index += 1) {
    const w = 160 + rng() * 140;
    add(soft, placeIn(ctx, 0, { w, h: w * 0.38, kind: 'ashsoil', fill: ASH[index % ASH.length] }, false, false, 0.22));
  }
  for (let index = 0; index < ash.vents; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 36, h: 40, kind: 'sulfurvent', fill: '#d4c43a' }, false));
  }
  for (let index = 0; index < ash.drift; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 90 + rng() * 70, h: 34 + rng() * 14, kind: 'ashdrift', fill: 'rgba(180, 180, 184, 0.35)' }, false));
  }
  for (let index = 0; index < ash.rocks; index += 1) {
    add(solids, placeIn(ctx, 0, { ...VOLCANO_HITBOX.volrock, kind: 'volrock', fill: '#5a5e64' }, true));
  }

  const flats = VOLCANO_DENSITY.pumice;
  for (let index = 0; index < flats.pads; index += 1) {
    const w = 120 + rng() * 100;
    add(soft, placeIn(ctx, 1, { w, h: w * 0.36, kind: 'pumice', fill: PUMICE[index % PUMICE.length] }, false));
  }
  for (let index = 0; index < flats.trails; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 180 + rng() * 120, h: 28 + rng() * 12, kind: 'magmachannel', fill: '#bf360c' }, false));
  }
  for (let index = 0; index < flats.stones; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 32 + rng() * 20, h: 22 + rng() * 10, kind: 'pumice', fill: '#b0a8a0' }, false));
  }
  for (let index = 0; index < flats.ash; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 100 + rng() * 60, h: 32, kind: 'ashdrift', fill: 'rgba(74, 78, 84, 0.4)' }, false));
  }

  const crags = VOLCANO_DENSITY.basalt;
  for (let index = 0; index < crags.ridges; index += 1) {
    const w = 180 + rng() * 140;
    add(soft, placeIn(ctx, 2, { w, h: w * 0.34, kind: 'basalt', fill: VOLCANO_BASALT }, false));
  }
  for (let index = 0; index < crags.cracks; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 140 + rng() * 80, h: 18 + rng() * 8, kind: 'heatcrack', fill: pick(rng, GLOW) }, false));
  }
  for (let index = 0; index < crags.crags; index += 1) {
    const scale = 0.85 + rng() * 0.4;
    add(
      solids,
      placeIn(
        ctx,
        2,
        {
          w: VOLCANO_HITBOX.basaltcrag.w * scale,
          h: VOLCANO_HITBOX.basaltcrag.h * scale,
          kind: 'basaltcrag',
          fill: '#1a1d22',
        },
        true,
      ),
    );
  }
  for (let index = 0; index < crags.glow; index += 1) {
    add(soft, placeIn(ctx, 2, { w: 70, h: 110, kind: 'ember', fill: 'rgba(255, 87, 34, 0.22)' }, false, true));
  }

  const channels = VOLCANO_DENSITY.channels;
  for (let index = 0; index < channels.magma; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 200 + rng() * 140, h: 32 + rng() * 14, kind: 'magmachannel', fill: VOLCANO_MAGMA }, false));
  }
  for (let index = 0; index < channels.ash; index += 1) {
    const w = 220 + rng() * 160;
    add(soft, placeIn(ctx, 3, { w, h: w * 0.28, kind: 'ashdrift', fill: 'rgba(90, 90, 94, 0.28)' }, false, true));
  }
  for (let index = 0; index < channels.cracks; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 120 + rng() * 80, h: 20, kind: 'heatcrack', fill: '#e64a19' }, false));
  }
  for (let index = 0; index < channels.rocks; index += 1) {
    add(solids, placeIn(ctx, 3, { ...VOLCANO_HITBOX.volrock, kind: 'volrock', fill: '#3a3e44' }, true));
  }

  const core = VOLCANO_DENSITY.core;
  for (let index = 0; index < core.magma; index += 1) {
    const w = 160 + rng() * 130;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.4, kind: 'magmachannel', fill: VOLCANO_CRIMSON }, false));
  }
  for (let index = 0; index < core.crags; index += 1) {
    add(solids, placeIn(ctx, 4, { ...VOLCANO_HITBOX.basaltcrag, kind: 'basaltcrag', fill: '#12151a' }, true));
  }
  for (let index = 0; index < core.glow; index += 1) {
    add(soft, placeIn(ctx, 4, { w: 90, h: 130, kind: 'ember', fill: 'rgba(255, 87, 34, 0.3)' }, false, true));
  }
  for (let index = 0; index < core.cracks; index += 1) {
    add(soft, placeIn(ctx, 4, { w: 160 + rng() * 80, h: 22, kind: 'heatcrack', fill: '#FF5722' }, false));
  }

  for (let index = 0; index < VOLCANO_DENSITY.hoinong_nuilua; index += 1) {
    add(soft, placeHazard(ctx, 'hoinong_nuilua', [1, 3, 4]));
  }
  for (let index = 0; index < VOLCANO_DENSITY.dungnham_nuilua; index += 1) {
    add(soft, placeHazard(ctx, 'dungnham_nuilua', [2, 3, 4]));
  }

  for (let index = 0; index < VOLCANO_DENSITY.embers; index += 1) {
    soft.push({
      x: rng() * width,
      y: rng() * height,
      w: 6 + rng() * 8,
      h: 6 + rng() * 8,
      kind: 'ember',
      fill: pick(rng, GLOW),
      drift: { vx: (rng() - 0.5) * 16, vy: -18 - rng() * 22 },
    });
  }

  return { soft, solids };
}
