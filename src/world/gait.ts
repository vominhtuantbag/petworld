import { locomotionTypeOf, type LocomotionType } from './combat/petSkills';
import { zoneIndexAt } from './tiers';
import type { FieldState, MonsterActor, Vec } from './types';

/**
 * Field locomotion planner. Biological type (BIPEDAL…PULSATING_FLOAT) picks
 * the step shape; agro still chooses the target. The sim clamps to the zone.
 *
 * Wet tiles force swim weave unless the species is a hopper (keeps hopping).
 */

export type Gait = 'stride' | 'trot' | 'hop' | 'slither' | 'scuttle' | 'burst' | 'swim' | 'fly' | 'pulse';
export type SpriteProfile = 'side' | 'front';

export type Locomotion = {
  gait: Gait;
  /** Species speed multiplier. The tortoise creeps. The mouse and boar trot. */
  pace: number;
  profile: SpriteProfile;
  /** The drawn art looks to the right when this is true. */
  facesRight: boolean;
  locomotionType: LocomotionType;
};

const TYPE_GAIT: Record<LocomotionType, Gait> = {
  BIPEDAL: 'stride',
  QUADRUPEDAL: 'trot',
  MULTI_LEGGED: 'scuttle',
  SLITHERING: 'slither',
  LEAPING: 'hop',
  AERIAL: 'fly',
  SWIMMING: 'swim',
  PULSATING_FLOAT: 'pulse',
};

const TYPE_DEFAULTS: Record<LocomotionType, Omit<Locomotion, 'gait' | 'locomotionType'>> = {
  BIPEDAL: { pace: 1, profile: 'front', facesRight: true },
  QUADRUPEDAL: { pace: 1, profile: 'side', facesRight: true },
  MULTI_LEGGED: { pace: 0.95, profile: 'front', facesRight: true },
  SLITHERING: { pace: 1, profile: 'side', facesRight: true },
  LEAPING: { pace: 0.9, profile: 'front', facesRight: true },
  AERIAL: { pace: 1.15, profile: 'side', facesRight: true },
  SWIMMING: { pace: 1, profile: 'side', facesRight: true },
  PULSATING_FLOAT: { pace: 0.55, profile: 'front', facesRight: true },
};

/** Per-species fine-tunes (pace / facing / scuttle→burst for scorpions). */
const SPECIES_MOTION: Record<string, Partial<Omit<Locomotion, 'locomotionType'>>> = {
  'plains-rabbit': { pace: 1.05, profile: 'side' },
  'plains-mouse': { pace: 1.7, profile: 'side' },
  'plains-tree-frog': { pace: 1, profile: 'front' },
  'plains-paddy-toad': { pace: 0.82, profile: 'front' },
  'plains-field-crab': { pace: 0.95, profile: 'front' },
  'plains-tortoise': { pace: 0.2, profile: 'front' },
  'plains-charcoal-scorpion': { gait: 'burst', pace: 1.25, profile: 'side', facesRight: false },
  'plains-grass-snake': { pace: 1, profile: 'side' },
  'plains-porcupine': { pace: 0.85, profile: 'front' },
  'plains-boar': { pace: 1.6, profile: 'side' },
  'desert-emperor-scorpion': { gait: 'burst', pace: 1.2, facesRight: false },
  'volcano-rock-scorpion': { gait: 'burst', pace: 1.15, facesRight: false },
};

export function locomotion(kindId: string, locomotionType?: LocomotionType | null): Locomotion {
  const type = locomotionTypeOf({ kindId, locomotionType });
  const defaults = TYPE_DEFAULTS[type];
  const tuned = SPECIES_MOTION[kindId] ?? {};
  return {
    locomotionType: type,
    gait: tuned.gait ?? TYPE_GAIT[type],
    pace: tuned.pace ?? defaults.pace,
    profile: tuned.profile ?? defaults.profile,
    facesRight: tuned.facesRight ?? defaults.facesRight,
  };
}

