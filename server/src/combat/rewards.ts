/**
 * Battle payout. A loss pays nothing: no experience, currency, or items.
 * The client applies the same rule before it writes the save.
 */

export type BattleDrop = { itemId: string; qty: number };

export type BattlePayout = {
  victory: boolean;
  exp: number;
  gold: number;
  drops: BattleDrop[];
};

export function settlePayout(input: BattlePayout): BattlePayout {
  if (!input.victory) return { victory: false, exp: 0, gold: 0, drops: [] };
  return {
    victory: true,
    exp: clampInt(input.exp, 0, 10_000_000),
    gold: clampInt(input.gold, 0, 9_999_999),
    drops: input.drops
      .filter((drop) => typeof drop.itemId === 'string' && drop.itemId.length > 0 && drop.qty > 0)
      .slice(0, 8)
      .map((drop) => ({ itemId: drop.itemId.slice(0, 40), qty: clampInt(drop.qty, 1, 99) })),
  };
}

export function readPayout(payload: unknown): BattlePayout {
  const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const drops = Array.isArray(body.drops) ? body.drops.flatMap(readDrop) : [];
  return {
    victory: body.victory === true,
    exp: typeof body.exp === 'number' ? body.exp : 0,
    gold: typeof body.gold === 'number' ? body.gold : 0,
    drops,
  };
}

function readDrop(value: unknown): BattleDrop[] {
  if (!value || typeof value !== 'object') return [];
  const drop = value as { itemId?: unknown; qty?: unknown };
  if (typeof drop.itemId !== 'string') return [];
  const qty = typeof drop.qty === 'number' ? drop.qty : 0;
  return [{ itemId: drop.itemId, qty }];
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}
