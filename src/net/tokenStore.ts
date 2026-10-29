import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const TOKEN_KEY = 'game-thu-gian.token';
const KEY = TOKEN_KEY;

/**
 * Native builds keep the JWT in the OS keystore via SecureStore.
 * Web has no keystore in the browser, so the token stays in localStorage
 * for this foundation. Do not put the password itself in either place.
 */

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage()?.setItem(KEY, token);
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return webStorage()?.getItem(KEY) ?? null;
  }
  return SecureStore.getItemAsync(KEY);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    webStorage()?.removeItem(KEY);
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}

/** Subject of a JWT, used only to keep a cached profile from attaching to another account. */
export function tokenSubject(token: string): string | null {
  const part = token.split('.')[1];
  if (!part || typeof globalThis.atob !== 'function') return null;
  try {
    const json = JSON.parse(globalThis.atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: unknown };
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}

function webStorage(): Storage | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  return localStorage;
}
