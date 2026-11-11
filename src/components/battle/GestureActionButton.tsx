import { useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { HOLD_MS } from '../../hooks/useQuickTarget';
import { styles as court } from './courtChrome';

type Props = {
  label: string;
  hint?: string;
  testID?: string;
  size: number;
  font: number;
  tint?: string;
  disabled?: boolean;
  dim?: boolean;
  picked?: boolean;
  hot?: boolean;
  onArm: () => void;
  onDoubleTap: () => void;
  onHoldStart: () => void;
  onHoldMove: (dx: number, dy: number) => void;
  onHoldEnd: (dy: number, cancelled: boolean) => void;
};

/**
 * Thumb-zone skill key. Tap arms, double-tap fires, hold+drag aims, release casts.
 */
export function GestureActionButton({
  label,
  hint,
  testID,
  size,
  font,
  tint,
  disabled,
  dim,
  picked,
  hot,
  onArm,
  onDoubleTap,
  onHoldStart,
  onHoldMove,
  onHoldEnd,
}: Props) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const tapping = useRef(false);
  const lastTapAt = useRef(0);
  const dyRef = useRef(0);
  const disabledRef = useRef(disabled);
  const handlers = useRef({ onArm, onDoubleTap, onHoldStart, onHoldMove, onHoldEnd });
  disabledRef.current = disabled;
  handlers.current = { onArm, onDoubleTap, onHoldStart, onHoldMove, onHoldEnd };

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        if (disabledRef.current) return;
        held.current = false;
        tapping.current = true;
        dyRef.current = 0;
        clearHold();
        holdTimer.current = setTimeout(() => {
          held.current = true;
          handlers.current.onHoldStart();
        }, HOLD_MS);
      },
      onPanResponderMove: (_event, gesture) => {
        if (disabledRef.current) return;
        dyRef.current = gesture.dy;
        if (!held.current && (Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10)) {
          held.current = true;
          clearHold();
          handlers.current.onHoldStart();
        }
        if (held.current) handlers.current.onHoldMove(gesture.dx, gesture.dy);
      },
      onPanResponderRelease: () => {
        if (disabledRef.current) return;
        clearHold();
        if (held.current) {
          held.current = false;
          tapping.current = false;
          handlers.current.onHoldEnd(dyRef.current, false);
          return;
        }
        const now = Date.now();
        const doubled = now - lastTapAt.current < HOLD_MS + 80 && tapping.current;
        tapping.current = false;
        if (doubled) {
          lastTapAt.current = 0;
          handlers.current.onDoubleTap();
        } else {
          lastTapAt.current = now;
          handlers.current.onArm();
        }
      },
      onPanResponderTerminate: () => {
        clearHold();
        if (held.current) {
          held.current = false;
          handlers.current.onHoldEnd(dyRef.current, true);
        }
        tapping.current = false;
      },
    }),
  ).current;

  return (
    <View
      {...pan.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={hint ?? label}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(picked) }}
      testID={testID}
      style={[
        court.square,
        {
          width: size,
          height: size,
          backgroundColor: tint ?? '#24352f',
        },
        hot && !picked && court.roundHot,
        picked && court.picked,
        (disabled || dim) && court.fainted,
        picked && local.held,
      ]}
    >
      <Text style={[court.roundLabel, { fontSize: font }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const local = StyleSheet.create({
  held: { transform: [{ scale: 1.05 }] },
});
