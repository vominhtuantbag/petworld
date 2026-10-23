import { useEffect, useRef } from 'react';

/**
 * One animation frame loop. `step` receives seconds since the previous
 * frame, capped so a background tab cannot teleport monsters across the map.
 * The latest callback is used without restarting the loop.
 */
export function useGameLoop(active: boolean, step: (dt: number) => void) {
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let last = now();
    const tick = (time: number) => {
      const dt = Math.min(0.05, Math.max(0, (time - last) / 1000));
      last = time;
      stepRef.current(dt);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);
}

function now(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}
