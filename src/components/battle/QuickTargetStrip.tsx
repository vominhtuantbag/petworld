import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import type { QuickTargetUnit } from '../../hooks/useQuickTarget';
import { FaceArt } from './courtChrome';

type Chip = QuickTargetUnit & {
  portrait?: ReactNode;
};

type Props = {
  units: readonly Chip[];
  focusId: string | null;
  aiming?: boolean;
  size?: number;
  testIDPrefix?: string;
};

/** Compact enemy strip shown while holding a skill (popup above the button). */
export function QuickTargetStrip({
  units,
  focusId,
  aiming,
  size = 36,
  testIDPrefix = 'quick-target',
}: Props) {
  if (!units.length) return null;
  return (
    <View style={styles.wrap} accessibilityLabel="Quick Target" testID={`${testIDPrefix}-strip`}>
      <Text style={styles.caption} numberOfLines={1}>
        {aiming ? 'Thả để ra đòn · kéo xuống hủy' : 'Quick Target'}
      </Text>
      <View style={styles.row}>
        {units.map((unit, index) => (
          <StripChip
            key={unit.id}
            unit={unit}
            index={index}
            selected={focusId === unit.id && unit.hp > 0}
            aiming={Boolean(aiming)}
            size={size}
            testID={`${testIDPrefix}-${index + 1}`}
          />
        ))}
      </View>
    </View>
  );
}

function StripChip({
  unit,
  index,
  selected,
  aiming,
  size,
  testID,
}: {
  unit: Chip;
  index: number;
  selected: boolean;
  aiming: boolean;
  size: number;
  testID: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? (aiming ? 1.24 : 1.12) : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 220,
    }).start();
  }, [aiming, scale, selected]);

  const downed = unit.hp <= 0;
  return (
    <Animated.View
      testID={testID}
      style={[
        styles.chip,
        { width: size, height: size, transform: [{ scale }] },
        selected && styles.chipOn,
        downed && styles.down,
      ]}
    >
      <Text style={styles.index}>{index + 1}</Text>
      {unit.portrait ?? (
        <FaceArt kindId={unit.kindId} tint={unit.tint} name={unit.name} size={size - 6} facing="left" />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(12, 16, 20, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    minWidth: 96,
  },
  caption: {
    color: '#f6f1e7',
    fontWeight: '800',
    fontSize: 10,
    textAlign: 'right',
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 6 },
  chip: {
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: '#24352f',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { borderColor: '#ff2d2d' },
  down: { opacity: 0.5 },
  index: {
    position: 'absolute',
    top: 1,
    left: 3,
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    zIndex: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
