import { memo } from 'react';
import { Animated, Image, type ImageSourcePropType, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect as SvgRect } from 'react-native-svg';

import { FOREST_CORE, FOREST_HITBOX, FOREST_LITTER, FOREST_MOSS } from '../../world/forestDecor';
import { VECTOR_HAZARD_ART } from '../../world/hazards';
import { isGearItem } from '../../world/items';
import type { LootActor, Rect } from '../../world/types';
import type { DepthStop } from './DepthGradient';
import { useLoop } from './useLoop';

export const FOREST_DEPTH_STOPS: readonly DepthStop[] = [
  { at: 0, color: FOREST_MOSS },
  { at: 0.12, color: FOREST_MOSS },
  { at: 0.45, color: FOREST_LITTER },
  { at: 0.82, color: FOREST_CORE },
  { at: 1, color: FOREST_CORE },
];

/**
 * External art under `assets/world/rungram/` (filenames match forest kinds).
 * Native pixel size is 128² except hangingvine (256²).
 */
const FOREST_ART = {
  mossgrass: require('../../../assets/world/rungram/mossgrass.png'),
  leaflitter: require('../../../assets/world/rungram/leaflitter.png'),
  sunbeam: require('../../../assets/world/rungram/sunbeam.png'),
  fern: require('../../../assets/world/rungram/fern.png'),
  hangingvine: require('../../../assets/world/rungram/hangingvine.png'),
  forestshroom: require('../../../assets/world/rungram/forestshroom.png'),
  foresttree: require('../../../assets/world/rungram/foresttree.png'),
  rootwall: require('../../../assets/world/rungram/rootwall.png'),
  rootruin: require('../../../assets/world/rungram/rootruin.png'),
  forestfog: require('../../../assets/world/rungram/forestfog.png'),
  watcheye: require('../../../assets/world/rungram/watcheye.png'),
  spore: require('../../../assets/world/rungram/spore.png'),
  dayleo: require('../../../assets/world/rungram/dayleo.png'),
  buigai: require('../../../assets/world/rungram/buigai.png'),
} as const satisfies Record<string, ImageSourcePropType>;

type ArtKind = keyof typeof FOREST_ART;

const KINDS = new Set<string>([...Object.keys(FOREST_ART), 'log']);

/**
 * Painted size when the collision / trigger footprint is `foot` wide.
 * `base` pins solids on the hitbox floor; `center` keeps flat patches / hazards over their box.
 */
const SPRITE_BOX: Record<ArtKind, { foot: number; w: number; h: number; anchor: 'base' | 'center' }> = {
  mossgrass: { foot: 128, w: 128, h: 128, anchor: 'center' },
  leaflitter: { foot: 128, w: 128, h: 128, anchor: 'center' },
  sunbeam: { foot: 128, w: 128, h: 128, anchor: 'center' },
  fern: { foot: 72, w: 128, h: 128, anchor: 'base' },
  hangingvine: { foot: 96, w: 256, h: 256, anchor: 'base' },
  forestshroom: { foot: 36, w: 128, h: 128, anchor: 'base' },
  foresttree: { foot: FOREST_HITBOX.foresttree.w, w: 128, h: 128, anchor: 'base' },
  rootwall: { foot: FOREST_HITBOX.rootwall.w, w: 128, h: 128, anchor: 'base' },
  rootruin: { foot: FOREST_HITBOX.rootruin.w, w: 128, h: 128, anchor: 'base' },
  forestfog: { foot: 128, w: 128, h: 128, anchor: 'center' },
  watcheye: { foot: 56, w: 128, h: 128, anchor: 'center' },
  spore: { foot: 48, w: 128, h: 128, anchor: 'center' },
  dayleo: { foot: VECTOR_HAZARD_ART.dayleo.w, w: 128, h: 128, anchor: 'center' },
  buigai: { foot: VECTOR_HAZARD_ART.buigai.w, w: 128, h: 128, anchor: 'center' },
};

