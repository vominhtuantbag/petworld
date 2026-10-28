import type { Server, Socket } from 'socket.io';

import { readPayout, settlePayout } from '../combat/rewards.js';

/**
 * One Socket.io room per open-world zone. Everyone standing on that map
 * receives joins, moves, leaves, and map chat. A second zone is a different
 * room, so a town never sees the wilderness next door.
 */

const OPEN_WORLD = 'open_world';
const RING = ['plains', 'mountains', 'forest', 'swamp', 'beach', 'ocean', 'tundra', 'savannah', 'volcano', 'desert'];

const MOVE_GAP_MS = 50;
const CHAT_GAP_MS = 500;
const CHAT_MAX = 120;
const ZONE_CAP = 40;
const COORD_LIMIT = 50_000;

export type WorldAvatar = {
  userId: string;
  username: string;
  name: string;
  x: number;
  y: number;
  facing: 1 | -1;
  baseCharacterId: string;
  gender: 'male' | 'female';
  hairColor: string;
  outfitColor: string;
  level: number;
  hp: number;
  maxHp: number;
  zoneId: string;
};

type Presence = WorldAvatar & {
  socketId: string;
  zoneId: string;
  lastMoveAt: number;
  lastChatAt: number;
};

export class WorldPresence {
  private readonly people = new Map<string, Presence>();
  private readonly lastMoveLog = new Map<string, number>();

  constructor(private readonly io: Server) {}

  /** Live map position. Challenges use this so a far player cannot be pulled into a duel. */
  where(userId: string): { userId: string; username: string; x: number; y: number; zoneId: string } | null {
    const person = this.people.get(userId);
    if (!person) return null;
    return { userId: person.userId, username: person.username, x: person.x, y: person.y, zoneId: person.zoneId };
  }

  attach() {
    this.io.on('connection', (socket) => {
      console.log(`[world] handshake socket=${socket.id} user=${String(socket.data.userId ?? '?')}`);
      const enter = (payload: unknown) => {
        void this.enter(socket, payload).catch((error: unknown) => console.error('[world] enter failed', error));
      };
      socket.on('world:enter', enter);
      socket.on('join_world', enter);
      socket.on('player_join', enter);
      socket.on('enter_world', enter);
      socket.on('player_enter_map', enter);
      socket.on('world:who', () => this.replyWho(socket));
      socket.on('player_move', (payload: unknown) => this.move(socket, payload));
      socket.on('map_chat', (payload: unknown) => this.chat(socket, payload));
      // Whisper is a direct emit to two sockets. It does not join, leave, or replace the zone room.
      socket.on('whisper', (payload: unknown) => this.whisper(socket, payload));
      socket.on('battle:settle', (payload: unknown) => {
        socket.emit('battle:settled', settlePayout(readPayout(payload)));
      });
      socket.on('world:leave', () => this.leave(socket));
      socket.on('player_disconnect', () => this.leave(socket));
      socket.on('disconnect', () => this.leave(socket));
    });
    const roster = setInterval(() => this.broadcastRosters(), 1000);
    roster.unref?.();
  }

