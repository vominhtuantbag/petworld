import { memo, useMemo } from 'react';
import { Animated, Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect as SvgRect } from 'react-native-svg';

import { PLAINS_DAMP, PLAINS_DEEP, PLAINS_MEADOW, PLAINS_SUN } from '../../world/plainsDecor';
import { isGearItem } from '../../world/items';
import type { LootActor, Rect } from '../../world/types';
import type { DepthStop } from './DepthGradient';
import { useLoop } from './useLoop';

/** Full-map backdrop for Đồng Bằng hunting map 1 (`assets/world/dongbang/background.png`). */
export const PLAINS_MAP_BACKGROUND: ImageSourcePropType = require('../../../assets/world/dongbang/background.png');

/** Native PNG size — tiles at 1:1 so the meadow never stretches soft. */
export const PLAINS_MAP_TILE_W = 1344;
export const PLAINS_MAP_TILE_H = 756;

type Frame = { x: number; y: number; w: number; h: number };

/**
 * Repeat `background.png` across the hunting map at native resolution.
 * Only mounts tiles that touch the camera frame.
 */
export const PlainsMapBackdrop = memo(function PlainsMapBackdrop({
  width,
  height,
  frame,
}: {
  width: number;
  height: number;
  frame: Frame | null;
}) {
  const tiles = useMemo(() => {
    if (!frame || width <= 0 || height <= 0) return [] as { key: string; x: number; y: number; w: number; h: number }[];
    const pad = 64;
    const col0 = Math.max(0, Math.floor((frame.x - pad) / PLAINS_MAP_TILE_W));
    const row0 = Math.max(0, Math.floor((frame.y - pad) / PLAINS_MAP_TILE_H));
    const col1 = Math.min(Math.ceil(width / PLAINS_MAP_TILE_W) - 1, Math.floor((frame.x + frame.w + pad) / PLAINS_MAP_TILE_W));
    const row1 = Math.min(Math.ceil(height / PLAINS_MAP_TILE_H) - 1, Math.floor((frame.y + frame.h + pad) / PLAINS_MAP_TILE_H));
    const out: { key: string; x: number; y: number; w: number; h: number }[] = [];
    for (let row = row0; row <= row1; row += 1) {
      for (let col = col0; col <= col1; col += 1) {
        const x = col * PLAINS_MAP_TILE_W;
        const y = row * PLAINS_MAP_TILE_H;
        if (x >= width || y >= height) continue;
        out.push({
          key: `${col}-${row}`,
          x,
          y,
          w: Math.min(PLAINS_MAP_TILE_W, width - x),
          h: Math.min(PLAINS_MAP_TILE_H, height - y),
        });
      }
    }
    return out;
  }, [width, height, frame?.x, frame?.y, frame?.w, frame?.h]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }}>
      {tiles.map((tile) => (
        <View key={tile.key} style={{ position: 'absolute', left: tile.x, top: tile.y, width: tile.w, height: tile.h, overflow: 'hidden' }}>
          <Image
            source={PLAINS_MAP_BACKGROUND}
            resizeMode="stretch"
            style={{ width: PLAINS_MAP_TILE_W, height: PLAINS_MAP_TILE_H }}
          />
        </View>
      ))}
    </View>
  );
});

/** Fallback depth ramp when the photo backdrop is unavailable. */
export const PLAINS_DEPTH_STOPS: readonly DepthStop[] = [
  { at: 0, color: PLAINS_MEADOW },
  { at: 0.2, color: PLAINS_DAMP },
  { at: 0.48, color: PLAINS_MEADOW },
  { at: 0.78, color: PLAINS_DEEP },
  { at: 1, color: PLAINS_DEEP },
];

const KINDS = new Set([
  'meadow',
  'damppatch',
  'flowerbed',
  'reed',
  'stream',
  'hillock',
  'thicketgrass',
  'dawnglow',
  'plmtree',
  'plmrock',
  'plmbush',
  'bunlay_dongbang',
  'buigai_dongbang',
]);

export function isPlainsMapKind(kind: Rect['kind']): boolean {
  return kind != null && KINDS.has(kind);
}

