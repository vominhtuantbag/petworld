import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { OVERWORLD_BGM_DEFAULT_VOLUME } from './tracks';

const STORAGE_KEY = 'game-thu-gian.audio-settings.v1';

export type AudioSettings = {
  /** Master mute for background music beds. */
  bgmMuted: boolean;
  /** BGM gain 0–1 (applied when not muted). */
  bgmVolume: number;
  /** Master mute for short SFX / beeps. */
  sfxMuted: boolean;
};

const DEFAULTS: AudioSettings = {
  bgmMuted: false,
  bgmVolume: OVERWORLD_BGM_DEFAULT_VOLUME,
  sfxMuted: false,
};

let snapshot: AudioSettings = { ...DEFAULTS };
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULTS.bgmVolume;
  return Math.max(0, Math.min(1, value));
}

async function persist(next: AudioSettings) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* Settings are best-effort. */
  }
}

export async function hydrateAudioSettings(): Promise<AudioSettings> {
  if (hydrated) return snapshot;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AudioSettings>;
      snapshot = {
        bgmMuted: Boolean(parsed.bgmMuted),
        bgmVolume: clampVolume(typeof parsed.bgmVolume === 'number' ? parsed.bgmVolume : DEFAULTS.bgmVolume),
        sfxMuted: Boolean(parsed.sfxMuted),
      };
    }
  } catch {
    snapshot = { ...DEFAULTS };
  }
  hydrated = true;
  emit();
  return snapshot;
}

export function getAudioSettings(): AudioSettings {
  return snapshot;
}

export function setBgmMuted(muted: boolean) {
  snapshot = { ...snapshot, bgmMuted: muted };
  emit();
  void persist(snapshot);
}

export function setBgmVolume(volume: number) {
  snapshot = { ...snapshot, bgmVolume: clampVolume(volume) };
  emit();
  void persist(snapshot);
}

export function setSfxMuted(muted: boolean) {
  snapshot = { ...snapshot, sfxMuted: muted };
  emit();
  void persist(snapshot);
}

export function toggleBgmMuted() {
  setBgmMuted(!snapshot.bgmMuted);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reactive audio prefs for UI + BGM hooks. */
export function useAudioSettings(): AudioSettings {
  useEffect(() => {
    void hydrateAudioSettings();
  }, []);
  return useSyncExternalStore(subscribe, getAudioSettings, getAudioSettings);
}
