import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import { BAG_SLOTS, GEAR_SLOTS, ITEMS, RARITY_BORDER, gearRarity, itemBorder, shortItemName } from '../../world/items';

type Props = { onClose: () => void };

const COLUMNS = 16;

/**
 * 64 stack slots plus five equipped gear cells. Empty bag cells stay visible.
 * Tapping a filled cell uses or equips that stack.
 */
export function InventoryModal({ onClose }: Props) {
  const world = useWorld();
  const { s, font, width, height } = useLayout();
  const gap = 4;
  const rows = BAG_SLOTS / COLUMNS;
  const pad = s(10);
  const innerW = width - 16 - pad * 2;
  const innerH = height - 16 - pad * 2 - s(86);
  const cell = Math.max(
    14,
    Math.min(
      s(44),
      Math.floor((innerW - gap * (COLUMNS - 1)) / COLUMNS),
      Math.floor((innerH - gap * (rows - 1)) / rows),
    ),
  );
  const cells = Array.from({ length: BAG_SLOTS }, (_, index) => world.bag[index] ?? null);
  const slotW = Math.max(48, Math.floor((innerW - gap * 4) / 5));

  return (
    <View style={styles.scrim}>
      <View style={[styles.sheet, { padding: s(10), gap: s(6) }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: font(16) }]}>Vật phẩm</Text>
          <Text style={[styles.gold, { fontSize: font(14) }]}>{world.gold} vàng</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Text style={[styles.closeLabel, { fontSize: font(13) }]}>Đóng</Text>
          </Pressable>
        </View>
        <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
          {BAG_SLOTS} ô. Thuốc dùng cho bạn. Trái cây dùng cho quái đã thu phục. Teleport đưa về thị trấn.
        </Text>
        <View style={[styles.gearRow, { gap }]}>
          {GEAR_SLOTS.map(({ slot, label }) => {
            const piece = world[slot];
            const rarity = piece ? gearRarity(piece.itemId) : 'normal';
            return (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityLabel={piece ? ITEMS[piece.itemId].nameVi : label}
                disabled={!piece}
                onPress={() => piece && world.unequip(slot)}
                style={[
                  styles.gearCell,
                  {
                    width: slotW,
                    borderColor: piece ? RARITY_BORDER[rarity] : 'rgba(246,241,231,0.28)',
                    backgroundColor: piece ? ITEMS[piece.itemId].tint : 'rgba(0,0,0,0.18)',
                  },
                ]}
              >
                <Text style={[styles.gearSlot, { fontSize: font(9) }]}>{label}</Text>
                <Text style={[styles.cellName, { fontSize: font(10) }]} numberOfLines={1}>
                  {piece ? shortItemName(piece.itemId) : '—'}
                </Text>
                {piece ? (
                  <Text style={[styles.qty, { fontSize: font(9) }]}>+{piece.plus}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.grid, { width: COLUMNS * cell + gap * (COLUMNS - 1), gap }]}>
          {cells.map((stack, index) => {
            const name = stack ? shortItemName(stack.itemId) : '';
            return (
              <Pressable
                key={stack ? stack.itemId : `empty-${index}`}
                accessibilityRole="button"
                accessibilityLabel={stack ? ITEMS[stack.itemId].nameVi : 'Ô trống'}
                disabled={!stack}
                onPress={() => stack && world.useBagItem(stack.itemId)}
                style={[
                  styles.cell,
                  {
                    width: cell,
                    height: cell,
                    backgroundColor: stack ? ITEMS[stack.itemId].tint : 'rgba(0,0,0,0.18)',
                    borderColor: stack ? itemBorder(stack.itemId) : 'rgba(246,241,231,0.28)',
                  },
                ]}
              >
                {stack ? (
                  <>
                    <Text style={[styles.cellName, { fontSize: font(10) }]} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={[styles.qty, { fontSize: font(10) }]}>{stack.qty}</Text>
                  </>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000002,
    backgroundColor: theme.overlay,
    padding: 8,
    justifyContent: 'center',
  },
  sheet: { flex: 1, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.gold },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: theme.ink, fontWeight: '800' },
  gold: { flex: 1, color: theme.gold, fontWeight: '800' },
  close: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.goldDeep },
  closeLabel: { color: theme.ink, fontWeight: '800' },
  copy: { color: theme.muted },
  gearRow: { flexDirection: 'row' },
  gearCell: {
    borderRadius: 8,
    borderWidth: 2,
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  gearSlot: { color: '#1b140c', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  cellName: { color: '#1b140c', fontWeight: '800' },
  qty: { color: '#1b140c', fontWeight: '700' },
});
