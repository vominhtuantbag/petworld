import { hashString, mulberry32 } from './grid';
import type { Rect } from './types';

/**
 * A light scatter for biomes that do not have their own dresser yet.
 * The count does not grow with the map, so forest, ocean, and the rest
 * stay cheap on the 10× hunting maps.
 */
export function generateScatter(zoneId: string, width: number, height: number): { soft: Rect[]; solids: Rect[] } {
  const rng = mulberry32(hashString(`${zoneId}:scatter`));
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  for (let index = 0; index < 22; index += 1) {
    soft.push({
      x: 70 + rng() * (width - 180),
      y: 70 + rng() * (height - 180),
      w: 24 + rng() * 30,
      h: 12 + rng() * 14,
      kind: 'grass',
      fill: 'rgba(255,255,255,0.14)',
    });
  }
  for (let index = 0; index < 8; index += 1) {
    solids.push({
      x: 90 + rng() * (width - 240),
      y: 90 + rng() * (height - 240),
      w: 46,
      h: 36,
      kind: 'tree',
      fill: 'rgba(0,0,0,0.28)',
    });
  }
  for (let index = 0; index < 6; index += 1) {
    solids.push({
      x: 90 + rng() * (width - 240),
      y: 90 + rng() * (height - 240),
      w: 40,
      h: 28,
      kind: 'rock',
      fill: 'rgba(0,0,0,0.22)',
    });
  }
  return { soft, solids };
}
