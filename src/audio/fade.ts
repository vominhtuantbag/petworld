type VolumePlayer = { volume: number };

export type FadeHandle = { cancelled: boolean };

/**
 * Linear volume ramp. `expo-audio` has no built-in fade, so we step volume
 * on a short interval (works on native + web without extra deps).
 */
export function fadeVolume(
  player: VolumePlayer,
  from: number,
  to: number,
  ms: number,
  onDone?: () => void,
): FadeHandle {
  const handle: FadeHandle = { cancelled: false };
  const steps = Math.max(4, Math.round(ms / 40));
  const start = Math.max(0, Math.min(1, from));
  const end = Math.max(0, Math.min(1, to));
  let i = 0;
  player.volume = start;
  const tick = () => {
    if (handle.cancelled) return;
    i += 1;
    const t = Math.min(1, i / steps);
    player.volume = start + (end - start) * t;
    if (t >= 1) {
      onDone?.();
      return;
    }
    setTimeout(tick, Math.max(16, Math.round(ms / steps)));
  };
  setTimeout(tick, Math.max(16, Math.round(ms / steps)));
  return handle;
}

export function cancelFade(handle: FadeHandle | null | undefined) {
  if (handle) handle.cancelled = true;
}