export function isForestKind(kind: Rect['kind']): boolean {
  return kind != null && KINDS.has(kind);
}

function isArtKind(kind: Rect['kind']): kind is ArtKind {
  return kind != null && Object.prototype.hasOwnProperty.call(FOREST_ART, kind);
}

function box(rect: Rect, padX = 0, padTop = 0, padBottom = 0) {
  return {
    position: 'absolute' as const,
    left: rect.x - padX,
    top: rect.y - padTop,
    width: rect.w + padX * 2,
    height: rect.h + padTop + padBottom,
  };
}

type Props = {
  rect: Rect;
  player?: { x: number; y: number };
};

export const ForestProp = memo(function ForestProp({ rect, player }: Props) {
  if (isArtKind(rect.kind)) {
    if (rect.kind === 'watcheye') return <WatchEyeSprite rect={rect} player={player} />;
    if (rect.kind === 'sunbeam' || rect.kind === 'forestfog' || rect.kind === 'spore') {
      return <PulsingSprite rect={rect} kind={rect.kind} />;
    }
    if (rect.kind === 'fern' || rect.kind === 'hangingvine') {
      return <SwayingSprite rect={rect} kind={rect.kind} />;
    }
    return <ForestSprite rect={rect} kind={rect.kind} />;
  }
  if (rect.kind === 'log') return <FallenLog rect={rect} />;
  return null;
});

function ForestSprite({ rect, kind }: { rect: Rect; kind: ArtKind }) {
  const meta = SPRITE_BOX[kind];
  const scale = rect.w / meta.foot;
  const width = meta.w * scale;
  const height = meta.h * scale;
  const left = rect.x + rect.w / 2 - width / 2;
  const top = meta.anchor === 'base' ? rect.y + rect.h - height : rect.y + rect.h / 2 - height / 2;
  return (
    <Image
      pointerEvents="none"
      source={FOREST_ART[kind]}
      resizeMode="contain"
      style={{ position: 'absolute', left, top, width, height }}
    />
  );
}

function SwayingSprite({ rect, kind }: { rect: Rect; kind: ArtKind }) {
  const sway = useLoop(kind === 'hangingvine' ? 3600 : 3200, Math.abs(Math.floor(rect.x * 7.31 + rect.y * 3.17)) % 997 / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-4deg', '4deg', '-4deg'] });
  const meta = SPRITE_BOX[kind];
  const scale = rect.w / meta.foot;
  const width = meta.w * scale;
  const height = meta.h * scale;
  const left = rect.x + rect.w / 2 - width / 2;
  const top = meta.anchor === 'base' ? rect.y + rect.h - height : rect.y + rect.h / 2 - height / 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        transform: [{ translateY: height / 2 }, { rotate }, { translateY: -height / 2 }],
      }}
    >
      <Image source={FOREST_ART[kind]} resizeMode="contain" style={{ width, height }} />
    </Animated.View>
  );
}

function PulsingSprite({ rect, kind }: { rect: Rect; kind: ArtKind }) {
  const pulse = useLoop(kind === 'forestfog' ? 12000 : 3200, Math.abs(Math.floor(rect.x * 7.31 + rect.y * 3.17)) % 997 / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.95, 0.35] });
  const meta = SPRITE_BOX[kind];
  const scale = rect.w / meta.foot;
  const width = meta.w * scale;
  const height = meta.h * scale;
  const left = rect.x + rect.w / 2 - width / 2;
  const top = rect.y + rect.h / 2 - height / 2;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left, top, width, height, opacity }}>
      <Image source={FOREST_ART[kind]} resizeMode="contain" style={{ width, height }} />
    </Animated.View>
  );
}

const EYE_RANGE = 240;

