import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { itemArt } from '../world/itemArt';
import { ITEMS } from '../world/items';
import type { ItemId } from '../world/types';

type Props = {
  itemId?: ItemId | string | null;
  /** Fallback fill when no art (and for gold-like tint chips). */
  tint?: string;
  size?: number;
  radius?: number;
  /** No gray well behind pixel art (map ground loot). */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared item face: pixel art when registered, otherwise the catalog tint chip.
 * Pass only `tint` (no itemId) for non-item chips like gold.
 */
export function ItemIcon({ itemId, tint, size = 28, radius, bare = false, style }: Props) {
  const art = itemArt(itemId);
  const fill =
    tint ??
    (itemId && itemId in ITEMS ? ITEMS[itemId as ItemId].tint : 'rgba(8,14,12,0.45)');
  const r = radius ?? Math.max(4, Math.round(size * 0.22));

  if (art) {
    return (
      <View
        style={[
          styles.well,
          bare && styles.bare,
          { width: size, height: size, borderRadius: bare ? 0 : r },
          style,
        ]}
      >
        <Image source={art} style={{ width: bare ? size : size * 0.92, height: bare ? size : size * 0.92 }} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size, borderRadius: r, backgroundColor: fill }, style]} />
  );
}

const styles = StyleSheet.create({
  well: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,14,12,0.45)',
    overflow: 'hidden',
  },
  bare: {
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
});
