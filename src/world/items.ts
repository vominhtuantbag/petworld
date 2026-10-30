import type { Gear, GearRarity, GearSlot, ItemId, LootActor, Stack, Vitals } from './types';

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
  slot?: GearSlot;
  rarity?: GearRarity;
};

export const ITEMS: Record<ItemId, ItemDef> = {
  'hp-potion': item('hp-potion', 'Thuốc máu nhỏ', 12, '#d4534a', 'Hồi 35 máu.'),
  'hp-potion-m': item('hp-potion-m', 'Thuốc máu vừa', 22, '#e06a55', 'Hồi 70 máu.'),
  'hp-potion-l': item('hp-potion-l', 'Thuốc máu lớn', 36, '#f08070', 'Hồi 120 máu.'),
  'mana-potion': item('mana-potion', 'Thuốc mana nhỏ', 12, '#5b7fd6', 'Hồi 25 mana.'),
  'mana-potion-m': item('mana-potion-m', 'Thuốc mana vừa', 22, '#6d90e2', 'Hồi 50 mana.'),
  'mana-potion-l': item('mana-potion-l', 'Thuốc mana lớn', 36, '#8aa8f0', 'Hồi 90 mana.'),
  'stamina-potion': item('stamina-potion', 'Thuốc thể lực nhỏ', 10, '#d7a441', 'Hồi 25 thể lực.'),
  'stamina-potion-m': item('stamina-potion-m', 'Thuốc thể lực vừa', 18, '#e0b45a', 'Hồi 50 thể lực.'),
  'stamina-potion-l': item('stamina-potion-l', 'Thuốc thể lực lớn', 30, '#ecc56a', 'Hồi 90 thể lực.'),
  ration: item('ration', 'Bánh mì', 8, '#e6c48a', 'Hồi 15 máu và 10 thể lực.'),
  antidote: item('antidote', 'Giải độc', 14, '#7dba6a', 'Hóa giải độc và hồi 20 máu.'),
  'town-scroll': item('town-scroll', 'Teleport', 18, '#d7c56a', 'Đưa bạn về thị trấn hiện tại.'),
  banana: item('banana', 'Chuối', 8, '#f0d24a', 'Quái đã thu phục hồi 22 máu và 14 mana.'),
  grape: item('grape', 'Nho', 14, '#7b4cb8', 'Quái đã thu phục hồi 45 máu và 30 mana.'),
  apple: item('apple', 'Táo', 22, '#d4534a', 'Quái đã thu phục hồi 80 máu và 55 mana.'),
  net: item('net', 'Lưới', 18, '#3cba45', 'Dùng trong trận. Ném vào quái để thu phục.'),
  sword: gear('sword', 'Kiếm', 45, '#d9dde6', 'weapon', 'normal', 'Vũ khí cận chiến. Tăng tấn công.'),
  'sword-rare': gear('sword-rare', 'Kiếm hiếm', 0, '#7dff9a', 'weapon', 'rare', 'Vũ khí hiếm. Tấn công cao hơn kiếm thường.'),
  'sword-special': gear('sword-special', 'Kiếm đặc biệt', 0, '#c9a0ff', 'weapon', 'special', 'Vũ khí đặc biệt. Tấn công rất cao.'),
  'might-blade': gear('might-blade', 'Kiếm sức mạnh', 0, '#e4c27a', 'weapon', 'special', 'Vũ khí sức mạnh từ hầm ngục.'),
  armor: gear('armor', 'Giáp', 45, '#8ea0b5', 'armor', 'normal', 'Giáp nhẹ. Tăng máu tối đa.'),
  'armor-rare': gear('armor-rare', 'Giáp hiếm', 0, '#7dff9a', 'armor', 'rare', 'Giáp hiếm. Máu tối đa cao hơn.'),
  'armor-special': gear('armor-special', 'Giáp đặc biệt', 0, '#c9a0ff', 'armor', 'special', 'Giáp đặc biệt. Máu tối đa rất cao.'),
  helm: gear('helm', 'Mũ', 40, '#c4b49a', 'helm', 'normal', 'Mũ sắt. Tăng phòng thủ.'),
  'helm-rare': gear('helm-rare', 'Mũ hiếm', 0, '#7dff9a', 'helm', 'rare', 'Mũ hiếm. Phòng thủ cao hơn.'),
  'helm-special': gear('helm-special', 'Mũ đặc biệt', 0, '#c9a0ff', 'helm', 'special', 'Mũ đặc biệt. Phòng thủ rất cao.'),
  shoes: gear('shoes', 'Giày', 40, '#8a6a45', 'shoes', 'normal', 'Giày đi săn. Tăng tốc độ và thể lực.'),
  'shoes-rare': gear('shoes-rare', 'Giày hiếm', 0, '#7dff9a', 'shoes', 'rare', 'Giày hiếm. Nhanh hơn và bền hơn.'),
  'shoes-special': gear('shoes-special', 'Giày đặc biệt', 0, '#c9a0ff', 'shoes', 'special', 'Giày đặc biệt. Tốc độ và thể lực rất cao.'),
  ring: gear('ring', 'Nhẫn', 40, '#d4c27a', 'ring', 'normal', 'Nhẫn mana. Tăng mana tối đa.'),
  'ring-rare': gear('ring-rare', 'Nhẫn hiếm', 0, '#7dff9a', 'ring', 'rare', 'Nhẫn hiếm. Mana tối đa cao hơn.'),
  'ring-special': gear('ring-special', 'Nhẫn đặc biệt', 0, '#c9a0ff', 'ring', 'special', 'Nhẫn đặc biệt. Mana tối đa rất cao.'),
  'mine-ticket': item('mine-ticket', 'Vé hầm ngục', 0, '#c47a3a', 'Vé vào Hầm ngục (2–5 người). Rơi từ tầng cuối Hầm mỏ.'),
  'evo-shard': item('evo-shard', 'Mảnh tiến hoá', 0, '#7d5cff', 'Mảnh tiến hoá thú. Có thể thay mảnh vùng.'),
  'rainbow-shard': item('rainbow-shard', 'Mảnh 7 màu', 0, '#ff7ad9', 'Mảnh vạn năng. Thay mọi mảnh tiến hoá thú.'),
  'shard-plains': item('shard-plains', 'Mảnh đồng bằng', 0, '#6ea24e', 'Mảnh tiến hoá thú đồng bằng.'),
  'shard-mountains': item('shard-mountains', 'Mảnh núi non', 0, '#5c6b73', 'Mảnh tiến hoá thú núi non.'),
  'shard-forest': item('shard-forest', 'Mảnh rừng rậm', 0, '#2d5a38', 'Mảnh tiến hoá thú rừng rậm.'),
  'shard-swamp': item('shard-swamp', 'Mảnh đầm lầy', 0, '#2a3a2c', 'Mảnh tiến hoá thú đầm lầy.'),
  'shard-beach': item('shard-beach', 'Mảnh bãi biển', 0, '#e6d2a8', 'Mảnh tiến hoá thú bãi biển.'),
  'shard-ocean': item('shard-ocean', 'Mảnh đại dương', 0, '#134868', 'Mảnh tiến hoá thú đại dương.'),
  'shard-tundra': item('shard-tundra', 'Mảnh băng giá', 0, '#eef5f8', 'Mảnh tiến hoá thú băng giá.'),
  'shard-savannah': item('shard-savannah', 'Mảnh thảo nguyên', 0, '#c6a15a', 'Mảnh tiến hoá thú thảo nguyên.'),
  'shard-volcano': item('shard-volcano', 'Mảnh núi lửa', 0, '#3a2420', 'Mảnh tiến hoá thú núi lửa.'),
  'shard-desert': item('shard-desert', 'Mảnh sa mạc', 0, '#e2c48a', 'Mảnh tiến hoá thú sa mạc.'),
};

