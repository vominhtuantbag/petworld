import { Children, cloneElement, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

export type Step = { key: number; x: number; y: number };
export type Fate = { key: number; kind: 'tear' | 'heart' };

type Props = {
  children: ReactNode;
  /** Held offset. The fighter walks here and stays until sent home. */
  step: Step | null;
  /** Bumps when a sword should slash this fighter. The slash lasts 0.5s and does not shake. */
  slashKey: number;
  /** Bumps when the slash has finished and the body should shudder. */
  shakeKey: number;
  fate: Fate | null;
};

/**
 * Short stance, then a 0.5s downward sword, then the impact shake.
 * A killing blow tears the body in half for 0.5s, then it stays gone.
 */
export function CourtFx({ children, step, slashKey, shakeKey, fate }: Props) {
  const shiftX = useRef(new Animated.Value(0)).current;
  const shiftY = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const sword = useRef(new Animated.Value(0)).current;
  const tear = useRef(new Animated.Value(0)).current;
  const heart = useRef(new Animated.Value(0)).current;
  const stepSeen = useRef(0);
  const slashSeen = useRef(0);
  const shakeSeen = useRef(0);
  const fateSeen = useRef(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [torn, setTorn] = useState(false);

  useEffect(() => {
    if (!step || step.key === stepSeen.current) return;
    stepSeen.current = step.key;
    const motion = Animated.parallel([
      Animated.timing(shiftX, { toValue: step.x, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(shiftY, { toValue: step.y, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    motion.start();
    return () => motion.stop();
  }, [shiftX, shiftY, step]);

  useEffect(() => {
    if (slashKey === 0 || slashKey === slashSeen.current) return;
    slashSeen.current = slashKey;
    sword.setValue(0);
    const motion = Animated.timing(sword, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    motion.start();
    return () => motion.stop();
  }, [slashKey, sword]);

  useEffect(() => {
    if (shakeKey === 0 || shakeKey === shakeSeen.current) return;
    shakeSeen.current = shakeKey;
    shake.setValue(0);
    const motion = Animated.timing(shake, { toValue: 1, duration: 160, useNativeDriver: true });
    motion.start();
    return () => motion.stop();
  }, [shake, shakeKey]);

  useEffect(() => {
    if (!fate || fate.key === fateSeen.current) return;
    fateSeen.current = fate.key;
    if (fate.kind === 'heart') {
      heart.setValue(0);
      const motion = Animated.spring(heart, { toValue: 1, friction: 5, useNativeDriver: true });
      motion.start();
      return () => motion.stop();
    }
    setTorn(true);
    const motion = Animated.timing(tear, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    motion.start();
    return () => motion.stop();
  }, [fate, heart, tear]);

  const swordY = sword.interpolate({ inputRange: [0, 0.72, 1], outputRange: [-34, 10, 14] });
  const swordRot = sword.interpolate({ inputRange: [0, 0.72, 1], outputRange: ['-42deg', '16deg', '22deg'] });
  const swordOpacity = sword.interpolate({ inputRange: [0, 0.12, 0.72, 1], outputRange: [0, 1, 1, 0] });
  const shakeX = shake.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -2, 2, -1, 0] });
  const leftX = tear.interpolate({ inputRange: [0, 1], outputRange: [0, -36] });
  const rightX = tear.interpolate({ inputRange: [0, 1], outputRange: [0, 36] });
  const leftRot = tear.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-11deg'] });
  const rightRot = tear.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '13deg'] });
  const tearOpacity = tear.interpolate({ inputRange: [0, 0.62, 1], outputRange: [1, 1, 0] });
  const heartScale = heart.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });

  const width = box.w || 80;
  const body = torn ? null : children;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.fill, { transform: [{ translateX: shiftX }, { translateY: shiftY }] }]}
      onLayout={(event) => {
        const nextW = Math.round(event.nativeEvent.layout.width);
        const nextH = Math.round(event.nativeEvent.layout.height);
        setBox((current) => (current.w === nextW && current.h === nextH ? current : { w: nextW, h: nextH }));
      }}
    >
      <Animated.View pointerEvents="box-none" style={[styles.fill, { transform: [{ translateX: shakeX }] }]}>
        {body}
        {torn ? (
          <Animated.View pointerEvents="none" style={[styles.halves, { opacity: tearOpacity }]}>
            <Animated.View style={[styles.half, styles.leftHalf, { transform: [{ translateX: leftX }, { rotate: leftRot }] }]}>
              <View style={styles.clip}>
                <View style={{ width, height: '100%' }}>{mirror(children, 'left')}</View>
                <TearEdge side="right" />
              </View>
            </Animated.View>
            <Animated.View style={[styles.half, styles.rightHalf, { transform: [{ translateX: rightX }, { rotate: rightRot }] }]}>
              <View style={styles.clip}>
                <View style={{ width, marginLeft: -width / 2, height: '100%' }}>{mirror(children, 'right')}</View>
                <TearEdge side="left" />
              </View>
            </Animated.View>
          </Animated.View>
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.sword, { opacity: swordOpacity, transform: [{ translateY: swordY }, { rotate: swordRot }] }]}>
          <Svg width={26} height={52} viewBox="0 0 26 52">
            <Polygon points="13,1 17,30 13,34 9,30" fill="#f4f7fb" stroke="#9aa8b5" strokeWidth={1} />
            <Polygon points="6,30 20,30 18,36 8,36" fill="#d4a24a" />
            <Polygon points="12,36 14,36 14,48 12,48" fill="#6a4328" />
          </Svg>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.heart, { opacity: heart, transform: [{ scale: heartScale }] }]}>
          <Svg width={34} height={32} viewBox="0 0 32 28">
            <Path d="M16 26S3 18.6 3 11a7 7 0 0 1 13-3 7 7 0 0 1 13 3c0 7.6-13 15-13 15z" fill="#e10600" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function mirror(children: ReactNode, side: string) {
  return Children.map(children, (child, index) => (isValidElement(child) ? cloneElement(child, { key: `${side}-${index}` }) : child));
}

function TearEdge({ side }: { side: 'left' | 'right' }) {
  const points = side === 'right' ? '10,0 2,8 11,16 1,24 12,32 2,40 11,48 3,56 12,64 2,72 10,80' : '0,0 8,8 0,16 9,24 0,32 8,40 0,48 9,56 0,64 8,72 0,80';
  return (
    <Svg width={12} height={120} viewBox="0 0 12 80" preserveAspectRatio="none" style={side === 'right' ? styles.edgeRight : styles.edgeLeft}>
      <Polygon points={points} fill="#f6f1e4" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center' },
  halves: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  half: { position: 'absolute', top: 0, bottom: 0, width: '50%' },
  leftHalf: { left: 0 },
  rightHalf: { left: '50%' },
  clip: { flex: 1, overflow: 'hidden' },
  edgeRight: { position: 'absolute', right: -4, top: 0, bottom: 0 },
  edgeLeft: { position: 'absolute', left: -4, top: 0, bottom: 0 },
  sword: { position: 'absolute', top: -6, zIndex: 6 },
  heart: { position: 'absolute', top: -28, zIndex: 5 },
});
