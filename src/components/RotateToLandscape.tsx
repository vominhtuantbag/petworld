import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

import { theme } from '../theme/theme';
import { isMobileWeb } from '../web/mobileWeb';

const MESSAGE = 'Vui lòng xoay ngang màn hình điện thoại để trải nghiệm game tốt nhất! 📱↪️';

/**
 * Mobile web only. Portrait covers the game; turning to landscape removes
 * the cover on the same page.
 */
export function RotateToLandscape() {
  const { width, height } = useWindowDimensions();
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    if (!isMobileWeb() || typeof window === 'undefined') return;
    const update = () => setPortrait(window.innerWidth < window.innerHeight);
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const orientation = window.screen?.orientation;
    orientation?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      orientation?.removeEventListener?.('change', update);
    };
  }, []);

  useEffect(() => {
    if (!isMobileWeb()) return;
    setPortrait(width < height);
  }, [width, height]);

  if (!isMobileWeb() || !portrait) return null;
  return (
    <View accessibilityRole="alert" accessibilityLabel={MESSAGE} pointerEvents="auto" style={styles.cover} testID="rotate-landscape">
      <RotatingPhone />
      <Text style={styles.message}>{MESSAGE}</Text>
    </View>
  );
}

function RotatingPhone() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(spin, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(350),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-90deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }], transformOrigin: 'center' }}>
      <Svg width={72} height={120} viewBox="0 0 72 120">
        <Rect x="4" y="2" width="64" height="116" rx="12" fill="#1b322b" stroke={theme.gold} strokeWidth="4" />
        <Rect x="12" y="16" width="48" height="78" rx="4" fill="#0b1613" />
        <Circle cx="36" cy="106" r="5" fill={theme.gold} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2000000,
    backgroundColor: 'rgba(8, 14, 12, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 22,
  },
  message: {
    color: theme.ink,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
});