export function isWaterKind(kind: string | undefined): boolean {
  return kind === 'puddle' || kind === 'oasis' || kind === 'lily';
}

export type LocomotionStep = {
  x: number;
  y: number;
  gait: Gait;
  phase: number;
  facing: number;
  gaitTimer: number;
  hopT: number;
  hopFromX: number;
  hopFromY: number;
  hopToX: number;
  hopToY: number;
  patrolIndex: number;
  patrol: Vec[];
};

type Input = {
  monster: MonsterActor;
  target: Vec;
  chasing: boolean;
  dt: number;
  /** Cruise speed for this frame, before the species pace multiplier. */
  speed: number;
  field: FieldState;
  wet: boolean;
};

const HOP_TIME = 0.36;

export function planLocomotion(input: Input): LocomotionStep {
  const motion = locomotion(input.monster.kindId);
  let gait: Gait = motion.gait;
  if (input.wet && motion.locomotionType !== 'LEAPING' && motion.locomotionType !== 'AERIAL') {
    gait = motion.locomotionType === 'PULSATING_FLOAT' ? 'pulse' : 'swim';
  }
  const step = read(input.monster, gait);
  const speed = input.speed * motion.pace;
  if (gait === 'hop') return hop(input, step, motion.pace);
  if (gait === 'slither') return weave(input, step, speed, 7.5, 0.7, 1);
  if (gait === 'scuttle') return scuttle(input, step, speed);
  if (gait === 'burst') return burst(input, step, speed);
  if (gait === 'swim') return weave(input, step, speed * 0.78, 2.6, 0.42, 1);
  if (gait === 'fly') return fly(input, step, speed);
  if (gait === 'pulse') return pulse(input, step, speed);
  if (gait === 'stride') return trot(input, step, speed, 10);
  return trot(input, step, speed, 8);
}

function read(monster: MonsterActor, gait: Gait): LocomotionStep {
  return {
    x: monster.x,
    y: monster.y,
    gait,
    phase: monster.phase ?? 0,
    facing: monster.facing ?? 0,
    gaitTimer: monster.gaitTimer ?? 0,
    hopT: monster.hopT ?? 0,
    hopFromX: monster.hopFromX ?? monster.x,
    hopFromY: monster.hopFromY ?? monster.y,
    hopToX: monster.hopToX ?? monster.x,
    hopToY: monster.hopToY ?? monster.y,
    patrolIndex: monster.patrolIndex,
    patrol: monster.patrol,
  };
}

/** Bipedal / quadrupedal walk: a straight step, then a new random point inside the zone. */
function trot(input: Input, step: LocomotionStep, speed: number, phaseRate: number): LocomotionStep {
  const dir = unit(input.target.x - step.x, input.target.y - step.y);
  const x = step.x + dir.x * speed * input.dt;
  const y = step.y + dir.y * speed * input.dt;
  const moving = speed > 1 && (dir.x !== 0 || dir.y !== 0);
  const turned = advancePatrol(input, step, x, y);
  return {
    ...step,
    x,
    y,
    phase: step.phase + input.dt * (moving ? phaseRate + speed * 0.04 : 1.4),
    facing: Math.atan2(dir.y, dir.x),
    patrol: turned.patrol,
    patrolIndex: turned.patrolIndex,
  };
}

