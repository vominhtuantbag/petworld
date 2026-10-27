import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import type { PublicUser } from '../domain.js';

export type AuthToken = {
  sub: string;
  username: string;
  sid: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.bcryptRounds);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(user: PublicUser, sid: string): string {
  const payload: AuthToken = { sub: user.id, username: user.username, sid };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function readToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') return null;
    const username = typeof decoded.username === 'string' ? decoded.username : '';
    const sid = typeof decoded.sid === 'string' ? decoded.sid : '';
    return { sub: decoded.sub, username, sid };
  } catch {
    return null;
  }
}