/** Older fruit ids still present in local saves. */
export const ITEM_ALIASES: Record<string, ItemId> = {
  berry: 'banana',
  'mana-fruit': 'grape',
  'hearty-fruit': 'apple',
};

export const BAG_SLOTS = 64;
export const INN_COST = 15;
export const INN_COOLDOWN_MS = 20_000;
export const TRAVEL_COST = 30;
export const UPGRADE_CAP = 5;
export const GROCER_SALE_RATE = 0.85;

export const STORE_STOCK: ItemId[] = [
  'hp-potion',
  'hp-potion-m',
  'hp-potion-l',
  'mana-potion',
  'mana-potion-m',
  'mana-potion-l',
  'stamina-potion',
  'stamina-potion-m',
  'stamina-potion-l',
  'banana',
  'grape',
  'apple',
  'net',
  'town-scroll',
];

export const SMITH_STOCK: ItemId[] = ['shoes', 'armor', 'helm', 'sword', 'ring'];

export const GEAR_SLOTS: { slot: GearSlot; label: string }[] = [
  { slot: 'shoes', label: 'Giày' },
  { slot: 'armor', label: 'Giáp' },
  { slot: 'helm', label: 'Mũ' },
  { slot: 'weapon', label: 'Vũ khí' },
  { slot: 'ring', label: 'Nhẫn' },
];

