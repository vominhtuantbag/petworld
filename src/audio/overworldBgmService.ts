import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

import { getAudioSettings } from './audioSettings';
import type { BgmRegionKey } from './bgmRegions';
import { OVERWORLD_BGM_DEFAULT_VOLUME } from './defaults';
import { cancelFade, fadeVolume, type FadeHandle } from './fade';

const CROSSFADE_MS = 900;
const FADE_OUT_MS = 500;
const FADE_IN_MS = 650;

type Slot = 'a' | 'b';
type AudioSource = number | { uri: string };

/** Minimal player surface used by the fade helper. */
type AudioPlayer = {
  volume: number;
  loop: boolean;
  playing: boolean;
  play: () => void;
  pause: () => void;
  replace: (source: AudioSource) => void;
  remove: () => void;
};

type ExpoAudioModule = {
  createAudioPlayer: (source: AudioSource) => AudioPlayer;
  setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
};

/**
 * Dual-deck overworld BGM.
 * Dynamic-imports `expo-audio` after first paint so splash stays light.
 * Android release resolves bundled MP3s through expo-asset URIs.
 * Background media service stays off (see app.json expo-audio plugin).
 */
class OverworldBgmService {
  private deckA: AudioPlayer | null = null;
  private deckB: AudioPlayer | null = null;
  private keyA: BgmRegionKey | null = null;
  private keyB: BgmRegionKey | null = null;
  private active: Slot = 'a';
  private currentKey: BgmRegionKey | null = null;
  private desiredKey: BgmRegionKey | null = null;
  private exploration = false;
  private primed = false;
  private fadeA: FadeHandle | null = null;
  private fadeB: FadeHandle | null = null;
  private seq = 0;
  private disposed = false;
  private audio: ExpoAudioModule | null = null;
  private sources: Record<BgmRegionKey, number> | null = null;
  private resolved = new Map<BgmRegionKey, AudioSource>();
  private disabled = false;

  private targetVolume(): number {
    const settings = getAudioSettings();
    if (settings.bgmMuted) return 0;
    return Math.max(0, Math.min(1, settings.bgmVolume || OVERWORLD_BGM_DEFAULT_VOLUME));
  }

  private cancelFades() {
    cancelFade(this.fadeA);
    cancelFade(this.fadeB);
    this.fadeA = null;
    this.fadeB = null;
  }

  private async ensureAudio(): Promise<boolean> {
    if (this.disabled) return false;
    if (this.audio && this.sources) return true;
    try {
      const [expoAudio, tracks] = await Promise.all([import('expo-audio'), import('./tracks')]);
      this.audio = expoAudio as unknown as ExpoAudioModule;
      this.sources = tracks.OVERWORLD_BGM_SOURCES as Record<BgmRegionKey, number>;
      return true;
    } catch (error) {
      console.warn('[Game Thư Giãn] Overworld BGM unavailable.', error);
      this.disabled = true;
      return false;
    }
  }

  /** Android release builds often need a file URI instead of a raw module id. */
  private async resolveSource(key: BgmRegionKey): Promise<AudioSource | null> {
    if (!this.sources) return null;
    const cached = this.resolved.get(key);
    if (cached) return cached;
    const moduleId = this.sources[key];
    if (Platform.OS !== 'android' || typeof __DEV__ !== 'undefined' && __DEV__) {
      this.resolved.set(key, moduleId);
      return moduleId;
    }
    try {
      const asset = Asset.fromModule(moduleId);
      if (!asset.localUri) await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      const source: AudioSource = uri ? { uri } : moduleId;
      this.resolved.set(key, source);
      return source;
    } catch (error) {
      console.warn('[Game Thư Giãn] BGM asset resolve failed.', key, error);
      this.resolved.set(key, moduleId);
      return moduleId;
    }
  }

