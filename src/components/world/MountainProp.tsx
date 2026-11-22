import { memo } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect as SvgRect } from 'react-native-svg';

import { isGearItem } from '../../world/items';
import { MOUNTAIN_GRAVEL, MOUNTAIN_MOSS, MOUNTAIN_SLATE, MOUNTAIN_SNOW } from '../../world/mountainDecor';
import type { LootActor, Rect } from '../../world/types';
import type { DepthStop } from './DepthGradient';
import { useLoop } from './useLoop';

export const MOUNTAIN_DEPTH_STOPS: readonly DepthStop[] = [
  { at: 0, color: MOUNTAIN_MOSS },
  { at: 0.12, color: MOUNTAIN_MOSS },
  { at: 0.28, color: MOUNTAIN_GRAVEL },
  { at: 0.55, color: MOUNTAIN_SLATE },
  { at: 0.86, color: MOUNTAIN_SNOW },
  { at: 1, color: MOUNTAIN_SNOW },
];

const KINDS = new Set([
  'foothill',
  'gravel',
  'stream',
  'pine',
  'wildflower',
  'mtngrass',
  'cliff',
  'abyss',
  'stonewall',
  'trail',
  'ropebridge',
  'nest',
  'cave',
  'bamboo',
  'mtcloud',
  'eagle',
  'pillar',
  'snow',
  'gioloc',
  'dalo',
]);

export function isMountainKind(kind: Rect['kind']): boolean {
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

export const MountainProp = memo(function MountainProp({ rect }: { rect: Rect }) {
  switch (rect.kind) {
    case 'foothill':
    case 'gravel':
    case 'snow':
      return <Patch rect={rect} />;
    case 'stream':
      return <Stream rect={rect} />;
    case 'pine':
      return <Pine rect={rect} />;
    case 'wildflower':
      return <Flower rect={rect} />;
    case 'mtngrass':
      return <WindGrass rect={rect} />;
    case 'cliff':
      return <Cliff rect={rect} />;
    case 'abyss':
      return <Abyss rect={rect} />;
    case 'stonewall':
      return <StoneWall rect={rect} />;
    case 'trail':
      return <Trail rect={rect} />;
    case 'ropebridge':
      return <RopeBridge rect={rect} />;
    case 'nest':
      return <Nest rect={rect} />;
    case 'cave':
      return <Cave rect={rect} />;
    case 'bamboo':
      return <Bamboo rect={rect} />;
    case 'mtcloud':
      return <Cloud rect={rect} />;
    case 'eagle':
      return <Eagle rect={rect} />;
    case 'pillar':
      return <Pillar rect={rect} />;
    case 'gioloc':
      return <Gale rect={rect} />;
    case 'dalo':
      return <Rockslide rect={rect} />;
    default:
      return null;
  }
});

function Patch({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect, 8, 6, 6)}>
      <Svg width={rect.w + 16} height={rect.h + 12}>
        <Ellipse cx={rect.w / 2 + 8} cy={rect.h / 2 + 6} rx={rect.w / 2 + 6} ry={rect.h / 2 + 4} fill={rect.fill ?? MOUNTAIN_GRAVEL} />
      </Svg>
    </View>
  );
}

