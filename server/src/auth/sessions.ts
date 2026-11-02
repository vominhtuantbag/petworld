import { randomUUID } from 'node:crypto';

import type { AccountStore, PublicUser } from '../domain.js';
import { signToken } from './tokens.js';

export const SESSION_REPLACED_CODE = 'session_replaced';
export const SESSION_REPLACED_MESSAGE = 'Tài khoản đã được đăng nhập ở thiết bị khác.';

type KickHandler = (userId: string, sid: string) => void;

let onReplaced: KickHandler | null = null;

/** Last JWT accepted for this account in this process. Cache only — the stored sid wins. */
const activeTokens = new Map<string, string>();

/** Arena registers this so a new login can close the previous socket. */
export function bindSessionKick(handler: KickHandler) {
  onReplaced = handler;
}

/**
 * Accepts the bearer token when its sid is the account's current login.
 *
 * The database sid is the source of truth. An in-memory token map is only a
 * cache: a handshake retry, a second replica, or a guest whose row was just
 * written must not be treated as an intruder.
 */
export function acceptToken(userId: string, token: string, sid: string, storedSid: string | undefined): 'ok' | 'replaced' {
  if (!userId || !token) return 'replaced';
  if (!sid) return 'replaced';
  const recorded = typeof storedSid === 'string' ? storedSid : '';
  if (recorded && recorded !== sid) return 'replaced';
  activeTokens.set(userId, token);
  return 'ok';
}

/** Stores a new token as the only valid one, tells the previous socket to leave, and returns it. */
export async function issueSession(store: AccountStore, user: PublicUser): Promise<string> {
  if (!user.id) throw new Error('Cannot issue a session without a user id.');
  const sid = randomUUID();
  const token = signToken(user, sid);
  activeTokens.set(user.id, token);
  await store.setSession(user.id, sid);
  onReplaced?.(user.id, sid);
  return token;
}
