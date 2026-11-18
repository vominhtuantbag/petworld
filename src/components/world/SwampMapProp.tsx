import { memo } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Polygon, RadialGradient, Rect as SvgRect, Stop } from 'react-native-svg';

import { isGearItem } from '../../world/items';
import { SWAMP_CORE, SWAMP_MOSS, SWAMP_MUD, SWAMP_OLIVE } from '../../world/swampDecor';
import type { LootActor, Rect } from '../../world/types';
import type { DepthStop } from './DepthGradient';
import { useLoop } from './useLoop';

/** Damp mud and dry earth by the gate, moss, olive pools, black core mud. */
export const SWAMP_DEPTH_STOPS: readonly DepthStop[] = [
  { at: 0, color: SWAMP_MUD },
  { at: 0.1, color: SWAMP_MUD },
  { at: 0.32, color: SWAMP_MOSS },
  { at: 0.62, color: SWAMP_OLIVE },
  { at: 0.9, color: SWAMP_CORE },
  { at: 1, color: SWAMP_CORE },
];

const SWAMP_MAP_KINDS = new Set([
  'cattail',
  'tallreed',
  'waterlily',
  'duckweed',
  'swamppool',
  'plank',
  'sunkenlog',
  'cypress',
  'glowshroom',
  'swampfog',
  'dragonfly',
  'gasbubble',
  'bones',
  'vineruin',
  'bunlay',
  'khidoc',
]);

