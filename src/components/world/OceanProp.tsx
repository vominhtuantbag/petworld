import { memo } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Polygon, RadialGradient, Rect as SvgRect, Stop } from 'react-native-svg';

import { isGearItem } from '../../world/items';
import { OCEAN_ABYSS, OCEAN_MID, OCEAN_SHALLOW } from '../../world/oceanDecor';
import type { LootActor, Rect } from '../../world/types';
import type { DepthStop } from './DepthGradient';
import type { StridePose } from './stride';
import { useLoop } from './useLoop';

/** Turquoise at the harbor, ocean blue mid-sea, abyssal blue at the far corner. */
export const OCEAN_DEPTH_STOPS: readonly DepthStop[] = [
  { at: 0, color: OCEAN_SHALLOW },
  { at: 0.12, color: OCEAN_SHALLOW },
  { at: 0.5, color: OCEAN_MID },
  { at: 0.85, color: OCEAN_ABYSS },
  { at: 1, color: OCEAN_ABYSS },
];

const OCEAN_KINDS = new Set([
  'sandbar',
  'coral',
  'kelp',
  'glowcoral',
  'seamist',
  'seabubble',
  'searock',
  'wreck',
  'ruin',
  'whirlpool',
  'reef',
]);

export function isOceanKind(kind: Rect['kind']): boolean {
  return kind != null && OCEAN_KINDS.has(kind);
}

function seedOf(rect: Rect): number {
  return Math.abs(Math.floor(rect.x * 7.31 + rect.y * 3.17)) % 997;
}

export const OceanProp = memo(function OceanProp({ rect }: { rect: Rect }) {
  switch (rect.kind) {
    case 'whirlpool':
      return <Whirlpool rect={rect} />;
    case 'reef':
      return <Reef rect={rect} />;
    case 'sandbar':
      return <Sandbar rect={rect} />;
    case 'coral':
      return <Coral rect={rect} glow={false} />;
    case 'glowcoral':
      return <Coral rect={rect} glow />;
    case 'kelp':
      return <Kelp rect={rect} />;
    case 'seamist':
      return <Mist rect={rect} />;
    case 'seabubble':
      return <Bubbles rect={rect} />;
    case 'searock':
      return <SeaRock rect={rect} />;
    case 'wreck':
      return <Wreck rect={rect} />;
    case 'ruin':
      return <Ruin rect={rect} />;
    default:
      return null;
  }
});

function boxStyle(rect: Rect, padX = 0, padTop = 0, padBottom = 0) {
  return {
    position: 'absolute' as const,
    left: rect.x - padX,
    top: rect.y - padTop,
    width: rect.w + padX * 2,
    height: rect.h + padTop + padBottom,
  };
}