export const RARITY_BORDER: Record<GearRarity, string> = {
  normal: '#f4f1ea',
  rare: '#3cba45',
  special: '#9b5cff',
};

export const RARITY_LABEL: Record<GearRarity, string> = {
  normal: 'Thường',
  rare: 'Hiếm',
  special: 'Đặc biệt',
};

export type EquippedGear = {
  weapon: Gear | null;
  armor: Gear | null;
  helm: Gear | null;
  shoes: Gear | null;
  ring: Gear | null;
};

export type StatBonus = {
  attack: number;
  defense: number;
  hp: number;
  mana: number;
  stamina: number;
  speed: number;
};

const EMPTY_BONUS: StatBonus = { attack: 0, defense: 0, hp: 0, mana: 0, stamina: 0, speed: 0 };

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

export function canonicalItemId(value: string): ItemId | null {
  const mapped = ITEM_ALIASES[value] ?? value;
  return mapped in ITEMS ? (mapped as ItemId) : null;
}

export function gearSlot(itemId: ItemId): GearSlot | null {
  return ITEMS[itemId].slot ?? null;
}

export function gearRarity(itemId: ItemId): GearRarity {
  return ITEMS[itemId].rarity ?? 'normal';
}

export function isGearItem(itemId: ItemId): boolean {
  return gearSlot(itemId) != null;
}

export function grocerWeekendSale(now = Date.now()): boolean {
  const day = new Date(now + ICT_OFFSET_MS).getUTCDay();
  return day === 0 || day === 5 || day === 6;
}

/** Friday–Sunday ICT: 15% off, rounded to the nearest gold. */
export function grocerPrice(itemId: ItemId, now = Date.now()): number {
  const price = ITEMS[itemId].price;
  if (!grocerWeekendSale(now)) return price;
  return Math.max(1, Math.round(price * GROCER_SALE_RATE));
}

export function rarityMult(rarity: GearRarity): number {
  if (rarity === 'special') return 2.2;
  if (rarity === 'rare') return 1.55;
  return 1;
}