export function isSwampMapKind(kind: Rect['kind']): boolean {
  return kind != null && SWAMP_MAP_KINDS.has(kind);
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

export const SwampMapProp = memo(function SwampMapProp({ rect }: { rect: Rect }) {
  switch (rect.kind) {
    case 'cattail':
      return <Cattail rect={rect} />;
    case 'tallreed':
      return <TallReed rect={rect} />;
    case 'waterlily':
      return <WaterLily rect={rect} />;
    case 'duckweed':
      return <Duckweed rect={rect} />;
    case 'swamppool':
      return <Pool rect={rect} />;
    case 'plank':
      return <Plank rect={rect} />;
    case 'sunkenlog':
      return <SunkenLog rect={rect} />;
    case 'cypress':
      return <Cypress rect={rect} />;
    case 'glowshroom':
      return <GlowShroom rect={rect} />;
    case 'swampfog':
      return <Fog rect={rect} />;
    case 'dragonfly':
      return <Dragonfly rect={rect} />;
    case 'gasbubble':
      return <GasBubbles rect={rect} />;
    case 'bones':
      return <Bones rect={rect} />;
    case 'vineruin':
      return <VineRuin rect={rect} />;
    case 'bunlay':
      return <DeepMud rect={rect} />;
    case 'khidoc':
      return <ToxicGas rect={rect} />;
    default:
      return null;
  }
});

function Cattail({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const stems = [
    { x: 0.3, top: 0.12, lean: -3 },
    { x: 0.55, top: 0.02, lean: 2 },
    { x: 0.78, top: 0.22, lean: 4 },
  ];
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <Path d={`M${w * 0.15} ${h} Q${w * 0.05} ${h * 0.6} ${w * 0.02} ${h * 0.35}`} stroke="#4f7a3a" strokeWidth={3} fill="none" />
        <Path d={`M${w * 0.85} ${h} Q${w * 0.98} ${h * 0.65} ${w} ${h * 0.4}`} stroke="#4f7a3a" strokeWidth={3} fill="none" />
        {stems.map((stem) => (
          <G key={stem.x}>
            <Line x1={w * stem.x} y1={h} x2={w * stem.x + stem.lean} y2={h * stem.top} stroke="#5d8a42" strokeWidth={2.5} />
            <SvgRect x={w * stem.x + stem.lean * 0.8 - 4} y={h * (stem.top + 0.1)} width={8} height={h * 0.22} rx={4} fill="#7a4e2a" />
          </G>
        ))}
      </Svg>
    </View>
  );
}

function TallReed({ rect }: { rect: Rect }) {
  const sway = useLoop(3600, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-3deg', '3deg', '-3deg'] });
  const w = rect.w;
  const h = rect.h;
  const blades = [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.92];
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect), { opacity: 0.88, transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w} height={h}>
        {blades.map((at, index) => {
          const x = w * at;
          const bend = (index % 2 === 0 ? 1 : -1) * w * 0.08;
          const tip = h * (0.02 + (index % 3) * 0.08);
          return (
            <Path
              key={at}
              d={`M${x - 3} ${h} Q${x + bend} ${h * 0.5} ${x + bend * 1.6} ${tip} Q${x + bend * 0.6} ${h * 0.5} ${x + 3} ${h} Z`}
              fill={index % 3 === 0 ? '#3e6a32' : index % 3 === 1 ? '#557f3c' : '#2f5a2c'}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

function WaterLily({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const flower = rect.fill ?? '#f6c6d8';
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <Path
          d={`M${w / 2} ${h / 2} L${w * 0.95} ${h * 0.38} A${w * 0.46} ${h * 0.46} 0 1 1 ${w * 0.95} ${h * 0.62} Z`}
          fill="#3f7a3a"
          stroke="#2c5a2a"
          strokeWidth={1}
        />
        <Circle cx={w * 0.42} cy={h * 0.45} r={w * 0.13} fill={flower} />
        <Circle cx={w * 0.42} cy={h * 0.45} r={w * 0.05} fill="#ffe680" />
      </Svg>
    </View>
  );
}

function Duckweed({ rect }: { rect: Rect }) {
  const seed = seedOf(rect);
  const dots = Array.from({ length: 14 }, (_, index) => {
    const s = (seed * 17 + index * 131) % 1000;
    return { x: 0.08 + ((s * 7) % 840) / 1000, y: 0.15 + ((s * 3) % 700) / 1000, r: 2.5 + (s % 4) };
  });
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        {dots.map((dot, index) => (
          <Circle key={index} cx={rect.w * dot.x} cy={rect.h * dot.y} r={dot.r} fill={index % 3 === 0 ? '#8ac24a' : '#6fa83a'} />
        ))}
      </Svg>
    </View>
  );
}

function Pool({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const water = rect.fill ?? SWAMP_OLIVE;
  const dark = water === SWAMP_CORE;
  return (
    <View pointerEvents="none" style={box(rect, 10, 8, 8)}>
      <Svg width={w + 20} height={h + 16}>
        <Ellipse cx={w / 2 + 10} cy={h / 2 + 8} rx={w / 2 + 10} ry={h / 2 + 8} fill={dark ? '#1a1e1a' : '#3d3226'} opacity={0.75} />
        <Path
          d={`M${10 + w * 0.06} ${8 + h * 0.5} C${10 + w * 0.04} ${8 + h * 0.1} ${10 + w * 0.6} ${8 - h * 0.02} ${10 + w * 0.9} ${8 + h * 0.25} C${10 + w * 1.04} ${8 + h * 0.5} ${10 + w * 0.85} ${8 + h * 1.02} ${10 + w * 0.45} ${8 + h * 0.95} C${10 + w * 0.15} ${8 + h * 0.9} ${10 + w * 0.08} ${8 + h * 0.75} ${10 + w * 0.06} ${8 + h * 0.5} Z`}
          fill={water}
        />
        <Ellipse cx={10 + w * 0.38} cy={8 + h * 0.4} rx={w * 0.14} ry={h * 0.05} fill="none" stroke={dark ? 'rgba(160, 120, 220, 0.35)' : 'rgba(210, 230, 190, 0.35)'} strokeWidth={2} />
        <Ellipse cx={10 + w * 0.62} cy={8 + h * 0.62} rx={w * 0.1} ry={h * 0.04} fill="none" stroke={dark ? 'rgba(160, 120, 220, 0.3)' : 'rgba(210, 230, 190, 0.3)'} strokeWidth={2} />
      </Svg>
    </View>
  );
}

function Plank({ rect }: { rect: Rect }) {
  const across = rect.w >= rect.h;
  const length = across ? rect.w : rect.h;
  const thick = across ? rect.h : rect.w;
  const step = 22;
  const boards = Math.max(1, Math.floor(length / step));
  const seed = seedOf(rect);
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        {Array.from({ length: boards }, (_, index) => {
          const s = (seed + index * 37) % 11;
          if (s === 0) return null;
          const offset = index * step + 2;
          const drop = s === 3 ? 4 : 0;
          const tone = s % 3 === 0 ? '#6a4a2e' : s % 3 === 1 ? '#7a5a3a' : '#5c4028';
          return across ? (
            <SvgRect key={index} x={offset} y={2 + drop} width={step - 5} height={thick - 4} rx={2} fill={tone} stroke="#3b2816" strokeWidth={1} />
          ) : (
            <SvgRect key={index} x={2 + drop} y={offset} width={thick - 4} height={step - 5} rx={2} fill={tone} stroke="#3b2816" strokeWidth={1} />
          );
        })}
        {Array.from({ length: Math.floor(boards / 4) + 1 }, (_, index) => {
          const at = index * step * 4 + 4;
          return across ? (
            <G key={`post-${index}`}>
              <Circle cx={at} cy={1} r={3} fill="#3b2816" />
              <Circle cx={at} cy={thick - 1} r={3} fill="#3b2816" />
            </G>
          ) : (
            <G key={`post-${index}`}>
              <Circle cx={1} cy={at} r={3} fill="#3b2816" />
              <Circle cx={thick - 1} cy={at} r={3} fill="#3b2816" />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function SunkenLog({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <SvgRect x={0} y={h * 0.15} width={w} height={h * 0.7} rx={h * 0.35} fill="#5c4030" />
        <Ellipse cx={h * 0.35} cy={h * 0.5} rx={h * 0.22} ry={h * 0.3} fill="#a07848" />
        <SvgRect x={w * 0.3} y={h * 0.2} width={w * 0.3} height={h * 0.16} rx={4} fill="#4f7a3a" />
        <SvgRect x={0} y={h * 0.55} width={w} height={h * 0.45} fill="rgba(74, 93, 63, 0.75)" />
      </Svg>
    </View>
  );
}

function Cypress({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 3.2;
  const padX = w * 0.7;
  const W = w + padX * 2;
  const cx = W / 2;
  const base = lift + h;
  const canopy = rect.fill ?? '#1c3a24';
  const vines = [0.22, 0.36, 0.64, 0.8];
  return (
    <View pointerEvents="none" style={box(rect, padX, lift, 8)}>
      <Svg width={W} height={lift + h + 8}>
        <Ellipse cx={cx} cy={base - 4} rx={w * 0.9} ry={h * 0.28} fill="rgba(10, 16, 12, 0.35)" />
        <Path d={`M${cx - w * 0.16} ${base - h * 0.5} Q${cx - w * 0.5} ${base - h * 0.6} ${cx - w * 0.75} ${base}`} stroke="#3a2a1c" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Path d={`M${cx + w * 0.16} ${base - h * 0.5} Q${cx + w * 0.5} ${base - h * 0.6} ${cx + w * 0.75} ${base}`} stroke="#3a2a1c" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Path d={`M${cx - w * 0.06} ${base - h * 0.4} Q${cx - w * 0.22} ${base - h * 0.1} ${cx - w * 0.3} ${base + 2}`} stroke="#4a3424" strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d={`M${cx + w * 0.06} ${base - h * 0.4} Q${cx + w * 0.22} ${base - h * 0.1} ${cx + w * 0.3} ${base + 2}`} stroke="#4a3424" strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path
          d={`M${cx - w * 0.2} ${base - h * 0.45} C${cx - w * 0.12} ${lift * 0.7} ${cx - w * 0.28} ${lift * 0.45} ${cx - w * 0.1} ${lift * 0.25} L${cx + w * 0.1} ${lift * 0.25} C${cx + w * 0.24} ${lift * 0.5} ${cx + w * 0.1} ${lift * 0.7} ${cx + w * 0.2} ${base - h * 0.45} Z`}
          fill="#3a2a1c"
        />
        <Ellipse cx={cx} cy={lift * 0.28} rx={W * 0.46} ry={lift * 0.2} fill={canopy} />
        <Ellipse cx={cx - W * 0.24} cy={lift * 0.38} rx={W * 0.24} ry={lift * 0.14} fill="#24482c" />
        <Ellipse cx={cx + W * 0.24} cy={lift * 0.36} rx={W * 0.24} ry={lift * 0.14} fill="#24482c" />
        <Ellipse cx={cx - W * 0.06} cy={lift * 0.16} rx={W * 0.26} ry={lift * 0.11} fill="#2c5434" />
        {vines.map((at, index) => (
          <Path
            key={at}
            d={`M${W * at} ${lift * 0.42} Q${W * at + (index % 2 === 0 ? 4 : -4)} ${lift * 0.62} ${W * at} ${lift * (0.72 + (index % 2) * 0.1)}`}
            stroke="#3e6a32"
            strokeWidth={2.5}
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

function GlowShroom({ rect }: { rect: Rect }) {
  const pulse = useLoop(2200, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.85, 0.3] });
  const glow = rect.fill ?? '#b46bff';
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect, 10, 10, 4)}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity }}>
        <Svg width={w + 20} height={h + 14}>
          <Ellipse cx={w / 2 + 10} cy={h * 0.55 + 10} rx={w * 0.75} ry={h * 0.65} fill={glow} opacity={0.4} />
        </Svg>
      </Animated.View>
      <Svg width={w + 20} height={h + 14} style={{ position: 'absolute' }}>
        <G x={10} y={10}>
          <SvgRect x={w * 0.22} y={h * 0.5} width={4} height={h * 0.5} fill="#efe6d2" />
          <Path d={`M${w * 0.02} ${h * 0.55} Q${w * 0.24} ${h * 0.1} ${w * 0.46} ${h * 0.55} Z`} fill={glow} />
          <SvgRect x={w * 0.66} y={h * 0.4} width={4} height={h * 0.6} fill="#efe6d2" />
          <Path d={`M${w * 0.42} ${h * 0.45} Q${w * 0.68} ${h * -0.05} ${w * 0.96} ${h * 0.45} Z`} fill={glow} />
          <Circle cx={w * 0.6} cy={h * 0.25} r={2} fill="#ffffff" />
          <Circle cx={w * 0.76} cy={h * 0.3} r={1.5} fill="#ffffff" />
          <Circle cx={w * 0.2} cy={h * 0.4} r={1.5} fill="#ffffff" />
        </G>
      </Svg>
    </View>
  );
}

function Fog({ rect }: { rect: Rect }) {
  const drift = useLoop(11000, seedOf(rect) / 997);
  const translateX = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-50, 50, -50] });
  const opacity = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity, transform: [{ translateX }] }]}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w * 0.5} cy={rect.h * 0.55} rx={rect.w * 0.5} ry={rect.h * 0.45} fill="rgba(190, 210, 180, 0.14)" />
        <Ellipse cx={rect.w * 0.32} cy={rect.h * 0.5} rx={rect.w * 0.3} ry={rect.h * 0.34} fill="rgba(206, 222, 196, 0.15)" />
        <Ellipse cx={rect.w * 0.7} cy={rect.h * 0.6} rx={rect.w * 0.26} ry={rect.h * 0.3} fill="rgba(206, 222, 196, 0.13)" />
      </Svg>
    </Animated.View>
  );
}

function Dragonfly({ rect }: { rect: Rect }) {
  const flap = useLoop(160, seedOf(rect) / 997);
  const scaleY = flap.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.35, 1] });
  const heading = rect.drift ? (Math.atan2(rect.drift.vy, rect.drift.vx) * 180) / Math.PI : 0;
  const w = rect.w;
  const h = rect.h;
  const body = rect.fill ?? '#3aa0c8';
  return (
    <View pointerEvents="none" style={[box(rect), { transform: [{ rotate: `${heading}deg` }] }]}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: [{ scaleY }] }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.58} cy={h * 0.25} rx={w * 0.13} ry={h * 0.22} fill="rgba(220, 240, 255, 0.6)" />
          <Ellipse cx={w * 0.58} cy={h * 0.75} rx={w * 0.13} ry={h * 0.22} fill="rgba(220, 240, 255, 0.6)" />
          <Ellipse cx={w * 0.44} cy={h * 0.28} rx={w * 0.11} ry={h * 0.18} fill="rgba(220, 240, 255, 0.5)" />
          <Ellipse cx={w * 0.44} cy={h * 0.72} rx={w * 0.11} ry={h * 0.18} fill="rgba(220, 240, 255, 0.5)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Line x1={w * 0.08} y1={h / 2} x2={w * 0.72} y2={h / 2} stroke={body} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={w * 0.78} cy={h / 2} r={3.5} fill={body} />
      </Svg>
    </View>
  );
}

