const TAB_KEY = 'game-thu-gian.client-id';

let runtimeId = '';

/**
 * Unique id for this browser tab / app process. Reconnects and React Strict
 * Mode remounts reuse it. A second tab gets a different sessionStorage value.
 * Never returns empty — an empty id made the server treat a handshake retry
 * as another device.
 */
export function clientInstanceId(): string {
  if (runtimeId) return runtimeId;
  const stored = readTabId();
  if (stored) {
    runtimeId = stored;
    return stored;
  }
  const next = newId();
  runtimeId = next;
  writeTabId(next);
  return next;
}

function readTabId(): string {
  try {
    if (typeof sessionStorage === 'undefined') return '';
    const existing = sessionStorage.getItem(TAB_KEY)?.trim() ?? '';
    return existing;
  } catch {
    return '';
  }
}

function writeTabId(id: string) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(TAB_KEY, id);
  } catch {
    // In-memory runtimeId still keeps this JS runtime stable.
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `tab-${crypto.randomUUID()}`;
  }
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
