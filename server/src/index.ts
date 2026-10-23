import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Server } from 'socket.io';

import { config } from './config.js';
import { FileAccountStore } from './db/fileStore.js';
import { connectMongo, MongoAccountStore } from './db/mongoStore.js';
import type { AccountStore } from './domain.js';
import { createApp } from './http/app.js';
import { Arena } from './realtime/arena.js';
import { TournamentBoard } from './tournament/board.js';
import { startTournamentClock } from './tournament/dispatcher.js';

/**
 * Game Thư Giãn server
 * --------------------
 * http/app.ts        register, login, JWT, character and adventure saves
 * db/                file store (default) or MongoDB models
 * combat/rules.ts    damage, defend, dodge chance
 * realtime/arena.ts  queue, rooms, round timer, reconnect
 */

export async function startServer(port = config.port) {
  const store = await openStore();
  const board = new TournamentBoard();
  const app = createApp(store, board);
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((item: string) => item.trim()),
    },
  });
  new Arena(io, store).attach();
  const stopClock = startTournamentClock(board, io);

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, '0.0.0.0', () => {
      httpServer.removeListener('error', reject);
      resolve();
    });
  });

  const address = httpServer.address();
  const boundPort = typeof address === 'object' && address ? address.port : port;
  return {
    port: boundPort,
    store,
    httpServer,
    io,
    async close() {
      stopClock();
      await io.close();
      if (!httpServer.listening) return;
      httpServer.closeAllConnections?.();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

async function openStore(): Promise<AccountStore> {
  if (config.driver === 'mongo') {
    await connectMongo(config.mongoUri);
    console.log('[Game Thư Giãn] MongoDB connected');
    return new MongoAccountStore();
  }
  const filePath = path.join(process.cwd(), 'data', 'accounts.json');
  if (config.production) {
    console.warn('[Game Thư Giãn] DB_DRIVER=file on Render loses accounts on every deploy. Set DB_DRIVER=mongo and MONGODB_URI.');
  }
  console.log(`[Game Thư Giãn] file database at ${filePath}`);
  return new FileAccountStore(filePath);
}

const startedDirectly = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;
if (startedDirectly) {
  startServer()
    .then(({ port }) => {
      console.log(`[Game Thư Giãn] listening on http://localhost:${port}`);
    })
    .catch((error: unknown) => {
      console.error('[Game Thư Giãn] failed to start', error);
      process.exit(1);
    });
}
