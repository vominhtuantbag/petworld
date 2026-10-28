import type { Server, Socket } from 'socket.io';

import { acceptToken, bindSessionKick, SESSION_REPLACED_MESSAGE } from '../auth/sessions.js';
import { readToken } from '../auth/tokens.js';
import type { AccountStore, CharacterRecord, UserRecord } from '../domain.js';
import type { RegionId } from '../catalog.js';
import type { BattleView, DuelPet, DuelSkillView, DuelUnitView, FighterView, QueueView } from './protocol.js';

export type DuelHint = {
  username: string;
  name: string;
  gender: 'male' | 'female';
  baseAvatarId: string;
  hairColor: string;
  outfitColor: string;
  level: number;
  maxHp: number;
};

const TURN_MS = 30_000;
const DISCONNECT_GRACE_MS = 12_000;

type Fighter = Omit<FighterView, 'hp' | 'ready'> & { attack: number; defense: number };

type SkillCard = { name: string; power: number };

type CombatUnit = {
  id: string;
  ownerId: string;
  name: string;
  kind: 'hero' | 'pet';
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  initiative: boolean;
  skills: [SkillCard, SkillCard];
};

type Room = {
  id: string;
  round: number;
  deadline: number;
  status: 'active' | 'finished';
  resolving: boolean;
  winnerId: string | null;
  log: string[];
  fighters: [Fighter, Fighter];
  units: CombatUnit[];
  order: string[];
  turnId: string;
  disconnectedAt: Record<string, number | undefined>;
};

type QueuedPlayer = {
  userId: string;
  socketId: string;
};

