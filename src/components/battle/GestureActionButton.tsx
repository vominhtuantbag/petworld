import { useRef, type ReactNode } from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { HOLD_MS } from '../../hooks/useQuickTarget';
import { combatSfx } from '../../world/combat/combatSfx';
import { styles as court } from './courtChrome';

type Props = {
  label: string;
  hint?: string;
  testID?: string;
  size: number;
  font: number;
  tint?: string;
  icon?: ImageSourcePropType | null;
  /** Icon only. No fill or frame unless this button is the active command. */
  plain?: boolean;
  disabled?: boolean;
  dim?: boolean;
  picked?: boolean;
  hot?: boolean;
  /** When true, renders `aimPopup` anchored above this button. */
  aiming?: boolean;
  aimPopup?: ReactNode;
  onArm: () => void;
  onDoubleTap: () => void;
  onHoldStart: () => void;
  onHoldMove: (dx: number, dy: number) => void;
  onHoldEnd: (dy: number, cancelled: boolean) => void;
};

/**
 * Thumb-zone skill key. Tap arms, double-tap fires, hold+drag aims, release casts.
 * Press-in scales to 95% with a click; release springs back with a glow pulse.
 */
export function GestureActionButton({
  label,
  hint,
  testID,
  size,
  font,
  tint,
  icon,
  plain,
  disabled,
  dim,
  picked,
  hot,
  aiming,
  aimPopup,
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
  const press = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  disabledRef.current = disabled;
  handlers.current = { onArm, onDoubleTap, onHoldStart, onHoldMove, onHoldEnd };

  const clearHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  const pressIn = () => {
    combatSfx('click');
    ripple.setValue(0);
    Animated.timing(press, { toValue: 1, duration: 70, useNativeDriver: true }).start();
  };

  const pressOut = (pulse: boolean) => {
    Animated.spring(press, { toValue: 0, friction: 5, tension: 220, useNativeDriver: true }).start();
    if (!pulse) return;
    ripple.setValue(0);
    Animated.timing(ripple, { toValue: 1, duration: 320, useNativeDriver: true }).start();
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
        pressIn();
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
        if (disabledRef.current) {
          pressOut(false);
          return;
        }
        clearHold();
        if (held.current) {
          held.current = false;
          tapping.current = false;
          pressOut(true);
          handlers.current.onHoldEnd(dyRef.current, false);
          return;
        }
        const now = Date.now();
        const doubled = now - lastTapAt.current < HOLD_MS + 80 && tapping.current;
        tapping.current = false;
        pressOut(true);
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
        pressOut(false);
        if (held.current) {
          held.current = false;
          handlers.current.onHoldEnd(dyRef.current, true);
        }
        tapping.current = false;
      },
    }),
  ).current;

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });
  const shade = press.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] });
  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.55] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.55, 0] });

  return (
    <View style={local.wrap}>
      {aiming && aimPopup ? (
        <View pointerEvents="none" style={local.popup}>
          {aimPopup}
        </View>
      ) : null}
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          {...pan.panHandlers}
          accessibilityRole="button"
          accessibilityLabel={hint ?? label}
          accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(picked) }}
          testID={testID}
          style={[
            plain ? local.plain : court.square,
            {
              width: size,
              height: size,
              backgroundColor: plain ? 'transparent' : icon ? 'rgba(8,14,12,0.72)' : tint ?? '#24352f',
              overflow: 'hidden',
            },
            !plain && hot && !picked && court.roundHot,
            picked && (plain ? local.plainOn : court.picked),
            (disabled || dim) && court.fainted,
            (picked || aiming) && local.held,
          ]}
        >
          {icon ? (
            <Image source={icon} style={{ width: plain ? size : size * 0.86, height: plain ? size : size * 0.86, borderRadius: plain ? 8 : 6 }} resizeMode="contain" />
          ) : (
            <Text style={[court.roundLabel, { fontSize: font }]} numberOfLines={2}>
              {label}
            </Text>
          )}
          <Animated.View pointerEvents="none" style={[local.shade, { opacity: shade }]} />
          <Animated.View
            pointerEvents="none"
            style={[
              local.ripple,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const local = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 2 },
  popup: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: 8,
    zIndex: 40,
    elevation: 40,
  },
  held: { transform: [{ scale: 1.05 }] },
  plain: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  plainOn: {
    borderWidth: 3,
    borderColor: '#ffe082',
    borderRadius: 10,
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  ripple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 224, 130, 0.95)',
    backgroundColor: 'rgba(255, 224, 130, 0.18)',
  },
});
