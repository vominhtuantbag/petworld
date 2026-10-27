/**
 * Phone and web builds call the Render service.
 * `npx expo export -p web` inlines EXPO_PUBLIC_* from .env.production.
 * Set EXPO_PUBLIC_API_URL in .env.local to reach a machine on your desk
 * (Android emulator: http://10.0.2.2:4000).
 *
 * A production page (petwar.vercel.app) never keeps a localhost socket URL.
 * That mis-build would connect to the player's own machine and hide everyone else.
 */
const RENDER_URL = 'https://petworld-rqyo.onrender.com';

function isLoopback(url: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(url);
}

function pageIsLocal(): boolean {
  const host = typeof window === 'undefined' ? '' : window.location?.hostname ?? '';
  if (!host) return true;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

function resolvePublicUrl(configured: string | undefined): string {
  const value = configured?.trim();
  if (value && !(isLoopback(value) && !pageIsLocal())) return value.replace(/\/$/, '');
  return RENDER_URL;
}

export const API_URL = resolvePublicUrl(process.env.EXPO_PUBLIC_API_URL);
export const SOCKET_URL = resolvePublicUrl(process.env.EXPO_PUBLIC_SOCKET_URL ?? process.env.EXPO_PUBLIC_API_URL);
