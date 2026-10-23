import { Image, StyleSheet, View } from 'react-native';

import { HAZARD_ART } from '../../world/hazards';
import type { Rect } from '../../world/types';

const PLAINS_ART = {
  flower: require('../../../assets/plains/bonghoa.png'),
  bush: require('../../../assets/plains/buico.png'),
  grass: require('../../../assets/plains/damco.png'),
  shroom: require('../../../assets/plains/nam.png'),
  tree: require('../../../assets/plains/caycoi.png'),
  rock: require('../../../assets/plains/honda.png'),
  pile: require('../../../assets/plains/dongda.png'),
  puddle: require('../../../assets/plains/vungnuoc.png'),
} as const;

type ArtKind = keyof typeof PLAINS_ART;

/**
 * Painted size when the collision footprint is `foot` wide.
 * `base` pins the picture on the trunk or the rock bottom.
 * `center` keeps a flat puddle over its water box.
 * Width and height follow the png, so the new art is not stretched.
 */
const SPRITE_BOX: Partial<Record<ArtKind, { foot: number; w: number; h: number; anchor: 'base' | 'center' }>> = {
  tree: { foot: 108, w: 156, h: 80, anchor: 'base' },
  rock: { foot: 58, w: 74, h: 54, anchor: 'base' },
  pile: { foot: 118, w: 156, h: 78, anchor: 'base' },
  puddle: { foot: HAZARD_ART.puddle.w, w: HAZARD_ART.puddle.w, h: HAZARD_ART.puddle.h, anchor: 'center' },
};

type Props = {
  rect: Rect;
  /** Plains meadow only. Other provinces keep the drawn props. */
  sprites?: boolean;
};

/**
 * One plains prop. Flowers, grass, bushes, and mushrooms are walked over.
 * Trees, rocks, and rock piles use the rect as the footprint at the base.
 * Water is walked through. Its rect is the 3× trigger. Widen trees and rocks
 * in plainsDecor.ts to stop the player sooner.
 */
export function PlainsProp({ rect, sprites = false }: Props) {
  if (sprites && isArtKind(rect.kind)) return <PlainsSprite rect={rect} kind={rect.kind} />;
  if (rect.kind === 'flower') return <Flower rect={rect} />;
  if (rect.kind === 'puddle') return <Puddle rect={rect} />;
  if (rect.kind === 'grass') return <Grass rect={rect} />;
  if (rect.kind === 'light') return <Sunlight rect={rect} />;
  if (rect.kind === 'tree') return <Pine rect={rect} />;
  if (rect.kind === 'acacia') return <Acacia rect={rect} />;
  return <Rock rect={rect} />;
}

function isArtKind(kind: Rect['kind']): kind is ArtKind {
  return kind != null && Object.prototype.hasOwnProperty.call(PLAINS_ART, kind);
}

function PlainsSprite({ rect, kind }: { rect: Rect; kind: ArtKind }) {
  const box = SPRITE_BOX[kind];
  if (box) {
    const scale = rect.w / box.foot;
    const width = box.w * scale;
    const height = box.h * scale;
    const left = rect.x + rect.w / 2 - width / 2;
    const top = box.anchor === 'base' ? rect.y + rect.h - height : rect.y + rect.h / 2 - height / 2;
    return (
      <Image
        pointerEvents="none"
        source={PLAINS_ART[kind]}
        resizeMode="contain"
        style={{ position: 'absolute', left, top, width, height }}
      />
    );
  }
  return (
    <Image
      pointerEvents="none"
      source={PLAINS_ART[kind]}
      resizeMode="contain"
      style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    />
  );
}

function Flower({ rect }: { rect: Rect }) {
  const color = rect.fill ?? '#ff4f93';
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View style={[styles.stem, { height: rect.h }]} />
      <View style={[styles.bloom, { left: 0, top: 2, width: 12, height: 12, backgroundColor: color }]} />
      <View style={[styles.bloom, { left: 12, top: 0, width: 14, height: 14, backgroundColor: color }]} />
      <View style={[styles.bloom, { left: 8, top: 8, width: 11, height: 11, backgroundColor: '#fff0f6' }]} />
    </View>
  );
}

function Puddle({ rect }: { rect: Rect }) {
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
          backgroundColor: 'rgba(62, 196, 224, 0.72)',
        },
      ]}
    >
      <View style={styles.glint} />
    </View>
  );
}

function Grass({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View style={[styles.tuft, { backgroundColor: rect.fill, width: rect.w, height: rect.h, borderRadius: rect.h }]} />
      <View style={[styles.blade, { left: rect.w * 0.2 }]} />
      <View style={[styles.blade, { left: rect.w * 0.48, height: rect.h * 0.7 }]} />
      <View style={[styles.blade, { left: rect.w * 0.72, height: rect.h * 0.55 }]} />
    </View>
  );
}

function Sunlight({ rect }: { rect: Rect }) {
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
          backgroundColor: rect.fill,
          transform: [{ rotate: '-11deg' }],
        },
      ]}
    />
  );
}

function Pine({ rect }: { rect: Rect }) {
  const cx = rect.x + rect.w / 2;
  const base = rect.y + rect.h;
  const tiers = [
    { width: 58, height: 30, lift: 22, color: rect.fill ?? '#143d22' },
    { width: 42, height: 26, lift: 40, color: '#1f6a38' },
    { width: 26, height: 22, lift: 56, color: '#2f8a46' },
  ];
  return (
    <View pointerEvents="none" style={styles.abs}>
      <View
        style={{
          position: 'absolute',
          left: cx - 4,
          top: rect.y + 6,
          width: 8,
          height: rect.h,
          borderRadius: 2,
          backgroundColor: '#5a3a22',
        }}
      />
      {tiers.map((tier) => (
        <View
          key={tier.lift}
          style={{
            position: 'absolute',
            left: cx - tier.width / 2,
            top: base - tier.lift - tier.height,
            width: 0,
            height: 0,
            borderLeftWidth: tier.width / 2,
            borderRightWidth: tier.width / 2,
            borderBottomWidth: tier.height,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: tier.color,
          }}
        />
      ))}
    </View>
  );
}

function Rock({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: rect.h * 0.18,
          width: rect.w,
          height: rect.h * 0.82,
          borderRadius: rect.h / 2,
          backgroundColor: rect.fill ?? '#8d97a3',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: rect.w * 0.12,
          top: 0,
          width: rect.w * 0.62,
          height: rect.h * 0.46,
          borderRadius: rect.h,
          backgroundColor: 'rgba(255,255,255,0.38)',
        }}
      />
    </View>
  );
}

function Acacia({ rect }: { rect: Rect }) {
  const canopy = rect.fill ?? '#6f8f3a';
  return (
    <View pointerEvents="none" style={[styles.abs, { left: rect.x, top: rect.y - rect.h * 0.8, width: rect.w, height: rect.h * 1.8 }]}>
      <View
        style={{
          position: 'absolute',
          left: rect.w * 0.46,
          bottom: 0,
          width: 4,
          height: rect.h,
          backgroundColor: '#6b4428',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: rect.w,
          height: rect.h * 0.7,
          borderRadius: rect.h,
          backgroundColor: canopy,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  stem: { position: 'absolute', left: 8, top: 6, width: 2, backgroundColor: '#2f8a34' },
  bloom: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  tuft: { position: 'absolute', left: 0, top: 2 },
  blade: { position: 'absolute', bottom: 0, width: 2, height: 12, borderRadius: 2, backgroundColor: '#1f7a32' },
  glint: { position: 'absolute', left: 8, top: 4, width: 14, height: 5, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.7)' },
});
