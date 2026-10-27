import { randomUUID } from 'node:crypto';

import type { AccountStore, PublicUser } from '../domain.js';
import { signToken } from './tokens.js';

export const SESSION_REPLACED_CODE = 'session_replaced';
export const SESSION_REPLACED_MESSAGE = 'Tài khoản đã được đăng nhập ở thiết bị khác.';

type KickHandler = (userId: string, sid: string) => void;

let onReplaced: KickHandler | null = null;

/** The one JWT this process will accept for each account. */
const activeTokens = new Map<string, string>();

/** Arena registers this so a new login can close the previous socket. */
export function bindSessionKick(handler: KickHandler) {
  onReplaced = handler;
}

/**
 * Accepts the bearer token only when it is the latest login for this account.
 * A different, still-signed JWT is rejected.
 */
export function acceptToken(userId: string, token: string, sid: string, storedSid: string | undefined): 'ok' | 'replaced' {
  const current = activeTokens.get(userId);
  if (current) return current === token ? 'ok' : 'replaced';
  const recorded = storedSid ?? '';
  if (!sid || (recorded && recorded !== sid)) return 'replaced';
  activeTokens.set(userId, token);
  return 'ok';
}

/** Stores a new token as the only valid one, tells the previous socket to leave, and returns it. */
export async function issueSession(store: AccountStore, user: PublicUser): Promise<string> {
  const sid = randomUUID();
  const token = signToken(user, sid);
  activeTokens.set(user.id, token);
  await store.setSession(user.id, sid);
  onReplaced?.(user.id, sid);
  return token;
}