function GasBubbles({ rect }: { rect: Rect }) {
  const rise = useLoop(2400, seedOf(rect) / 997);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [rect.h * 0.3, -rect.h * 0.3] });
  const opacity = rise.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.8, 0] });
  const dots = [
    { x: 0.35, y: 0.82, r: 5 },
    { x: 0.6, y: 0.6, r: 4 },
    { x: 0.42, y: 0.42, r: 6 },
    { x: 0.66, y: 0.22, r: 3.5 },
  ];
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity, transform: [{ translateY }] }]}>
      <Svg width={rect.w} height={rect.h}>
        {dots.map((dot) => (
          <Circle
            key={`${dot.x}-${dot.y}`}
            cx={rect.w * dot.x}
            cy={rect.h * dot.y}
            r={dot.r}
            fill="rgba(170, 210, 140, 0.25)"
            stroke="rgba(214, 236, 190, 0.85)"
            strokeWidth={1.4}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

function Bones({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <Line x1={w * 0.15} y1={h * 0.55} x2={w * 0.7} y2={h * 0.55} stroke="#d9d2bc" strokeWidth={4} strokeLinecap="round" />
        {[0.25, 0.37, 0.49, 0.61].map((at) => (
          <Path key={at} d={`M${w * at} ${h * 0.55} Q${w * (at - 0.04)} ${h * 0.2} ${w * (at + 0.03)} ${h * 0.12}`} stroke="#cfc6ae" strokeWidth={3} fill="none" strokeLinecap="round" />
        ))}
        <Ellipse cx={w * 0.82} cy={h * 0.55} rx={w * 0.12} ry={h * 0.22} fill="#e2dbc6" />
        <Circle cx={w * 0.8} cy={h * 0.5} r={2.5} fill="#232924" />
        <Circle cx={w * 0.87} cy={h * 0.5} r={2.5} fill="#232924" />
        <Line x1={w * 0.08} y1={h * 0.88} x2={w * 0.36} y2={h * 0.78} stroke="#cfc6ae" strokeWidth={3} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function VineRuin({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.5;
  return (
    <View pointerEvents="none" style={box(rect, 10, lift, 6)}>
      <Svg width={w + 20} height={h + lift + 6}>
        <G x={10} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.85} rx={w * 0.55} ry={h * 0.2} fill="rgba(10, 14, 10, 0.4)" />
          <SvgRect x={0} y={h * 0.5} width={w} height={h * 0.42} rx={4} fill="#3e433c" />
          <SvgRect x={w * 0.06} y={-lift * 0.75} width={w * 0.2} height={lift * 0.75 + h * 0.55} fill={rect.fill ?? '#4a4f48'} />
          <SvgRect x={w * 0.72} y={-lift * 0.4} width={w * 0.2} height={lift * 0.4 + h * 0.55} fill={rect.fill ?? '#4a4f48'} />
          <Polygon points={`${w * 0.72},${-lift * 0.4} ${w * 0.8},${-lift * 0.55} ${w * 0.92},${-lift * 0.4}`} fill="#3e433c" />
          <SvgRect x={0} y={-lift * 0.82} width={w * 0.34} height={lift * 0.1} fill="#5a6058" />
          <Path d={`M${w * 0.1} ${-lift * 0.74} Q${w * 0.2} ${-lift * 0.3} ${w * 0.12} ${h * 0.4}`} stroke="#3e6a32" strokeWidth={4} fill="none" />
          <Path d={`M${w * 0.22} ${-lift * 0.7} Q${w * 0.14} ${-lift * 0.2} ${w * 0.24} ${h * 0.3}`} stroke="#2f5a2c" strokeWidth={3} fill="none" />
          <Path d={`M${w * 0.78} ${-lift * 0.36} Q${w * 0.9} ${0} ${w * 0.82} ${h * 0.45}`} stroke="#3e6a32" strokeWidth={4} fill="none" />
          {[0.12, 0.2, 0.84].map((at, index) => (
            <Ellipse key={at} cx={w * at} cy={index === 2 ? -lift * 0.1 : -lift * 0.35} rx={7} ry={4} fill="#4f7a3a" />
          ))}
        </G>
      </Svg>
    </View>
  );
}

function DeepMud({ rect }: { rect: Rect }) {
  const pop = useLoop(1800, seedOf(rect) / 997);
  const scale = pop.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.3, 1, 1.25] });
  const opacity = pop.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.2, 0.9, 0] });
  const w = rect.w;
  const h = rect.h;
  const id = `bl${seedOf(rect)}`;
  const spots = [
    { x: 0.35, y: 0.42, r: 16 },
    { x: 0.6, y: 0.58, r: 12 },
    { x: 0.48, y: 0.3, r: 9 },
  ];
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#14110c" stopOpacity="1" />
            <Stop offset="0.65" stopColor="#3a2e22" stopOpacity="0.95" />
            <Stop offset="1" stopColor={SWAMP_MUD} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={`url(#${id})`} />
        <Ellipse cx={w * 0.4} cy={h * 0.38} rx={w * 0.12} ry={h * 0.05} fill="none" stroke="rgba(120, 100, 70, 0.55)" strokeWidth={3} />
        <Ellipse cx={w * 0.62} cy={h * 0.64} rx={w * 0.1} ry={h * 0.04} fill="none" stroke="rgba(120, 100, 70, 0.5)" strokeWidth={3} />
      </Svg>
      {spots.map((spot) => (
        <Animated.View
          key={`${spot.x}-${spot.y}`}
          style={{
            position: 'absolute',
            left: w * spot.x - spot.r,
            top: h * spot.y - spot.r,
            width: spot.r * 2,
            height: spot.r * 2,
            borderRadius: spot.r,
            borderWidth: 2,
            borderColor: 'rgba(150, 128, 90, 0.85)',
            backgroundColor: 'rgba(60, 48, 34, 0.6)',
            opacity,
            transform: [{ scale }],
          }}
        />
      ))}
    </View>
  );
}