function seedOf(rect: Rect): number {
  return Math.abs(Math.floor(rect.x * 7.31 + rect.y * 3.17)) % 997;
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

export const PlainsMapProp = memo(function PlainsMapProp({ rect }: { rect: Rect }) {
  switch (rect.kind) {
    case 'meadow':
    case 'damppatch':
      return <Patch rect={rect} />;
    case 'flowerbed':
      return <FlowerBed rect={rect} />;
    case 'reed':
      return <Reed rect={rect} />;
    case 'stream':
      return <Stream rect={rect} />;
    case 'hillock':
      return <Hillock rect={rect} />;
    case 'thicketgrass':
      return <ThicketGrass rect={rect} />;
    case 'dawnglow':
      return <DawnGlow rect={rect} />;
    case 'plmtree':
      return <PlmTree rect={rect} />;
    case 'plmrock':
      return <PlmRock rect={rect} />;
    case 'plmbush':
      return <PlmBush rect={rect} />;
    case 'bunlay_dongbang':
      return <MuddyPatch rect={rect} />;
    case 'buigai_dongbang':
      return <ThornyBrush rect={rect} />;
    default:
      return null;
  }
});

/** Soft morning haze over the whole viewport. */
export function PlainsDawn() {
  return (
    <View pointerEvents="none" style={styles.mist}>
      <View style={[styles.mistBank, { left: '8%', top: '10%', width: '42%', height: 50 }]} />
      <View style={[styles.mistBank, { right: '10%', top: '30%', width: '34%', height: 42 }]} />
      <View style={[styles.mistBank, { left: '20%', bottom: '18%', width: '48%', height: 56 }]} />
    </View>
  );
}

function Patch({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect, 8, 6, 6)}>
      <Svg width={rect.w + 16} height={rect.h + 12}>
        <Ellipse cx={rect.w / 2 + 8} cy={rect.h / 2 + 6} rx={rect.w / 2 + 6} ry={rect.h / 2 + 4} fill={rect.fill ?? PLAINS_MEADOW} />
        <Ellipse
          cx={rect.w * 0.38 + 8}
          cy={rect.h * 0.4 + 6}
          rx={rect.w * 0.16}
          ry={rect.h * 0.1}
          fill="rgba(255,255,255,0.16)"
        />
      </Svg>
    </View>
  );
}

function FlowerBed({ rect }: { rect: Rect }) {
  const sway = useLoop(2800, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-5deg', '5deg', '-5deg'] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect, 2, 4, 2), { transform: [{ translateY: rect.h / 2 }, { rotate }, { translateY: -rect.h / 2 }] }]}
    >
      <Svg width={rect.w + 4} height={rect.h + 6}>
        <Line x1={rect.w / 2 + 2} y1={rect.h + 2} x2={rect.w / 2 + 2} y2={10} stroke="#558b2f" strokeWidth={2} />
        <Circle cx={rect.w / 2 + 2} cy={8} r={6} fill={rect.fill ?? '#ff4f93'} />
        <Circle cx={rect.w / 2 + 2} cy={8} r={2.5} fill={PLAINS_SUN} />
      </Svg>
    </Animated.View>
  );
}

function Reed({ rect }: { rect: Rect }) {
  const sway = useLoop(2400, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-6deg', '6deg', '-6deg'] });
  const w = rect.w;
  const h = rect.h;
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect, 4, 8, 2), { transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w + 8} height={h + 10}>
        {[0.25, 0.5, 0.75].map((at) => (
          <G key={at}>
            <Line x1={4 + w * at} y1={h + 6} x2={4 + w * at} y2={10} stroke={rect.fill ?? '#9e9d24'} strokeWidth={3} strokeLinecap="round" />
            <Ellipse cx={4 + w * at} cy={10} rx={5} ry={7} fill="#c0ca33" />
          </G>
        ))}
      </Svg>
    </Animated.View>
  );
}

