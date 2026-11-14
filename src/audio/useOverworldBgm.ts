import { useEffect } from 'react';

import { useAudioSettings } from './audioSettings';
import { bgmKeyForZone, sceneAllowsOverworldBgm } from './bgmRegions';
import { overworldBgm, unlockAudioOnGesture } from './overworldBgmService';

type Options = {
  /** World scene — only `wilds` plays overworld BGM; town/battle/squad fade out. */
  scene: string;
  /** Live zone id (`plains:m1`, `town:forest`, …). */
  zoneId: string;
};

/**
 * Regional overworld BGM (`overworld_bgm`) for all 16 biomes.
 *
 * - Crossfades when `zoneId` changes between regions.
 * - Fades out for combat / squad / lobby, resumes on return.
 * - Honors global BGM mute + volume from Settings.
 *
 * Soft-stop only on shell unmount — never dispose on Strict Mode remounts,
 * and never soft-stop when merely changing zones (that killed the bed).
 */
export function useOverworldBgm({ scene, zoneId }: Options) {
  const settings = useAudioSettings();
  const key = bgmKeyForZone(zoneId);
  const exploration = sceneAllowsOverworldBgm(scene);

  useEffect(() => unlockAudioOnGesture(), []);

  useEffect(() => {
    overworldBgm.sync(key, exploration);
  }, [exploration, key]);

  useEffect(() => {
    overworldBgm.refreshGain();
  }, [settings.bgmMuted, settings.bgmVolume]);

  useEffect(
    () => () => {
      overworldBgm.softStop();
    },
    [],
  );
}

/** @deprecated Use `useOverworldBgm`. */
export const usePlainsOverworldBgm = useOverworldBgm;