function Whirlpool({ rect }: { rect: Rect }) {
  const spin = useLoop(3600);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const size = Math.min(rect.w, rect.h);
  const c = size / 2;
  const id = `wp${seedOf(rect)}`;
  const rings = [0.92, 0.74, 0.56, 0.38, 0.22];
  return (
    <View pointerEvents="none" style={boxStyle(rect)}>
      <Svg width={rect.w} height={rect.h} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#031326" stopOpacity="0.95" />
            <Stop offset="0.45" stopColor="#0d3b66" stopOpacity="0.7" />
            <Stop offset="1" stopColor="#1E90FF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={rect.w / 2} cy={rect.h / 2} rx={rect.w / 2} ry={rect.h / 2} fill={`url(#${id})`} />
      </Svg>
      <Animated.View
        style={{
          position: 'absolute',
          left: (rect.w - size) / 2,
          top: (rect.h - size) / 2,
          width: size,
          height: size,
          transform: [{ rotate }],
        }}
      >
        <Svg width={size} height={size}>
          {rings.map((ring, index) => {
            const r = c * ring;
            const len = 2 * Math.PI * r;
            return (
              <Circle
                key={ring}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={index % 2 === 0 ? 'rgba(235, 250, 255, 0.75)' : 'rgba(120, 200, 255, 0.55)'}
                strokeWidth={Math.max(3, size * 0.018)}
                strokeLinecap="round"
                strokeDasharray={`${len * 0.42} ${len * 0.18}`}
                strokeDashoffset={len * index * 0.13}
              />
            );
          })}
          <Circle cx={c} cy={c} r={c * 0.1} fill="#020c18" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function jagged(rect: Rect, count: number, seed: number) {
  const shards: { points: string; dark: boolean }[] = [];
  for (let index = 0; index < count; index += 1) {
    const s = (seed * 31 + index * 97) % 1000;
    const cx = rect.w * (0.12 + ((s * 13) % 760) / 1000);
    const cy = rect.h * (0.2 + ((s * 7) % 600) / 1000);
    const r = Math.min(rect.w, rect.h) * (0.1 + ((s * 3) % 120) / 1000);
    const spikes = 5 + (s % 3);
    const points: string[] = [];
    for (let k = 0; k < spikes * 2; k += 1) {
      const angle = (Math.PI * k) / spikes + (s % 10) * 0.1;
      const radius = k % 2 === 0 ? r : r * 0.45;
      points.push(`${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius * 0.7).toFixed(1)}`);
    }
    shards.push({ points: points.join(' '), dark: index % 2 === 0 });
  }
  return shards;
}

function Reef({ rect }: { rect: Rect }) {
  const seed = seedOf(rect);
  const shards = jagged(rect, 9, seed);
  return (
    <View pointerEvents="none" style={boxStyle(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w / 2} cy={rect.h / 2} rx={rect.w / 2} ry={rect.h / 2} fill="rgba(64, 224, 208, 0.22)" />
        <Ellipse cx={rect.w / 2} cy={rect.h / 2} rx={rect.w * 0.44} ry={rect.h * 0.42} fill="rgba(20, 60, 80, 0.35)" />
        {shards.map((shard, index) => (
          <Polygon
            key={index}
            points={shard.points}
            fill={shard.dark ? '#3a3f4a' : '#5b6170'}
            stroke="rgba(240, 240, 255, 0.55)"
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  );
}

function Sandbar({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={boxStyle(rect, 24, 16, 16)}>
      <Svg width={rect.w + 48} height={rect.h + 32}>
        <Ellipse cx={rect.w / 2 + 24} cy={rect.h / 2 + 16} rx={rect.w / 2 + 22} ry={rect.h / 2 + 14} fill="rgba(170, 255, 240, 0.35)" />
        <Ellipse cx={rect.w / 2 + 24} cy={rect.h / 2 + 16} rx={rect.w / 2} ry={rect.h / 2} fill={rect.fill ?? '#f2e2b4'} />
        <Ellipse cx={rect.w / 2 + 16} cy={rect.h / 2 + 10} rx={rect.w * 0.3} ry={rect.h * 0.22} fill="rgba(255, 250, 230, 0.6)" />
      </Svg>
    </View>
  );
}

function GlowHalo({ rect, fill }: { rect: Rect; fill: string }) {
  const pulse = useLoop(2400, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.9, 0.35] });
  return (
    <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity }}>
      <Svg width={rect.w + 24} height={rect.h + 12}>
        <Ellipse cx={rect.w / 2 + 12} cy={rect.h * 0.55 + 12} rx={rect.w * 0.62} ry={rect.h * 0.6} fill={fill} opacity={0.35} />
      </Svg>
    </Animated.View>
  );
}

function Coral({ rect, glow }: { rect: Rect; glow: boolean }) {
  const fill = rect.fill ?? '#ffb3c7';
  const w = rect.w;
  const h = rect.h;
  const branch = (x: number, lean: number) =>
    `M${x} ${h} C${x + lean * 0.3} ${h * 0.6} ${x + lean} ${h * 0.4} ${x + lean * 1.2} ${h * 0.08}`;
  return (
    <View pointerEvents="none" style={boxStyle(rect, 12, 12, 0)}>
      {glow ? <GlowHalo rect={rect} fill={fill} /> : null}
      <Svg width={w + 24} height={h + 12} style={{ position: 'absolute' }}>
        <G x={12} y={12}>
          <Path d={branch(w * 0.5, -w * 0.05)} stroke={fill} strokeWidth={w * 0.13} strokeLinecap="round" fill="none" />
          <Path d={branch(w * 0.42, -w * 0.3)} stroke={fill} strokeWidth={w * 0.1} strokeLinecap="round" fill="none" />
          <Path d={branch(w * 0.58, w * 0.28)} stroke={fill} strokeWidth={w * 0.1} strokeLinecap="round" fill="none" />
          <Circle cx={w * 0.1} cy={h * 0.1} r={w * 0.07} fill={fill} />
          <Circle cx={w * 0.92} cy={h * 0.12} r={w * 0.07} fill={fill} />
          <Circle cx={w * 0.48} cy={h * 0.06} r={w * 0.08} fill={fill} />
          {glow ? (
            <>
              <Circle cx={w * 0.1} cy={h * 0.1} r={w * 0.03} fill="#ffffff" />
              <Circle cx={w * 0.92} cy={h * 0.12} r={w * 0.03} fill="#ffffff" />
              <Circle cx={w * 0.48} cy={h * 0.06} r={w * 0.035} fill="#ffffff" />
            </>
          ) : null}
        </G>
      </Svg>
    </View>
  );
}

function Kelp({ rect }: { rect: Rect }) {
  const sway = useLoop(3200, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-5deg', '5deg', '-5deg'] });
  const w = rect.w;
  const h = rect.h;
  const strands = [0.2, 0.4, 0.6, 0.8];
  return (
    <Animated.View
      pointerEvents="none"
      style={[boxStyle(rect), { transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w} height={h}>
        {strands.map((at, index) => {
          const x = w * at;
          const bend = (index % 2 === 0 ? 1 : -1) * w * 0.12;
          return (
            <Path
              key={at}
              d={`M${x} ${h} C${x + bend} ${h * 0.7} ${x - bend} ${h * 0.35} ${x + bend * 0.6} ${h * (0.04 + index * 0.05)}`}
              stroke={index % 2 === 0 ? rect.fill ?? '#174a30' : '#2f7a4a'}
              strokeWidth={w * 0.11}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

function Mist({ rect }: { rect: Rect }) {
  const drift = useLoop(9000, seedOf(rect) / 997);
  const translateX = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-40, 40, -40] });
  const opacity = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 1, 0.55] });
  return (
    <Animated.View pointerEvents="none" style={[boxStyle(rect), { opacity, transform: [{ translateX }] }]}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w * 0.5} cy={rect.h * 0.5} rx={rect.w * 0.5} ry={rect.h * 0.5} fill="rgba(220, 238, 255, 0.14)" />
        <Ellipse cx={rect.w * 0.35} cy={rect.h * 0.45} rx={rect.w * 0.3} ry={rect.h * 0.35} fill="rgba(235, 245, 255, 0.16)" />
        <Ellipse cx={rect.w * 0.68} cy={rect.h * 0.58} rx={rect.w * 0.26} ry={rect.h * 0.3} fill="rgba(235, 245, 255, 0.14)" />
      </Svg>
    </Animated.View>
  );
}

function Bubbles({ rect }: { rect: Rect }) {
  const rise = useLoop(2600, seedOf(rect) / 997);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [rect.h * 0.35, -rect.h * 0.35] });
  const opacity = rise.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.9, 0] });
  const dots = [
    { x: 0.3, y: 0.8, r: 6 },
    { x: 0.62, y: 0.62, r: 4 },
    { x: 0.42, y: 0.45, r: 7 },
    { x: 0.7, y: 0.28, r: 5 },
    { x: 0.36, y: 0.14, r: 3 },
  ];
  return (
    <Animated.View pointerEvents="none" style={[boxStyle(rect), { opacity, transform: [{ translateY }] }]}>
      <Svg width={rect.w} height={rect.h}>
        {dots.map((dot) => (
          <Circle
            key={`${dot.x}-${dot.y}`}
            cx={rect.w * dot.x}
            cy={rect.h * dot.y}
            r={dot.r}
            fill="rgba(225, 245, 255, 0.25)"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth={1.5}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

function SeaRock({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 0.9;
  return (
    <View pointerEvents="none" style={boxStyle(rect, 6, lift, 6)}>
      <Svg width={w + 12} height={h + lift + 6}>
        <Ellipse cx={w / 2 + 6} cy={h * 0.6 + lift} rx={w / 2 + 6} ry={h * 0.42} fill="rgba(235, 250, 255, 0.45)" />
        <Polygon
          points={`${6 + w * 0.05},${lift + h * 0.6} ${6 + w * 0.2},${lift * 0.3} ${6 + w * 0.45},${lift * 0.05} ${6 + w * 0.7},${lift * 0.25} ${6 + w * 0.95},${lift + h * 0.55}`}
          fill="#4c5a66"
          stroke="#2b343c"
          strokeWidth={2}
        />
        <Polygon
          points={`${6 + w * 0.2},${lift * 0.3} ${6 + w * 0.45},${lift * 0.05} ${6 + w * 0.4},${lift * 0.7}`}
          fill="rgba(255,255,255,0.18)"
        />
      </Svg>
    </View>
  );
}

function Wreck({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.6;
  return (
    <View pointerEvents="none" style={boxStyle(rect, 10, lift, 10)}>
      <Svg width={w + 20} height={h + lift + 10}>
        <G x={10} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.62} rx={w / 2 + 8} ry={h * 0.4} fill="rgba(235, 250, 255, 0.35)" />
          <Path
            d={`M0 ${h * 0.25} L${w * 0.92} ${h * 0.1} L${w} ${h * 0.45} L${w * 0.8} ${h * 0.9} L${w * 0.12} ${h * 0.85} Z`}
            fill="#6a4a30"
            stroke="#3b2816"
            strokeWidth={3}
          />
          <Path d={`M${w * 0.55} ${h * 0.2} L${w * 0.62} ${h * 0.4} L${w * 0.5} ${h * 0.55} L${w * 0.58} ${h * 0.85}`} stroke="#1c120a" strokeWidth={4} fill="none" />
          {[0.18, 0.36, 0.74].map((at) => (
            <Line key={at} x1={w * at} y1={h * 0.22} x2={w * (at + 0.02)} y2={h * 0.85} stroke="#4a321e" strokeWidth={3} />
          ))}
          <Circle cx={w * 0.25} cy={h * 0.5} r={h * 0.12} fill="#3f6b3a" opacity={0.85} />
          <Circle cx={w * 0.7} cy={h * 0.6} r={h * 0.14} fill="#3f6b3a" opacity={0.85} />
          <Line x1={w * 0.42} y1={h * 0.4} x2={w * 0.3} y2={-lift * 0.85} stroke="#5a3d24" strokeWidth={8} strokeLinecap="round" />
          <Line x1={w * 0.2} y1={-lift * 0.5} x2={w * 0.4} y2={-lift * 0.62} stroke="#5a3d24" strokeWidth={5} />
          <Path d={`M${w * 0.31} ${-lift * 0.8} L${w * 0.16} ${-lift * 0.35} L${w * 0.3} ${-lift * 0.3}`} fill="rgba(210, 200, 170, 0.6)" />
        </G>
      </Svg>
    </View>
  );
}

function Ruin({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.4;
  const pulse = useLoop(3000, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 0.75, 0.25] });
  return (
    <View pointerEvents="none" style={boxStyle(rect, 10, lift, 6)}>
      <Svg width={w + 20} height={h + lift + 6} style={{ position: 'absolute' }}>
        <G x={10} y={lift}>
          <SvgRect x={0} y={h * 0.55} width={w} height={h * 0.4} rx={6} fill="#2b3550" />
          <SvgRect x={w * 0.08} y={-lift * 0.7} width={w * 0.18} height={lift * 0.7 + h * 0.6} fill={rect.fill ?? '#3a4a6a'} />
          <SvgRect x={w * 0.72} y={-lift * 0.35} width={w * 0.18} height={lift * 0.35 + h * 0.6} fill={rect.fill ?? '#3a4a6a'} />
          <Path d={`M${w * 0.72} ${-lift * 0.35} L${w * 0.8} ${-lift * 0.5} L${w * 0.9} ${-lift * 0.35} Z`} fill="#33405e" />
          <SvgRect x={w * 0.02} y={-lift * 0.78} width={w * 0.3} height={lift * 0.1} fill="#4a5a80" />
          <SvgRect x={w * 0.35} y={h * 0.35} width={w * 0.28} height={h * 0.22} fill="#4a5a80" transform={`rotate(-12 ${w * 0.49} ${h * 0.46})`} />
        </G>
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity }}>
        <Svg width={w + 20} height={h + lift + 6}>
          <G x={10} y={lift}>
            <Line x1={w * 0.17} y1={-lift * 0.55} x2={w * 0.17} y2={h * 0.5} stroke="#38f5ff" strokeWidth={3} />
            <Line x1={w * 0.81} y1={-lift * 0.2} x2={w * 0.81} y2={h * 0.5} stroke="#b46bff" strokeWidth={3} />
            <Circle cx={w * 0.5} cy={h * 0.75} r={6} fill="#5effc8" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

const BOAT_W = 132;

/** Mast and sail, drawn behind the rider. */
export function SailboatBack({ x, y, facing, bob }: { x: number; y: number; facing: 1 | -1; bob: number }) {
  const top = y - 96 + bob;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: x - BOAT_W / 2, top, width: BOAT_W, height: 130, transform: [{ scaleX: facing }] }}
    >
      <Svg width={BOAT_W} height={130}>
        <Line x1={BOAT_W * 0.42} y1={4} x2={BOAT_W * 0.42} y2={124} stroke="#5a3d24" strokeWidth={5} />
        <Path d={`M${BOAT_W * 0.45} 10 Q${BOAT_W * 0.92} 50 ${BOAT_W * 0.45} 104 Z`} fill="#f7f3e8" stroke="#c9bfa8" strokeWidth={2} />
        <Path d={`M${BOAT_W * 0.4} 22 L${BOAT_W * 0.12} 96 L${BOAT_W * 0.4} 96 Z`} fill="#efe6d2" stroke="#c9bfa8" strokeWidth={2} />
        <Path d={`M${BOAT_W * 0.42} 4 L${BOAT_W * 0.58} 10 L${BOAT_W * 0.42} 16 Z`} fill="#d64545" />
      </Svg>
    </View>
  );
}

/** Wooden hull, drawn over the rider's legs so they sit in the boat. */
export function SailboatHull({ x, y, facing, bob }: { x: number; y: number; facing: 1 | -1; bob: number }) {
  const top = y + 8 + bob;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: x - BOAT_W / 2, top, width: BOAT_W, height: 44, transform: [{ scaleX: facing }] }}
    >
      <Svg width={BOAT_W} height={44}>
        <Ellipse cx={BOAT_W / 2} cy={34} rx={BOAT_W * 0.5} ry={8} fill="rgba(255,255,255,0.35)" />
        <Path d={`M2 8 L${BOAT_W - 2} 8 Q${BOAT_W - 10} 30 ${BOAT_W * 0.78} 34 L${BOAT_W * 0.18} 34 Q8 30 2 8 Z`} fill="#8a5a32" stroke="#4a2e16" strokeWidth={2.5} />
        <Line x1={6} y1={15} x2={BOAT_W - 6} y2={15} stroke="#a8713f" strokeWidth={3} />
        <Line x1={12} y1={24} x2={BOAT_W - 12} y2={24} stroke="#6e4524" strokeWidth={2} />
        <SvgRect x={0} y={5} width={BOAT_W} height={5} rx={2} fill="#b07a46" />
      </Svg>
    </View>
  );
}

