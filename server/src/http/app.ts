import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { z } from 'zod';

import { hashPassword, readToken, signToken, verifyPassword } from '../auth/tokens.js';
import { AVATAR_IDS, REGION_IDS } from '../catalog.js';
import { config } from '../config.js';
import type { AccountStore } from '../domain.js';
import { toPublicUser } from '../domain.js';
import { TournamentBoard, type Cup } from '../tournament/board.js';
import { saveSchema } from '../saves/schema.js';

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
      response.status(201).json({ token: signToken(publicUser), user: publicUser });
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
      response.json({ token: signToken(publicUser), user: publicUser });
    }),
  );

  app.get(
    '/api/me',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request);
      if (!user) {
        response.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực.' });
        return;
      }
      response.json({ user: toPublicUser(user) });
    }),
  );

  app.get(
    '/api/characters/me',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request);
      if (!user) {
        response.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực.' });
        return;
      }
      const character = await store.findCharacterByUserId(user.id);
      response.json({ character });
    }),
  );

  app.put(
    '/api/characters/me',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request);
      if (!user) {
        response.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực.' });
        return;
      }
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
      const user = await userFromRequest(store, request);
      if (!user) {
        response.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực.' });
        return;
      }
      response.json({ save: await store.findAdventure(user.id) });
    }),
  );

  app.put(
    '/api/saves/me',
    asyncRoute(async (request, response) => {
      const user = await userFromRequest(store, request);
      if (!user) {
        response.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực.' });
        return;
      }
      const parsed = saveSchema.safeParse(request.body?.save);
      if (!parsed.success) {
        response.status(400).json({ error: 'Bản lưu không hợp lệ.' });
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
      const user = await userFromRequest(store, request);
      if (!user) {
        response.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực.' });
        return;
      }
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
      const user = await userFromRequest(store, request);
      if (!user) {
        response.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực.' });
        return;
      }
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

async function userFromRequest(store: AccountStore, request: Request) {
  const header = request.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const auth = token ? readToken(token) : null;
  if (!auth) return null;
  return store.findUserById(auth.sub);
}