  private async enter(socket: Socket, payload: unknown) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) {
      console.warn(`[world] enter ignored, socket ${socket.id} has no user`);
      return;
    }
    const username = this.username(socket, payload);
    const avatar = readAvatar(payload, userId, username);
    const zoneId = canonicalZone(readZone(payload) ?? '');
    if (!avatar || !zoneId) {
      console.warn(`[world] enter rejected for ${username}`, payload);
      return;
    }

    const previous = this.people.get(userId);
    const staying = previous?.socketId === socket.id && previous.zoneId === zoneId;
    if (previous && !staying) this.remove(previous);
    if (!staying && this.crowd(zoneId) >= ZONE_CAP) {
      socket.emit('world:error', { message: 'Khu vực này đã đủ người.' });
      return;
    }

    const next: Presence = {
      ...avatar,
      socketId: socket.id,
      zoneId,
      lastMoveAt: staying && previous ? previous.lastMoveAt : 0,
      lastChatAt: previous?.zoneId === zoneId ? previous.lastChatAt : 0,
    };
    this.people.set(userId, next);
    const room = zoneRoom(zoneId);
    await socket.join(room);
    if (!zoneId.startsWith('town:')) await socket.join(OPEN_WORLD);
    else socket.leave(OPEN_WORLD);
    const others = this.crowd(zoneId) - 1;
    console.log(`[world] ${username} joined ${room} at ${avatar.x},${avatar.y} others=${others} user=${userId}`);
    socket.emit('world:self', { userId, username, zoneId, room });
    this.broadcastSync(zoneId);
    const view = publicAvatar(next);
    if (!staying) this.emitOthers(socket, room, zoneId, 'player_joined', view);
    else this.emitOthers(socket, room, zoneId, 'player_moved', view);
  }

  private replyWho(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;
    const person = this.people.get(userId);
    if (!person || person.socketId !== socket.id) return;
    const players = this.others(person.zoneId, userId);
    socket.emit('world:self', { userId, username: person.username, zoneId: person.zoneId, room: zoneRoom(person.zoneId) });
    socket.emit('sync_players', { players, zoneId: person.zoneId });
    console.log(`[world] who ${person.username} ${person.zoneId} sees ${players.map((player) => player.username).join(', ') || 'nobody'}`);
  }

  private move(socket: Socket, payload: unknown) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;
    const person = this.people.get(userId);
    if (!person || person.socketId !== socket.id) {
      if (readZone(payload)) this.enter(socket, payload);
      return;
    }
    const step = readMotion(payload);
    if (!step) return;
    const now = Date.now();
    if (now - person.lastMoveAt < MOVE_GAP_MS) return;
    person.lastMoveAt = now;
    person.x = step.x;
    person.y = step.y;
    person.facing = step.facing;
    person.maxHp = step.maxHp;
    person.hp = Math.min(step.hp, step.maxHp);
    const room = zoneRoom(person.zoneId);
    const view = publicAvatar(person);
    this.emitOthers(socket, room, person.zoneId, 'player_moved', view);
    this.broadcastSync(person.zoneId);
    const logged = this.lastMoveLog.get(person.userId) ?? 0;
    if (now - logged > 2000) {
      this.lastMoveLog.set(person.userId, now);
      console.log(`[world] move ${person.username} ${room} -> ${person.x},${person.y}`);
    }
  }

  private chat(socket: Socket, payload: unknown) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;
    const person = this.people.get(userId);
    if (!person || person.socketId !== socket.id) return;
    const text = readChat(payload);
    if (!text) return;
    const now = Date.now();
    if (now - person.lastChatAt < CHAT_GAP_MS) return;
    if (/^\/(?:whisper|w)\b/i.test(text)) {
      const command = /^\/(?:whisper|w)\s+(\S+)\s+([\s\S]+)$/i.exec(text);
      const body = command?.[2].trim() ?? '';
      if (!command || !body) {
        socket.emit('world:error', { message: 'Thì thầm: /whisper tên nội dung' });
        return;
      }
      person.lastChatAt = now;
      this.deliverWhisper(socket, person, { toUsername: command[1], text: body }, now);
      return;
    }
    person.lastChatAt = now;
    this.io.to(zoneRoom(person.zoneId)).emit('map_chat', {
      userId: person.userId,
      username: person.username,
      text,
      at: now,
    });
  }

  private whisper(socket: Socket, payload: unknown) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;
    const person = this.people.get(userId);
    if (!person || person.socketId !== socket.id) return;
    const hint = readWhisper(payload);
    if (!hint) return;
    const now = Date.now();
    if (now - person.lastChatAt < CHAT_GAP_MS) return;
    person.lastChatAt = now;
    this.deliverWhisper(socket, person, hint, now);
  }

  private deliverWhisper(socket: Socket, person: Presence, hint: { toUserId?: string; toUsername?: string; text: string }, now: number) {
    const target = this.findPerson(hint);
    if (!target) {
      socket.emit('world:error', { message: 'Không thấy người chơi này.' });
      return;
    }
    if (target.userId === person.userId) {
      socket.emit('world:error', { message: 'Không thể thì thầm với chính mình.' });
      return;
    }
    const packet = {
      userId: person.userId,
      username: person.username,
      toUserId: target.userId,
      toUsername: target.username,
      text: hint.text,
      at: now,
      private: true,
    };
    this.io.sockets.sockets.get(target.socketId)?.emit('whisper', packet);
    socket.emit('whisper', packet);
  }

  private findPerson(hint: { toUserId?: string; toUsername?: string }): Presence | null {
    if (hint.toUserId) {
      const byId = this.people.get(hint.toUserId);
      if (byId) return byId;
    }
    const name = hint.toUsername?.trim().toLowerCase();
    if (!name) return null;
    for (const person of this.people.values()) {
      if (person.username.toLowerCase() === name) return person;
    }
    return null;
  }

  private leave(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;
    const person = this.people.get(userId);
    if (!person || person.socketId !== socket.id) return;
    this.remove(person);
  }

  private remove(person: Presence) {
    const socket = this.io.sockets.sockets.get(person.socketId);
    socket?.leave(zoneRoom(person.zoneId));
    this.people.delete(person.userId);
    this.lastMoveLog.delete(person.userId);
    const notice = { userId: person.userId };
    const room = zoneRoom(person.zoneId);
    console.log(`[world] left ${person.username} ${room}`);
    this.io.to(room).emit('player_left', notice);
    this.io.to(room).emit('player_disconnect', notice);
    this.broadcastSync(person.zoneId);
  }

  private username(socket: Socket, payload: unknown): string {
    const stored = socket.data.username;
    if (typeof stored === 'string' && stored.trim()) return stored.trim();
    const hinted = payload && typeof payload === 'object' ? (payload as { username?: unknown }).username : undefined;
    const name = typeof hinted === 'string' ? hinted.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24) : '';
    const username = name || 'Khách';
    socket.data.username = username;
    return username;
  }

  private broadcastRosters() {
    const zones = new Set<string>();
    for (const person of this.people.values()) zones.add(person.zoneId);
    for (const zoneId of zones) this.broadcastSync(zoneId);
  }

  /** Direct emit so a roster is not lost when a socket has not finished joining the room. */
  private broadcastSync(zoneId: string) {
    for (const person of this.people.values()) {
      if (person.zoneId !== zoneId) continue;
      const socket = this.io.sockets.sockets.get(person.socketId);
      if (!socket) continue;
      const players = this.others(zoneId, person.userId);
      const packet = { players };
      socket.emit('sync_players', packet);
      socket.emit('current_players_list', packet);
      socket.emit('player_list', packet);
    }
  }

  private emitOthers(socket: Socket, room: string, zoneId: string, event: 'player_joined' | 'player_moved', view: WorldAvatar) {
    for (const person of this.people.values()) {
      if (person.zoneId !== zoneId || person.userId === view.userId) continue;
      this.io.sockets.sockets.get(person.socketId)?.emit(event, view);
    }
    socket.to(room).emit(event, view);
    if (!zoneId.startsWith('town:')) socket.to(OPEN_WORLD).emit(event, view);
  }

  private others(zoneId: string, userId: string): WorldAvatar[] {
    const list: WorldAvatar[] = [];
    for (const person of this.people.values()) {
      if (person.zoneId !== zoneId || person.userId === userId) continue;
      list.push(publicAvatar(person));
    }
    return list;
  }

  private crowd(zoneId: string): number {
    let count = 0;
    for (const person of this.people.values()) if (person.zoneId === zoneId) count += 1;
    return count;
  }
}

