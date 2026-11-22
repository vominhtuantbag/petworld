import { memo } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect as SvgRect } from 'react-native-svg';

import { BEACH_SAND, BEACH_WATER, BEACH_WET } from '../../world/beachDecor';
import { isGearItem } from '../../world/items';
import type { LootActor, Rect } from '../../world/types';
import type { DepthStop } from './DepthGradient';
import { useLoop } from './useLoop';

export const BEACH_DEPTH_STOPS: readonly DepthStop[] = [
  { at: 0, color: BEACH_SAND },
  { at: 0.18, color: BEACH_SAND },
  { at: 0.42, color: BEACH_WET },
  { at: 0.72, color: BEACH_WATER },
  { at: 1, color: '#2ec4b6' },
];

const KINDS = new Set([
  'driesand',
  'wetsand',
  'shallow',
  'foam',
  'seashell',
  'starfish',
  'umbrella',
  'seaweed',
  'beachchair',
  'coastrock',
  'leanpalm',
  'tikihut',
  'sunray',
  'seagull',
  'catnong',
  'vosoc',
]);

export function isBeachKind(kind: Rect['kind']): boolean {
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

export const BeachProp = memo(function BeachProp({ rect }: { rect: Rect }) {
  switch (rect.kind) {
    case 'driesand':
    case 'wetsand':
      return <Patch rect={rect} />;
    case 'shallow':
      return <Shallow rect={rect} />;
    case 'foam':
      return <Foam rect={rect} />;
    case 'seashell':
      return <Seashell rect={rect} />;
    case 'starfish':
      return <Starfish rect={rect} />;
    case 'umbrella':
      return <Umbrella rect={rect} />;
    case 'seaweed':
      return <Seaweed rect={rect} />;
    case 'beachchair':
      return <Chair rect={rect} />;
    case 'coastrock':
      return <CoastRock rect={rect} />;
    case 'leanpalm':
      return <LeanPalm rect={rect} />;
    case 'tikihut':
      return <TikiHut rect={rect} />;
    case 'sunray':
      return <Sunray rect={rect} />;
    case 'seagull':
      return <Seagull rect={rect} />;
    case 'catnong':
      return <HotSand rect={rect} />;
    case 'vosoc':
      return <ShellBed rect={rect} />;
    default:
      return null;
  }
});

function Patch({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect, 8, 6, 6)}>
      <Svg width={rect.w + 16} height={rect.h + 12}>
        <Ellipse cx={rect.w / 2 + 8} cy={rect.h / 2 + 6} rx={rect.w / 2 + 6} ry={rect.h / 2 + 4} fill={rect.fill ?? BEACH_SAND} />
      </Svg>
    </View>
  );
}

function Shallow({ rect }: { rect: Rect }) {
  const flow = useLoop(3200, seedOf(rect) / 997);
  const translateX = flow.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });
  return (
    <View pointerEvents="none" style={box(rect, 8, 6, 6)}>
      <Svg width={rect.w + 16} height={rect.h + 12} style={{ position: 'absolute' }}>
        <Ellipse cx={rect.w / 2 + 8} cy={rect.h / 2 + 6} rx={rect.w / 2 + 6} ry={rect.h / 2 + 4} fill={rect.fill ?? BEACH_WATER} />
        <Ellipse cx={rect.w / 2 + 8} cy={rect.h / 2 + 6} rx={rect.w / 2 - 8} ry={rect.h / 2 - 8} fill="rgba(255,255,255,0.12)" />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity: 0.55, transform: [{ translateX }] }}>
        <Svg width={rect.w + 16} height={rect.h + 12}>
          <Path
            d={`M10 ${rect.h * 0.4} Q${rect.w * 0.35} ${rect.h * 0.2} ${rect.w * 0.6} ${rect.h * 0.45} T${rect.w} ${rect.h * 0.35}`}
            stroke="rgba(255,255,255,0.65)"
            strokeWidth={2}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Foam({ rect }: { rect: Rect }) {
  const swell = useLoop(2800, seedOf(rect) / 997);
  const scaleX = swell.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1.08, 0.92] });
  const opacity = swell.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 1, 0.55] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity, transform: [{ scaleX }] }]}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w * 0.35} cy={rect.h * 0.55} rx={rect.w * 0.3} ry={rect.h * 0.35} fill="rgba(255,255,255,0.75)" />
        <Ellipse cx={rect.w * 0.62} cy={rect.h * 0.5} rx={rect.w * 0.34} ry={rect.h * 0.38} fill="rgba(255,255,255,0.7)" />
        <Ellipse cx={rect.w * 0.5} cy={rect.h * 0.42} rx={rect.w * 0.22} ry={rect.h * 0.28} fill="rgba(255,255,255,0.55)" />
      </Svg>
    </Animated.View>
  );
}

