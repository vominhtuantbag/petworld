import { createChunk, rollLoot } from './catalog';
import { isWaterKind, planLocomotion } from './gait';
import { chunkKey, chunksNear } from './grid';
import { HAZARD_TICK_SEC } from './hazards';
import { playerAtPortal, portalLayout } from './portals';
import { dropChance } from './progression';
import { zoneIndexAt } from './tiers';
import type { ChunkRecord, FieldEvent, FieldState, LootActor, MonsterActor, Rect, Sensor, Vec } from './types';

const PLAYER_SPEED = 230;
const LOOT_CAP = 12;
const PICKUP_R = 24;
/** How long the map stays safe after the player runs from a fight. */
export const FLEE_PEACE_SEC = 1.5;

export type FieldAxes = { x: number; y: number };

/**
 * Advance one map by `dt` seconds. Towns and wilderness share this step:
 * a town simply has no monsters. Events are edge-triggered.
 * `stamina` slows the player once the bar is empty, so the long walk to
 * the far gate cannot be sprinted forever.
 */
export function stepField(
  field: FieldState,
  axes: FieldAxes,
  dt: number,
  canTake: (loot: LootActor) => boolean,
  playerLevel = 1,
  stamina = Number.POSITIVE_INFINITY,
): { state: FieldState; events: FieldEvent[] } {
  const awake = syncChunks(field);
  const events: FieldEvent[] = [];
  const beforeX = awake.player.x;
  const beforeY = awake.player.y;
  const pace = stamina <= 0 ? 0.5 : 1;
  const channeling = portalChannel != null && !portalChannel.fired;
  const moveAxes = channeling ? { x: 0, y: 0 } : axes;
  const player = moveBody(
    awake.player.x,
    awake.player.y,
    awake.player.r,
    moveAxes,
    PLAYER_SPEED * mudSlow(awake, awake.player.x, awake.player.y, true) * pace,
    dt,
    awake,
  );
  const peace = Math.max(0, (awake.peace ?? 0) - dt);
  const water = awake.decor.filter((rect) => isWaterKind(rect.kind));
  const monsters = awake.monsters.map((monster) => stepMonster(monster, player, awake, dt, events, playerLevel, water, peace > 0));
  let loot = awake.loot;
  const dropped = monsters.flatMap((monster) => monster.dropped);
  if (dropped.length > 0) {
    loot = [...loot, ...dropped].slice(-LOOT_CAP);
  }

  const picked: LootActor[] = [];
  loot = loot.filter((drop) => {
    if (Math.hypot(drop.x - player.x, drop.y - player.y) > PICKUP_R + 8) return true;
    if (!canTake(drop)) return true;
    picked.push(drop);
    return false;
  });
  for (const drop of picked) events.push({ type: 'pickup', loot: drop });

  if (awake.hazards.some((hazard) => pointInRect(player.x, player.y, hazard))) {
    events.push({ type: 'hazard', dt });
  }

  const sensor = awake.sensors.find((entry) => Math.hypot(entry.x - player.x, entry.y - player.y) <= entry.r);
  let heldSensorId = awake.heldSensorId;
  if (sensor) {
    if (heldSensorId !== sensor.id) {
      heldSensorId = sensor.id;
      if (sensor.service) events.push({ type: 'service', service: sensor.service });
    }
  } else {
    heldSensorId = null;
  }
  tickPortal(awake, player.x, player.y, player.r, dt, events);

  if (awake.chunkSize) {
    events.push({
      type: 'march',
      distance: Math.hypot(player.x - beforeX, player.y - beforeY),
      dt,
    });
    tickTerrainHazards(awake, player.x, player.y, dt, events);
  }

  const decor = driftAmbient(awake, dt);

  return {
    state: {
      ...awake,
      decor,
      peace,
      player: { ...awake.player, x: player.x, y: player.y },
      monsters: monsters.map((entry) => entry.monster),
      loot,
      heldSensorId,
    },
    events,
  };
}

