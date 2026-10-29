/**
 * Co-op raid payout. Every ready fighter receives this same package.
 * There is no party-leader field and no extra share.
 *
 * Experience is three times a normal (non-elite) map monster of the same
 * level: `(8 + level * 3) * 3`, matching `expFromMonster` in
 * `src/world/progression.ts`.
 */

export type RaidDrop = { itemId: 'evo-shard' | 'might-blade'; qty: number };

export type RaidPayout = {
  exp: number;
  drops: RaidDrop[];
};

export function raidPayout(level: number): RaidPayout {
  const safe = clampLevel(level);
  return {
    exp: (8 + safe * 3) * 3,
    drops: [
      { itemId: 'evo-shard', qty: 1 },
      { itemId: 'might-blade', qty: 1 },
    ],
  };
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(200, Math.round(level)));
}