function Seashell({ rect }: { rect: Rect }) {
  const fill = rect.fill ?? '#f6f1e7';
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Path
          d={`M${rect.w * 0.15} ${rect.h * 0.7} Q${rect.w * 0.5} ${rect.h * 0.05} ${rect.w * 0.85} ${rect.h * 0.7} Z`}
          fill={fill}
          stroke="#c9bfa8"
          strokeWidth={1}
        />
        <Line x1={rect.w * 0.5} y1={rect.h * 0.2} x2={rect.w * 0.5} y2={rect.h * 0.7} stroke="rgba(120,100,70,0.35)" strokeWidth={1} />
      </Svg>
    </View>
  );
}

function Starfish({ rect }: { rect: Rect }) {
  const cx = rect.w / 2;
  const cy = rect.h / 2;
  const tips = [0, 72, 144, 216, 288].map((deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${cx + Math.cos(rad) * rect.w * 0.42},${cy + Math.sin(rad) * rect.h * 0.42}`;
  });
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Polygon points={tips.join(' ')} fill={rect.fill ?? '#3a7ec8'} />
        <Circle cx={cx} cy={cy} r={rect.w * 0.12} fill="#ffe680" />
      </Svg>
    </View>
  );
}

function Umbrella({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.6;
  const fill = rect.fill ?? '#e85a5a';
  return (
    <View pointerEvents="none" style={box(rect, 8, lift, 4)}>
      <Svg width={w + 16} height={h + lift + 4}>
        <G x={8} y={lift}>
          <Line x1={w / 2} y1={-lift * 0.85} x2={w / 2} y2={h * 0.85} stroke="#5a3d24" strokeWidth={3} />
          <Path d={`M${w * 0.05} ${-lift * 0.35} Q${w / 2} ${-lift * 0.95} ${w * 0.95} ${-lift * 0.35} Z`} fill={fill} />
          <Line x1={w * 0.2} y1={-lift * 0.4} x2={w / 2} y2={-lift * 0.85} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
          <Line x1={w * 0.8} y1={-lift * 0.4} x2={w / 2} y2={-lift * 0.85} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
        </G>
      </Svg>
    </View>
  );
}

function Seaweed({ rect }: { rect: Rect }) {
  const sway = useLoop(3000, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-5deg', '5deg', '-5deg'] });
  const w = rect.w;
  const h = rect.h;
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect), { transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w} height={h}>
        {[0.25, 0.5, 0.75].map((at, index) => (
          <Path
            key={at}
            d={`M${w * at} ${h} Q${w * at + (index - 1) * 10} ${h * 0.45} ${w * at + (index - 1) * 6} ${h * 0.08}`}
            stroke={rect.fill ?? '#3e6a32'}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

function Chair({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <SvgRect x={w * 0.1} y={h * 0.35} width={w * 0.8} height={h * 0.18} rx={2} fill={rect.fill ?? '#e07a4a'} />
        <SvgRect x={w * 0.12} y={h * 0.15} width={w * 0.18} height={h * 0.55} rx={2} fill="#c45a32" />
        <Line x1={w * 0.15} y1={h * 0.7} x2={w * 0.15} y2={h * 0.95} stroke="#5a3d24" strokeWidth={2} />
        <Line x1={w * 0.85} y1={h * 0.55} x2={w * 0.85} y2={h * 0.95} stroke="#5a3d24" strokeWidth={2} />
        <Line x1={w * 0.35} y1={h * 0.55} x2={w * 0.35} y2={h * 0.95} stroke="#5a3d24" strokeWidth={2} />
      </Svg>
    </View>
  );
}

function CoastRock({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.4;
  return (
    <View pointerEvents="none" style={box(rect, 6, lift, 4)}>
      <Svg width={w + 12} height={h + lift + 4}>
        <G x={6} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.75} rx={w * 0.5} ry={h * 0.28} fill="rgba(20,24,28,0.28)" />
          <Path
            d={`M0 ${h * 0.55} L${w * 0.12} ${-lift * 0.35} L${w * 0.4} ${-lift * 0.7} L${w * 0.7} ${-lift * 0.25} L${w} ${h * 0.5} L${w * 0.65} ${h} L${w * 0.2} ${h} Z`}
            fill={rect.fill ?? '#6a737a'}
          />
          <Path d={`M${w * 0.12} ${-lift * 0.35} L${w * 0.4} ${-lift * 0.7} L${w * 0.35} ${-lift * 0.1}`} fill="rgba(255,255,255,0.14)" />
        </G>
      </Svg>
    </View>
  );
}

function LeanPalm({ rect }: { rect: Rect }) {
  const sway = useLoop(3400, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-3deg', '3deg', '-3deg'] });
  const w = rect.w;
  const h = rect.h;
  const lift = h * 4.2;
  const pad = w * 0.9;
  const W = w + pad * 2;
  const cx = W / 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect, pad, lift, 4), { transform: [{ translateY: lift / 2 }, { rotate }, { translateY: -lift / 2 }] }]}
    >
      <Svg width={W} height={lift + h + 4}>
        <Ellipse cx={cx} cy={lift + h - 2} rx={w * 0.45} ry={h * 0.22} fill="rgba(20,24,20,0.28)" />
        <Path
          d={`M${cx - 4} ${lift + h} Q${cx + 8} ${lift * 0.55} ${cx + 18} ${lift * 0.12}`}
          stroke="#8a5a32"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        {[ -50, -20, 15, 45 ].map((deg, index) => {
          const rad = (deg * Math.PI) / 180;
          const tipX = cx + 18 + Math.cos(rad) * W * 0.32;
          const tipY = lift * 0.12 + Math.sin(rad) * lift * 0.18;
          return (
            <Path
              key={deg}
              d={`M${cx + 18} ${lift * 0.12} Q${cx + 18 + Math.cos(rad) * 20} ${lift * 0.05} ${tipX} ${tipY}`}
              stroke={index % 2 === 0 ? rect.fill ?? '#2d6b3a' : '#3e8a4a'}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

function TikiHut({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.8;
  return (
    <View pointerEvents="none" style={box(rect, 8, lift, 4)}>
      <Svg width={w + 16} height={h + lift + 4}>
        <G x={8} y={lift}>
          <Line x1={w * 0.18} y1={h * 0.9} x2={w * 0.18} y2={-lift * 0.2} stroke="#5a3d24" strokeWidth={5} />
          <Line x1={w * 0.82} y1={h * 0.9} x2={w * 0.82} y2={-lift * 0.2} stroke="#5a3d24" strokeWidth={5} />
          <Line x1={w * 0.18} y1={-lift * 0.2} x2={w * 0.82} y2={-lift * 0.2} stroke="#5a3d24" strokeWidth={4} />
          <Path d={`M${w * 0.05} ${-lift * 0.15} L${w * 0.5} ${-lift * 0.85} L${w * 0.95} ${-lift * 0.15} Z`} fill="#c9a66b" stroke="#8a5a32" strokeWidth={2} />
          {[0.2, 0.35, 0.5, 0.65, 0.8].map((at) => (
            <Line key={at} x1={w * at} y1={-lift * 0.2} x2={w * 0.5} y2={-lift * 0.8} stroke="#8a5a32" strokeWidth={1.5} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

function Sunray({ rect }: { rect: Rect }) {
  const pulse = useLoop(4200, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.65, 0.2] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity }]}>
      <Svg width={rect.w} height={rect.h}>
        <Path
          d={`M${rect.w * 0.35} 0 L${rect.w * 0.75} ${rect.h} L${rect.w * 0.25} ${rect.h} L${rect.w * 0.55} 0 Z`}
          fill={rect.fill ?? 'rgba(255, 244, 170, 0.18)'}
        />
      </Svg>
    </Animated.View>
  );
}

function Seagull({ rect }: { rect: Rect }) {
  const flap = useLoop(380, seedOf(rect) / 997);
  const scaleY = flap.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.45, 1] });
  const heading = rect.drift ? (Math.atan2(rect.drift.vy, rect.drift.vx) * 180) / Math.PI : 0;
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={[box(rect), { transform: [{ rotate: `${heading}deg` }] }]}>
      <Animated.View style={{ width: w, height: h, transform: [{ scaleY }] }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.08} ${h * 0.55} Q${w * 0.32} ${h * 0.12} ${w * 0.5} ${h * 0.48} Q${w * 0.68} ${h * 0.12} ${w * 0.92} ${h * 0.55}`}
            fill={rect.fill ?? 'rgba(40,44,48,0.28)'}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function HotSand({ rect }: { rect: Rect }) {
  const shimmer = useLoop(1800, seedOf(rect) / 997);
  const opacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.9, 0.35] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(232, 150, 60, 0.35)" />
        <Ellipse cx={w / 2} cy={h / 2} rx={w * 0.38} ry={h * 0.28} fill="rgba(244, 208, 63, 0.45)" />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity }}>
        <Svg width={w} height={h}>
          <Path d={`M${w * 0.2} ${h * 0.45} Q${w * 0.4} ${h * 0.25} ${w * 0.6} ${h * 0.48}`} stroke="rgba(255,255,255,0.7)" strokeWidth={2} fill="none" />
          <Path d={`M${w * 0.35} ${h * 0.65} Q${w * 0.55} ${h * 0.5} ${w * 0.78} ${h * 0.62}`} stroke="rgba(255,220,120,0.7)" strokeWidth={2} fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function ShellBed({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const seed = seedOf(rect);
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(64, 224, 208, 0.22)" />
        {Array.from({ length: 10 }, (_, index) => {
          const s = (seed * 17 + index * 131) % 1000;
          const x = w * (0.12 + ((s * 7) % 760) / 1000);
          const y = h * (0.2 + ((s * 3) % 600) / 1000);
          const r = 4 + (s % 5);
          return (
            <Path
              key={index}
              d={`M${x - r} ${y} Q${x} ${y - r * 1.2} ${x + r} ${y} Z`}
              fill={index % 2 === 0 ? '#f6f1e7' : '#e07a8a'}
              stroke="#8a6a4a"
              strokeWidth={1}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const LOOT_BOX = 44;

export function BeachLoot({ drop }: { drop: LootActor }) {
  const chest = drop.kind === 'item' && drop.itemId != null && isGearItem(drop.itemId);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: drop.x - LOOT_BOX / 2, top: drop.y - LOOT_BOX / 2, width: LOOT_BOX, height: LOOT_BOX }}
    >
      <Svg width={LOOT_BOX} height={LOOT_BOX}>
        {chest ? (
          <>
            <Path d="M8 30 Q22 8 36 30 Z" fill="#f6f1e7" stroke="#c9bfa8" strokeWidth={2} />
            <Path d="M12 28 Q22 14 32 28" fill="#e07a8a" />
            <Circle cx={22} cy={24} r={3.5} fill={drop.tint} stroke="#8a6a4a" strokeWidth={1} />
            <Ellipse cx={22} cy={34} rx={12} ry={3} fill="rgba(244, 208, 63, 0.45)" />
          </>
        ) : (
          <>
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(20,24,28,0.25)" />
            <Path d="M12 34 Q10 20 16 16 L28 16 Q34 20 32 34 Z" fill="#3a8fd4" stroke="#1e5a8a" strokeWidth={2} />
            <Path d="M16 16 L14 10 L22 13 L30 10 L28 16 Z" fill="#e85a5a" stroke="#8a2a2a" strokeWidth={1.4} />
            <Circle cx={22} cy={26} r={4} fill={drop.kind === 'gold' ? '#ffd24a' : drop.tint} />
          </>
        )}
      </Svg>
    </View>
  );
}

export type BeachGateVariant = 'resort' | 'leaf' | 'pier' | 'shrine';

/** Return is the resort arch, west (Đầm Lầy) the coconut leaf arch, east (Đại Dương) the pier. */
export function beachGateVariant(sensorId: string): BeachGateVariant {
  if (sensorId === 'return') return 'resort';
  if (sensorId === 'ascent') return 'shrine';
  if (sensorId === 'west') return 'leaf';
  return 'pier';
}

export function BeachGateArt({ variant, width, height }: { variant: BeachGateVariant; width: number; height: number }) {
  const pulse = useLoop(2600);
  const glow = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.95, 0.3] });
  const w = width;
  const h = height;
  if (variant === 'resort') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.16} y={h * 0.28} width={12} height={h * 0.6} fill="#8a5a32" />
          <SvgRect x={w * 0.8} y={h * 0.28} width={12} height={h * 0.6} fill="#8a5a32" />
          <Path d={`M${w * 0.12} ${h * 0.3} Q${w * 0.5} ${h * 0.08} ${w * 0.88} ${h * 0.3}`} stroke="#c9a66b" strokeWidth={14} fill="none" />
          <SvgRect x={w * 0.28} y={h * 0.22} width={w * 0.44} height={h * 0.1} rx={4} fill="#e85a5a" />
          <Path
            d={`M${w * 0.3} ${h * 0.88} L${w * 0.3} ${h * 0.48} Q${w * 0.5} ${h * 0.34} ${w * 0.7} ${h * 0.48} L${w * 0.7} ${h * 0.88} Z`}
            fill="rgba(64, 224, 208, 0.35)"
          />
        </Svg>
      </View>
    );
  }
  if (variant === 'leaf') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.18} ${h * 0.95} C${w * 0.12} ${h * 0.5} ${w * 0.3} ${h * 0.14} ${w * 0.5} ${h * 0.12} C${w * 0.7} ${h * 0.14} ${w * 0.88} ${h * 0.5} ${w * 0.82} ${h * 0.95}`}
            stroke="#2d6b3a"
            strokeWidth={w * 0.08}
            fill="none"
            strokeLinecap="round"
          />
          {[0.28, 0.42, 0.58, 0.72].map((at, index) => (
            <Ellipse
              key={at}
              cx={w * at}
              cy={h * (0.22 + (index % 2) * 0.06)}
              rx={w * 0.1}
              ry={h * 0.05}
              fill={index % 2 === 0 ? '#3e8a4a' : '#2d6b3a'}
            />
          ))}
          <Path
            d={`M${w * 0.32} ${h * 0.9} L${w * 0.32} ${h * 0.5} Q${w * 0.5} ${h * 0.34} ${w * 0.68} ${h * 0.5} L${w * 0.68} ${h * 0.9} Z`}
            fill="rgba(20, 40, 18, 0.55)"
          />
        </Svg>
      </View>
    );
  }
  if (variant === 'pier') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.9} rx={w * 0.42} ry={h * 0.08} fill="rgba(64, 224, 208, 0.45)" />
          <SvgRect x={w * 0.18} y={h * 0.55} width={w * 0.64} height={h * 0.14} fill="#8a5a32" stroke="#5a3d24" strokeWidth={2} />
          {[0.24, 0.4, 0.56, 0.72].map((at) => (
            <Line key={at} x1={w * at} y1={h * 0.55} x2={w * at} y2={h * 0.69} stroke="#5a3d24" strokeWidth={2} />
          ))}
          {[0.2, 0.8].map((at) => (
            <SvgRect key={at} x={w * at - 5} y={h * 0.35} width={10} height={h * 0.45} fill="#5a3d24" />
          ))}
          <Line x1={w * 0.2} y1={h * 0.38} x2={w * 0.8} y2={h * 0.38} stroke="#c9a66b" strokeWidth={4} />
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.58} rx={w * 0.28} ry={h * 0.26} fill="rgba(244, 208, 63, 0.35)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <SvgRect x={w * 0.16} y={h * 0.32} width={w * 0.14} height={h * 0.56} fill="#c9a66b" />
        <SvgRect x={w * 0.7} y={h * 0.32} width={w * 0.14} height={h * 0.56} fill="#c9a66b" />
        <Path d={`M${w * 0.1} ${h * 0.34} Q${w * 0.5} ${h * 0.08} ${w * 0.9} ${h * 0.34}`} stroke="#e8c45a" strokeWidth={12} fill="none" />
        <Path
          d={`M${w * 0.3} ${h * 0.88} L${w * 0.3} ${h * 0.5} Q${w * 0.5} ${h * 0.34} ${w * 0.7} ${h * 0.5} L${w * 0.7} ${h * 0.88} Z`}
          fill="rgba(40, 80, 90, 0.75)"
          stroke="#40E0D0"
          strokeWidth={3}
        />
        <Circle cx={w * 0.5} cy={h * 0.18} r={w * 0.045} fill="#ffe680" />
      </Svg>
    </View>
  );
}
