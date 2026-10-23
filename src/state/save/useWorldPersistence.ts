import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { AvatarLook } from '../avatarLook';
import { readAvatarLook, subscribeAvatarLook, writeAvatarLook } from '../avatarLook';
import { useAuth } from '../AuthContext';
import { useSetup } from '../SetupContext';
import {
  applyGameSave,
  captureGameSave,
  createStarterWorld,
  saveFingerprint,
  type SaveSource,
  type WorldSnapshot,
} from './gameSave';
import { commitGameSave, loadGameSave } from './syncSave';
import { writeLocalSaveNow } from './localSave';

const DEBOUNCE_MS = 500;
const INTERVAL_MS = 15_000;

/**
 * Loads the account save once, then writes it again when progress changes.
 * Battle results, items, level-ups, avatar edits, and town/wild travel all
 * change the fingerprint, so they save on their own. Walking stamina is
 * picked up by the interval and when the app goes to the background.
 */
export function useWorldPersistence(state: SaveSource, setState: (next: WorldSnapshot) => void): void {
  const auth = useAuth();
  const setup = useSetup();
  const [avatar, setAvatar] = useState<AvatarLook | null>(null);
  const stateRef = useRef(state);
  const tokenRef = useRef(auth.token);
  const avatarRef = useRef<AvatarLook | null>(null);
  const userIdRef = useRef<string | null>(auth.user?.id ?? null);
  const flushRef = useRef<() => void>(() => undefined);
  const booted = useRef<string | null>(null);
  const generation = useRef(0);
  const revision = useRef(0);
  const lastFingerprint = useRef('');
  const serverSynced = useRef(true);
  const chain = useRef(Promise.resolve());
  stateRef.current = state;
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

  useEffect(() => {
    const userId = auth.user?.id ?? null;
    const player = setup.player;
    if (!userId) {
      generation.current += 1;
      flushRef.current();
      booted.current = null;
      userIdRef.current = null;
      tokenRef.current = null;
      revision.current = 0;
      lastFingerprint.current = '';
      serverSynced.current = true;
      setState(emptyWorld());
      return;
    }
    if (!player || booted.current === userId) return;

    const run = ++generation.current;
    const snapshot = player;
    const token = tokenRef.current;
    setState(emptyWorld());
    void (async () => {
      let loaded: { save: Awaited<ReturnType<typeof loadGameSave>>['save']; synced: boolean } = { save: null, synced: true };
      try {
        loaded = await loadGameSave(userId, token);
      } catch (error) {
        console.warn('[Game Thư Giãn] Không khôi phục được tiến trình.', error);
      }
      if (generation.current !== run) return;
      const save = loaded.save;
      const look = save?.avatar ?? avatarRef.current;
      const next = save ? applyGameSave(save) : createStarterWorld(snapshot);
      if (save?.avatar) void writeAvatarLook(save.avatar);
      revision.current = save?.revision ?? 0;
      lastFingerprint.current = save ? saveFingerprint(next, snapshot, look) : '';
      serverSynced.current = loaded.synced;
      booted.current = userId;
      if (look) setAvatar(look);
      setState(next);
      if (save) console.log('[Game Thư Giãn] Restored adventure save', { revision: save.revision, updatedAt: save.updatedAt });
    })();

    return () => {
      generation.current += 1;
    };
  }, [auth.user?.id, setup.player, setState]);

  const flush = useCallback(() => {
    const userId = userIdRef.current;
    const token = tokenRef.current;
    const player = setup.player;
    const current = stateRef.current;
    if (!userId || !player || !current.ready || (booted.current && booted.current !== userId)) return;
    const look = avatarRef.current;
    const fingerprint = saveFingerprint(current, player, look);
    const changed = fingerprint !== lastFingerprint.current;
    if (!changed && serverSynced.current) return;
    if (!fingerprint) return;
    if (changed) revision.current += 1;
    const save = captureGameSave(current, player, look, {
      revision: revision.current,
      updatedAt: new Date().toISOString(),
    });
    if (!save) {
      if (changed) revision.current -= 1;
      return;
    }
    if (changed) lastFingerprint.current = fingerprint;
    serverSynced.current = false;
    writeLocalSaveNow(userId, JSON.stringify(save));
    chain.current = chain.current.then(async () => {
      const synced = await commitGameSave(userId, token, save);
      if (userIdRef.current === userId) serverSynced.current = synced;
    });
  }, [setup.player]);
  flushRef.current = flush;

  const fingerprint = state.ready && setup.player ? saveFingerprint(state, setup.player, avatar) : '';

  useEffect(() => {
    if (!fingerprint) return;
    const timer = setTimeout(flush, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fingerprint, flush]);

  useEffect(() => {
    const timer = setInterval(flush, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [flush]);

  useEffect(() => {
    const onHide = () => {
      flush();
    };
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') onHide();
    });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', onHide);
    }
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pagehide', onHide);
      }
    };
  }, [flush]);
}

function emptyWorld(): WorldSnapshot {
  return { ...createStarterWorld(blankPlayer()), ready: false };
}

function blankPlayer() {
  return {
    name: 'Nhà thám hiểm',
    gender: 'male' as const,
    baseCharacterId: 'm-wanderer',
    hairColor: '#7a4630',
    outfitColor: '#3e6b4d',
    selectedRegion: 'plains' as const,
  };
}

export type { WorldSnapshot };
