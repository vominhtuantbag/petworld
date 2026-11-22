import { memo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect as SvgRect } from 'react-native-svg';

import {
  DESERT_GOLD,
  DESERT_OASIS,
  DESERT_OCHRE,
  DESERT_POOL,
  DESERT_SANDSTONE,
} from '../../world/desertDecor';
import { isGearItem } from '../../world/items';
import type { LootActor, Rect } from '../../world/types';
import type { DepthStop } from './DepthGradient';
import { useLoop } from './useLoop';

export const DESERT_DEPTH_STOPS: readonly DepthStop[] = [
  { at: 0, color: DESERT_GOLD },
  { at: 0.18, color: DESERT_OCHRE },
  { at: 0.42, color: DESERT_OASIS },
  { at: 0.72, color: DESERT_OCHRE },
  { at: 1, color: DESERT_SANDSTONE },
];

const KINDS = new Set([
  'goldsand',
  'redstone',
  'drygrass',
  'oasisgreen',
  'oasispool',
  'scrub',
  'caravantrail',
  'dustwisp',
  'desdune',
  'sandridge',
  'oasispalm',
  'descactus',
  'desrock',
  'catlun_samac',
  'datnut_samac',
]);

export function isDesertMapKind(kind: Rect['kind']): boolean {
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

export const DesertMapProp = memo(function DesertMapProp({ rect }: { rect: Rect }) {
  switch (rect.kind) {
    case 'goldsand':
    case 'redstone':
    case 'oasisgreen':
      return <Patch rect={rect} />;
    case 'drygrass':
      return <DryGrass rect={rect} />;
    case 'oasispool':
      return <OasisPool rect={rect} />;
    case 'scrub':
      return <Scrub rect={rect} />;
    case 'caravantrail':
      return <Trail rect={rect} />;
    case 'dustwisp':
      return <DustWisp rect={rect} />;
    case 'desdune':
      return <DesDune rect={rect} />;
    case 'sandridge':
      return <SandRidge rect={rect} />;
    case 'oasispalm':
      return <OasisPalm rect={rect} />;
    case 'descactus':
      return <DesCactus rect={rect} />;
    case 'desrock':
      return <DesRock rect={rect} />;
    case 'catlun_samac':
      return <HotSandGust rect={rect} />;
    case 'datnut_samac':
      return <ScorchedThorns rect={rect} />;
    default:
      return null;
  }
});

/** Soft sun haze over the whole viewport. */
export function DesertHaze() {
  return (
    <View pointerEvents="none" style={styles.mist}>
      <View style={[styles.mistBank, { left: '8%', top: '12%', width: '40%', height: 48 }]} />
      <View style={[styles.mistBank, { right: '10%', top: '34%', width: '34%', height: 40 }]} />
      <View style={[styles.mistBank, { left: '22%', bottom: '16%', width: '48%', height: 56 }]} />
    </View>
  );
}

function Patch({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect, 8, 6, 6)}>
      <Svg width={rect.w + 16} height={rect.h + 12}>
        <Ellipse cx={rect.w / 2 + 8} cy={rect.h / 2 + 6} rx={rect.w / 2 + 6} ry={rect.h / 2 + 4} fill={rect.fill ?? DESERT_GOLD} />
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

function DryGrass({ rect }: { rect: Rect }) {
  const sway = useLoop(3200, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-4deg', '4deg', '-4deg'] });
  const w = rect.w;
  const h = rect.h;
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect, 2, 4, 2), { transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w + 4} height={h + 6}>
        {[0.2, 0.45, 0.7].map((at) => (
          <Line
            key={at}
            x1={2 + w * at}
            y1={h + 2}
            x2={2 + w * at + (at - 0.45) * 8}
            y2={4}
            stroke={rect.fill ?? '#c9b06a'}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

function OasisPool({ rect }: { rect: Rect }) {
  const shimmer = useLoop(2800, seedOf(rect) / 997);
  const opacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.85, 0.35] });
  return (
    <View pointerEvents="none" style={box(rect, 4, 4, 4)}>
      <Svg width={rect.w + 8} height={rect.h + 8} style={{ position: 'absolute' }}>
        <Ellipse cx={rect.w / 2 + 4} cy={rect.h / 2 + 4} rx={rect.w / 2} ry={rect.h / 2} fill={rect.fill ?? DESERT_POOL} />
        <Ellipse cx={rect.w / 2 + 4} cy={rect.h / 2 + 4} rx={rect.w / 2 - 8} ry={rect.h / 2 - 6} fill="#80deea" opacity={0.4} />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity }}>
        <Svg width={rect.w + 8} height={rect.h + 8}>
          <Ellipse cx={rect.w * 0.35 + 4} cy={rect.h * 0.4 + 4} rx={rect.w * 0.14} ry={rect.h * 0.1} fill="rgba(255,255,255,0.55)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Scrub({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w * 0.35} cy={rect.h * 0.55} rx={rect.w * 0.28} ry={rect.h * 0.35} fill={rect.fill ?? '#8d6e4a'} />
        <Ellipse cx={rect.w * 0.65} cy={rect.h * 0.5} rx={rect.w * 0.3} ry={rect.h * 0.38} fill="#6d4c41" />
      </Svg>
    </View>
  );
}

