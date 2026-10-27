import { useEffect, useState } from 'react';

const KEY = 'game-thu-gian.grid';

let shown = readInitial();
const listeners = new Set<(value: boolean) => void>();

function readInitial(): boolean {
  try {
    if (typeof sessionStorage === 'undefined') return true;
    const raw = sessionStorage.getItem(KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    // A blocked session store still starts with the grid visible.
  }
  return true;
}

function remember(value: boolean) {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    // The in-memory value still lasts for this visit.
  }
}

export function mapGridShown(): boolean {
  return shown;
}

export function setMapGridShown(value: boolean) {
  shown = value;
  remember(value);
  for (const listener of listeners) listener(shown);
}

export function subscribeMapGrid(listener: (value: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Grid visibility for this visit. A reload in the same tab keeps the choice. */
export function useMapGrid(): readonly [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(shown);
  useEffect(() => subscribeMapGrid(setValue), []);
  return [value, setMapGridShown];
}
