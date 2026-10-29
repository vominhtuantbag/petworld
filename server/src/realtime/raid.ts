import type { Server, Socket } from 'socket.io';

import { goldenHourAt } from '../dungeon/schedule.js';
import { raidPayout, type RaidPayout } from '../dungeon/rewards.js';
import type { Arena } from './arena.js';
import type { WorldPresence } from './world.js';
import type { DuelSkillView, RaidBattleView, RaidJoin, RaidLobbyView, RaidSlotView, RaidUnitView } from './protocol.js';

const LOBBY_MS = 30_000;
const TURN_MS = 30_000;
const SLOTS = 5;

type Member = {
  userId: string;
  username: string;
  name: string;
  gender: 'male' | 'female';
  baseAvatarId: string;
  hairColor: string;
  outfitColor: string;
  level: number;
  attack: number;
  defense: number;
  maxHp: number;
  ready: boolean;
};

type Lobby = {
  id: string;
  zoneId: string;
  deadline: number;
  slots: (Member | null)[];
  closing: boolean;
};

type SkillCard = { name: string; power: number };

type Unit = {
  id: string;
  ownerId: string | null;
  name: string;
  kind: 'hero' | 'monster' | 'boss';
  slot: number;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  tint: string;
  skills: [SkillCard, SkillCard];
  baseAvatarId?: string;
  hairColor?: string;
  outfitColor?: string;
};

type RaidRoom = {
  id: string;
  level: number;
  round: number;
  deadline: number;
  status: 'active' | 'finished';
  resolving: boolean;
  victory: boolean;
  finishedAt: number;
  log: string[];
  members: Member[];
  units: Unit[];
  order: string[];
  turnId: string;
  rewards: RaidPayout | null;
};

/**
 * One waiting room per wilderness zone. Slots fill in arrival order.
 * The 30s clock starts with the first player and is not reset by later joins.
 * At zero, anyone still not ready is sent back to the map. Ready fighters
 * share one turn queue against two adds and a boss. Rewards are identical.
 */
export class DungeonRaids {
  private readonly lobbies = new Map<string, Lobby>();
  private readonly userLobby = new Map<string, string>();
  private readonly rooms = new Map<string, RaidRoom>();
  private readonly userRoom = new Map<string, string>();

  constructor(
    private readonly io: Server,
    private readonly world: WorldPresence,
    private readonly arena: Arena,
  ) {}

  engaged(userId: string): boolean {
    return this.userLobby.has(userId) || this.userRoom.has(userId);
  }

  attach() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.userId as string | undefined;
      if (!userId) return;
      const lobbyId = this.userLobby.get(userId);
      const lobby = lobbyId ? this.lobbies.get(lobbyId) : undefined;
      if (lobby) socket.emit('raid:lobby', this.lobbyView(lobby, userId));
      const room = this.roomFor(userId);
      if (room) socket.emit('raid:update', this.battleView(room, userId));

