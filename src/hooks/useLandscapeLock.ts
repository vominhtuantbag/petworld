import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

/**
 * Asks the OS for a landscape lock. iOS can refuse while the window is
 * resizable (iPad split view, iPhone mirroring), and mobile browsers only
 * honor the lock in fullscreen after a user gesture. The layout still
 * reflows from the real window size when the lock does not apply.
 */
export function useLandscapeLock() {
  useEffect(() => {
    let cancelled = false;

    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch((error: unknown) => {
      if (cancelled) return;
      console.warn('[Game Thư Giãn] Landscape lock was not applied.', error);
    });

    return () => {
      cancelled = true;
    };
  }, []);
}
