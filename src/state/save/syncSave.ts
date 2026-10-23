import { ApiError, fetchMySave, putMySave } from '../../net/api';
import { isNewerSave, parseSave, type GameSave } from './gameSave';
import { readLocalSave, writeLocalSave } from './localSave';

/**
 * Picks the newer of the device copy and the server copy.
 * A network failure keeps the local document so a reload still restores progress.
 */
export async function loadGameSave(userId: string, token: string | null): Promise<{ save: GameSave | null; synced: boolean }> {
  const local = await readLocalSave(userId);
  let remote: GameSave | null = null;
  if (token) {
    try {
      remote = parseSave(await fetchMySave(token));
    } catch (error) {
      console.warn('[Game Thư Giãn] Chưa tải được bản lưu từ máy chủ.', error);
    }
  }
  const winner = local && remote ? (isNewerSave(local, remote) ? local : remote) : (local ?? remote);
  let synced = !token || !winner || winner === remote;
  if (winner && token && winner !== remote) {
    try {
      const body = await putMySave(token, winner);
      synced = body.accepted;
    } catch (error) {
      synced = false;
      console.warn('[Game Thư Giãn] Chưa đẩy được bản lưu mới hơn lên máy chủ.', error);
    }
  }
  if (winner && winner !== local) {
    try {
      await writeLocalSave(userId, winner);
    } catch (error) {
      console.warn('[Game Thư Giãn] Không ghi được bản lưu máy chủ xuống máy.', error);
    }
  }
  return { save: winner, synced };
}

let syncWarningShown = false;

export async function commitGameSave(userId: string, token: string | null, save: GameSave): Promise<boolean> {
  try {
    await writeLocalSave(userId, save);
  } catch (error) {
    console.warn('[Game Thư Giãn] Không ghi được bản lưu trên máy.', error);
    return false;
  }
  if (!token) return true;
  try {
    const body = await putMySave(token, save);
    const remote = parseSave(body.save);
    syncWarningShown = false;
    if (!body.accepted && remote && isNewerSave(remote, save)) return true;
    return body.accepted;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    if (!syncWarningShown) {
      syncWarningShown = true;
      const detail = error instanceof Error ? error.message : 'lỗi không rõ';
      console.warn(`[Game Thư Giãn] Chưa đồng bộ được máy chủ (${status}). Bản lưu vẫn nằm trên máy.`, detail);
    }
    return status === 400;
  }
}
