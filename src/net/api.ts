import { API_URL } from '../config/env';
import type { PublicUser, ServerCharacter } from './protocol';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type AuthResponse = { token: string; user: PublicUser };

export async function registerAccount(input: { username: string; email: string; password: string }): Promise<AuthResponse> {
  return request('/api/auth/register', { method: 'POST', body: input });
}

export async function loginAccount(input: { email: string; password: string }): Promise<AuthResponse> {
  return request('/api/auth/login', { method: 'POST', body: input });
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

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new ApiError(payload.error ?? 'Yêu cầu không thành công.', response.status);
  }
  return payload as T;
}
