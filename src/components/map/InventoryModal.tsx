import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import { BAG_SLOTS, ITEMS } from '../../world/items';
import type { ItemId } from '../../world/types';

type Props = { onClose: () => void };

const COLUMNS = 16;

/**
 * 64 stack slots. Empty cells stay visible so the bag's size is obvious.
 * Tapping a filled cell uses that stack.
 */
export function InventoryModal({ onClose }: Props) {
  const world = useWorld();
  const { s, font, width, height } = useLayout();
  const gap = 4;
  const rows = BAG_SLOTS / COLUMNS;
  const pad = s(10);
  const innerW = width - 16 - pad * 2;
  const innerH = height - 16 - pad * 2 - s(46);
  const cell = Math.max(
    14,
    Math.min(
      s(44),
      Math.floor((innerW - gap * (COLUMNS - 1)) / COLUMNS),
      Math.floor((innerH - gap * (rows - 1)) / rows),
    ),
  );
  const cells = Array.from({ length: BAG_SLOTS }, (_, index) => world.bag[index] ?? null);

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
          {BAG_SLOTS} ô. Thuốc dùng cho bạn. Trái cây dùng cho quái đã thu phục. Hồi thành chú đưa về thị trấn.
        </Text>
        <View style={[styles.grid, { width: COLUMNS * cell + gap * (COLUMNS - 1), gap }]}>
          {cells.map((stack, index) => {
            const name = stack ? shortName(stack.itemId) : '';
            return (
              <Pressable
                key={stack ? stack.itemId : `empty-${index}`}
                accessibilityRole="button"
                accessibilityLabel={stack ? ITEMS[stack.itemId].nameVi : 'Ô trống'}
                disabled={!stack}
                onPress={() => stack && world.useBagItem(stack.itemId)}
                style={[styles.cell, { width: cell, height: cell, backgroundColor: stack ? ITEMS[stack.itemId].tint : 'rgba(0,0,0,0.18)' }]}
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

function shortName(itemId: ItemId): string {
  if (itemId === 'hp-potion') return 'Máu';
  if (itemId === 'mana-potion') return 'Mana';
  if (itemId === 'stamina-potion') return 'Lực';
  if (itemId === 'town-scroll') return 'Hồi';
  if (itemId === 'antidote') return 'Độc';
  if (itemId === 'berry') return 'Dại';
  if (itemId === 'mana-fruit') return 'Q.mana';
  if (itemId === 'hearty-fruit') return 'Bồi';
  if (itemId === 'net') return 'Lưới';
  if (itemId === 'sword') return 'Kiếm';
  if (itemId === 'armor') return 'Giáp';
  if (itemId === 'mine-ticket') return 'Vé';
  if (itemId === 'evo-shard') return 'Mảnh';
  if (itemId === 'might-blade') return 'Sức';
  return 'Bánh';
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
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(246,241,231,0.28)' },
  cellName: { color: '#1b140c', fontWeight: '800' },
  qty: { color: '#1b140c', fontWeight: '700' },
});
