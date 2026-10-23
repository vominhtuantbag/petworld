import { hashString, mulberry32 } from './grid';
import type { Rect } from './types';

/**
 * Sparse acacia plain. Counts stay fixed when the map grows, so a 10×
 * hunting map does not plant ten times the trees. The gate pads are
 * cleared later by `clearPads`.
 */

export const SAVANNAH_GRASS = '#c9a24e';

const ACACIA = { w: 54, h: 28 };
const ROCK = { w: 40, h: 26 };

export function generateSavannah(zoneId: string, width: number, height: number): { soft: Rect[]; solids: Rect[] } {
  const rng = mulberry32(hashString(`${zoneId}:savannah`));
  const soft: Rect[] = [];
  const solids: Rect[] = [];
  for (let index = 0; index < 6; index += 1) {
    soft.push({
      x: -80,
      y: (height / 6) * index,
      w: width + 160,
      h: 90,
      kind: 'light',
      fill: index % 2 === 0 ? 'rgba(255, 214, 120, 0.28)' : 'rgba(120, 90, 30, 0.12)',
    });
  }
  for (let index = 0; index < 36; index += 1) {
    soft.push({
      x: 80 + rng() * (width - 200),
      y: 80 + rng() * (height - 200),
      w: 28 + rng() * 40,
      h: 14 + rng() * 12,
      kind: 'grass',
      fill: rng() > 0.5 ? 'rgba(196, 168, 64, 0.7)' : 'rgba(90, 120, 48, 0.55)',
    });
  }
  for (let index = 0; index < 14; index += 1) {
    solids.push({
      x: 100 + rng() * (width - 260),
      y: 100 + rng() * (height - 260),
      w: ACACIA.w,
      h: ACACIA.h,
      kind: 'acacia',
      fill: rng() > 0.4 ? '#6f8f3a' : '#8aa64a',
    });
  }
  for (let index = 0; index < 8; index += 1) {
    solids.push({
      x: 100 + rng() * (width - 260),
      y: 100 + rng() * (height - 260),
      w: ROCK.w,
      h: ROCK.h,
      kind: 'rock',
      fill: rng() > 0.5 ? '#b08968' : '#8c6a4a',
    });
  }
  return { soft, solids };
}
