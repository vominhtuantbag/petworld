import { EMPTY_STAMINA_PACE, PLAYER_SPEED, TOWN_SPEED } from '../../world/sim';

/** Field locomotion feel: open-map run, town walk, empty-SP crawl. */
export type PlayerGaitId = 'run' | 'walk' | 'crawl';

export type GaitFeel = {
  /** Multiplier on stride STEP_RATE. */
  cadence: number;
  bob: number;
  tilt: number;
  sway: number;
  /** Vertical squash of the drawn body (1 = upright). */
  squash: number;
  /** Forward lean in degrees (crawl leans into the path). */
  lean: number;
  /** Limb swing amplitude in degrees. */
  swing: number;
};

const FEEL: Record<PlayerGaitId, GaitFeel> = {
  crawl: { cadence: 0.42, bob: 1.1, tilt: 2.2, sway: 0.8, squash: 0.62, lean: 18, swing: 10 },
  walk: { cadence: 0.72, bob: 2.4, tilt: 3.4, sway: 1.4, squash: 0.94, lean: 2, swing: 16 },
  run: { cadence: 1, bob: 3.6, tilt: 5.2, sway: 2.1, squash: 1, lean: 0, swing: 26 },
};

/** Which gait the sim speed rules imply right now. */
export function targetPlayerGait(inTown: boolean, stamina: number | undefined, moving: boolean): PlayerGaitId {
  if (!moving) {
    if (inTown) return 'walk';
    if (stamina != null && stamina <= 0) return 'crawl';
    return 'run';
  }
  if (inTown) return 'walk';
  if (stamina != null && stamina <= 0) return 'crawl';
  return 'run';
}

/** 0 = crawl, 0.5 = walk, 1 = run — for smooth blending. */
export function gaitAxis(id: PlayerGaitId): number {
  if (id === 'crawl') return 0;
  if (id === 'walk') return 0.5;
  return 1;
}

export function feelFromAxis(axis: number): GaitFeel {
  const t = Math.max(0, Math.min(1, axis));
  if (t <= 0.5) {
    const u = t / 0.5;
    return mixFeel(FEEL.crawl, FEEL.walk, u);
  }
  const u = (t - 0.5) / 0.5;
  return mixFeel(FEEL.walk, FEEL.run, u);
}

function mixFeel(a: GaitFeel, b: GaitFeel, u: number): GaitFeel {
  const lerp = (x: number, y: number) => x + (y - x) * u;
  return {
    cadence: lerp(a.cadence, b.cadence),
    bob: lerp(a.bob, b.bob),
    tilt: lerp(a.tilt, b.tilt),
    sway: lerp(a.sway, b.sway),
    squash: lerp(a.squash, b.squash),
    lean: lerp(a.lean, b.lean),
    swing: lerp(a.swing, b.swing),
  };
}

/** Ease the blend axis toward the target each frame. */
export function easeGaitAxis(current: number, target: PlayerGaitId, dt: number): number {
  const goal = gaitAxis(target);
  const rate = target === 'crawl' ? 3.2 : 4.6;
  const next = current + (goal - current) * Math.min(1, dt * rate);
  if (Math.abs(next - goal) < 0.004) return goal;
  return next;
}

/** Reference speeds (px/s) used for docs / UI — keep in sync with sim.ts. */
export const GAIT_SPEEDS = {
  run: PLAYER_SPEED,
  walk: TOWN_SPEED,
  crawl: PLAYER_SPEED * EMPTY_STAMINA_PACE,
} as const;
