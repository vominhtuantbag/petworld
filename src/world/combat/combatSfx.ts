import { Platform, Vibration } from 'react-native';

type CombatCue = 'arm' | 'tick' | 'cast' | 'cancel' | 'click' | 'hit' | 'crit';

const TONES: Record<CombatCue, { freq: number; ms: number; gain: number; type?: OscillatorType }> = {
  arm: { freq: 520, ms: 40, gain: 0.035 },
  tick: { freq: 740, ms: 28, gain: 0.028 },
  cast: { freq: 880, ms: 70, gain: 0.05 },
  cancel: { freq: 220, ms: 50, gain: 0.03 },
  click: { freq: 980, ms: 22, gain: 0.032, type: 'square' },
  hit: { freq: 180, ms: 55, gain: 0.055, type: 'sawtooth' },
  crit: { freq: 320, ms: 90, gain: 0.07, type: 'sawtooth' },
};

let audioCtx: AudioContext | null = null;

function webBeep(freq: number, ms: number, gain: number, type: OscillatorType = 'triangle') {
  const AudioCtor =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AudioCtor) return;
  try {
    audioCtx ??= new AudioCtor();
    const osc = audioCtx.createOscillator();
    const node = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    node.gain.value = gain;
    osc.connect(node);
    node.connect(audioCtx.destination);
    const start = audioCtx.currentTime;
    osc.start(start);
    if (type === 'sawtooth') {
      osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.45), start + ms / 1000);
    }
    node.gain.exponentialRampToValueAtTime(0.0001, start + ms / 1000);
    osc.stop(start + ms / 1000 + 0.02);
  } catch {
    /* Web audio is optional feedback. */
  }
}

/** Short combat cues. Native uses vibration; web plays a tiny beep. */
export function combatSfx(kind: CombatCue) {
  if (Platform.OS !== 'web') {
    const ms = kind === 'crit' ? 28 : kind === 'hit' ? 16 : kind === 'cast' ? 18 : kind === 'click' ? 8 : kind === 'tick' ? 6 : 10;
    Vibration.vibrate(ms);
  }
  const tone = TONES[kind];
  webBeep(tone.freq, tone.ms, tone.gain, tone.type);
}
