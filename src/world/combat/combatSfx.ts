import { Platform, Vibration } from 'react-native';

type CombatCue = 'arm' | 'tick' | 'cast' | 'cancel';

const TONES: Record<CombatCue, { freq: number; ms: number; gain: number }> = {
  arm: { freq: 520, ms: 40, gain: 0.035 },
  tick: { freq: 740, ms: 28, gain: 0.028 },
  cast: { freq: 880, ms: 70, gain: 0.05 },
  cancel: { freq: 220, ms: 50, gain: 0.03 },
};

let audioCtx: AudioContext | null = null;

function webBeep(freq: number, ms: number, gain: number) {
  const AudioCtor =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AudioCtor) return;
  try {
    audioCtx ??= new AudioCtor();
    const osc = audioCtx.createOscillator();
    const node = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    node.gain.value = gain;
    osc.connect(node);
    node.connect(audioCtx.destination);
    const start = audioCtx.currentTime;
    osc.start(start);
    node.gain.exponentialRampToValueAtTime(0.0001, start + ms / 1000);
    osc.stop(start + ms / 1000 + 0.02);
  } catch {
    /* Web audio is optional feedback. */
  }
}

/** Short combat cues. Native uses vibration; web plays a tiny beep. */
export function combatSfx(kind: CombatCue) {
  if (Platform.OS !== 'web') {
    Vibration.vibrate(kind === 'cast' ? 18 : kind === 'tick' ? 6 : 10);
  }
  const tone = TONES[kind];
  webBeep(tone.freq, tone.ms, tone.gain);
}
