import http from 'node:http';

import { io } from 'socket.io-client';

import { SESSION_REPLACED_MESSAGE } from './auth/sessions.js';
import { strike } from './combat/rules.js';
import { startServer } from './index.js';
import { sampleSave } from './saves/schema.js';

/**
 * Registers two accounts, saves characters, queues them, and plays one
 * attacking round. Run with `npm run smoke` from the server directory.
 */

const stamp = Date.now().toString(36);

async function main() {
  const server = await startServer(0);
  const base = `http://127.0.0.1:${server.port}`;
  try {
    const dodgeCheck = strike(
      { name: 'A', attack: 10, defense: 4 },
      { name: 'B', attack: 10, defense: 4 },
      'attack',
      'defend',
      () => 0,
    );
    if (!dodgeCheck.dodged || dodgeCheck.damage !== 0) {
      throw new Error('Defend did not dodge when the roll is zero.');
    }

    const lan = await register(base, `lan_${stamp}`, `lan_${stamp}@example.com`);
    const bao = await register(base, `bao_${stamp}`, `bao_${stamp}@example.com`);
    await saveCharacter(base, lan.token, 'Lan', 'f-archer', 'forest');
    await saveCharacter(base, bao.token, 'Bao', 'm-monk', 'beach');
    await checkAdventureSave(base, lan.token);

    const left = connect(base, lan.token);
    const right = connect(base, bao.token);
    await Promise.all([left.ready, right.ready]);
    left.socket.emit('queue:join');
    right.socket.emit('queue:join');

    const [leftBattle, rightBattle] = await Promise.all([left.nextBattle(), right.nextBattle()]);
    if (leftBattle.you.name !== 'Lan' || rightBattle.you.name !== 'Bao') {
      throw new Error('Matchmaking paired the wrong fighters.');
    }

    left.socket.emit('battle:action', { action: 'attack' });
    right.socket.emit('battle:action', { action: 'attack' });
    // The server also emits when a fighter locks an action, before damage.
    let finishedRound = await left.nextBattle();
    const started = Date.now();
    while (finishedRound.you.hp >= finishedRound.you.maxHp && Date.now() - started < 4000) {
      finishedRound = await left.nextBattle();
    }
    if (finishedRound.you.hp >= finishedRound.you.maxHp) {
      throw new Error('Attack did not reduce hit points.');
    }

    console.log('[smoke] auth, matchmaking, and one combat round passed');
    left.socket.close();
    right.socket.close();
    await checkSingleSession(base, `lan_${stamp}@example.com`, lan.token);
    console.log('[smoke] a second login kicked the previous session');
  } finally {
    await server.close();
  }
}

async function checkSingleSession(base: string, email: string, token: string) {
  const current = connect(base, token);
  await current.ready;
  const kicked = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The previous session was not kicked.')), 4000);
    current.socket.on('session:replaced', (payload: { message?: string }) => {
      clearTimeout(timer);
      resolve(payload.message ?? '');
    });
  });
  const again = await login(base, email);
  const message = await kicked;
  if (message !== SESSION_REPLACED_MESSAGE) {
    throw new Error(`Unexpected kick notice: ${message}`);
  }
  const stale = await requestJson(`${base}/api/me`, { method: 'GET', token });
  const body = stale.json as { code?: string; error?: string };
  if (stale.status !== 401 || body.code !== 'session_replaced' || body.error !== message) {
    throw new Error(`Old token was still accepted: ${JSON.stringify(stale.json)}`);
  }
  const fresh = await requestJson(`${base}/api/me`, { method: 'GET', token: again.token });
  if (fresh.status !== 200) throw new Error('The new login could not read the account.');
  current.socket.close();
  await checkSecondTab(base, again.token);
}

/** Two sockets with the same login: the older tab must be replaced. */
async function checkSecondTab(base: string, token: string) {
  const first = connect(base, token);
  await first.ready;
  const kicked = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('A second tab with the same account was not kicked.')), 4000);
    const finish = (payload: { message?: string }) => {
      first.socket.io.reconnection(false);
      clearTimeout(timer);
      resolve(payload.message ?? '');
    };
    first.socket.on('session:replaced', finish);
    first.socket.on('session_replaced', finish);
  });
  const second = connect(base, token);
  await second.ready;
  const message = await kicked;
  if (message !== SESSION_REPLACED_MESSAGE) throw new Error(`Second tab notice was wrong: ${message}`);
  if (!second.socket.connected) throw new Error('The newer tab was disconnected.');
  first.socket.close();
  second.socket.close();
}

