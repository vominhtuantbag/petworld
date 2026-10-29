import { randomUUID } from 'node:crypto';

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { z } from 'zod';

import { beginOAuth, identityFromCallback, isSocialProvider, parkExchange, providerReady, publicBase, safeReturn, takeExchange, takeState } from '../auth/oauth.js';
import { acceptToken, issueSession, SESSION_REPLACED_CODE, SESSION_REPLACED_MESSAGE } from '../auth/sessions.js';
import { hashPassword, readToken, verifyPassword } from '../auth/tokens.js';
import { AVATAR_IDS, REGION_IDS } from '../catalog.js';
import { config } from '../config.js';
import type { AccountStore } from '../domain.js';
import { toPublicUser } from '../domain.js';
import { TournamentBoard, type Cup } from '../tournament/board.js';
import { coerceSaveInput, saveIssue, saveSchema } from '../saves/schema.js';

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may use letters, numbers, and underscore.'),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(72),
});

const characterSchema = z.object({
  name: z.string().trim().min(1).max(18),
  gender: z.enum(['male', 'female']),
  baseAvatarId: z.enum(AVATAR_IDS),
  hairColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  outfitColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  startingRegion: z.enum(REGION_IDS),
});

const hits = new Map<string, number[]>();

function rateLimit(request: Request, response: Response, next: NextFunction) {
  const key = request.ip ?? 'local';
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= 30) {
    response.status(429).json({ error: 'Quá nhiều yêu cầu. Hãy thử lại sau một phút.' });
    return;
  }
  recent.push(now);
  hits.set(key, recent);
  next();
}

function asyncRoute(handler: (request: Request, response: Response) => Promise<void>) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response).catch(next);
  };
}