      socket.on('raid:join', (payload: unknown) => this.join(socket, userId, payload));
      socket.on('raid:ready', () => this.ready(socket, userId));
      socket.on('raid:leave', () => this.leave(userId));
      socket.on('raid:action', (payload: unknown) => this.action(socket, userId, payload));
      socket.on('disconnect', () => {
        if (this.userLobby.has(userId)) this.dropLobby(userId);
      });
    });

    const timer = setInterval(() => this.tick(), 250);
    timer.unref?.();
  }

  private join(socket: Socket, userId: string, payload: unknown) {
    const body = readJoin(payload);
    if (!body) {
      socket.emit('raid:error', { message: 'Không vào được hầm ngục.' });
      return;
    }
    if (!goldenHourAt(new Date()).active) {
      socket.emit('raid:error', { message: 'Hầm ngục chỉ mở trong giờ vàng (10:00–12:00, 15:00–17:00, 19:00–21:00).' });
      return;
    }
    if (body.zoneId.startsWith('town:')) {
      socket.emit('raid:error', { message: 'Hầm ngục nằm ngoài thị trấn.' });
      return;
    }
    const standing = this.world.where(userId);
    if (!standing || standing.zoneId !== body.zoneId) {
      socket.emit('raid:error', { message: 'Hãy đứng tại cửa hầm trên bản đồ.' });
      return;
    }
    if (this.arena.busy(userId)) {
      socket.emit('raid:error', { message: 'Bạn đang trong trận khác.' });
      return;
    }
    const existingLobby = this.lobbyFor(userId);
    if (existingLobby) {
      socket.emit('raid:lobby', this.lobbyView(existingLobby, userId));
      return;
    }
    const existingRoom = this.roomFor(userId);
    if (existingRoom) {
      socket.emit('raid:update', this.battleView(existingRoom, userId));
      return;
    }

    let lobby = this.lobbies.get(body.zoneId);
    if (lobby?.closing) lobby = undefined;
    if (!lobby) {
      lobby = {
        id: `raid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        zoneId: body.zoneId,
        deadline: Date.now() + LOBBY_MS,
        slots: Array.from({ length: SLOTS }, () => null),
        closing: false,
      };
      this.lobbies.set(body.zoneId, lobby);
    }
    const index = lobby.slots.findIndex((slot) => slot == null);
    if (index < 0) {
      socket.emit('raid:error', { message: 'Hầm ngục đã đủ 5 người.' });
      return;
    }
    const username = typeof socket.data.username === 'string' ? socket.data.username : 'Khách';
    lobby.slots[index] = {
      userId,
      username,
      name: body.name || username,
      gender: body.gender,
      baseAvatarId: body.baseAvatarId,
      hairColor: body.hairColor,
      outfitColor: body.outfitColor,
      level: body.level,
      attack: body.attack,
      defense: body.defense,
      maxHp: body.maxHp,
      ready: false,
    };
    this.userLobby.set(userId, lobby.zoneId);
    this.emitLobby(lobby);
  }

  private ready(socket: Socket, userId: string) {
    const lobby = this.lobbyFor(userId);
    if (!lobby || lobby.closing) {
      socket.emit('raid:error', { message: 'Phòng chờ không còn.' });
      return;
    }
    const member = lobby.slots.find((slot) => slot?.userId === userId);
    if (!member) return;
    member.ready = true;
    socket.emit('raid:ready_ack', { lobbyId: lobby.id });
    this.emitLobby(lobby);
  }

  private leave(userId: string) {
    if (this.userLobby.has(userId)) {
      this.dropLobby(userId);
      return;
    }
    const room = this.roomFor(userId);
    if (!room || room.status !== 'finished') return;
    this.userRoom.delete(userId);
    const still = room.members.some((member) => this.userRoom.get(member.userId) === room.id);
    if (!still) this.rooms.delete(room.id);
  }

  private dropLobby(userId: string) {
    const lobby = this.lobbyFor(userId);
    this.userLobby.delete(userId);
    if (!lobby || lobby.closing) return;
    const index = lobby.slots.findIndex((slot) => slot?.userId === userId);
    if (index >= 0) lobby.slots[index] = null;
    this.compact(lobby);
    if (lobby.slots.every((slot) => slot == null)) {
      this.lobbies.delete(lobby.zoneId);
      return;
    }
    this.emitLobby(lobby);
  }

  /** Packs the line so the next arrival takes the first open slot. */
  private compact(lobby: Lobby) {
    const filled = lobby.slots.filter((slot): slot is Member => slot != null);
    lobby.slots = Array.from({ length: SLOTS }, (_, index) => filled[index] ?? null);
  }

  private action(socket: Socket, userId: string, payload: unknown) {
    const room = this.roomFor(userId);
    if (!room || room.status !== 'active') {
      socket.emit('raid:error', { message: 'Không có trận hầm ngục đang mở.' });
      return;
    }
    const action = payload && typeof payload === 'object' && 'action' in payload ? payload.action : undefined;
    if (action !== 'attack' && action !== 'skill') {
      socket.emit('raid:error', { message: 'Đòn đánh không hợp lệ.' });
      return;
    }
    const actor = room.units.find((unit) => unit.id === room.turnId);
    if (!actor || actor.ownerId !== userId) {
      socket.emit('raid:error', { message: 'Chưa tới lượt của bạn.' });
      return;
    }
    const skill = payload && typeof payload === 'object' && 'skill' in payload && payload.skill === 1 ? 1 : 0;
    const targetId = payload && typeof payload === 'object' && 'targetId' in payload && typeof payload.targetId === 'string' ? payload.targetId : undefined;
    this.resolve(room, action, skill, targetId);
  }

  private tick() {
    const now = Date.now();
    for (const lobby of [...this.lobbies.values()]) {
      if (lobby.closing || now < lobby.deadline) continue;
      this.closeLobby(lobby);
    }
    for (const room of this.rooms.values()) {
      if (room.status === 'finished') {
        if (now - room.finishedAt > 120_000) this.destroy(room);
        continue;
      }
      if (room.resolving || now < room.deadline) continue;
      const actor = room.units.find((unit) => unit.id === room.turnId);
      room.log.push(`${actor?.name ?? 'Người chơi'} hết giờ và tự tấn công.`);
      this.resolve(room, 'attack', 0, undefined);
    }
  }

  private closeLobby(lobby: Lobby) {
    lobby.closing = true;
    this.lobbies.delete(lobby.zoneId);
    const ready: { member: Member; slot: number }[] = [];
    for (let index = 0; index < lobby.slots.length; index += 1) {
      const slot = lobby.slots[index];
      if (!slot) continue;
      this.userLobby.delete(slot.userId);
      if (!slot.ready) {
        this.live(slot.userId)?.emit('raid:evict', { message: 'Hết giờ sẵn sàng. Bạn bị đưa về bản đồ.' });
        continue;
      }
      ready.push({ member: slot, slot: index });
    }
    if (ready.length === 0) return;
    this.openRoom(ready);
  }

  private openRoom(party: { member: Member; slot: number }[]) {
    const members = party.map((entry) => entry.member);
    const level = Math.max(1, Math.round(members.reduce((sum, member) => sum + member.level, 0) / members.length));
    const units = [...party.map((entry) => heroUnit(entry.member, entry.slot)), ...foeUnits(level)];
    const order = speedOrder(units);
    const turnId = order[0] ?? units[0].id;
    const actor = units.find((unit) => unit.id === turnId);
    const room: RaidRoom = {
      id: `raid-fight-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      level,
      round: 1,
      deadline: Date.now() + TURN_MS,
      status: 'active',
      resolving: false,
      victory: false,
      finishedAt: 0,
      log: [`Hầm ngục mở. ${members.length} người vào trận.`, `Tới lượt ${actor?.name ?? 'người chơi'}.`],
      members,
      units,
      order,
      turnId,
      rewards: null,
    };
    this.rooms.set(room.id, room);
    for (const member of members) this.userRoom.set(member.userId, room.id);
    this.resolveOpening(room);
  }

  /** Foes that won the first speed roll act immediately, so the 30s clock always belongs to a hero. */
  private resolveOpening(room: RaidRoom) {
    room.resolving = true;
    while (room.status === 'active') {
      const actor = room.units.find((unit) => unit.id === room.turnId && unit.hp > 0);
      if (!actor || actor.kind === 'hero') break;
      this.strike(room, actor, 'attack', 0, undefined);
    }
    room.resolving = false;
    this.emitRoom(room);
  }

  private resolve(room: RaidRoom, action: 'attack' | 'skill', skillIndex: 0 | 1, targetId: string | undefined) {
    if (room.status !== 'active' || room.resolving) return;
    room.resolving = true;
    const actor = room.units.find((unit) => unit.id === room.turnId && unit.hp > 0);
    if (actor) this.strike(room, actor, action, skillIndex, targetId);
    else this.advance(room);
    while (room.status === 'active') {
      const next = room.units.find((unit) => unit.id === room.turnId && unit.hp > 0);
      if (!next || next.kind === 'hero') break;
      this.strike(room, next, 'attack', 0, undefined);
    }
    room.resolving = false;
    this.emitRoom(room);
  }

  private strike(room: RaidRoom, actor: Unit, action: 'attack' | 'skill', skillIndex: 0 | 1, targetId: string | undefined) {
    const foes = foesOf(room.units, actor);
    const target = foes.find((unit) => unit.id === targetId) ?? preferred(foes, actor);
    if (!target) {
      this.finish(room, actor.kind === 'hero');
      return;
    }
    const skill = action === 'skill' ? actor.skills[skillIndex] ?? actor.skills[0] : null;
    const power = skill ? skill.power : 1;
    const pierced = skill ? Math.floor(target.defense / 3) : Math.floor(target.defense / 2);
    const damage = Math.max(1, Math.round(actor.attack * power) - pierced);
    target.hp = Math.max(0, target.hp - damage);
    const verb = skill ? `dùng ${skill.name} vào` : 'tấn công';
    room.log.push(`${actor.name} ${verb} ${target.name}, gây ${damage} sát thương.`);
    const heroesAlive = room.units.some((unit) => unit.kind === 'hero' && unit.hp > 0);
    const foesAlive = room.units.some((unit) => unit.kind !== 'hero' && unit.hp > 0);
    if (!foesAlive) {
      this.finish(room, true);
      return;
    }
    if (!heroesAlive) {
      this.finish(room, false);
      return;
    }
    this.advance(room);
  }

  private advance(room: RaidRoom) {
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
    room.order = speedOrder(room.units);
    room.turnId = room.order[0] ?? room.turnId;
    room.deadline = Date.now() + TURN_MS;
    const actor = room.units.find((unit) => unit.id === room.turnId);
    room.log.push(`Hiệp ${room.round}. Tới lượt ${actor?.name ?? 'người chơi'}.`);
  }

  private finish(room: RaidRoom, victory: boolean) {
    if (room.status === 'finished') return;
    room.status = 'finished';
    room.victory = victory;
    room.finishedAt = Date.now();
    room.deadline = Date.now();
    room.rewards = victory ? raidPayout(room.level) : null;
    room.log.push(victory ? 'Cả đội hạ boss. Mỗi người nhận cùng một phần thưởng.' : 'Hầm ngục đánh bại cả đội.');
  }

  private emitRoom(room: RaidRoom) {
    for (const member of room.members) {
      this.live(member.userId)?.emit('raid:update', this.battleView(room, member.userId));
    }
  }

  private emitLobby(lobby: Lobby) {
    for (const slot of lobby.slots) {
      if (!slot) continue;
      this.live(slot.userId)?.emit('raid:lobby', this.lobbyView(lobby, slot.userId));
    }
  }

  private lobbyView(lobby: Lobby, userId: string): RaidLobbyView {
    return {
      lobbyId: lobby.id,
      zoneId: lobby.zoneId,
      deadline: lobby.deadline,
      youIndex: lobby.slots.findIndex((slot) => slot?.userId === userId),
      slots: lobby.slots.map((slot, index) => (slot ? slotView(slot, index) : null)),
    };
  }

  private battleView(room: RaidRoom, userId: string): RaidBattleView {
    const actor = room.units.find((unit) => unit.id === room.turnId);
    const yourTurn = room.status === 'active' && actor?.ownerId === userId;
    const yours = room.units.find((unit) => unit.ownerId === userId && unit.kind === 'hero');
    const skillSource = yourTurn ? actor : yours;
    return {
      roomId: room.id,
      round: room.round,
      deadline: room.deadline,
      status: room.status,
      victory: room.victory,
      log: room.log.slice(-12),
      turnId: room.turnId,
      queue: upcoming(room.order, room.turnId, room.units),
      units: room.units.map((unit) => toView(unit)),
      skills: skillButtons(skillSource),
      yourTurn,
      rewards: room.victory ? room.rewards : null,
    };
  }

  private lobbyFor(userId: string): Lobby | undefined {
    const zoneId = this.userLobby.get(userId);
    return zoneId ? this.lobbies.get(zoneId) : undefined;
  }

  private roomFor(userId: string): RaidRoom | undefined {
    const roomId = this.userRoom.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  private live(userId: string): Socket | undefined {
    for (const socket of this.io.sockets.sockets.values()) {
      if (socket.data.userId === userId) return socket;
    }
    return undefined;
  }

  private destroy(room: RaidRoom) {
    this.rooms.delete(room.id);
    for (const member of room.members) {
      if (this.userRoom.get(member.userId) === room.id) this.userRoom.delete(member.userId);
    }
  }
}

function slotView(member: Member, index: number): RaidSlotView {
  return {
    index,
    userId: member.userId,
    username: member.username,
    name: member.name,
    ready: member.ready,
    level: member.level,
    baseAvatarId: member.baseAvatarId,
    hairColor: member.hairColor,
    outfitColor: member.outfitColor,
  };
}

function heroUnit(member: Member, slot: number): Unit {
  const maxMp = Math.max(10, member.level * 8);
  return {
    id: member.userId,
    ownerId: member.userId,
    name: member.name,
    kind: 'hero',
    slot,
    level: member.level,
    hp: member.maxHp,
    maxHp: member.maxHp,
    mp: maxMp,
    maxMp,
    attack: member.attack,
    defense: member.defense,
    speed: 90 + Math.max(0, member.level - 1),
    tint: '#e4c27a',
    skills: [
      { name: 'Kỹ năng 1', power: 1.55 },
      { name: 'Kỹ năng 2', power: 1.85 },
    ],
    baseAvatarId: member.baseAvatarId,
    hairColor: member.hairColor,
    outfitColor: member.outfitColor,
  };
}

function foeUnits(level: number): Unit[] {
  const addHp = 55 + level * 16;
  const addAtk = 8 + level * 3;
  const addDef = 4 + level;
  const add = (slot: number, name: string, tint: string): Unit => ({
    id: `foe:${slot + 1}`,
    ownerId: null,
    name,
    kind: 'monster',
    slot,
    level,
    hp: addHp,
    maxHp: addHp,
    mp: 20 + level * 2,
    maxMp: 20 + level * 2,
    attack: addAtk,
    defense: addDef,
    speed: 70 + level,
    tint,
    skills: [
      { name: 'Kỹ năng 1', power: 1.2 },
      { name: 'Kỹ năng 2', power: 1.35 },
    ],
  });
  const bossHp = Math.round(addHp * 2.5);
  const boss: Unit = {
    id: 'boss',
    ownerId: null,
    name: 'Boss hầm ngục',
    kind: 'boss',
    slot: 0,
    level,
    hp: bossHp,
    maxHp: bossHp,
    mp: 40 + level * 3,
    maxMp: 40 + level * 3,
    attack: Math.round(addAtk * 1.35),
    defense: addDef + 4,
    speed: 60 + level,
    tint: '#c4472f',
    skills: [
      { name: 'Kỹ năng 1', power: 1.4 },
      { name: 'Kỹ năng 2', power: 1.7 },
    ],
  };
  return [add(0, 'Quái hầm ngục', '#8a5a42'), add(1, 'Quái hầm ngục', '#6a4a38'), boss];
}

function foesOf(units: readonly Unit[], actor: Unit): Unit[] {
  if (actor.kind === 'hero') return units.filter((unit) => unit.kind !== 'hero' && unit.hp > 0);
  return units.filter((unit) => unit.kind === 'hero' && unit.hp > 0);
}

function preferred(foes: readonly Unit[], actor: Unit): Unit | undefined {
  if (actor.kind === 'hero') return foes[0];
  return [...foes].sort((a, b) => a.hp / Math.max(1, a.maxHp) - b.hp / Math.max(1, b.maxHp) || a.id.localeCompare(b.id))[0];
}

function speedOrder(units: readonly Unit[]): string[] {
  return units
    .filter((unit) => unit.hp > 0)
    .sort((a, b) => b.speed - a.speed || a.id.localeCompare(b.id))
    .map((unit) => unit.id);
}

function upcoming(order: readonly string[], turnId: string, units: readonly Unit[]): string[] {
  const living = new Set(units.filter((unit) => unit.hp > 0).map((unit) => unit.id));
  const alive = order.filter((id) => living.has(id));
  if (!living.has(turnId)) return alive;
  const start = alive.indexOf(turnId);
  if (start <= 0) return alive;
  return [...alive.slice(start), ...alive.slice(0, start)];
}

function toView(unit: Unit): RaidUnitView {
  return {
    id: unit.id,
    name: unit.name,
    kind: unit.kind,
    slot: unit.slot,
    hp: unit.hp,
    maxHp: unit.maxHp,
    mp: unit.mp,
    maxMp: unit.maxMp,
    attack: unit.attack,
    defense: unit.defense,
    side: unit.kind === 'hero' ? 'party' : 'foe',
    ownerId: unit.ownerId,
    tint: unit.tint,
    baseAvatarId: unit.baseAvatarId,
    hairColor: unit.hairColor,
    outfitColor: unit.outfitColor,
  };
}

function skillButtons(unit: Unit | undefined): DuelSkillView[] {
  const skills = unit?.skills ?? [
    { name: 'Kỹ năng 1', power: 1 },
    { name: 'Kỹ năng 2', power: 1 },
  ];
  return [
    { index: 0, name: skills[0].name },
    { index: 1, name: skills[1].name },
  ];
}

function readJoin(payload: unknown): RaidJoin | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as Record<string, unknown>;
  if (typeof body.zoneId !== 'string' || body.zoneId.length < 2 || body.zoneId.length > 80) return null;
  return {
    zoneId: body.zoneId,
    name: clip(body.name, 24, 'Khách'),
    gender: body.gender === 'female' ? 'female' : 'male',
    baseAvatarId: clip(body.baseAvatarId, 40, 'm-wanderer'),
    hairColor: clip(body.hairColor, 20, '#7a4630'),
    outfitColor: clip(body.outfitColor, 20, '#3e6b4d'),
    level: clamp(body.level, 1, 200, 1),
    attack: clamp(body.attack, 1, 9999, 10),
    defense: clamp(body.defense, 0, 9999, 4),
    maxHp: clamp(body.maxHp, 1, 99999, 100),
  };
}

function clip(value: unknown, max: number, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const text = value.trim();
  return text ? text.slice(0, max) : fallback;
}

function clamp(value: unknown, low: number, high: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(low, Math.min(high, Math.round(value)));
}