/** Idle, then one quick jump toward a nearby point that stays in the zone. */
function hop(input: Input, step: LocomotionStep, pace: number): LocomotionStep {
  const phase = step.phase + input.dt * 2;
  if (step.hopT > 0 && step.hopT < 1) {
    const hopT = Math.min(1, step.hopT + input.dt / HOP_TIME);
    const x = step.hopFromX + (step.hopToX - step.hopFromX) * hopT;
    const y = step.hopFromY + (step.hopToY - step.hopFromY) * hopT;
    const facing = Math.atan2(step.hopToY - step.hopFromY, step.hopToX - step.hopFromX);
    if (hopT >= 1) {
      const gaitTimer = input.chasing ? 0.2 + Math.random() * 0.35 : 1 + Math.random() * 2;
      return { ...step, x, y, hopT: 0, gaitTimer, phase, facing };
    }
    return { ...step, x, y, hopT, phase, facing };
  }
  if (step.gaitTimer > 0) return { ...step, gaitTimer: step.gaitTimer - input.dt, phase };
  const reach = (input.chasing ? 88 + Math.random() * 48 : 52 + Math.random() * 64) * (0.75 + pace * 0.25);
  const aim = input.chasing ? toward(step, input.target, reach) : (nearby(input.monster, input.field, 48, reach) ?? toward(step, input.target, 36));
  if (!inside(aim.x, aim.y, input.monster, input.field)) return { ...step, gaitTimer: 0.6, phase };
  return {
    ...step,
    hopT: 0.001,
    hopFromX: step.x,
    hopFromY: step.y,
    hopToX: aim.x,
    hopToY: aim.y,
    gaitTimer: 0,
    phase,
    facing: Math.atan2(aim.y - step.y, aim.x - step.x),
  };
}

/**
 * Sideways strafe. The body faces 90° off the travel line, and the feet
 * only move during the short half of a fast step cycle.
 */
function scuttle(input: Input, step: LocomotionStep, speed: number): LocomotionStep {
  const phase = step.phase + input.dt;
  const desired = Math.atan2(input.target.y - step.y, input.target.x - step.x);
  const facing = approachAngle(step.facing, desired + Math.PI / 2, input.dt * 3);
  const cycle = input.chasing ? 0.1 : 0.15;
  const local = ((phase % cycle) + cycle) % cycle;
  const stepping = local < cycle * 0.45;
  let x = step.x;
  let y = step.y;
  if (stepping) {
    const velocity = speed * (input.chasing ? 1.65 : 1.2);
    x += Math.cos(desired) * velocity * input.dt;
    y += Math.sin(desired) * velocity * input.dt;
  }
  const turned = advancePatrol(input, step, x, y);
  return { ...step, x, y, phase, facing, patrol: turned.patrol, patrolIndex: turned.patrolIndex };
}

/** A short rush, then a still pause. Chasing shortens the pause. */
function burst(input: Input, step: LocomotionStep, speed: number): LocomotionStep {
  const rushing = step.gaitTimer <= 0;
  const phase = step.phase + input.dt * (rushing ? 18 : 2);
  if (step.gaitTimer > 0) {
    const gaitTimer = step.gaitTimer - input.dt;
    return { ...step, gaitTimer: gaitTimer > 0 ? gaitTimer : 0, phase };
  }
  const dir = unit(input.target.x - step.x, input.target.y - step.y);
  const velocity = speed * 1.7;
  const x = step.x + dir.x * velocity * input.dt;
  const y = step.y + dir.y * velocity * input.dt;
  let gaitTimer = (step.gaitTimer === 0 ? -0.28 : step.gaitTimer) + input.dt;
  if (gaitTimer >= 0) gaitTimer = input.chasing ? 0.12 + Math.random() * 0.18 : 0.32 + Math.random() * 0.4;
  const turned = advancePatrol(input, step, x, y);
  return {
    ...step,
    x,
    y,
    phase,
    facing: Math.atan2(dir.y, dir.x),
    gaitTimer,
    patrol: turned.patrol,
    patrolIndex: turned.patrolIndex,
  };
}

/** Snake slither and swim share a heading that weaves around the target line. */
function weave(input: Input, step: LocomotionStep, speed: number, freq: number, amp: number, pace: number): LocomotionStep {
  const phase = step.phase + input.dt * freq;
  const desired = Math.atan2(input.target.y - step.y, input.target.x - step.x);
  const heading = desired + Math.sin(phase) * amp;
  const velocity = speed * pace;
  const x = step.x + Math.cos(heading) * velocity * input.dt;
  const y = step.y + Math.sin(heading) * velocity * input.dt;
  const turned = advancePatrol(input, step, x, y);
  return {
    ...step,
    x,
    y,
    phase,
    facing: heading,
    patrol: turned.patrol,
    patrolIndex: turned.patrolIndex,
  };
}

