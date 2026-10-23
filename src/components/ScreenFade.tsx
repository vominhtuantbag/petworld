import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import type { SetupStep } from '../types/game';

const STEP_INDEX: Record<SetupStep, number> = {
  character: 0,
  region: 1,
  gameplay: 2,
};

/**
 * Short horizontal fade between setup steps. The first screen paints
 * immediately; later steps slide a few pixels so the change reads as motion
 * without hiding the landscape layout.
 */
export function ScreenFade({ screenKey, children }: { screenKey: SetupStep; children: ReactNode }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const previous = useRef(screenKey);

  useEffect(() => {
    if (previous.current === screenKey) return;
    const direction = STEP_INDEX[screenKey] >= STEP_INDEX[previous.current] ? 1 : -1;
    previous.current = screenKey;
    opacity.setValue(0);
    translateX.setValue(18 * direction);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, screenKey, translateX]);

  return (
    <Animated.View style={[styles.fill, { opacity, transform: [{ translateX }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
