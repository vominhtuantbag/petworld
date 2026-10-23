import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import type { Vitals } from '../../world/types';

type Props = {
  title: string;
  vitals: Vitals;
  gold: number;
  notice: string | null;
  adventureLevel?: number;
  adventureExp?: number;
  expNeeded?: number;
};

/** Compact landscape status row. Pools are read from the local exploration session. */
export function HudBar({ title, vitals, gold, notice, adventureLevel, adventureExp, expNeeded }: Props) {
  const { font } = useLayout();

  return (
    <View pointerEvents="none" style={styles.bar}>
      <Text style={[styles.title, { fontSize: font(14) }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
        {title}
        {adventureLevel != null ? ` · Cấp phiêu lưu ${adventureLevel} · ${adventureExp ?? 0}/${expNeeded ?? 0}` : ''}
      </Text>
      <View style={styles.row}>
        <Pool label="Máu" value={vitals.hp} max={vitals.maxHp} tint="#d4534a" />
        <Pool label="Mana" value={vitals.mana} max={vitals.maxMana} tint="#6d8ed6" />
        <Pool label="Thể lực" value={vitals.stamina} max={vitals.maxStamina} tint="#d7a441" />
        <Text style={[styles.gold, { fontSize: font(12) }]} numberOfLines={1}>
          {gold} vàng
        </Text>
      </View>
      {notice ? (
        <Text style={[styles.notice, { fontSize: font(12) }]} numberOfLines={1}>
          {notice}
        </Text>
      ) : null}
    </View>
  );
}

function Pool({ label, value, max, tint }: { label: string; value: number; max: number; tint: string }) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={styles.pool}>
      <Text style={styles.poolLabel} numberOfLines={1}>
        {label} {Math.round(value)}/{max}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: tint }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    margin: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(8, 14, 12, 0.72)',
    gap: 4,
    alignSelf: 'stretch',
    minWidth: 0,
  },
  title: { color: theme.ink, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pool: { flex: 1, minWidth: 0, maxWidth: 132, gap: 2 },
  poolLabel: { color: theme.muted, fontSize: 10, fontWeight: '600' },
  track: { height: 6, borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.28)', overflow: 'hidden' },
  fill: { height: '100%' },
  gold: { color: theme.gold, fontWeight: '800' },
  notice: { color: theme.ink },
});
