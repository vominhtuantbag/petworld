import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { elementLabel, type ElementId } from '../../world/combat/elements';
import { FaceArt } from './courtChrome';

export type InfoPanelUnit = {
  id: string;
  name: string;
  tint: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  shieldHp?: number;
  level?: number;
  element?: ElementId | string | null;
  kindId?: string;
};

type Props = {
  title: string;
  unit: InfoPanelUnit | null;
  side: 'left' | 'right';
  avatarSize?: number;
  portrait?: ReactNode;
  footer?: ReactNode;
  testID?: string;
};

const ELEMENT_TINT: Record<string, string> = {
  plains: '#8bc34a',
  mountain: '#90a4ae',
  forest: '#43a047',
  swamp: '#6d4c41',
  beach: '#4fc3f7',
  ocean: '#0288d1',
  frost: '#81d4fa',
  savanna: '#c0ca33',
  volcano: '#e53935',
  desert: '#ffb74d',
  darkness: '#7e57c2',
  light: '#fff176',
  heaven: '#ce93d8',
  hell: '#bf360c',
  chaos: '#ab47bc',
  cosmic: '#5c6bc0',
};

function shortElement(element: string | null | undefined): string {
  if (!element) return '—';
  const label = elementLabel(element as ElementId);
  return label.length <= 6 ? label : label.slice(0, 5);
}

/** Top-corner combat dossier for the active unit or selected target. */
export function BattleInfoPanel({ title, unit, side, avatarSize = 44, portrait, footer, testID }: Props) {
  const shield = Math.max(0, Math.round(unit?.shieldHp ?? 0));
  const element = unit?.element ?? null;
  const tint = element ? ELEMENT_TINT[element] ?? '#9aa89f' : '#9aa89f';
  return (
    <View
      style={[styles.panel, side === 'right' && styles.panelRight]}
      testID={testID}
      accessibilityLabel={unit ? `${title}: ${unit.name}` : title}
    >
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {unit ? (
        <View style={[styles.row, side === 'right' && styles.rowRight]}>
          <View style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
            {portrait ?? (
              <FaceArt kindId={unit.kindId} tint={unit.tint} name={unit.name} size={avatarSize - 2} facing={side === 'left' ? 'right' : 'left'} />
            )}
          </View>
          <View style={[styles.meta, side === 'right' && styles.metaRight]}>
            <Text style={[styles.name, side === 'right' && styles.alignRight]} numberOfLines={1}>
              {unit.name}
            </Text>
            <View style={[styles.badgeRow, side === 'right' && styles.badgeRowRight]}>
              <Text style={styles.lvBadge}>LV {unit.level ?? '—'}</Text>
              <View style={[styles.elementChip, { borderColor: tint, backgroundColor: `${tint}33` }]}>
                <View style={[styles.elementDot, { backgroundColor: tint }]} />
                <Text style={[styles.elementText, { color: tint }]} numberOfLines={1}>
                  {shortElement(element)}
                </Text>
              </View>
            </View>
            <Text style={[styles.line, side === 'right' && styles.alignRight]} numberOfLines={1}>
              HP {Math.round(unit.hp)}/{Math.round(unit.maxHp)}
            </Text>
            <Text style={[styles.line, side === 'right' && styles.alignRight]} numberOfLines={1}>
              MP {Math.round(unit.mp)}/{Math.round(unit.maxMp)}
            </Text>
            {shield > 0 ? (
              <Text style={[styles.line, side === 'right' && styles.alignRight]} numberOfLines={1}>
                SHD {shield}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>—</Text>
      )}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 168,
    maxWidth: '28%',
    minWidth: 132,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 14, 16, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 8,
  },
  panelRight: { alignItems: 'flex-end' },
  title: {
    color: '#e4c27a',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRight: { flexDirection: 'row-reverse' },
  avatar: {
    overflow: 'hidden',
    backgroundColor: '#d7d2c8',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  meta: { flex: 1, minWidth: 0, gap: 1 },
  metaRight: { alignItems: 'flex-end' },
  name: { color: '#fff', fontWeight: '900', fontSize: 12 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  badgeRowRight: { flexDirection: 'row-reverse' },
  lvBadge: {
    color: '#1b140c',
    backgroundColor: '#e4c27a',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  elementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  elementDot: { width: 6, height: 6, borderRadius: 3 },
  elementText: { fontSize: 9, fontWeight: '900' },
  line: {
    color: '#f6f1e7',
    fontSize: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  alignRight: { textAlign: 'right' },
  empty: { color: 'rgba(246,241,231,0.55)', fontWeight: '700', fontSize: 12 },
});
