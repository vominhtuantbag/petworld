import 'dotenv/config';

/**
 * Local runs read server/.env through dotenv. Render injects the same
 * names into process.env, and dotenv does not override those values.
 */

const DEV_JWT_SECRET = 'dev-only-change-me-please-use-a-long-random-string';

function envText(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readPort(): number {
  const raw = envText('PORT');
  if (!raw) return 4000;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be an integer from 0 to 65535. Received "${raw}".`);
  }
  return port;
}

const jwtSecret = envText('JWT_SECRET') ?? DEV_JWT_SECRET;
const production = process.env.NODE_ENV === 'production';

if (production && jwtSecret === DEV_JWT_SECRET) {
  throw new Error('Set JWT_SECRET before running in production.');
}

export const config = {
  port: readPort(),
  driver: envText('DB_DRIVER') === 'mongo' ? 'mongo' : 'file',
  mongoUri: envText('MONGODB_URI') ?? 'mongodb://127.0.0.1:27017/game-thu-gian',
  jwtSecret,
  jwtExpiresIn: envText('JWT_EXPIRES_IN') ?? '7d',
  corsOrigin: envText('CORS_ORIGIN') ?? '*',
  bcryptRounds: production ? 12 : 10,
  production,
  publicUrl: envText('PUBLIC_URL'),
  googleClientId: envText('GOOGLE_CLIENT_ID'),
  googleClientSecret: envText('GOOGLE_CLIENT_SECRET'),
  facebookAppId: envText('FACEBOOK_APP_ID'),
  facebookAppSecret: envText('FACEBOOK_APP_SECRET'),
  appleClientId: envText('APPLE_CLIENT_ID'),
} as const;