function driftAmbient(field: FieldState, dt: number): Rect[] {
  if (!field.decor.some((rect) => rect.drift)) return field.decor;
  const step = Math.min(dt, 0.05);
  return field.decor.map((rect) => {
    if (!rect.drift) return rect;
    let x = rect.x + rect.drift.vx * step;
    let y = rect.y + rect.drift.vy * step;
    if (x > field.width + 8) x = -rect.w;
    if (x + rect.w < -8) x = field.width;
    if (y > field.height + 8) y = -rect.h;
    if (y + rect.h < -8) y = field.height;
    return { ...rect, x, y };
  });
}

/**
 * Lowest overlapping terrain multiplier. Cracked earth (×0.90), quicksand
 * (×0.80), and plains water (×0.85) slow only the player. Swamp mud still
 * slows whoever is standing in it.
 */
function mudSlow(field: FieldState, x: number, y: number, player = false): number {
  let slow = 1;
  for (const rect of field.decor) {
    if (rect.slow == null) continue;
    if (!player && (rect.kind === 'crack' || rect.kind === 'quicksand' || rect.kind === 'puddle')) continue;
    if (x < rect.x || x > rect.x + rect.w || y < rect.y || y > rect.y + rect.h) continue;
    slow = Math.min(slow, rect.slow);
  }
  return slow;
}

/**
 * Seconds already spent inside cát lún or a vũng nước. Each clock is cleared
 * the frame the player is outside that zone, and both clear when the map changes.
 * The frame loop owns the tick, so leaving the zone does not leave a timer behind.
 */
const terrainClock = { quicksand: 0, puddle: 0 };
let terrainZone = '';

type PortalChannel = {
  id: string;
  toZone: string;
  unlock?: Sensor['unlock'];
  arrive?: Sensor['arrive'];
  t: number;
  fired: boolean;
  pinned: boolean;
};

let portalChannel: PortalChannel | null = null;

/** 0 outside a portal, 1 when the one-second departure finishes. */
export function portalFade(): number {
  if (!portalChannel) return 0;
  return Math.max(0, Math.min(1, portalChannel.t));
}

export function resetPortal() {
  portalChannel = null;
}

/** Drop partial hazard seconds. Called when the open map changes. */
export function resetTerrainHazards() {
  terrainZone = '';
  terrainClock.quicksand = 0;
  terrainClock.puddle = 0;
}

/** A tap on the gate uses the same one-second departure as walking in. */
export function armPortal(sensor: Sensor) {
  if (!sensor.toZone) return;
  if (portalChannel && portalChannel.id === sensor.id && !portalChannel.fired) {
    portalChannel.pinned = true;
    return;
  }
  portalChannel = {
    id: sensor.id,
    toZone: sensor.toZone,
    unlock: sensor.unlock,
    arrive: sensor.arrive,
    t: 0,
    fired: false,
    pinned: true,
  };
}

function tickPortal(field: FieldState, x: number, y: number, r: number, dt: number, events: FieldEvent[]) {
  const sensor = field.sensors.find(
    (entry) => entry.toZone && playerAtPortal(x, y, r, portalLayout(entry).trigger),
  );
  if (!sensor?.toZone) {
    if (portalChannel?.pinned && !portalChannel.fired) {
      advancePortal(dt, events);
      return;
    }
    portalChannel = null;
    return;
  }
  if (portalChannel?.fired && portalChannel.id === sensor.id) return;
  if (!portalChannel || portalChannel.id !== sensor.id) {
    portalChannel = {
      id: sensor.id,
      toZone: sensor.toZone,
      unlock: sensor.unlock,
      arrive: sensor.arrive,
      t: 0,
      fired: false,
      pinned: portalChannel?.id === sensor.id && portalChannel.pinned,
    };
  }
  advancePortal(dt, events);
}

function advancePortal(dt: number, events: FieldEvent[]) {
  if (!portalChannel || portalChannel.fired) return;
  portalChannel.t += Math.min(dt, 0.05);
  if (portalChannel.t < 1) return;
  portalChannel.t = 1;
  portalChannel.fired = true;
  events.push({
    type: 'travel',
    toZone: portalChannel.toZone,
    unlock: portalChannel.unlock,
    arrive: portalChannel.arrive,
  });
}

