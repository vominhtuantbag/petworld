import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { InitializedPlayer } from '../types/game';
import { ApiError, fetchMe, fetchMyCharacter, loginAccount, registerAccount, saveMyCharacter } from '../net/api';
import type { PublicUser, ServerCharacter } from '../net/protocol';
import { clearToken, readToken, saveToken } from '../net/tokenStore';
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

  const applySession = useCallback(async (nextToken: string, nextUser?: PublicUser) => {
    const sessionUser = nextUser ?? (await fetchMe(nextToken));
    const saved = await fetchMyCharacter(nextToken);
    setToken(nextToken);
    setUser(sessionUser);
    setCharacter(saved);
  }, []);

  useEffect(() => {
    let cancelled = false;
    readToken()
      .then(async (stored) => {
        if (!stored || cancelled) return;
        try {
          await applySession(stored);
        } catch (error) {
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
      const result = await registerAccount(input);
      await saveToken(result.token);
      await applySession(result.token, result.user);
    },
    [applySession],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const result = await loginAccount(input);
      await saveToken(result.token);
      await applySession(result.token, result.user);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
