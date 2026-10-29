import { API_URL } from '../config/env';
import type { PublicUser, ServerCharacter, SocialProvider } from './protocol';
import { reportSessionReplaced } from './sessionKick';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isSessionReplaced(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'session_replaced';
}

type ErrorBody = { error?: string; code?: string };

export function raiseApiError(payload: ErrorBody, status: number, token?: string): never {
  const code = typeof payload.code === 'string' ? payload.code : undefined;
  if (code === 'session_replaced' && token) reportSessionReplaced(token);
  throw new ApiError(payload.error ?? 'Yêu cầu không thành công.', status, code);
}

type AuthResponse = { token: string; user: PublicUser };

export async function registerAccount(input: { username: string; email: string; password: string }): Promise<AuthResponse> {
  return request('/api/auth/register', { method: 'POST', body: input });
}

export async function loginAccount(input: { email: string; password: string }): Promise<AuthResponse> {
  return request('/api/auth/login', { method: 'POST', body: input });
}

export async function loginGuest(): Promise<AuthResponse> {
  return request('/api/auth/guest', { method: 'POST', body: {} });
}

export async function startSocialLogin(provider: SocialProvider, returnTo: string): Promise<{ url: string }> {
  return request('/api/auth/social/start', { method: 'POST', body: { provider, returnTo } });
}

export async function startAccountLink(token: string, provider: SocialProvider, returnTo: string): Promise<{ url: string }> {
  return request('/api/auth/link/start', { method: 'POST', token, body: { provider, returnTo } });
}

export async function exchangeSocialCode(code: string): Promise<AuthResponse> {
  return request('/api/auth/social/exchange', { method: 'POST', body: { code } });
}

export async function fetchMe(token: string): Promise<PublicUser> {
  const body = await request<{ user: PublicUser }>('/api/me', { token });
  return body.user;
}

export async function fetchMyCharacter(token: string): Promise<ServerCharacter | null> {
  const body = await request<{ character: ServerCharacter | null }>('/api/characters/me', { token });
  return body.character;
}

export async function saveMyCharacter(
  token: string,
  character: {
    name: string;
    gender: 'male' | 'female';
    baseAvatarId: string;
    hairColor: string;
    outfitColor: string;
    startingRegion: string;
  },
): Promise<ServerCharacter> {
  const body = await request<{ character: ServerCharacter }>('/api/characters/me', {
    method: 'PUT',
    token,
    body: character,
  });
  return body.character;
}

export async function fetchMySave(token: string): Promise<unknown> {
  const body = await request<{ save: unknown }>('/api/saves/me', { token });
  return body.save;
}

export async function putMySave(token: string, save: unknown): Promise<{ accepted: boolean; save: unknown }> {
  return request('/api/saves/me', { method: 'PUT', token, body: { save } });
}

async function request<T>(path: string, options: { method?: string; token?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Hãy chạy server trước.', 0);
  }

  const payload = (await response.json().catch(() => ({}))) as ErrorBody;
  if (!response.ok) raiseApiError(payload, response.status, options.token);
  return payload as T;
}
