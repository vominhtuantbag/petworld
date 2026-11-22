import { useRef } from 'react';

import type { WalkDir } from './characterWalk';

/** 1 faces right, -1 faces left. Mostly vertical steps keep the last face. */
export function stepHorizontalFacing(facing: 1 | -1, dx: number, epsilon = 0.35, dy = 0): 1 | -1 {
  if (Math.abs(dx) <= epsilon) return facing;
  if (dy !== 0 && Math.abs(dx) < Math.abs(dy) * 0.45) return facing;
  return dx > 0 ? 1 : -1;
}

/** Four-way facing for directional walk sheets. Dominant axis wins. */
export function stepCardinalFacing(facing: WalkDir, dx: number, dy: number, epsilon = 0.35): WalkDir {
  if (Math.hypot(dx, dy) <= epsilon) return facing;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/**
 * Nữ hộ vệ is the reference sheet: the unflipped picture faces right.
 * The other class sheets were repainted the same way, so they use her sign.
 * Returning false keeps a step to the right unmirrored.
 */
export function portraitFacesRight(_professionId?: string, _gender?: string): boolean {
  return false;
}

/** scaleX for a class portrait that should look along `facing` (1 right, -1 left). */
export function portraitScaleX(facing: 1 | -1, professionId?: string, gender?: string): number {
  return facing * (portraitFacesRight(professionId, gender) ? -1 : 1);
}

/** Reads the step the map already rendered. Does not schedule another update. */
export function useHorizontalFacing(x: number, y: number, epsilon = 0.12): 1 | -1 {
  const last = useRef({ x, y });
  const facing = useRef<1 | -1>(1);
  facing.current = stepHorizontalFacing(facing.current, x - last.current.x, epsilon, y - last.current.y);
  last.current = { x, y };
  return facing.current;
}
