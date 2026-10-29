/**
 * Co-op raid payout. Every ready fighter rolls this independently.
 * There is no party-leader field and no extra share.
 *
 * Experience is three times a normal (non-elite) map monster of the same
 * level: `(8 + level * 3) * 3`.
 *
 * 40% chance of 10–15 evolution shards. 45% chance of a strength weapon.
 */

export type RaidDrop = { itemId: 'evo-shard' | 'might-blade'; qty: number };

export type RaidPayout = {
  exp: number;
  drops: RaidDrop[];
};

export function raidPayout(level: number, rng: () => number = Math.random): RaidPayout {
  const safe = clampLevel(level);
  const drops: RaidDrop[] = [];
  if (rng() < 0.4) drops.push({ itemId: 'evo-shard', qty: 10 + Math.floor(rng() * 6) });
  if (rng() < 0.45) drops.push({ itemId: 'might-blade', qty: 1 });
  return {
    exp: (8 + safe * 3) * 3,
    drops,
  };
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(200, Math.round(level)));
}
