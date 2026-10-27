/**
 * Turn queue. Speed sorts the round. A hero with initiative is pulled
 * to the front for round 1 only. Later rounds follow speed alone.
 */

export type TurnUnit = {
  id: string;
  speed: number;
  hp: number;
  side: 'player' | 'ally' | 'wild';
  initiative: boolean;
};

export function turnOrder(units: readonly TurnUnit[], round: number): string[] {
  const living = units.filter((unit) => unit.hp > 0);
  const bySpeed = [...living].sort((a, b) => b.speed - a.speed || a.id.localeCompare(b.id));
  const hero = bySpeed.find((unit) => unit.side === 'player' && unit.initiative);
  if (round <= 1 && hero) {
    return [hero.id, ...bySpeed.filter((unit) => unit.id !== hero.id).map((unit) => unit.id)];
  }
  return bySpeed.map((unit) => unit.id);
}

/**
 * Upcoming faces, current turn first. Dead ids are left out.
 * The rest of this round follows, then the fighters who already acted wrap behind them.
 */
export function upcomingQueue(order: readonly string[], turnId: string, living: ReadonlySet<string>): string[] {
  const alive = order.filter((id) => living.has(id));
  if (!living.has(turnId)) return alive;
  const start = alive.indexOf(turnId);
  if (start <= 0) return alive;
  return [...alive.slice(start), ...alive.slice(0, start)];
}