export function createApp(store: AccountStore, board = new TournamentBoard()) {
  const app = express();
  app.disable('x-powered-by');
  if (config.production) app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((item: string) => item.trim()),
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false }));

  app.get('/', (_request, response) => {
    response.json({ ok: true, service: 'game-thu-gian' });
  });

  app.get('/health', (_request, response) => {
    response.json({ ok: true });
  });

  app.post(
    '/api/auth/register',
    rateLimit,
    asyncRoute(async (request, response) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: 'Tên, email hoặc mật khẩu chưa hợp lệ. Mật khẩu cần ít nhất 8 ký tự.' });
        return;
      }
      const email = parsed.data.email.toLowerCase();
      const username = parsed.data.username;
      if (await store.findUserByEmail(email)) {
        response.status(409).json({ error: 'Email này đã được đăng ký.' });
        return;
      }
      if (await store.findUserByUsername(username)) {
        response.status(409).json({ error: 'Tên đăng nhập đã có người dùng.' });
        return;
      }
      const user = await store.createUser({
        username,
        email,
        passwordHash: await hashPassword(parsed.data.password),
      });
      const publicUser = toPublicUser(user);
      response.status(201).json({ token: await issueSession(store, publicUser), user: publicUser });
    }),
  );

  app.post(
    '/api/auth/login',
    rateLimit,
    asyncRoute(async (request, response) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: 'Email hoặc mật khẩu chưa hợp lệ.' });
        return;
      }
      const user = await store.findUserByEmail(parsed.data.email.toLowerCase());
      const matches = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
      if (!user || !matches) {
        response.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
        return;
      }
      const publicUser = toPublicUser(user);
      response.json({ token: await issueSession(store, publicUser), user: publicUser });
    }),
  );

  app.post(
    '/api/auth/guest',
    rateLimit,
    asyncRoute(async (_request, response) => {
      const username = await uniqueUsername(store, 'khach');
      const user = await store.createUser({
        username,
        email: `guest.${randomUUID()}@guest.local`,
        passwordHash: await hashPassword(randomUUID()),
        guest: true,
      });
      const publicUser = toPublicUser(user);
      response.status(201).json({ token: await issueSession(store, publicUser), user: publicUser });
    }),
  );

  app.post(
    '/api/auth/social/start',
    rateLimit,
    asyncRoute(async (request, response) => {
      const provider = typeof request.body?.provider === 'string' ? request.body.provider : '';
      const returnTo = typeof request.body?.returnTo === 'string' ? safeReturn(request.body.returnTo) : null;
      if (!isSocialProvider(provider) || !returnTo) {
        response.status(400).json({ error: 'Nhà cung cấp hoặc đường về không hợp lệ.' });
        return;
      }
      if (!providerReady(provider)) {
        response.status(503).json({ error: `Đăng nhập ${providerLabel(provider)} chưa được cấu hình trên máy chủ.` });
        return;
      }
      const url = beginOAuth({
        provider,
        returnTo,
        redirectUri: `${publicBase(request)}/api/auth/social/callback`,
        mode: 'login',
      });
      response.json({ url });
    }),
  );

  app.post(
    '/api/auth/link/start',
    rateLimit,
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request, response);
      if (!user) return;
      const provider = typeof request.body?.provider === 'string' ? request.body.provider : '';
      const returnTo = typeof request.body?.returnTo === 'string' ? safeReturn(request.body.returnTo) : null;
      if (!isSocialProvider(provider) || !returnTo) {
        response.status(400).json({ error: 'Nhà cung cấp hoặc đường về không hợp lệ.' });
        return;
      }
      if (!providerReady(provider)) {
        response.status(503).json({ error: `Liên kết ${providerLabel(provider)} chưa được cấu hình trên máy chủ.` });
        return;
      }
      const url = beginOAuth({
        provider,
        returnTo,
        redirectUri: `${publicBase(request)}/api/auth/social/callback`,
        mode: 'link',
        userId: user.id,
      });
      response.json({ url });
    }),
  );

  app.post(
    '/api/auth/social/exchange',
    rateLimit,
    asyncRoute(async (request, response) => {
      const code = typeof request.body?.code === 'string' ? request.body.code : '';
      const token = takeExchange(code);
      const auth = token ? readToken(token) : null;
      const user = auth ? await store.findUserById(auth.sub) : null;
      if (!token || !user) {
        response.status(401).json({ error: 'Mã đăng nhập đã hết hạn.' });
        return;
      }
      response.json({ token, user: toPublicUser(user) });
    }),
  );

  const socialCallback = asyncRoute(async (request, response) => {
    const source = { ...request.query, ...request.body } as Record<string, unknown>;
    const state = typeof source.state === 'string' ? source.state : '';
    const pending = state ? takeState(state) : null;
    const fail = (message: string) => {
      if (!pending) {
        response.status(400).json({ error: message });
        return;
      }
      const back = new URL(pending.returnTo);
      back.searchParams.set(pending.mode === 'link' ? 'link_error' : 'auth_error', message);
      response.redirect(back.toString());
    };
    if (!pending) {
      fail('Phiên đăng nhập mạng xã hội đã hết hạn.');
      return;
    }
    try {
      const identity = await identityFromCallback(pending, source, source);
      if (pending.mode === 'link') {
        if (!pending.userId) throw new Error('Không có tài khoản để liên kết.');
        const linked = await store.linkProvider(pending.userId, { provider: identity.provider, subject: identity.subject }, identity.email);
        if (linked === 'taken') throw new Error('Tài khoản mạng xã hội này đã được dùng.');
        if (linked === 'email_used') throw new Error('Email này đã thuộc một tài khoản khác.');
        if (linked !== 'linked') throw new Error('Không liên kết được tài khoản.');
        const back = new URL(pending.returnTo);
        back.searchParams.set('linked', identity.provider);
        response.redirect(back.toString());
        return;
      }
      let account = await store.findUserByProvider(identity.provider, identity.subject);
      if (!account && identity.email) {
        const byEmail = await store.findUserByEmail(identity.email);
        if (byEmail) {
          fail('Email này đã có tài khoản. Hãy đăng nhập rồi liên kết trong Cài đặt.');
          return;
        }
      }
      if (!account) {
        account = await store.createUser({
          username: await uniqueUsername(store, identity.name),
          email: identity.email?.toLowerCase() ?? `${identity.provider}.${identity.subject}@players.local`,
          passwordHash: await hashPassword(randomUUID()),
          providers: [{ provider: identity.provider, subject: identity.subject }],
        });
      }
      const token = await issueSession(store, toPublicUser(account));
      const back = new URL(pending.returnTo);
      back.searchParams.set('auth_code', parkExchange(token));
      response.redirect(back.toString());
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Không đăng nhập được.');
    }
  });
  app.get('/api/auth/social/callback', socialCallback);
  app.post('/api/auth/social/callback', socialCallback);

  app.get(
    '/api/me',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request, response);
      if (!user) return;
      response.json({ user: toPublicUser(user) });
    }),
  );

  app.get(
    '/api/characters/me',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request, response);
      if (!user) return;
      const character = await store.findCharacterByUserId(user.id);
      response.json({ character });
    }),
  );

  app.put(
    '/api/characters/me',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request, response);
      if (!user) return;
      const parsed = characterSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: 'Thông tin nhân vật chưa hợp lệ.' });
        return;
      }
      const character = await store.upsertCharacter(user.id, parsed.data);
      response.json({ character });
    }),
  );

  app.get(
    '/api/saves/me',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request, response);
      if (!user) return;
      response.json({ save: await store.findAdventure(user.id) });
    }),
  );

  app.put(
    '/api/saves/me',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request, response);
      if (!user) return;
      const parsed = saveSchema.safeParse(coerceSaveInput(request.body));
      if (!parsed.success) {
        response.status(400).json({ error: saveIssue(parsed.error) });
        return;
      }
      const result = await store.saveAdventure(user.id, parsed.data);
      response.json(result);
    }),
  );

  app.get('/api/tournaments', (_request, response) => {
    response.json({ tournaments: board.summary() });
  });

  app.get('/api/tournaments/:id', (request, response) => {
    const cup = board.detail(request.params.id);
    if (!cup) {
      response.status(404).json({ error: 'Không tìm thấy giải.' });
      return;
    }
    response.json({
      ...toPublicCup(cup),
      entrants: cup.entrants,
      matches: cup.matches,
    });
  });

  app.post(
    '/api/tournaments/:id/enter',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request, response);
      if (!user) return;
      const character = await store.findCharacterByUserId(user.id);
      if (!character) {
        response.status(400).json({ error: 'Hãy tạo nhân vật trước khi ghi danh.' });
        return;
      }
      const result = board.enter(request.params.id, character, user.username);
      if (result.error || !result.cup) {
        response.status(400).json({ error: result.error ?? 'Không ghi danh được.' });
        return;
      }
      response.json({
        ...toPublicCup(result.cup),
        entrants: result.cup.entrants,
        matches: result.cup.matches,
      });
    }),
  );

  app.post(
    '/api/tournaments/:id/simulate',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request, response);
      if (!user) return;
      const preview = board.simulate(request.params.id, user.username);
      if (!preview) {
        response.status(404).json({ error: 'Không tìm thấy giải.' });
        return;
      }
      response.json(preview);
    }),
  );

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    console.error('[Game Thư Giãn] request failed', error);
    response.status(500).json({ error: 'Máy chủ gặp lỗi. Hãy thử lại.' });
  });

  return app;
}

