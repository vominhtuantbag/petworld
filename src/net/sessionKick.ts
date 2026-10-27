const KICKED_TOKEN = 'game-thu-gian.kicked-token';

/** This tab must not resume a token that another tab already replaced. */
export function rememberKickedToken(token: string) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(KICKED_TOKEN, token);
  } catch {
    // The in-memory logout still sends this tab back to login.
  }
}

export function kickedToken(): string | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(KICKED_TOKEN);
  } catch {
    return null;
  }
}

export function forgetKickedToken() {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(KICKED_TOKEN);
  } catch {
    // A missing mark just lets the next login proceed.
  }
}

type Listener = (token: string) => void;

const listeners = new Set<Listener>();

/** Fired when this device's token was replaced by a login somewhere else. */
export function onSessionReplaced(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function reportSessionReplaced(token: string) {
  for (const listener of listeners) listener(token);
}