async function login(base: string, email: string) {
  const response = await requestJson(`${base}/api/auth/login`, {
    method: 'POST',
    body: { email, password: 'secret-pass' },
  });
  if (response.status !== 200) throw new Error(JSON.stringify(response.json));
  return response.json as { token: string };
}

async function register(base: string, username: string, email: string) {
  const response = await requestJson(`${base}/api/auth/register`, {
    method: 'POST',
    body: { username, email, password: 'secret-pass' },
  });
  if (response.status !== 201) throw new Error(JSON.stringify(response.json));
  return response.json as { token: string };
}

async function checkAdventureSave(base: string, token: string) {
  const missing = await requestJson(`${base}/api/saves/me`, { method: 'GET', token });
  if (missing.status !== 200 || !hasSave(missing.json) || missing.json.save !== null) {
    throw new Error(`Expected an empty adventure save, got ${JSON.stringify(missing.json)}`);
  }
  const broken = await requestJson(`${base}/api/saves/me`, { method: 'PUT', token, body: { save: { version: 1 } } });
  if (broken.status !== 400) throw new Error('A broken save should be rejected.');

  const stored = await requestJson(`${base}/api/saves/me`, {
    method: 'PUT',
    token,
    body: { save: sampleSave('2026-10-23T12:00:00.000Z', 77, 2) },
  });
  if (stored.status !== 200 || !isSaveResult(stored.json) || !stored.json.accepted || stored.json.save.status.gold !== 77) {
    throw new Error(`Save was not stored: ${JSON.stringify(stored.json)}`);
  }
  const older = await requestJson(`${base}/api/saves/me`, {
    method: 'PUT',
    token,
    body: { save: sampleSave('2020-01-01T00:00:00.000Z', 1, 1) },
  });
  if (older.status !== 200 || !isSaveResult(older.json) || older.json.accepted || older.json.save.status.gold !== 77) {
    throw new Error('An older save replaced the current one.');
  }
  const loaded = await requestJson(`${base}/api/saves/me`, { method: 'GET', token });
  if (!hasSave(loaded.json) || !loaded.json.save || loaded.json.save.status.gold !== 77 || loaded.json.save.inventory.bag[0]?.itemId !== 'net') {
    throw new Error(`Loaded adventure lost inventory: ${JSON.stringify(loaded.json)}`);
  }
}

function hasSave(value: unknown): value is { save: SaveView | null } {
  return typeof value === 'object' && value !== null && 'save' in value;
}

function isSaveResult(value: unknown): value is { accepted: boolean; save: SaveView } {
  return typeof value === 'object' && value !== null && 'accepted' in value && 'save' in value;
}

type SaveView = { status: { gold: number }; inventory: { bag: { itemId: string }[] } };

async function saveCharacter(base: string, token: string, name: string, baseAvatarId: string, startingRegion: string) {
  const response = await requestJson(`${base}/api/characters/me`, {
    method: 'PUT',
    token,
    body: {
      name,
      gender: baseAvatarId.startsWith('f-') ? 'female' : 'male',
      baseAvatarId,
      hairColor: '#7a4630',
      outfitColor: '#3e6b4d',
      startingRegion,
    },
  });
  if (response.status !== 200) throw new Error(JSON.stringify(response.json));
}

function requestJson(
  url: string,
  options: { method: string; token?: string; body?: unknown },
): Promise<{ status: number; json: unknown }> {
  const payload = Buffer.from(JSON.stringify(options.body ?? {}));
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode ?? 0, json: text ? JSON.parse(text) : {} });
        });
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}

type SmokeBattle = { you: { name: string; hp: number; maxHp: number } };

function connect(base: string, token: string) {
  const socket = io(base, { auth: { token }, transports: ['websocket', 'polling'] });
  const battles: SmokeBattle[] = [];
  let wake: (() => void) | null = null;
  socket.on('battle:update', (snapshot: SmokeBattle) => {
    battles.push(snapshot);
    wake?.();
    wake = null;
  });
  return {
    socket,
    ready: new Promise<void>((resolve, reject) => {
      socket.on('connect', () => resolve());
      socket.on('connect_error', (error) => reject(error));
    }),
    nextBattle(): Promise<SmokeBattle> {
      const existing = battles.shift();
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve) => {
        wake = () => {
          const next = battles.shift();
          if (next) resolve(next);
        };
      });
    },
  };
}

main().catch((error: unknown) => {
  console.error('[smoke] failed', error);
  process.exit(1);
});
