import type { Server, Socket } from 'socket.io';

import { acceptToken, bindSessionKick, SESSION_REPLACED_MESSAGE } from '../auth/sessions.js';
import { readToken } from '../auth/tokens.js';
import type { AccountStore, CharacterRecord, UserRecord } from '../domain.js';
import type { RegionId } from '../catalog.js';
import type { GameSave } from '../saves/schema.js';
import type {
  ArenaDraftView,
  ArenaFriendView,
  ArenaRankView,
  BattleView,
  DraftPetView,
  DraftPhase,
  DuelPet,
  DuelSkillView,
  DuelUnitView,
  FighterView,
  LastHitView,
  QueueView,
} from './protocol.js';
import { advancedAtLevel } from '../combat/advanced.js';
import { arenaSkills, professionFromAvatar, type ClassSkillCard } from '../combat/classSkills.js';
import { strike } from '../combat/rules.js';
import { statsForRecord } from '../combat/stats.js';
import type { MatchHistoryEntry } from '../domain.js';
import { applyStarResult, mmrBand, mmrClose, normalizeRank, rankTitle } from './ranks.js';
import { banTarget, decideTurn, pickSquad } from './smartAi.js';

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
const PICK_MS = 20_000;
const BAN_MS = 15_000;
const HUMAN_ONLY_MS = 12_000;
const AI_FALLBACK_MIN_MS = 13_000;
const AI_FALLBACK_MAX_MS = 25_000;
const BOT_THINK_MS = 700;

type Fighter = Omit<FighterView, 'hp' | 'ready'> & { attack: number; defense: number };

type SkillCard = ClassSkillCard;

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
  cooldowns: Record<string, number>;
  tgh: number;
  maxTgh: number;
  armPen: number;
  res: number;
  critRate: number;
  critDamage: number;
  eva: number;
  acc: number;
  staggered?: boolean;
};

type SeriesState = {
  bout: number;
  bouts: Record<string, number>;
};

type Room = {
  id: string;
  round: number;
  deadline: number;
  status: 'active' | 'finished';
  resolving: boolean;
  winnerId: string | null;
  log: string[];
  lastHit: LastHitView | null;
  fighters: [Fighter, Fighter];
  units: CombatUnit[];
  order: string[];
  turnId: string;
  disconnectedAt: Record<string, number | undefined>;
  ranked: boolean;
  bout: number;
  bouts: Record<string, number>;
  rankedResults: Record<string, RankedResult>;
  leftRoster: DraftPetView[];
  rightRoster: DraftPetView[];
  leftRank: { rankIndex: number; stars: number };
  rightRank: { rankIndex: number; stars: number };
};

type RankedResult = {
  stars: number;
  rankIndex: number;
  mmr: number;
  starDelta: number;
  wins: number;
  losses: number;
  history: MatchHistoryEntry[];
};

type QueuedPlayer = {
  userId: string;
  socketId: string;
  mmr: number;
  rankIndex: number;
  stars: number;
  joinedAt: number;
  /** Epoch ms. Rolled once when the player enters the queue. Never re-rolled. */
  aiAfter: number;
  lastWaitSec: number;
  disconnectedAt?: number;
};

type DraftChoice = {
  petIds: string[];
  banId: string | null;
  pickReady: boolean;
  banReady: boolean;
};

type Draft = {
  id: string;
  deadline: number;
  phase: DraftPhase;
  resolving: boolean;
  left: Fighter;
  right: Fighter;
  leftRoster: DraftPetView[];
  rightRoster: DraftPetView[];
  leftRank: { rankIndex: number; stars: number };
  rightRank: { rankIndex: number; stars: number };
  picks: Record<string, DraftChoice>;
  series: SeriesState;
  disconnectedAt: Record<string, number | undefined>;
};

/**
 * Matchmaking queue and in-memory duel rooms.
 *
 * Ranked queue uses expanding MMR bands. After 12s with no human, a real
 * stored account is played by Smart AI at a random 13–25s mark. Each bout
 * is preceded by Ban & Pick. First to two bout wins takes the match.
 */