function Stream({ rect }: { rect: Rect }) {
  const flow = useLoop(2400, seedOf(rect) / 997);
  const translateX = flow.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect, 6, 4, 4)}>
      <Svg width={w + 12} height={h + 8} style={{ position: 'absolute' }}>
        <Ellipse cx={w / 2 + 6} cy={h / 2 + 4} rx={w / 2 + 4} ry={h / 2 + 2} fill="#5aa0c8" />
        <Ellipse cx={w / 2 + 6} cy={h / 2 + 4} rx={w / 2 - 4} ry={h / 2 - 4} fill="#8ed0ee" />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity: 0.7, transform: [{ translateX }] }}>
        <Svg width={w + 12} height={h + 8}>
          <Path d={`M8 ${h * 0.4} Q${w * 0.3} ${h * 0.2} ${w * 0.55} ${h * 0.45} T${w} ${h * 0.35}`} stroke="rgba(255,255,255,0.7)" strokeWidth={2} fill="none" />
          <Path d={`M12 ${h * 0.7} Q${w * 0.35} ${h * 0.55} ${w * 0.7} ${h * 0.72}`} stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Pine({ rect }: { rect: Rect }) {
  const sway = useLoop(3800, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-2.4deg', '2.4deg', '-2.4deg'] });
  const w = rect.w;
  const h = rect.h;
  const lift = h * 3.4;
  const pad = w * 0.55;
  const W = w + pad * 2;
  const cx = W / 2;
  const green = rect.fill ?? '#2d4a34';
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect, pad, lift, 4), { transform: [{ translateY: lift / 2 }, { rotate }, { translateY: -lift / 2 }] }]}
    >
      <Svg width={W} height={lift + h + 4}>
        <Ellipse cx={cx} cy={lift + h - 2} rx={w * 0.45} ry={h * 0.22} fill="rgba(20, 24, 20, 0.28)" />
        <SvgRect x={cx - 4} y={lift * 0.55} width={8} height={lift * 0.45 + h} fill="#4a3424" />
        <Polygon points={`${cx},${lift * 0.02} ${cx - W * 0.22},${lift * 0.38} ${cx + W * 0.22},${lift * 0.38}`} fill={green} />
        <Polygon points={`${cx},${lift * 0.16} ${cx - W * 0.28},${lift * 0.58} ${cx + W * 0.28},${lift * 0.58}`} fill="#3a5a40" />
        <Polygon points={`${cx},${lift * 0.34} ${cx - W * 0.34},${lift * 0.82} ${cx + W * 0.34},${lift * 0.82}`} fill={green} />
      </Svg>
    </Animated.View>
  );
}

function Flower({ rect }: { rect: Rect }) {
  const fill = rect.fill ?? '#e07a8a';
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Line x1={rect.w / 2} y1={rect.h} x2={rect.w / 2} y2={rect.h * 0.4} stroke="#4f7a3a" strokeWidth={2} />
        {[0, 72, 144, 216, 288].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <Circle
              key={deg}
              cx={rect.w / 2 + Math.cos(rad) * 5}
              cy={rect.h * 0.38 + Math.sin(rad) * 5}
              r={3.4}
              fill={fill}
            />
          );
        })}
        <Circle cx={rect.w / 2} cy={rect.h * 0.38} r={2.4} fill="#ffe680" />
      </Svg>
    </View>
  );
}