function Trail({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w / 2} cy={rect.h / 2} rx={rect.w / 2} ry={rect.h / 2} fill={rect.fill ?? '#c9a06a'} opacity={0.7} />
        {[0.25, 0.5, 0.75].map((at) => (
          <Ellipse key={at} cx={rect.w * at} cy={rect.h * 0.55} rx={8} ry={4} fill="rgba(110, 80, 40, 0.25)" />
        ))}
      </Svg>
    </View>
  );
}

function DustWisp({ rect }: { rect: Rect }) {
  const drift = useLoop(3000, seedOf(rect) / 997);
  const shift = drift.interpolate({ inputRange: [0, 1], outputRange: [-8, 12] });
  const opacity = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.45, 0.15] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity, transform: [{ translateX: shift }] }]}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w / 2} cy={rect.h / 2} rx={rect.w / 2} ry={rect.h / 2} fill={rect.fill ?? 'rgba(230,184,92,0.25)'} />
      </Svg>
    </Animated.View>
  );
}

function DesDune({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.8;
  return (
    <View pointerEvents="none" style={box(rect, 8, lift, 4)}>
      <Svg width={w + 16} height={h + lift + 4}>
        <G x={8} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.75} rx={w * 0.5} ry={h * 0.35} fill="rgba(120, 80, 30, 0.2)" />
          <Path
            d={`M0 ${h * 0.7} Q${w * 0.28} ${-lift * 0.55} ${w * 0.55} ${h * 0.15} T${w} ${h * 0.65} L${w} ${h} L0 ${h} Z`}
            fill={rect.fill ?? DESERT_OCHRE}
          />
          <Path d={`M${w * 0.2} ${h * 0.2} Q${w * 0.4} ${-lift * 0.2} ${w * 0.55} ${h * 0.15}`} stroke="rgba(255,255,255,0.25)" strokeWidth={3} fill="none" />
        </G>
      </Svg>
    </View>
  );
}

