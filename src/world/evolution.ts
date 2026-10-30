import type { TamedMonster } from './combat';
import { addStack, countItem, ITEMS, removeMany } from './items';
import type { ItemId, Stack } from './types';

/**
 * Pet evolution. Inn trades spare copies for fauna shards (3–5).
 * Evolving spends those shards; rainbow and generic shards fill any gap.
 */

export const MAX_EVO_STAGE = 2;
export const TRADE_SHARD_MIN = 3;
export const TRADE_SHARD_MAX = 5;
export const EVO_SHARD_COST = [0, 8, 15] as const;
export const EVO_LEVEL_NEED = [0, 8, 16] as const;
export const EVO_STAT_MULT = [1, 1.22, 1.48] as const;

const FAUNA_SHARDS: Record<string, ItemId> = {
  plains: 'shard-plains',
  mountains: 'shard-mountains',
  forest: 'shard-forest',
  swamp: 'shard-swamp',
  beach: 'shard-beach',
  ocean: 'shard-ocean',
  tundra: 'shard-tundra',
  savannah: 'shard-savannah',
  volcano: 'shard-volcano',
  desert: 'shard-desert',
};

const WILDCARDS: ItemId[] = ['evo-shard', 'rainbow-shard'];

export function evoStageOf(monster: TamedMonster): number {
  const stage = monster.evoStage ?? 0;
  return Math.max(0, Math.min(MAX_EVO_STAGE, stage));
}

export function evoMultiplier(stage: number): number {
  return EVO_STAT_MULT[Math.max(0, Math.min(MAX_EVO_STAGE, stage))] ?? 1;
}

export function faunaOf(kindId: string): string {
  return kindId.split('-')[0] ?? kindId;
}

export function shardForKind(kindId: string): ItemId {
  return FAUNA_SHARDS[faunaOf(kindId)] ?? 'evo-shard';
}

export function evoCost(monster: TamedMonster): { shards: number; level: number; shardId: ItemId } | null {
  const stage = evoStageOf(monster);
  if (stage >= MAX_EVO_STAGE) return null;
  const next = stage + 1;
  return {
    shards: EVO_SHARD_COST[next] ?? 8,
    level: EVO_LEVEL_NEED[next] ?? 8,
    shardId: shardForKind(monster.kindId),
  };
}

/** Keep the strongest copy of each species; the rest can be traded. */
export function redundantPets(tamed: TamedMonster[]): TamedMonster[] {
  const best = new Map<string, TamedMonster>();
  for (const monster of tamed) {
    const held = best.get(monster.kindId);
    if (!held || rankPet(monster) > rankPet(held)) best.set(monster.kindId, monster);
  }
  return tamed.filter((monster) => best.get(monster.kindId)?.id !== monster.id);
}

export function rollTradeShards(rng: () => number = Math.random): number {
  return TRADE_SHARD_MIN + Math.floor(rng() * (TRADE_SHARD_MAX - TRADE_SHARD_MIN + 1));
}

export function consumeEvolutionShards(bag: Stack[], shardId: ItemId, need: number): Stack[] | null {
  if (need <= 0) return bag;
  const specific = Math.min(need, countItem(bag, shardId));
  let next = specific > 0 ? removeMany(bag, shardId, specific) : bag;
  if (!next) return null;
  let left = need - specific;
  for (const wild of WILDCARDS) {
    if (left <= 0) break;
    const have = Math.min(left, countItem(next, wild));
    if (have <= 0) continue;
    const spent = removeMany(next, wild, have);
    if (!spent) return null;
    next = spent;
    left -= have;
  }
  return left <= 0 ? next : null;
}

export function grantShards(bag: Stack[], shardId: ItemId, qty: number): Stack[] | null {
  return addStack(bag, shardId, qty);
}

export function shardLabel(itemId: ItemId): string {
  return ITEMS[itemId].nameVi;
}

export function evoTitle(monster: TamedMonster): string {
  const stage = evoStageOf(monster);
  if (stage <= 0) return monster.name;
  return `${monster.name} · TH${stage}`;
}

function rankPet(monster: TamedMonster): number {
  return evoStageOf(monster) * 1_000_000 + monster.level * 1_000 + monster.attack + monster.defense;
}