function tickTerrainHazards(field: FieldState, x: number, y: number, dt: number, events: FieldEvent[]) {
  if (terrainZone !== field.zoneId) {
    terrainZone = field.zoneId;
    terrainClock.quicksand = 0;
    terrainClock.puddle = 0;
  }
  let quicksand = false;
  let puddle = false;
  for (const rect of field.decor) {
    if (rect.kind !== 'quicksand' && rect.kind !== 'puddle') continue;
    if (!pointInRect(x, y, rect)) continue;
    if (rect.kind === 'quicksand') quicksand = true;
    else puddle = true;
    if (quicksand && puddle) break;
  }
  // Sa mạc only places quicksand. Đồng bằng only places water. One tick per second.
  tickDrain('quicksand', quicksand, dt, events);
  tickDrain('puddle', puddle, dt, events);
}

function tickDrain(kind: 'quicksand' | 'puddle', inside: boolean, dt: number, events: FieldEvent[]) {
  if (!inside) {
    terrainClock[kind] = 0;
    return;
  }
  terrainClock[kind] += dt;
  while (terrainClock[kind] >= HAZARD_TICK_SEC) {
    terrainClock[kind] -= HAZARD_TICK_SEC;
    events.push({ type: kind });
  }
}

/**
 * Wake the chunks around the player and freeze the rest.
 * Web keeps a 3×3 block. Phones wake one extra ring for the wider camera.
 * A chunk is generated once, then stored, so walking away does not respawn it.
 */
function syncChunks(field: FieldState): FieldState {
  if (!field.chunkSize) return field;
  const chunks: Record<string, ChunkRecord> = { ...field.chunks };
  for (const key of field.activeKeys) {
    const bucket = chunks[key];
    if (!bucket) continue;
    chunks[key] = {
      ...bucket,
      monsters: field.monsters.filter((monster) => chunkKeyAt(monster.x, monster.y, field.chunkSize) === key),
      loot: field.loot.filter((drop) => chunkKeyAt(drop.x, drop.y, field.chunkSize) === key),
    };
  }
  for (const monster of field.monsters) {
    const key = chunkKeyAt(monster.x, monster.y, field.chunkSize);
    if (field.activeKeys.includes(key)) continue;
    const [cx, cy] = key.split(':').map(Number);
    const bucket = chunks[key] ?? { cx, cy, monsters: [], loot: [], generated: true };
    chunks[key] = { ...bucket, monsters: [...bucket.monsters.filter((entry) => entry.id !== monster.id), monster] };
  }
  const wanted = chunksNear(field.player.x, field.player.y, field.width, field.height, field.chunkSize);
  const activeKeys = wanted.map((coord) => chunkKey(coord.cx, coord.cy));
  for (const coord of wanted) {
    const key = chunkKey(coord.cx, coord.cy);
    if (chunks[key]?.generated) continue;
    const made = createChunk(field, coord.cx, coord.cy);
    chunks[key] = { cx: coord.cx, cy: coord.cy, monsters: made.monsters, loot: made.loot, generated: true };
  }
  return {
    ...field,
    chunks,
    activeKeys,
    monsters: activeKeys.flatMap((key) => chunks[key]?.monsters ?? []),
    loot: activeKeys.flatMap((key) => chunks[key]?.loot ?? []),
  };
}

function chunkKeyAt(x: number, y: number, chunkSize: number): string {
  return chunkKey(Math.floor(x / chunkSize), Math.floor(y / chunkSize));
}

/** True when a tier-map monster would step into another level band. */
function outsideZone(x: number, y: number, monster: MonsterActor, field: FieldState): boolean {
  const zones = field.zones;
  if (!zones || zones.length === 0) return false;
  return zoneIndexAt(x, y, zones) !== monster.zoneIndex;
}

function pointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
}

