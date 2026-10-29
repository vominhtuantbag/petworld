import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { SessionReplacedModal } from '../components/SessionReplacedModal';
import type { InitializedPlayer } from '../types/game';
import { ApiError, exchangeSocialCode, fetchMe, fetchMyCharacter, isSessionReplaced, loginAccount, loginGuest, registerAccount, saveMyCharacter, startAccountLink, startSocialLogin } from '../net/api';
import type { PublicUser, ServerCharacter, SocialProvider } from '../net/protocol';
import { forgetKickedToken, kickedToken, onSessionReplaced, rememberKickedToken } from '../net/sessionKick';
import { clearToken, readToken, saveToken, tokenSubject, TOKEN_KEY } from '../net/tokenStore';
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
  playAsGuest: () => Promise<void>;
  beginSocial: (provider: SocialProvider) => Promise<void>;
  linkSocial: (provider: SocialProvider) => Promise<void>;
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
      if (event.key !== TOKEN_KEY) return;
      const next = event.newValue;
      if (!next) {
        const mine = tokenRef.current;
        if (mine) void forceLogout(mine);
        return;
      }
      if (next === tokenRef.current) return;
      holdKick.current = true;
      tokenRef.current = next;
      void applySession(next).finally(() => {
        holdKick.current = false;
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [applySession, forceLogout]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const params = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search);
      const authCode = params?.get('auth_code');
      const notice = params?.get('auth_error') ?? params?.get('link_error');
      if (notice && typeof sessionStorage !== 'undefined') sessionStorage.setItem('game-thu-gian.auth-error', notice);
      if (authCode || notice || params?.get('linked')) stripAuthQuery();
      if (authCode) {
        try {
          const result = await exchangeSocialCode(authCode);
          if (cancelled) return;
          await adopt(result);
        } catch (error) {
          if (!cancelled) console.warn('[Game Thư Giãn] Không nhận được phiên mạng xã hội.', error);
        }
        if (!cancelled) setReady(true);
        return;
      }
      const stored = await readToken();
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
        const subject = tokenSubject(stored);
        const offline = status === 0 || status >= 500;
        if (!cancelled && cached && subject && cached.user.id === subject && offline) {
          tokenRef.current = stored;
          setToken(stored);
          setUser(cached.user);
          setCharacter(cached.character);
          return;
        }
        await clearToken();
        await clearSessionCache();
      }
    })().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const adopt = useCallback(
    async (result: { token: string; user: PublicUser }) => {
      holdKick.current = true;
      forgetKickedToken();
      await clearSessionCache();
      try {
        tokenRef.current = result.token;
        await saveToken(result.token);
        await applySession(result.token, result.user);
      } catch (error) {
        tokenRef.current = null;
        await clearToken();
        await clearSessionCache();
        throw error;
      } finally {
        holdKick.current = false;
      }
    },
    [applySession],
  );

  const register = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      await adopt(await registerAccount(input));
    },
    [adopt],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      await adopt(await loginAccount(input));
    },
    [adopt],
  );

  const playAsGuest = useCallback(async () => {
    await adopt(await loginGuest());
  }, [adopt]);

  const beginSocial = useCallback(async (provider: SocialProvider) => {
    if (typeof window === 'undefined') throw new Error('Đăng nhập mạng xã hội mở trên trình duyệt.');
    const returnTo = `${window.location.origin}${window.location.pathname}`;
    const started = await startSocialLogin(provider, returnTo);
    window.location.assign(started.url);
  }, []);

  const linkSocial = useCallback(
    async (provider: SocialProvider) => {
      if (!token || typeof window === 'undefined') throw new Error('Hãy vào game trước khi liên kết.');
      const returnTo = `${window.location.origin}${window.location.pathname}`;
      const started = await startAccountLink(token, provider, returnTo);
      window.location.assign(started.url);
    },
    [token],
  );

  const logout = useCallback(async () => {
    tokenRef.current = null;
    forgetKickedToken();
    setKicked(false);
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
    () => ({ ready, token, user, character, register, login, playAsGuest, beginSocial, linkSocial, logout, saveCharacter, refreshCharacter }),
    [ready, token, user, character, register, login, playAsGuest, beginSocial, linkSocial, logout, saveCharacter, refreshCharacter],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionReplacedModal visible={kicked} onClose={() => setKicked(false)} />
    </AuthContext.Provider>
  );
}

function stripAuthQuery() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const key of ['auth_code', 'auth_error', 'link_error', 'linked']) url.searchParams.delete(key);
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
