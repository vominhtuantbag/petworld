import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

import type { CombatFloatKind } from '../../world/combat/loop';

type Props = {
  amount: number;
  x: number;
  y: number;
  onDone: () => void;
  /** Distinct popup for crit / miss / heal. Defaults from amount sign. */
  kind?: CombatFloatKind;
};

const RISE = 46;
const DURATION = 880;

/**
 * One combat number. Damage rises in red as -N. Healing rises in green as +N.
 * Crit shows "CHÍ MẠNG!" + value; miss shows "TRƯỢT".
 */
export function FloatingCombatText({ amount, x, y, onDone, kind }: Props) {
  const rise = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const resolved: CombatFloatKind = kind ?? (amount > 0 ? 'heal' : 'damage');
  const heal = resolved === 'heal';
  const crit = resolved === 'crit';
  const miss = resolved === 'miss';
  const label = miss
    ? 'TRƯỢT'
    : crit
      ? `CHÍ MẠNG! -${Math.abs(Math.round(amount)) || ''}`
      : `${heal ? '+' : '-'}${Math.abs(Math.round(amount))}`;
  const color = miss ? '#f0e6c8' : crit ? '#ffd34d' : heal ? '#39ff78' : '#ff2a2a';

  useEffect(() => {
    const motion = Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.delay(360),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 440,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rise, {
        toValue: -RISE,
        duration: DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    motion.start(({ finished }) => {
      if (finished) onDoneRef.current();
    });
    return () => motion.stop();
  }, [opacity, rise]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.hold, { left: x - 48, top: y, opacity, transform: [{ translateY: rise }] }]}
    >
      <Text style={[styles.value, { color, fontSize: crit || miss ? 16 : 18 }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hold: {
    position: 'absolute',
    width: 96,
    alignItems: 'center',
    zIndex: 90,
  },
  value: {
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
