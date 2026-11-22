import type { FieldState, MapZone, Rect } from './types';
import { pick, placeHazard, placeIn, zoneCtx } from './zoneDecor';

export type ForestDressing = { soft: Rect[]; solids: Rect[] };

export const FOREST_MOSS = '#7CB342';
export const FOREST_LITTER = '#33691E';
export const FOREST_CORE = '#1A2E14';

/** Ancient trunks only come from the zoned hunting map and sit clear of the pads. */
export function forestNeedsDressing(field: FieldState): boolean {
  return field.provinceId === 'forest' && field.chunkSize > 0 && field.tier >= 1 && !field.blocks.some((rect) => rect.kind === 'foresttree');
}

export const FOREST_DENSITY = {
  edge: { moss: 18, flowers: 28, sunbeams: 10, ferns: 12, trees: 10, shrooms: 8 },
  thicket: { litter: 12, ferns: 28, logs: 12, shrooms: 14, trees: 8 },
  grove: { trees: 22, vines: 24, roots: 8, shrooms: 10 },
  bramble: { fog: 14, trees: 14, eyes: 18, ferns: 8, vines: 10 },
  core: { litter: 10, ruins: 6, trees: 10, spores: 16, fog: 8, eyes: 12, shrooms: 10 },
  dayleo: 6,
  buigai: 6,
};

export const FOREST_HITBOX = {
  foresttree: { w: 56, h: 40 },
  log: { w: 120, h: 32 },
  rootwall: { w: 110, h: 40 },
  rootruin: { w: 140, h: 72 },
};

const FLOWER = ['#e07a8a', '#f2d36b', '#8ec5e8', '#f6f1e7'];
const SHROOM = ['#c4474a', '#7a4ea8', '#d4e07a', '#38e0ff'];
const EYE = ['#ffe680', '#ff6b4a'];

/**
 * Rừng Rậm hunting map, dressed per hidden zone from `buildZones`:
 *
 * - 0 Sunlit Canopy Edge — moss grass, flowers, sunbeams, sparse trunks.
 * - 1 Fern & Rotting Log Thicket — fern beds, fallen logs, leaf litter.
 * - 2 Vine-Draped Grove — hanging vines, massive trunks, root barriers.
 * - 3 Foggy Bramble Woods — mist, hidden eyes on trunks.
 * - 4 Abyssal Primeval Core — dark litter, root-swallowed ruins, spores.
 *
 * Dây leo (dayleo) and bụi gai (buigai) are 8× hazards kept off every gate.
 */
