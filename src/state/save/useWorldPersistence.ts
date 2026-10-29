import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { AvatarLook } from '../avatarLook';
import { readAvatarLook, subscribeAvatarLook, writeAvatarLook } from '../avatarLook';
import { useAuth } from '../AuthContext';
import { useSetup } from '../SetupContext';
import type { InitializedPlayer } from '../../types/game';
import {
  applyGameSave,
  captureGameSave,
  createStarterWorld,
  preferSave,
  progressScore,
  saveFingerprint,
  type GameSave,
  type SaveSource,
  type WorldSnapshot,
} from './gameSave';
import { readLocalSave, readLocalSaveSync, writeLocalSave } from './localSave';
import { commitGameSave, fetchRemoteSave } from './syncSave';

const PUSH_MS = 800;
const INTERVAL_MS = 15_000;

/**
 * Restores the on-device adventure before asking Render, then writes that
 * adventure on every change. The server receives a debounced copy and a
 * copy when the app goes to the background. A sleeping or reset server
 * cannot replace a further-along local save.
 */
export function useWorldPersistence(state: SaveSource, setState: (next: WorldSnapshot) => void): void {
  const auth = useAuth();
  const setup = useSetup();
  const [avatar, setAvatar] = useState<AvatarLook | null>(null);
  const stateRef = useRef(state);
  const tokenRef = useRef(auth.token);
  const avatarRef = useRef<AvatarLook | null>(null);
  const playerRef = useRef(setup.player);
  const userIdRef = useRef<string | null>(auth.user?.id ?? null);
  const persistRef = useRef<() => void>(() => undefined);
  const pushRef = useRef<() => void>(() => undefined);
  const booted = useRef<string | null>(null);
  const remoteChecked = useRef<string | null>(null);
  const allowPush = useRef(false);
  const generation = useRef(0);
  const pushGeneration = useRef(0);
  const revision = useRef(0);
  const lastFingerprint = useRef('');
  const pending = useRef<GameSave | null>(null);
  const serverSynced = useRef(true);
  const chain = useRef(Promise.resolve());
  stateRef.current = state;
  playerRef.current = setup.player;
  if (auth.token) tokenRef.current = auth.token;
  if (auth.user?.id) userIdRef.current = auth.user.id;
  avatarRef.current = avatar;

  useEffect(() => {
    let live = true;
    void readAvatarLook().then((look) => {
      if (live && look) setAvatar((current) => current ?? look);
    });
    const stop = subscribeAvatarLook((look) => {
      if (live) setAvatar(look);
    });
    return () => {
      live = false;
      stop();
    };
  }, []);

  const publish = useCallback(
    (save: GameSave, userId: string) => {
      const player = playerRef.current;
      if (!player) return;
      const next = applyGameSave(save);
      const look = save.avatar ?? avatarRef.current;
      if (save.avatar) void writeAvatarLook(save.avatar);
      revision.current = save.revision;
      pending.current = save;
      lastFingerprint.current = saveFingerprint(next, player, look);
      booted.current = userId;
      serverSynced.current = false;
      if (look) setAvatar(look);
      setState(next);
      console.log('[Game Thư Giãn] Restored adventure save', { revision: save.revision, updatedAt: save.updatedAt });
    },
    [setState],
  );

  useEffect(() => {
    const userId = auth.user?.id ?? null;
    const player = setup.player;
    if (!userId) {
      if (booted.current) {
        persistRef.current();
        pushRef.current();
        booted.current = null;
        remoteChecked.current = null;
        allowPush.current = false;
        userIdRef.current = null;
        tokenRef.current = null;
        revision.current = 0;
        lastFingerprint.current = '';
        pending.current = null;
        serverSynced.current = true;
        setState(emptyWorld());
      }
      return;
    }
    if (!player) return;
    if (booted.current && booted.current !== userId) {
      allowPush.current = false;
      pending.current = null;
      remoteChecked.current = null;
      booted.current = null;
      revision.current = 0;
      lastFingerprint.current = '';
      setState(emptyWorld());
    }
    if (booted.current === userId && remoteChecked.current === userId) return;

    const run = ++generation.current;
    const snapshot = player;
    const token = tokenRef.current;

    if (booted.current !== userId) {
      const quick = readLocalSaveSync(userId);
      if (quick) publish(quick, userId);
    }

    void (async () => {
      if (booted.current !== userId) {
        try {
          const stored = readLocalSaveSync(userId) ?? (await readLocalSave(userId));
          if (generation.current !== run) return;
          if (stored) publish(stored, userId);
        } catch (error) {
          console.warn('[Game Thư Giãn] Không khôi phục được tiến trình.', error);
        }
      }
      if (generation.current !== run) return;
      const bootSave = pending.current;
      const remote = await fetchRemoteSave(token);
      if (generation.current !== run) return;
      remoteChecked.current = userId;
      allowPush.current = true;
      const local = pending.current;
      const progressed = Boolean(local && bootSave && progressScore(local) > progressScore(bootSave));

      if (!local && !remote) {
        if (progressed) {
          pushRef.current();
          return;
        }
        if (booted.current !== userId) {
          lastFingerprint.current = '';
          pending.current = null;
          revision.current = 0;
          serverSynced.current = false;
          booted.current = userId;
          setState(createStarterWorld(playerRef.current ?? snapshot));
        }
        return;
      }

      if (local && remote) {
        const chosen = preferSave(local, remote);
        if (chosen !== local && !progressed) {
          pushGeneration.current += 1;
          publish(chosen, userId);
          serverSynced.current = true;
          try {
            await writeLocalSave(userId, chosen);
          } catch (error) {
            console.warn('[Game Thư Giãn] Không ghi được bản lưu máy chủ xuống máy.', error);
          }
          return;
        }
        serverSynced.current = false;
        pushRef.current();
        return;
      }

      if (remote && !progressed) {
        pushGeneration.current += 1;
        publish(remote, userId);
        serverSynced.current = true;
        try {
          await writeLocalSave(userId, remote);
        } catch (error) {
          console.warn('[Game Thư Giãn] Không ghi được bản lưu máy chủ xuống máy.', error);
        }
        return;
      }

      serverSynced.current = false;
      pushRef.current();
    })();

    return () => {
      generation.current += 1;
    };
  }, [auth.user?.id, setup.player, publish, setState]);

  const persist = useCallback(() => {
    const userId = userIdRef.current;
    const player = playerRef.current;
    const current = stateRef.current;
    if (!userId || !player || !current.ready || (booted.current && booted.current !== userId)) return;
    const look = avatarRef.current;
    const fingerprint = saveFingerprint(current, player, look);
    if (!fingerprint || fingerprint === lastFingerprint.current) return;
    revision.current += 1;
    const save = captureGameSave(current, player, look, {
      revision: revision.current,
      updatedAt: new Date().toISOString(),
    });
    if (!save) {
      revision.current -= 1;
      return;
    }
    lastFingerprint.current = fingerprint;
    pending.current = save;
    serverSynced.current = false;
    void writeLocalSave(userId, save).catch((error) => {
      console.warn('[Game Thư Giãn] Không ghi được bản lưu trên máy.', error);
    });
  }, []);
  persistRef.current = persist;

  const push = useCallback(() => {
    if (!allowPush.current) return;
    const userId = userIdRef.current;
    const token = tokenRef.current;
    const save = pending.current;
    if (!userId || !save || serverSynced.current) return;
    const gen = ++pushGeneration.current;
    chain.current = chain.current.then(async () => {
      if (pushGeneration.current !== gen) return;
      const synced = await commitGameSave(userId, token, save);
      if (pushGeneration.current === gen && userIdRef.current === userId && pending.current === save) {
        serverSynced.current = synced;
      }
    });
  }, []);
  pushRef.current = push;

  const fingerprint = state.ready && setup.player ? saveFingerprint(state, setup.player, avatar) : '';

  useEffect(() => {
    if (!fingerprint) return;
    persist();
    const timer = setTimeout(push, PUSH_MS);
    return () => clearTimeout(timer);
  }, [fingerprint, persist, push]);

  useEffect(() => {
    const timer = setInterval(() => {
      persistRef.current();
      pushRef.current();
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onHide = () => {
      persistRef.current();
      pushRef.current();
    };
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') onHide();
    });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', onHide);
      window.addEventListener('beforeunload', onHide);
    }
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined' && typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pagehide', onHide);
        window.removeEventListener('beforeunload', onHide);
      }
    };
  }, []);
}

function emptyWorld(): WorldSnapshot {
  return { ...createStarterWorld(blankPlayer()), ready: false };
}

function blankPlayer(): InitializedPlayer {
  return {
    name: 'Nhà thám hiểm',
    gender: 'male',
    baseCharacterId: 'm-wanderer',
    hairColor: '#7a4630',
    outfitColor: '#3e6b4d',
    selectedRegion: 'plains',
  };
}

export type { WorldSnapshot };
