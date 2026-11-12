import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { combatSfx } from '../../world/combat/combatSfx';

export type JuiceKind = 'crit' | 'hit';

type Pulse = { key: number; kind: JuiceKind };

/**
 * Screen flash + micro shake for crit/hit impact. Apply `stageStyle` on the battle stage.
 */
export function useCombatJuice() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const flash = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const serial = useRef(0);
  const seen = useRef(0);

  const trigger = useCallback((kind: JuiceKind) => {
    if (kind === 'crit') combatSfx('crit');
    serial.current += 1;
    setPulse({ key: serial.current, kind });
  }, []);

  useEffect(() => {
    if (!pulse || pulse.key === seen.current) return;
    seen.current = pulse.key;
    flash.setValue(0);
    shake.setValue(0);
    const flashPeak = pulse.kind === 'crit' ? 0.32 : 0.14;
    const motion = Animated.parallel([
      Animated.sequence([
        Animated.timing(flash, { toValue: flashPeak, duration: 35, useNativeDriver: true }),
        Animated.timing(flash, {
          toValue: 0,
          duration: pulse.kind === 'crit' ? 170 : 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(shake, { toValue: 1, duration: pulse.kind === 'crit' ? 200 : 110, useNativeDriver: true }),
    ]);
    motion.start();
    return () => motion.stop();
  }, [flash, pulse, shake]);

  const shakeX = shake.interpolate({
    inputRange: [0, 0.18, 0.36, 0.54, 0.72, 1],
    outputRange: pulse?.kind === 'crit' ? [0, -6, 6, -4, 3, 0] : [0, -3, 3, -2, 1, 0],
  });

  const stageStyle = {
    transform: [{ translateX: shakeX }],
  };

  const overlay = (
    <View pointerEvents="none" style={styles.root}>
      <Animated.View style={[styles.flash, { opacity: flash }]} />
    </View>
  );

  return { trigger, stageStyle, overlay };
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 120,
  },
  flash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#ffe8c8',
  },
});