  private async ensureMode() {
    if (this.primed || !this.audio) return;
    try {
      await this.audio.setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldPlayInBackground: false,
      });
    } catch {
      /* ignore */
    }
    this.primed = true;
  }

  private pauseDeck(player: AudioPlayer | null) {
    if (!player) return;
    try {
      player.pause();
    } catch {
      /* ignore */
    }
    try {
      player.volume = 0;
    } catch {
      /* ignore */
    }
  }

  private async obtain(slot: Slot, key: BgmRegionKey): Promise<AudioPlayer | null> {
    if (!this.audio) return null;
    const source = await this.resolveSource(key);
    if (!source) return null;
    try {
      if (slot === 'a') {
        if (!this.deckA) this.deckA = this.audio.createAudioPlayer(source);
        else if (this.keyA !== key) {
          try {
            this.deckA.replace(source);
          } catch {
            /* ignore */
          }
        }
        this.keyA = key;
        this.deckA.loop = true;
        return this.deckA;
      }
      if (!this.deckB) this.deckB = this.audio.createAudioPlayer(source);
      else if (this.keyB !== key) {
        try {
          this.deckB.replace(source);
        } catch {
          /* ignore */
        }
      }
      this.keyB = key;
      this.deckB.loop = true;
      return this.deckB;
    } catch (error) {
      console.warn('[Game Thư Giãn] Overworld BGM deck failed.', error);
      if (slot === 'a') {
        this.deckA = null;
        this.keyA = null;
      } else {
        this.deckB = null;
        this.keyB = null;
      }
      return null;
    }
  }

  private play(player: AudioPlayer) {
    try {
      player.play();
    } catch {
      /* Web autoplay may wait for a gesture. */
    }
  }

  private activePlayer(): AudioPlayer | null {
    return this.active === 'a' ? this.deckA : this.deckB;
  }

  sync(key: BgmRegionKey | null, exploration: boolean) {
    if (this.disabled) return;
    this.disposed = false;
    this.desiredKey = key;
    this.exploration = exploration;
    void this.apply();
  }

  refreshGain() {
    if (this.disabled) return;
    void this.apply();
  }

  softStop() {
    this.exploration = false;
    this.cancelFades();
    this.pauseDeck(this.deckA);
    this.pauseDeck(this.deckB);
  }

  private async apply() {
    try {
      if (this.disposed || this.disabled) return;
      if (!(await this.ensureAudio())) return;
      await this.ensureMode();
      if (this.disposed) return;

      const ticket = ++this.seq;
      const wantPlay = this.exploration && this.desiredKey != null && this.targetVolume() > 0.001;
      const nextKey = wantPlay ? this.desiredKey : null;

      if (!wantPlay || !nextKey) {
        this.fadeAllOut();
        return;
      }
      if (ticket !== this.seq) return;
      if (this.currentKey === nextKey && this.activePlayer()) {
        this.bumpGain(ticket);
        return;
      }
      await this.crossfadeTo(nextKey, ticket);
    } catch (error) {
      console.warn('[Game Thư Giãn] Overworld BGM apply failed.', error);
    }
  }

  private bumpGain(ticket: number) {
    if (ticket !== this.seq) return;
    const player = this.activePlayer();
    if (!player) {
      if (this.desiredKey) void this.crossfadeTo(this.desiredKey, ticket);
      return;
    }
    this.cancelFades();
    const target = this.targetVolume();
    if (!player.playing) this.play(player);
    const from = typeof player.volume === 'number' ? player.volume : 0;
    const fade = fadeVolume(player, from <= 0.01 ? 0 : from, target, FADE_IN_MS);
    if (this.active === 'a') this.fadeA = fade;
    else this.fadeB = fade;
  }

  private fadeAllOut() {
    this.cancelFades();
    for (const player of [this.deckA, this.deckB]) {
      if (!player) continue;
      const from = typeof player.volume === 'number' ? player.volume : 0;
      if (from <= 0.02) {
        this.pauseDeck(player);
        continue;
      }
      fadeVolume(player, from, 0, FADE_OUT_MS, () => this.pauseDeck(player));
    }
  }

  private async crossfadeTo(nextKey: BgmRegionKey, ticket: number) {
    if (ticket !== this.seq || this.disposed) return;
    this.cancelFades();
    const target = this.targetVolume();
    const hasCurrent = this.currentKey != null && this.activePlayer() != null;

    if (!hasCurrent) {
      const player = await this.obtain('a', nextKey);
      if (ticket !== this.seq || !player) return;
      this.active = 'a';
      this.currentKey = nextKey;
      try {
        player.volume = 0;
      } catch {
        /* ignore */
      }
      this.play(player);
      this.fadeA = fadeVolume(player, 0, target, FADE_IN_MS);
      return;
    }

    const fromSlot = this.active;
    const toSlot: Slot = fromSlot === 'a' ? 'b' : 'a';
    const fromPlayer = fromSlot === 'a' ? this.deckA : this.deckB;
    const toPlayer = await this.obtain(toSlot, nextKey);
    if (ticket !== this.seq || !toPlayer) return;

    try {
      toPlayer.volume = 0;
    } catch {
      /* ignore */
    }
    this.play(toPlayer);

    const fromVol = fromPlayer && typeof fromPlayer.volume === 'number' ? fromPlayer.volume : target;
    if (fromPlayer) {
      const out = fadeVolume(fromPlayer, fromVol, 0, CROSSFADE_MS, () => this.pauseDeck(fromPlayer));
      if (fromSlot === 'a') this.fadeA = out;
      else this.fadeB = out;
    }
    const inn = fadeVolume(toPlayer, 0, target, CROSSFADE_MS);
    if (toSlot === 'a') this.fadeA = inn;
    else this.fadeB = inn;

    this.active = toSlot;
    this.currentKey = nextKey;
  }

  dispose() {
    this.disposed = true;
    this.seq += 1;
    this.cancelFades();
    for (const player of [this.deckA, this.deckB]) {
      this.pauseDeck(player);
      try {
        player?.remove();
      } catch {
        /* ignore */
      }
    }
    this.deckA = null;
    this.deckB = null;
    this.keyA = null;
    this.keyB = null;
    this.currentKey = null;
    this.desiredKey = null;
    this.primed = false;
  }
}

export const overworldBgm = new OverworldBgmService();

/** Web browsers block audio until a click/key — resume beds after first gesture. */
export function unlockAudioOnGesture() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => undefined;
  const kick = () => {
    overworldBgm.refreshGain();
  };
  window.addEventListener('pointerdown', kick, { once: true, capture: true });
  window.addEventListener('keydown', kick, { once: true, capture: true });
  return () => {
    window.removeEventListener('pointerdown', kick, true);
    window.removeEventListener('keydown', kick, true);
  };
}
