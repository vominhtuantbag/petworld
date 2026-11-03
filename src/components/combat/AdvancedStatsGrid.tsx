import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../theme/theme';
import {
  DEFAULT_CRIT_DAMAGE,
  normalizeAdvanced,
  type AdvancedInput,
} from '../../world/combat/advanced';

export type AdvancedStatValues = AdvancedInput & {
  tgh?: number;
  maxTgh?: number;
};

type Props = {
  stats: AdvancedStatValues | null | undefined;
  font: (size: number) => number;
  /** Tighter padding for inventory / squad cards. */
  compact?: boolean;
  /** Hide the section title when the parent already labels the block. */
  hideTitle?: boolean;
  title?: string;
};

type Row = {
  key: string;
  label: string;
  short: string;
  value: string;
};

/**
 * Compact RPG grid for the seven advanced combat rates.
 * Fits inventory panes, collection cards, and squad lists on web + mobile.
 */
export function AdvancedStatsGrid({
  stats,
  font,
  compact = false,
  hideTitle = false,
  title = 'Chỉ số nâng cao',
}: Props) {
  const rows = buildRows(stats);
  const fz = (size: number) => Math.max(8, font(compact ? size - 1 : size));

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]} accessibilityLabel={title}>
      {hideTitle ? null : (
        <Text style={[styles.title, { fontSize: fz(10) }]} numberOfLines={1}>
          {title}
        </Text>
      )}
      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row.key} style={[styles.cell, compact && styles.cellCompact]}>
            <Text style={[styles.short, { fontSize: fz(9) }]} numberOfLines={1}>
              {row.short}
            </Text>
            <Text style={[styles.value, { fontSize: fz(10) }]} numberOfLines={1}>
              {row.value}
            </Text>
            <Text style={[styles.label, { fontSize: fz(8) }]} numberOfLines={1}>
              {row.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** One-line summary for tight list cards. */
export function advancedStatsLine(stats: AdvancedStatValues | null | undefined): string {
  const rows = buildRows(stats);
  return rows.map((row) => `${row.short} ${row.value}`).join(' · ');
}

function buildRows(input: AdvancedStatValues | null | undefined): Row[] {
  const advanced = normalizeAdvanced(input);
  const maxTgh = Math.max(1, Math.round(Number.isFinite(input?.maxTgh) ? Number(input?.maxTgh) : advanced.maxTgh));
  const tghRaw = Number.isFinite(input?.tgh) ? Number(input?.tgh) : maxTgh;
  const tgh = Math.max(0, Math.min(maxTgh, Math.round(tghRaw)));
  const critDamage = Number.isFinite(input?.critDamage ?? input?.crit_dmg)
    ? Number(input?.critDamage ?? input?.crit_dmg)
    : advanced.critDamage || DEFAULT_CRIT_DAMAGE;

  return [
    { key: 'tgh', short: 'TGH', label: 'Thanh giáp phụ', value: `${tgh}/${maxTgh}` },
    { key: 'arm', short: 'Xuyên', label: 'Xuyên giáp', value: pct(advanced.armPen) },
    { key: 'res', short: 'Kháng', label: 'Kháng hiệu ứng', value: pct(advanced.res) },
    { key: 'crit', short: 'CM', label: 'Tỷ lệ chí mạng', value: pct(advanced.critRate) },
    { key: 'cdmg', short: 'STCM', label: 'Sát thương CM', value: mult(critDamage) },
    { key: 'eva', short: 'Né', label: 'Né tránh', value: pct(advanced.eva) },
    { key: 'acc', short: 'CX', label: 'Chính xác', value: pct(advanced.acc) },
  ];
}

function pct(fraction: number): string {
  const safe = Number.isFinite(fraction) ? fraction : 0;
  return `${Math.round(safe * 100)}%`;
}

function mult(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? value : DEFAULT_CRIT_DAMAGE;
  return `${safe.toFixed(2).replace(/\.?0+$/, '')}x`;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    paddingTop: 2,
  },
  wrapCompact: {
    gap: 2,
    paddingTop: 0,
  },
  title: {
    color: theme.gold,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cell: {
    width: '23%',
    minWidth: 52,
    flexGrow: 1,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: theme.lineSoft,
  },
  cellCompact: {
    minWidth: 46,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  short: {
    color: theme.gold,
    fontWeight: '800',
  },
  value: {
    color: theme.ink,
    fontWeight: '800',
  },
  label: {
    color: theme.dim,
    fontWeight: '600',
  },
});
