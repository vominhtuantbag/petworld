import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { parseSave, type GameSave } from './gameSave';

const PREFIX = 'game-thu-gian.save.v1.';

/** Offline copy for one account. A bad blob is ignored so the next launch can still boot. */
export async function readLocalSave(userId: string): Promise<GameSave | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + userId);
    if (!raw) return null;
    return parseSave(raw);
  } catch (error) {
    console.warn('[Game Thư Giãn] Không đọc được bản lưu trên máy.', error);
    return null;
  }
}

export async function writeLocalSave(userId: string, save: GameSave): Promise<void> {
  const raw = JSON.stringify(save);
  writeLocalSaveNow(userId, raw);
  await AsyncStorage.setItem(PREFIX + userId, raw);
}

/** Web unload does not wait for AsyncStorage's promise. localStorage writes in this turn. */
export function writeLocalSaveNow(userId: string, raw: string): void {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + userId, raw);
  } catch (error) {
    console.warn('[Game Thư Giãn] Không ghi được bản lưu trên máy.', error);
  }
}