function Stream({ rect }: { rect: Rect }) {
  const flow = useLoop(2800, seedOf(rect) / 997);
  const shift = flow.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });
  return (
    <View pointerEvents="none" style={box(rect, 4, 4, 4)}>
      <Svg width={rect.w + 8} height={rect.h + 8} style={{ position: 'absolute' }}>
        <Ellipse cx={rect.w / 2 + 4} cy={rect.h / 2 + 4} rx={rect.w / 2} ry={rect.h / 2} fill={rect.fill ?? '#64B5F6'} opacity={0.75} />
        <Ellipse cx={rect.w / 2 + 4} cy={rect.h / 2 + 4} rx={rect.w / 2 - 6} ry={rect.h / 2 - 4} fill="#BBDEFB" opacity={0.4} />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: shift }] }}>
        <Svg width={rect.w + 8} height={rect.h + 8}>
          <Ellipse cx={rect.w * 0.3 + 4} cy={rect.h * 0.45 + 4} rx={rect.w * 0.12} ry={rect.h * 0.12} fill="rgba(255,255,255,0.45)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Hillock({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Path
          d={`M0 ${rect.h * 0.75} Q${rect.w * 0.25} ${rect.h * 0.15} ${rect.w * 0.55} ${rect.h * 0.4} T${rect.w} ${rect.h * 0.7} L${rect.w} ${rect.h} L0 ${rect.h} Z`}
          fill={rect.fill ?? '#8BC34A'}
        />
      </Svg>
    </View>
  );
}

function ThicketGrass({ rect }: { rect: Rect }) {
  const sway = useLoop(2600, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-4deg', '4deg', '-4deg'] });
  const w = rect.w;
  const h = rect.h;
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect, 2, 4, 2), { transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w + 4} height={h + 6}>
        {[0.15, 0.35, 0.55, 0.75].map((at) => (
          <Line
            key={at}
            x1={2 + w * at}
            y1={h + 2}
            x2={2 + w * at + (at - 0.45) * 10}
            y2={4}
            stroke={rect.fill ?? '#558b2f'}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

function DawnGlow({ rect }: { rect: Rect }) {
  const pulse = useLoop(3200, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.12, 0.4, 0.12] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity }]}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w / 2} cy={rect.h / 2} rx={rect.w / 2} ry={rect.h / 2} fill={rect.fill ?? 'rgba(255, 245, 157, 0.22)'} />
      </Svg>
    </Animated.View>
  );
}

function PlmTree({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 5;
  const pad = w * 0.35;
  const sway = useLoop(4000, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-1.5deg', '1.5deg', '-1.5deg'] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect, pad, lift, 4), { transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w + pad * 2} height={h + lift + 4}>
        <G x={pad} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.85} rx={w * 0.45} ry={h * 0.35} fill="rgba(40, 30, 10, 0.18)" />
          <Path d={`M${w * 0.42} ${h * 0.7} L${w * 0.5} ${-lift * 0.45} L${w * 0.58} ${h * 0.7} Z`} fill="#6d4c41" />
          <Ellipse cx={w / 2} cy={-lift * 0.55} rx={w * 0.7} ry={h * 1.6} fill={rect.fill ?? '#2e7d32'} />
          <Ellipse cx={w * 0.35} cy={-lift * 0.5} rx={w * 0.35} ry={h * 1.1} fill="#43a047" />
          <Ellipse cx={w * 0.65} cy={-lift * 0.52} rx={w * 0.38} ry={h * 1.15} fill="#1b5e20" />
        </G>
      </Svg>
    </Animated.View>
  );
}

function PlmRock({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 0.9;
  return (
    <View pointerEvents="none" style={box(rect, 4, lift, 2)}>
      <Svg width={w + 8} height={h + lift + 2}>
        <G x={4} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.8} rx={w * 0.46} ry={h * 0.22} fill="rgba(40, 30, 10, 0.18)" />
          <Path
            d={`M0 ${h * 0.55} L${w * 0.22} ${-lift * 0.3} L${w * 0.55} ${-lift * 0.5} L${w * 0.85} ${-lift * 0.15} L${w} ${h * 0.5} L${w * 0.7} ${h} L${w * 0.2} ${h} Z`}
            fill={rect.fill ?? '#90a4ae'}
            stroke="#607d8b"
            strokeWidth={2}
          />
        </G>
      </Svg>
    </View>
  );
}

