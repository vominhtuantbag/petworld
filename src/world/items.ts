import type { Gear, ItemId, LootActor, Stack, Vitals } from './types';

/**
 * Item catalog. Shop price is what the general store and blacksmith charge.
 * `stack` is false for gear: a second copy is refused instead of merging.
 *
 * To add an item: extend `ItemId`, add a row here, then drop it from
 * `lootTable` in `catalog.ts` or list it in a shop.
 */

export type ItemDef = {
  id: ItemId;
  nameVi: string;
  price: number;
  stack: boolean;
  tint: string;
  blurb: string;
};

export const ITEMS: Record<ItemId, ItemDef> = {
  'hp-potion': {
    id: 'hp-potion',
    nameVi: 'Thuốc máu',
    price: 12,
    stack: true,
    tint: '#d4534a',
    blurb: 'Hồi 35 máu.',
  },
  'mana-potion': {
    id: 'mana-potion',
    nameVi: 'Thuốc mana',
    price: 12,
    stack: true,
    tint: '#5b7fd6',
    blurb: 'Hồi 25 mana.',
  },
  'stamina-potion': {
    id: 'stamina-potion',
    nameVi: 'Thuốc thể lực',
    price: 10,
    stack: true,
    tint: '#d7a441',
    blurb: 'Hồi 25 thể lực.',
  },
  ration: {
    id: 'ration',
    nameVi: 'Bánh mì',
    price: 8,
    stack: true,
    tint: '#e6c48a',
    blurb: 'Hồi 15 máu và 10 thể lực.',
  },
  antidote: {
    id: 'antidote',
    nameVi: 'Giải độc',
    price: 14,
    stack: true,
    tint: '#7dba6a',
    blurb: 'Hóa giải độc và hồi 20 máu.',
  },
  'town-scroll': {
    id: 'town-scroll',
    nameVi: 'Hồi thành chú',
    price: 18,
    stack: true,
    tint: '#d7c56a',
    blurb: 'Đưa bạn về thị trấn hiện tại.',
  },
  berry: {
    id: 'berry',
    nameVi: 'Quả dại',
    price: 8,
    stack: true,
    tint: '#c45a6a',
    blurb: 'Quái đã thu phục hồi 25 máu.',
  },
  'mana-fruit': {
    id: 'mana-fruit',
    nameVi: 'Quả mana',
    price: 10,
    stack: true,
    tint: '#6a8ad4',
    blurb: 'Quái đã thu phục hồi 20 mana.',
  },
  'hearty-fruit': {
    id: 'hearty-fruit',
    nameVi: 'Quả bồi',
    price: 16,
    stack: true,
    tint: '#7dba6a',
    blurb: 'Quái đã thu phục hồi 30 máu và 15 mana.',
  },
  net: {
    id: 'net',
    nameVi: 'Lưới',
    price: 18,
    stack: true,
    tint: '#3cba45',
    blurb: 'Dùng trong trận. Ném vào quái để thu phục.',
  },
  sword: {
    id: 'sword',
    nameVi: 'Kiếm',
    price: 45,
    stack: false,
    tint: '#d9dde6',
    blurb: 'Vũ khí cận chiến. Thợ rèn nâng cấp được.',
  },
  armor: {
    id: 'armor',
    nameVi: 'Giáp',
    price: 45,
    stack: false,
    tint: '#8ea0b5',
    blurb: 'Giáp nhẹ. Thợ rèn nâng cấp được.',
  },
  'mine-ticket': {
    id: 'mine-ticket',
    nameVi: 'Vé hầm ngục',
    price: 0,
    stack: true,
    tint: '#c47a3a',
    blurb: 'Vé vào Hầm ngục (2–5 người). Rơi từ tầng cuối Hầm mỏ.',
  },
  'evo-shard': {
    id: 'evo-shard',
    nameVi: 'Mảnh tiến hóa',
    price: 0,
    stack: true,
    tint: '#7d5cff',
    blurb: 'Nguyên liệu tiến hóa thú. Phần thưởng hầm ngục.',
  },
  'might-blade': {
    id: 'might-blade',
    nameVi: 'Kiếm sức mạnh',
    price: 0,
    stack: true,
    tint: '#e4c27a',
    blurb: 'Vũ khí sức mạnh từ hầm ngục. Tấn công cao hơn kiếm thường.',
  },
};

