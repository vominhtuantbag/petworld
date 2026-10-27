import { useCallback, useEffect, useRef, useState } from 'react';

import { SOCKET_URL } from '../config/env';
import { useGameLoop } from '../hooks/useGameLoop';
import type { MapChatMessage, WorldAvatar, WorldEnter, WorldMotion } from '../net/worldPresence';
import { stepHorizontalFacing } from '../components/world/facing';
import type { Gender } from '../types/game';
import { useAuth } from './AuthContext';
import { useSocket } from './BattleContext';

const SEND_MS = 100;
const MOVE_EPS = 3;
const CATCH_UP = 480;
const SPEECH_MS = 4000;

export type RemotePlayer = WorldAvatar & {
  drawX: number;
  drawY: number;
  speech: string | null;
};

type PresenceInput = {
  zoneId: string;
  x: number;
  y: number;
  name: string;
  baseCharacterId: string;
  gender: Gender;
  hairColor: string;
  outfitColor: string;
  level: number;
  hp: number;
  maxHp: number;
};

type Ghost = RemotePlayer & { speechUntil: number };

/**
 * Keeps the signed-in player in the current map room and smooths everyone
 * else's steps. The socket is the same one used for arena matchmaking.
 */
export function useMultiplayer(presence: PresenceInput | null) {
  const socket = useSocket();
  const auth = useAuth();
  const selfId = auth.user?.id ?? null;
  const poseRef = useRef(presence);
  const facingRef = useRef<1 | -1>(1);
  const lastPos = useRef({ x: presence?.x ?? 0, y: presence?.y ?? 0 });
  const ghosts = useRef(new Map<string, Ghost>());
  const [players, setPlayers] = useState<RemotePlayer[]>([]);
  const [messages, setMessages] = useState<MapChatMessage[]>([]);
  poseRef.current = presence;
  if (presence) {
    facingRef.current = stepHorizontalFacing(
      facingRef.current,
      presence.x - lastPos.current.x,
      0.35,
      presence.y - lastPos.current.y,
    );
    lastPos.current = { x: presence.x, y: presence.y };
  }

  const signature = presence
    ? `${presence.zoneId}|${presence.baseCharacterId}|${presence.name}|${presence.gender}|${presence.hairColor}|${presence.outfitColor}`
    : '';

  useEffect(() => {
    const live = socket;
    if (!live || !signature) return;
    const mine = selfId;

    let lastDraw = '';
    let lastDrawAt = 0;
    const publish = () => {
      const next = snapshot(ghosts.current);
      const line = next.map((player) => `${player.username}@${Math.round(player.x)},${Math.round(player.y)}`).join(' | ') || 'nobody';
      const now = Date.now();
      if (line !== lastDraw || now - lastDrawAt > 1000) {
        console.log(`[multiplayer] sprites ${next.length}: ${line}`);
        lastDraw = line;
        lastDrawAt = now;
      }
      setPlayers(next);
    };
    const misses = new Map<string, number>();

    const onList = (payload: { players?: WorldAvatar[] } | WorldAvatar[]) => {
      const seen = new Set<string>();
      for (const avatar of readList(payload)) {
        if (!avatar?.userId || avatar.userId === mine) continue;
        seen.add(avatar.userId);
        misses.delete(avatar.userId);
        remember(ghosts.current, avatar, mine, true);
      }
      for (const id of [...ghosts.current.keys()]) {
        if (seen.has(id)) continue;
        const count = (misses.get(id) ?? 0) + 1;
        if (count >= 2) {
          ghosts.current.delete(id);
          misses.delete(id);
        } else {
          misses.set(id, count);
        }
      }
      publish();
    };
    const onJoined = (avatar: WorldAvatar) => {
      remember(ghosts.current, avatar, mine, true);
      publish();
    };
    const onMoved = (motion: WorldMotion & Partial<WorldAvatar>) => {
      if (!motion?.userId || motion.userId === mine) return;
      const x = Number(motion.x);
      const y = Number(motion.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const ghost = ghosts.current.get(motion.userId);
      if (!ghost) {
        if (motion.username && motion.baseCharacterId) remember(ghosts.current, { ...motion, x, y } as WorldAvatar, mine, true);
        publish();
        return;
      }
      ghost.x = x;
      ghost.y = y;
      ghost.drawX = x;
      ghost.drawY = y;
      ghost.facing = motion.facing === -1 ? -1 : 1;
      ghost.hp = motion.hp;
      ghost.maxHp = motion.maxHp;
      if (typeof motion.username === 'string') ghost.username = motion.username;
      publish();
    };
    const onLeft = (payload: { userId?: string }) => {
      if (!payload.userId) return;
      ghosts.current.delete(payload.userId);
      publish();
    };
    const onChat = (payload: { userId?: string; username?: string; text?: string; at?: number }) => {
      if (!payload.userId || !payload.username || !payload.text) return;
      const at = typeof payload.at === 'number' ? payload.at : Date.now();
      setMessages((current) => [...current, { id: `${payload.userId}-${at}`, userId: payload.userId!, username: payload.username!, text: payload.text!, at }].slice(-30));
      const ghost = ghosts.current.get(payload.userId);
      if (!ghost) return;
      ghost.speech = payload.text;
      ghost.speechUntil = Date.now() + SPEECH_MS;
      publish();
    };
    const onError = (payload: { message?: string }) => {
      if (!payload.message) return;
      const at = Date.now();
      setMessages((current) => [...current, { id: `sys-${at}`, userId: '', username: 'Hệ thống', text: payload.message!, at }].slice(-30));
    };

    live.on('current_players_list', onList);
    live.on('player_list', onList);
    live.on('sync_players', onList);
    live.on('player_joined', onJoined);
    live.on('player_moved', onMoved);
    live.on('player_left', onLeft);
    live.on('player_disconnect', onLeft);
    live.on('map_chat', onChat);
    live.on('world:error', onError);
    let lastPacketLog = 0;
    const onAny = (event: string, payload: unknown) => {
      const watched = event === 'player_joined' || event === 'player_left' || event === 'player_disconnect' || event === 'sync_players' || event === 'current_players_list' || event === 'player_list' || event === 'player_moved' || event === 'map_chat' || event === 'world:error';
      if (!watched) return;
      const now = Date.now();
      if ((event === 'player_moved' || event === 'sync_players' || event === 'current_players_list' || event === 'player_list') && now - lastPacketLog < 1000) return;
      lastPacketLog = now;
      console.log(`[multiplayer] ${event}`, describePacket(payload), `sprites=${ghosts.current.size} url=${SOCKET_URL}`);
    };
    live.onAny(onAny);

    const sent = { x: Number.NaN, y: Number.NaN, facing: 1 as 1 | -1, hp: Number.NaN };
    const enter = () => {
      const current = poseRef.current;
      if (!current) return;
      const body = wire(current, facingRef.current, mine, auth.user?.username ?? current.name);
      console.log(`[multiplayer] player_enter_map ${SOCKET_URL} zone=${body.zoneId} at ${body.x},${body.y} as ${body.username}`);
      live.emit('player_enter_map', body);
      sent.x = current.x;
      sent.y = current.y;
      sent.facing = facingRef.current;
      sent.hp = current.hp;
    };
    if (live.connected) enter();
    live.on('connect', enter);

    const timer = setInterval(() => {
      const current = poseRef.current;
      if (!current || !live.connected) return;
      const facing = facingRef.current;
      const moved = Math.hypot(current.x - sent.x, current.y - sent.y) > MOVE_EPS || facing !== sent.facing || current.hp !== sent.hp;
      if (!moved) return;
      sent.x = current.x;
      sent.y = current.y;
      sent.facing = facing;
      sent.hp = current.hp;
      live.emit('player_move', wire(current, facing, mine, auth.user?.username ?? current.name));
    }, SEND_MS);

    return () => {
      clearInterval(timer);
      live.emit('world:leave');
      live.off('connect', enter);
      live.offAny(onAny);
      live.off('current_players_list', onList);
      live.off('player_list', onList);
      live.off('sync_players', onList);
      live.off('player_joined', onJoined);
      live.off('player_moved', onMoved);
      live.off('player_left', onLeft);
      live.off('player_disconnect', onLeft);
      live.off('map_chat', onChat);
      live.off('world:error', onError);
      ghosts.current.clear();
      setPlayers([]);
      setMessages([]);
    };
  }, [socket, signature, selfId, auth.user?.username]);

  useGameLoop(presence !== null, (dt) => {
    const now = Date.now();
    let dirty = false;
    for (const ghost of ghosts.current.values()) {
      if (ghost.speech && now >= ghost.speechUntil) {
        ghost.speech = null;
        dirty = true;
      }
      const dx = ghost.x - ghost.drawX;
      const dy = ghost.y - ghost.drawY;
      const distance = Math.hypot(dx, dy);
      if (distance < 0.4) continue;
      if (distance > CATCH_UP) {
        ghost.drawX = ghost.x;
        ghost.drawY = ghost.y;
      } else {
        const blend = 1 - Math.exp(-10 * dt);
        ghost.drawX += dx * blend;
        ghost.drawY += dy * blend;
      }
      dirty = true;
    }
    if (dirty) setPlayers(snapshot(ghosts.current));
  });

  const sendChat = useCallback((text: string) => {
    const trimmed = text.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120);
    if (!trimmed || !socket) return;
    socket.emit('map_chat', { text: trimmed });
  }, [socket]);

  return { players, messages, sendChat };
}

