import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PublicUser, ServerCharacter } from '../../net/protocol';

const KEY = 'game-thu-gian.session';

export type SessionCache = {
  user: PublicUser;
  character: ServerCharacter | null;
};

/** Lets a reload restore the last account when the server cannot be reached. */
export async function readSessionCache(): Promise<SessionCache | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SessionCache>;
    if (!data.user || typeof data.user.id !== 'string' || typeof data.user.email !== 'string') return null;
    return { user: data.user, character: data.character ?? null };
  } catch (error) {
    console.warn('[Game Thư Giãn] Không đọc được phiên đã lưu.', error);
    return null;
  }
}

export async function writeSessionCache(cache: SessionCache): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[Game Thư Giãn] Không ghi được phiên.', error);
  }
}

export async function clearSessionCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (error) {
    console.warn('[Game Thư Giãn] Không xóa được phiên.', error);
  }
}
