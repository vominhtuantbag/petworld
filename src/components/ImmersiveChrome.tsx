import { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const REVEAL_MS = 2600;
const EDGE = 20;

/**
 * Hides the mobile status bar for the whole session. A downward swipe that
 * starts at the top edge shows it, then it hides again on its own.
 * Web has no system status bar; the calls there are ignored.
 */
export function useImmersiveChrome() {
  const [hidden, setHidden] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealRef = useRef<() => void>(() => undefined);

  const hide = useCallback(() => {
    setHidden(true);
    try {
      StatusBar.setHidden(true, 'slide');
    } catch (error) {
      console.warn('[Game Thư Giãn] Status bar could not hide.', error);
    }
  }, []);

  const reveal = useCallback(() => {
    setHidden(false);
    try {
      StatusBar.setHidden(false, 'slide');
    } catch (error) {
      console.warn('[Game Thư Giãn] Status bar could not show.', error);
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, REVEAL_MS);
  }, [hide]);

  revealRef.current = reveal;

  useEffect(() => {
    hide();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hide]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (event, gesture) => {
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