function PlmBush({ rect }: { rect: Rect }) {
  const sway = useLoop(3400, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-3deg', '3deg', '-3deg'] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect), { transform: [{ translateY: rect.h / 2 }, { rotate }, { translateY: -rect.h / 2 }] }]}
    >
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w * 0.35} cy={rect.h * 0.55} rx={rect.w * 0.3} ry={rect.h * 0.38} fill={rect.fill ?? '#558b2f'} />
        <Ellipse cx={rect.w * 0.65} cy={rect.h * 0.5} rx={rect.w * 0.32} ry={rect.h * 0.4} fill="#33691e" />
        <Ellipse cx={rect.w * 0.5} cy={rect.h * 0.35} rx={rect.w * 0.24} ry={rect.h * 0.3} fill="#7cb342" />
      </Svg>
    </Animated.View>
  );
}

function MuddyPatch({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(121, 85, 72, 0.35)" />
        <Ellipse cx={w * 0.4} cy={h * 0.5} rx={w * 0.28} ry={h * 0.28} fill="#6d4c41" opacity={0.7} />
        <Ellipse cx={w * 0.65} cy={h * 0.55} rx={w * 0.22} ry={h * 0.22} fill="#5d4037" opacity={0.65} />
        {[0.3, 0.5, 0.7].map((at) => (
          <Path
            key={at}
            d={`M${w * at} ${h * 0.75} L${w * (at + 0.04)} ${h * 0.3} L${w * (at + 0.08)} ${h * 0.75} Z`}
            fill="#8d6e4a"
            opacity={0.8}
          />
        ))}
      </Svg>
    </View>
  );
}

function ThornyBrush({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(85, 139, 47, 0.28)" />
        <Path
          d={`M${w * 0.15} ${h * 0.4} L${w * 0.4} ${h * 0.2} L${w * 0.55} ${h * 0.75} L${w * 0.25} ${h * 0.85} Z`}
          fill="#33691e"
        />
        <Path
          d={`M${w * 0.48} ${h * 0.25} L${w * 0.85} ${h * 0.4} L${w * 0.7} ${h * 0.85} L${w * 0.45} ${h * 0.7} Z`}
          fill="#1b5e20"
        />
        {[0.28, 0.48, 0.68].map((at) => (
          <Path
            key={at}
            d={`M${w * at} ${h * 0.7} L${w * (at + 0.05)} ${h * 0.2} L${w * (at + 0.1)} ${h * 0.7} Z`}
            fill="#558b2f"
          />
        ))}
        <Line x1={w * 0.2} y1={h * 0.5} x2={w * 0.75} y2={h * 0.45} stroke="#3e2723" strokeWidth={2} />
      </Svg>
    </View>
  );
}

const LOOT_BOX = 44;

export function PlainsMapLoot({ drop }: { drop: LootActor }) {
  const chest = drop.kind === 'item' && drop.itemId != null && isGearItem(drop.itemId);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: drop.x - LOOT_BOX / 2, top: drop.y - LOOT_BOX / 2, width: LOOT_BOX, height: LOOT_BOX }}
    >
      <Svg width={LOOT_BOX} height={LOOT_BOX}>
        {chest ? (
          <>
            <SvgRect x={7} y={14} width={30} height={20} rx={2} fill="#6a4a2e" stroke="#2b1c10" strokeWidth={2} />
            <SvgRect x={7} y={14} width={30} height={5} fill="#8BC34A" opacity={0.9} />
            <Line x1={8} y1={24} x2={36} y2={24} stroke="#FFF59D" strokeWidth={2} />
            <Circle cx={22} cy={26} r={3.5} fill={drop.tint} stroke="#2b1c10" strokeWidth={1} />
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(124, 179, 66, 0.4)" />
          </>
        ) : (
          <>
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(40, 30, 10, 0.22)" />
            <Path d="M12 34 Q10 20 16 16 L28 16 Q34 20 32 34 Z" fill="#8BC34A" stroke="#33691e" strokeWidth={2} />
            <Path d="M16 16 L14 10 L22 13 L30 10 L28 16 Z" fill="#66BB6A" stroke="#33691e" strokeWidth={1.4} />
            <Line x1={14} y1={22} x2={30} y2={22} stroke="#FFF59D" strokeWidth={2} />
            <Circle cx={22} cy={26} r={4} fill={drop.kind === 'gold' ? '#ffd24a' : drop.tint} />
          </>
        )}
      </Svg>
    </View>
  );
}

export type PlainsGateVariant = 'town' | 'desert' | 'mountains' | 'deep';

