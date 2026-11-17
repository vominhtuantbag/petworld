/**
 * Co-op raid payout. Every ready fighter rolls this independently.
 * There is no party-leader field and no extra share.
 *
 * Experience is three times a normal (non-elite) map monster of the same
 * level: `(8 + level * 3) * 3`.
 *
 * 40% chance of 10–15 evolution shards. 15% chance of one rainbow shard.
 * 45% chance of a strength weapon.
 * The zone's badge drops at 30–35% when the raid belongs to a known region.
 */

export type RaidDrop = { itemId: string; qty: number };

export type RaidPayout = {
  exp: number;
  drops: RaidDrop[];
};

const BADGE_REGIONS = new Set([
  'plains',
  'mountains',
  'forest',
  'swamp',
  'beach',
  'ocean',
  'tundra',
  'savannah',
  'volcano',
  'desert',
  'light',
  'dark',
  'heaven',
  'hell',
  'chaos',
  'outer-space',
]);

export function badgeItemId(zoneId: string): string | null {
  const province = zoneId.startsWith('town:') ? zoneId.slice(5) : (zoneId.split(':')[0] ?? '');
  if (!province || !BADGE_REGIONS.has(province)) return null;
  return `badge-${province}`;
}

export function raidPayout(level: number, rng: () => number = Math.random, zoneId = ''): RaidPayout {
  const safe = clampLevel(level);
  const drops: RaidDrop[] = [];
  if (rng() < 0.4) drops.push({ itemId: 'evo-shard', qty: 10 + Math.floor(rng() * 6) });
  if (rng() < 0.15) drops.push({ itemId: 'rainbow-shard', qty: 1 });
  if (rng() < 0.45) drops.push({ itemId: 'might-blade', qty: 1 });
  const badge = badgeItemId(zoneId);
  if (badge) {
    const chance = 0.3 + rng() * 0.05;
    if (rng() < chance) drops.push({ itemId: badge, qty: 1 });
  }
  return {
    exp: (8 + safe * 3) * 3,
    drops,
  };
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(200, Math.round(level)));
}
