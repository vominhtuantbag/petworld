import type { Server, Socket } from 'socket.io';

import type { DuelPet } from './protocol.js';
import type { Arena, DuelHint } from './arena.js';
import type { WorldPresence } from './world.js';

/** Matches the button range in `src/components/world/PvpChallenge.tsx`, plus a little slack for a step in flight. */
const PVP_RANGE = 164;
const INVITE_MS = 20_000;
const PREP_MS = 30_000;

type Invite = {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: number;
};

type Prep = {
  id: string;
  leftId: string;
  rightId: string;
  deadline: number;
  ready: Set<string>;
  forced: Set<string>;
  pets: Map<string, DuelPet[]>;
  sockets: Map<string, string>;
  starting: boolean;
};

/**
 * Proximity duels. A challenge is a direct emit to the two sockets.
 * Map rooms (`player_join`, `player_move`, `sync_players`) are not touched.
 * When both squads lock in, or the 30s prep clock ends, Arena opens the room.
 */
export class ProximityDuels {
  private readonly invites = new Map<string, Invite>();
  private readonly preps = new Map<string, Prep>();

  constructor(
    private readonly io: Server,
    private readonly world: WorldPresence,
    private readonly arena: Arena,
  ) {}

  attach() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.userId as string | undefined;
      if (!userId) return;
      socket.on('send_pvp_challenge', (payload: unknown) => {
        void this.challenge(socket, userId, payload);
      });
      socket.on('accept_pvp_challenge', (payload: unknown) => {
        void this.accept(socket, userId, payload);
      });
      socket.on('decline_pvp_challenge', (payload: unknown) => {
        this.decline(userId, payload);
      });
      socket.on('pvp_squad_ready', (payload: unknown) => {
        this.ready(socket, userId, payload);
      });
      socket.on('pvp_force_begin', (payload: unknown) => {
        this.force(socket, userId, payload);
      });
      socket.on('disconnect', () => {
        this.drop(userId);
      });
    });
    const timer = setInterval(() => {
      void this.tick();
    }, 250);
    timer.unref?.();
  }

  private async challenge(socket: Socket, userId: string, payload: unknown) {
    const toUserId = readId(payload, 'toUserId');
    if (!toUserId || toUserId === userId) {
      socket.emit('pvp_error', { message: 'Không thể khiêu chiến người này.' });
      return;
    }
    if (this.engaged(userId) || this.engaged(toUserId) || this.arena.busy(userId) || this.arena.busy(toUserId)) {
      socket.emit('pvp_error', { message: 'Một trong hai người đang bận khiêu chiến.' });
      return;
    }
    const from = this.world.where(userId);
    const to = this.world.where(toUserId);
    if (!from || !to || from.zoneId !== to.zoneId) {
      socket.emit('pvp_error', { message: 'Người chơi không còn đứng gần bạn.' });
      return;
    }
    if (Math.hypot(from.x - to.x, from.y - to.y) > PVP_RANGE) {
      socket.emit('pvp_error', { message: 'Bạn đứng quá xa để khiêu chiến.' });
      return;
    }
    const invite: Invite = {
      id: `pvp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      fromUserId: userId,
      toUserId,
      createdAt: Date.now(),
    };
    this.invites.set(invite.id, invite);
    this.remember(userId, socket.id);
    this.liveSocket(toUserId)?.emit('pvp_challenge', {
      challengeId: invite.id,
      fromUserId: userId,
      fromUsername: from.username,
    });
    socket.emit('pvp_outgoing', {
      challengeId: invite.id,
      toUserId,
      toUsername: to.username,
    });
  }

  private readonly sockets = new Map<string, string>();

  private remember(userId: string, socketId: string) {
    this.sockets.set(userId, socketId);
  }

  /** The live socket for this account, even after they leave the map room for squad setup. */
  private liveSocket(userId: string): Socket | undefined {
    for (const socket of this.io.sockets.sockets.values()) {
      if (socket.data.userId === userId) return socket;
    }
    const saved = this.sockets.get(userId);
    return saved ? this.io.sockets.sockets.get(saved) : undefined;
  }

  private async accept(socket: Socket, userId: string, payload: unknown) {
    const challengeId = readId(payload, 'challengeId');
    const invite = challengeId ? this.invites.get(challengeId) : undefined;
    if (!invite || invite.toUserId !== userId) {
      socket.emit('pvp_error', { message: 'Lời khiêu chiến không còn.' });
      return;
    }
    this.invites.delete(invite.id);
    const from = this.world.where(invite.fromUserId);
    const to = this.world.where(invite.toUserId);
    if (!from || !to || from.zoneId !== to.zoneId || Math.hypot(from.x - to.x, from.y - to.y) > PVP_RANGE) {
      this.emitBoth(invite.fromUserId, invite.toUserId, 'pvp_challenge_closed', {
        challengeId: invite.id,
        message: 'Hai người đã đứng quá xa.',
      });
      return;
    }
    const prep: Prep = {
      id: invite.id,
      leftId: invite.fromUserId,
      rightId: invite.toUserId,
      deadline: Date.now() + PREP_MS,
      ready: new Set(),
      forced: new Set(),
      pets: new Map(),
      sockets: new Map([
        [invite.fromUserId, this.sockets.get(invite.fromUserId) ?? ''],
        [invite.toUserId, socket.id],
      ]),
      starting: false,
    };
    this.preps.set(prep.id, prep);
    this.emitPrep(prep, from.username, to.username);
  }

  private decline(userId: string, payload: unknown) {
    const challengeId = readId(payload, 'challengeId');
    const invite = challengeId ? this.invites.get(challengeId) : this.inviteFor(userId);
    if (!invite) return;
    if (invite.fromUserId !== userId && invite.toUserId !== userId) return;
    this.invites.delete(invite.id);
    this.emitBoth(invite.fromUserId, invite.toUserId, 'pvp_challenge_closed', {
      challengeId: invite.id,
      message: 'Lời khiêu chiến đã được từ chối.',
    });
  }

  private ready(socket: Socket, userId: string, payload: unknown) {
    this.remember(userId, socket.id);
    const matchId = readId(payload, 'matchId');
    const prep = matchId ? this.preps.get(matchId) : this.prepFor(userId);
    if (!prep || (prep.leftId !== userId && prep.rightId !== userId)) return;
    prep.sockets.set(userId, socket.id);
    prep.ready.add(userId);
    prep.pets.set(userId, readPets(payload));
    socket.emit('pvp_squad_ack', { matchId: prep.id });
    if (prep.ready.has(prep.leftId) && prep.ready.has(prep.rightId)) {
      void this.begin(prep);
    }
  }

  /**
   * Each client sends this when its 30s clock hits zero.
   * One side is not enough before the deadline. Both sides, or the deadline, start the fight.
   */
  private force(socket: Socket, userId: string, payload: unknown) {
    this.remember(userId, socket.id);
    const matchId = readId(payload, 'matchId');
    const prep = matchId ? this.preps.get(matchId) : this.prepFor(userId);
    if (!prep || (prep.leftId !== userId && prep.rightId !== userId)) return;
    prep.sockets.set(userId, socket.id);
    prep.forced.add(userId);
    const bothForced = prep.forced.has(prep.leftId) && prep.forced.has(prep.rightId);
    if (bothForced || Date.now() + 1_500 >= prep.deadline) {
      void this.begin(prep);
    }
  }

  private async tick() {
    const now = Date.now();
    for (const invite of [...this.invites.values()]) {
      if (now - invite.createdAt < INVITE_MS) continue;
      this.invites.delete(invite.id);
      this.emitBoth(invite.fromUserId, invite.toUserId, 'pvp_challenge_closed', {
        challengeId: invite.id,
        message: 'Lời khiêu chiến đã hết giờ.',
      });
    }
    for (const prep of [...this.preps.values()]) {
      if (now < prep.deadline) continue;
      await this.begin(prep);
    }
  }

  private async begin(prep: Prep) {
    if (prep.starting || !this.preps.has(prep.id)) return;
    prep.starting = true;
    this.preps.delete(prep.id);
    const hints = new Map<string, DuelHint>();
    for (const id of [prep.leftId, prep.rightId]) hints.set(id, this.hintFor(id));
    let opened = false;
    try {
      opened = await this.arena.startDuel(prep.leftId, prep.rightId, prep.pets, hints);
    } catch (error) {
      console.error(`[pvp] duel ${prep.id} threw`, error);
    }
    if (opened) {
      this.liveSocket(prep.leftId)?.emit('pvp_battle_start', { matchId: prep.id });
      this.liveSocket(prep.rightId)?.emit('pvp_battle_start', { matchId: prep.id });
      return;
    }
    console.warn(`[pvp] duel ${prep.id} did not open for ${prep.leftId} vs ${prep.rightId}`);
    this.emitBoth(prep.leftId, prep.rightId, 'pvp_error', { message: 'Không mở được trận khiêu chiến.' });
  }

  private hintFor(userId: string): DuelHint {
    const person = this.world.profile(userId);
    const socket = this.liveSocket(userId);
    const stored = typeof socket?.data.username === 'string' ? socket.data.username : '';
    const username = person?.username || stored || 'Khách';
    return {
      username,
      name: person?.name || username,
      gender: person?.gender === 'female' ? 'female' : 'male',
      baseAvatarId: person?.baseCharacterId || 'm-wanderer',
      hairColor: person?.hairColor || '#7a4630',
      outfitColor: person?.outfitColor || '#3e6b4d',
      level: person?.level || 1,
      maxHp: person?.maxHp || Math.max(1, person?.hp || 100),
    };
  }

  private emitPrep(prep: Prep, leftName: string, rightName: string) {
    this.liveSocket(prep.leftId)?.emit('pvp_prep', { matchId: prep.id, deadline: prep.deadline, opponentUserId: prep.rightId, opponentUsername: rightName });
    this.liveSocket(prep.rightId)?.emit('pvp_prep', { matchId: prep.id, deadline: prep.deadline, opponentUserId: prep.leftId, opponentUsername: leftName });
  }

  private emitBoth(leftId: string, rightId: string, event: string, payload: unknown) {
    this.liveSocket(leftId)?.emit(event, payload);
    this.liveSocket(rightId)?.emit(event, payload);
  }

  private drop(userId: string) {
    for (const invite of [...this.invites.values()]) {
      if (invite.fromUserId !== userId && invite.toUserId !== userId) continue;
      this.invites.delete(invite.id);
      const other = invite.fromUserId === userId ? invite.toUserId : invite.fromUserId;
      this.liveSocket(other)?.emit('pvp_challenge_closed', {
        challengeId: invite.id,
        message: 'Đối thủ đã rời bản đồ.',
      });
    }
  }

  private engaged(userId: string): boolean {
    return Boolean(this.inviteFor(userId) || this.prepFor(userId));
  }

  private inviteFor(userId: string): Invite | undefined {
    for (const invite of this.invites.values()) {
      if (invite.fromUserId === userId || invite.toUserId === userId) return invite;
    }
    return undefined;
  }

  private prepFor(userId: string): Prep | undefined {
    for (const prep of this.preps.values()) {
      if (prep.leftId === userId || prep.rightId === userId) return prep;
    }
    return undefined;
  }
}

function readId(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readPets(payload: unknown): DuelPet[] {
  if (!payload || typeof payload !== 'object') return [];
  const raw = (payload as { pets?: unknown }).pets;
  if (!Array.isArray(raw)) return [];
  const pets: DuelPet[] = [];
  for (const entry of raw.slice(0, 3)) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as { name?: unknown; level?: unknown; hp?: unknown; maxHp?: unknown };
    const name = typeof row.name === 'string' ? row.name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24) : '';
    if (!name) continue;
    const maxHp = clamp(row.maxHp, 1, 99_999);
    pets.push({
      name,
      level: clamp(row.level, 1, 200),
      hp: Math.min(maxHp, clamp(row.hp, 0, 99_999)),
      maxHp,
    });
  }
  return pets;
}

function clamp(value: unknown, low: number, high: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return low;
  return Math.max(low, Math.min(high, Math.round(number)));
}
