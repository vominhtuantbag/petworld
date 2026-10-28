import type { Server, Socket } from 'socket.io';

import { acceptToken, bindSessionKick, SESSION_REPLACED_MESSAGE } from '../auth/sessions.js';
import { readToken } from '../auth/tokens.js';
import { isCombatAction, strike, type CombatAction } from '../combat/rules.js';
import type { AccountStore, CharacterRecord, UserRecord } from '../domain.js';
import type { BattleView, DuelPet, FighterView, QueueView } from './protocol.js';

const ROUND_MS = 30_000;
const DISCONNECT_GRACE_MS = 12_000;

type Fighter = Omit<FighterView, 'hp' | 'ready'> & { attack: number; defense: number };

type Room = {
  id: string;
  round: number;
  deadline: number;
  status: 'active' | 'finished';
  resolving: boolean;
  winnerId: string | null;
  log: string[];
  fighters: [Fighter, Fighter];
  hp: Record<string, number>;
  submitted: Record<string, CombatAction | undefined>;
  disconnectedAt: Record<string, number | undefined>;
};

type QueuedPlayer = {
  userId: string;
  socketId: string;
};

/**
 * Matchmaking queue and in-memory duel rooms.
 *
 * Rooms are not written to the database. Wins and losses are. To add a mode
 * (ranked, best of three, a region modifier), branch inside `resolveRound`
 * and keep `BattleView` as the only payload the client needs.
 */
export class Arena {
  private readonly queue: QueuedPlayer[] = [];
  private readonly rooms = new Map<string, Room>();
  private readonly userRoom = new Map<string, string>();
  /** The one live socket for each account. A newer connection replaces it. */
  private readonly activeSessions = new Map<string, string>();
  private readonly userSocket = new Map<string, string>();

  constructor(
    private readonly io: Server,
    private readonly store: AccountStore,
  ) {}

  attach() {
    bindSessionKick((userId, sid) => this.kickReplaced(userId, sid));

    this.io.use((socket, next) => {
      void this.authorize(socket).then(
        () => next(),
        (error: unknown) => next(error instanceof Error ? error : new Error('unauthorized')),
      );
    });

    this.io.on('connection', (socket) => {
      const userId = socket.data.userId as string;
      this.claim(socket, userId);
      // Listeners are bound before any await. A client can emit queue:join
      // in the same turn as connect, and that event would otherwise be lost.
      socket.on('queue:join', () => {
        void this.joinQueue(socket);
      });
      socket.on('queue:leave', () => {
        this.leaveQueue(userId);
        socket.emit('queue:status', { state: 'idle', position: 0 });
      });
      socket.on('battle:action', (payload: unknown) => {
        void this.onAction(socket, userId, payload);
      });
      socket.on('battle:leave', () => {
        this.closeRoomFor(userId);
        socket.emit('queue:status', { state: 'idle', position: 0 });
      });
      socket.on('disconnect', () => {
        if (this.activeSessions.get(userId) !== socket.id) return;
        this.activeSessions.delete(userId);
        this.userSocket.delete(userId);
        this.leaveQueue(userId);
        const active = this.roomFor(userId);
        if (active && active.status === 'active') {
          active.disconnectedAt[userId] = Date.now();
        }
      });
      void this.onConnection(socket, userId);
    });

    const timer = setInterval(() => {
      void this.tick();
    }, 250);
    timer.unref?.();
  }

  private async authorize(socket: Socket) {
    const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
    const auth = readToken(token);
    if (!auth) throw new Error('unauthorized');
    const user = await this.store.findUserById(auth.sub);
    if (!user) throw new Error('unauthorized');
    if (acceptToken(user.id, token, auth.sid, user.sessionId) === 'replaced') {
      throw new Error(`session_replaced: ${SESSION_REPLACED_MESSAGE}`);
    }
    socket.data.userId = auth.sub;
    socket.data.sid = auth.sid;
    socket.data.username = user.username;
  }

