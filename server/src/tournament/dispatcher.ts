import type { Server } from 'socket.io';

import { TournamentBoard } from './board.js';

/**
 * One clock for every cup. `tick` is cheap when nothing is due, so a one-minute
 * interval is enough. The timer is unref'd and cleared in `stop` so a smoke
 * test can shut the process down.
 */
export function startTournamentClock(board: TournamentBoard, io?: Server) {
  const timer = setInterval(() => {
    if (!board.tick(new Date())) return;
    io?.emit('tournament:update', board.summary());
  }, 60_000);
  timer.unref?.();
  return () => clearInterval(timer);
}