function ToxicGas({ rect }: { rect: Rect }) {
  const swell = useLoop(3200, seedOf(rect) / 997);
  const scale = swell.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.92, 1.06, 0.92] });
  const opacity = swell.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.65, 1, 0.65] });
  const rise = useLoop(2600, (seedOf(rect) + 300) / 997);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [rect.h * 0.15, -rect.h * 0.25] });
  const wisp = rise.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.8, 0] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity, transform: [{ scale }] }}>
        <Svg width={w} height={h}>
          <Circle cx={w * 0.5} cy={h * 0.55} r={w * 0.42} fill="rgba(120, 200, 60, 0.16)" />
          <Circle cx={w * 0.36} cy={h * 0.48} r={w * 0.24} fill="rgba(150, 220, 70, 0.18)" />
          <Circle cx={w * 0.64} cy={h * 0.6} r={w * 0.22} fill="rgba(150, 220, 70, 0.16)" />
          <Circle cx={w * 0.52} cy={h * 0.4} r={w * 0.16} fill="rgba(190, 240, 90, 0.18)" />
        </Svg>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: wisp, transform: [{ translateY }] }}>
        <Svg width={w} height={h}>
          <Circle cx={w * 0.42} cy={h * 0.5} r={w * 0.07} fill="rgba(200, 245, 120, 0.35)" />
          <Circle cx={w * 0.58} cy={h * 0.42} r={w * 0.05} fill="rgba(200, 245, 120, 0.3)" />
          <Circle cx={w * 0.5} cy={h * 0.3} r={w * 0.04} fill="rgba(200, 245, 120, 0.3)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const LOOT_BOX = 44;

