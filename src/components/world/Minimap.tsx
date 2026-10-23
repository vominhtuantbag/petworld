import { StyleSheet, Text, View } from 'react-native';

import { zoneIndexAt } from '../../world/tiers';
import type { FieldState } from '../../world/types';

type Props = {
  field: FieldState;
};

/**
 * Hunting maps show where you are and the level band under your feet.
 * The five uneven zones stay in the sim. Their edges are not drawn.
 * Expansion sectors keep the province grid.
 */
export function Minimap({ field }: Props) {
  if ((field.zones?.length ?? 0) >= 5) return <ZoneMap field={field} />;
  return <SectorMap field={field} />;
}

const SAMPLE_COLS = 16;
const SAMPLE_ROWS = 8;
const CELL = 8;

function ZoneMap({ field }: { field: FieldState }) {
  const px = field.width > 0 ? field.player.x / field.width : 0;
  const py = field.height > 0 ? field.player.y / field.height : 0;
  const here = zoneIndexAt(field.player.x, field.player.y, field.zones);
  const zone = field.zones[here];
  const boardW = SAMPLE_COLS * (CELL + 1);
  const boardH = SAMPLE_ROWS * (CELL + 1);

  return (
    <View testID="minimap" style={styles.board} pointerEvents="none">
      <Text style={styles.caption}>
        Bản đồ {field.tier}/10 · cấp {zone?.levelMin ?? field.levelMin}–{zone?.levelMax ?? field.levelMax}
      </Text>
      <View style={[styles.plate, { width: boardW, height: boardH, backgroundColor: field.ground }]}>
        <View
          style={[
            styles.dot,
            {
              left: Math.max(0, Math.min(boardW - 4, px * boardW)),
              top: Math.max(0, Math.min(boardH - 4, py * boardH)),
            },
          ]}
        />
      </View>
    </View>
  );
}

function SectorMap({ field }: { field: FieldState }) {
  const cols = Math.max(1, field.provinceCols);
  const rows = Math.max(1, field.provinceRows);
  const px = field.width > 0 ? field.player.x / field.width : 0;
  const py = field.height > 0 ? field.player.y / field.height : 0;

  return (
    <View testID="minimap" style={styles.board} pointerEvents="none">
      {Array.from({ length: rows }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: cols }, (_, col) => {
            const here = col === field.sectorCol && row === field.sectorRow;
            const neighbor = Math.abs(col - field.sectorCol) + Math.abs(row - field.sectorRow) === 1;
            return (
              <View key={col} style={[styles.cell, here ? styles.here : null, neighbor ? styles.near : null]}>
                {here ? <Text style={styles.level}>{field.levelMin}</Text> : null}
                {here ? (
                  <View
                    style={[
                      styles.dot,
                      {
                        left: Math.max(1, Math.min(10, px * 12)),
                        top: Math.max(1, Math.min(10, py * 12)),
                      },
                    ]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    marginRight: 12,
    marginTop: 8,
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(8, 14, 12, 0.72)',
  },
  row: { flexDirection: 'row' },
  cell: {
    width: 14,
    height: 14,
    margin: 1,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  near: { backgroundColor: 'rgba(228, 194, 122, 0.28)' },
  here: { backgroundColor: 'rgba(228, 194, 122, 0.85)' },
  level: { position: 'absolute', left: 1, top: 0, fontSize: 8, color: '#1b1408', fontWeight: '700' },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10211c',
  },
  caption: { color: '#f6f1e7', fontSize: 9, fontWeight: '700', marginBottom: 3 },
  plate: { borderRadius: 4, overflow: 'hidden' },
});