  /**
   * One socket per account. A second tab or device replaces the previous socket,
   * and that socket is told to leave before it is disconnected.
   */
  private claim(socket: Socket, userId: string) {
    const previousId = this.activeSessions.get(userId);
    if (previousId && previousId !== socket.id) this.kickSocket(previousId);
    this.activeSessions.set(userId, socket.id);
    this.userSocket.set(userId, socket.id);
  }

  /** Closes the socket from an older login so that device can show the kick notice. */
  private kickReplaced(userId: string, sid: string) {
    const currentId = this.activeSessions.get(userId);
    if (!currentId) return;
    const socket = this.io.sockets.sockets.get(currentId);
    if (!socket || socket.data.sid === sid) return;
    this.kickSocket(currentId);
  }

  private kickSocket(socketId: string) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return;
    const notice = { message: SESSION_REPLACED_MESSAGE };
    socket.emit('session:replaced', notice);
    socket.emit('session_replaced', notice);
    const timer = setTimeout(() => socket.disconnect(true), 150);
    timer.unref?.();
  }

  private async onConnection(socket: Socket, userId: string) {
    const user = await this.store.findUserById(userId);
    if (!user || this.activeSessions.get(userId) !== socket.id) {
      if (!user) socket.emit('battle:error', { message: 'Phiên đăng nhập không còn hiệu lực.' });
      this.kickSocket(socket.id);
      return;
    }
    socket.data.username = user.username;

    const roomId = this.userRoom.get(userId);
    const room = roomId ? this.rooms.get(roomId) : undefined;
    if (room) {
      const reconnecting = room.disconnectedAt[userId] !== undefined;
      room.disconnectedAt[userId] = undefined;
      socket.join(room.id);
      // A fresh socket already receives openRoom's snapshot. Emitting again
      // here would replay the opening state over a round that already resolved.
      if (reconnecting) {
        socket.emit('battle:update', this.view(room, userId));
      }
    }
    socket.emit('queue:status', this.queueView(userId));
  }

  /** True while this account is inside a live duel. */
  busy(userId: string): boolean {
    return this.roomFor(userId)?.status === 'active';
  }

  /**
   * Opens a duel from a proximity challenge. The queue is left untouched
   * for everyone else. Pets are the squad each side locked in.
   */
  async startDuel(leftId: string, rightId: string, pets: ReadonlyMap<string, DuelPet[]>): Promise<boolean> {
    if (leftId === rightId) return false;
    if (this.busy(leftId) || this.busy(rightId)) return false;
    this.leaveQueue(leftId);
    this.leaveQueue(rightId);
    const left = await this.fighterFromId(leftId);
    const right = await this.fighterFromId(rightId);
    if (!left || !right) return false;
    left.pets = pets.get(leftId) ?? [];
    right.pets = pets.get(rightId) ?? [];
    this.openRoom(left, right);
    return true;
  }

  private async joinQueue(socket: Socket) {
    const user = await this.store.findUserById(socket.data.userId as string);
    if (!user) {
      socket.emit('battle:error', { message: 'Phiên đăng nhập không còn hiệu lực.' });
      return;
    }
    const existingRoom = this.roomFor(user.id);
    if (existingRoom?.status === 'active') {
      socket.emit('battle:error', { message: 'Trận đấu đang diễn ra.' });
      socket.emit('battle:update', this.view(existingRoom, user.id));
      return;
    }
    if (existingRoom?.status === 'finished') {
      this.closeRoomFor(user.id);
    }

    const character = await this.store.findCharacterByUserId(user.id);
    if (!character) {
      socket.emit('battle:error', { message: 'Hãy tạo nhân vật trước khi tìm trận.' });
      return;
    }
    socket.data.character = character;

    const already = this.queue.find((entry) => entry.userId === user.id);
    if (already) {
      already.socketId = socket.id;
    } else {
      this.queue.push({ userId: user.id, socketId: socket.id });
    }
    socket.emit('queue:status', this.queueView(user.id));
    await this.pair();
  }

  private async pair() {
    while (this.queue.length >= 2) {
      const first = this.queue.shift();
      const second = this.queue.shift();
      if (!first || !second) return;
      if (first.userId === second.userId) {
        this.queue.unshift(second);
        continue;
      }
      const left = await this.fighterFromQueue(first);
      const right = await this.fighterFromQueue(second);
      if (!left || !right) {
        if (left) this.queue.unshift(first);
        if (right) this.queue.unshift(second);
        break;
      }
      this.openRoom(left, right);
    }
  }

  private async fighterFromId(userId: string): Promise<Fighter | null> {
    const user = await this.store.findUserById(userId);
    const character = await this.store.findCharacterByUserId(userId);
    if (!user || !character) return null;
    return toFighter(user, character);
  }

  private async fighterFromQueue(entry: QueuedPlayer): Promise<Fighter | null> {
    const user = await this.store.findUserById(entry.userId);
    const character = await this.store.findCharacterByUserId(entry.userId);
    const socket = this.io.sockets.sockets.get(entry.socketId);
    if (!user || !character || !socket) return null;
    return toFighter(user, character);
  }

  private openRoom(left: Fighter, right: Fighter) {
    const room: Room = {
      id: `duel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      round: 1,
      deadline: Date.now() + ROUND_MS,
      status: 'active',
      resolving: false,
      winnerId: null,
      log: [`${left.name} gặp ${right.name}. Chọn đòn trong ${ROUND_MS / 1000} giây.`],
      fighters: [left, right],
      hp: { [left.userId]: left.maxHp, [right.userId]: right.maxHp },
      submitted: {},
      disconnectedAt: {},
    };
    this.rooms.set(room.id, room);
    this.userRoom.set(left.userId, room.id);
    this.userRoom.set(right.userId, room.id);
    for (const fighter of room.fighters) {
      const socket = this.socketFor(fighter.userId);
      socket?.join(room.id);
      socket?.emit('queue:status', { state: 'idle', position: 0 });
      socket?.emit('battle:update', this.view(room, fighter.userId));
    }
  }

  private async onAction(socket: Socket, userId: string, payload: unknown) {
    const room = this.roomFor(userId);
    const action = payload && typeof payload === 'object' && 'action' in payload ? payload.action : undefined;
    if (!room || room.status !== 'active') {
      socket.emit('battle:error', { message: 'Không có trận đấu đang mở.' });
      return;
    }
    if (!isCombatAction(action)) {
      socket.emit('battle:error', { message: 'Đòn đánh không hợp lệ.' });
      return;
    }
    if (room.submitted[userId]) return;
    room.submitted[userId] = action;
    this.emitRoom(room);
    if (room.fighters.every((fighter) => room.submitted[fighter.userId])) {
      await this.resolveRound(room);
    }
  }

  private async tick() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (room.status !== 'active') {
        if (room.status === 'finished' && now - (room.deadline ?? now) > 120_000) {
          this.destroyRoom(room);
        }
        continue;
      }
      const dropped = room.fighters.find((fighter) => {
        const since = room.disconnectedAt[fighter.userId];
        return since !== undefined && now - since > DISCONNECT_GRACE_MS;
      });
      if (dropped) {
        const winner = room.fighters.find((fighter) => fighter.userId !== dropped.userId);
        room.log.push(`${dropped.name} mất kết nối.`);
        await this.finish(room, winner?.userId ?? null);
        continue;
      }
      if (now >= room.deadline) {
        for (const fighter of room.fighters) {
          if (!room.submitted[fighter.userId]) {
            room.submitted[fighter.userId] = 'attack';
            room.log.push(`${fighter.name} hết giờ và tự tấn công.`);
          }
        }
        await this.resolveRound(room);
      }
    }
  }

  private async resolveRound(room: Room) {
    if (room.status !== 'active' || room.resolving) return;
    room.resolving = true;
    const [left, right] = room.fighters;
    const leftAction = room.submitted[left.userId] ?? 'defend';
    const rightAction = room.submitted[right.userId] ?? 'defend';
    const leftHit = strike(left, right, leftAction, rightAction);
    const rightHit = strike(right, left, rightAction, leftAction);
    room.hp[right.userId] = Math.max(0, room.hp[right.userId] - leftHit.damage);
    room.hp[left.userId] = Math.max(0, room.hp[left.userId] - rightHit.damage);
    room.log.push(leftHit.text, rightHit.text);
    room.submitted = {};

    const leftDown = room.hp[left.userId] <= 0;
    const rightDown = room.hp[right.userId] <= 0;
    if (leftDown || rightDown) {
      let winnerId: string | null = null;
      if (leftDown && !rightDown) winnerId = right.userId;
      if (rightDown && !leftDown) winnerId = left.userId;
      await this.finish(room, winnerId);
      return;
    }

    room.round += 1;
    room.deadline = Date.now() + ROUND_MS;
    room.resolving = false;
    room.log.push(`Hiệp ${room.round}.`);
    this.emitRoom(room);
  }

  private async finish(room: Room, winnerId: string | null) {
    if (room.status === 'finished') return;
    room.status = 'finished';
    room.winnerId = winnerId;
    room.deadline = Date.now();
    const [left, right] = room.fighters;
    if (!winnerId) {
      room.log.push('Hai bên cùng ngã. Trận hòa.');
      await this.store.recordResult(left.userId, 'draw');
      await this.store.recordResult(right.userId, 'draw');
    } else {
      const winner = room.fighters.find((fighter) => fighter.userId === winnerId);
      const loser = room.fighters.find((fighter) => fighter.userId !== winnerId);
      room.log.push(`${winner?.name ?? 'Người chơi'} thắng trận.`);
      await this.store.recordResult(winnerId, 'win');
      if (loser) await this.store.recordResult(loser.userId, 'loss');
    }
    this.emitRoom(room);
  }

  private emitRoom(room: Room) {
    for (const fighter of room.fighters) {
      this.socketFor(fighter.userId)?.emit('battle:update', this.view(room, fighter.userId));
    }
  }

  private view(room: Room, userId: string): BattleView {
    const you = room.fighters.find((fighter) => fighter.userId === userId) ?? room.fighters[0];
    const opponent = room.fighters.find((fighter) => fighter.userId !== you.userId) ?? room.fighters[1];
    return {
      roomId: room.id,
      round: room.round,
      deadline: room.deadline,
      status: room.status,
      winnerId: room.winnerId,
      log: room.log.slice(-12),
      you: present(you, room),
      opponent: present(opponent, room),
    };
  }

  private queueView(userId: string): QueueView {
    const index = this.queue.findIndex((entry) => entry.userId === userId);
    if (index < 0) return { state: 'idle', position: 0 };
    return { state: 'queued', position: index + 1 };
  }

  private roomFor(userId: string): Room | undefined {
    const roomId = this.userRoom.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  private socketFor(userId: string): Socket | undefined {
    const socketId = this.userSocket.get(userId);
    return socketId ? this.io.sockets.sockets.get(socketId) : undefined;
  }

  private leaveQueue(userId: string) {
    const index = this.queue.findIndex((entry) => entry.userId === userId);
    if (index >= 0) this.queue.splice(index, 1);
  }

  private closeRoomFor(userId: string) {
    const room = this.roomFor(userId);
    if (!room) return;
    this.userRoom.delete(userId);
    const other = room.fighters.find((fighter) => fighter.userId !== userId);
    if (!other || !this.userRoom.has(other.userId)) {
      this.rooms.delete(room.id);
    }
  }

  private destroyRoom(room: Room) {
    this.rooms.delete(room.id);
    for (const fighter of room.fighters) {
      if (this.userRoom.get(fighter.userId) === room.id) this.userRoom.delete(fighter.userId);
    }
  }
}

function toFighter(user: UserRecord, character: CharacterRecord): Fighter {
  return {
    userId: user.id,
    username: user.username,
    name: character.name,
    gender: character.gender,
    baseAvatarId: character.baseAvatarId,
    hairColor: character.hairColor,
    outfitColor: character.outfitColor,
    startingRegion: character.startingRegion,
    level: character.stats.level,
    attack: character.stats.attack,
    defense: character.stats.defense,
    maxHp: character.stats.hp,
    pets: [],
  };
}

function present(fighter: Fighter, room: Room): FighterView {
  return {
    ...fighter,
    hp: room.hp[fighter.userId] ?? 0,
    pets: fighter.pets ?? [],
    ready: Boolean(room.submitted[fighter.userId]),
  };
}
