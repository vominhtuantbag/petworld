import { REGION_IDS } from '../catalog.js';
import type { CharacterRecord } from '../domain.js';
import { bandTier, buildFirstRound, nextRound, playRound, simulateBracket, winnersOf, type BracketMatch, type Seed } from './brackets.js';
import { nextMonthlyStart, nextWeeklyStart, registrationOpens } from './schedule.js';

/**
 * In-memory cups. Restarting the process clears entrants; a later store can
 * persist `cups` without changing the HTTP shape.
 *
 * Qualification reads the saved character (PvP level, wins, starting region).
 * The client does not send a level.
 */

export type CupStatus = 'registration' | 'live' | 'complete';

export type Cup = {
  id: string;
  kind: 'weekly' | 'monthly';
  region: string | null;
  tier: 1 | 2 | 3;
  nameVi: string;
  startsAt: string;
  registrationOpensAt: string;
  status: CupStatus;
  entrants: Seed[];
  matches: BracketMatch[];
  champion: Seed | null;
  nextRoundAt: string | null;
  rewardTitle: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const REGION_NAMES: Record<string, string> = {
  forest: 'Rừng rậm',
  beach: 'Bãi biển',
  mountains: 'Núi non',
  ocean: 'Đại dương',
  volcano: 'Núi lửa',
  desert: 'Sa mạc',
  plains: 'Đồng bằng',
  tundra: 'Băng giá',
  swamp: 'Đầm lầy',
  savannah: 'Thảo Nguyên',
};

export class TournamentBoard {
  private cups = new Map<string, Cup>();

  summary(now = new Date()) {
    this.ensure(now);
    return [...this.cups.values()].map(toSummary);
  }

  detail(id: string, now = new Date()): Cup | null {
    this.ensure(now);
    const cup = this.cups.get(id);
    return cup ? { ...cup, entrants: [...cup.entrants], matches: [...cup.matches] } : null;
  }

  enter(id: string, character: CharacterRecord, username: string, now = new Date()): { cup?: Cup; error?: string } {
    this.ensure(now);
    const cup = this.cups.get(id);
    if (!cup) return { error: 'Không tìm thấy giải.' };
    if (now.getTime() < Date.parse(cup.registrationOpensAt) || now.getTime() >= Date.parse(cup.startsAt) || cup.status !== 'registration') {
      return { error: 'Giải này chưa mở hoặc đã khóa danh sách.' };
    }
    if (cup.entrants.some((entry) => entry.userId === character.userId)) {
      return { cup: { ...cup } };
    }
    if (cup.kind === 'weekly') {
      if (bandTier(character.stats.level) !== cup.tier) return { error: 'Cấp đấu không thuộc bảng này.' };
      if (character.startingRegion !== cup.region) return { error: 'Hãy ghi danh ở khu vực xuất phát của nhân vật.' };
    } else if (!this.weeklyChampions(now).some((seed) => seed.userId === character.userId)) {
      return { error: 'Vô địch tháng chỉ nhận nhà vô địch khu vực của tháng này.' };
    }
    cup.entrants.push(seedFrom(character, username));
    return { cup: { ...cup, entrants: [...cup.entrants] } };
  }

  /**
   * Preview bracket. Stand-in names fill an eight-player board so the client
   * can show elimination without waiting for Monday. Nothing is written back.
   */
  simulate(id: string, username: string, now = new Date()) {
    this.ensure(now);
    const cup = this.cups.get(id);
    if (!cup) return null;
    const roster = [...cup.entrants];
    let extra = 0;
    while (roster.length < 8) {
      extra += 1;
      roster.push({
        userId: `preview-${extra}`,
        username: `Mô phỏng ${extra}`,
        wins: Math.max(0, 4 - extra),
        level: cup.tier === 1 ? 5 : cup.tier === 2 ? 30 : 60,
        region: cup.region ?? 'forest',
        preview: true,
      });
    }
    if (roster.every((entry) => entry.preview) && username) {
      roster[0] = { ...roster[0], username, preview: true };
    }
    const played = simulateBracket(roster, `${cup.id}:preview`);
    return { preview: true as const, champion: played.champion, matches: played.matches, rewardTitle: cup.rewardTitle };
  }

  /** Advance official brackets whose start time has passed. Future cups stay untouched. */
  tick(now = new Date()): boolean {
    this.ensure(now);
    let changed = false;
    for (const cup of this.cups.values()) {
      if (cup.status === 'complete') continue;
      if (now.getTime() < Date.parse(cup.startsAt)) continue;
      if (cup.entrants.length < 2) continue;
      if (cup.matches.length === 0) {
        cup.status = 'live';
        cup.matches = buildFirstRound(cup.entrants, cup.id);
        cup.nextRoundAt = cup.startsAt;
        changed = true;
      }
      if (!cup.nextRoundAt || now.getTime() < Date.parse(cup.nextRoundAt)) continue;
      const round = Math.max(...cup.matches.map((match) => match.round));
      const open = cup.matches.filter((match) => match.round === round);
      const played = playRound(open);
      cup.matches = [...cup.matches.filter((match) => match.round !== round), ...played];
      const winners = winnersOf(played);
      if (winners.length <= 1) {
        cup.champion = winners[0] ?? null;
        cup.status = 'complete';
        cup.nextRoundAt = null;
      } else {
        cup.matches.push(...nextRound(played, winners, cup.id));
        cup.nextRoundAt = new Date(now.getTime() + DAY_MS).toISOString();
      }
      changed = true;
    }
    return changed;
  }

  private weeklyChampions(now: Date): Seed[] {
    const month = now.getUTCMonth();
    const year = now.getUTCFullYear();
    const champions: Seed[] = [];
    for (const cup of this.cups.values()) {
      if (cup.kind !== 'weekly' || !cup.champion) continue;
      const start = new Date(cup.startsAt);
      if (start.getUTCFullYear() === year && start.getUTCMonth() === month) champions.push(cup.champion);
    }
    return champions;
  }

  private ensure(now: Date) {
    const weeklyStart = nextWeeklyStart(now);
    const monthlyStart = nextMonthlyStart(now);
    for (const region of REGION_IDS) {
      for (const tier of [1, 2, 3] as const) {
        const id = `weekly:${region}:${tier}:${weeklyStart.toISOString().slice(0, 10)}`;
        if (this.cups.has(id)) continue;
        const place = REGION_NAMES[region] ?? region;
        this.cups.set(id, blankCup({
          id,
          kind: 'weekly',
          region,
          tier,
          nameVi: `Giải tuần ${place} · bảng ${tier}`,
          startsAt: weeklyStart.toISOString(),
          registrationOpensAt: registrationOpens(weeklyStart).toISOString(),
          rewardTitle: `Danh hiệu khu vực ${place}`,
        }));
      }
    }
    const monthId = `monthly:${monthlyStart.getUTCFullYear()}-${String(monthlyStart.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!this.cups.has(monthId)) {
      this.cups.set(monthId, blankCup({
        id: monthId,
        kind: 'monthly',
        region: null,
        tier: 3,
        nameVi: 'Vô địch tháng',
        startsAt: monthlyStart.toISOString(),
        registrationOpensAt: registrationOpens(monthlyStart).toISOString(),
        rewardTitle: 'Danh hiệu chủ server',
      }));
    }
  }
}

function blankCup(input: Omit<Cup, 'status' | 'entrants' | 'matches' | 'champion' | 'nextRoundAt'>): Cup {
  return { ...input, status: 'registration', entrants: [], matches: [], champion: null, nextRoundAt: null };
}

function seedFrom(character: CharacterRecord, username: string): Seed {
  return {
    userId: character.userId,
    username,
    wins: character.stats.wins,
    level: character.stats.level,
    region: character.startingRegion,
  };
}

function toSummary(cup: Cup) {
  return {
    id: cup.id,
    kind: cup.kind,
    region: cup.region,
    tier: cup.tier,
    nameVi: cup.nameVi,
    startsAt: cup.startsAt,
    registrationOpensAt: cup.registrationOpensAt,
    status: cup.status,
    entrantCount: cup.entrants.length,
    championName: cup.champion?.username ?? null,
    rewardTitle: cup.rewardTitle,
  };
}
