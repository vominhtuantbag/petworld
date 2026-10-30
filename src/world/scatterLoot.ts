import { hashString, mulberry32 } from './grid';
import { ITEMS } from './items';
import type { FieldState, ItemId, LootActor, Rect, Vec } from './types';

/** Hunting-map ground pickups. Towns stay clean. */
export const GROUND_LOOT_REV = 1;

const SCATTER_ITEMS: ItemId[] = [
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
];

export function withGroundLoot(field: FieldState): FieldState {
  if (field.tier < 1 || field.groundLoot === GROUND_LOOT_REV) return field;
  return { ...field, loot: [...field.loot, ...scatterGroundLoot(field)], groundLoot: GROUND_LOOT_REV };
}

export function scatterGroundLoot(field: FieldState): LootActor[] {
  const rng = mulberry32(hashString(`${field.zoneId}:ground-loot:${GROUND_LOOT_REV}`));
  const want = 36 + Math.floor(rng() * 13);
  const pads = [
    field.quietSpawn,
    ...field.sensors.map((sensor) => ({ x: sensor.x, y: sensor.y })),
  ].filter((point): point is Vec => point != null);
  const found: LootActor[] = [];
  let guard = 0;
  while (found.length < want && guard < want * 18) {
    guard += 1;
    const x = 80 + rng() * (field.width - 160);
    const y = 80 + rng() * (field.height - 160);
    if (pads.some((pad) => Math.hypot(pad.x - x, pad.y - y) < 160)) continue;
    if (hitsBlock(field.blocks, x, y, 14)) continue;
    if (found.some((drop) => Math.hypot(drop.x - x, drop.y - y) < 90)) continue;
    const itemId = SCATTER_ITEMS[Math.floor(rng() * SCATTER_ITEMS.length)] ?? 'hp-potion';
    const def = ITEMS[itemId];
    found.push({
      id: `ground-${field.zoneId}-${found.length}`,
      x,
      y,
      kind: 'item',
      amount: 1,
      itemId,
      label: def.nameVi,
      tint: def.tint,
    });
  }
  return found;
}

function hitsBlock(blocks: Rect[], x: number, y: number, r: number): boolean {
  return blocks.some((block) => x + r > block.x && x - r < block.x + block.w && y + r > block.y && y - r < block.y + block.h);
}