/** White foam left behind the hull. Same motes as walking dust, pushed backward and spread wider. */
export function WakeTrail({ pose }: { pose: StridePose }) {
  return (
    <>
      {pose.dust.map((mote) => {
        const age = (pose.now - mote.born) / mote.life;
        const size = mote.size * (2.2 + age * 2.4);
        return (
          <View
            key={mote.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: mote.x - mote.vx * age * 1.6 - size / 2,
              top: mote.y + 6 - mote.vy * age * 1.6 - size / 4,
              width: size * 1.4,
              height: Math.max(4, size * 0.55),
              borderRadius: size,
              opacity: (1 - age) * 0.85,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
            }}
          />
        );
      })}
    </>
  );
}

const LOOT_BOX = 44;

/** Bobbing loot on the water: wooden crate for gold and gear, glass bottle otherwise. */
export function FloatingLoot({ drop }: { drop: LootActor }) {
  const bob = useLoop(2200, (drop.x % 97) / 97);
  const translateY = bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-4, 4, -4] });
  const rotate = bob.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-6deg', '6deg', '-6deg'] });
  const crate = drop.kind === 'gold' || (drop.itemId != null && isGearItem(drop.itemId));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: drop.x - LOOT_BOX / 2, top: drop.y - LOOT_BOX / 2, width: LOOT_BOX, height: LOOT_BOX }}>
      <View
        style={{
          position: 'absolute',
          left: 2,
          top: LOOT_BOX * 0.68,
          width: LOOT_BOX - 4,
          height: 10,
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.4)',
        }}
      />
      <Animated.View style={{ width: LOOT_BOX, height: LOOT_BOX, transform: [{ translateY }, { rotate }] }}>
        <Svg width={LOOT_BOX} height={LOOT_BOX}>
          {crate ? (
            <>
              <SvgRect x={8} y={10} width={28} height={24} rx={3} fill="#9a6a3a" stroke="#4a2e16" strokeWidth={2} />
              <Line x1={8} y1={22} x2={36} y2={22} stroke="#6e4524" strokeWidth={2} />
              <Line x1={10} y1={12} x2={34} y2={32} stroke="#6e4524" strokeWidth={2} />
              <SvgRect x={18} y={18} width={8} height={8} fill={drop.kind === 'gold' ? '#ffd24a' : drop.tint} />
            </>
          ) : (
            <G transform={`rotate(-30 22 22)`}>
              <SvgRect x={15} y={12} width={14} height={24} rx={5} fill="rgba(170, 235, 220, 0.6)" stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} />
              <SvgRect x={19} y={5} width={6} height={8} fill="rgba(170, 235, 220, 0.6)" stroke="rgba(255,255,255,0.9)" strokeWidth={1.2} />
              <SvgRect x={18.5} y={2} width={7} height={4} rx={1} fill="#8a5a32" />
              <SvgRect x={18} y={18} width={8} height={12} rx={1} fill="#f2e2b4" />
            </G>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

export type OceanGateVariant = 'harbor' | 'lighthouse' | 'temple';

export function oceanGateVariant(sensorId: string): OceanGateVariant {
  if (sensorId === 'return') return 'harbor';
  if (sensorId === 'ascent') return 'temple';
  return 'lighthouse';
}

/** Gate art sized to the portal box. Lighthouse beam and temple glow pulse. */
export function OceanGateArt({ variant, width, height }: { variant: OceanGateVariant; width: number; height: number }) {
  const pulse = useLoop(2400);
  const glow = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.35] });
  const w = width;
  const h = height;
  if (variant === 'harbor') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.1} y={h * 0.62} width={w * 0.8} height={h * 0.14} fill="#8a5a32" stroke="#4a2e16" strokeWidth={3} />
          {[0.14, 0.38, 0.62, 0.86].map((at) => (
            <SvgRect key={at} x={w * at - 6} y={h * 0.6} width={12} height={h * 0.3} fill="#5a3d24" />
          ))}
          <SvgRect x={w * 0.16} y={h * 0.2} width={10} height={h * 0.44} fill="#5a3d24" />
          <SvgRect x={w * 0.8} y={h * 0.2} width={10} height={h * 0.44} fill="#5a3d24" />
          <Path d={`M${w * 0.14} ${h * 0.22} Q${w * 0.5} ${h * 0.06} ${w * 0.86} ${h * 0.22}`} stroke="#6e4524" strokeWidth={10} fill="none" />
          <Circle cx={w * 0.18} cy={h * 0.3} r={9} fill="#ffcf6a" />
          <Circle cx={w * 0.82} cy={h * 0.3} r={9} fill="#ffcf6a" />
          <Ellipse cx={w * 0.5} cy={h * 0.48} rx={w * 0.28} ry={h * 0.16} fill="rgba(140, 240, 255, 0.35)" stroke="rgba(255,255,255,0.8)" strokeWidth={3} />
        </Svg>
      </View>
    );
  }
  if (variant === 'lighthouse') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
          <Svg width={w} height={h}>
            <Path d={`M${w * 0.5} ${h * 0.16} L${w * 0.02} ${h * 0.02} L${w * 0.02} ${h * 0.3} Z`} fill="rgba(255, 245, 180, 0.4)" />
            <Path d={`M${w * 0.5} ${h * 0.16} L${w * 0.98} ${h * 0.02} L${w * 0.98} ${h * 0.3} Z`} fill="rgba(255, 245, 180, 0.4)" />
          </Svg>
        </Animated.View>
        <Svg width={w} height={h} style={{ position: 'absolute' }}>
          <Ellipse cx={w * 0.5} cy={h * 0.9} rx={w * 0.36} ry={h * 0.07} fill="#5b6170" />
          <Polygon points={`${w * 0.38},${h * 0.88} ${w * 0.43},${h * 0.24} ${w * 0.57},${h * 0.24} ${w * 0.62},${h * 0.88}`} fill="#f4f1ea" stroke="#9aa0aa" strokeWidth={2} />
          {[0.38, 0.58, 0.78].map((at) => (
            <Polygon
              key={at}
              points={`${w * (0.4 + (0.88 - at) * 0.04)},${h * at} ${w * (0.6 - (0.88 - at) * 0.04)},${h * at} ${w * (0.6 - (0.88 - at) * 0.04 + 0.006)},${h * (at + 0.07)} ${w * (0.4 + (0.88 - at) * 0.04 - 0.006)},${h * (at + 0.07)}`}
              fill="#d64545"
            />
          ))}
          <SvgRect x={w * 0.41} y={h * 0.1} width={w * 0.18} height={h * 0.14} fill="#ffe680" stroke="#333" strokeWidth={2} />
          <Polygon points={`${w * 0.39},${h * 0.1} ${w * 0.5},${h * 0.02} ${w * 0.61},${h * 0.1}`} fill="#2b343c" />
          <SvgRect x={w * 0.46} y={h * 0.72} width={w * 0.08} height={h * 0.16} rx={4} fill="#5a3d24" />
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.58} rx={w * 0.34} ry={h * 0.3} fill="rgba(56, 245, 255, 0.35)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <SvgRect x={w * 0.06} y={h * 0.86} width={w * 0.88} height={h * 0.08} fill="#c9c2b0" />
        <SvgRect x={w * 0.12} y={h * 0.28} width={w * 0.12} height={h * 0.58} fill="#e8e2d0" />
        <SvgRect x={w * 0.76} y={h * 0.28} width={w * 0.12} height={h * 0.58} fill="#e8e2d0" />
        {[0.15, 0.19, 0.79, 0.83].map((at) => (
          <Line key={at} x1={w * at} y1={h * 0.3} x2={w * at} y2={h * 0.84} stroke="#b8b09a" strokeWidth={2} />
        ))}
        <Polygon points={`${w * 0.04},${h * 0.28} ${w * 0.5},${h * 0.06} ${w * 0.96},${h * 0.28}`} fill="#efe9d8" stroke="#b8b09a" strokeWidth={3} />
        <Line x1={w * 0.5} y1={h * 0.1} x2={w * 0.5} y2={h * 0.26} stroke="#d9a520" strokeWidth={4} />
        <Path d={`M${w * 0.44} ${h * 0.14} L${w * 0.44} ${h * 0.19} L${w * 0.56} ${h * 0.19} L${w * 0.56} ${h * 0.14}`} stroke="#d9a520" strokeWidth={4} fill="none" />
        <Path d={`M${w * 0.26} ${h * 0.86} L${w * 0.26} ${h * 0.5} Q${w * 0.5} ${h * 0.3} ${w * 0.74} ${h * 0.5} L${w * 0.74} ${h * 0.86} Z`} fill="rgba(11, 37, 69, 0.85)" stroke="#38f5ff" strokeWidth={3} />
      </Svg>
    </View>
  );
}
