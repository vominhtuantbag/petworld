/**
 * Squad setup and the duel unmount the map. That used to emit world:leave
 * and drop the player from the zone, so the match socket could no longer
 * find them. Hold presence until the fight is over.
 */
let held = 0;

export function holdPresence(): () => void {
  held += 1;
  return () => {
    held = Math.max(0, held - 1);
  };
}

export function presenceHeld(): boolean {
  return held > 0;
}
