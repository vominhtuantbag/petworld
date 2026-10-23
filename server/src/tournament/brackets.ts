/**
 * Single-elimination brackets.
 *
 * Level bands match the client adventure bands in `src/world/progression.ts`:
 * 1–20, 21–50, 51+. The number used to place a player is the account's PvP
 * level (wins), not the local adventure level.
 *
 * `reportResult` is the hook a live arena can call later. The weekly clock
 * uses `playRound` until that arena exists.
 */

export type Seed = {
  userId: string;
  username: string;
  wins: number;
  level: number;
  region: string;
  preview?: boolean;
};

export type BracketMatch = {
  id: string;
  round: number;
  a: Seed | null;
  b: Seed | null;
  winnerId: string | null;
};

export function bandTier(level: number): 1 | 2 | 3 {
  if (level <= 20) return 1;
  if (level <= 50) return 2;
  return 3;
}

export function buildFirstRound(entrants: Seed[], idPrefix: string): BracketMatch[] {
  const ordered = [...entrants].sort((left, right) => right.wins - left.wins || left.username.localeCompare(right.username));
  const matches: BracketMatch[] = [];
  for (let index = 0; index < ordered.length; index += 2) {
    const a = ordered[index] ?? null;
    const b = ordered[index + 1] ?? null;
    matches.push({
      id: `${idPrefix}-r1-${index / 2}`,
      round: 1,
      a,
      b,
      winnerId: b ? null : a?.userId ?? null,
    });
  }
  return matches;
}

/** Higher win count takes the match about 70% of the time. Equal wins is a coin flip. */
export function playRound(matches: BracketMatch[], rng: () => number = Math.random): BracketMatch[] {
  return matches.map((match) => {
    if (match.winnerId || !match.a) return match;
    if (!match.b) return { ...match, winnerId: match.a.userId };
    const favorite = match.a.wins === match.b.wins ? match.a : match.a.wins > match.b.wins ? match.a : match.b;
    const underdog = favorite.userId === match.a.userId ? match.b : match.a;
    const winner = rng() < 0.7 ? favorite : underdog;
    return { ...match, winnerId: winner.userId };
  });
}

export function winnersOf(matches: BracketMatch[]): Seed[] {
  const winners: Seed[] = [];
  for (const match of matches) {
    const winner = match.a?.userId === match.winnerId ? match.a : match.b?.userId === match.winnerId ? match.b : null;
    if (winner) winners.push(winner);
  }
  return winners;
}

export function nextRound(previous: BracketMatch[], winners: Seed[], idPrefix: string): BracketMatch[] {
  const round = (previous[0]?.round ?? 0) + 1;
  const matches: BracketMatch[] = [];
  for (let index = 0; index < winners.length; index += 2) {
    const a = winners[index] ?? null;
    const b = winners[index + 1] ?? null;
    matches.push({
      id: `${idPrefix}-r${round}-${index / 2}`,
      round,
      a,
      b,
      winnerId: b ? null : a?.userId ?? null,
    });
  }
  return matches;
}

export function reportResult(matches: BracketMatch[], matchId: string, winnerId: string): BracketMatch[] {
  return matches.map((match) => {
    if (match.id !== matchId || match.winnerId) return match;
    const legal = match.a?.userId === winnerId || match.b?.userId === winnerId;
    return legal ? { ...match, winnerId } : match;
  });
}

/** Play every remaining round. Used by the preview endpoint only. */
export function simulateBracket(entrants: Seed[], idPrefix: string, rng: () => number = Math.random): { matches: BracketMatch[]; champion: Seed | null } {
  let pending = buildFirstRound(entrants, idPrefix);
  const matches: BracketMatch[] = [];
  let guard = 0;
  while (pending.length > 0 && guard < 12) {
    guard += 1;
    const played = playRound(pending, rng);
    matches.push(...played);
    const winners = winnersOf(played);
    if (winners.length <= 1) return { matches, champion: winners[0] ?? null };
    pending = nextRound(played, winners, idPrefix);
  }
  return { matches, champion: null };
}
