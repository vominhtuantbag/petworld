import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

type Props = {
  label: string;
  hp: number;
  maxHp: number;
  fill: string;
  align: 'left' | 'right';
};

export function HealthBar({ label, hp, maxHp, fill, align }: Props) {
  const ratio = maxHp <= 0 ? 0 : Math.max(0, Math.min(1, hp / maxHp));

  return (
    <View style={[styles.wrap, align === 'right' && styles.right]}>
      <Text style={[styles.label, align === 'right' && styles.rightText]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: fill }]} />
      </View>
      <Text style={[styles.value, align === 'right' && styles.rightText]}>
        {hp} / {maxHp}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  right: {
    alignItems: 'flex-end',
  },
  label: {
    color: theme.ink,
    fontWeight: '700',
  },
  value: {
    color: theme.muted,
    fontSize: 12,
  },
  rightText: {
    textAlign: 'right',
  },
  track: {
    height: 10,
    width: '100%',
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.28)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
});
