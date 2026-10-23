import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { getCharacter, type CharacterDefinition } from '../data/characters';

const KEY = 'game-thu-gian.avatar-look';
const listeners = new Set<(look: AvatarLook) => void>();

export type AvatarLook = { kind: 'preset'; characterId: string } | { kind: 'custom'; uri: string };

/**
 * Profile picture only. The saved look never changes class, stats, or the
 * sprite on the map. Native keeps a short record in SecureStore and the
 * uploaded file in the documents folder. Web keeps a small image in localStorage.
 */

export function useAvatarLook(fallbackId: string | null | undefined): {
  portrait: CharacterDefinition | null;
  customUri: string | null;
  choosePreset: (characterId: string) => void;
  chooseImage: (uri: string) => Promise<void>;
} {
  const [look, setLook] = useState<AvatarLook | null>(null);

  useEffect(() => {
    let live = true;
    void readAvatarLook().then((saved) => {
      if (live && saved) setLook(saved);
    });
    return () => {
      live = false;
    };
  }, []);

  const choosePreset = useCallback((characterId: string) => {
    if (!getCharacter(characterId)) return;
    const next: AvatarLook = { kind: 'preset', characterId };
    setLook(next);
    void writeAvatarLook(next);
  }, []);

  const chooseImage = useCallback(async (uri: string) => {
    const stored = await persistPickedImage(uri);
    const next: AvatarLook = { kind: 'custom', uri: stored };
    setLook(next);
    await writeAvatarLook(next);
  }, []);

  const portrait = look?.kind === 'preset' ? getCharacter(look.characterId) : look?.kind === 'custom' ? null : getCharacter(fallbackId);
  return {
    portrait: portrait ?? null,
    customUri: look?.kind === 'custom' ? look.uri : null,
    choosePreset,
    chooseImage,
  };
}

export function subscribeAvatarLook(listener: (look: AvatarLook) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function readAvatarLook(): Promise<AvatarLook | null> {
  const raw = Platform.OS === 'web' ? webStorage()?.getItem(KEY) ?? null : await SecureStore.getItemAsync(KEY);
  return parseLook(raw);
}

export async function writeAvatarLook(look: AvatarLook): Promise<void> {
  const raw = JSON.stringify(look);
  if (Platform.OS === 'web') {
    webStorage()?.setItem(KEY, raw);
  } else {
    await SecureStore.setItemAsync(KEY, raw);
  }
  for (const listener of listeners) listener(look);
}

function parseLook(raw: string | null): AvatarLook | null {
  if (!raw) return null;
  if (getCharacter(raw)) return { kind: 'preset', characterId: raw };
  try {
    const data = JSON.parse(raw) as { kind?: string; characterId?: string; uri?: string };
    if (data.kind === 'preset' && data.characterId && getCharacter(data.characterId)) {
      return { kind: 'preset', characterId: data.characterId };
    }
    if (data.kind === 'custom' && data.uri) return { kind: 'custom', uri: data.uri };
  } catch {
    return null;
  }
  return null;
}

async function persistPickedImage(uri: string): Promise<string> {
  if (Platform.OS === 'web') return shrinkWebImage(uri);
  const { File, Paths } = await import('expo-file-system');
  const dest = new File(Paths.document, 'profile-avatar.jpg');
  await new File(uri).copy(dest, { overwrite: true });
  return dest.uri;
}

function shrinkWebImage(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(uri);
        return;
      }
      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.72));
    };
    image.onerror = () => reject(new Error('image'));
    image.src = uri;
  });
}

function webStorage(): Storage | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  return localStorage;
}
