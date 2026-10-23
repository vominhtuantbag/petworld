export type DustMote = {
  id: number;
  x: number;
  y: number;
  born: number;
  life: number;
  /** World-space travel over the mote's life. Forward plus a side flare. */
  vx: number;
  vy: number;
  size: number;
};

export type StridePose = {
  bob: number;
  sway: number;
  tilt: number;
  breathX: number;
  breathY: number;
  dust: DustMote[];
  now: number;
};

type StrideClock = {
  phase: number;
  weight: number;
  last: number;
  stepSign: number;
  trickle: number;
  nextId: number;
  dust: DustMote[];
};

const STEP_RATE = 11;
const STEP_HEIGHT = 3.4;
const TILT = 4.2;
const REST_MS = 100;

export function createStride(): StrideClock {
  return { phase: 0, weight: 0, last: 0, stepSign: 1, trickle: 0, nextId: 1, dust: [] };
}

/**
 * One walk sample for the frame the map already renders. No extra update.
 * Stopping eases bob, tilt, and squash back to rest in 100ms.
 * The weapon sits in the painted sprite, so its sway is the same body
 * with a half-step phase lead.
 */
export function advanceStride(
  clock: StrideClock,
  moving: boolean,
  x: number,
  y: number,
  dx = 0,
  dy = 0,
  now = Date.now(),
): StridePose {
  const dt = clock.last === 0 ? 0 : Math.min(0.05, Math.max(0, (now - clock.last) / 1000));
  clock.last = now;
  if (moving) {
    clock.phase += dt * STEP_RATE;
    clock.weight = 1;
  } else {
    clock.weight = Math.max(0, clock.weight - (dt * 1000) / REST_MS);
  }

  const weight = clock.weight;
  const bob = Math.sin(clock.phase) * STEP_HEIGHT * weight;
  const tilt = Math.sin(clock.phase) * TILT * weight;
  const pulse = Math.sin(clock.phase * 2) * weight;
  const breathY = 1 + pulse * 0.045;
  const breathX = 1 - pulse * 0.032;
  const sway = Math.sin(clock.phase + Math.PI / 2) * 1.7 * weight;

  const plant = Math.sin(clock.phase);
  if (moving) {
    const crossed = clock.stepSign !== 0 && plant !== 0 && Math.sign(plant) !== Math.sign(clock.stepSign);
    if (crossed) puff(clock, x, y, dx, dy, now, 8);
    clock.trickle += dt;
    if (clock.trickle >= 0.028) {
      clock.trickle = 0;
      puff(clock, x, y, dx, dy, now, 3);
    }
  }
  clock.stepSign = plant === 0 ? clock.stepSign : Math.sign(plant);
  if (clock.dust.length > 0) {
    clock.dust = clock.dust.filter((mote) => now - mote.born < mote.life);
  }

  return { bob, sway, tilt, breathX, breathY, dust: clock.dust, now };
}

/**
 * Dust leaves the feet along the step, then flares to both sides in front
 * so the trail opens like a bow wave.
 */
function puff(clock: StrideClock, x: number, y: number, dx: number, dy: number, now: number, count: number) {
  const span = Math.hypot(dx, dy) || 1;
  const fx = dx / span;
  const fy = dy / span;
  const sx = -fy;
  const sy = fx;
  for (let i = 0; i < count; i += 1) {
    const id = clock.nextId;
    clock.nextId += 1;
    const side = id % 2 === 0 ? 1 : -1;
    const flare = 26 + (id % 5) * 6;
    const ahead = 16 + (id % 3) * 5;
    clock.dust.push({
      id,
      x: x + fx * 8 + sx * side * 3,
      y: y + 24 + fy * 8 + sy * side * 3,
      born: now,
      life: 680 + (id % 5) * 40,
      vx: fx * ahead + sx * side * flare,
      vy: fy * ahead + sy * side * flare,
      size: 3 + (id % 4),
    });
  }
  if (clock.dust.length > 36) clock.dust.splice(0, clock.dust.length - 36);
}