function readList(payload: { players?: WorldAvatar[] } | WorldAvatar[]): WorldAvatar[] {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.players) ? payload.players : [];
}

function describePacket(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload;
  const body = payload as { players?: WorldAvatar[]; username?: string; userId?: string; x?: number; y?: number; text?: string };
  if (Array.isArray(body.players)) return body.players.map((player) => `${player.username}@${Math.round(player.x)},${Math.round(player.y)}`);
  return { user: body.username ?? body.userId, x: body.x, y: body.y, text: body.text };
}

function remember(ghosts: Map<string, Ghost>, avatar: WorldAvatar, selfId: string | null, snap: boolean) {
  if (!avatar?.userId || avatar.userId === selfId) return;
  const previous = ghosts.get(avatar.userId);
  ghosts.set(avatar.userId, {
    ...avatar,
    facing: avatar.facing === -1 ? -1 : 1,
    drawX: snap || !previous ? avatar.x : previous.drawX,
    drawY: snap || !previous ? avatar.y : previous.drawY,
    speech: previous?.speech ?? null,
    speechUntil: previous?.speechUntil ?? 0,
  });
}

function snapshot(ghosts: Map<string, Ghost>): RemotePlayer[] {
  return [...ghosts.values()].map((ghost) => ({
    userId: ghost.userId,
    username: ghost.username,
    name: ghost.name,
    x: ghost.drawX,
    y: ghost.drawY,
    facing: ghost.facing,
    baseCharacterId: ghost.baseCharacterId,
    gender: ghost.gender,
    hairColor: ghost.hairColor,
    outfitColor: ghost.outfitColor,
    level: ghost.level,
    hp: ghost.hp,
    maxHp: ghost.maxHp,
    drawX: ghost.drawX,
    drawY: ghost.drawY,
    speech: ghost.speech,
  }));
}

function wire(presence: PresenceInput, facing: 1 | -1, userId: string | null, username: string): WorldEnter {
  return {
    zoneId: presence.zoneId,
    userId: userId ?? undefined,
    username,
    x: presence.x,
    y: presence.y,
    facing,
    name: presence.name,
    baseCharacterId: presence.baseCharacterId,
    gender: presence.gender,
    hairColor: presence.hairColor,
    outfitColor: presence.outfitColor,
    level: presence.level,
    hp: presence.hp,
    maxHp: presence.maxHp,
  };
}
