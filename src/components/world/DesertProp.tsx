import { Image, StyleSheet, View } from 'react-native';

import { HAZARD_ART } from '../../world/hazards';
import type { Rect } from '../../world/types';

const DESERT_KINDS = new Set([
  'dune',
  'straw',
  'bush',
  'oasis',
  'tumbleweed',
  'saguaro',
  'barrel',
  'bunny',
  'cactus',
  'palm',
  'crack',
  'quicksand',
]);

type DesertKind =
  | 'dune'
  | 'straw'
  | 'bush'
  | 'oasis'
  | 'tumbleweed'
  | 'saguaro'
  | 'barrel'
  | 'bunny'
  | 'cactus'
  | 'palm'
  | 'crack'
  | 'quicksand';

const ART = {
  dune: require('../../../assets/desert/concat.png'),
  rock: require('../../../assets/desert/conda.png'),
  oasis: require('../../../assets/desert/ocdao.png'),
  cactus: require('../../../assets/desert/xuongrong.png'),
  crack: require('../../../assets/desert/datnutne.png'),
  quicksand: require('../../../assets/desert/catlun.png'),
  straw: require('../../../assets/desert/coromvang.png'),
} as const;

/** Painted size relative to the collision foot. Base anchors sit on the hitbox floor. */
const BOX: Record<keyof typeof ART, { foot: number; w: number; h: number; anchor: 'base' | 'center' }> = {
  dune: { foot: 220, w: 300, h: 71, anchor: 'base' },
  rock: { foot: 96, w: 150, h: 93, anchor: 'base' },
  oasis: { foot: 200, w: 250, h: 196, anchor: 'base' },
  cactus: { foot: 40, w: 78, h: 112, anchor: 'base' },
  crack: { foot: HAZARD_ART.crack.w, w: HAZARD_ART.crack.w, h: HAZARD_ART.crack.h, anchor: 'center' },
  quicksand: { foot: HAZARD_ART.quicksand.w, w: HAZARD_ART.quicksand.w, h: HAZARD_ART.quicksand.h, anchor: 'center' },
  straw: { foot: 150, w: 188, h: 45, anchor: 'center' },
};

/** Fraction of the painted sprite where the visible foot line sits. */
const FOOT_LINE: Partial<Record<keyof typeof ART, number>> = {
  dune: 0.995,
  rock: 0.916,
  oasis: 0.942,
  cactus: 0.921,
};

/** Y of the obstacle's ground line. A body above this draws behind the sprite. */
export function desertFootY(rect: Rect): number {
  const kind = rect.kind;
  if (kind !== 'dune' && kind !== 'rock' && kind !== 'oasis' && kind !== 'cactus') return rect.y + rect.h;
  const box = BOX[kind];
  const height = box.h * (rect.w / box.foot);
  const top = rect.y + rect.h - height;
  return top + height * (FOOT_LINE[kind] ?? 1);
}

export function isDesertKind(kind: Rect['kind']): kind is DesertKind {
  return kind != null && DESERT_KINDS.has(kind);
}

type Props = {
  rect: Rect;
  sprites?: boolean;
};

/**
 * Desert prop. Sprite kinds use the uploaded art. Older procedural kinds
 * still draw when a saved field has not rebuilt yet.
 */
export function DesertProp({ rect, sprites }: Props) {
  if (sprites && rect.kind && rect.kind in ART) {
    const kind = rect.kind as keyof typeof ART;
    return <DesertSprite rect={rect} source={ART[kind]} box={BOX[kind]} />;
  }
  if (rect.kind === 'dune') return <Dune rect={rect} />;
  if (rect.kind === 'straw') return <Straw rect={rect} />;
  if (rect.kind === 'bush') return <Bush rect={rect} />;
  if (rect.kind === 'oasis') return <Oasis rect={rect} />;
  if (rect.kind === 'tumbleweed') return <Tumbleweed rect={rect} />;
  if (rect.kind === 'saguaro') return <Saguaro rect={rect} />;
  if (rect.kind === 'barrel') return <Barrel rect={rect} />;
  if (rect.kind === 'bunny') return <BunnyEar rect={rect} />;
  if (rect.kind === 'cactus') return <Flowering rect={rect} />;
  if (rect.kind === 'palm') return <Palm rect={rect} />;
  return <Stone rect={rect} />;
}

function Dune({ rect }: { rect: Rect }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: rect.h, backgroundColor: rect.fill }]}
    />
  );
}

function Straw({ rect }: { rect: Rect }) {
  const color = rect.fill ?? '#e2c56a';
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View style={[styles.blade, { left: 2, backgroundColor: color, transform: [{ rotate: '-18deg' }] }]} />
      <View style={[styles.blade, { left: 10, height: 12, backgroundColor: color }]} />
      <View style={[styles.blade, { left: 18, backgroundColor: '#c6a24a', transform: [{ rotate: '16deg' }] }]} />
    </View>
  );
}

function Bush({ rect }: { rect: Rect }) {
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
          borderRadius: 8,
          backgroundColor: rect.fill ?? '#8a6240',
          borderWidth: 1,
          borderColor: 'rgba(90, 50, 24, 0.45)',
        },
      ]}
    />
  );
}

function Oasis({ rect }: { rect: Rect }) {
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
          backgroundColor: '#e6c98a',
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <View
        style={{
          width: rect.w * 0.78,
          height: rect.h * 0.72,
          borderRadius: rect.h,
          backgroundColor: rect.fill ?? '#3aa0c8',
          borderWidth: 3,
          borderColor: 'rgba(255,255,255,0.45)',
        }}
      />
    </View>
  );
}

