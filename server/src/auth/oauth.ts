import { createPublicKey, randomUUID, type JsonWebKey } from 'node:crypto';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import type { SocialProvider } from '../domain.js';

export type SocialIdentity = {
  provider: SocialProvider;
  subject: string;
  email: string | null;
  name: string;
};

type PendingState = {
  provider: SocialProvider;
  nonce: string;
  returnTo: string;
  redirectUri: string;
  mode: 'login' | 'link';
  userId?: string;
  expires: number;
};

type Exchange = { token: string; expires: number };

const states = new Map<string, PendingState>();
const exchanges = new Map<string, Exchange>();
type AppleKey = JsonWebKey & { kid?: string };

let appleKeys: { fetched: number; keys: AppleKey[] } | null = null;

const PROVIDERS: SocialProvider[] = ['google', 'apple', 'facebook'];

export function isSocialProvider(value: string): value is SocialProvider {
  return PROVIDERS.includes(value as SocialProvider);
}

export function providerReady(provider: SocialProvider): boolean {
  if (provider === 'google') return Boolean(config.googleClientId && config.googleClientSecret);
  if (provider === 'facebook') return Boolean(config.facebookAppId && config.facebookAppSecret);
  return Boolean(config.appleClientId);
}

export function publicBase(request: Request): string {
  if (config.publicUrl) return config.publicUrl.replace(/\/$/, '');
  const proto = request.header('x-forwarded-proto') ?? request.protocol;
  const host = request.header('x-forwarded-host') ?? request.header('host') ?? `localhost:${config.port}`;
  return `${proto}://${host}`;
}

/** Only http(s) return pages. A restricted CORS list is also an origin allow-list. */
export function safeReturn(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (config.corsOrigin !== '*') {
    const allowed = config.corsOrigin.split(',').map((item) => item.trim());
    if (!allowed.includes(url.origin)) return null;
  }
  url.hash = '';
  return url.toString();
}

export function beginOAuth(input: {
  provider: SocialProvider;
  returnTo: string;
  redirectUri: string;
  mode: 'login' | 'link';
  userId?: string;
}): string {
  const state = randomUUID();
  const nonce = randomUUID();
  states.set(state, {
    provider: input.provider,
    nonce,
    returnTo: input.returnTo,
    redirectUri: input.redirectUri,
    mode: input.mode,
    userId: input.userId,
    expires: Date.now() + 10 * 60_000,
  });
  return authorizeUrl(input.provider, input.redirectUri, state, nonce);
}

export function takeState(state: string): PendingState | null {
  const pending = states.get(state) ?? null;
  states.delete(state);
  if (!pending || pending.expires < Date.now()) return null;
  return pending;
}

export function parkExchange(token: string): string {
  const code = randomUUID();
  exchanges.set(code, { token, expires: Date.now() + 2 * 60_000 });
  return code;
}

export function takeExchange(code: string): string | null {
  const parked = exchanges.get(code) ?? null;
  exchanges.delete(code);
  if (!parked || parked.expires < Date.now()) return null;
  return parked.token;
}

export async function identityFromCallback(pending: PendingState, query: Record<string, unknown>, body: Record<string, unknown>): Promise<SocialIdentity> {
  if (pending.provider === 'apple') {
    const idToken = text(body.id_token) ?? text(query.id_token);
    if (!idToken) throw new Error('Apple không trả mã đăng nhập.');
    return verifyApple(idToken, pending.nonce);
  }
  const code = text(query.code) ?? text(body.code);
  if (!code) throw new Error('Nhà cung cấp không trả mã đăng nhập.');
  if (pending.provider === 'google') return verifyGoogleCode(code, pending.redirectUri, pending.nonce);
  return verifyFacebookCode(code, pending.redirectUri);
}