function toPublicCup(cup: Cup) {
  return {
    id: cup.id,
    kind: cup.kind,
    region: cup.region,
    tier: cup.tier,
    nameVi: cup.nameVi,
    startsAt: cup.startsAt,
    registrationOpensAt: cup.registrationOpensAt,
    status: cup.status,
    entrantCount: cup.entrants.length,
    championName: cup.champion?.username ?? null,
    rewardTitle: cup.rewardTitle,
  };
}

async function uniqueUsername(store: AccountStore, name: string): Promise<string> {
  const base = name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 12) || 'nguoi';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}_${randomUUID().slice(0, 4)}`.slice(0, 20);
    if (!(await store.findUserByUsername(candidate))) return candidate;
  }
  return `nguoi_${randomUUID().slice(0, 8)}`;
}

function providerLabel(provider: string): string {
  if (provider === 'google') return 'Google';
  if (provider === 'apple') return 'Apple';
  return 'Facebook';
}

async function userFromRequest(store: AccountStore, request: Request, response: Response) {
  const header = request.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const auth = token ? readToken(token) : null;
  const user = auth ? await store.findUserById(auth.sub) : null;
  if (!auth || !user) {
    response.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực.' });
    return null;
  }
  if (acceptToken(user.id, token, auth.sid, user.sessionId) === 'replaced') {
    response.status(401).json({ error: SESSION_REPLACED_MESSAGE, code: SESSION_REPLACED_CODE });
    return null;
  }
  return user;
}