function WindGrass({ rect }: { rect: Rect }) {
  const sway = useLoop(2600, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-6deg', '6deg', '-6deg'] });
  const w = rect.w;
  const h = rect.h;
  const blades = [0.12, 0.28, 0.44, 0.6, 0.76, 0.9];
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect), { transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w} height={h}>
        {blades.map((at, index) => {
          const x = w * at;
          const bend = (index % 2 === 0 ? 1 : -1) * w * 0.1;
          return (
            <Path
              key={at}
              d={`M${x} ${h} Q${x + bend} ${h * 0.45} ${x + bend * 1.4} ${h * 0.08}`}
              stroke={index % 2 === 0 ? rect.fill ?? '#4f7a4a' : '#6b8a5a'}
              strokeWidth={2.4}
              fill="none"
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

function Cliff({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 2.4;
  const fill = rect.fill ?? MOUNTAIN_SLATE;
  return (
    <View pointerEvents="none" style={box(rect, 8, lift, 6)}>
      <Svg width={w + 16} height={h + lift + 6}>
        <G x={8} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.85} rx={w * 0.52} ry={h * 0.28} fill="rgba(8, 10, 12, 0.45)" />
          <Path
            d={`M0 ${h * 0.55} L${w * 0.08} ${-lift * 0.55} L${w * 0.28} ${-lift * 0.85} L${w * 0.52} ${-lift * 0.4} L${w * 0.74} ${-lift * 0.78} L${w * 0.94} ${-lift * 0.3} L${w} ${h * 0.6} L${w * 0.7} ${h} L${w * 0.22} ${h} Z`}
            fill={fill}
          />
          <Path d={`M${w * 0.08} ${-lift * 0.55} L${w * 0.28} ${-lift * 0.85} L${w * 0.26} ${-lift * 0.2}`} fill="rgba(255,255,255,0.12)" />
          <Line x1={w * 0.18} y1={-lift * 0.2} x2={w * 0.16} y2={h * 0.5} stroke="rgba(20,24,28,0.35)" strokeWidth={3} />
          <Line x1={w * 0.62} y1={-lift * 0.35} x2={w * 0.66} y2={h * 0.45} stroke="rgba(20,24,28,0.3)" strokeWidth={3} />
        </G>
      </Svg>
    </View>
  );
}

function Abyss({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect, 12, 10, 10)}>
      <Svg width={w + 24} height={h + 20}>
        <Ellipse cx={w / 2 + 12} cy={h / 2 + 10} rx={w / 2 + 12} ry={h / 2 + 8} fill="rgba(8, 10, 12, 0.55)" />
        <Ellipse cx={w / 2 + 12} cy={h / 2 + 10} rx={w / 2} ry={h / 2} fill="#12161a" />
        <Ellipse cx={w / 2 + 12} cy={h / 2 + 6} rx={w * 0.32} ry={h * 0.28} fill="#050608" />
      </Svg>
    </View>
  );
}

function StoneWall({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.1;
  return (
    <View pointerEvents="none" style={box(rect, 4, lift, 4)}>
      <Svg width={w + 8} height={h + lift + 4}>
        <G x={4} y={lift}>
          <SvgRect x={0} y={-lift * 0.85} width={w} height={lift * 0.85 + h} rx={4} fill={rect.fill ?? '#6a737a'} />
          {[0.18, 0.5, 0.82].map((at) => (
            <Line key={at} x1={w * at} y1={-lift * 0.8} x2={w * at} y2={h * 0.7} stroke="rgba(30,34,38,0.35)" strokeWidth={2} />
          ))}
          <Line x1={4} y1={-lift * 0.4} x2={w - 4} y2={-lift * 0.4} stroke="rgba(30,34,38,0.3)" strokeWidth={2} />
        </G>
      </Svg>
    </View>
  );
}

function Trail({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <SvgRect x={0} y={2} width={rect.w} height={rect.h - 4} rx={6} fill={rect.fill ?? '#9aa3a8'} />
        <Line x1={8} y1={rect.h / 2} x2={rect.w - 8} y2={rect.h / 2} stroke="rgba(255,255,255,0.28)" strokeWidth={2} strokeDasharray="10 14" />
      </Svg>
    </View>
  );
}

function RopeBridge({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const boards = Math.max(4, Math.floor(w / 18));
  return (
    <View pointerEvents="none" style={box(rect, 0, 10, 8)}>
      <Svg width={w} height={h + 18}>
        <Path d={`M2 6 Q${w / 2} ${h * 0.55} ${w - 2} 6`} stroke="#5a3d24" strokeWidth={3} fill="none" />
        <Path d={`M2 ${h + 4} Q${w / 2} ${h * 0.85} ${w - 2} ${h + 4}`} stroke="#5a3d24" strokeWidth={3} fill="none" />
        {Array.from({ length: boards }, (_, index) => {
          const x = 4 + (index * (w - 8)) / boards;
          return <SvgRect key={index} x={x} y={h * 0.28} width={12} height={h * 0.55} rx={1} fill={index % 3 === 0 ? '#6a4a2e' : '#8a5a32'} />;
        })}
        <Circle cx={4} cy={6} r={4} fill="#3b2816" />
        <Circle cx={w - 4} cy={6} r={4} fill="#3b2816" />
      </Svg>
    </View>
  );
}

function Nest({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w / 2} cy={rect.h * 0.62} rx={rect.w * 0.46} ry={rect.h * 0.34} fill={rect.fill ?? '#8a6a3a'} />
        <Ellipse cx={rect.w / 2} cy={rect.h * 0.58} rx={rect.w * 0.28} ry={rect.h * 0.16} fill="#5c4030" />
        <Circle cx={rect.w * 0.42} cy={rect.h * 0.54} r={4} fill="#f2e2b4" />
        <Circle cx={rect.w * 0.56} cy={rect.h * 0.56} r={3.5} fill="#f2e2b4" />
      </Svg>
    </View>
  );
}

function Cave({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect, 6, 8, 4)}>
      <Svg width={w + 12} height={h + 12}>
        <G x={6} y={8}>
          <Path d={`M0 ${h} L${w * 0.08} ${h * 0.35} Q${w / 2} ${-h * 0.15} ${w * 0.92} ${h * 0.35} L${w} ${h} Z`} fill="#6a737a" />
          <Path d={`M${w * 0.16} ${h} Q${w / 2} ${h * 0.12} ${w * 0.84} ${h} Z`} fill={rect.fill ?? '#1c2024'} />
        </G>
      </Svg>
    </View>
  );
}

function Bamboo({ rect }: { rect: Rect }) {
  const sway = useLoop(3200, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-4deg', '4deg', '-4deg'] });
  const w = rect.w;
  const h = rect.h;
  const stalks = [0.18, 0.38, 0.58, 0.78];
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect), { transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w} height={h}>
        {stalks.map((at, index) => {
          const x = w * at;
          const green = index % 2 === 0 ? rect.fill ?? '#3e8a4a' : '#2f6b38';
          return (
            <G key={at}>
              <Line x1={x} y1={h} x2={x + (index % 2 === 0 ? 4 : -4)} y2={h * 0.04} stroke={green} strokeWidth={6} strokeLinecap="round" />
              {[0.22, 0.44, 0.66].map((joint) => (
                <Line key={joint} x1={x - 4} y1={h * joint} x2={x + 4} y2={h * joint} stroke="#d7e7c4" strokeWidth={1.5} />
              ))}
              <Path d={`M${x} ${h * 0.18} Q${x + 16} ${h * 0.1} ${x + 18} ${h * 0.02}`} stroke={green} strokeWidth={2} fill="none" />
            </G>
          );
        })}
      </Svg>
    </Animated.View>
  );
}

function Cloud({ rect }: { rect: Rect }) {
  const drift = useLoop(14000, seedOf(rect) / 997);
  const translateX = rect.drift ? 0 : drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-40, 40, -40] });
  const opacity = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 1, 0.55] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity, transform: [{ translateX }] }]}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w * 0.38} cy={rect.h * 0.55} rx={rect.w * 0.32} ry={rect.h * 0.38} fill="rgba(255,255,255,0.22)" />
        <Ellipse cx={rect.w * 0.62} cy={rect.h * 0.5} rx={rect.w * 0.34} ry={rect.h * 0.4} fill="rgba(236, 242, 246, 0.2)" />
        <Ellipse cx={rect.w * 0.5} cy={rect.h * 0.42} rx={rect.w * 0.22} ry={rect.h * 0.28} fill="rgba(255,255,255,0.18)" />
      </Svg>
    </Animated.View>
  );
}