function zoneRoom(zoneId: string): string {
  return `zone:${zoneId}`;
}

function publicAvatar(person: Presence): WorldAvatar {
  return {
    userId: person.userId,
    username: person.username,
    name: person.name,
    x: person.x,
    y: person.y,
    facing: person.facing,
    baseCharacterId: person.baseCharacterId,
    gender: person.gender,
    hairColor: person.hairColor,
    outfitColor: person.outfitColor,
    level: person.level,
    hp: person.hp,
    maxHp: person.maxHp,
    zoneId: person.zoneId,
  };
}

function canonicalZone(zoneId: string): string {
  if (!zoneId || zoneId.startsWith('town:')) return zoneId;
  const parts = zoneId.split(':');
  const province = parts[0] ?? '';
  const band = parts[1];
  if (!RING.includes(province)) return zoneId;
  if (band === 'outskirts') return `${province}:m1`;
  if (band === 'depths') return `${province}:m2`;
  if (band?.startsWith('m') && parts.length === 2) return `${province}:${band}`;
  if (parts.length === 3) {
    const col = Number(parts[1]);
    const row = Number(parts[2]);
    if (Number.isInteger(col) && Number.isInteger(row)) {
      const tier = Math.max(1, Math.min(10, col + row + 1));
      return `${province}:m${tier}`;
    }
  }
  return zoneId;
}