export function generateForest(zoneId: string, width: number, height: number, zones: readonly MapZone[]): ForestDressing {
  const ctx = zoneCtx(`${zoneId}:forest-map`, width, height, zones);
  const { rng } = ctx;
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  const add = (bucket: Rect[], rect: Rect | null) => {
    if (rect) bucket.push(rect);
    return rect;
  };
  const trees = (zone: number, count: number) => {
    const placed: Rect[] = [];
    for (let index = 0; index < count; index += 1) {
      const scale = 0.85 + rng() * 0.45;
      const tree = add(
        solids,
        placeIn(ctx, zone, { w: FOREST_HITBOX.foresttree.w * scale, h: FOREST_HITBOX.foresttree.h * scale, kind: 'foresttree', fill: '#2a1c12' }, true),
      );
      if (tree) placed.push(tree);
    }
    return placed;
  };
  const shroomsNear = (zone: number, count: number, roots: readonly Rect[]) => {
    for (let index = 0; index < count; index += 1) {
      const root = roots.length > 0 ? roots[index % roots.length] : undefined;
      const at = root ? { x: root.x + (rng() > 0.5 ? root.w + 16 : -16), y: root.y + root.h - 4 } : undefined;
      add(soft, placeIn(ctx, zone, { w: 22, h: 20, kind: 'forestshroom', fill: pick(rng, SHROOM), at }, false));
    }
  };
  const eyesOn = (zone: number, count: number, trunks: readonly Rect[]) => {
    for (let index = 0; index < count; index += 1) {
      const trunk = trunks.length > 0 ? trunks[index % trunks.length] : undefined;
      const at = trunk ? { x: trunk.x + trunk.w / 2, y: trunk.y - 8 } : undefined;
      add(soft, placeIn(ctx, zone, { w: 28, h: 14, kind: 'watcheye', fill: pick(rng, EYE), at }, false, true));
    }
  };

  const edge = FOREST_DENSITY.edge;
  for (let index = 0; index < edge.moss; index += 1) {
    const w = 140 + rng() * 120;
    add(soft, placeIn(ctx, 0, { w, h: w * 0.4, kind: 'mossgrass', fill: FOREST_MOSS }, false, false, 0.22));
  }
  for (let index = 0; index < edge.flowers; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 22, h: 22, kind: 'wildflower', fill: pick(rng, FLOWER) }, false));
  }
  for (let index = 0; index < edge.sunbeams; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 70, h: 160, kind: 'sunbeam', fill: 'rgba(255, 244, 170, 0.16)' }, false, true));
  }
  for (let index = 0; index < edge.ferns; index += 1) {
    add(soft, placeIn(ctx, 0, { w: 50, h: 40, kind: 'fern' }, false));
  }
  const edgeTrees = trees(0, edge.trees);
  shroomsNear(0, edge.shrooms, edgeTrees);

  const thicket = FOREST_DENSITY.thicket;
  for (let index = 0; index < thicket.litter; index += 1) {
    const w = 160 + rng() * 120;
    add(soft, placeIn(ctx, 1, { w, h: w * 0.42, kind: 'leaflitter', fill: FOREST_LITTER }, false));
  }
  for (let index = 0; index < thicket.ferns; index += 1) {
    add(soft, placeIn(ctx, 1, { w: 56, h: 44, kind: 'fern' }, false));
  }
  for (let index = 0; index < thicket.logs; index += 1) {
    add(solids, placeIn(ctx, 1, { ...FOREST_HITBOX.log, kind: 'log', fill: '#5c4030' }, true));
  }
  const thicketTrees = trees(1, thicket.trees);
  shroomsNear(1, thicket.shrooms, thicketTrees);

  const grove = FOREST_DENSITY.grove;
  const groveTrees = trees(2, grove.trees);
  for (let index = 0; index < grove.vines; index += 1) {
    const trunk = groveTrees[index % Math.max(1, groveTrees.length)];
    const at = trunk ? { x: trunk.x + trunk.w / 2, y: trunk.y - 20 } : undefined;
    add(soft, placeIn(ctx, 2, { w: 36, h: 90, kind: 'hangingvine', at }, false, true));
  }
  for (let index = 0; index < grove.roots; index += 1) {
    add(solids, placeIn(ctx, 2, { ...FOREST_HITBOX.rootwall, kind: 'rootwall', fill: '#3a2a1c' }, true));
  }
  shroomsNear(2, grove.shrooms, groveTrees);

  const bramble = FOREST_DENSITY.bramble;
  for (let index = 0; index < bramble.fog; index += 1) {
    const w = 320 + rng() * 240;
    add(soft, placeIn(ctx, 3, { w, h: w * 0.32, kind: 'forestfog', fill: 'rgba(176, 196, 168, 0.16)' }, false, true));
  }
  const brambleTrees = trees(3, bramble.trees);
  eyesOn(3, bramble.eyes, brambleTrees);
  for (let index = 0; index < bramble.ferns; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 50, h: 40, kind: 'fern' }, false));
  }
  for (let index = 0; index < bramble.vines; index += 1) {
    add(soft, placeIn(ctx, 3, { w: 36, h: 90, kind: 'hangingvine' }, false, true));
  }

  const core = FOREST_DENSITY.core;
  for (let index = 0; index < core.litter; index += 1) {
    const w = 180 + rng() * 140;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.4, kind: 'leaflitter', fill: FOREST_CORE }, false));
  }
  for (let index = 0; index < core.ruins; index += 1) {
    add(solids, placeIn(ctx, 4, { ...FOREST_HITBOX.rootruin, kind: 'rootruin', fill: '#4a4f48' }, true));
  }
  const coreTrees = trees(4, core.trees);
  eyesOn(4, core.eyes, coreTrees);
  shroomsNear(4, core.shrooms, coreTrees);
  for (let index = 0; index < core.spores; index += 1) {
    add(soft, placeIn(ctx, 4, { w: 16, h: 16, kind: 'spore', fill: index % 2 === 0 ? '#38f5ff' : '#b46bff' }, false, true));
  }
  for (let index = 0; index < core.fog; index += 1) {
    const w = 360 + rng() * 220;
    add(soft, placeIn(ctx, 4, { w, h: w * 0.34, kind: 'forestfog', fill: 'rgba(40, 20, 60, 0.22)' }, false, true));
  }

  for (let index = 0; index < FOREST_DENSITY.dayleo; index += 1) {
    add(soft, placeHazard(ctx, 'dayleo', [1, 2, 3]));
  }
  for (let index = 0; index < FOREST_DENSITY.buigai; index += 1) {
    add(soft, placeHazard(ctx, 'buigai', [2, 3, 4]));
  }

  return { soft, solids };
}