/**
 * Matchmaking queue and in-memory duel rooms.
 *
 * Rooms are not written to the database. Wins and losses are. Heroes and pets
 * share one speed queue. The acting unit has 30 seconds; a confirm resolves
 * that turn immediately, and a timeout swings a basic attack.
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
      socket.on('battle:sync', () => {
        const room = this.roomFor(userId);
        if (!room) return;
        socket.emit('battle:update', this.view(room, userId));
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
  async startDuel(
    leftId: string,
    rightId: string,
    pets: ReadonlyMap<string, DuelPet[]>,
    hints: ReadonlyMap<string, DuelHint> = new Map(),
  ): Promise<boolean> {
    if (leftId === rightId) {
      console.warn('[arena] duel refused, both ids match');
      return false;
    }
    const leftRoom = this.roomFor(leftId);
    const rightRoom = this.roomFor(rightId);
    if (leftRoom?.status === 'active' && rightRoom?.id === leftRoom.id) {
      this.emitRoom(leftRoom);
      return true;
    }
    if (leftRoom) this.destroyRoom(leftRoom);
    if (rightRoom && rightRoom.id !== leftRoom?.id) this.destroyRoom(rightRoom);
    this.leaveQueue(leftId);
    this.leaveQueue(rightId);
    const left = await this.fighterFromId(leftId, hints.get(leftId));
    const right = await this.fighterFromId(rightId, hints.get(rightId));
    if (!left || !right) {
      console.warn(`[arena] duel refused, fighter missing left=${Boolean(left)} right=${Boolean(right)}`);
      return false;
    }
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

  private async fighterFromId(userId: string, hint?: DuelHint): Promise<Fighter | null> {
    const user = await this.store.findUserById(userId);
    const character = user ? await this.store.findCharacterByUserId(userId) : null;
    if (user && character) {
      try {
        return toFighter(user, character);
      } catch (error) {
        console.warn(`[arena] character for ${userId} could not be read`, error);
      }
    }
    if (!hint) return null;
    return fighterFromHint(userId, user?.username ?? hint.username, hint);
  }

  private async fighterFromQueue(entry: QueuedPlayer): Promise<Fighter | null> {
    const user = await this.store.findUserById(entry.userId);
    const character = await this.store.findCharacterByUserId(entry.userId);
    const socket = this.io.sockets.sockets.get(entry.socketId);
    if (!user || !character || !socket) return null;
    return toFighter(user, character);
  }

  private openRoom(left: Fighter, right: Fighter) {
    const units = [...unitsFor(left), ...unitsFor(right)];
    const order = duelOrder(units, 1);
    const turnId = order[0] ?? left.userId;
    const actor = units.find((unit) => unit.id === turnId);
    const room: Room = {
      id: `duel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      round: 1,
      deadline: Date.now() + TURN_MS,
      status: 'active',
      resolving: false,
      winnerId: null,
      log: [`${left.name} gặp ${right.name}.`, `Tới lượt ${actor?.name ?? left.name}.`],
      fighters: [left, right],
      units,
      order,
      turnId,
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
    if (action !== 'attack' && action !== 'skill') {
      socket.emit('battle:error', { message: 'Đòn đánh không hợp lệ.' });
      return;
    }
    const actor = room.units.find((unit) => unit.id === room.turnId);
    if (!actor || actor.ownerId !== userId) {
      socket.emit('battle:error', { message: 'Chưa tới lượt của bạn.' });
      return;
    }
    const skill = payload && typeof payload === 'object' && 'skill' in payload && payload.skill === 1 ? 1 : 0;
    const targetId = payload && typeof payload === 'object' && 'targetId' in payload && typeof payload.targetId === 'string' ? payload.targetId : undefined;
    await this.playTurn(room, action, skill, targetId);
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
      if (now >= room.deadline && !room.resolving) {
        const actor = room.units.find((unit) => unit.id === room.turnId);
        room.log.push(`${actor?.name ?? 'Người chơi'} hết giờ và tự tấn công.`);
        await this.playTurn(room, 'attack', 0, undefined);
      }
    }
  }

  /** Resolves the acting unit now. A confirm and a timeout both come through here. */
  private async playTurn(room: Room, action: 'attack' | 'skill', skillIndex: 0 | 1, targetId: string | undefined) {
    if (room.status !== 'active' || room.resolving) return;
    room.resolving = true;
    const actor = room.units.find((unit) => unit.id === room.turnId && unit.hp > 0);
    if (!actor) {
      this.advance(room);
      room.resolving = false;
      this.emitRoom(room);
      return;
    }
    const foes = room.units.filter((unit) => unit.ownerId !== actor.ownerId && unit.hp > 0);
    const target = foes.find((unit) => unit.id === targetId) ?? foes[0];
    if (!target) {
      await this.finish(room, actor.ownerId);
      return;
    }
    const skill = action === 'skill' ? actor.skills[skillIndex] ?? actor.skills[0] : null;
    const power = skill ? skill.power : 1;
    const pierced = skill ? Math.floor(target.defense / 3) : Math.floor(target.defense / 2);
    const damage = Math.max(1, Math.round(actor.attack * power) - pierced);
    target.hp = Math.max(0, target.hp - damage);
    const verb = skill ? `dùng ${skill.name} vào` : 'tấn công';
    room.log.push(`${actor.name} ${verb} ${target.name}, gây ${damage} sát thương.`);

    const owners = [...new Set(room.units.map((unit) => unit.ownerId))];
    const livingOwners = owners.filter((id) => room.units.some((unit) => unit.ownerId === id && unit.hp > 0));
    if (livingOwners.length < 2) {
      await this.finish(room, livingOwners[0] ?? null);
      return;
    }
    this.advance(room);
    room.resolving = false;
    this.emitRoom(room);
  }

  /** Next living unit in this round, or a fresh speed order when the round ends. */
  private advance(room: Room) {
    const start = room.order.indexOf(room.turnId);
    for (let step = start + 1; step < room.order.length; step += 1) {
      const unit = room.units.find((entry) => entry.id === room.order[step]);
      if (!unit || unit.hp <= 0) continue;
      room.turnId = unit.id;
      room.deadline = Date.now() + TURN_MS;
      room.log.push(`Tới lượt ${unit.name}.`);
      return;
    }
    room.round += 1;
    room.order = duelOrder(room.units, room.round);
    room.turnId = room.order[0] ?? room.turnId;
    room.deadline = Date.now() + TURN_MS;
    const actor = room.units.find((unit) => unit.id === room.turnId);
    room.log.push(`Hiệp ${room.round}. Tới lượt ${actor?.name ?? 'người chơi'}.`);
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
    const actor = room.units.find((unit) => unit.id === room.turnId);
    const yourTurn = room.status === 'active' && actor?.ownerId === userId;
    const skillSource = (yourTurn ? actor : room.units.find((unit) => unit.id === you.userId)) ?? actor;
    return {
      roomId: room.id,
      round: room.round,
      deadline: room.deadline,
      status: room.status,
      winnerId: room.winnerId,
      log: room.log.slice(-12),
      you: present(you, room),
      opponent: present(opponent, room),
      turnId: room.turnId,
      queue: upcoming(room.order, room.turnId, room.units),
      units: room.units.map((unit) => toUnitView(unit, userId)),
      skills: skillButtons(skillSource),
      yourTurn,
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
  const stats = character.stats ?? { hp: 100, attack: 13, defense: 6, level: 1, wins: 0, losses: 0 };
  const level = clampStat(stats.level, 1, 200);
  return {
    userId: user.id,
    username: user.username,
    name: character.name || user.username,
    gender: character.gender === 'female' ? 'female' : 'male',
    baseAvatarId: character.baseAvatarId || 'm-wanderer',
    hairColor: character.hairColor || '#7a4630',
    outfitColor: character.outfitColor || '#3e6b4d',
    startingRegion: character.startingRegion,
    level,
    attack: clampStat(stats.attack, 1, 9999),
    defense: clampStat(stats.defense, 0, 9999),
    maxHp: clampStat(stats.hp, 1, 99999),
    pets: [],
  };
}

function fighterFromHint(userId: string, username: string, hint: DuelHint): Fighter {
  const level = clampStat(hint.level, 1, 200);
  const name = hint.name || username || 'Khách';
  return {
    userId,
    username: username || hint.username || 'Khách',
    name,
    gender: hint.gender === 'female' ? 'female' : 'male',
    baseAvatarId: hint.baseAvatarId || 'm-wanderer',
    hairColor: hint.hairColor || '#7a4630',
    outfitColor: hint.outfitColor || '#3e6b4d',
    startingRegion: 'forest' as RegionId,
    level,
    attack: 10 + level * 3,
    defense: 4 + level * 2,
    maxHp: clampStat(hint.maxHp, 1, 99999),
    pets: [],
  };
}

function clampStat(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return low;
  return Math.max(low, Math.min(high, Math.round(value)));
}

function present(fighter: Fighter, room: Room): FighterView {
  const hero = room.units.find((unit) => unit.id === fighter.userId);
  const pets = room.units
    .filter((unit) => unit.ownerId === fighter.userId && unit.kind === 'pet')
    .map((unit) => ({ name: unit.name, level: unit.level, hp: unit.hp, maxHp: unit.maxHp }));
  return {
    ...fighter,
    hp: hero?.hp ?? 0,
    pets,
    ready: false,
  };
}

function unitsFor(fighter: Fighter): CombatUnit[] {
  const level = fighter.level;
  const maxMp = Math.max(10, level * 8);
  const hero: CombatUnit = {
    id: fighter.userId,
    ownerId: fighter.userId,
    name: fighter.name,
    kind: 'hero',
    level,
    hp: fighter.maxHp,
    maxHp: fighter.maxHp,
    mp: maxMp,
    maxMp,
    attack: fighter.attack,
    defense: fighter.defense,
    speed: 90 + Math.max(0, level - 1),
    initiative: true,
    skills: [
      { name: 'Kỹ năng 1', power: 1.55 },
      { name: 'Kỹ năng 2', power: 1.85 },
    ],
  };
  const pets = (fighter.pets ?? []).slice(0, 3).flatMap((pet, index) => {
    const petLevel = clampStat(pet.level, 1, 200);
    const petMax = clampStat(pet.maxHp, 1, 99999);
    const hp = clampStat(Math.min(pet.hp, petMax), 0, petMax);
    if (hp <= 0) return [];
    const petMp = Math.max(8, petLevel * 4);
    const card: CombatUnit = {
      id: `${fighter.userId}:pet:${index}`,
      ownerId: fighter.userId,
      name: pet.name || `Thú ${index + 1}`,
      kind: 'pet',
      level: petLevel,
      hp,
      maxHp: petMax,
      mp: petMp,
      maxMp: petMp,
      attack: 6 + petLevel * 2,
      defense: 3 + petLevel,
      speed: 48 + petLevel,
      initiative: false,
      skills: [
        { name: 'Kỹ năng 1', power: 1.35 },
        { name: 'Kỹ năng 2', power: 1.6 },
      ],
    };
    return [card];
  });
  return [hero, ...pets];
}

/** Round 1 pulls the fastest hero forward. Later rounds follow speed alone. */
function duelOrder(units: readonly CombatUnit[], round: number): string[] {
  const living = units.filter((unit) => unit.hp > 0);
  const bySpeed = [...living].sort((a, b) => b.speed - a.speed || a.id.localeCompare(b.id));
  if (round <= 1) {
    const hero = bySpeed.find((unit) => unit.kind === 'hero' && unit.initiative);
    if (hero) return [hero.id, ...bySpeed.filter((unit) => unit.id !== hero.id).map((unit) => unit.id)];
  }
  return bySpeed.map((unit) => unit.id);
}

function upcoming(order: readonly string[], turnId: string, units: readonly CombatUnit[]): string[] {
  const living = new Set(units.filter((unit) => unit.hp > 0).map((unit) => unit.id));
  const alive = order.filter((id) => living.has(id));
  if (!living.has(turnId)) return alive;
  const start = alive.indexOf(turnId);
  if (start <= 0) return alive;
  return [...alive.slice(start), ...alive.slice(0, start)];
}

function toUnitView(unit: CombatUnit, viewerId: string): DuelUnitView {
  return {
    id: unit.id,
    ownerId: unit.ownerId,
    name: unit.name,
    kind: unit.kind,
    level: unit.level,
    hp: unit.hp,
    maxHp: unit.maxHp,
    mp: unit.mp,
    maxMp: unit.maxMp,
    attack: unit.attack,
    defense: unit.defense,
    speed: unit.speed,
    side: unit.ownerId === viewerId ? 'you' : 'opponent',
  };
}

function skillButtons(unit: CombatUnit | undefined): DuelSkillView[] {
  const skills = unit?.skills ?? [
    { name: 'Kỹ năng 1', power: 1 },
    { name: 'Kỹ năng 2', power: 1 },
  ];
  return [
    { index: 0, name: skills[0].name },
    { index: 1, name: skills[1].name },
  ];
}