export function gearBonuses(gear: Gear | null | undefined): StatBonus {
  if (!gear) return EMPTY_BONUS;
  const slot = gearSlot(gear.itemId);
  const scale = rarityMult(gearRarity(gear.itemId));
  const plus = gear.plus;
  if (slot === 'weapon') {
    const base = gear.itemId === 'might-blade' ? 12 : 4;
    return { ...EMPTY_BONUS, attack: Math.round(base * scale) + plus * 2 };
  }
  if (slot === 'armor') return { ...EMPTY_BONUS, hp: Math.round(20 * scale) + plus * 8 };
  if (slot === 'helm') return { ...EMPTY_BONUS, defense: Math.round(3 * scale) + plus * 2 };
  if (slot === 'shoes') {
    return {
      ...EMPTY_BONUS,
      speed: Math.round(14 * scale) + plus * 4,
      stamina: Math.round(10 * scale) + plus * 4,
    };
  }
  if (slot === 'ring') return { ...EMPTY_BONUS, mana: Math.round(12 * scale) + plus * 5 };
  return EMPTY_BONUS;
}

export function equippedBonuses(gear: EquippedGear): StatBonus {
  return [gear.weapon, gear.armor, gear.helm, gear.shoes, gear.ring].reduce<StatBonus>((sum, piece) => {
    const next = gearBonuses(piece);
    return {
      attack: sum.attack + next.attack,
      defense: sum.defense + next.defense,
      hp: sum.hp + next.hp,
      mana: sum.mana + next.mana,
      stamina: sum.stamina + next.stamina,
      speed: sum.speed + next.speed,
    };
  }, { ...EMPTY_BONUS });
}

export function weaponAttack(gear: Gear): number {
  return gearBonuses(gear).attack;
}

export function armorDefense(gear: Gear): number {
  const slot = gearSlot(gear.itemId);
  if (slot === 'helm') return gearBonuses(gear).defense;
  return gearBonuses(gear).defense;
}

export function upgradeCost(plus: number): number {
  return 25 * (plus + 1);
}

export function countSlots(bag: Stack[], gear: Gear | null): number {
  return bag.length + (gear ? 1 : 0);
}

export function addStack(bag: Stack[], itemId: ItemId, qty = 1, plus = 0): Stack[] | null {
  const def = ITEMS[itemId];
  if (!def.stack) {
    if (bag.some((stack) => stack.itemId === itemId)) return null;
    if (countSlots(bag, null) >= BAG_SLOTS) return null;
    return [...bag, { itemId, qty: 1, plus }];
  }
  const existing = bag.find((stack) => stack.itemId === itemId);
  if (existing) {
    return bag.map((stack) => (stack.itemId === itemId ? { ...stack, qty: stack.qty + qty } : stack));
  }
  if (bag.length >= BAG_SLOTS) return null;
  return [...bag, { itemId, qty }];
}

export function removeOne(bag: Stack[], itemId: ItemId): Stack[] | null {
  const taken = takeStack(bag, itemId);
  return taken ? taken.bag : null;
}

export function takeStack(bag: Stack[], itemId: ItemId): { bag: Stack[]; plus: number } | null {
  const stack = bag.find((entry) => entry.itemId === itemId);
  if (!stack) return null;
  if (stack.qty <= 1) return { bag: bag.filter((entry) => entry.itemId !== itemId), plus: stack.plus ?? 0 };
  return {
    bag: bag.map((entry) => (entry.itemId === itemId ? { ...entry, qty: entry.qty - 1 } : entry)),
    plus: stack.plus ?? 0,
  };
}

export function removeMany(bag: Stack[], itemId: ItemId, qty: number): Stack[] | null {
  if (qty <= 0) return bag;
  const stack = bag.find((entry) => entry.itemId === itemId);
  if (!stack || stack.qty < qty) return null;
  if (stack.qty === qty) return bag.filter((entry) => entry.itemId !== itemId);
  return bag.map((entry) => (entry.itemId === itemId ? { ...entry, qty: entry.qty - qty } : entry));
}

export function countItem(bag: Stack[], itemId: ItemId): number {
  return bag.find((entry) => entry.itemId === itemId)?.qty ?? 0;
}

