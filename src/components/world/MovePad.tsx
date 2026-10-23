import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { Vec } from '../../world/types';

type Props = {
  onChange: (axis: Vec) => void;
  /** Command the sim is using right now, so the stick matches the character. */
  axis: Vec;
  size: number;
};

/**
 * Left-thumb stick. The finger is tracked in screen space from the pad's
 * origin at touch-down. `locationX` is not used after that: it is relative
 * to whichever child the touch hit, so the nub used to throw the vector
 * toward a corner. While the finger is down the nub draws that vector
 * immediately. With the finger up it follows `axis` (keyboard included),
 * which is the same command the character is walking.
 */
export function MovePad({ onChange, axis, size }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const origin = useRef({ x: 0, y: 0 });
  const holding = useRef(false);
  const [shown, setShown] = useState<Vec>(axis);

  useEffect(() => {
    if (holding.current) return;
    setShown((prev) => (prev.x === axis.x && prev.y === axis.y ? prev : { x: axis.x, y: axis.y }));
  }, [axis.x, axis.y]);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (event) => {
        holding.current = true;
        const { pageX, pageY, locationX, locationY } = event.nativeEvent;
        origin.current = { x: pageX - locationX, y: pageY - locationY };
        publish(pageX, pageY);
      },
      onPanResponderMove: (event, gesture) => {
        const native = event.nativeEvent;
        const pageX = Number.isFinite(native.pageX) ? native.pageX : gesture.moveX;
        const pageY = Number.isFinite(native.pageY) ? native.pageY : gesture.moveY;
        publish(pageX, pageY);
      },
      onPanResponderRelease: () => stop(),
      onPanResponderTerminate: () => stop(),
    }),
  ).current;

  function publish(pageX: number, pageY: number) {
    const next = vectorFrom(pageX, pageY, origin.current, sizeRef.current);
    setShown(next);
    onChangeRef.current(next);
  }

  function stop() {
    holding.current = false;
    setShown({ x: 0, y: 0 });
    onChangeRef.current({ x: 0, y: 0 });
  }

  const mag = Math.min(1, Math.hypot(shown.x, shown.y));
  const travel = size * 0.34;
  const knob = size * 0.16;
  const center = size / 2;
  const length = Math.hypot(shown.x, shown.y);
  const knobX = length > 0 ? (shown.x / length) * mag * travel : 0;
  const knobY = length > 0 ? (shown.y / length) * mag * travel : 0;

  return (
    <View testID="move-pad" style={[styles.pad, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size} height={size} pointerEvents="none">
        <Circle
          cx={center}
          cy={center}
          r={center - 2}
          fill="rgba(8, 14, 12, 0.5)"
          stroke={`rgba(228, 194, 122, ${0.4 + mag * 0.55})`}
          strokeWidth={mag > 0.05 ? 2.5 : 1.5}
        />
        <Circle cx={center} cy={center} r={3} fill="rgba(228, 194, 122, 0.45)" />
      </Svg>
      <View
        pointerEvents="none"
        style={[
          styles.nub,
          {
            width: knob * 2,
            height: knob * 2,
            borderRadius: knob,
            left: center + knobX - knob,
            top: center + knobY - knob,
            transform: [{ scale: 1 + mag * 0.08 }],
            shadowOpacity: 0.35 + mag * 0.55,
          },
        ]}
      />
      <View style={styles.catch} {...responder.panHandlers} />
    </View>
  );
}

function vectorFrom(pageX: number, pageY: number, origin: Vec, size: number): Vec {
  const dx = pageX - origin.x - size / 2;
  const dy = pageY - origin.y - size / 2;
  const radius = size * 0.38;
  const dead = radius * 0.16;
  const dist = Math.hypot(dx, dy);
  if (dist <= dead || radius <= dead) return { x: 0, y: 0 };
  const clamped = Math.min(dist, radius);
  const power = (clamped - dead) / (radius - dead);
  return { x: (dx / dist) * power, y: (dy / dist) * power };
}

const styles = StyleSheet.create({
  pad: {
    backgroundColor: 'rgba(8, 14, 12, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nub: {
    position: 'absolute',
    backgroundColor: 'rgba(228, 194, 122, 0.95)',
    borderWidth: 2,
    borderColor: '#f6e7c0',
    shadowColor: '#e4c27a',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 6,
  },
  catch: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