function authorizeUrl(provider: SocialProvider, redirectUri: string, state: string, nonce: string): string {
  if (provider === 'google') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.googleClientId ?? '');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('prompt', 'select_account');
    return url.toString();
  }
  if (provider === 'facebook') {
    const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    url.searchParams.set('client_id', config.facebookAppId ?? '');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'email,public_profile');
    url.searchParams.set('response_type', 'code');
    return url.toString();
  }
  const url = new URL('https://appleid.apple.com/auth/authorize');
  url.searchParams.set('client_id', config.appleClientId ?? '');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code id_token');
  url.searchParams.set('response_mode', 'form_post');
  url.searchParams.set('scope', 'name email');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  return url.toString();
}

async function verifyGoogleCode(code: string, redirectUri: string, nonce: string): Promise<SocialIdentity> {
  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId ?? '',
    client_secret: config.googleClientSecret ?? '',
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const exchanged = await postForm('https://oauth2.googleapis.com/token', body);
  const idToken = text(exchanged.id_token);
  if (!idToken) throw new Error('Google không trả mã định danh.');
  const info = await readJson(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (info.aud !== config.googleClientId) throw new Error('Mã Google không thuộc ứng dụng này.');
  if (info.nonce !== nonce) throw new Error('Mã Google không khớp phiên đăng nhập.');
  if (info.email_verified === 'false') throw new Error('Email Google chưa được xác minh.');
  const subject = text(info.sub);
  if (!subject) throw new Error('Google không có mã người dùng.');
  return {
    provider: 'google',
    subject,
    email: text(info.email),
    name: text(info.name) ?? text(info.email)?.split('@')[0] ?? 'Google',
  };
}

async function verifyFacebookCode(code: string, redirectUri: string): Promise<SocialIdentity> {
  const appId = config.facebookAppId ?? '';
  const secret = config.facebookAppSecret ?? '';
  const exchanged = await readJson(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${encodeURIComponent(secret)}&code=${encodeURIComponent(code)}`,
  );
  const access = text(exchanged.access_token);
  if (!access) throw new Error('Facebook không trả mã truy cập.');
  const appToken = `${appId}|${secret}`;
  const debug = await readJson(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(access)}&access_token=${encodeURIComponent(appToken)}`,
  );
  const data = debug.data;
  const checked = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  if (!checked || checked.is_valid !== true || checked.app_id !== appId) throw new Error('Mã Facebook không thuộc ứng dụng này.');
  const profile = await readJson(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(access)}`);
  const subject = text(profile.id);
  if (!subject) throw new Error('Facebook không có mã người dùng.');
  return {
    provider: 'facebook',
    subject,
    email: text(profile.email),
    name: text(profile.name) ?? 'Facebook',
  };
}

async function verifyApple(idToken: string, nonce: string): Promise<SocialIdentity> {
  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded && typeof decoded === 'object' && decoded.header ? decoded.header.kid : undefined;
  if (!kid) throw new Error('Mã Apple không đọc được.');
  const jwk = (await loadAppleKeys()).find((key) => key.kid === kid);
  if (!jwk) throw new Error('Không tìm thấy khóa Apple.');
  const key = createPublicKey({ key: jwk, format: 'jwk' });
  const payload = jwt.verify(idToken, key, {
    algorithms: ['RS256'],
    audience: config.appleClientId ?? '',
    issuer: 'https://appleid.apple.com',
  });
  if (typeof payload === 'string' || payload.nonce !== nonce || typeof payload.sub !== 'string') {
    throw new Error('Mã Apple không khớp phiên đăng nhập.');
  }
  const email = typeof payload.email === 'string' ? payload.email : null;
  return { provider: 'apple', subject: payload.sub, email, name: email?.split('@')[0] ?? 'Apple' };
}

async function loadAppleKeys(): Promise<AppleKey[]> {
  if (appleKeys && Date.now() - appleKeys.fetched < 60 * 60_000) return appleKeys.keys;
  const body = await readJson('https://appleid.apple.com/auth/keys');
  const keys = Array.isArray(body.keys) ? (body.keys as AppleKey[]) : [];
  appleKeys = { fetched: Date.now(), keys };
  return keys;
}

async function postForm(url: string, body: URLSearchParams): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error('Nhà cung cấp từ chối mã đăng nhập.');
  return json;
}

async function readJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url);
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error('Không kiểm tra được mã đăng nhập.');
  return json;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
