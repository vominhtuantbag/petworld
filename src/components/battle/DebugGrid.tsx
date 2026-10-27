import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useMapGrid } from '../../state/mapGrid';
import { GRID_COLS, GRID_ROWS, SHOW_DEBUG_GRID } from './courtSlots';

/** Hairline A1–P32 grid over the landscape viewport. Touches pass through. */
export const DebugGrid = memo(function DebugGrid() {
  const [shown] = useMapGrid();
  if (!SHOW_DEBUG_GRID || !shown) return null;
  return (
    <View pointerEvents="none" style={styles.grid} testID="layout-debug-grid">
      {GRID_ROWS.map((row) => (
        <View key={row} style={styles.row}>
          {GRID_COLS.map((col) => (
            <View key={col} style={styles.cell}>
              <Text style={styles.label} numberOfLines={1}>
                {row}
                {col}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 80,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 70, 70, 0.65)',
  },
  row: { flex: 1, flexDirection: 'row' },
  cell: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 70, 70, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    color: 'rgba(255, 64, 64, 0.92)',
    fontSize: 6,
    fontWeight: '700',
    lineHeight: 8,
  },
});
