import type { Server, Socket } from 'socket.io';

/**
 * One Socket.io room per open-world zone. Everyone standing on that map
 * receives joins, moves, leaves, and map chat. A second zone is a different
 * room, so a town never sees the wilderness next door.
 */

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
};

type Presence = WorldAvatar & {
  socketId: string;
  zoneId: string;
  lastMoveAt: number;
  lastChatAt: number;
};

export class WorldPresence {
  private readonly people = new Map<string, Presence>();

  constructor(private readonly io: Server) {}

  attach() {
    this.io.on('connection', (socket) => {
      const enter = (payload: unknown) => this.enter(socket, payload);
      socket.on('world:enter', enter);
      socket.on('join_world', enter);
      socket.on('player_enter_map', enter);
      socket.on('player_move', (payload: unknown) => this.move(socket, payload));
      socket.on('map_chat', (payload: unknown) => this.chat(socket, payload));
      socket.on('world:leave', () => this.leave(socket));
      socket.on('disconnect', () => this.leave(socket));
    });
    const roster = setInterval(() => this.broadcastRosters(), 2000);
    roster.unref?.();
  }

  private enter(socket: Socket, payload: unknown) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;
    const username = this.username(socket, payload);
    const avatar = readAvatar(payload, userId, username);
    const zoneId = readZone(payload);
    if (!avatar || !zoneId) return;

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
    socket.join(room);
    this.sendRoster(socket, zoneId, userId);
    if (!staying) socket.to(room).emit('player_joined', avatar);
    else socket.to(room).emit('player_moved', publicAvatar(next));
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
    socket.to(zoneRoom(person.zoneId)).emit('player_moved', publicAvatar(person));
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
    person.lastChatAt = now;
    this.io.to(zoneRoom(person.zoneId)).emit('map_chat', {
      userId: person.userId,
      username: person.username,
      text,
      at: now,
    });
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
    this.io.to(zoneRoom(person.zoneId)).emit('player_left', { userId: person.userId });
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

  private sendRoster(socket: Socket, zoneId: string, userId: string) {
    const players = this.others(zoneId, userId);
    socket.emit('current_players_list', { players });
    socket.emit('player_list', { players });
  }

  private broadcastRosters() {
    for (const person of this.people.values()) {
      const socket = this.io.sockets.sockets.get(person.socketId);
      if (!socket) continue;
      this.sendRoster(socket, person.zoneId, person.userId);
    }
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
  };
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
