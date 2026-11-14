import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { getAudioSettings } from './audioSettings';
import type { BgmRegionKey } from './bgmRegions';
import { cancelFade, fadeVolume, type FadeHandle } from './fade';
import { OVERWORLD_BGM_DEFAULT_VOLUME, OVERWORLD_BGM_SOURCES } from './tracks';

const CROSSFADE_MS = 900;
const FADE_OUT_MS = 500;
const FADE_IN_MS = 650;

type Slot = 'a' | 'b';

/**
 * Dual-deck overworld BGM controller.
 * Decks are always created with a real asset (never `null`) — required for
 * reliable playback on Expo Web.
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

  private async ensureMode() {
    if (this.primed) return;
    try {
      await setAudioModeAsync({
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

  /** Create or reuse a deck bound to a concrete asset (never null). */
  private obtain(slot: Slot, key: BgmRegionKey): AudioPlayer {
    if (slot === 'a') {
      if (!this.deckA) {
        this.deckA = createAudioPlayer(OVERWORLD_BGM_SOURCES[key]);
      } else if (this.keyA !== key) {
        try {
          this.deckA.replace(OVERWORLD_BGM_SOURCES[key]);
        } catch {
          /* ignore */
        }
      }
      this.keyA = key;
      this.deckA.loop = true;
      return this.deckA;
    }

    if (!this.deckB) {
      this.deckB = createAudioPlayer(OVERWORLD_BGM_SOURCES[key]);
    } else if (this.keyB !== key) {
      try {
        this.deckB.replace(OVERWORLD_BGM_SOURCES[key]);
      } catch {
        /* ignore */
      }
    }
    this.keyB = key;
    this.deckB.loop = true;
    return this.deckB;
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
    this.disposed = false;
    this.desiredKey = key;
    this.exploration = exploration;
    void this.apply();
  }

  refreshGain() {
    void this.apply();
  }

  /** Soft stop for React effect cleanups — keeps decks warm for Strict Mode remounts. */
  softStop() {
    this.exploration = false;
    this.cancelFades();
    this.pauseDeck(this.deckA);
    this.pauseDeck(this.deckB);
  }

  private async apply() {
    if (this.disposed) return;
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

    this.crossfadeTo(nextKey, ticket);
  }

  private bumpGain(ticket: number) {
    if (ticket !== this.seq) return;
    const player = this.activePlayer();
    if (!player) {
      if (this.desiredKey) this.crossfadeTo(this.desiredKey, ticket);
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

  private crossfadeTo(nextKey: BgmRegionKey, ticket: number) {
    if (ticket !== this.seq || this.disposed) return;
    this.cancelFades();

    const target = this.targetVolume();
    const hasCurrent = this.currentKey != null && this.activePlayer() != null;

    if (!hasCurrent) {
      const player = this.obtain('a', nextKey);
      this.active = 'a';
      this.currentKey = nextKey;
      player.volume = 0;
      this.play(player);
      this.fadeA = fadeVolume(player, 0, target, FADE_IN_MS);
      return;
    }

    const fromSlot = this.active;
    const toSlot: Slot = fromSlot === 'a' ? 'b' : 'a';
    const fromPlayer = fromSlot === 'a' ? this.deckA : this.deckB;
    const toPlayer = this.obtain(toSlot, nextKey);

    toPlayer.volume = 0;
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
  if (typeof window === 'undefined') return () => undefined;
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
