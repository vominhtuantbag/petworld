import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';

import { holdBattleSocket, releaseBattleSocket } from '../net/battleSocket';
import type {
  BattleView,
  DuelPet,
  GoldenHourView,
  PartyInviteView,
  PartyMemberView,
  QueueView,
  RaidBattleView,
  RaidJoin,
  RaidLobbyView,
} from '../net/protocol';
import { reportSessionReplaced } from '../net/sessionKick';
import { useAuth } from './AuthContext';
import { holdPresence } from './presenceHold';

type Connection = 'offline' | 'connecting' | 'online';

export type PvpInvite = {
  challengeId: string;
  fromUserId: string;
  fromUsername: string;
};

export type PvpOutgoing = {
  challengeId: string;
  toUserId: string;
  toUsername: string;
};

export type PvpPrep = {
  matchId: string;
  deadline: number;
  opponentUserId: string;
  opponentUsername: string;
};

type BattleContextValue = {
  connection: Connection;
  socket: Socket | null;
  queue: QueueView;
  battle: BattleView | null;
  notice: string | null;
  pvpIncoming: PvpInvite | null;
  pvpOutgoing: PvpOutgoing | null;
  prep: PvpPrep | null;
  findMatch: () => void;
  cancelMatch: () => void;
  sendAction: (action: 'attack' | 'skill', targetId: string, skill?: 0 | 1) => void;
  leaveBattle: () => void;
  sendChallenge: (toUserId: string) => void;
  acceptChallenge: (challengeId: string) => void;
  declineChallenge: (challengeId: string) => void;
  readyDuel: (pets: DuelPet[]) => void;
  goldenHour: GoldenHourView;
  raidLobby: RaidLobbyView | null;
  raid: RaidBattleView | null;
  joinRaid: (body: RaidJoin) => void;
  readyRaid: () => void;
  leaveRaid: () => void;
  sendRaidAction: (action: 'attack' | 'skill', targetId: string, skill?: 0 | 1) => void;
  sendRaidTame: (bonuses: number[]) => void;
  partyInvite: PartyInviteView | null;
  party: PartyMemberView[];
  raidCall: string | null;
  inviteParty: (toUserId: string) => void;
  acceptParty: () => void;
  declineParty: () => void;
  clearRaidCall: () => void;
};

const BattleContext = createContext<BattleContextValue | null>(null);

const IDLE_HOUR: GoldenHourView = { active: false, windowId: null, endsAt: null, message: null };

/**
 * One socket for the signed-in player. Strict Mode remounts reuse that
 * socket. Handshake retries from this tab are not treated as another device.
 * After a drop during a duel, the server sends the live room again when this
 * socket authenticates with the same account.
 */