function Eagle({ rect }: { rect: Rect }) {
  const flap = useLoop(420, seedOf(rect) / 997);
  const scaleY = flap.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.55, 1] });
  const heading = rect.drift ? (Math.atan2(rect.drift.vy, rect.drift.vx) * 180) / Math.PI : 0;
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={[box(rect), { transform: [{ rotate: `${heading}deg` }] }]}>
      <Animated.View style={{ width: w, height: h, transform: [{ scaleY }] }}>
        <Svg width={w} height={h}>
          <Path d={`M${w * 0.08} ${h * 0.55} Q${w * 0.32} ${h * 0.1} ${w * 0.5} ${h * 0.48} Q${w * 0.68} ${h * 0.1} ${w * 0.92} ${h * 0.55}`} fill={rect.fill ?? 'rgba(20,22,26,0.35)'} />
          <Ellipse cx={w * 0.5} cy={h * 0.52} rx={w * 0.08} ry={h * 0.12} fill="rgba(20,22,26,0.4)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Pillar({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 3.2;
  return (
    <View pointerEvents="none" style={box(rect, 6, lift, 4)}>
      <Svg width={w + 12} height={h + lift + 4}>
        <G x={6} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.7} rx={w * 0.55} ry={h * 0.28} fill="rgba(20,24,28,0.3)" />
          <SvgRect x={w * 0.22} y={-lift * 0.85} width={w * 0.56} height={lift * 0.85 + h * 0.7} fill={rect.fill ?? '#9aa3a8'} />
          <SvgRect x={w * 0.12} y={-lift * 0.92} width={w * 0.76} height={lift * 0.1} fill="#cfd8dc" />
          <SvgRect x={w * 0.16} y={h * 0.55} width={w * 0.68} height={h * 0.22} fill="#8C9298" />
        </G>
      </Svg>
    </View>
  );
}