/** Gold, pet food, and other drops float as burlap pouches. Gear sits in a half-sunk mossy chest. */
export function SwampLoot({ drop }: { drop: LootActor }) {
  const bob = useLoop(2600, (drop.x % 97) / 97);
  const translateY = bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-2, 2, -2] });
  const chest = drop.kind === 'item' && drop.itemId != null && isGearItem(drop.itemId);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: drop.x - LOOT_BOX / 2, top: drop.y - LOOT_BOX / 2, width: LOOT_BOX, height: LOOT_BOX }}>
      <Animated.View style={{ width: LOOT_BOX, height: LOOT_BOX, transform: [{ translateY }] }}>
        <Svg width={LOOT_BOX} height={LOOT_BOX}>
          {chest ? (
            <>
              <SvgRect x={6} y={12} width={32} height={22} rx={3} fill="#6a4a2e" stroke="#3b2816" strokeWidth={2} />
              <Path d="M6 16 Q22 4 38 16" fill="#7a5a3a" stroke="#3b2816" strokeWidth={2} />
              <SvgRect x={19} y={16} width={6} height={7} fill={drop.tint} stroke="#3b2816" strokeWidth={1} />
              <Ellipse cx={13} cy={14} rx={6} ry={3} fill="#4f7a3a" />
              <Ellipse cx={32} cy={20} rx={4} ry={2.5} fill="#4f7a3a" />
              <SvgRect x={2} y={26} width={40} height={14} rx={7} fill="rgba(74, 93, 63, 0.85)" />
              <Ellipse cx={22} cy={27} rx={18} ry={2.5} fill="none" stroke="rgba(214, 236, 190, 0.6)" strokeWidth={1.2} />
            </>
          ) : (
            <>
              <Ellipse cx={22} cy={38} rx={14} ry={3} fill="rgba(20, 26, 20, 0.4)" />
              <Path d="M10 36 Q6 22 16 16 L28 16 Q38 22 34 36 Z" fill="#b08a5a" stroke="#6e5434" strokeWidth={2} />
              <Path d="M16 16 L14 9 L22 12 L30 9 L28 16 Z" fill="#a07a4a" stroke="#6e5434" strokeWidth={1.5} />
              <Line x1={15} y1={16} x2={29} y2={16} stroke="#5a3d24" strokeWidth={2.5} />
              <Line x1={14} y1={24} x2={30} y2={30} stroke="rgba(110, 84, 52, 0.5)" strokeWidth={1} />
              <Line x1={14} y1={30} x2={30} y2={24} stroke="rgba(110, 84, 52, 0.5)" strokeWidth={1} />
              <Circle cx={22} cy={27} r={4} fill={drop.kind === 'gold' ? '#ffd24a' : drop.tint} />
            </>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

export type SwampGateVariant = 'boardwalk' | 'rootarch' | 'dock' | 'shrine';

/** Return is the boardwalk, west (Rừng Rậm) the root archway, east (Bãi Biển) the dock, ascent the shrine. */
export function swampGateVariant(sensorId: string): SwampGateVariant {
  if (sensorId === 'return') return 'boardwalk';
  if (sensorId === 'ascent') return 'shrine';
  if (sensorId === 'west') return 'rootarch';
  return 'dock';
}

export function SwampGateArt({ variant, width, height }: { variant: SwampGateVariant; width: number; height: number }) {
  const pulse = useLoop(2600);
  const glow = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.95, 0.3] });
  const w = width;
  const h = height;
  if (variant === 'boardwalk') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Polygon points={`${w * 0.38},${h * 0.5} ${w * 0.62},${h * 0.5} ${w * 0.78},${h * 0.98} ${w * 0.22},${h * 0.98}`} fill="#6a4a2e" />
          {[0.56, 0.64, 0.72, 0.8, 0.88, 0.96].map((at) => {
            const spread = 0.12 + (at - 0.5) * 0.32;
            return <Line key={at} x1={w * (0.5 - spread)} y1={h * at} x2={w * (0.5 + spread)} y2={h * at} stroke="#3b2816" strokeWidth={2} />;
          })}
          <SvgRect x={w * 0.24} y={h * 0.2} width={10} height={h * 0.62} fill="#5a3d24" />
          <SvgRect x={w * 0.72} y={h * 0.2} width={10} height={h * 0.62} fill="#5a3d24" />
          <SvgRect x={w * 0.2} y={h * 0.18} width={w * 0.62} height={14} rx={3} fill="#7a5a3a" stroke="#3b2816" strokeWidth={2} />
          <SvgRect x={w * 0.36} y={h * 0.25} width={w * 0.28} height={h * 0.08} rx={3} fill="#c9a66b" stroke="#3b2816" strokeWidth={1.5} />
          <Line x1={w * 0.3} y1={h * 0.29} x2={w * 0.3} y2={h * 0.36} stroke="#333" strokeWidth={1.5} />
          <Circle cx={w * 0.3} cy={h * 0.39} r={7} fill="#ffcf6a" />
        </Svg>
      </View>
    );
  }
  if (variant === 'rootarch') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
          <Svg width={w} height={h}>
            <Ellipse cx={w * 0.5} cy={h * 0.62} rx={w * 0.22} ry={h * 0.26} fill="rgba(140, 230, 120, 0.35)" />
          </Svg>
        </Animated.View>
        <Svg width={w} height={h} style={{ position: 'absolute' }}>
          <Path d={`M${w * 0.18} ${h * 0.95} C${w * 0.12} ${h * 0.5} ${w * 0.3} ${h * 0.12} ${w * 0.5} ${h * 0.14} C${w * 0.7} ${h * 0.12} ${w * 0.88} ${h * 0.5} ${w * 0.82} ${h * 0.95}`} stroke="#4a3424" strokeWidth={w * 0.09} fill="none" strokeLinecap="round" />
          <Path d={`M${w * 0.26} ${h * 0.95} C${w * 0.24} ${h * 0.6} ${w * 0.36} ${h * 0.3} ${w * 0.5} ${h * 0.28}`} stroke="#5c4030" strokeWidth={w * 0.04} fill="none" />
          <Path d={`M${w * 0.74} ${h * 0.95} C${w * 0.76} ${h * 0.6} ${w * 0.64} ${h * 0.3} ${w * 0.5} ${h * 0.28}`} stroke="#5c4030" strokeWidth={w * 0.04} fill="none" />
          <Path d={`M${w * 0.08} ${h * 0.98} Q${w * 0.16} ${h * 0.88} ${w * 0.2} ${h * 0.8}`} stroke="#4a3424" strokeWidth={8} fill="none" strokeLinecap="round" />
          <Path d={`M${w * 0.92} ${h * 0.98} Q${w * 0.84} ${h * 0.88} ${w * 0.8} ${h * 0.8}`} stroke="#4a3424" strokeWidth={8} fill="none" strokeLinecap="round" />
          <Ellipse cx={w * 0.36} cy={h * 0.18} rx={w * 0.12} ry={h * 0.06} fill="#2c5434" />
          <Ellipse cx={w * 0.62} cy={h * 0.16} rx={w * 0.14} ry={h * 0.07} fill="#24482c" />
          {[0.3, 0.44, 0.58, 0.7].map((at, index) => (
            <Line key={at} x1={w * at} y1={h * 0.2} x2={w * at} y2={h * (0.36 + (index % 2) * 0.1)} stroke="#3e6a32" strokeWidth={2.5} />
          ))}
        </Svg>
      </View>
    );
  }
  if (variant === 'dock') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.86} rx={w * 0.46} ry={h * 0.1} fill="rgba(74, 93, 63, 0.8)" />
          <SvgRect x={w * 0.12} y={h * 0.62} width={w * 0.76} height={h * 0.12} fill="#7a5a3a" stroke="#3b2816" strokeWidth={2.5} />
          {[0.2, 0.32, 0.44, 0.56, 0.68, 0.8].map((at) => (
            <Line key={at} x1={w * at} y1={h * 0.62} x2={w * at} y2={h * 0.74} stroke="#3b2816" strokeWidth={1.5} />
          ))}
          {[0.14, 0.86].map((at) => (
            <SvgRect key={at} x={w * at - 6} y={h * 0.3} width={12} height={h * 0.6} fill="#5a3d24" />
          ))}
          <Path d={`M${w * 0.14} ${h * 0.34} Q${w * 0.5} ${h * 0.46} ${w * 0.86} ${h * 0.34}`} stroke="#c9b48a" strokeWidth={3} fill="none" />
          <SvgRect x={w * 0.36} y={h * 0.14} width={w * 0.28} height={h * 0.1} rx={3} fill="#c9a66b" stroke="#3b2816" strokeWidth={1.5} />
          <Line x1={w * 0.5} y1={h * 0.24} x2={w * 0.5} y2={h * 0.32} stroke="#5a3d24" strokeWidth={3} />
          <Circle cx={w * 0.86} cy={h * 0.27} r={8} fill="#ffcf6a" />
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.6} rx={w * 0.26} ry={h * 0.28} fill="rgba(140, 255, 170, 0.35)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <SvgRect x={w * 0.08} y={h * 0.88} width={w * 0.84} height={h * 0.08} fill="#4a4f48" />
        <SvgRect x={w * 0.14} y={h * 0.3} width={w * 0.13} height={h * 0.58} fill="#5a6058" />
        <SvgRect x={w * 0.73} y={h * 0.3} width={w * 0.13} height={h * 0.58} fill="#5a6058" />
        <SvgRect x={w * 0.04} y={h * 0.22} width={w * 0.92} height={h * 0.09} rx={4} fill="#636a60" />
        <Path d={`M${w * 0.02} ${h * 0.2} Q${w * 0.5} ${h * 0.04} ${w * 0.98} ${h * 0.2}`} stroke="#636a60" strokeWidth={10} fill="none" />
        <Path d={`M${w * 0.27} ${h * 0.88} L${w * 0.27} ${h * 0.5} Q${w * 0.5} ${h * 0.34} ${w * 0.73} ${h * 0.5} L${w * 0.73} ${h * 0.88} Z`} fill="rgba(20, 28, 22, 0.9)" stroke="#5ef0a0" strokeWidth={3} />
        <Ellipse cx={w * 0.16} cy={h * 0.24} rx={w * 0.1} ry={h * 0.04} fill="#3e6a32" />
        <Ellipse cx={w * 0.7} cy={h * 0.22} rx={w * 0.14} ry={h * 0.045} fill="#4f7a3a" />
        <Ellipse cx={w * 0.2} cy={h * 0.6} rx={w * 0.06} ry={h * 0.05} fill="#3e6a32" />
        <Ellipse cx={w * 0.8} cy={h * 0.5} rx={w * 0.06} ry={h * 0.06} fill="#4f7a3a" />
        <Path d={`M${w * 0.22} ${h * 0.31} Q${w * 0.18} ${h * 0.5} ${w * 0.24} ${h * 0.7}`} stroke="#3e6a32" strokeWidth={3} fill="none" />
        <Path d={`M${w * 0.78} ${h * 0.31} Q${w * 0.84} ${h * 0.45} ${w * 0.8} ${h * 0.62}`} stroke="#3e6a32" strokeWidth={3} fill="none" />
        <Circle cx={w * 0.5} cy={h * 0.15} r={w * 0.045} fill="#5ef0a0" />
      </Svg>
    </View>
  );
}
