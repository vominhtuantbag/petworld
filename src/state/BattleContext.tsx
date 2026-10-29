import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

import { SOCKET_URL } from '../config/env';
import type { BattleView, DuelPet, GoldenHourView, QueueView, RaidBattleView, RaidJoin, RaidLobbyView } from '../net/protocol';
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
};

const BattleContext = createContext<BattleContextValue | null>(null);

const IDLE_HOUR: GoldenHourView = { active: false, windowId: null, endsAt: null, message: null };

/**
 * One socket for the signed-in player. Socket.io retries the connection on
 * its own. After a drop during a duel, the server sends the live room again
 * when this socket authenticates with the same account.
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
  const prepRef = useRef<PvpPrep | null>(null);
  prepRef.current = prep;

  useEffect(() => {
    if (!auth.token) {
      socketRef.current?.close();
      socketRef.current = null;
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

    setConnection('connecting');
    const token = auth.token;
    const socket = io(SOCKET_URL, {
      auth: { token: auth.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;
    setSocket(socket);

    socket.on('connect', () => {
      setConnection('online');
      setNotice(null);
      console.info(`[Game Thư Giãn] Socket connected ${SOCKET_URL}`);
    });
    socket.on('disconnect', () => setConnection('connecting'));
    const onReplaced = () => {
      socket.io.reconnection(false);
      socket.disconnect();
      reportSessionReplaced(token);
    };
    socket.on('session:replaced', onReplaced);
    socket.on('session_replaced', onReplaced);
    socket.on('connect_error', (error: Error) => {
      if (error.message.includes('session_replaced')) {
        socket.io.reconnection(false);
        socket.close();
        reportSessionReplaced(token);
        return;
      }
      console.warn(`[Game Thư Giãn] Socket chưa nối được ${SOCKET_URL}. ${error.message}`);
      setConnection('connecting');
    });
    socket.on('queue:status', (next: QueueView) => setQueue(next));
    socket.on('battle:update', (next: BattleView) => {
      setBattle(next);
      setPrep(null);
      setPvpIncoming(null);
      setPvpOutgoing(null);
      setQueue({ state: 'idle', position: 0 });
      if (next.status === 'finished') {
        void auth.refreshCharacter();
      }
    });
    socket.on('battle:error', (payload: { message?: string }) => {
      setNotice(payload.message ?? 'Không thực hiện được thao tác.');
    });
    socket.on('pvp_challenge', (next: PvpInvite) => {
      if (!next?.challengeId || !next.fromUserId) return;
      setPvpIncoming(next);
      setNotice(null);
    });
    socket.on('pvp_outgoing', (next: PvpOutgoing) => {
      if (!next?.challengeId) return;
      setPvpOutgoing(next);
      setNotice(null);
    });
    socket.on('pvp_challenge_closed', (payload: { message?: string }) => {
      setPvpIncoming(null);
      setPvpOutgoing(null);
      if (payload?.message) setNotice(payload.message);
    });
    socket.on('pvp_prep', (next: PvpPrep) => {
      if (!next?.matchId || typeof next.deadline !== 'number') return;
      setPrep(next);
      setPvpIncoming(null);
      setPvpOutgoing(null);
      setNotice(null);
    });
    socket.on('pvp_error', (payload: { message?: string }) => {
      setNotice(payload.message ?? 'Không khiêu chiến được.');
    });
    socket.on('pvp_squad_ack', () => {
      setNotice(null);
    });
    socket.on('pvp_battle_start', () => {
      socket.emit('battle:sync');
    });
    socket.on('dungeon:hour', (payload: GoldenHourView) => {
      if (!payload || typeof payload.active !== 'boolean') return;
      setGoldenHour({
        active: payload.active,
        windowId: payload.windowId ?? null,
        endsAt: payload.endsAt ?? null,
        message: payload.active ? payload.message ?? null : null,
      });
    });
    socket.on('dungeon:broadcast', (payload: { message?: string; windowId?: string; endsAt?: number }) => {
      if (!payload?.windowId) return;
      setGoldenHour({
        active: true,
        windowId: payload.windowId,
        endsAt: payload.endsAt ?? null,
        message: payload.message ?? null,
      });
    });
    socket.on('raid:lobby', (next: RaidLobbyView) => {
      if (!next?.lobbyId || !Array.isArray(next.slots)) return;
      setRaidLobby(next);
      setNotice(null);
    });
    socket.on('raid:update', (next: RaidBattleView) => {
      if (!next?.roomId) return;
      setRaid(next);
      setRaidLobby(null);
      setNotice(null);
    });
    socket.on('raid:evict', (payload: { message?: string }) => {
      setRaidLobby(null);
      setNotice(payload?.message ?? 'Bạn bị đưa về bản đồ.');
    });
    socket.on('raid:error', (payload: { message?: string }) => {
      setNotice(payload?.message ?? 'Không vào được hầm ngục.');
    });

    return () => {
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
      setSocket((current) => (current === socket ? null : current));
    };
  }, [auth.token, auth.refreshCharacter]);

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