/** Aerial glide — smooth banked path with a faster phase for wing bob. */
function fly(input: Input, step: LocomotionStep, speed: number): LocomotionStep {
  const phase = step.phase + input.dt * 5.2;
  const desired = Math.atan2(input.target.y - step.y, input.target.x - step.x);
  const heading = desired + Math.sin(phase * 0.55) * 0.35;
  const velocity = speed * (input.chasing ? 1.15 : 0.95);
  const x = step.x + Math.cos(heading) * velocity * input.dt;
  const y = step.y + Math.sin(heading) * velocity * input.dt;
  const turned = advancePatrol(input, step, x, y);
  return {
    ...step,
    x,
    y,
    phase,
    facing: heading,
    patrol: turned.patrol,
    patrolIndex: turned.patrolIndex,
  };
}

/** Pulsating float — slow drift; phase drives vertical bob / scale in the token. */
function pulse(input: Input, step: LocomotionStep, speed: number): LocomotionStep {
  const phase = step.phase + input.dt * 2.4;
  const desired = Math.atan2(input.target.y - step.y, input.target.x - step.x);
  const heading = desired + Math.sin(phase * 0.7) * 0.55;
  const velocity = speed * 0.65;
  const x = step.x + Math.cos(heading) * velocity * input.dt;
  const y = step.y + Math.sin(heading) * velocity * input.dt;
  const turned = advancePatrol(input, step, x, y);
  return {
    ...step,
    x,
    y,
    phase,
    facing: heading,
    patrol: turned.patrol,
    patrolIndex: turned.patrolIndex,
  };
}

function advancePatrol(input: Input, step: LocomotionStep, x: number, y: number): { patrol: Vec[]; patrolIndex: number } {
  const route = step.patrol;
  if (input.chasing || route.length === 0) return { patrol: route, patrolIndex: step.patrolIndex };
  if (Math.hypot(input.target.x - x, input.target.y - y) >= 18) return { patrol: route, patrolIndex: step.patrolIndex };
  const next = nearby(input.monster, input.field, 80, 220);
  const patrol = next ? route.slice() : route;
  if (next) patrol[step.patrolIndex % patrol.length] = next;
  return { patrol, patrolIndex: (step.patrolIndex + 1) % patrol.length };
}

function nearby(monster: MonsterActor, field: FieldState, min: number, max: number): Vec | null {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const reach = min + Math.random() * Math.max(0, max - min);
    const x = monster.x + Math.cos(angle) * reach;
    const y = monster.y + Math.sin(angle) * reach;
    if (inside(x, y, monster, field)) return { x, y };
  }
  return null;
}

function toward(step: LocomotionStep, target: Vec, reach: number): Vec {
  const dir = unit(target.x - step.x, target.y - step.y);
  const dist = Math.min(reach, Math.max(28, Math.hypot(target.x - step.x, target.y - step.y)));
  return { x: step.x + dir.x * dist, y: step.y + dir.y * dist };
}

function inside(x: number, y: number, monster: MonsterActor, field: FieldState): boolean {
  if (x < 36 || y < 36 || x > field.width - 36 || y > field.height - 36) return false;
  const zones = field.zones;
  if (!zones || zones.length === 0) {
    const rect = monster.bounds;
    return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
  }
  return zoneIndexAt(x, y, zones) === monster.zoneIndex;
}

function approachAngle(current: number, target: number, maxStep: number): number {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + Math.max(-maxStep, Math.min(maxStep, delta));
}

function unit(x: number, y: number): Vec {
  const size = Math.hypot(x, y);
  if (size < 0.001) return { x: 1, y: 0 };
  return { x: x / size, y: y / size };
}
