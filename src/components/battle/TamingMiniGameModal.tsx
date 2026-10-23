import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import { TAMING_ZONES, zoneAt } from '../../world/combat';

type Props = {
  monsterName: string;
  /** At 5% health or less the live total starts with that 5% and still caps at 35. */
  lowHp: boolean;
  onClose: () => void;
  /** One bonus per stop. The battle adds the low-HP 5% and caps the total at 35. */
  onFinish: (bonuses: number[]) => void;
};

const STOPS = 3;
/** One-way travel at speed 1. Each try divides this by its speed. */
const BASE_MS = 1400;
const MIN_MS = 220;
/**
 * Try 1 crosses the whole gauge at speed 2.5. Later tries speed up and
 * pull the swing inward, so the outer zones are harder to land.
 */
const ATTEMPTS = [
  { speed: 2.5, amplitude: 1 },
  { speed: 3, amplitude: 0.85 },
  { speed: 3.5, amplitude: 0.75 },
] as const;

function attemptProfile(attempt: number): (typeof ATTEMPTS)[number] {
  const index = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
  return ATTEMPTS[Math.min(ATTEMPTS.length - 1, index)];
}

function sweepMs(attempt: number): number {
  return Math.max(MIN_MS, Math.round(BASE_MS / attemptProfile(attempt).speed));
}

function amplitudeFor(attempt: number): number {
  return attemptProfile(attempt).amplitude;
}

/** Maps the 0–1 oscillator onto the try's band so the zone matches the cursor. */
function placed(progress: number, amplitude: number): number {
  const span = Math.min(1, Math.max(0.2, amplitude));
  const inset = (1 - span) / 2;
  const t = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return inset + t * span;
}

function percentLabel(value: number): string {
  const tenths = Math.round(value * 10);
  const whole = Math.trunc(tenths / 10);
  const frac = Math.abs(tenths % 10);
  return frac === 0 ? `${whole}%` : `${whole},${frac}%`;
}

function headerFor(tryNumber: number, bonuses: number[], lowHp: boolean): string {
  const head = `Lượt ${tryNumber}/${STOPS}`;
  const parts = [...(lowHp && bonuses.length > 0 ? [5] : []), ...bonuses];
  if (parts.length === 0) return head;
  const tenths = Math.min(350, parts.reduce((sum, bonus) => sum + Math.round(bonus * 10), 0));
  const body = parts.map((bonus) => percentLabel(bonus)).join(' + ');
  return `${head}: ${body} = ${percentLabel(tenths / 10)}`;
}

/**
 * Rhythm capture for a wild Monster / Quái. Three stops are the whole attempt.
 * Each stop is faster and travels a shorter band. Pets are not captured here.
 */