function WatchEyeSprite({ rect, player }: { rect: Rect; player?: { x: number; y: number } }) {
  const blink = useLoop(2200 + (Math.abs(Math.floor(rect.x * 7.31 + rect.y * 3.17)) % 5) * 180, 0.4);
  const opacity = blink.interpolate({ inputRange: [0, 0.08, 0.16, 1], outputRange: [1, 0.15, 1, 1] });
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const near = player != null && Math.hypot(player.x - cx, player.y - cy) < EYE_RANGE;
  if (!near) return null;
  const meta = SPRITE_BOX.watcheye;
  const scale = rect.w / meta.foot;
  const width = meta.w * scale;
  const height = meta.h * scale;
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: cx - width / 2, top: cy - height / 2, width, height, opacity }}
    >
      <Image source={FOREST_ART.watcheye} resizeMode="contain" style={{ width, height }} />
    </Animated.View>
  );
}

function FallenLog({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <SvgRect x={0} y={rect.h * 0.15} width={rect.w} height={rect.h * 0.7} rx={rect.h * 0.35} fill={rect.fill ?? '#5c4030'} />
        <Ellipse cx={rect.h * 0.35} cy={rect.h * 0.5} rx={rect.h * 0.22} ry={rect.h * 0.3} fill="#a07848" />
        <SvgRect x={rect.w * 0.28} y={rect.h * 0.18} width={rect.w * 0.32} height={rect.h * 0.18} rx={4} fill="#3e6a32" />
      </Svg>
    </View>
  );
}

const LOOT_BOX = 44;

export function ForestLoot({ drop }: { drop: LootActor }) {
  const chest = drop.kind === 'item' && drop.itemId != null && isGearItem(drop.itemId);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: drop.x - LOOT_BOX / 2, top: drop.y - LOOT_BOX / 2, width: LOOT_BOX, height: LOOT_BOX }}>
      <Svg width={LOOT_BOX} height={LOOT_BOX}>
        {chest ? (
          <>
            <SvgRect x={7} y={14} width={30} height={20} rx={2} fill="#6a4a2e" stroke="#2b1c10" strokeWidth={2} />
            <Path d="M7 16 Q22 6 37 16" fill="#3e6a32" />
            <Ellipse cx={14} cy={18} rx={6} ry={3} fill="#4f7a3a" />
            <Ellipse cx={32} cy={28} rx={5} ry={3} fill="#4f7a3a" />
            <Circle cx={22} cy={26} r={3.5} fill={drop.tint} stroke="#2b1c10" strokeWidth={1} />
          </>
        ) : (
          <>
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(20,24,20,0.35)" />
            <Path d="M12 34 Q10 20 16 16 L28 16 Q34 20 32 34 Z" fill="#6b4a32" stroke="#3b2816" strokeWidth={2} />
            <Path d="M16 16 L14 10 L22 13 L30 10 L28 16 Z" fill="#8a6240" stroke="#3b2816" strokeWidth={1.4} />
            <Circle cx={22} cy={26} r={4} fill={drop.kind === 'gold' ? '#ffd24a' : drop.tint} />
          </>
        )}
      </Svg>
    </View>
  );
}

export type ForestGateVariant = 'rootarch' | 'treegate' | 'waterfall' | 'shrine';

/** Return is the root arch, west (Núi Non) the tree gateway, east (Đầm Lầy) the waterfall grotto. */
export function forestGateVariant(sensorId: string): ForestGateVariant {
  if (sensorId === 'return') return 'rootarch';
  if (sensorId === 'ascent') return 'shrine';
  if (sensorId === 'west') return 'treegate';
  return 'waterfall';
}

