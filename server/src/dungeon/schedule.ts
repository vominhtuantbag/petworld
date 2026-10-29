/**
 * Golden Hour. The three windows are Vietnam local time (ICT, UTC+7),
 * because that is the play day the broadcast is written for. The clock does
 * not follow the host timezone. The tournament calendar stays on UTC.
 *
 * Each window is inclusive at the start and exclusive at the end:
 * 10:00–12:00, 15:00–17:00, 19:00–21:00.
 */

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

export const GOLDEN_WINDOWS = [
  { startHour: 10, endHour: 12 },
  { startHour: 15, endHour: 17 },
  { startHour: 19, endHour: 21 },
] as const;

export const DUNGEON_SPAWN_MESSAGE = 'Hầm ngục đã xuất hiện trên khắp bản đồ.';

export type GoldenHour = {
  active: boolean;
  windowId: string | null;
  endsAt: number | null;
};

export function goldenHourAt(now: Date): GoldenHour {
  const shifted = new Date(now.getTime() + ICT_OFFSET_MS);
  const hour = shifted.getUTCHours();
  const window = GOLDEN_WINDOWS.find((entry) => hour >= entry.startHour && hour < entry.endHour);
  if (!window) return { active: false, windowId: null, endsAt: null };
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const endsAt = Date.UTC(year, month, day, window.endHour, 0, 0, 0) - ICT_OFFSET_MS;
  return {
    active: true,
    windowId: `${year}-${month + 1}-${day}-${window.startHour}`,
    endsAt,
  };
}