export function TamingMiniGameModal({ monsterName, lowHp, onClose, onFinish }: Props) {
  const { s, font } = useLayout();
  const progress = useRef(new Animated.Value(0)).current;
  const cursorX = useRef(new Animated.Value(0)).current;
  const [gaugeWidth, setGaugeWidth] = useState(0);
  const [running, setRunning] = useState(false);
  const [bonuses, setBonuses] = useState<number[]>([]);
  const gaugeReady = gaugeWidth > 0;
  const mountedRef = useRef(true);
  const runningRef = useRef(false);
  const bonusesRef = useRef<number[]>([]);
  const amplitudeRef = useRef(amplitudeFor(0));
  const gaugeWidthRef = useRef(0);
  const doneRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  const onCloseRef = useRef(onClose);
  onFinishRef.current = onFinish;
  onCloseRef.current = onClose;
  gaugeWidthRef.current = gaugeWidth;

  const placeCursor = (value: number) => {
    const travel = Math.max(0, gaugeWidthRef.current - 4);
    const spot = placed(value, amplitudeRef.current);
    cursorX.setValue(spot * travel);
  };

  const swing = (to: number, duration: number) => {
    if (!mountedRef.current || !runningRef.current) return;
    Animated.timing(progress, {
      toValue: to,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!mountedRef.current || !finished || !runningRef.current) return;
      swing(to === 0 ? 1 : 0, duration);
    });
  };

  const startSwing = (attempt: number) => {
    const duration = sweepMs(attempt);
    amplitudeRef.current = amplitudeFor(attempt);
    runningRef.current = true;
    setRunning(true);
    progress.stopAnimation((value) => {
      if (!mountedRef.current || !runningRef.current) return;
      const from = typeof value === 'number' && Number.isFinite(value) ? value : 0;
      placeCursor(from);
      swing(from < 0.5 ? 1 : 0, duration);
    });
  };

  useEffect(() => {
    mountedRef.current = true;
    const id = progress.addListener(({ value }) => {
      if (!mountedRef.current) return;
      placeCursor(typeof value === 'number' ? value : 0);
    });
    return () => {
      mountedRef.current = false;
      runningRef.current = false;
      progress.removeListener(id);
      progress.stopAnimation();
    };
  }, [cursorX, progress]);

  useEffect(() => {
    if (!gaugeReady) return;
    startSwing(0);
    return () => {
      runningRef.current = false;
      progress.stopAnimation();
    };
    // The first measured width starts the opening swing once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaugeReady]);

  const stop = () => {
    try {
      if (!runningRef.current || doneRef.current || bonusesRef.current.length >= STOPS) return;
      runningRef.current = false;
      progress.stopAnimation((value) => {
        try {
          if (!mountedRef.current) return;
          const spot = placed(typeof value === 'number' ? value : 0, amplitudeRef.current);
          const zone = zoneAt(spot);
          const bonus = zone && Number.isFinite(zone.bonus) ? zone.bonus : 0;
          const next = [...bonusesRef.current, bonus];
          bonusesRef.current = next;
          setBonuses(next);
          setRunning(false);
        } catch (error) {
          console.warn('[Game Thư Giãn] Taming stop failed.', error);
          if (mountedRef.current) setRunning(false);
        }
      });
    } catch (error) {
      console.warn('[Game Thư Giãn] Taming stop failed.', error);
      runningRef.current = false;
      setRunning(false);
    }
  };

  const again = () => {
    try {
      if (doneRef.current) return;
      if (bonusesRef.current.length >= STOPS) {
        doneRef.current = true;
        const rolls = bonusesRef.current.filter((bonus) => Number.isFinite(bonus));
        onFinishRef.current(rolls);
        return;
      }
      startSwing(bonusesRef.current.length);
    } catch (error) {
      console.warn('[Game Thư Giãn] Taming could not continue.', error);
      doneRef.current = true;
      onCloseRef.current();
    }
  };

  const stopRef = useRef(stop);
  const againRef = useRef(again);
  stopRef.current = stop;
  againRef.current = again;

  useEffect(() => {
    const host = globalThis as typeof globalThis & {
      addEventListener?: (type: string, listener: (event: KeyboardEvent) => void) => void;
      removeEventListener?: (type: string, listener: (event: KeyboardEvent) => void) => void;
    };
    if (typeof host.addEventListener !== 'function' || typeof host.removeEventListener !== 'function') return;
    const onKey = (event: KeyboardEvent) => {
      try {
        if (!event || event.repeat || (event.code !== 'Space' && event.key !== ' ')) return;
        event.preventDefault?.();
        if (runningRef.current) stopRef.current();
        else againRef.current();
      } catch (error) {
        console.warn('[Game Thư Giãn] Taming key failed.', error);
      }
    };
    host.addEventListener('keydown', onKey);
    return () => host.removeEventListener?.('keydown', onKey);
  }, []);

  const tryNumber = bonuses.length >= STOPS ? STOPS : running ? bonuses.length + 1 : Math.max(1, bonuses.length);
  const name = monsterName?.trim() || 'Quái';
  const zones = TAMING_ZONES.filter((zone) => zone.to > zone.from);
  const close = () => {
    try {
      runningRef.current = false;
      progress.stopAnimation();
      onCloseRef.current();
    } catch (error) {
      console.warn('[Game Thư Giãn] Taming could not close.', error);
    }
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
    <View style={styles.scrim} testID="tame-modal">
      <View style={[styles.card, { padding: s(14), gap: s(10), borderRadius: s(16), maxWidth: s(520) }]}>
        <Text style={[styles.header, { fontSize: font(15) }]} accessibilityLabel={`${name}. ${headerFor(tryNumber, bonuses, lowHp)}`}>
          {headerFor(tryNumber, bonuses, lowHp)}
        </Text>
        <View
          style={[styles.gauge, { height: s(42) }]}
          onLayout={(event) => {
            const next = Math.round(event.nativeEvent.layout.width);
            if (!Number.isFinite(next) || next <= 0) return;
            gaugeWidthRef.current = next;
            setGaugeWidth((current) => (current === next ? current : next));
          }}
        >
          {zones.map((zone) => (
            <View key={zone.id} style={[styles.zone, { flex: zone.to - zone.from, backgroundColor: zone.color }]}>
              <Text style={[styles.zoneLabel, { fontSize: font(10) }]}>
                {zone.label} +{percentLabel(zone.bonus)}
              </Text>
            </View>
          ))}
          <Animated.View pointerEvents="none" style={[styles.cursor, { transform: [{ translateX: cursorX }] }]} />
        </View>
        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={close} style={styles.ghost}>
            <Text style={[styles.ghostLabel, { fontSize: font(13) }]}>Huỷ</Text>
          </Pressable>
          {running ? (
            <Pressable accessibilityRole="button" testID="tame-stop" onPress={stop} style={styles.stop}>
              <Text style={[styles.stopLabel, { fontSize: font(14) }]}>Dừng</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" testID="tame-next" onPress={again} style={styles.stop}>
              <Text style={[styles.stopLabel, { fontSize: font(14) }]}>{bonuses.length >= STOPS ? 'Chốt thu phục' : 'Lượt tiếp'}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '86%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.gold,
  },
  header: { color: theme.gold, fontWeight: '800', textAlign: 'center' },
  gauge: {
    height: 42,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
  },
  zone: { alignItems: 'center', justifyContent: 'center' },
  zoneLabel: { color: '#1b140c', fontWeight: '800' },
  cursor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#10211c',
  },
  row: { flexDirection: 'row', gap: 8 },
  ghost: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.line,
  },
  ghostLabel: { color: theme.ink, fontWeight: '700' },
  stop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    borderRadius: 10,
    backgroundColor: theme.goldDeep,
  },
  stopLabel: { color: theme.ink, fontWeight: '800' },
});
