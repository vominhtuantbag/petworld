import type { Rect } from './types';

/**
 * Spawn spacing for Sa mạc and Đồng bằng. The collision foot is smaller than
 * the painted picture, so overlap uses the picture. Numbers match DesertProp
 * and PlainsProp. Sunlight bands are not models and never block a spawn.
 *
 * Ground cover (flowers, grass, straw) may share space with other ground
 * cover. A dune, rock, tree, cactus, or hazard may not touch any of them.
 */

export const PROP_GAP = 36;
export const PLACE_TRIES = 64;

type Paint = { foot: number; w: number; h: number; anchor: 'base' | 'center' };
export type MapArt = 'desert' | 'plains';

const DESERT: Record<string, Paint> = {
  dune: { foot: 220, w: 300, h: 71, anchor: 'base' },
  rock: { foot: 96, w: 150, h: 93, anchor: 'base' },
  oasis: { foot: 200, w: 250, h: 196, anchor: 'base' },
  cactus: { foot: 40, w: 78, h: 112, anchor: 'base' },
  crack: { foot: 301, w: 301, h: 162, anchor: 'center' },
  quicksand: { foot: 236, w: 236, h: 176, anchor: 'center' },
  straw: { foot: 150, w: 188, h: 45, anchor: 'center' },
};

const PLAINS: Record<string, Paint> = {
  tree: { foot: 108, w: 156, h: 80, anchor: 'base' },
  rock: { foot: 58, w: 74, h: 54, anchor: 'base' },
  pile: { foot: 118, w: 156, h: 78, anchor: 'base' },
  puddle: { foot: 283, w: 283, h: 169, anchor: 'center' },
};

const STRUCTURE = new Set([
  'dune',
  'rock',
  'oasis',
  'cactus',
  'tree',
  'pile',
  'crack',
  'quicksand',
  'puddle',
  'saguaro',
  'barrel',
  'bunny',
  'palm',
]);

export function isStructure(kind: Rect['kind']): boolean {
  return kind != null && STRUCTURE.has(kind);
}

/** Picture rectangle for one placed prop. Kinds without a sprite box use the foot. */
export function paintedBounds(rect: Rect, art: MapArt): Rect {
  const box = (art === 'desert' ? DESERT : PLAINS)[rect.kind ?? ''];
  if (!box || box.foot <= 0 || rect.w <= 0) return rect;
  const scale = rect.w / box.foot;
  const w = box.w * scale;
  const h = box.h * scale;
  return {
    x: rect.x + rect.w / 2 - w / 2,
    y: box.anchor === 'base' ? rect.y + rect.h - h : rect.y + rect.h / 2 - h / 2,
    w,
    h,
    kind: rect.kind,
  };
}

export function spritesOverlap(a: Rect, b: Rect, art: MapArt, gap = PROP_GAP): boolean {
  const pa = paintedBounds(a, art);
  const pb = paintedBounds(b, art);
  return pa.x < pb.x + pb.w + gap && pa.x + pa.w + gap > pb.x && pa.y < pb.y + pb.h + gap && pa.y + pa.h + gap > pb.y;
}

/** True when `incoming` would stack on `existing`. Ground cover may overlap other ground cover. */
export function placementBlocked(incoming: Rect, existing: Rect, art: MapArt): boolean {
  if (incoming.kind === 'light' || existing.kind === 'light') return false;
  if (!isStructure(incoming.kind) && !isStructure(existing.kind)) return false;
  return spritesOverlap(incoming, existing, art);
}
