import { io, type Socket } from 'socket.io-client';

import { SOCKET_URL } from '../config/env';
import { clientInstanceId } from './clientId';

type Slot = { token: string; socket: Socket; holders: number };

let slot: Slot | null = null;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * One Engine.IO connection per JWT. React Strict Mode mounts the provider
 * twice; a delayed release lets the remount reuse the same socket instead of
 * opening a second handshake that the server would treat as another device.
 */
export function holdBattleSocket(token: string): Socket {
  if (slot?.token === token) {
    slot.holders += 1;
    if (releaseTimer) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }
    return slot.socket;
  }
  dropSlot();
  const socket = io(SOCKET_URL, {
    auth: { token, clientId: clientInstanceId() },
    transports: ['websocket', 'polling'],
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
  slot = { token, socket, holders: 1 };
  return socket;
}

export function releaseBattleSocket(socket: Socket) {
  if (!slot || slot.socket !== socket) {
    socket.io.reconnection(false);
    socket.close();
    return;
  }
  slot.holders -= 1;
  if (slot.holders > 0) return;
  const dying = slot;
  if (releaseTimer) clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    if (slot !== dying || dying.holders > 0) return;
    dropSlot();
  }, 50);
}

function dropSlot() {
  if (releaseTimer) {
    clearTimeout(releaseTimer);
    releaseTimer = null;
  }
  if (!slot) return;
  const dying = slot;
  slot = null;
  dying.socket.io.reconnection(false);
  dying.socket.close();
}
