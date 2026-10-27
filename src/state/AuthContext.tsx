import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { SessionReplacedModal } from '../components/SessionReplacedModal';
import type { InitializedPlayer } from '../types/game';
import { ApiError, fetchMe, fetchMyCharacter, isSessionReplaced, loginAccount, registerAccount, saveMyCharacter } from '../net/api';
import type { PublicUser, ServerCharacter } from '../net/protocol';
import { forgetKickedToken, kickedToken, onSessionReplaced, rememberKickedToken } from '../net/sessionKick';
import { clearToken, readToken, saveToken, TOKEN_KEY } from '../net/tokenStore';
import { clearSessionCache, readSessionCache, writeSessionCache } from './save/sessionCache';

/**
 * Session for the signed-in account. The JWT stays in SecureStore (or
 * localStorage on web). Character stats always come back from the server.
 * If the server cannot be reached, or the account was wiped while this
 * device still has a session, the last session stored here still opens so a
 * reload does not throw the player out.
 */

type AuthContextValue = {
  ready: boolean;
  token: string | null;
  user: PublicUser | null;
  character: ServerCharacter | null;
  register: (input: { username: string; email: string; password: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  saveCharacter: (player: InitializedPlayer) => Promise<void>;
  refreshCharacter: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [character, setCharacter] = useState<ServerCharacter | null>(null);
  const [kicked, setKicked] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const holdKick = useRef(false);

  const applySession = useCallback(async (nextToken: string, nextUser?: PublicUser) => {
    tokenRef.current = nextToken;
    const sessionUser = nextUser ?? (await fetchMe(nextToken));
    const saved = await fetchMyCharacter(nextToken);
    setToken(nextToken);
    setUser(sessionUser);
    setCharacter(saved);
  }, []);

  const forceLogout = useCallback(async (staleToken: string) => {
    if (holdKick.current) return;
    if (tokenRef.current && tokenRef.current !== staleToken) return;
    tokenRef.current = null;
    rememberKickedToken(staleToken);
    setKicked(true);
    await clearToken();
    await clearSessionCache();
    setToken(null);
    setUser(null);
    setCharacter(null);
  }, []);

  useEffect(() => onSessionReplaced((staleToken) => {
    void forceLogout(staleToken);
  }), [forceLogout]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      const mine = tokenRef.current;
      if (event.key !== TOKEN_KEY || !mine || event.newValue === mine) return;
      if (kickedToken() === mine) return;
      void saveToken(mine);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    readToken()
      .then(async (stored) => {
        if (!stored || cancelled) return;
        if (stored === kickedToken()) {
          if (!cancelled) setKicked(true);
          return;
        }
        try {
          await applySession(stored);
        } catch (error) {
          if (isSessionReplaced(error)) {
            rememberKickedToken(stored);
            if (!cancelled) setKicked(true);
            await clearToken();
            await clearSessionCache();
            return;
          }
          const status = error instanceof ApiError ? error.status : 0;
          const cached = await readSessionCache();
          if (!cancelled && cached && (status === 0 || status === 401 || status >= 500)) {
            setToken(stored);
            setUser(cached.user);
            setCharacter(cached.character);
            return;
          }
          await clearToken();
          await clearSessionCache();
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const register = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      holdKick.current = true;
      forgetKickedToken();
      try {
        const result = await registerAccount(input);
        tokenRef.current = result.token;
        await saveToken(result.token);
        await applySession(result.token, result.user);
      } finally {
        holdKick.current = false;
      }
    },
    [applySession],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      holdKick.current = true;
      forgetKickedToken();
      try {
        const result = await loginAccount(input);
        tokenRef.current = result.token;
        await saveToken(result.token);
        await applySession(result.token, result.user);
      } finally {
        holdKick.current = false;
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    tokenRef.current = null;
    await clearToken();
    await clearSessionCache();
    setToken(null);
    setUser(null);
    setCharacter(null);
  }, []);

  const saveCharacter = useCallback(
    async (player: InitializedPlayer) => {
      if (!token) throw new Error('Hãy đăng nhập trước.');
      const saved = await saveMyCharacter(token, {
        name: player.name,
        gender: player.gender,
        baseAvatarId: player.baseCharacterId,
        hairColor: player.hairColor,
        outfitColor: player.outfitColor,
        startingRegion: player.selectedRegion,
      });
      setCharacter(saved);
    },
    [token],
  );

  const refreshCharacter = useCallback(async () => {
    if (!token) return;
    setCharacter(await fetchMyCharacter(token));
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    void writeSessionCache({ user, character });
  }, [token, user, character]);

  const value = useMemo<AuthContextValue>(
    () => ({ ready, token, user, character, register, login, logout, saveCharacter, refreshCharacter }),
    [ready, token, user, character, register, login, logout, saveCharacter, refreshCharacter],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionReplacedModal visible={kicked} onClose={() => setKicked(false)} />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
