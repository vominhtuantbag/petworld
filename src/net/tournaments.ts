import { API_URL } from '../config/env';
import { ApiError } from './api';

/**
 * Tournament HTTP client. `request` in api.ts stays private to account
 * routes, so this module keeps its own thin fetch.
 *
 * Bracket level still comes from the account's PvP level on the server.
 * Adventure level in the open world is local and is not sent here.
 */

export type CupSummary = {
  id: string;
  kind: 'weekly' | 'monthly';
  region: string | null;
  tier: 1 | 2 | 3;
  nameVi: string;
  startsAt: string;
  registrationOpensAt: string;
  status: 'registration' | 'live' | 'complete';
  entrantCount: number;
  championName: string | null;
  rewardTitle: string;
};

export type CupSeed = { userId: string; username: string; wins: number; level: number; region: string; preview?: boolean };

export type CupMatch = {
  id: string;
  round: number;
  a: CupSeed | null;
  b: CupSeed | null;
  winnerId: string | null;
};

export type CupDetail = CupSummary & {
  entrants: CupSeed[];
  matches: CupMatch[];
};

export type CupPreview = {
  preview: true;
  champion: CupSeed | null;
  matches: CupMatch[];
  rewardTitle: string;
};

export async function listTournaments(token: string): Promise<CupSummary[]> {
  const body = await request<{ tournaments: CupSummary[] }>('/api/tournaments', { token });
  return body.tournaments;
}

export async function fetchTournament(token: string, id: string): Promise<CupDetail> {
  return request<CupDetail>(`/api/tournaments/${encodeURIComponent(id)}`, { token });
}

export async function enterTournament(token: string, id: string): Promise<CupDetail> {
  return request<CupDetail>(`/api/tournaments/${encodeURIComponent(id)}/enter`, { method: 'POST', token });
}

export async function simulateTournament(token: string, id: string): Promise<CupPreview> {
  return request<CupPreview>(`/api/tournaments/${encodeURIComponent(id)}/simulate`, { method: 'POST', token });
}

async function request<T>(path: string, options: { method?: string; token?: string } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Hãy chạy server trước.', 0);
  }
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(payload.error ?? 'Yêu cầu không thành công.', response.status);
  return payload as T;
}
