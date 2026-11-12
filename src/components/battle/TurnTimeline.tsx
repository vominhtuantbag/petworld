import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const GAP = 6;
const SLIDE_MS = 340;

export type TimelineRole = 'now' | 'next' | 'later';

type Props = {
  ids: readonly string[];
  activeId: string | null;
  size: number;
  renderFace: (id: string, role: TimelineRole) => ReactNode;
};

/**
 * Fixed left-to-right turn slots. Index 0 is the current turn, index 1 is next,
 * and the rest run toward the outer right. Portraits slide when that queue changes.
 */
export function TurnTimeline({ ids, activeId, size, renderFace }: Props) {
  const stride = size + GAP;
  const positions = useRef(new Map<string, Animated.Value>());
  const targets = useRef(new Map<string, number>());
  const seen = useRef(false);
  const mounted = useRef(true);
  const [leaving, setLeaving] = useState<string[]>([]);
  const idsKey = ids.join('|');

  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    if (positions.current.has(id)) continue;
    const start = seen.current ? ids.length * stride : index * stride;
    positions.current.set(id, new Animated.Value(start));
    targets.current.set(id, start);
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const known = positions.current;
    const placed = targets.current;
    const present = new Set(ids);
    ids.forEach((id, index) => {
      const target = index * stride;
      const value = known.get(id);
      if (!value || placed.get(id) === target) return;
      placed.set(id, target);
      Animated.timing(value, {
        toValue: target,
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    const gone: string[] = [];
    for (const id of [...known.keys()]) {
      if (present.has(id)) continue;
      const value = known.get(id);
      if (!value) continue;
      gone.push(id);
      if (placed.get(id) === -stride) continue;
      placed.set(id, -stride);
      Animated.timing(value, {
        toValue: -stride,
        duration: SLIDE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !mounted.current) return;
        known.delete(id);
        placed.delete(id);
        setLeaving((current) => current.filter((entry) => entry !== id));
      });
    }
    seen.current = true;
    setLeaving((current) => {
      if (gone.length === current.length && gone.every((id, index) => id === current[index])) return current;
      return gone;
    });
  }, [ids, idsKey, stride]);

  const faces = [...ids, ...leaving.filter((id) => !ids.includes(id))];
  const width = Math.max(faces.length, 1) * stride - GAP;

  const pad = Math.round(size * 0.12);
  return (
    <View style={[styles.track, { height: size + pad * 2 }]} testID="turn-timeline">
      <View style={{ width: Math.max(width, size), height: size + pad * 2 }}>
        {faces.map((id) => {
          const x = positions.current.get(id);
          if (!x) return null;
          const index = ids.indexOf(id);
          const currentId = activeId && ids[0] === activeId ? activeId : (ids[0] ?? null);
          const role: TimelineRole = id === currentId ? 'now' : index === 1 ? 'next' : 'later';
          return (
            <Animated.View
              key={id}
              pointerEvents="none"
              testID={index === 0 ? 'turn-now' : index === 1 ? 'turn-next' : `turn-later-${id}`}
              style={[
                styles.slot,
                {
                  width: size,
                  height: size,
                  top: pad,
                  zIndex: role === 'now' ? 5 : 1,
                  transform: [{ translateX: x }],
                },
              ]}
            >
              {renderFace(id, role)}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    minWidth: 0,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slot: { position: 'absolute', left: 0, alignItems: 'center', justifyContent: 'center' },
});
