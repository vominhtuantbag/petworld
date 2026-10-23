import { StyleSheet, View } from 'react-native';

import type { Rect } from '../../world/types';

const SWAMP_KINDS = new Set([
  'dry',
  'mud',
  'moss',
  'reed',
  'lily',
  'shroom',
  'fog',
  'firefly',
  'bubble',
  'mangrove',
  'log',
  'boulder',
]);

type SwampKind =
  | 'dry'
  | 'mud'
  | 'moss'
  | 'reed'
  | 'lily'
  | 'shroom'
  | 'fog'
  | 'firefly'
  | 'bubble'
  | 'mangrove'
  | 'log'
  | 'boulder';

export function isSwampKind(kind: Rect['kind']): kind is SwampKind {
  return kind != null && SWAMP_KINDS.has(kind);
}

type Props = {
  rect: Rect;
};

/**
 * One swamp prop. Mud, plants, fog, and drifting lights are walked over.
 * Mangroves, logs, and boulders use the rect as their collision box.
 * Roots and canopies are drawn larger than that box.
 */
export function SwampProp({ rect }: Props) {
  if (rect.kind === 'dry') return <Patch rect={rect} />;
  if (rect.kind === 'mud') return <Mud rect={rect} />;
  if (rect.kind === 'moss') return <Moss rect={rect} />;
  if (rect.kind === 'reed') return <Reed rect={rect} />;
  if (rect.kind === 'lily') return <Lily rect={rect} />;
  if (rect.kind === 'shroom') return <Shroom rect={rect} />;
  if (rect.kind === 'fog') return <Fog rect={rect} />;
  if (rect.kind === 'firefly') return <Firefly rect={rect} />;
  if (rect.kind === 'bubble') return <Bubble rect={rect} />;
  if (rect.kind === 'mangrove') return <Mangrove rect={rect} />;
  if (rect.kind === 'log') return <Log rect={rect} />;
  return <Boulder rect={rect} />;
}

/** Screen haze. Opacity lives here; raise it for a thicker marsh mist. */
export function SwampMist() {
  return (
    <View pointerEvents="none" style={styles.mist}>
      <View style={[styles.mistBank, { left: '8%', top: '18%', width: '46%', height: 70 }]} />
      <View style={[styles.mistBank, { right: '6%', bottom: '16%', width: '38%', height: 54 }]} />
    </View>
  );
}

function Patch({ rect }: { rect: Rect }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: rect.h, backgroundColor: rect.fill }]}
    />
  );
}

function Mud({ rect }: { rect: Rect }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderRadius: rect.h,
          backgroundColor: '#5c6a48',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <View
        style={{
          width: rect.w * 0.72,
          height: rect.h * 0.62,
          borderRadius: rect.h,
          backgroundColor: rect.fill ?? '#24382c',
        }}
      />
    </View>
  );
}

function Moss({ rect }: { rect: Rect }) {
  const color = rect.fill ?? '#3d6a3a';
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View style={[styles.blade, { left: 2, backgroundColor: color, transform: [{ rotate: '-16deg' }] }]} />
      <View style={[styles.blade, { left: 9, height: 11, backgroundColor: color }]} />
      <View style={[styles.blade, { left: 16, backgroundColor: '#2a4a30', transform: [{ rotate: '14deg' }] }]} />
    </View>
  );
}

function Reed({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View style={[styles.stem, { left: 3 }]} />
      <View style={[styles.head, { left: 1, backgroundColor: rect.fill ?? '#6a5030' }]} />
      <View style={[styles.stem, { left: 10, height: 16 }]} />
      <View style={[styles.head, { left: 8, top: 2, backgroundColor: '#8a6840' }]} />
    </View>
  );
}

function Lily({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View style={[styles.pad, { width: rect.w, height: rect.h }]} />
      <View style={[styles.bloom, { backgroundColor: rect.fill ?? '#f2d0dc' }]} />
    </View>
  );
}

function Shroom({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View style={styles.halo} />
      <View style={styles.stalk} />
      <View style={[styles.cap, { backgroundColor: rect.fill ?? '#c4474a' }]} />
    </View>
  );
}

function Fog({ rect }: { rect: Rect }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: rect.h, backgroundColor: rect.fill }]}
    />
  );
}