function readZone(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const zoneId = (payload as { zoneId?: unknown }).zoneId;
  if (typeof zoneId !== 'string' || !/^[a-zA-Z0-9:._-]{1,80}$/.test(zoneId)) return null;
  return zoneId;
}

function readAvatar(payload: unknown, userId: string, username: string): WorldAvatar | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;
  const point = readPoint(body.x, body.y);
  if (!point) return null;
  const maxHp = clamp(body.maxHp, 1, 100_000, 100);
  return {
    userId,
    username,
    name: readLabel(body.name, username),
    x: point.x,
    y: point.y,
    facing: body.facing === -1 ? -1 : 1,
    baseCharacterId: readLabel(body.baseCharacterId, 'm-wanderer').slice(0, 40),
    gender: body.gender === 'female' ? 'female' : 'male',
    hairColor: readColor(body.hairColor, '#7a4630'),
    outfitColor: readColor(body.outfitColor, '#3e6b4d'),
    level: clamp(body.level, 1, 999, 1),
    hp: Math.min(clamp(body.hp, 0, 100_000, maxHp), maxHp),
    maxHp,
    zoneId: '',
  };
}

function readMotion(payload: unknown): { x: number; y: number; facing: 1 | -1; hp: number; maxHp: number } | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;
  const point = readPoint(body.x, body.y);
  if (!point) return null;
  const maxHp = clamp(body.maxHp, 1, 100_000, 100);
  return {
    x: point.x,
    y: point.y,
    facing: body.facing === -1 ? -1 : 1,
    hp: Math.min(clamp(body.hp, 0, 100_000, maxHp), maxHp),
    maxHp,
  };
}

function readPoint(x: unknown, y: unknown): { x: number; y: number } | null {
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(-COORD_LIMIT, Math.min(COORD_LIMIT, x)),
    y: Math.max(-COORD_LIMIT, Math.min(COORD_LIMIT, y)),
  };
}

function readWhisper(payload: unknown): { toUserId?: string; toUsername?: string; text: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as { toUserId?: unknown; toUsername?: unknown; text?: unknown };
  if (typeof body.text !== 'string') return null;
  const text = body.text.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, CHAT_MAX);
  if (!text) return null;
  const toUserId = typeof body.toUserId === 'string' && body.toUserId.trim() ? body.toUserId.trim().slice(0, 80) : undefined;
  const toUsername = typeof body.toUsername === 'string' ? body.toUsername.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24) : '';
  if (!toUserId && !toUsername) return null;
  return { toUserId, toUsername: toUsername || undefined, text };
}

function readChat(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const text = (payload as { text?: unknown }).text;
  if (typeof text !== 'string') return null;
  const clean = text.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, CHAT_MAX);
  return clean.length > 0 ? clean : null;
}

function readLabel(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const clean = value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24);
  return clean || fallback;
}

function readColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{3,8}$/.test(value)) return fallback;
  return value;
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}
