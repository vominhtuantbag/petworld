const KEY = 'game-thu-gian.client-id';

let runtimeId = '';

/**
 * Stable id for this browser tab / app process. Reconnects and React Strict
 * Mode remounts reuse it. A second tab or device gets a different value, so
 * the server can tell a handshake retry from a real second login.
 */
export function clientInstanceId(): string {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const existing = sessionStorage.getItem(KEY);
      if (existing) return existing;
      const next = newId();
      sessionStorage.setItem(KEY, next);
      return next;
    }
  } catch {
    // Fall through to an in-memory id for this JS runtime.
  }
  if (!runtimeId) runtimeId = newId();
  return runtimeId;
}

function newId(): string {
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
