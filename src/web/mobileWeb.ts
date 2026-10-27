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
 * Web PC and web mobile use the same wide camera as the native app.
 * The value does not depend on the window size, so a desktop browser is not
 * cropped tighter than a phone.
 */
export function worldZoom(): number {
  return MOBILE_WORLD_ZOOM;
}