function Gale({ rect }: { rect: Rect }) {
  const spin = useLoop(2200, seedOf(rect) / 997);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const opacity = spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 1, 0.45] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(210, 230, 240, 0.28)" />
        <Ellipse cx={w / 2} cy={h / 2} rx={w * 0.38} ry={h * 0.22} fill="rgba(255,255,255,0.35)" />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity, transform: [{ rotate }] }}>
        <Svg width={w} height={h}>
          <Path d={`M${w * 0.2} ${h * 0.5} Q${w * 0.35} ${h * 0.18} ${w * 0.55} ${h * 0.42} T${w * 0.88} ${h * 0.3}`} stroke="rgba(255,255,255,0.9)" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M${w * 0.18} ${h * 0.62} Q${w * 0.4} ${h * 0.78} ${w * 0.62} ${h * 0.55}`} stroke="rgba(230, 240, 248, 0.8)" strokeWidth={3} fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Rockslide({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const seed = seedOf(rect);
  const shards = Array.from({ length: 8 }, (_, index) => {
    const s = (seed * 31 + index * 97) % 1000;
    const cx = w * (0.12 + ((s * 13) % 760) / 1000);
    const cy = h * (0.18 + ((s * 7) % 640) / 1000);
    const r = Math.min(w, h) * (0.08 + ((s * 3) % 120) / 1000);
    return `${cx - r},${cy + r * 0.4} ${cx},${cy - r} ${cx + r},${cy + r * 0.5}`;
  });
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <Ellipse cx={w / 2} cy={h * 0.62} rx={w * 0.46} ry={h * 0.32} fill="rgba(90, 96, 104, 0.35)" />
        {shards.map((points, index) => (
          <Polygon key={index} points={points} fill={index % 2 === 0 ? '#5B6770' : '#8C9298'} stroke="rgba(20,24,28,0.5)" strokeWidth={1.5} />
        ))}
      </Svg>
    </View>
  );
}

const LOOT_BOX = 44;

export function MountainLoot({ drop }: { drop: LootActor }) {
  const chest = drop.kind === 'item' && drop.itemId != null && isGearItem(drop.itemId);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: drop.x - LOOT_BOX / 2, top: drop.y - LOOT_BOX / 2, width: LOOT_BOX, height: LOOT_BOX }}>
      <Svg width={LOOT_BOX} height={LOOT_BOX}>
        {chest ? (
          <>
            <SvgRect x={7} y={14} width={30} height={20} rx={2} fill="#6a4a2e" stroke="#2b1c10" strokeWidth={2} />
            <SvgRect x={7} y={14} width={30} height={6} fill="#8a5a32" />
            <SvgRect x={6} y={18} width={32} height={3} fill="#c0c6cc" />
            <SvgRect x={6} y={30} width={32} height={3} fill="#c0c6cc" />
            <Circle cx={22} cy={26} r={3.5} fill={drop.tint} stroke="#2b1c10" strokeWidth={1} />
          </>
        ) : (
          <>
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(20,24,28,0.35)" />
            <Path d="M12 34 Q10 20 16 16 L28 16 Q34 20 32 34 Z" fill="#6b4a32" stroke="#3b2816" strokeWidth={2} />
            <Path d="M16 16 L14 10 L22 13 L30 10 L28 16 Z" fill="#8a6240" stroke="#3b2816" strokeWidth={1.4} />
            <Line x1={16} y1={22} x2={28} y2={22} stroke="#3b2816" strokeWidth={2} />
            <Circle cx={22} cy={26} r={4} fill={drop.kind === 'gold' ? '#ffd24a' : drop.tint} />
          </>
        )}
      </Svg>
    </View>
  );
}

export type MountainGateVariant = 'stone' | 'cave' | 'cable' | 'shrine';

export function mountainGateVariant(sensorId: string): MountainGateVariant {
  if (sensorId === 'return') return 'stone';
  if (sensorId === 'ascent') return 'shrine';
  if (sensorId === 'west') return 'cave';
  return 'cable';
}

export function MountainGateArt({ variant, width, height }: { variant: MountainGateVariant; width: number; height: number }) {
  const pulse = useLoop(2600);
  const glow = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.95, 0.3] });
  const w = width;
  const h = height;
  if (variant === 'stone') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.08} y={h * 0.88} width={w * 0.84} height={h * 0.08} fill="#8C9298" />
          <SvgRect x={w * 0.16} y={h * 0.28} width={w * 0.14} height={h * 0.6} fill="#6a737a" />
          <SvgRect x={w * 0.7} y={h * 0.28} width={w * 0.14} height={h * 0.6} fill="#6a737a" />
          <Path d={`M${w * 0.12} ${h * 0.3} Q${w * 0.5} ${h * 0.08} ${w * 0.88} ${h * 0.3}`} stroke="#5B6770" strokeWidth={18} fill="none" />
          <Path d={`M${w * 0.3} ${h * 0.88} L${w * 0.3} ${h * 0.48} Q${w * 0.5} ${h * 0.32} ${w * 0.7} ${h * 0.48} L${w * 0.7} ${h * 0.88} Z`} fill="rgba(30, 40, 46, 0.85)" />
          <Circle cx={w * 0.5} cy={h * 0.22} r={w * 0.04} fill="#cfd8dc" />
        </Svg>
      </View>
    );
  }
  if (variant === 'cave') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Path d={`M${w * 0.06} ${h * 0.95} L${w * 0.16} ${h * 0.28} Q${w * 0.5} ${h * 0.04} ${w * 0.84} ${h * 0.28} L${w * 0.94} ${h * 0.95} Z`} fill="#5B6770" />
          <Path d={`M${w * 0.22} ${h * 0.95} Q${w * 0.5} ${h * 0.28} ${w * 0.78} ${h * 0.95} Z`} fill="#12161a" />
          <Ellipse cx={w * 0.5} cy={h * 0.7} rx={w * 0.14} ry={h * 0.08} fill="rgba(200, 220, 140, 0.25)" />
        </Svg>
      </View>
    );
  }
  if (variant === 'cable') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Line x1={w * 0.08} y1={h * 0.18} x2={w * 0.92} y2={h * 0.18} stroke="#3b2816" strokeWidth={4} />
          <SvgRect x={w * 0.28} y={h * 0.22} width={w * 0.44} height={h * 0.42} rx={6} fill="#8a5a32" stroke="#3b2816" strokeWidth={3} />
          <SvgRect x={w * 0.34} y={h * 0.3} width={w * 0.14} height={h * 0.16} fill="#8ed0ee" />
          <SvgRect x={w * 0.52} y={h * 0.3} width={w * 0.14} height={h * 0.16} fill="#8ed0ee" />
          <Line x1={w * 0.36} y1={h * 0.18} x2={w * 0.36} y2={h * 0.24} stroke="#3b2816" strokeWidth={3} />
          <Line x1={w * 0.64} y1={h * 0.18} x2={w * 0.64} y2={h * 0.24} stroke="#3b2816" strokeWidth={3} />
          <SvgRect x={w * 0.18} y={h * 0.7} width={w * 0.64} height={h * 0.12} fill="#6a737a" />
          {[0.24, 0.76].map((at) => (
            <SvgRect key={at} x={w * at - 6} y={h * 0.62} width={12} height={h * 0.28} fill="#5a3d24" />
          ))}
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.58} rx={w * 0.28} ry={h * 0.26} fill="rgba(200, 230, 255, 0.4)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <SvgRect x={w * 0.1} y={h * 0.86} width={w * 0.8} height={h * 0.08} fill="#cfd8dc" />
        <SvgRect x={w * 0.16} y={h * 0.3} width={w * 0.14} height={h * 0.56} fill="#9aa3a8" />
        <SvgRect x={w * 0.7} y={h * 0.3} width={w * 0.14} height={h * 0.56} fill="#9aa3a8" />
        <Path d={`M${w * 0.08} ${h * 0.32} Q${w * 0.5} ${h * 0.06} ${w * 0.92} ${h * 0.32}`} stroke="#cfd8dc" strokeWidth={12} fill="none" />
        <Path d={`M${w * 0.3} ${h * 0.86} L${w * 0.3} ${h * 0.5} Q${w * 0.5} ${h * 0.34} ${w * 0.7} ${h * 0.5} L${w * 0.7} ${h * 0.86} Z`} fill="rgba(90, 140, 180, 0.55)" stroke="#e8f4ff" strokeWidth={3} />
        <Circle cx={w * 0.5} cy={h * 0.16} r={w * 0.045} fill="#e8f4ff" />
      </Svg>
    </View>
  );
}