function SandRidge({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.4;
  return (
    <View pointerEvents="none" style={box(rect, 4, lift, 2)}>
      <Svg width={w + 8} height={h + lift + 2}>
        <G x={4} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.8} rx={w * 0.48} ry={h * 0.22} fill="rgba(80, 40, 20, 0.22)" />
          <Path
            d={`M0 ${h * 0.55} L${w * 0.2} ${-lift * 0.35} L${w * 0.5} ${-lift * 0.65} L${w * 0.8} ${-lift * 0.25} L${w} ${h * 0.5} L${w * 0.7} ${h} L${w * 0.2} ${h} Z`}
            fill={rect.fill ?? DESERT_SANDSTONE}
            stroke="#8B4513"
            strokeWidth={2}
          />
          <Line x1={w * 0.15} y1={h * 0.35} x2={w * 0.85} y2={h * 0.3} stroke="rgba(255,220,180,0.3)" strokeWidth={2} />
          <Line x1={w * 0.2} y1={h * 0.55} x2={w * 0.8} y2={h * 0.5} stroke="rgba(255,220,180,0.22)" strokeWidth={2} />
        </G>
      </Svg>
    </View>
  );
}

function OasisPalm({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 4.5;
  const pad = w * 0.8;
  const sway = useLoop(3600, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-2deg', '2deg', '-2deg'] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect, pad, lift, 4), { transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w + pad * 2} height={h + lift + 4}>
        <G x={pad} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.85} rx={w * 0.55} ry={h * 0.35} fill="rgba(40, 30, 10, 0.2)" />
          <Path d={`M${w * 0.42} ${h * 0.7} L${w * 0.5} ${-lift * 0.7} L${w * 0.58} ${h * 0.7} Z`} fill="#8d6e4a" />
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const tipX = w / 2 + Math.cos(rad) * w * 1.1;
            const tipY = -lift * 0.55 + Math.sin(rad) * h * 1.4;
            return (
              <Path
                key={deg}
                d={`M${w / 2} ${-lift * 0.65} Q${w / 2 + Math.cos(rad) * w * 0.55} ${-lift * 0.75 + Math.sin(rad) * h * 0.6} ${tipX} ${tipY}`}
                stroke={rect.fill ?? '#1b5e40'}
                strokeWidth={7}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
          <Circle cx={w / 2} cy={-lift * 0.65} r={w * 0.22} fill="#2E8B57" />
        </G>
      </Svg>
    </Animated.View>
  );
}

function DesCactus({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 5;
  const pad = w * 0.5;
  return (
    <View pointerEvents="none" style={box(rect, pad, lift, 2)}>
      <Svg width={w + pad * 2} height={h + lift + 2}>
        <G x={pad} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.85} rx={w * 0.45} ry={h * 0.3} fill="rgba(40, 30, 10, 0.18)" />
          <SvgRect x={w * 0.32} y={-lift * 0.75} width={w * 0.36} height={lift * 0.75 + h * 0.5} rx={w * 0.16} fill={rect.fill ?? '#2e7d32'} />
          <Path
            d={`M${w * 0.32} ${-lift * 0.35} Q${w * 0.05} ${-lift * 0.4} ${w * 0.08} ${-lift * 0.15} L${w * 0.2} ${-lift * 0.15} Q${w * 0.18} ${-lift * 0.28} ${w * 0.32} ${-lift * 0.25}`}
            fill="#388e3c"
          />
          <Path
            d={`M${w * 0.68} ${-lift * 0.45} Q${w * 0.95} ${-lift * 0.5} ${w * 0.92} ${-lift * 0.22} L${w * 0.8} ${-lift * 0.22} Q${w * 0.82} ${-lift * 0.38} ${w * 0.68} ${-lift * 0.35}`}
            fill="#388e3c"
          />
        </G>
      </Svg>
    </View>
  );
}

function DesRock({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 0.9;
  return (
    <View pointerEvents="none" style={box(rect, 4, lift, 2)}>
      <Svg width={w + 8} height={h + lift + 2}>
        <G x={4} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.8} rx={w * 0.46} ry={h * 0.22} fill="rgba(80, 50, 20, 0.2)" />
          <Path
            d={`M0 ${h * 0.55} L${w * 0.22} ${-lift * 0.3} L${w * 0.55} ${-lift * 0.5} L${w * 0.85} ${-lift * 0.15} L${w} ${h * 0.5} L${w * 0.7} ${h} L${w * 0.2} ${h} Z`}
            fill={rect.fill ?? '#a1887f'}
            stroke="#6d4c41"
            strokeWidth={2}
          />
        </G>
      </Svg>
    </View>
  );
}

function HotSandGust({ rect }: { rect: Rect }) {
  const gust = useLoop(1800, seedOf(rect) / 997);
  const shift = gust.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(212, 154, 58, 0.3)" />
        <Ellipse cx={w / 2} cy={h / 2} rx={w * 0.35} ry={h * 0.3} fill="rgba(184, 93, 59, 0.25)" />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: shift }] }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.1} ${h * 0.4} Q${w * 0.35} ${h * 0.15} ${w * 0.55} ${h * 0.42} T${w * 0.9} ${h * 0.3}`}
            stroke="rgba(255, 236, 179, 0.75)"
            strokeWidth={3}
            fill="none"
          />
          <Path
            d={`M${w * 0.15} ${h * 0.6} Q${w * 0.4} ${h * 0.4} ${w * 0.65} ${h * 0.62} T${w * 0.92} ${h * 0.5}`}
            stroke="rgba(230, 184, 92, 0.55)"
            strokeWidth={2.5}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function ScorchedThorns({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(139, 69, 19, 0.32)" />
        <Path
          d={`M${w * 0.15} ${h * 0.4} L${w * 0.4} ${h * 0.2} L${w * 0.55} ${h * 0.75} L${w * 0.25} ${h * 0.85} Z`}
          fill="#6d4c41"
        />
        <Path
          d={`M${w * 0.48} ${h * 0.25} L${w * 0.85} ${h * 0.4} L${w * 0.7} ${h * 0.85} L${w * 0.45} ${h * 0.7} Z`}
          fill="#5d4037"
        />
        <Line x1={w * 0.2} y1={h * 0.5} x2={w * 0.75} y2={h * 0.45} stroke="#3e2723" strokeWidth={3} />
        {[0.3, 0.5, 0.7].map((at) => (
          <Path
            key={at}
            d={`M${w * at} ${h * 0.7} L${w * (at + 0.04)} ${h * 0.25} L${w * (at + 0.08)} ${h * 0.7} Z`}
            fill="#8d6e4a"
          />
        ))}
      </Svg>
    </View>
  );
}

const LOOT_BOX = 44;

export function DesertMapLoot({ drop }: { drop: LootActor }) {
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
            <SvgRect x={7} y={14} width={30} height={5} fill="#E6B85C" opacity={0.9} />
            <Line x1={8} y1={24} x2={36} y2={24} stroke="#2E8B57" strokeWidth={2} />
            <Circle cx={22} cy={26} r={3.5} fill={drop.tint} stroke="#2b1c10" strokeWidth={1} />
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(230, 184, 92, 0.45)" />
          </>
        ) : (
          <>
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(80, 50, 20, 0.25)" />
            <Path d="M12 34 Q10 20 16 16 L28 16 Q34 20 32 34 Z" fill="#c9a06a" stroke="#5d4037" strokeWidth={2} />
            <Path d="M16 16 L14 10 L22 13 L30 10 L28 16 Z" fill="#2E8B57" stroke="#5d4037" strokeWidth={1.4} />
            <Line x1={14} y1={22} x2={30} y2={22} stroke="#48C9B0" strokeWidth={2} />
            <Circle cx={22} cy={26} r={4} fill={drop.kind === 'gold' ? '#ffd24a' : drop.tint} />
          </>
        )}
      </Svg>
    </View>
  );
}

export type DesertGateVariant = 'town' | 'volcano' | 'plains' | 'apex';

/** Return is the adobe arch, west (Núi Lửa) the ember gate, east (Đồng Bằng) the grass gate. */
export function desertGateVariant(sensorId: string): DesertGateVariant {
  if (sensorId === 'return') return 'town';
  if (sensorId === 'ascent') return 'apex';
  if (sensorId === 'west') return 'volcano';
  return 'plains';
}

export function DesertGateArt({ variant, width, height }: { variant: DesertGateVariant; width: number; height: number }) {
  const pulse = useLoop(2600);
  const glow = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.95, 0.3] });
  const w = width;
  const h = height;
  if (variant === 'town') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.18} y={h * 0.32} width={w * 0.14} height={h * 0.56} fill="#c9a06a" />
          <SvgRect x={w * 0.68} y={h * 0.32} width={w * 0.14} height={h * 0.56} fill="#c9a06a" />
          <Path d={`M${w * 0.12} ${h * 0.36} Q${w * 0.5} ${h * 0.1} ${w * 0.88} ${h * 0.36}`} stroke="#B85D3B" strokeWidth={12} fill="none" />
          <Path
            d={`M${w * 0.32} ${h * 0.9} L${w * 0.32} ${h * 0.5} Q${w * 0.5} ${h * 0.36} ${w * 0.68} ${h * 0.5} L${w * 0.68} ${h * 0.9} Z`}
            fill="rgba(46, 139, 87, 0.3)"
          />
          <Ellipse cx={w * 0.5} cy={h * 0.92} rx={w * 0.34} ry={h * 0.06} fill="#E6B85C" />
        </Svg>
      </View>
    );
  }
  if (variant === 'volcano') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.08} ${h * 0.95} L${w * 0.22} ${h * 0.35} L${w * 0.5} ${h * 0.12} L${w * 0.78} ${h * 0.35} L${w * 0.92} ${h * 0.95} Z`}
            fill="#3a3e44"
          />
          <Path d={`M${w * 0.3} ${h * 0.95} Q${w * 0.5} ${h * 0.28} ${w * 0.7} ${h * 0.95} Z`} fill="#FF5722" opacity={0.7} />
          <Circle cx={w * 0.5} cy={h * 0.42} r={w * 0.06} fill="#ffeb3b" />
        </Svg>
      </View>
    );
  }
  if (variant === 'plains') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.2} y={h * 0.35} width={w * 0.12} height={h * 0.5} fill="#8d6e4a" />
          <SvgRect x={w * 0.68} y={h * 0.35} width={w * 0.12} height={h * 0.5} fill="#8d6e4a" />
          <Path d={`M${w * 0.14} ${h * 0.38} Q${w * 0.5} ${h * 0.12} ${w * 0.86} ${h * 0.38}`} stroke="#7cb342" strokeWidth={10} fill="none" />
          <Ellipse cx={w * 0.5} cy={h * 0.9} rx={w * 0.32} ry={h * 0.06} fill="#8BC34A" />
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.55} rx={w * 0.28} ry={h * 0.24} fill="rgba(230, 184, 92, 0.45)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <SvgRect x={w * 0.16} y={h * 0.34} width={w * 0.14} height={h * 0.52} fill="#B85D3B" />
        <SvgRect x={w * 0.7} y={h * 0.34} width={w * 0.14} height={h * 0.52} fill="#B85D3B" />
        <Path d={`M${w * 0.1} ${h * 0.36} Q${w * 0.5} ${h * 0.1} ${w * 0.9} ${h * 0.36}`} stroke="#E6B85C" strokeWidth={12} fill="none" />
        <Path
          d={`M${w * 0.3} ${h * 0.88} L${w * 0.3} ${h * 0.5} Q${w * 0.5} ${h * 0.34} ${w * 0.7} ${h * 0.5} L${w * 0.7} ${h * 0.88} Z`}
          fill="rgba(139, 69, 19, 0.85)"
          stroke="#D49A3A"
          strokeWidth={3}
        />
        <Circle cx={w * 0.5} cy={h * 0.2} r={w * 0.045} fill="#ffeb3b" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  mist: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  mistBank: { position: 'absolute', borderRadius: 40, backgroundColor: 'rgba(230, 184, 92, 0.1)' },
});