function Tumbleweed({ rect }: { rect: Rect }) {
  const spin = `${Math.round(rect.x * 1.4)}deg`;
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
          borderWidth: 2,
          borderColor: rect.fill ?? '#a67c52',
          backgroundColor: 'rgba(166, 124, 82, 0.28)',
          transform: [{ rotate: spin }],
        },
      ]}
    >
      <View style={styles.tumbleBar} />
    </View>
  );
}

function Saguaro({ rect }: { rect: Rect }) {
  const cx = rect.x + rect.w / 2;
  const green = rect.fill ?? '#2f7a3a';
  return (
    <View pointerEvents="none" style={styles.abs}>
      <View style={[styles.arm, { left: cx - 26, top: rect.y - 6, width: 18, backgroundColor: green }]} />
      <View style={[styles.armUp, { left: cx - 26, top: rect.y - 24, backgroundColor: green }]} />
      <View style={[styles.arm, { left: cx + 8, top: rect.y - 2, width: 18, backgroundColor: '#267034' }]} />
      <View style={[styles.armUp, { left: cx + 16, top: rect.y - 20, backgroundColor: '#267034' }]} />
      <View style={[styles.trunk, { left: cx - 7, top: rect.y - 30, height: rect.h + 32, backgroundColor: green }]} />
    </View>
  );
}

function Barrel({ rect }: { rect: Rect }) {
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
          backgroundColor: rect.fill ?? '#3c8f46',
          borderWidth: 2,
          borderColor: '#246834',
          overflow: 'hidden',
        },
      ]}
    >
      <View style={[styles.rib, { left: rect.w * 0.28 }]} />
      <View style={[styles.rib, { left: rect.w * 0.48 }]} />
      <View style={[styles.rib, { left: rect.w * 0.68 }]} />
    </View>
  );
}

function BunnyEar({ rect }: { rect: Rect }) {
  const color = rect.fill ?? '#4aa056';
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View style={[styles.ear, { left: 2, backgroundColor: color, transform: [{ rotate: '-12deg' }] }]} />
      <View style={[styles.ear, { left: rect.w * 0.42, backgroundColor: '#357a40', transform: [{ rotate: '12deg' }] }]} />
    </View>
  );
}

function Flowering({ rect }: { rect: Rect }) {
  const petal = rect.fill ?? '#e23b4a';
  return (
    <View pointerEvents="none" style={styles.abs}>
      <View
        style={{
          position: 'absolute',
          left: rect.x,
          top: rect.y + 6,
          width: rect.w,
          height: rect.h - 4,
          borderRadius: 8,
          backgroundColor: '#2f7a3a',
        }}
      />
      <View style={[styles.petal, { left: rect.x + 2, top: rect.y, backgroundColor: petal }]} />
      <View style={[styles.petal, { left: rect.x + rect.w - 10, top: rect.y + 2, backgroundColor: petal }]} />
      <View style={[styles.petal, { left: rect.x + rect.w / 2 - 4, top: rect.y + rect.h - 10, backgroundColor: '#ffd36a' }]} />
    </View>
  );
}

function Palm({ rect }: { rect: Rect }) {
  const cx = rect.x + rect.w / 2;
  const crown = rect.y - 8;
  const fronds = [0, 55, 115, 175, 235, 295];
  return (
    <View pointerEvents="none" style={styles.abs}>
      <View style={[styles.trunk, { left: cx - 4, top: rect.y, width: 8, height: rect.h, backgroundColor: '#8a5a32' }]} />
      {fronds.map((deg) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            left: cx - 5,
            top: crown,
            width: 10,
            height: 26,
            borderRadius: 6,
            backgroundColor: rect.fill ?? '#2d7a34',
            transform: [{ rotate: `${deg}deg` }, { translateY: -12 }],
          }}
        />
      ))}
      <View
        style={{
          position: 'absolute',
          left: cx - 6,
          top: crown + 6,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#8a5a32',
        }}
      />
    </View>
  );
}

function Stone({ rect }: { rect: Rect }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: rect.x,
          top: rect.y + rect.h * 0.15,
          width: rect.w,
          height: rect.h * 0.85,
          borderRadius: rect.h / 2,
          backgroundColor: rect.fill ?? '#b7a18a',
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.35)',
        },
      ]}
    />
  );
}

function DesertSprite({
  rect,
  source,
  box,
}: {
  rect: Rect;
  source: number;
  box: { foot: number; w: number; h: number; anchor: 'base' | 'center' };
}) {
  const scale = rect.w / box.foot;
  const width = box.w * scale;
  const height = box.h * scale;
  const left = rect.x + rect.w / 2 - width / 2;
  const top = box.anchor === 'base' ? rect.y + rect.h - height : rect.y + rect.h / 2 - height / 2;
  return (
    <Image
      source={source}
      resizeMode="contain"
      pointerEvents="none"
      style={{ position: 'absolute', left, top, width, height }}
    />
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  blade: { position: 'absolute', bottom: 0, width: 2, height: 14, borderRadius: 2 },
  tumbleBar: {
    position: 'absolute',
    left: 4,
    top: 9,
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#8a6240',
  },
  trunk: { position: 'absolute', width: 14, borderRadius: 6 },
  arm: { position: 'absolute', height: 8, borderRadius: 5 },
  armUp: { position: 'absolute', width: 8, height: 18, borderRadius: 5 },
  rib: { position: 'absolute', top: 2, bottom: 2, width: 2, backgroundColor: 'rgba(20, 70, 30, 0.35)' },
  ear: { position: 'absolute', top: 0, width: 12, height: 20, borderRadius: 8 },
  petal: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
});
