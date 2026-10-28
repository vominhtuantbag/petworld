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
    left.socket.emit('battle:leave');
    right.socket.emit('battle:leave');
    await delay(80);
    left.socket.close();
    right.socket.close();
    await checkOpenWorld(base, lan.token, bao.token, `lan_${stamp}`, `bao_${stamp}`);
    console.log('[smoke] two players shared one map, moved, chatted, and left');
    await checkWhisperKeepsRoster(base, lan.token, bao.token, `lan_${stamp}`, `bao_${stamp}`);
    console.log('[smoke] a high-level player stayed visible, and a whisper did not clear the map');
    await checkProximityDuel(base, lan.token, bao.token, `bao_${stamp}`);
    console.log('[smoke] a nearby challenge opened a 30s duel and a far one was refused');
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

async function checkOpenWorld(base: string, lanToken: string, baoToken: string, lanName: string, baoName: string) {
  const lan = connect(base, lanToken);
  const bao = connect(base, baoToken);
  await Promise.all([lan.ready, bao.ready]);
  try {
    const joined = waitFor<{ username: string }>(lan.socket, 'player_joined', (payload) => payload.username === baoName);
    const listed = waitFor<{ players: { username: string }[] }>(
      bao.socket,
      'current_players_list',
      (payload) => payload.players.some((player) => player.username === lanName),
    );
    lan.socket.emit('world:enter', worldPose(40, 40));
    await delay(40);
    bao.socket.emit('world:enter', worldPose(80, 60));
    await Promise.all([joined, listed]);

    const moved = waitFor<{ x: number; y: number }>(bao.socket, 'player_moved', (payload) => payload.x === 240 && payload.y === 180);
    await delay(80);
    lan.socket.emit('player_move', { x: 240, y: 180, facing: 1, hp: 70, maxHp: 100 });
    await moved;

    const heard = waitFor<{ username: string; text: string }>(
      bao.socket,
      'map_chat',
      (payload) => payload.username === lanName && payload.text === 'Xin chào',
    );
    lan.socket.emit('map_chat', { text: 'Xin chào' });
    await heard;

    const leftMap = waitFor<{ userId: string }>(lan.socket, 'player_left', () => true);
    bao.socket.emit('world:leave');
    await leftMap;
  } finally {
    lan.socket.close();
    bao.socket.close();
  }
}

/** Level 15 used to be refused on map 1, which dropped them from the zone room. */
async function checkWhisperKeepsRoster(base: string, lanToken: string, baoToken: string, lanName: string, baoName: string) {
  const lan = connect(base, lanToken);
  const bao = connect(base, baoToken);
  await Promise.all([lan.ready, bao.ready]);
  try {
    const lanSeesBao = waitFor<{ players: { username: string }[] }>(
      lan.socket,
      'sync_players',
      (payload) => payload.players.some((player) => player.username === baoName),
    );
    const baoSeesLan = waitFor<{ players: { username: string }[] }>(
      bao.socket,
      'sync_players',
      (payload) => payload.players.some((player) => player.username === lanName),
    );
    lan.socket.emit('player_enter_map', worldPose(40, 40, 'plains:m1', 1));
    bao.socket.emit('player_enter_map', worldPose(120, 80, 'plains:m1', 15));
    await Promise.all([lanSeesBao, baoSeesLan]);

    const whispered = waitFor<{ username: string; text: string; toUsername?: string }>(
      bao.socket,
      'whisper',
      (payload) => payload.username === lanName && payload.toUsername === baoName && payload.text === 'riêng',
    );
    let leaked = false;
    const onChat = (payload: { text?: string }) => {
      if (payload.text === 'riêng') leaked = true;
    };
    bao.socket.on('map_chat', onChat);
    lan.socket.emit('whisper', { toUsername: baoName, text: 'riêng' });
    await whispered;
    await delay(300);
    bao.socket.off('map_chat', onChat);
    if (leaked) throw new Error('A whisper was broadcast as map chat.');

    const stillThere = waitFor<{ players: { username: string }[] }>(
      bao.socket,
      'sync_players',
      (payload) => payload.players.some((player) => player.username === lanName),
    );
    bao.socket.emit('world:who');
    const roster = await stillThere;
    if (!roster.players.some((player) => player.username === lanName)) {
      throw new Error('Whisper removed the other player from the map roster.');
    }
  } finally {
    lan.socket.close();
    bao.socket.close();
  }
}

