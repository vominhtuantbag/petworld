import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import type { CombatFloatKind } from '../../world/combat/loop';

type Props = {
  amount: number;
  x: number;
  y: number;
  onDone: () => void;
  /** Distinct popup for crit / miss / heal. Defaults from amount sign. */
  kind?: CombatFloatKind;
  /** Crit impact: screen flash / shake host. */
  onImpact?: (kind: 'crit' | 'hit') => void;
};

const NORMAL_MS = 800;
const MISS_MS = 1100;
const HEAL_MS = 900;
const CRIT_MS = 950;

/**
 * Weighted combat numbers: parabolic damage, explosive crit, floaty miss, rising heal.
 */
export function FloatingCombatText({ amount, x, y, onDone, kind, onImpact }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(kind === 'crit' ? 0 : 0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const onDoneRef = useRef(onDone);
  const onImpactRef = useRef(onImpact);
  onDoneRef.current = onDone;
  onImpactRef.current = onImpact;

  const resolved: CombatFloatKind = kind ?? (amount > 0 ? 'heal' : 'damage');
  const scatter = useMemo(() => (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 10), []);
  const arcX = useMemo(() => (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 10), []);

  const heal = resolved === 'heal';
  const crit = resolved === 'crit';
  const miss = resolved === 'miss';
  const label = miss
    ? 'NÉ TRÁNH'
    : crit
      ? `CHÍ MẠNG!\n-${Math.abs(Math.round(amount)) || ''}`
      : `${heal ? '+' : '-'}${Math.abs(Math.round(amount))}`;

  useEffect(() => {
    if (crit) onImpactRef.current?.('crit');

    opacity.setValue(0);
    progress.setValue(0);
    scale.setValue(crit ? 0 : 0.85);

    const duration = crit ? CRIT_MS : miss ? MISS_MS : heal ? HEAL_MS : NORMAL_MS;
    const motion = Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: crit ? Easing.out(Easing.back(1.4)) : miss ? Easing.out(Easing.cubic) : Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: crit ? 60 : 70, useNativeDriver: true }),
        Animated.delay(Math.max(0, duration - 320)),
        Animated.timing(opacity, {
          toValue: 0,
          duration: Math.min(320, duration * 0.4),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      crit
        ? Animated.sequence([
            Animated.spring(scale, { toValue: 1.25, friction: 4, tension: 160, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true }),
          ])
        : Animated.spring(scale, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }),
    ]);
    motion.start(({ finished }) => {
      if (finished) onDoneRef.current();
    });
    return () => motion.stop();
  }, [amount, crit, heal, miss, opacity, progress, scale]);

  const translateY = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: crit ? [8, -28, -56] : miss ? [0, -22, -42] : heal ? [0, -30, -54] : [6, -34, -50],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: crit ? [0, scatter * 0.7, scatter] : miss ? [0, arcX * 0.2, arcX * 0.35] : heal ? [0, 0, 0] : [0, arcX * 0.55, arcX * 0.15],
  });

  const baseSize = crit ? 27 : miss ? 15 : 18;
  const color = miss ? '#9ec5e8' : crit ? '#ef4444' : heal ? '#22c55e' : '#fff6d6';
  const ghostColor = miss ? 'rgba(158,197,232,0.45)' : undefined;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.hold,
        {
          left: x - 56,
          top: y,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    >
      {miss ? (
        <Text style={[styles.value, styles.ghost, { color: ghostColor, fontSize: baseSize, transform: [{ translateX: -3 }, { translateY: 2 }] }]}>
          {label}
        </Text>
      ) : null}
      <Text
        style={[
          styles.value,
          {
            color,
            fontSize: baseSize,
            textShadowColor: crit ? '#FFD700' : 'rgba(0,0,0,0.9)',
            textShadowRadius: crit ? 4 : 3,
            textShadowOffset: crit ? { width: 0, height: 0 } : { width: 0, height: 1 },
          },
          crit && styles.critOutline,
        ]}
      >
        {label}
      </Text>
      {heal ? <HealSparks progress={progress} /> : null}
    </Animated.View>
  );
}

function HealSparks({ progress }: { progress: Animated.Value }) {
  const sparks = useMemo(
    () =>
      [0, 1, 2, 3].map((index) => ({
        key: index,
        x: -18 + index * 12 + (index % 2) * 4,
        rise: 18 + index * 6,
        delay: index * 0.08,
      })),
    [],
  );
  return (
    <View pointerEvents="none" style={styles.sparks}>
      {sparks.map((spark) => {
        const opacity = progress.interpolate({
          inputRange: [spark.delay, Math.min(1, spark.delay + 0.2), 1],
          outputRange: [0, 1, 0],
        });
        const ty = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [6, -spark.rise],
        });
        return (
          <Animated.Text
            key={spark.key}
            style={[styles.spark, { left: spark.x, opacity, transform: [{ translateY: ty }] }]}
          >
            ✦
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hold: {
    position: 'absolute',
    width: 112,
    alignItems: 'center',
    zIndex: 90,
  },
  value: {
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  critOutline: {
    borderColor: '#FFD700',
  },
  ghost: {
    position: 'absolute',
    fontWeight: '800',
  },
  sparks: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    height: 24,
    alignItems: 'center',
  },
  spark: {
    position: 'absolute',
    color: '#86efac',
    fontSize: 10,
    fontWeight: '900',
  },
});
