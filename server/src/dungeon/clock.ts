import type { Server } from 'socket.io';

import { DUNGEON_SPAWN_MESSAGE, goldenHourAt } from './schedule.js';

/**
 * Watches the golden-hour windows. The first tick inside a window broadcasts
 * once to every connected socket. A later connection receives the live window
 * without a second global shout. When the window ends, clients are told the
 * gates are gone.
 */
export function startGoldenHour(io: Server): () => void {
  let announced: string | null = null;

  const publish = (force: boolean) => {
    const hour = goldenHourAt(new Date());
    if (hour.active && hour.windowId && hour.windowId !== announced) {
      announced = hour.windowId;
      io.emit('dungeon:broadcast', {
        message: DUNGEON_SPAWN_MESSAGE,
        windowId: hour.windowId,
        endsAt: hour.endsAt,
      });
      io.emit('dungeon:hour', { active: true, windowId: hour.windowId, endsAt: hour.endsAt, message: DUNGEON_SPAWN_MESSAGE });
      console.log(`[dungeon] golden hour ${hour.windowId}`);
      return;
    }
    if (!hour.active && (announced || force)) {
      announced = null;
      io.emit('dungeon:hour', { active: false, windowId: null, endsAt: null, message: null });
    }
  };

  io.on('connection', (socket) => {
    const hour = goldenHourAt(new Date());
    socket.emit('dungeon:hour', {
      active: hour.active,
      windowId: hour.windowId,
      endsAt: hour.endsAt,
      message: hour.active ? DUNGEON_SPAWN_MESSAGE : null,
    });
  });

  publish(false);
  const timer = setInterval(() => publish(false), 1000);
  timer.unref?.();
  return () => clearInterval(timer);
}