function Firefly({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View style={styles.glow} />
      <View style={[styles.spark, { backgroundColor: rect.fill ?? '#e6f27a' }]} />
    </View>
  );
}

function Bubble({ rect }: { rect: Rect }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderRadius: rect.w,
          borderWidth: 1,
          borderColor: rect.fill ?? 'rgba(210, 230, 210, 0.7)',
          backgroundColor: 'rgba(200, 220, 200, 0.18)',
        },
      ]}
    />
  );
}

function Mangrove({ rect }: { rect: Rect }) {
  const cx = rect.x + rect.w / 2;
  const green = rect.fill ?? '#1c3a24';
  return (
    <View pointerEvents="none" style={styles.abs}>
      <View style={[styles.root, { left: cx - 18, top: rect.y + rect.h - 8, transform: [{ rotate: '28deg' }] }]} />
      <View style={[styles.root, { left: cx + 6, top: rect.y + rect.h - 8, transform: [{ rotate: '-28deg' }] }]} />
      <View style={[styles.trunk, { left: cx - 5, top: rect.y - 8, height: rect.h + 10, backgroundColor: '#3a2a1c' }]} />
      <View style={[styles.vine, { left: cx - 14, top: rect.y - 6 }]} />
      <View style={[styles.vine, { left: cx + 10, top: rect.y - 2, height: 18 }]} />
      <View style={[styles.canopy, { left: cx - 22, top: rect.y - 28, backgroundColor: green }]} />
    </View>
  );
}

function Log({ rect }: { rect: Rect }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderRadius: rect.h / 2,
          backgroundColor: rect.fill ?? '#5c4030',
          overflow: 'hidden',
        },
      ]}
    >
      <View style={styles.logEnd} />
      <View style={styles.mossStripe} />
    </View>
  );
}

function Boulder({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: rect.h * 0.2,
          width: rect.w,
          height: rect.h * 0.8,
          borderRadius: rect.h / 2,
          backgroundColor: rect.fill ?? '#5d6a58',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: rect.w * 0.18,
          top: 0,
          width: rect.w * 0.5,
          height: rect.h * 0.45,
          borderRadius: rect.h,
          backgroundColor: '#3d6a3a',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  mist: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  mistBank: { position: 'absolute', borderRadius: 40, backgroundColor: 'rgba(176, 196, 168, 0.14)' },
  blade: { position: 'absolute', bottom: 0, width: 2, height: 12, borderRadius: 2 },
  stem: { position: 'absolute', bottom: 0, width: 2, height: 18, backgroundColor: '#3e6a32' },
  head: { position: 'absolute', top: 0, width: 6, height: 8, borderRadius: 3 },
  pad: { position: 'absolute', borderRadius: 8, backgroundColor: '#2f6a38' },
  bloom: { position: 'absolute', left: 4, top: 2, width: 6, height: 6, borderRadius: 3 },
  halo: { position: 'absolute', left: 0, top: 0, width: 16, height: 12, borderRadius: 8, backgroundColor: 'rgba(212, 224, 122, 0.28)' },
  stalk: { position: 'absolute', left: 6, top: 6, width: 3, height: 8, backgroundColor: '#efe6d2' },
  cap: { position: 'absolute', left: 2, top: 1, width: 12, height: 7, borderRadius: 6 },
  glow: { position: 'absolute', left: -3, top: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(230, 242, 122, 0.35)' },
  spark: { position: 'absolute', left: 1, top: 1, width: 6, height: 6, borderRadius: 3 },
  root: { position: 'absolute', width: 16, height: 4, borderRadius: 2, backgroundColor: '#4a3424' },
  trunk: { position: 'absolute', width: 10, borderRadius: 4 },
  vine: { position: 'absolute', width: 2, height: 22, backgroundColor: '#24502c' },
  canopy: { position: 'absolute', width: 44, height: 28, borderRadius: 16 },
  logEnd: { position: 'absolute', left: 4, top: 4, width: 10, height: 16, borderRadius: 6, backgroundColor: '#c4a06a' },
  mossStripe: { position: 'absolute', left: 24, top: 3, width: 28, height: 6, borderRadius: 3, backgroundColor: '#3d6a3a' },
});
