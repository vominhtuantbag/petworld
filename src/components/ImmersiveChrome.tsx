import { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const REVEAL_MS = 2600;
const EDGE = 20;

/**
 * Hides the mobile status bar for the whole session. A downward swipe that
 * starts at the top edge shows it, then it hides again on its own.
 * Avoid imperative StatusBar.setHidden on cold start — that path has crashed
 * some Android APKs right after splash. Declarative `hidden` is enough.
 */
export function useImmersiveChrome() {
  const [hidden, setHidden] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealRef = useRef<() => void>(() => undefined);

  const hide = useCallback(() => {
    setHidden(true);
  }, []);

  const reveal = useCallback(() => {
    if (Platform.OS === 'web') return;
    setHidden(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, REVEAL_MS);
  }, [hide]);

  revealRef.current = reveal;

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (event, gesture) => {
        if (Platform.OS === 'web') return false;
        const originY = event.nativeEvent.pageY - gesture.dy;
        return originY <= EDGE && gesture.dy >= 14 && gesture.dy > Math.abs(gesture.dx) * 1.2;
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy >= 14) revealRef.current();
      },
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;

  const bar = <StatusBar hidden={hidden} animated hideTransitionAnimation="slide" style="light" />;
  return { panHandlers: pan.panHandlers, bar };
}
