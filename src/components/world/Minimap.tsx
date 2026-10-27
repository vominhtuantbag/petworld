import { Image, StyleSheet, Text, View } from 'react-native';

import { zoneIndexAt } from '../../world/tiers';
import type { FieldState, MonsterActor } from '../../world/types';

const PORTAL = require('../../../assets/images/gate111.png');

const PLAYER_COLOR = '#2f6bff';
const MONSTER_COLOR = '#111111';
const PORTAL_TINT = '#e11d2e';
/** Width divided by height. A little wider than tall, so the mark reads as an oval. */
const PORTAL_ASPECT = 1.65;

type Props = {
  field: FieldState;
};

/**
 * Hunting maps show you in blue, monsters in black, and portals as red ovals.
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
        <MapMarkers field={field} width={boardW} height={boardH} player={6} monster={4} portal={14} />
      </View>
    </View>
  );
}

function SectorMap({ field }: { field: FieldState }) {
  const cols = Math.max(1, field.provinceCols);
  const rows = Math.max(1, field.provinceRows);

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
                {here ? <MapMarkers field={field} width={14} height={14} player={5} monster={3} portal={8} /> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function MapMarkers({
  field,
  width,
  height,
  player,
  monster,
  portal,
}: {
  field: FieldState;
  width: number;
  height: number;
  player: number;
  monster: number;
  portal: number;
}) {
  const portals = field.sensors.filter((sensor) => sensor.toZone);
  const monsters = knownMonsters(field);
  const monsterSize = monster * 0.5;
  const portalH = Math.max(3, Math.round(portal / PORTAL_ASPECT));
  return (
    <>
      {monsters.map((actor) => (
        <View
          key={actor.id}
          style={[
            styles.monster,
            pin(actor.x, actor.y, field, width, height, monsterSize),
            { width: monsterSize, height: monsterSize, borderRadius: monsterSize / 2 },
          ]}
        />
      ))}
      {portals.map((sensor) => (
        <View
          key={sensor.id}
          style={[
            styles.portal,
            pin(sensor.x, sensor.y, field, width, height, portal, portalH),
            { width: portal, height: portalH, borderRadius: portalH / 2 },
          ]}
        >
          <Image
            source={PORTAL}
            resizeMode="cover"
            tintColor={PORTAL_TINT}
            accessibilityLabel={sensor.label}
            style={styles.portalArt}
          />
        </View>
      ))}
      <View style={[styles.player, pin(field.player.x, field.player.y, field, width, height, player), { width: player, height: player, borderRadius: player / 2 }]} />
    </>
  );
}

function knownMonsters(field: FieldState): MonsterActor[] {
  const byId = new Map<string, MonsterActor>();
  if (field.chunkSize > 0) {
    for (const chunk of Object.values(field.chunks)) {
      if (!chunk.generated) continue;
      for (const actor of chunk.monsters) byId.set(actor.id, actor);
    }
  }
  for (const actor of field.monsters) byId.set(actor.id, actor);
  return [...byId.values()];
}

function pin(x: number, y: number, field: FieldState, boardW: number, boardH: number, width: number, height = width) {
  const px = field.width > 0 ? x / field.width : 0;
  const py = field.height > 0 ? y / field.height : 0;
  return {
    left: Math.max(0, Math.min(boardW - width, px * boardW - width / 2)),
    top: Math.max(0, Math.min(boardH - height, py * boardH - height / 2)),
  };
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
  player: {
    position: 'absolute',
    backgroundColor: PLAYER_COLOR,
  },
  monster: {
    position: 'absolute',
    backgroundColor: MONSTER_COLOR,
  },
  portal: {
    position: 'absolute',
    overflow: 'hidden',
  },
  portalArt: {
    width: '100%',
    height: '100%',
  },
  caption: { color: '#f6f1e7', fontSize: 9, fontWeight: '700', marginBottom: 3 },
  plate: { borderRadius: 4, overflow: 'hidden' },
});
