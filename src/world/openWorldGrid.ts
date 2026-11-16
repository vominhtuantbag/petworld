import type { RegionId } from '../types/game';
import {
  entryBlock,
  isRingTown,
  parseSector,
  parseTier,
  resolveZoneId,
  tierWindow,
  type TierAddress,
} from './atlas';
import { CHUNK_RADIUS, CHUNK_SIZE, chunkCoord, chunkKey, chunksNear, TIER_MAP_H, TIER_MAP_W } from './grid';
import { portalLayout, playerAtPortal, type PortalLayout } from './portals';
import { MAP_TIERS, TIER_LEVELS, tierRange, tierZoneId } from './tiers';
import { findTownPath, resolveTownWalkTarget } from './townGridNav';
import { isTownZone, townReturnPad, townZoneId } from './townManager';
import type { FieldState, MonsterActor, Sensor, Vec } from './types';

/**
 * Open-world strategic map helpers.
 *
 * Chunks stay asleep until the player is nearby (`CHUNK_RADIUS`), which keeps
 * entity tracking and NPC/monster steps near 60 FPS on mobile. Agro, portals,
 * and tier ladders are pure functions so Web / iOS / Android share one loop.
 */

export { CHUNK_RADIUS, CHUNK_SIZE, TIER_MAP_H, TIER_MAP_W, MAP_TIERS, TIER_LEVELS };
export { chunkCoord, chunkKey, chunksNear, portalLayout, playerAtPortal };

/** Distance check used by the field sim to start a chase. */
export function inAgroRange(player: Vec, monster: Pick<MonsterActor, 'x' | 'y' | 'agro'>): boolean {
  return Math.hypot(monster.x - player.x, monster.y - player.y) <= monster.agro;
}

/** True when a chase should flip into the combat interface. */
export function shouldTriggerCombat(
  player: Vec & { r: number },
  monster: Pick<MonsterActor, 'x' | 'y' | 'r' | 'agro' | 'calm'>,
  peaceful: boolean,
): boolean {
  if (peaceful || monster.calm > 0) return false;
  if (!inAgroRange(player, monster)) return false;
  return Math.hypot(monster.x - player.x, monster.y - player.y) <= monster.r + player.r + 4;
}

export type MapTierInfo = {
  townId: string;
  tier: number;
  levelMin: number;
  levelMax: number;
  zoneId: string;
  nextZoneId: string | null;
  prevZoneId: string | null;
};

export function mapTierInfo(townId: string, tier: number): MapTierInfo | null {
  if (!isRingTown(townId) || tier < 1 || tier > MAP_TIERS) return null;
  const band = tierRange(tier);
  return {
    townId,
    tier,
    ...band,
    zoneId: tierZoneId(townId, tier),
    nextZoneId: tier < MAP_TIERS ? tierZoneId(townId, tier + 1) : null,
    prevZoneId: tier > 1 ? tierZoneId(townId, tier - 1) : townZoneId(townId as RegionId),
  };
}

/** Highest hunting map a given adventure level may enter (plus look-ahead). */
export function openTierBand(adventureLevel: number): { low: number; high: number } {
  return tierWindow(adventureLevel);
}

export function canEnterZone(adventureLevel: number, zoneId: string, homeProvince: string): string | null {
  return entryBlock(adventureLevel, zoneId, homeProvince);
}

export type WorldExitKind = 'town-gate' | 'tier-ascent' | 'tier-return' | 'ring-west' | 'ring-east' | 'sector';

export type WorldExit = {
  sensor: Sensor;
  kind: WorldExitKind;
  portal: PortalLayout;
};

/** Classify a transition sensor for UI / tooling. */
export function classifyExit(sensor: Sensor, field: FieldState): WorldExitKind {
  if (!sensor.toZone) return 'sector';
  if (sensor.id === 'gate' || sensor.toZone.startsWith('town:')) return 'town-gate';
  if (sensor.id === 'ascent') return 'tier-ascent';
  if (sensor.id === 'return' || sensor.id === 'back-town') return 'tier-return';
  if (sensor.id === 'west') return 'ring-west';
  if (sensor.id === 'east') return 'ring-east';
  if (parseTier(sensor.toZone) || parseSector(resolveZoneId(sensor.toZone))) {
    if (field.tier > 0 && sensor.id === 'west') return 'ring-west';
    if (field.tier > 0 && sensor.id === 'east') return 'ring-east';
  }
  return 'sector';
}

export function worldExits(field: FieldState): WorldExit[] {
  return field.sensors
    .filter((sensor) => Boolean(sensor.toZone))
    .map((sensor) => ({
      sensor,
      kind: classifyExit(sensor, field),
      portal: portalLayout(sensor),
    }));
}

/** Active chunk keys around the player — only these sim and draw. */
export function awakeChunkKeys(field: FieldState, player: Vec): string[] {
  if (field.chunkSize <= 0) return [];
  return chunksNear(player.x, player.y, field.width, field.height, field.chunkSize || CHUNK_SIZE).map((coord) =>
    chunkKey(coord.cx, coord.cy),
  );
}

export function parseHuntingAddress(zoneId: string): TierAddress | null {
  return parseTier(zoneId);
}

export function returnPadFromWilds(): Vec {
  return townReturnPad();
}

/**
 * Validate a click / move destination against collision.
 * Beach towns snap onto beige roads or return null when the target sits in red.
 */
export function resolveWalkTarget(field: FieldState, x: number, y: number): Vec | null {
  if (isTownZone(field.zoneId)) {
    return resolveTownWalkTarget(x, y);
  }
  if (field.blocks.length === 0) return { x, y };
  const blocked = field.blocks.some(
    (block) => x > block.x && x < block.x + block.w && y > block.y && y < block.y + block.h,
  );
  return blocked ? null : { x, y };
}

/** A* along town green corridors. Null when the destination cannot be reached / is deep in red. */
export function findWalkPath(field: FieldState, from: Vec, to: Vec): Vec[] | null {
  if (isTownZone(field.zoneId)) {
    return findTownPath(from, to);
  }
  const target = resolveWalkTarget(field, to.x, to.y);
  return target ? [from, target] : null;
}

/**
 * Lower maps hold weaker monsters; ascent portals climb the same town's
 * ladder. Rewards scale with `tier` / sector level in `catalog.monsterStats`.
 */
export function rewardTierHint(level: number): { tier: number; rarityBias: number } {
  const tier = Math.max(1, Math.min(MAP_TIERS, Math.ceil(Math.max(1, level) / TIER_LEVELS)));
  return { tier, rarityBias: (tier - 1) / Math.max(1, MAP_TIERS - 1) };
}
