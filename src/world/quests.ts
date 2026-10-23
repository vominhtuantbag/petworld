import type { ItemId } from './types';

/**
 * Local quest board. Daily counters reset when the calendar day changes.
 * Main quests stay claimed. Progress for mains is read from the live
 * session (level, tames, wins), not stored a second time.
 */

export type QuestTrack = {
  day: string;
  winsToday: number;
  feedsToday: number;
  scrollsToday: number;
  totalWins: number;
  claimed: string[];
};

export type QuestView = {
  id: string;
  group: 'daily' | 'main';
  title: string;
  detail: string;
  progress: number;
  need: number;
  gold: number;
  itemId?: ItemId;
  reward: string;
  done: boolean;
  claimed: boolean;
};

export type QuestSnapshot = {
  level: number;
  tamed: number;
  track: QuestTrack;
};

export function todayKey(now = new Date()): string {
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function emptyQuests(now = new Date()): QuestTrack {
  return { day: todayKey(now), winsToday: 0, feedsToday: 0, scrollsToday: 0, totalWins: 0, claimed: [] };
}

export function normalizeQuests(track: QuestTrack, now = new Date()): QuestTrack {
  const day = todayKey(now);
  if (track.day === day) return track;
  return {
    ...track,
    day,
    winsToday: 0,
    feedsToday: 0,
    scrollsToday: 0,
    claimed: track.claimed.filter((id) => !id.startsWith('daily-')),
  };
}

export function listQuests(snapshot: QuestSnapshot): QuestView[] {
  const { track, level, tamed } = snapshot;
  const rows: Array<Omit<QuestView, 'done' | 'claimed'> & { progress: number }> = [
    {
      id: 'daily-win',
      group: 'daily',
      title: 'Một trận trong ngày',
      detail: 'Thắng 1 trận dã chiến.',
      progress: track.winsToday,
      need: 1,
      gold: 15,
      itemId: 'hp-potion',
      reward: '15 vàng và thuốc máu',
    },
    {
      id: 'daily-feed',
      group: 'daily',
      title: 'Cho quái ăn',
      detail: 'Dùng 1 trái cây cho quái đã thu phục.',
      progress: track.feedsToday,
      need: 1,
      gold: 10,
      itemId: 'berry',
      reward: '10 vàng và quả dại',
    },
    {
      id: 'daily-scroll',
      group: 'daily',
      title: 'Về thị trấn',
      detail: 'Dùng 1 hồi thành chú.',
      progress: track.scrollsToday,
      need: 1,
      gold: 8,
      itemId: 'mana-potion',
      reward: '8 vàng và thuốc mana',
    },
    {
      id: 'main-level-2',
      group: 'main',
      title: 'Ra khỏi cổng',
      detail: 'Đạt cấp phiêu lưu 2.',
      progress: level,
      need: 2,
      gold: 20,
      itemId: 'town-scroll',
      reward: '20 vàng và hồi thành chú',
    },
    {
      id: 'main-tame-1',
      group: 'main',
      title: 'Người bạn đầu',
      detail: 'Thu phục 1 quái.',
      progress: tamed,
      need: 1,
      gold: 25,
      itemId: 'hearty-fruit',
      reward: '25 vàng và quả bồi',
    },
    {
      id: 'main-wins-5',
      group: 'main',
      title: 'Thợ săn đồng',
      detail: 'Thắng 5 trận dã chiến.',
      progress: track.totalWins,
      need: 5,
      gold: 40,
      itemId: 'mana-fruit',
      reward: '40 vàng và quả mana',
    },
    {
      id: 'main-level-8',
      group: 'main',
      title: 'Kỹ năng thứ hai',
      detail: 'Đạt cấp phiêu lưu 8.',
      progress: level,
      need: 8,
      gold: 60,
      itemId: 'sword',
      reward: '60 vàng và kiếm',
    },
    {
      id: 'main-tame-5',
      group: 'main',
      title: 'Bầy nhỏ',
      detail: 'Thu phục 5 quái.',
      progress: tamed,
      need: 5,
      gold: 80,
      itemId: 'armor',
      reward: '80 vàng và giáp',
    },
  ];
  return rows.map((row) => ({
    ...row,
    progress: Math.min(row.need, row.progress),
    done: row.progress >= row.need,
    claimed: track.claimed.includes(row.id),
  }));
}

export function findQuest(snapshot: QuestSnapshot, id: string): QuestView | null {
  return listQuests(snapshot).find((quest) => quest.id === id) ?? null;
}