/** Bag and storage each hold this many stacks. The map inventory draws every cell. */
export const BAG_SLOTS = 64;
export const INN_COST = 15;
export const INN_COOLDOWN_MS = 20_000;
export const TRAVEL_COST = 30;
export const UPGRADE_CAP = 5;

export const STORE_STOCK: ItemId[] = ['hp-potion', 'mana-potion', 'stamina-potion', 'ration', 'antidote', 'town-scroll', 'berry', 'mana-fruit', 'hearty-fruit', 'net'];
export const SMITH_STOCK: ItemId[] = ['sword', 'armor'];

export function weaponAttack(plus: number, itemId: 'sword' | 'might-blade' = 'sword'): number {
  const base = itemId === 'might-blade' ? 12 : 4;
  return base + plus * 2;
}

export function armorDefense(plus: number): number {
  return 3 + plus * 2;
}

export function upgradeCost(plus: number): number {
  return 25 * (plus + 1);
}

export function countSlots(bag: Stack[], gear: Gear | null): number {
  return bag.length + (gear ? 1 : 0);
}

export function addStack(bag: Stack[], itemId: ItemId, qty = 1): Stack[] | null {
  const def = ITEMS[itemId];
  if (!def.stack) {
    if (bag.some((stack) => stack.itemId === itemId)) return null;
    if (countSlots(bag, null) >= BAG_SLOTS) return null;
    return [...bag, { itemId, qty: 1 }];
  }
  const existing = bag.find((stack) => stack.itemId === itemId);
  if (existing) {
    return bag.map((stack) => (stack.itemId === itemId ? { ...stack, qty: stack.qty + qty } : stack));
  }
  if (bag.length >= BAG_SLOTS) return null;
  return [...bag, { itemId, qty }];
}

export function removeOne(bag: Stack[], itemId: ItemId): Stack[] | null {
  const stack = bag.find((entry) => entry.itemId === itemId);
  if (!stack) return null;
  if (stack.qty <= 1) return bag.filter((entry) => entry.itemId !== itemId);
  return bag.map((entry) => (entry.itemId === itemId ? { ...entry, qty: entry.qty - 1 } : entry));
}

/** Returns the next vitals, or null when the item would not change anything. */
export function applyConsumable(vitals: Vitals, itemId: ItemId): Vitals | null {
  if (itemId === 'hp-potion') return heal(vitals, { hp: 35 });
  if (itemId === 'mana-potion') return heal(vitals, { mana: 25 });
  if (itemId === 'stamina-potion') return heal(vitals, { stamina: 25 });
  if (itemId === 'ration') return heal(vitals, { hp: 15, stamina: 10 });
  if (itemId === 'antidote') return heal(vitals, { hp: 20 });
  return null;
}

/** Food for a tamed monster. Null when the item is not a fruit. */
export function fruitRestore(itemId: ItemId): { hp: number; mp: number } | null {
  if (itemId === 'berry') return { hp: 25, mp: 0 };
  if (itemId === 'mana-fruit') return { hp: 0, mp: 20 };
  if (itemId === 'hearty-fruit') return { hp: 30, mp: 15 };
  return null;
}

export function heal(vitals: Vitals, gain: { hp?: number; mana?: number; stamina?: number }): Vitals | null {
  const next: Vitals = {
    ...vitals,
    hp: clampPool(vitals.hp + (gain.hp ?? 0), vitals.maxHp),
    mana: clampPool(vitals.mana + (gain.mana ?? 0), vitals.maxMana),
    stamina: clampPool(vitals.stamina + (gain.stamina ?? 0), vitals.maxStamina),
  };
  if (next.hp === vitals.hp && next.mana === vitals.mana && next.stamina === vitals.stamina) return null;
  return next;
}

export function fullRestore(vitals: Vitals): Vitals {
  return { ...vitals, hp: vitals.maxHp, mana: vitals.maxMana, stamina: vitals.maxStamina };
}

export function lootFits(bag: Stack[], loot: LootActor): boolean {
  if (loot.kind === 'gold') return true;
  if (!loot.itemId) return false;
  return addStack(bag, loot.itemId, 1) !== null;
}

function clampPool(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}
