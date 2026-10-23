import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'game-thu-gian.token';

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

function webStorage(): Storage | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  return localStorage;
}