export class Arena {
  private readonly queue: QueuedPlayer[] = [];
  private readonly rooms = new Map<string, Room>();
  private readonly drafts = new Map<string, Draft>();
  private readonly userRoom = new Map<string, string>();
  private readonly userDraft = new Map<string, string>();
  /** The one live socket for each account. A newer connection replaces it. */
  private readonly activeSessions = new Map<string, string>();
  private readonly userSocket = new Map<string, string>();
  private matching = false;

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
        if (this.draftFor(userId)) this.cancelDraftFor(userId, 'Đối thủ đã rời cửa sổ chọn tướng.');
        socket.emit('queue:status', { state: 'idle', position: 0 });
      });
      socket.on('arena:hello', () => {
        void this.greet(socket, userId);
      });
      socket.on('arena:draft_ready', (payload: unknown) => {
        void this.onDraftReady(socket, userId, payload);
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
        if (this.draftFor(userId)) this.cancelDraftFor(userId, 'Đối thủ đã rời cửa sổ chọn tướng.');
        this.closeRoomFor(userId);
        socket.emit('queue:status', { state: 'idle', position: 0 });
      });
      socket.on('disconnect', () => {
        if (this.activeSessions.get(userId) !== socket.id) return;
        this.activeSessions.delete(userId);
        this.userSocket.delete(userId);
        const queued = this.queue.find((entry) => entry.userId === userId);
        if (queued) queued.disconnectedAt = Date.now();
        const draft = this.draftFor(userId);
        if (draft) draft.disconnectedAt[userId] = Date.now();
        const active = this.roomFor(userId);
        if (active && active.status === 'active') {
          active.disconnectedAt[userId] = Date.now();
        }
        void this.broadcastFriends();
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
    socket.data.clientId = readClientId(socket);
    socket.data.username = user.username;
  }

  /**
   * One live socket per account. A newer engine for the same login (same sid)
   * takes over silently: reconnects, transport upgrades, React remounts, and
   * a late handshake from a closed client are not other devices. The kick
   * notice is only for a different sid, which issueSession already set.
   */
  private claim(socket: Socket, userId: string) {
    const previousId = this.activeSessions.get(userId);
    if (previousId && previousId !== socket.id) {
      const previous = this.io.sockets.sockets.get(previousId);
      const sameSid = Boolean(previous?.data.sid && previous.data.sid === socket.data.sid);
      const sameTab = Boolean(previous?.data.clientId && previous.data.clientId === socket.data.clientId);
      const previousGone = !previous || !previous.connected;
      if (sameSid || sameTab || previousGone) this.dropSocket(previousId);
      else this.kickSocket(previousId);
    }
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

  /** Same-tab takeover. Do not emit the other-device notice. */
  private dropSocket(socketId: string) {
    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) return;
    socket.disconnect(true);
  }

  private async onConnection(socket: Socket, userId: string) {
    const user = await this.store.findUserById(userId);
    if (!user) {
      socket.emit('battle:error', { message: 'Phiên đăng nhập không còn hiệu lực.' });
      socket.disconnect(true);
      return;
    }
    if (this.activeSessions.get(userId) !== socket.id) return;
    socket.data.username = user.username;

    const queued = this.queue.find((entry) => entry.userId === userId);
    if (queued) queued.disconnectedAt = undefined;
    const liveDraft = this.draftFor(userId);
    if (liveDraft) liveDraft.disconnectedAt[userId] = undefined;

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
    const draft = this.draftFor(userId);
    if (draft) socket.emit('arena:draft', this.draftView(draft, userId));
    socket.emit('queue:status', this.queueView(userId));
    socket.emit('arena:friends', { friends: await this.friendsFor(userId) });
    void this.broadcastFriends();
  }

  private async greet(socket: Socket, userId: string) {
    socket.emit('queue:status', this.queueView(userId));
    socket.emit('arena:friends', { friends: await this.friendsFor(userId) });
    const draft = this.draftFor(userId);
    if (draft) socket.emit('arena:draft', this.draftView(draft, userId));
  }

  /** True while this account is inside a live duel or a ranked draft. */
  busy(userId: string): boolean {
    return this.roomFor(userId)?.status === 'active' || Boolean(this.draftFor(userId));
  }

  /** Extra reason to refuse the matchmaking queue, such as a dungeon raid. */
  blockQueue(check: (userId: string) => boolean) {
    this.queueBlocked = check;
  }

  private queueBlocked: (userId: string) => boolean = () => false;

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
    this.openRoom(left, right, { ranked: false });
    return true;
  }

  private async joinQueue(socket: Socket) {
    const user = await this.store.findUserById(socket.data.userId as string);
    if (!user) {
      socket.emit('battle:error', { message: 'Phiên đăng nhập không còn hiệu lực.' });
      return;
    }
    if (this.draftFor(user.id)) {
      socket.emit('arena:draft', this.draftView(this.draftFor(user.id)!, user.id));
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

    if (this.queueBlocked(user.id)) {
      socket.emit('battle:error', { message: 'Bạn đang trong hầm ngục.' });
      return;
    }
    const character = await this.store.findCharacterByUserId(user.id);
    if (!character) {
      socket.emit('battle:error', { message: 'Hãy tạo nhân vật trước khi tìm trận.' });
      return;
    }
    socket.data.character = character;
    const rank = normalizeRank(character.stats);

    const already = this.queue.find((entry) => entry.userId === user.id);
    if (already) {
      already.socketId = socket.id;
      already.mmr = rank.mmr;
      already.rankIndex = rank.rankIndex;
      already.stars = rank.stars;
      already.disconnectedAt = undefined;
      already.lastWaitSec = already.lastWaitSec ?? 0;
      if (!already.aiAfter) already.aiAfter = already.joinedAt + randomFallbackMs();
    } else {
      const joinedAt = Date.now();
      this.queue.push({
        userId: user.id,
        socketId: socket.id,
        mmr: rank.mmr,
        rankIndex: rank.rankIndex,
        stars: rank.stars,
        joinedAt,
        aiAfter: joinedAt + randomFallbackMs(),
        lastWaitSec: 0,
      });
    }
    socket.emit('queue:status', this.queueView(user.id));
    socket.emit('arena:friends', { friends: await this.friendsFor(user.id) });
    await this.matchSearch();
  }

  private pulseQueue() {
    for (const entry of this.queue) {
      this.socketFor(entry.userId)?.emit('queue:status', this.queueView(entry.userId));
    }
  }

  private async matchSearch() {
    if (this.matching) return;
    this.matching = true;
    try {
      this.pulseQueue();
      const now = Date.now();
      const waiting = [...this.queue];
      const claimed = new Set<string>();
      for (const entry of waiting) {
        if (claimed.has(entry.userId)) continue;
        if (!this.queue.some((row) => row.userId === entry.userId)) continue;
        const wait = now - entry.joinedAt;
        const partner = waiting.find((other) => {
          if (other.userId === entry.userId || claimed.has(other.userId)) return false;
          const band = mmrBand(Math.max(wait, now - other.joinedAt));
          return mmrClose(entry.mmr, other.mmr, band);
        });
        if (partner) {
          claimed.add(entry.userId);
          claimed.add(partner.userId);
          this.leaveQueue(entry.userId);
          this.leaveQueue(partner.userId);
          const opened = await this.openRankedPair(entry, partner);
          if (!opened) {
            this.requeue(entry);
            this.requeue(partner);
          }
          continue;
        }
        if (wait >= HUMAN_ONLY_MS && now >= (entry.aiAfter || entry.joinedAt + AI_FALLBACK_MAX_MS)) {
          claimed.add(entry.userId);
          this.leaveQueue(entry.userId);
          const opened = await this.openStandInMatch(entry);
          if (!opened) this.requeue(entry, false);
        }
      }
    } finally {
      this.matching = false;
    }
  }

  private requeue(entry: QueuedPlayer, resetWait = true) {
    if (this.queue.some((row) => row.userId === entry.userId)) return;
    if (this.busy(entry.userId)) return;
    const joinedAt = resetWait ? Date.now() : entry.joinedAt;
    this.queue.push({
      ...entry,
      joinedAt,
      aiAfter: resetWait ? joinedAt + randomFallbackMs() : entry.aiAfter,
      lastWaitSec: resetWait ? 0 : entry.lastWaitSec,
      disconnectedAt: undefined,
    });
  }

  private async openRankedPair(first: QueuedPlayer, second: QueuedPlayer): Promise<boolean> {
    const left = await this.fighterFromId(first.userId);
    const right = await this.fighterFromId(second.userId);
    if (!left || !right) return false;
    const leftRoster = await this.rosterFor(first.userId);
    const rightRoster = await this.rosterFor(second.userId);
    this.openDraft({
      left,
      right,
      leftRoster,
      rightRoster,
      leftRank: { rankIndex: first.rankIndex, stars: first.stars },
      rightRank: { rankIndex: second.rankIndex, stars: second.stars },
      series: { bout: 1, bouts: { [left.userId]: 0, [right.userId]: 0 } },
    });
    return true;
  }

  private async openStandInMatch(entry: QueuedPlayer): Promise<boolean> {
    const left = await this.fighterFromId(entry.userId);
    if (!left) return false;
    const standIn = await this.pickStandInAccount(entry);
    if (!standIn) return false;
    const leftRoster = await this.rosterFor(entry.userId);
    this.openDraft({
      left,
      right: standIn.fighter,
      leftRoster,
      rightRoster: standIn.roster,
      leftRank: { rankIndex: entry.rankIndex, stars: entry.stars },
      rightRank: standIn.rank,
      series: { bout: 1, bouts: { [left.userId]: 0, [standIn.fighter.userId]: 0 } },
    });
    return true;
  }

  /**
   * After 12s, play as a real registered account under Smart AI. Never
   * invent a dummy name. The live owner is not kicked; fighter id is `ai:<userId>`.
   */
  private async pickStandInAccount(entry: QueuedPlayer): Promise<{
    fighter: Fighter;
    roster: DraftPetView[];
    rank: { rankIndex: number; stars: number };
  } | null> {
    const cards = await this.store.listPlayerCards(500);
    const blocked = new Set(this.queue.map((row) => row.userId));
    blocked.add(entry.userId);
    const pool = cards.filter((card) => card.userId !== entry.userId && !blocked.has(card.userId) && !this.busy(card.userId));
    if (pool.length === 0) return null;
    const offline = pool.filter((card) => !this.userSocket.has(card.userId));
    const ranked = (offline.length > 0 ? offline : pool)
      .slice()
      .sort((left, right) => Math.abs(left.mmr - entry.mmr) - Math.abs(right.mmr - entry.mmr));
    let fallback: { fighter: Fighter; roster: DraftPetView[]; rank: { rankIndex: number; stars: number } } | null = null;
    for (const pick of ranked.slice(0, 24)) {
      const user = await this.store.findUserById(pick.userId);
      const character = await this.store.findCharacterByUserId(pick.userId);
      if (!user || !character) continue;
      const fighter = toFighter(user, character);
      fighter.userId = `ai:${pick.userId}`;
      const roster = await this.rosterFor(pick.userId);
      const standIn = {
        fighter,
        roster,
        rank: { rankIndex: pick.rankIndex, stars: pick.stars },
      };
      if (roster.length > 0) return standIn;
      fallback ??= standIn;
    }
    return fallback;
  }

  private async rosterFor(userId: string): Promise<DraftPetView[]> {
    const save = await this.store.findAdventure(realAccountId(userId));
    return petsFromSave(save);
  }

  private openDraft(input: {
    left: Fighter;
    right: Fighter;
    leftRoster: DraftPetView[];
    rightRoster: DraftPetView[];
    leftRank: { rankIndex: number; stars: number };
    rightRank: { rankIndex: number; stars: number };
    series: SeriesState;
  }) {
    const draft: Draft = {
      id: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      deadline: Date.now() + PICK_MS,
      phase: 'pick',
      resolving: false,
      left: input.left,
      right: input.right,
      leftRoster: input.leftRoster,
      rightRoster: input.rightRoster,
      leftRank: input.leftRank,
      rightRank: input.rightRank,
      series: input.series,
      disconnectedAt: {},
      picks: {
        [input.left.userId]: emptyChoice(),
        [input.right.userId]: emptyChoice(),
      },
    };
    this.drafts.set(draft.id, draft);
    if (!isSynthetic(input.left.userId)) this.userDraft.set(input.left.userId, draft.id);
    if (!isSynthetic(input.right.userId)) this.userDraft.set(input.right.userId, draft.id);
    for (const fighter of [input.left, input.right]) {
      if (isSynthetic(fighter.userId)) this.applyAiPick(draft, fighter.userId);
    }
    this.emitDraft(draft);
  }

  private applyAiPick(draft: Draft, botId: string) {
    const own = draft.left.userId === botId ? draft.leftRoster : draft.rightRoster;
    const current = draft.picks[botId] ?? emptyChoice();
    draft.picks[botId] = { ...current, petIds: pickSquad(own, 4), pickReady: true };
  }

  private applyAiBan(draft: Draft, botId: string) {
    const foe = lockedPets(draft, draft.left.userId === botId ? 'right' : 'left');
    const current = draft.picks[botId] ?? emptyChoice();
    draft.picks[botId] = { ...current, banId: banTarget(foe), banReady: true };
  }

  private async onDraftReady(socket: Socket, userId: string, payload: unknown) {
    const draft = this.draftFor(userId);
    if (!draft || draft.resolving) {
      socket.emit('battle:error', { message: 'Không có cửa sổ chọn tướng.' });
      return;
    }
    const body = payload && typeof payload === 'object' ? (payload as { matchId?: unknown; petIds?: unknown; banId?: unknown }) : {};
    if (typeof body.matchId === 'string' && body.matchId !== draft.id) {
      socket.emit('battle:error', { message: 'Cửa sổ chọn tướng đã đổi.' });
      return;
    }
    const own = draft.left.userId === userId ? draft.leftRoster : draft.rightRoster;
    const current = draft.picks[userId] ?? emptyChoice();
    if (draft.phase === 'pick') {
      const petIds = Array.isArray(body.petIds)
        ? body.petIds.filter((id): id is string => typeof id === 'string' && own.some((pet) => pet.id === id)).slice(0, 4)
        : current.petIds;
      draft.picks[userId] = { ...current, petIds: petIds.length > 0 ? petIds : pickSquad(own, 4), pickReady: true };
      this.emitDraft(draft);
      if (this.pickLocked(draft)) this.enterBanPhase(draft);
      return;
    }
    const foePets = lockedPets(draft, draft.left.userId === userId ? 'right' : 'left');
    const banId = typeof body.banId === 'string' && foePets.some((pet) => pet.id === body.banId) ? body.banId : current.banId;
    draft.picks[userId] = { ...current, banId: banId ?? banTarget(foePets), banReady: true };
    this.emitDraft(draft);
    if (this.banLocked(draft)) await this.beginDraft(draft);
  }

  private pickLocked(draft: Draft): boolean {
    return this.humansOf(draft).every((fighter) => draft.picks[fighter.userId]?.pickReady);
  }

  private banLocked(draft: Draft): boolean {
    return this.humansOf(draft).every((fighter) => draft.picks[fighter.userId]?.banReady);
  }

  private humansOf(draft: Draft): Fighter[] {
    return [draft.left, draft.right].filter((fighter) => !isSynthetic(fighter.userId));
  }

  private enterBanPhase(draft: Draft) {
    if (draft.phase === 'ban' || draft.resolving) return;
    this.fillPicks(draft);
    draft.phase = 'ban';
    draft.deadline = Date.now() + BAN_MS;
    for (const fighter of [draft.left, draft.right]) {
      if (isSynthetic(fighter.userId)) this.applyAiBan(draft, fighter.userId);
    }
    this.emitDraft(draft);
    if (this.banLocked(draft)) void this.beginDraft(draft);
  }

  private fillPicks(draft: Draft) {
    for (const side of ['left', 'right'] as const) {
      const ownerId = side === 'left' ? draft.left.userId : draft.right.userId;
      const roster = side === 'left' ? draft.leftRoster : draft.rightRoster;
      const current = draft.picks[ownerId] ?? emptyChoice();
      const valid = current.petIds.filter((id) => roster.some((pet) => pet.id === id)).slice(0, 4);
      draft.picks[ownerId] = { ...current, petIds: valid.length > 0 ? valid : pickSquad(roster, 4), pickReady: true };
    }
  }

  private fillBans(draft: Draft) {
    for (const side of ['left', 'right'] as const) {
      const ownerId = side === 'left' ? draft.left.userId : draft.right.userId;
      const foePets = lockedPets(draft, side === 'left' ? 'right' : 'left');
      const current = draft.picks[ownerId] ?? emptyChoice();
      const banId = current.banId && foePets.some((pet) => pet.id === current.banId) ? current.banId : banTarget(foePets);
      draft.picks[ownerId] = { ...current, banId, banReady: true };
    }
  }

  private async beginDraft(draft: Draft) {
    if (draft.resolving || !this.drafts.has(draft.id)) return;
    draft.resolving = true;
    this.fillPicks(draft);
    this.fillBans(draft);
    draft.left.pets = resolveSide(draft, 'left');
    draft.right.pets = resolveSide(draft, 'right');
    this.clearDraft(draft);
    this.openRoom(draft.left, draft.right, {
      ranked: true,
      bout: draft.series.bout,
      bouts: draft.series.bouts,
      leftRoster: draft.leftRoster,
      rightRoster: draft.rightRoster,
      leftRank: draft.leftRank,
      rightRank: draft.rightRank,
    });
  }

  private emitDraft(draft: Draft) {
    for (const fighter of [draft.left, draft.right]) {
      if (isSynthetic(fighter.userId)) continue;
      this.socketFor(fighter.userId)?.emit('arena:draft', this.draftView(draft, fighter.userId));
    }
  }

  private draftView(draft: Draft, userId: string): ArenaDraftView {
    const youLeft = draft.left.userId === userId;
    const you = youLeft ? draft.left : draft.right;
    const opponent = youLeft ? draft.right : draft.left;
    const youRank = youLeft ? draft.leftRank : draft.rightRank;
    const oppRank = youLeft ? draft.rightRank : draft.leftRank;
    const youPets = youLeft ? draft.leftRoster : draft.rightRoster;
    const oppPets = draft.phase === 'ban' ? lockedPets(draft, youLeft ? 'right' : 'left') : [];
    const youReady = draft.phase === 'ban' ? Boolean(draft.picks[userId]?.banReady) : Boolean(draft.picks[userId]?.pickReady);
    const oppReady = draft.phase === 'ban' ? Boolean(draft.picks[opponent.userId]?.banReady) : Boolean(draft.picks[opponent.userId]?.pickReady);
    return {
      matchId: draft.id,
      deadline: draft.deadline,
      phase: draft.phase,
      you: toDraftFighter(you, draft.phase === 'ban' ? lockedPets(draft, youLeft ? 'left' : 'right') : youPets, youRank),
      opponent: toDraftFighter(opponent, oppPets, oppRank),
      confirmed: youReady,
      opponentReady: oppReady,
      bout: draft.series.bout,
      boutScore: {
        you: draft.series.bouts[userId] ?? 0,
        opponent: draft.series.bouts[opponent.userId] ?? 0,
      },
    };
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

  private openRoom(
    left: Fighter,
    right: Fighter,
    options: {
      ranked: boolean;
      bout?: number;
      bouts?: Record<string, number>;
      leftRoster?: DraftPetView[];
      rightRoster?: DraftPetView[];
      leftRank?: { rankIndex: number; stars: number };
      rightRank?: { rankIndex: number; stars: number };
    },
  ) {
    const units = [...unitsFor(left), ...unitsFor(right)];
    const order = duelOrder(units, 1);
    const turnId = order[0] ?? left.userId;
    const actor = units.find((unit) => unit.id === turnId);
    const bout = options.bout ?? 1;
    const bouts = options.bouts ?? { [left.userId]: 0, [right.userId]: 0 };
    const room: Room = {
      id: `duel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      round: 1,
      deadline: Date.now() + TURN_MS,
      status: 'active',
      resolving: false,
      winnerId: null,
      log: options.ranked
        ? [`${left.name} gặp ${right.name}. Hiệp ${bout}/3 · ${bouts[left.userId] ?? 0}-${bouts[right.userId] ?? 0}.`, `Tới lượt ${actor?.name ?? left.name}.`]
        : [`${left.name} gặp ${right.name}.`, `Tới lượt ${actor?.name ?? left.name}.`],
      lastHit: null,
      fighters: [left, right],
      units,
      order,
      turnId,
      disconnectedAt: {},
      ranked: options.ranked,
      bout,
      bouts,
      rankedResults: {},
      leftRoster: options.leftRoster ?? [],
      rightRoster: options.rightRoster ?? [],
      leftRank: options.leftRank ?? { rankIndex: 0, stars: 0 },
      rightRank: options.rightRank ?? { rankIndex: 0, stars: 0 },
    };
    this.rooms.set(room.id, room);
    if (!isSynthetic(left.userId)) this.userRoom.set(left.userId, room.id);
    if (!isSynthetic(right.userId)) this.userRoom.set(right.userId, room.id);
    for (const fighter of room.fighters) {
      if (isSynthetic(fighter.userId)) continue;
      const socket = this.socketFor(fighter.userId);
      socket?.join(room.id);
      socket?.emit('queue:status', { state: 'idle', position: 0 });
      socket?.emit('arena:draft_clear', { matchId: room.id });
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
    this.dropStaleQueue(now);
    this.dropStaleDrafts(now);
    this.pulseQueue();
    await this.matchSearch();
    for (const draft of [...this.drafts.values()]) {
      if (draft.resolving || now < draft.deadline) continue;
      if (draft.phase === 'pick') this.enterBanPhase(draft);
      else await this.beginDraft(draft);
    }
    for (const room of this.rooms.values()) {
      if (room.status !== 'active') {
        if (room.status === 'finished' && now - (room.deadline ?? now) > 120_000) {
          this.destroyRoom(room);
        }
        continue;
      }
      const dropped = room.fighters.find((fighter) => {
        if (isSynthetic(fighter.userId)) return false;
        const since = room.disconnectedAt[fighter.userId];
        return since !== undefined && now - since > DISCONNECT_GRACE_MS;
      });
      if (dropped) {
        const winner = room.fighters.find((fighter) => fighter.userId !== dropped.userId);
        room.log.push(`${dropped.name} mất kết nối.`);
        await this.finish(room, winner?.userId ?? null);
        continue;
      }
      const actor = room.units.find((unit) => unit.id === room.turnId);
      if (actor && isSynthetic(actor.ownerId) && !room.resolving) {
        const elapsed = TURN_MS - (room.deadline - now);
        if (elapsed >= BOT_THINK_MS) {
          const foes = room.units.filter((unit) => unit.ownerId !== actor.ownerId && unit.hp > 0);
          const choice = decideTurn(actor, foes);
          await this.playTurn(room, choice.action, choice.skill, choice.targetId || undefined);
          continue;
        }
      }
      if (now >= room.deadline && !room.resolving) {
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
    if (actor.staggered) {
      actor.staggered = false;
      room.log.push(`${actor.name} gục ngã và bỏ lượt (−50% DEF hết).`);
      this.advance(room);
      room.resolving = false;
      this.emitRoom(room);
      return;
    }
    const foes = room.units.filter((unit) => unit.ownerId !== actor.ownerId && unit.hp > 0);
    const target = foes.find((unit) => unit.id === targetId) ?? foes[0];
    if (!target) {
      await this.closeBout(room, actor.ownerId);
      return;
    }
    // Tick this actor's skill cooldowns at the start of their action.
    for (const [id, value] of Object.entries(actor.cooldowns ?? {})) {
      actor.cooldowns[id] = Math.max(0, value - 1);
    }
    const skill = action === 'skill' ? actor.skills[skillIndex] ?? actor.skills[0] : null;
    if (skill && action === 'skill') {
      const wait = actor.cooldowns[skill.id] ?? 0;
      if (wait > 0) {
        room.log.push(`${actor.name} không thể dùng ${skill.name} (CD ${wait}).`);
        this.advance(room);
        room.resolving = false;
        this.emitRoom(room);
        return;
      }
      if (actor.mp < (skill.mana || 0)) {
        room.log.push(`${actor.name} thiếu mana cho ${skill.name}.`);
        this.advance(room);
        room.resolving = false;
        this.emitRoom(room);
        return;
      }
      actor.mp = Math.max(0, actor.mp - (skill.mana || 0));
      if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown;
    }
    const result = strike(
      {
        name: actor.name,
        attack: actor.attack,
        defense: actor.defense,
        level: actor.level,
        armPen: actor.armPen,
        res: actor.res,
        critRate: actor.critRate,
        critDamage: actor.critDamage,
        eva: actor.eva,
        acc: actor.acc,
        tgh: actor.tgh,
        maxTgh: actor.maxTgh,
        staggered: actor.staggered,
      },
      {
        name: target.name,
        attack: target.attack,
        defense: target.defense,
        level: target.level,
        armPen: target.armPen,
        res: target.res,
        critRate: target.critRate,
        critDamage: target.critDamage,
        eva: target.eva,
        acc: target.acc,
        tgh: target.tgh,
        maxTgh: target.maxTgh,
        staggered: target.staggered,
      },
      action,
      'attack',
      Math.random,
      skill ? { power: skill.power, skillName: skill.name } : undefined,
    );
    target.hp = Math.max(0, target.hp - (result.damage || 0));
    target.tgh = result.tgh;
    target.maxTgh = result.maxTgh;
    if (result.staggered) target.staggered = true;
    room.log.push(result.text);
    room.lastHit = {
      attackerId: actor.id,
      targetId: target.id,
      damage: result.damage || 0,
      crit: Boolean(result.crit),
      miss: Boolean(result.miss || result.dodged),
      skillName: skill?.name,
    };

    const owners = [...new Set(room.units.map((unit) => unit.ownerId))];
    const livingOwners = owners.filter((id) => room.units.some((unit) => unit.ownerId === id && unit.hp > 0));
    if (livingOwners.length < 2) {
      await this.closeBout(room, livingOwners[0] ?? null);
      return;
    }
    this.advance(room);
    room.resolving = false;
    this.emitRoom(room);
  }

  private async closeBout(room: Room, winnerId: string | null) {
    if (!room.ranked) {
      await this.finish(room, winnerId);
      return;
    }
    if (!winnerId) {
      await this.finish(room, null);
      return;
    }
    room.bouts[winnerId] = (room.bouts[winnerId] ?? 0) + 1;
    const winner = room.fighters.find((fighter) => fighter.userId === winnerId);
    room.log.push(`${winner?.name ?? 'Người chơi'} thắng hiệp ${room.bout}. Tỷ số ${scoreLine(room)}.`);
    if ((room.bouts[winnerId] ?? 0) >= 2 || room.bout >= 3) {
      await this.finish(room, winnerId);
      return;
    }
    room.resolving = true;
    this.destroyRoom(room);
    await this.openNextBoutDraft(room);
  }

  private async openNextBoutDraft(room: Room) {
    const [left, right] = room.fighters;
    const series: SeriesState = {
      bout: room.bout + 1,
      bouts: { ...room.bouts },
    };
    let leftRoster = room.leftRoster;
    let rightRoster = room.rightRoster;
    try {
      const [freshLeft, freshRight] = await Promise.all([
        this.rosterFor(realAccountId(left.userId)),
        this.rosterFor(realAccountId(right.userId)),
      ]);
      if (freshLeft.length > 0) leftRoster = freshLeft;
      if (freshRight.length > 0) rightRoster = freshRight;
    } catch (error) {
      console.warn('[arena] next-bout roster refresh failed, keeping the locked series rosters', error);
    }
    this.openDraft({
      left: { ...left, pets: [] },
      right: { ...right, pets: [] },
      leftRoster,
      rightRoster,
      leftRank: room.leftRank,
      rightRank: room.rightRank,
      series,
    });
  }

  /** Next living unit in this round, or a fresh speed order when the round ends. */
  private advance(room: Room) {
    const take = (unit: CombatUnit, preface?: string) => {
      if (unit.staggered) {
        unit.staggered = false;
        room.log.push(`${preface ? `${preface} ` : ''}${unit.name} gục ngã và bỏ lượt (−50% DEF hết).`);
        return false;
      }
      room.turnId = unit.id;
      room.deadline = Date.now() + TURN_MS;
      room.log.push(`${preface ? `${preface} ` : ''}Tới lượt ${unit.name}.`);
      return true;
    };
    const start = room.order.indexOf(room.turnId);
    for (let step = start + 1; step < room.order.length; step += 1) {
      const unit = room.units.find((entry) => entry.id === room.order[step]);
      if (!unit || unit.hp <= 0) continue;
      if (take(unit)) return;
    }
    room.round += 1;
    room.order = duelOrder(room.units, room.round);
    for (const id of room.order) {
      const unit = room.units.find((entry) => entry.id === id);
      if (!unit || unit.hp <= 0) continue;
      if (take(unit, `Hiệp ${room.round}.`)) return;
    }
    room.turnId = room.order[0] ?? room.turnId;
    room.deadline = Date.now() + TURN_MS;
  }

  private async finish(room: Room, winnerId: string | null) {
    if (room.status === 'finished') return;
    room.status = 'finished';
    room.winnerId = winnerId;
    room.deadline = Date.now();
    const [left, right] = room.fighters;
    if (!winnerId) {
      room.log.push('Hai bên cùng ngã. Trận hòa.');
      room.rankedResults[left.userId] = await this.recordOutcome(left.userId, 'draw', right.name, room.ranked);
      room.rankedResults[right.userId] = await this.recordOutcome(right.userId, 'draw', left.name, room.ranked);
    } else {
      const winner = room.fighters.find((fighter) => fighter.userId === winnerId);
      const loser = room.fighters.find((fighter) => fighter.userId !== winnerId);
      room.log.push(`${winner?.name ?? 'Người chơi'} thắng trận.`);
      room.rankedResults[winnerId] = await this.recordOutcome(winnerId, 'win', loser?.name ?? 'Đối thủ', room.ranked);
      if (loser) room.rankedResults[loser.userId] = await this.recordOutcome(loser.userId, 'loss', winner?.name ?? 'Đối thủ', room.ranked);
      const winRank = room.rankedResults[winnerId];
      if (winRank && room.ranked && !isSynthetic(winnerId)) {
        room.log.push(`+1 sao · ${rankTitle(winRank.rankIndex)} ${winRank.stars}/5.`);
      }
    }
    this.emitRoom(room);
  }

  private async recordOutcome(userId: string, outcome: 'win' | 'loss' | 'draw', opponent: string, ranked: boolean): Promise<RankedResult> {
    const empty: RankedResult = { stars: 0, rankIndex: 0, mmr: 1000, starDelta: 0, wins: 0, losses: 0, history: [] };
    if (isSynthetic(userId)) return empty;
    const character = await this.store.findCharacterByUserId(userId);
    if (!character) return empty;
    const wins = character.stats.wins + (outcome === 'win' ? 1 : 0);
    const losses = character.stats.losses + (outcome === 'loss' ? 1 : 0);
    let stats = statsForRecord(wins, losses, character.stats);
    const before = normalizeRank(stats);
    const starDelta = ranked && outcome === 'win' ? 1 : ranked && outcome === 'loss' ? -1 : 0;
    if (ranked && outcome !== 'draw') {
      stats = { ...stats, ...applyStarResult(before, outcome) };
    }
    const after = normalizeRank(stats);
    stats.stars = after.stars;
    stats.rankIndex = after.rankIndex;
    stats.mmr = after.mmr;
    const entry: MatchHistoryEntry = {
      at: new Date().toISOString(),
      outcome,
      opponent,
      starDelta,
      stars: stats.stars,
      rankIndex: stats.rankIndex,
    };
    stats.matchHistory = [entry, ...(character.stats.matchHistory ?? [])].slice(0, 20);
    await this.store.setCharacterStats(userId, stats);
    const verify = await this.store.findCharacterByUserId(userId);
    if (verify && (verify.stats.stars !== stats.stars || verify.stats.rankIndex !== stats.rankIndex)) {
      await this.store.setCharacterStats(userId, { ...verify.stats, ...stats });
    }
    const persisted = (await this.store.findCharacterByUserId(userId))?.stats ?? stats;
    const result: RankedResult = {
      stars: persisted.stars,
      rankIndex: persisted.rankIndex,
      mmr: persisted.mmr,
      starDelta,
      wins: persisted.wins,
      losses: persisted.losses,
      history: persisted.matchHistory ?? stats.matchHistory,
    };
    this.pushRank(userId, {
      stars: result.stars,
      rankIndex: result.rankIndex,
      mmr: result.mmr,
      starDelta: result.starDelta,
      wins: result.wins,
      losses: result.losses,
      outcome,
      opponent,
      history: result.history,
    });
    return result;
  }

  private pushRank(userId: string, payload: ArenaRankView) {
    this.socketFor(userId)?.emit('arena:rank', payload);
  }

  private emitRoom(room: Room) {
    for (const fighter of room.fighters) {
      if (isSynthetic(fighter.userId)) continue;
      this.socketFor(fighter.userId)?.emit('battle:update', this.view(room, fighter.userId));
    }
  }

  private view(room: Room, userId: string): BattleView {
    const you = room.fighters.find((fighter) => fighter.userId === userId) ?? room.fighters[0];
    const opponent = room.fighters.find((fighter) => fighter.userId !== you.userId) ?? room.fighters[1];
    const actor = room.units.find((unit) => unit.id === room.turnId);
    const yourTurn = room.status === 'active' && actor?.ownerId === userId;
    const skillSource = (yourTurn ? actor : room.units.find((unit) => unit.id === you.userId)) ?? actor;
    const result = room.rankedResults[userId];
    const starDelta = result?.starDelta ?? (room.ranked && room.status === 'finished' && room.winnerId ? (room.winnerId === userId ? 1 : -1) : undefined);
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
      lastHit: room.lastHit,
      yourTurn,
      ranked: room.ranked,
      bout: room.bout,
      boutScore: {
        you: room.bouts[you.userId] ?? 0,
        opponent: room.bouts[opponent.userId] ?? 0,
      },
      starDelta,
      rank: result
        ? { stars: result.stars, rankIndex: result.rankIndex, starDelta: result.starDelta, wins: result.wins, losses: result.losses, mmr: result.mmr }
        : undefined,
      history: result?.history,
    };
  }

  private dropStaleQueue(now: number) {
    for (const entry of [...this.queue]) {
      const since = entry.disconnectedAt;
      if (since !== undefined && now - since > DISCONNECT_GRACE_MS) this.leaveQueue(entry.userId);
    }
  }

  private dropStaleDrafts(now: number) {
    for (const draft of [...this.drafts.values()]) {
      const dropped = this.humansOf(draft).find((fighter) => {
        const since = draft.disconnectedAt[fighter.userId];
        return since !== undefined && now - since > DISCONNECT_GRACE_MS;
      });
      if (dropped) this.cancelDraftFor(dropped.userId, 'Đối thủ mất kết nối.');
    }
  }

  private queueView(userId: string): QueueView {
    const index = this.queue.findIndex((entry) => entry.userId === userId);
    if (index < 0) return { state: 'idle', position: 0 };
    const entry = this.queue[index];
    const searchingFor = Date.now() - entry.joinedAt;
    const waitSec = Math.max(entry.lastWaitSec ?? 0, Math.floor(searchingFor / 1000));
    entry.lastWaitSec = waitSec;
    return {
      state: 'queued',
      position: index + 1,
      searchingFor,
      waitSec,
      band: mmrBand(searchingFor),
      rankIndex: entry.rankIndex,
      stars: entry.stars,
      mmr: entry.mmr,
    };
  }

  private async friendsFor(userId: string): Promise<ArenaFriendView[]> {
    const cards = await this.store.listPlayerCards(30);
    const online = new Set(this.userSocket.keys());
    return cards
      .filter((card) => card.userId !== userId)
      .map((card) => ({ ...card, online: online.has(card.userId) }))
      .sort((left, right) => {
        if (left.online !== right.online) return left.online ? -1 : 1;
        return left.name.localeCompare(right.name, 'vi');
      });
  }

  private async broadcastFriends() {
    const ids = [...this.userSocket.keys()];
    await Promise.all(
      ids.map(async (userId) => {
        const socket = this.socketFor(userId);
        if (!socket) return;
        socket.emit('arena:friends', { friends: await this.friendsFor(userId) });
      }),
    );
  }

  private roomFor(userId: string): Room | undefined {
    const roomId = this.userRoom.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  private draftFor(userId: string): Draft | undefined {
    const draftId = this.userDraft.get(userId);
    return draftId ? this.drafts.get(draftId) : undefined;
  }

  private socketFor(userId: string): Socket | undefined {
    const socketId = this.userSocket.get(userId);
    return socketId ? this.io.sockets.sockets.get(socketId) : undefined;
  }

  private leaveQueue(userId: string) {
    const index = this.queue.findIndex((entry) => entry.userId === userId);
    if (index >= 0) this.queue.splice(index, 1);
  }

  private cancelDraftFor(userId: string, message: string) {
    const draft = this.draftFor(userId);
    if (!draft) return;
    const played = draft.series.bout > 1 || Object.values(draft.series.bouts).some((wins) => wins > 0);
    const winner = draft.left.userId === userId ? draft.right : draft.left;
    this.clearDraft(draft);
    for (const fighter of [draft.left, draft.right]) {
      if (isSynthetic(fighter.userId)) continue;
      const socket = this.socketFor(fighter.userId);
      socket?.emit('arena:draft_cancel', { message });
      socket?.emit('arena:draft_clear', { matchId: draft.id });
      socket?.emit('queue:status', { state: 'idle', position: 0 });
    }
    if (played) void this.settleDraftForfeit(draft, winner.userId);
  }

  private async settleDraftForfeit(draft: Draft, winnerId: string) {
    const [left, right] = [draft.left, draft.right];
    const units = [...unitsFor(left), ...unitsFor(right)];
    const room: Room = {
      id: `duel-forfeit-${Date.now().toString(36)}`,
      round: 1,
      deadline: Date.now(),
      status: 'active',
      resolving: false,
      winnerId: null,
      log: ['Đối thủ rời cửa sổ chọn tướng. Hiệp đấu kết thúc.'],
      lastHit: null,
      fighters: [left, right],
      units,
      order: units.map((unit) => unit.id),
      turnId: units[0]?.id ?? left.userId,
      disconnectedAt: {},
      ranked: true,
      bout: draft.series.bout,
      bouts: { ...draft.series.bouts },
      rankedResults: {},
      leftRoster: draft.leftRoster,
      rightRoster: draft.rightRoster,
      leftRank: draft.leftRank,
      rightRank: draft.rightRank,
    };
    this.rooms.set(room.id, room);
    if (!isSynthetic(left.userId)) this.userRoom.set(left.userId, room.id);
    if (!isSynthetic(right.userId)) this.userRoom.set(right.userId, room.id);
    await this.finish(room, winnerId);
  }

  private clearDraft(draft: Draft) {
    this.drafts.delete(draft.id);
    for (const fighter of [draft.left, draft.right]) {
      if (this.userDraft.get(fighter.userId) === draft.id) this.userDraft.delete(fighter.userId);
    }
  }

  private closeRoomFor(userId: string) {
    const room = this.roomFor(userId);
    if (!room) return;
    this.userRoom.delete(userId);
    const other = room.fighters.find((fighter) => fighter.userId !== userId);
    if (!other || isSynthetic(other.userId) || !this.userRoom.has(other.userId)) {
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

function petsFromSave(save: GameSave | null): DraftPetView[] {
  if (!save) return [];
  return save.roster
    .filter((pet) => pet.maxHp > 0)
    .slice(0, 8)
    .map((pet) => ({
      id: pet.id,
      name: pet.name,
      kindId: pet.kindId,
      level: pet.level,
      hp: pet.maxHp,
      maxHp: pet.maxHp,
    }));
}

function emptyChoice(): DraftChoice {
  return { petIds: [], banId: null, pickReady: false, banReady: false };
}

function lockedPets(draft: Draft, side: 'left' | 'right'): DraftPetView[] {
  const roster = side === 'left' ? draft.leftRoster : draft.rightRoster;
  const ownerId = side === 'left' ? draft.left.userId : draft.right.userId;
  const wanted = (draft.picks[ownerId]?.petIds ?? []).filter((id) => roster.some((pet) => pet.id === id));
  const filled = (wanted.length > 0 ? wanted : pickSquad(roster, 4)).slice(0, 4);
  return filled.flatMap((id) => roster.filter((pet) => pet.id === id));
}

function resolveSide(draft: Draft, side: 'left' | 'right'): DuelPet[] {
  const own = side === 'left' ? draft.leftRoster : draft.rightRoster;
  const ownerId = side === 'left' ? draft.left.userId : draft.right.userId;
  const foeId = side === 'left' ? draft.right.userId : draft.left.userId;
  const wanted = (draft.picks[ownerId]?.petIds ?? []).filter((id) => own.some((pet) => pet.id === id));
  const filled = (wanted.length > 0 ? wanted : own.slice(0, 4).map((pet) => pet.id)).slice(0, 4);
  const banned = draft.picks[foeId]?.banId;
  return filled
    .filter((id) => id !== banned)
    .slice(0, 3)
    .flatMap((id) => {
      const pet = own.find((entry) => entry.id === id);
      if (!pet) return [];
      return [{ id: pet.id, name: pet.name, level: pet.level, hp: pet.hp, maxHp: pet.maxHp }];
    });
}

function toDraftFighter(fighter: Fighter, pets: DraftPetView[], rank: { rankIndex: number; stars: number }) {
  return {
    userId: fighter.userId,
    username: fighter.username,
    name: fighter.name,
    gender: fighter.gender,
    baseAvatarId: fighter.baseAvatarId,
    hairColor: fighter.hairColor,
    outfitColor: fighter.outfitColor,
    rankIndex: rank.rankIndex,
    stars: rank.stars,
    pets,
  };
}

function isSynthetic(userId: string): boolean {
  return userId.startsWith('bot:') || userId.startsWith('ghost:') || userId.startsWith('ai:');
}

function realAccountId(userId: string): string {
  return userId.startsWith('ai:') ? userId.slice(3) : userId;
}

function randomFallbackMs(): number {
  const span = AI_FALLBACK_MAX_MS - AI_FALLBACK_MIN_MS;
  return AI_FALLBACK_MIN_MS + Math.floor(Math.random() * (span + 1));
}

function scoreLine(room: Room): string {
  const [left, right] = room.fighters;
  return `${room.bouts[left.userId] ?? 0}-${room.bouts[right.userId] ?? 0}`;
}

function readClientId(socket: Socket): string {
  const value = socket.handshake.auth?.clientId;
  if (typeof value !== 'string') return '';
  const id = value.trim();
  return id ? id.slice(0, 80) : '';
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
  const heroAdv = advancedAtLevel(level, 'hero');
  const profession = professionFromAvatar(fighter.baseAvatarId);
  const [skillA, skillB] = arenaSkills(profession);
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
    skills: [skillA, skillB],
    cooldowns: {},
    tgh: heroAdv.maxTgh,
    maxTgh: heroAdv.maxTgh,
    armPen: heroAdv.armPen,
    res: heroAdv.res,
    critRate: heroAdv.critRate,
    critDamage: heroAdv.critDamage,
    eva: heroAdv.eva,
    acc: heroAdv.acc,
  };
  const pets = (fighter.pets ?? []).slice(0, 3).flatMap((pet, index) => {
    const petLevel = clampStat(pet.level, 1, 200);
    const petMax = clampStat(pet.maxHp, 1, 99999);
    const hp = clampStat(Math.min(pet.hp, petMax), 0, petMax);
    if (hp <= 0) return [];
    const petMp = Math.max(8, petLevel * 4);
    const petAdv = advancedAtLevel(petLevel, 'pet');
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
        { id: `pet-skill-1-${index}`, name: 'Kỹ năng 1', mana: 4, power: 1.35, cooldown: 1 },
        { id: `pet-skill-2-${index}`, name: 'Kỹ năng 2', mana: 6, power: 1.6, cooldown: 2 },
      ],
      cooldowns: {},
      tgh: petAdv.maxTgh,
      maxTgh: petAdv.maxTgh,
      armPen: petAdv.armPen,
      res: petAdv.res,
      critRate: petAdv.critRate,
      critDamage: petAdv.critDamage,
      eva: petAdv.eva,
      acc: petAdv.acc,
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
    tgh: unit.tgh,
    maxTgh: unit.maxTgh,
    staggered: Boolean(unit.staggered),
  };
}

function skillButtons(unit: CombatUnit | undefined): DuelSkillView[] {
  const skills = unit?.skills ?? [
    { id: 'fallback-0', name: 'Kỹ năng 1', mana: 0, power: 1, cooldown: 0 },
    { id: 'fallback-1', name: 'Kỹ năng 2', mana: 0, power: 1, cooldown: 0 },
  ];
  const cds = unit?.cooldowns ?? {};
  return [
    {
      index: 0,
      name: skills[0].name,
      mana: skills[0].mana,
      cooldown: skills[0].cooldown,
      wait: cds[skills[0].id] ?? 0,
    },
    {
      index: 1,
      name: skills[1].name,
      mana: skills[1].mana,
      cooldown: skills[1].cooldown,
      wait: cds[skills[1].id] ?? 0,
    },
  ];
}
