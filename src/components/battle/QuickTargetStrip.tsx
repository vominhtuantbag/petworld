import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { DOUBLE_TAP_MS, type QuickTargetUnit } from '../../hooks/useQuickTarget';
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
  onSelect: (id: string) => void;
  onDoubleSelect: (id: string) => void;
};

/** Mini enemy strip for hold-drag targeting. The hovered chip scales up. */
export function QuickTargetStrip({
  units,
  focusId,
  aiming,
  size = 40,
  testIDPrefix = 'quick-target',
  onSelect,
  onDoubleSelect,
}: Props) {
  if (!units.length) return null;
  return (
    <View style={styles.wrap} accessibilityLabel="Quick Target">
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
            onSelect={onSelect}
            onDoubleSelect={onDoubleSelect}
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
  onSelect,
  onDoubleSelect,
}: {
  unit: Chip;
  index: number;
  selected: boolean;
  aiming: boolean;
  size: number;
  testID: string;
  onSelect: (id: string) => void;
  onDoubleSelect: (id: string) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const lastTap = useRef(0);
  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? (aiming ? 1.22 : 1.12) : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 220,
    }).start();
  }, [aiming, scale, selected]);

  const downed = unit.hp <= 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mục tiêu ${index + 1} ${unit.name}`}
      testID={testID}
      disabled={downed}
      onPress={() => {
        const now = Date.now();
        if (now - lastTap.current <= DOUBLE_TAP_MS) {
          lastTap.current = 0;
          onDoubleSelect(unit.id);
          return;
        }
        lastTap.current = now;
        onSelect(unit.id);
      }}
    >
      <Animated.View
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2, minWidth: 88, flexShrink: 1 },
  caption: {
    color: '#f6f1e7',
    fontWeight: '800',
    fontSize: 10,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
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
  down: { opacity: 0.35 },
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
