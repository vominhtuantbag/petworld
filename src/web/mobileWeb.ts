import { Platform } from 'react-native';

/** Phone field of view. A smaller value pulls the camera back. */
export const MOBILE_WORLD_ZOOM = 0.6;

/** Phones and tablets that browse as a mobile device, including iPadOS desktop UA. */
export function isMobileWeb(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent ?? '';
  const touch = navigator.maxTouchPoints > 1;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && touch;
}

/**
 * Desktop web keeps one world pixel per screen pixel on a wide window.
 * A phone browser has that same camera on a short window, so the map looks
 * cropped. Handsets use the native zoom, which pulls the camera back.
 */
export function worldZoom(): number {
  if (Platform.OS !== 'web') return MOBILE_WORLD_ZOOM;
  if (!isMobileWeb() || typeof window === 'undefined') return 1;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  return shortSide < 520 ? MOBILE_WORLD_ZOOM : 1;
}
