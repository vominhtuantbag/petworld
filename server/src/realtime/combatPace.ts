/**
 * Rest after a resolved strike, before the next unit may act.
 * Keep these numbers aligned with `SLASH_MS` and `TURN_GAP_MS`
 * in `src/world/combat/loop.ts`. The client holds the turn ring for the
 * same window, so the server clock must not start early.
 */
const SLASH_MS = 500;
const TURN_GAP_MS = 1500;

export function strikeRestMs(lastHit: { damage: number } | null | undefined): number {
  const swing = lastHit && lastHit.damage > 0 ? SLASH_MS : 0;
  return swing + TURN_GAP_MS;
}
