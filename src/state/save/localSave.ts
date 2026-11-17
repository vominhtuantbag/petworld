import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { parsePetBackup, parseSave, preferSave, withOwnedPets, type GameSave } from './gameSave';

const PREFIX = 'game-thu-gian.save.v1.';
const LATEST = 'game-thu-gian.save.latest';
const PETS = 'game-thu-gian.pets.v1.';

type LatestSave = { userId: string; save: GameSave };

function userKey(userId: string): string {
  return PREFIX + userId;
}

/**
 * Web can read localStorage in the same turn as startup. Native waits for
 * AsyncStorage, which `readLocalSave` does before any server call.
 */
export function readLocalSaveSync(userId: string): GameSave | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    return keepPets(userId, richer(parseSave(storage.getItem(userKey(userId))), backupFor(userId, storage.getItem(LATEST))), storage);
  } catch (error) {
    console.warn('[Game Thư Giãn] Không đọc được bản lưu trên máy.', error);
    return null;
  }
}

/** Offline copy for one account. A bad blob is ignored so the next launch can still boot. */
export async function readLocalSave(userId: string): Promise<GameSave | null> {
  const quick = readLocalSaveSync(userId);
  try {
    const own = parseSave(await AsyncStorage.getItem(userKey(userId)));
    const latestRaw = await AsyncStorage.getItem(LATEST);
    const merged = keepPets(userId, richer(richer(quick, own), backupFor(userId, latestRaw)), browserStorage());
    const petRaw = await AsyncStorage.getItem(PETS + userId);
    const pets = parsePetBackup(petRaw ? JSON.parse(petRaw) : null);
    return merged && pets ? withOwnedPets(merged, pets.roster, pets.petVault) : merged;
  } catch (error) {
    console.warn('[Game Thư Giãn] Không đọc được bản lưu trên máy.', error);
    return quick;
  }
}

/** Newest adventure on this device, even if it was stored for an older account id. */
export async function readDeviceSave(): Promise<GameSave | null> {
  const quick = browserStorage()?.getItem(LATEST) ?? null;
  try {
    const raw = quick ?? (await AsyncStorage.getItem(LATEST));
    return parseLatest(raw)?.save ?? null;
  } catch (error) {
    console.warn('[Game Thư Giãn] Không đọc được bản lưu trên máy.', error);
    return parseLatest(quick)?.save ?? null;
  }
}

export async function writeLocalSave(userId: string, save: GameSave): Promise<void> {
  const raw = JSON.stringify(save);
  const packed = JSON.stringify({ userId, save } satisfies LatestSave);
  writeRawNow(userKey(userId), raw);
  writeRawNow(LATEST, packed);
  const pets = JSON.stringify({ roster: save.roster, petVault: save.inventory.petVault ?? [] });
  writeRawNow(PETS + userId, pets);
  await AsyncStorage.setItem(userKey(userId), raw);
  await AsyncStorage.setItem(LATEST, packed);
  await AsyncStorage.setItem(PETS + userId, pets);
}

/** Web unload does not wait for AsyncStorage's promise. localStorage writes in this turn. */
export function writeLocalSaveNow(userId: string, raw: string): void {
  writeRawNow(userKey(userId), raw);
  try {
    const save = parseSave(raw);
    if (save) {
      writeRawNow(LATEST, JSON.stringify({ userId, save } satisfies LatestSave));
      writeRawNow(PETS + userId, JSON.stringify({ roster: save.roster, petVault: save.inventory.petVault ?? [] }));
    }
  } catch (error) {
    console.warn('[Game Thư Giãn] Không ghi được bản lưu trên máy.', error);
  }
}

function writeRawNow(key: string, raw: string): void {
  const storage = browserStorage();
  if (!storage) return;
  try {
    storage.setItem(key, raw);
  } catch (error) {
    console.warn('[Game Thư Giãn] Không ghi được bản lưu trên máy.', error);
  }
}

function richer(left: GameSave | null, right: GameSave | null): GameSave | null {
  if (!left) return right;
  if (!right) return left;
  return preferSave(left, right);
}

function keepPets(userId: string, save: GameSave | null, storage: Storage | null): GameSave | null {
  if (!save || !storage) return save;
  let extra: unknown = null;
  try {
    extra = JSON.parse(storage.getItem(PETS + userId) ?? 'null');
  } catch {
    return save;
  }
  const pets = parsePetBackup(extra);
  if (!pets) return save;
  return withOwnedPets(save, pets.roster, pets.petVault);
}

function backupFor(userId: string, raw: string | null): GameSave | null {
  const latest = parseLatest(raw);
  return latest?.userId === userId ? latest.save : null;
}

function parseLatest(raw: string | null): LatestSave | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { userId?: unknown; save?: unknown };
    const save = parseSave(data.save ?? data);
    if (!save || typeof data.userId !== 'string') return null;
    return { userId: data.userId, save };
  } catch {
    return null;
  }
}

function browserStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  return localStorage;
}