/** Returns the next vitals, or null when the item would not change anything. */
export function applyConsumable(vitals: Vitals, itemId: ItemId): Vitals | null {
  if (itemId === 'hp-potion') return heal(vitals, { hp: 35 });
  if (itemId === 'hp-potion-m') return heal(vitals, { hp: 70 });
  if (itemId === 'hp-potion-l') return heal(vitals, { hp: 120 });
  if (itemId === 'mana-potion') return heal(vitals, { mana: 25 });
  if (itemId === 'mana-potion-m') return heal(vitals, { mana: 50 });
  if (itemId === 'mana-potion-l') return heal(vitals, { mana: 90 });
  if (itemId === 'stamina-potion') return heal(vitals, { stamina: 25 });
  if (itemId === 'stamina-potion-m') return heal(vitals, { stamina: 50 });
  if (itemId === 'stamina-potion-l') return heal(vitals, { stamina: 90 });
  if (itemId === 'ration') return heal(vitals, { hp: 15, stamina: 10 });
  if (itemId === 'antidote') return heal(vitals, { hp: 20 });
  return null;
}

/** Food for a tamed monster. Null when the item is not a fruit. */
export function fruitRestore(itemId: ItemId): { hp: number; mp: number } | null {
  if (itemId === 'banana') return { hp: 22, mp: 14 };
  if (itemId === 'grape') return { hp: 45, mp: 30 };
  if (itemId === 'apple') return { hp: 80, mp: 55 };
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
  return addStack(bag, loot.itemId, Math.max(1, loot.amount)) !== null;
}

export function shortItemName(itemId: ItemId): string {
  switch (itemId) {
    case 'hp-potion':
      return 'Máu S';
    case 'hp-potion-m':
      return 'Máu M';
    case 'hp-potion-l':
      return 'Máu L';
    case 'mana-potion':
      return 'Mana S';
    case 'mana-potion-m':
      return 'Mana M';
    case 'mana-potion-l':
      return 'Mana L';
    case 'stamina-potion':
      return 'Lực S';
    case 'stamina-potion-m':
      return 'Lực M';
    case 'stamina-potion-l':
      return 'Lực L';
    case 'town-scroll':
      return 'TP';
    case 'antidote':
      return 'Độc';
    case 'banana':
      return 'Chuối';
    case 'grape':
      return 'Nho';
    case 'apple':
      return 'Táo';
    case 'net':
      return 'Lưới';
    case 'sword':
    case 'sword-rare':
    case 'sword-special':
    case 'might-blade':
      return 'Kiếm';
    case 'armor':
    case 'armor-rare':
    case 'armor-special':
      return 'Giáp';
    case 'helm':
    case 'helm-rare':
    case 'helm-special':
      return 'Mũ';
    case 'shoes':
    case 'shoes-rare':
    case 'shoes-special':
      return 'Giày';
    case 'ring':
    case 'ring-rare':
    case 'ring-special':
      return 'Nhẫn';
    case 'mine-ticket':
      return 'Vé';
    case 'evo-shard':
      return 'Mảnh';
    case 'rainbow-shard':
      return '7 màu';
    default:
      if (itemId.startsWith('shard-')) return 'Mảnh';
      return ITEMS[itemId].nameVi.slice(0, 4);
  }
}

export function itemBorder(itemId: ItemId): string {
  const rarity = ITEMS[itemId].rarity;
  if (!rarity) return 'rgba(246,241,231,0.28)';
  return RARITY_BORDER[rarity];
}

function item(id: ItemId, nameVi: string, price: number, tint: string, blurb: string): ItemDef {
  return { id, nameVi, price, stack: true, tint, blurb };
}

function gear(
  id: ItemId,
  nameVi: string,
  price: number,
  tint: string,
  slot: GearSlot,
  rarity: GearRarity,
  blurb: string,
): ItemDef {
  return { id, nameVi, price, stack: false, tint, blurb, slot, rarity };
}

function clampPool(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}