/** Keep the player where they stand, and stop every monster from chasing for 1.5s. */
export function grantFleePeace(field: FieldState): FieldState {
  const settle = (monster: MonsterActor) => ({ ...monster, calm: 0 });
  const chunks = { ...field.chunks };
  for (const key of Object.keys(chunks)) {
    const bucket = chunks[key];
    if (!bucket) continue;
    chunks[key] = { ...bucket, monsters: bucket.monsters.map(settle) };
  }
  return {
    ...field,
    peace: FLEE_PEACE_SEC,
    chunks,
    monsters: field.monsters.map(settle),
  };
}

function stepMonster(
  monster: MonsterActor,
  player: Vec & { r: number },
  field: FieldState,
  dt: number,
  events: FieldEvent[],
  playerLevel: number,
  water: Rect[],
  peaceful: boolean,
): { monster: MonsterActor; dropped: LootActor[] } {
  const dropped: LootActor[] = [];
  let nextDrop = monster.nextDrop - dt;
  let calm = Math.max(0, monster.calm - dt);
  let pause = Math.max(0, monster.pause - dt);
  const distance = Math.hypot(monster.x - player.x, monster.y - player.y);
  const chasing = !peaceful && calm <= 0 && distance <= monster.agro;
  let patrolIndex = monster.patrolIndex;
  // Patrol points stay inside this monster's level zone. The leash below
  // stops a chase at the zone edge, so a higher band never pulls you in.
  const route = monster.patrol ?? [];
  const waypoint = route.length > 0 ? route[patrolIndex % route.length] : { x: monster.homeX, y: monster.homeY };
  const target = chasing ? { x: player.x, y: player.y } : waypoint;
  const direction = unit(target.x - monster.x, target.y - monster.y);
  const cruise = (chasing ? monster.speed * 1.35 : monster.speed * 0.55) * mudSlow(field, monster.x, monster.y);
  const wet = water.some((tile) => pointInRect(monster.x, monster.y, tile));
  const plainsMotion = wet || monster.kindId.startsWith('plains-');
  let x = monster.x;
  let y = monster.y;
  let gaitPatch: Pick<MonsterActor, 'gait' | 'phase' | 'facing' | 'gaitTimer' | 'hopT' | 'hopFromX' | 'hopFromY' | 'hopToX' | 'hopToY' | 'patrol'> | null = null;
  if (plainsMotion) {
    const planned = planLocomotion({ monster, target, chasing, dt, speed: cruise, field, wet });
    const settled = settleMonster(monster, field, planned.x, planned.y);
    x = settled.x;
    y = settled.y;
    if (settled.rejected && planned.hopT > 0) {
      planned.hopT = 0;
      planned.gaitTimer = Math.max(planned.gaitTimer, 0.55);
    }
    planned.x = x;
    planned.y = y;
    patrolIndex = planned.patrolIndex;
    gaitPatch = planned;
  } else {
    const speed = cruise;
    x = monster.x + direction.x * speed * dt;
    y = monster.y + direction.y * speed * dt;
    const leashed = clampToRect(x, y, monster.r, monster.bounds);
    x = leashed.x;
    y = leashed.y;
    const blocked = collideAll(x, y, monster.r, field.blocks);
    x = blocked.x;
    y = blocked.y;
    if (outsideZone(x, y, monster, field)) {
      x = monster.x;
      y = monster.y;
    }
  }

  if (!plainsMotion && !chasing && route.length > 0 && Math.hypot(waypoint.x - x, waypoint.y - y) < 20) {
    patrolIndex = (patrolIndex + 1) % route.length;
  } else if (!plainsMotion && !chasing && route.length === 0 && pause <= 0 && Math.hypot(monster.homeX - x, monster.homeY - y) < 12) {
    const angle = Math.random() * Math.PI * 2;
    const reach = 50 + Math.random() * 90;
    const homeX = clamp(monster.bounds.x + monster.r + 8, monster.bounds.x + monster.bounds.w - monster.r - 8, x + Math.cos(angle) * reach);
    const homeY = clamp(monster.bounds.y + monster.r + 8, monster.bounds.y + monster.bounds.h - monster.r - 8, y + Math.sin(angle) * reach);
    if (!outsideZone(homeX, homeY, monster, field)) {
      pause = 1.2;
      monster = { ...monster, homeX, homeY };
    }
  }

  if (nextDrop <= 0) {
    nextDrop = 18 + Math.random() * 14;
    if (field.loot.length < LOOT_CAP && Math.random() < dropChance(playerLevel, monster.level, monster.elite)) {
      dropped.push(rollLoot(monster.level, x, y));
    }
  }

  const moved = { ...monster, x, y, calm, nextDrop, pause, patrolIndex, ...(gaitPatch ?? {}) };
  if (chasing && distance <= monster.r + player.r + 4) {
    const away = unit(player.x - x, player.y - y);
    player.x = clamp(player.r, field.width - player.r, player.x + away.x * 170);
    player.y = clamp(player.r, field.height - player.r, player.y + away.y * 170);
    moved.calm = 4;
    events.push({ type: 'encounter', monster: moved });
  }

  return { monster: moved, dropped };
}