export function BattleProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connection, setConnection] = useState<Connection>('offline');
  const [queue, setQueue] = useState<QueueView>({ state: 'idle', position: 0 });
  const [battle, setBattle] = useState<BattleView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pvpIncoming, setPvpIncoming] = useState<PvpInvite | null>(null);
  const [pvpOutgoing, setPvpOutgoing] = useState<PvpOutgoing | null>(null);
  const [prep, setPrep] = useState<PvpPrep | null>(null);
  const [goldenHour, setGoldenHour] = useState<GoldenHourView>(IDLE_HOUR);
  const [raidLobby, setRaidLobby] = useState<RaidLobbyView | null>(null);
  const [raid, setRaid] = useState<RaidBattleView | null>(null);
  const [partyInvite, setPartyInvite] = useState<PartyInviteView | null>(null);
  const [party, setParty] = useState<PartyMemberView[]>([]);
  const [raidCall, setRaidCall] = useState<string | null>(null);
  const prepRef = useRef<PvpPrep | null>(null);
  const refreshRef = useRef(auth.refreshCharacter);
  prepRef.current = prep;
  refreshRef.current = auth.refreshCharacter;

  useEffect(() => {
    if (!auth.token) {
      if (socketRef.current) {
        releaseBattleSocket(socketRef.current);
        socketRef.current = null;
      }
      setSocket(null);
      setConnection('offline');
      setQueue({ state: 'idle', position: 0 });
      setBattle(null);
      setPvpIncoming(null);
      setPvpOutgoing(null);
      setPrep(null);
      setGoldenHour(IDLE_HOUR);
      setRaidLobby(null);
      setRaid(null);
      return;
    }

    const token = auth.token;
    const socket = holdBattleSocket(token);
    let alive = true;
    socketRef.current = socket;
    setSocket(socket);
    setConnection(socket.connected ? 'online' : 'connecting');

    const onConnect = () => {
      if (!alive || socketRef.current !== socket) return;
      setConnection('online');
      setNotice(null);
      console.info(`[Game Thư Giãn] Socket connected`);
    };
    const onDisconnect = () => {
      if (!alive || socketRef.current !== socket) return;
      setConnection('connecting');
    };
    const onReplaced = () => {
      if (!alive || socketRef.current !== socket) return;
      socket.io.reconnection(false);
      socket.disconnect();
      reportSessionReplaced(token);
    };
    const onConnectError = (error: Error) => {
      if (!alive || socketRef.current !== socket) return;
      if (error.message.includes('session_replaced')) {
        socket.io.reconnection(false);
        socket.close();
        reportSessionReplaced(token);
        return;
      }
      console.warn(`[Game Thư Giãn] Socket chưa nối được. ${error.message}`);
      setConnection('connecting');
    };

    const onQueue = (next: QueueView) => setQueue(next);
    const onBattle = (next: BattleView) => {
      setBattle(next);
      setPrep(null);
      setPvpIncoming(null);
      setPvpOutgoing(null);
      setQueue({ state: 'idle', position: 0 });
      if (next.status === 'finished') void refreshRef.current();
    };
    const onBattleError = (payload: { message?: string }) => {
      setNotice(payload.message ?? 'Không thực hiện được thao tác.');
    };
    const onPvpChallenge = (next: PvpInvite) => {
      if (!next?.challengeId || !next.fromUserId) return;
      setPvpIncoming(next);
      setNotice(null);
    };
    const onPvpOutgoing = (next: PvpOutgoing) => {
      if (!next?.challengeId) return;
      setPvpOutgoing(next);
      setNotice(null);
    };
    const onPvpClosed = (payload: { message?: string }) => {
      setPvpIncoming(null);
      setPvpOutgoing(null);
      if (payload?.message) setNotice(payload.message);
    };
    const onPvpPrep = (next: PvpPrep) => {
      if (!next?.matchId || typeof next.deadline !== 'number') return;
      setPrep(next);
      setPvpIncoming(null);
      setPvpOutgoing(null);
      setNotice(null);
    };
    const onPvpError = (payload: { message?: string }) => {
      setNotice(payload.message ?? 'Không khiêu chiến được.');
    };
    const onPvpAck = () => setNotice(null);
    const onPvpStart = () => socket.emit('battle:sync');
    const onDungeonHour = (payload: GoldenHourView) => {
      if (!payload || typeof payload.active !== 'boolean') return;
      setGoldenHour({
        active: payload.active,
        windowId: payload.windowId ?? null,
        endsAt: payload.endsAt ?? null,
        message: payload.active ? payload.message ?? null : null,
      });
    };
    const onDungeonBroadcast = (payload: { message?: string; windowId?: string; endsAt?: number }) => {
      if (!payload?.windowId) return;
      setGoldenHour({
        active: true,
        windowId: payload.windowId,
        endsAt: payload.endsAt ?? null,
        message: payload.message ?? null,
      });
    };
    const onRaidLobby = (next: RaidLobbyView) => {
      if (!next?.lobbyId || !Array.isArray(next.slots)) return;
      setRaidLobby(next);
      setNotice(null);
    };
    const onRaidUpdate = (next: RaidBattleView) => {
      if (!next?.roomId) return;
      setRaid(next);
      setRaidLobby(null);
      setNotice(null);
    };
    const onRaidEvict = (payload: { message?: string }) => {
      setRaidLobby(null);
      setNotice(payload?.message ?? 'Bạn bị đưa về bản đồ.');
    };
    const onRaidError = (payload: { message?: string }) => {
      setNotice(payload?.message ?? 'Không vào được hầm ngục.');
    };
    const onPartyInvite = (next: PartyInviteView) => {
      if (!next?.fromUserId) return;
      setPartyInvite(next);
      setNotice(`${next.fromName} mời vào party hầm ngục.`);
    };
    const onPartyUpdate = (payload: { members?: PartyMemberView[] }) => {
      setParty(Array.isArray(payload?.members) ? payload.members : []);
    };
    const onPartyError = (payload: { message?: string }) => {
      setNotice(payload?.message ?? 'Không mời được party.');
    };
    const onPartyDeclined = () => {
      setNotice('Lời mời party bị từ chối.');
    };
    const onRaidCall = (payload: { zoneId?: string }) => {
      if (typeof payload?.zoneId === 'string' && payload.zoneId.length > 0) setRaidCall(payload.zoneId);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('session:replaced', onReplaced);
    socket.on('session_replaced', onReplaced);
    socket.on('connect_error', onConnectError);
    socket.on('queue:status', onQueue);
    socket.on('battle:update', onBattle);
    socket.on('battle:error', onBattleError);
    socket.on('pvp_challenge', onPvpChallenge);
    socket.on('pvp_outgoing', onPvpOutgoing);
    socket.on('pvp_challenge_closed', onPvpClosed);
    socket.on('pvp_prep', onPvpPrep);
    socket.on('pvp_error', onPvpError);
    socket.on('pvp_squad_ack', onPvpAck);
    socket.on('pvp_battle_start', onPvpStart);
    socket.on('dungeon:hour', onDungeonHour);
    socket.on('dungeon:broadcast', onDungeonBroadcast);
    socket.on('raid:lobby', onRaidLobby);
    socket.on('raid:update', onRaidUpdate);
    socket.on('raid:evict', onRaidEvict);
    socket.on('raid:error', onRaidError);
    socket.on('party:invite', onPartyInvite);
    socket.on('party:update', onPartyUpdate);
    socket.on('party:error', onPartyError);
    socket.on('party:declined', onPartyDeclined);
    socket.on('raid:party_call', onRaidCall);

    return () => {
      alive = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('session:replaced', onReplaced);
      socket.off('session_replaced', onReplaced);
      socket.off('connect_error', onConnectError);
      socket.off('queue:status', onQueue);
      socket.off('battle:update', onBattle);
      socket.off('battle:error', onBattleError);
      socket.off('pvp_challenge', onPvpChallenge);
      socket.off('pvp_outgoing', onPvpOutgoing);
      socket.off('pvp_challenge_closed', onPvpClosed);
      socket.off('pvp_prep', onPvpPrep);
      socket.off('pvp_error', onPvpError);
      socket.off('pvp_squad_ack', onPvpAck);
      socket.off('pvp_battle_start', onPvpStart);
      socket.off('dungeon:hour', onDungeonHour);
      socket.off('dungeon:broadcast', onDungeonBroadcast);
      socket.off('raid:lobby', onRaidLobby);
      socket.off('raid:update', onRaidUpdate);
      socket.off('raid:evict', onRaidEvict);
      socket.off('raid:error', onRaidError);
      socket.off('party:invite', onPartyInvite);
      socket.off('party:update', onPartyUpdate);
      socket.off('party:error', onPartyError);
      socket.off('party:declined', onPartyDeclined);
      socket.off('raid:party_call', onRaidCall);
      if (socketRef.current === socket) socketRef.current = null;
      releaseBattleSocket(socket);
    };
  }, [auth.token]);

  const findMatch = useCallback(() => {
    setNotice(null);
    socketRef.current?.emit('queue:join');
  }, []);

  const cancelMatch = useCallback(() => {
    socketRef.current?.emit('queue:leave');
  }, []);

  const sendAction = useCallback((action: 'attack' | 'skill', targetId: string, skill?: 0 | 1) => {
    socketRef.current?.emit('battle:action', { action, targetId, skill: skill ?? 0 });
  }, []);

  const leaveBattle = useCallback(() => {
    socketRef.current?.emit('battle:leave');
    setBattle(null);
  }, []);

  const sendChallenge = useCallback((toUserId: string) => {
    setNotice(null);
    socketRef.current?.emit('send_pvp_challenge', { toUserId });
  }, []);

  const acceptChallenge = useCallback((challengeId: string) => {
    setNotice(null);
    socketRef.current?.emit('accept_pvp_challenge', { challengeId });
  }, []);

  const declineChallenge = useCallback((challengeId: string) => {
    socketRef.current?.emit('decline_pvp_challenge', { challengeId });
    setPvpIncoming(null);
    setPvpOutgoing(null);
  }, []);

  const joinRaid = useCallback((body: RaidJoin) => {
    setNotice(null);
    socketRef.current?.emit('raid:join', body);
  }, []);

  const readyRaid = useCallback(() => {
    socketRef.current?.emit('raid:ready');
  }, []);

  const leaveRaid = useCallback(() => {
    socketRef.current?.emit('raid:leave');
    setRaid(null);
    setRaidLobby(null);
  }, []);

  const sendRaidAction = useCallback((action: 'attack' | 'skill', targetId: string, skill?: 0 | 1) => {
    socketRef.current?.emit('raid:action', { action, targetId, skill: skill ?? 0 });
  }, []);

  const sendRaidTame = useCallback((bonuses: number[]) => {
    socketRef.current?.emit('raid:tame', { bonuses });
  }, []);

  const inviteParty = useCallback((toUserId: string) => {
    setNotice('Đã gửi lời mời party.');
    socketRef.current?.emit('party:invite', { toUserId });
  }, []);

  const acceptParty = useCallback(() => {
    setPartyInvite(null);
    socketRef.current?.emit('party:accept');
  }, []);

  const declineParty = useCallback(() => {
    setPartyInvite(null);
    socketRef.current?.emit('party:decline');
  }, []);

  const clearRaidCall = useCallback(() => {
    setRaidCall(null);
  }, []);

  const readyDuel = useCallback((pets: DuelPet[]) => {
    const matchId = prepRef.current?.matchId;
    if (!matchId) return;
    socketRef.current?.emit('pvp_squad_ready', { matchId, pets });
  }, []);

  useEffect(() => {
    if (!prep && !battle && !raid && !raidLobby) return;
    return holdPresence();
  }, [prep, battle, raid, raidLobby]);

  useEffect(() => {
    if (!prep) return;
    const matchId = prep.matchId;
    const timer = setInterval(() => {
      if (Date.now() + 250 < prep.deadline) return;
      socketRef.current?.emit('pvp_force_begin', { matchId });
    }, 400);
    return () => clearInterval(timer);
  }, [prep]);

  const value = useMemo<BattleContextValue>(
    () => ({
      connection,
      socket,
      queue,
      battle,
      notice,
      pvpIncoming,
      pvpOutgoing,
      prep,
      findMatch,
      cancelMatch,
      sendAction,
      leaveBattle,
      sendChallenge,
      acceptChallenge,
      declineChallenge,
      readyDuel,
      goldenHour,
      raidLobby,
      raid,
      joinRaid,
      readyRaid,
      leaveRaid,
      sendRaidAction,
      sendRaidTame,
      partyInvite,
      party,
      raidCall,
      inviteParty,
      acceptParty,
      declineParty,
      clearRaidCall,
    }),
    [
      connection,
      socket,
      queue,
      battle,
      notice,
      pvpIncoming,
      pvpOutgoing,
      prep,
      findMatch,
      cancelMatch,
      sendAction,
      leaveBattle,
      sendChallenge,
      acceptChallenge,
      declineChallenge,
      readyDuel,
      goldenHour,
      raidLobby,
      raid,
      joinRaid,
      readyRaid,
      leaveRaid,
      sendRaidAction,
      sendRaidTame,
      partyInvite,
      party,
      raidCall,
      inviteParty,
      acceptParty,
      declineParty,
      clearRaidCall,
    ],
  );

  return <BattleContext.Provider value={value}>{children}</BattleContext.Provider>;
}

export function useBattle(): BattleContextValue {
  const value = useContext(BattleContext);
  if (!value) throw new Error('useBattle must be used within BattleProvider');
  return value;
}

/** The one live socket for this account. Open-world presence reuses it. */
export function useSocket(): Socket | null {
  return useBattle().socket;
}
