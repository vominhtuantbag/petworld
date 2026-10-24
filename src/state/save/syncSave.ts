import { ApiError, fetchMySave, putMySave } from '../../net/api';
import { parseSave, progressScore, toServerSave, type GameSave } from './gameSave';
import { writeLocalSave } from './localSave';

/**
 * Server copy, or null when Render is asleep, reset, or still starting.
 * Callers apply the AsyncStorage document before awaiting this.
 */
export async function fetchRemoteSave(token: string | null): Promise<GameSave | null> {
  if (!token) return null;
  try {
    return parseSave(await fetchMySave(token));
  } catch (error) {
    console.warn('[Game Thư Giãn] Chưa tải được bản lưu từ máy chủ.', error);
    return null;
  }
}

let syncWarningShown = false;

export async function commitGameSave(userId: string, token: string | null, save: GameSave): Promise<boolean> {
  const local = toServerSave(save);
  try {
    await writeLocalSave(userId, save);
  } catch (error) {
    console.warn('[Game Thư Giãn] Không ghi được bản lưu trên máy.', error);
    return false;
  }
  if (!token) return true;
  try {
    const body = await putMySave(token, local);
    syncWarningShown = false;
    if (body.accepted) return true;
    const remote = parseSave(body.save);
    if (remote && progressScore(remote) > progressScore(save)) return true;
    const retry: GameSave = {
      ...save,
      updatedAt: new Date().toISOString(),
      revision: (remote?.revision ?? save.revision) + 1,
    };
    const again = await putMySave(token, toServerSave(retry));
    if (again.accepted) await writeLocalSave(userId, retry);
    return again.accepted;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    if (!syncWarningShown) {
      syncWarningShown = true;
      const detail = error instanceof Error ? error.message : 'lỗi không rõ';
      console.warn(`[Game Thư Giãn] Chưa đồng bộ được máy chủ (${status}). Bản lưu vẫn nằm trên máy.`, detail);
    }
    return false;
  }
}