export function ForestGateArt({ variant, width, height }: { variant: ForestGateVariant; width: number; height: number }) {
  const pulse = useLoop(2600);
  const glow = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.95, 0.3] });
  const w = width;
  const h = height;
  if (variant === 'rootarch') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.16} ${h * 0.95} C${w * 0.1} ${h * 0.5} ${w * 0.28} ${h * 0.12} ${w * 0.5} ${h * 0.12} C${w * 0.72} ${h * 0.12} ${w * 0.9} ${h * 0.5} ${w * 0.84} ${h * 0.95}`}
            stroke="#3a2a1c"
            strokeWidth={w * 0.09}
            fill="none"
            strokeLinecap="round"
          />
          <Ellipse cx={w * 0.32} cy={h * 0.2} rx={w * 0.12} ry={h * 0.06} fill="#3e6a32" />
          <Ellipse cx={w * 0.68} cy={h * 0.18} rx={w * 0.14} ry={h * 0.07} fill="#4f7a3a" />
          <Path
            d={`M${w * 0.3} ${h * 0.95} L${w * 0.3} ${h * 0.5} Q${w * 0.5} ${h * 0.32} ${w * 0.7} ${h * 0.5} L${w * 0.7} ${h * 0.95} Z`}
            fill="rgba(20, 40, 18, 0.75)"
          />
        </Svg>
      </View>
    );
  }
  if (variant === 'treegate') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.18} y={h * 0.28} width={w * 0.16} height={h * 0.62} rx={8} fill="#2a1c12" />
          <SvgRect x={w * 0.66} y={h * 0.28} width={w * 0.16} height={h * 0.62} rx={8} fill="#2a1c12" />
          <Path d={`M${w * 0.16} ${h * 0.32} Q${w * 0.5} ${h * 0.06} ${w * 0.84} ${h * 0.32}`} stroke="#1c3a24" strokeWidth={22} fill="none" />
          <Ellipse cx={w * 0.5} cy={h * 0.18} rx={w * 0.28} ry={h * 0.1} fill="#24482c" />
          <Path
            d={`M${w * 0.34} ${h * 0.9} L${w * 0.34} ${h * 0.48} Q${w * 0.5} ${h * 0.34} ${w * 0.66} ${h * 0.48} L${w * 0.66} ${h * 0.9} Z`}
            fill="rgba(12, 20, 12, 0.85)"
          />
        </Svg>
      </View>
    );
  }
  if (variant === 'waterfall') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.08} ${h * 0.95} L${w * 0.2} ${h * 0.28} Q${w * 0.5} ${h * 0.08} ${w * 0.8} ${h * 0.28} L${w * 0.92} ${h * 0.95} Z`}
            fill="#5B6770"
          />
          <Path
            d={`M${w * 0.38} ${h * 0.22} L${w * 0.34} ${h * 0.95} L${w * 0.66} ${h * 0.95} L${w * 0.62} ${h * 0.22} Z`}
            fill="rgba(140, 210, 230, 0.55)"
          />
          <Path
            d={`M${w * 0.42} ${h * 0.3} L${w * 0.4} ${h * 0.9} L${w * 0.5} ${h * 0.9} L${w * 0.52} ${h * 0.3} Z`}
            fill="rgba(220, 245, 255, 0.4)"
          />
          <Ellipse cx={w * 0.5} cy={h * 0.92} rx={w * 0.22} ry={h * 0.05} fill="rgba(126, 200, 232, 0.5)" />
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.58} rx={w * 0.28} ry={h * 0.26} fill="rgba(56, 245, 255, 0.28)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <SvgRect x={w * 0.14} y={h * 0.3} width={w * 0.14} height={h * 0.58} fill="#2a1c12" />
        <SvgRect x={w * 0.72} y={h * 0.3} width={w * 0.14} height={h * 0.58} fill="#2a1c12" />
        <Path d={`M${w * 0.1} ${h * 0.32} Q${w * 0.5} ${h * 0.06} ${w * 0.9} ${h * 0.32}`} stroke="#1c3a24" strokeWidth={14} fill="none" />
        <Path
          d={`M${w * 0.28} ${h * 0.88} L${w * 0.28} ${h * 0.5} Q${w * 0.5} ${h * 0.32} ${w * 0.72} ${h * 0.5} L${w * 0.72} ${h * 0.88} Z`}
          fill="rgba(12, 18, 28, 0.9)"
          stroke="#38f5ff"
          strokeWidth={3}
        />
        <Circle cx={w * 0.5} cy={h * 0.16} r={w * 0.045} fill="#b46bff" />
      </Svg>
    </View>
  );
}
