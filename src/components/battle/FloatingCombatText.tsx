import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

type Props = {
  amount: number;
  x: number;
  y: number;
  onDone: () => void;
};

const RISE = 46;
const DURATION = 880;

/**
 * One combat number. Damage rises in red as -N. Healing and revival rise in
 * green as +N. Transform and opacity run on the native driver.
 */
export function FloatingCombatText({ amount, x, y, onDone }: Props) {
  const rise = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const heal = amount > 0;
  const label = `${heal ? '+' : '-'}${Math.abs(Math.round(amount))}`;

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
      style={[styles.hold, { left: x - 40, top: y, opacity, transform: [{ translateY: rise }] }]}
    >
      <Text style={[styles.value, { color: heal ? '#39ff78' : '#ff2a2a' }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hold: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
    zIndex: 90,
  },
  value: {
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
