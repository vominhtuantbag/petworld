import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

import { SOCKET_URL } from '../config/env';
import type { BattleView, CombatAction, QueueView } from '../net/protocol';
import { reportSessionReplaced } from '../net/sessionKick';
import { useAuth } from './AuthContext';

type Connection = 'offline' | 'connecting' | 'online';

type BattleContextValue = {
  connection: Connection;
  socket: Socket | null;
  queue: QueueView;
  battle: BattleView | null;
  notice: string | null;
  findMatch: () => void;
  cancelMatch: () => void;
  sendAction: (action: CombatAction) => void;
  leaveBattle: () => void;
};

const BattleContext = createContext<BattleContextValue | null>(null);

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

  useEffect(() => {
    if (!auth.token) {
      socketRef.current?.close();
      socketRef.current = null;
      setSocket(null);
      setConnection('offline');
      setQueue({ state: 'idle', position: 0 });
      setBattle(null);
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
      setConnection('connecting');
    });
    socket.on('queue:status', (next: QueueView) => setQueue(next));
    socket.on('battle:update', (next: BattleView) => {
      setBattle(next);
      setQueue({ state: 'idle', position: 0 });
      if (next.status === 'finished') {
        void auth.refreshCharacter();
      }
    });
    socket.on('battle:error', (payload: { message?: string }) => {
      setNotice(payload.message ?? 'Không thực hiện được thao tác.');
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

  const sendAction = useCallback((action: CombatAction) => {
    socketRef.current?.emit('battle:action', { action });
  }, []);

  const leaveBattle = useCallback(() => {
    socketRef.current?.emit('battle:leave');
    setBattle(null);
  }, []);

  const value = useMemo<BattleContextValue>(
    () => ({ connection, socket, queue, battle, notice, findMatch, cancelMatch, sendAction, leaveBattle }),
    [connection, socket, queue, battle, notice, findMatch, cancelMatch, sendAction, leaveBattle],
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