function settleMonster(monster: MonsterActor, field: FieldState, x: number, y: number): { x: number; y: number; rejected: boolean } {
  const leashed = clampToRect(x, y, monster.r, monster.bounds);
  const blocked = collideAll(leashed.x, leashed.y, monster.r, field.blocks);
  if (outsideZone(blocked.x, blocked.y, monster, field)) return { x: monster.x, y: monster.y, rejected: true };
  return { x: blocked.x, y: blocked.y, rejected: false };
}

function moveBody(
  x: number,
  y: number,
  r: number,
  axes: FieldAxes,
  speed: number,
  dt: number,
  field: FieldState,
): Vec & { r: number } {
  const direction = normalize(axes.x, axes.y);
  let nextX = x + direction.x * speed * dt;
  let nextY = y + direction.y * speed * dt;
  const world = clampToWorld(nextX, nextY, r, field.width, field.height);
  nextX = world.x;
  nextY = world.y;
  const blocked = collideAll(nextX, nextY, r, field.blocks);
  return { x: blocked.x, y: blocked.y, r };
}

function collideAll(x: number, y: number, r: number, blocks: Rect[]): Vec {
  let next = { x, y };
  for (const block of blocks) {
    next = pushOut(next.x, next.y, r, block);
  }
  return next;
}

function pushOut(x: number, y: number, r: number, rect: Rect): Vec {
  const nearestX = clamp(rect.x, rect.x + rect.w, x);
  const nearestY = clamp(rect.y, rect.y + rect.h, y);
  let dx = x - nearestX;
  let dy = y - nearestY;
  if (dx === 0 && dy === 0) {
    const left = x - rect.x;
    const right = rect.x + rect.w - x;
    const top = y - rect.y;
    const bottom = rect.y + rect.h - y;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: rect.x - r, y };
    if (min === right) return { x: rect.x + rect.w + r, y };
    if (min === top) return { x, y: rect.y - r };
    return { x, y: rect.y + rect.h + r };
  }
  const distance = Math.hypot(dx, dy);
  if (distance >= r) return { x, y };
  const scale = (r - distance) / distance;
  return { x: x + dx * scale, y: y + dy * scale };
}

function clampToRect(x: number, y: number, r: number, rect: Rect): Vec {
  return {
    x: clamp(rect.x + r, rect.x + rect.w - r, x),
    y: clamp(rect.y + r, rect.y + rect.h - r, y),
  };
}

function clampToWorld(x: number, y: number, r: number, width: number, height: number): Vec {
  return {
    x: clamp(r, width - r, x),
    y: clamp(r, height - r, y),
  };
}

function normalize(x: number, y: number): Vec {
  const size = Math.hypot(x, y);
  if (size < 0.12) return { x: 0, y: 0 };
  return { x: x / size, y: y / size };
}

function unit(x: number, y: number): Vec {
  const size = Math.hypot(x, y);
  if (size < 0.001) return { x: 1, y: 0 };
  return { x: x / size, y: y / size };
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}
