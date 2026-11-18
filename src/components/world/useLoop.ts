import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/** One looping 0→1 value, driven natively. `offset` staggers props that share a period. */
export function useLoop(ms: number, offset = 0): Animated.Value {
  const value = useRef(new Animated.Value(offset % 1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }),
    );
    value.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [ms, value]);
  return value;
}