/** Return is the meadow arch, west (Sa Mạc) the dune gate, east (Núi Non) the stone gate. */
export function plainsGateVariant(sensorId: string): PlainsGateVariant {
  if (sensorId === 'return') return 'town';
  if (sensorId === 'ascent') return 'deep';
  if (sensorId === 'west') return 'desert';
  return 'mountains';
}

export function PlainsGateArt({ variant, width, height }: { variant: PlainsGateVariant; width: number; height: number }) {
  const pulse = useLoop(2600);
  const glow = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.95, 0.3] });
  const w = width;
  const h = height;
  if (variant === 'town') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.18} y={h * 0.32} width={w * 0.14} height={h * 0.56} fill="#8d6e4a" />
          <SvgRect x={w * 0.68} y={h * 0.32} width={w * 0.14} height={h * 0.56} fill="#8d6e4a" />
          <Path d={`M${w * 0.12} ${h * 0.36} Q${w * 0.5} ${h * 0.1} ${w * 0.88} ${h * 0.36}`} stroke="#7CB342" strokeWidth={12} fill="none" />
          <Path
            d={`M${w * 0.32} ${h * 0.9} L${w * 0.32} ${h * 0.5} Q${w * 0.5} ${h * 0.36} ${w * 0.68} ${h * 0.5} L${w * 0.68} ${h * 0.9} Z`}
            fill="rgba(255, 245, 157, 0.35)"
          />
          <Ellipse cx={w * 0.5} cy={h * 0.92} rx={w * 0.34} ry={h * 0.06} fill="#8BC34A" />
        </Svg>
      </View>
    );
  }
  if (variant === 'desert') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.08} ${h * 0.95} L${w * 0.2} ${h * 0.4} Q${w * 0.5} ${h * 0.12} ${w * 0.8} ${h * 0.4} L${w * 0.92} ${h * 0.95} Z`}
            fill="#c4a06a"
          />
          <Path d={`M${w * 0.28} ${h * 0.95} Q${w * 0.5} ${h * 0.35} ${w * 0.72} ${h * 0.95} Z`} fill="#e0c090" opacity={0.7} />
          <Ellipse cx={w * 0.5} cy={h * 0.88} rx={w * 0.36} ry={h * 0.07} fill="#E6B85C" />
        </Svg>
      </View>
    );
  }
  if (variant === 'mountains') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.08} ${h * 0.95} L${w * 0.28} ${h * 0.35} L${w * 0.5} ${h * 0.55} L${w * 0.72} ${h * 0.28} L${w * 0.92} ${h * 0.95} Z`}
            fill="#78909c"
          />
          <Path d={`M${w * 0.3} ${h * 0.95} Q${w * 0.5} ${h * 0.4} ${w * 0.7} ${h * 0.95} Z`} fill="#546e7a" />
          <Ellipse cx={w * 0.5} cy={h * 0.88} rx={w * 0.3} ry={h * 0.06} fill="#90a4ae" />
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.55} rx={w * 0.28} ry={h * 0.24} fill="rgba(255, 245, 157, 0.45)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <SvgRect x={w * 0.16} y={h * 0.34} width={w * 0.14} height={h * 0.52} fill="#558b2f" />
        <SvgRect x={w * 0.7} y={h * 0.34} width={w * 0.14} height={h * 0.52} fill="#558b2f" />
        <Path d={`M${w * 0.1} ${h * 0.36} Q${w * 0.5} ${h * 0.1} ${w * 0.9} ${h * 0.36}`} stroke="#8BC34A" strokeWidth={12} fill="none" />
        <Path
          d={`M${w * 0.3} ${h * 0.88} L${w * 0.3} ${h * 0.5} Q${w * 0.5} ${h * 0.34} ${w * 0.7} ${h * 0.5} L${w * 0.7} ${h * 0.88} Z`}
          fill="rgba(27, 94, 32, 0.85)"
          stroke="#FFF59D"
          strokeWidth={3}
        />
        <Circle cx={w * 0.5} cy={h * 0.2} r={w * 0.045} fill="#FFF59D" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  mist: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  mistBank: { position: 'absolute', borderRadius: 40, backgroundColor: 'rgba(255, 245, 157, 0.1)' },
});