async function checkProximityDuel(base: string, lanToken: string, baoToken: string, baoName: string) {
  const lan = connect(base, lanToken);
  const bao = connect(base, baoToken);
  await Promise.all([lan.ready, bao.ready]);
  try {
    const lanSelf = waitFor<{ userId: string }>(lan.socket, 'world:self', (payload) => Boolean(payload.userId));
    const baoSelf = waitFor<{ userId: string }>(bao.socket, 'world:self', (payload) => Boolean(payload.userId));
    lan.socket.emit('player_enter_map', worldPose(40, 40, 'plains:m1', 4));
    bao.socket.emit('player_enter_map', worldPose(900, 900, 'plains:m1', 4));
    const [lanWho, baoWho] = await Promise.all([lanSelf, baoSelf]);
    if (baoWho.userId === lanWho.userId) throw new Error('Both duel sockets resolved to one account.');

    const tooFar = waitFor<{ message?: string }>(lan.socket, 'pvp_error', (payload) => Boolean(payload.message));
    lan.socket.emit('send_pvp_challenge', { toUserId: baoWho.userId });
    const refused = await tooFar;
    if (!refused.message?.includes('xa')) throw new Error(`A far challenge was accepted: ${refused.message ?? ''}`);

    bao.socket.emit('player_move', { x: 80, y: 50, facing: 1, hp: 90, maxHp: 100 });
    await delay(120);
    const invited = waitFor<{ challengeId: string; fromUsername: string }>(
      bao.socket,
      'pvp_challenge',
      (payload) => Boolean(payload.challengeId),
    );
    lan.socket.emit('send_pvp_challenge', { toUserId: baoWho.userId });
    const challenge = await invited;
    if (!challenge.fromUsername.startsWith('lan_')) throw new Error('Challenge came from the wrong player.');

    const lanPrep = waitFor<{ matchId: string; deadline: number; opponentUsername: string }>(
      lan.socket,
      'pvp_prep',
      (payload) => payload.opponentUsername === baoName,
    );
    const baoPrep = waitFor<{ matchId: string; deadline: number }>(bao.socket, 'pvp_prep', (payload) => Boolean(payload.matchId));
    bao.socket.emit('accept_pvp_challenge', { challengeId: challenge.challengeId });
    const [leftPrep, rightPrep] = await Promise.all([lanPrep, baoPrep]);
    if (leftPrep.matchId !== rightPrep.matchId) throw new Error('The two sides entered different prep rooms.');
    if (leftPrep.deadline - Date.now() < 20_000) throw new Error('Squad prep was shorter than 30 seconds.');

    const lanBattle = waitFor<{ deadline: number; you: { pets?: { name: string }[] }; opponent: { name: string; level: number } }>(
      lan.socket,
      'battle:update',
      (payload) => payload.you.pets?.[0]?.name === 'Sóc' && payload.deadline - Date.now() > 20_000,
    );
    const baoBattle = waitFor<{ you: { name: string } }>(bao.socket, 'battle:update', (payload) => Boolean(payload.you.name));
    const pets = [{ name: 'Sóc', level: 2, hp: 10, maxHp: 18 }];
    lan.socket.emit('pvp_squad_ready', { matchId: leftPrep.matchId, pets });
    bao.socket.emit('pvp_squad_ready', { matchId: rightPrep.matchId, pets: [] });
    const [opened, other] = await Promise.all([lanBattle, baoBattle]);
    if (!other.you.name) throw new Error('The opponent never entered the arena.');
    if (opened.opponent.level < 1) throw new Error('The arena hid the opponent level.');
  } finally {
    lan.socket.emit('battle:leave');
    bao.socket.emit('battle:leave');
    lan.socket.close();
    bao.socket.close();
  }
}

function worldPose(x: number, y: number, zoneId = 'wild:forest:1', level = 3) {
  return {
    zoneId,
    x,
    y,
    facing: 1,
    name: 'Khách',
    baseCharacterId: 'f-archer',
    gender: 'female',
    hairColor: '#7a4630',
    outfitColor: '#3e6b4d',
    level,
    hp: 90,
    maxHp: 100,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitFor<T>(socket: ReturnType<typeof connect>['socket'], event: string, ok: (payload: T) => boolean): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}.`));
    }, 4000);
    const onEvent = (payload: T) => {
      if (!ok(payload)) return;
      clearTimeout(timer);
      socket.off(event, onEvent);
      resolve(payload);
    };
    socket.on(event, onEvent);
  });
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
