import { memo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect as SvgRect } from 'react-native-svg';

import { SAVANNAH_EARTH, SAVANNAH_GRASS, SAVANNAH_OCHRE, SAVANNAH_TEMP } from '../../world/savannahDecor';
import { isGearItem } from '../../world/items';
import type { LootActor, Rect } from '../../world/types';
import type { DepthStop } from './DepthGradient';
import { useLoop } from './useLoop';

export const SAVANNAH_DEPTH_STOPS: readonly DepthStop[] = [
  { at: 0, color: SAVANNAH_TEMP },
  { at: 0.18, color: SAVANNAH_TEMP },
  { at: 0.42, color: SAVANNAH_GRASS },
  { at: 0.72, color: SAVANNAH_OCHRE },
  { at: 1, color: SAVANNAH_EARTH },
];

const KINDS = new Set([
  'tempgrass',
  'goldgrass',
  'dryearth',
  'savstream',
  'flatstone',
  'savreed',
  'mound',
  'savacacia',
  'savrock',
  'heatshimmer',
  'giothaonguyen',
  'datnutthaonguyen',
]);

export function isSavannaKind(kind: Rect['kind']): boolean {
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

export const SavannaProp = memo(function SavannaProp({ rect }: { rect: Rect }) {
  switch (rect.kind) {
    case 'tempgrass':
    case 'goldgrass':
    case 'dryearth':
      return <Patch rect={rect} />;
    case 'savstream':
      return <Stream rect={rect} />;
    case 'flatstone':
      return <FlatStone rect={rect} />;
    case 'savreed':
      return <Reed rect={rect} />;
    case 'mound':
      return <Mound rect={rect} />;
    case 'savacacia':
      return <AcaciaTree rect={rect} />;
    case 'savrock':
      return <SavRock rect={rect} />;
    case 'heatshimmer':
      return <HeatShimmer rect={rect} />;
    case 'giothaonguyen':
      return <WindBrush rect={rect} />;
    case 'datnutthaonguyen':
      return <CrackedPit rect={rect} />;
    default:
      return null;
  }
});

/** Soft heat haze banks over the whole viewport. */
export function SavannaHaze() {
  return (
    <View pointerEvents="none" style={styles.mist}>
      <View style={[styles.mistBank, { left: '8%', top: '12%', width: '40%', height: 48 }]} />
      <View style={[styles.mistBank, { right: '10%', top: '34%', width: '34%', height: 40 }]} />
      <View style={[styles.mistBank, { left: '22%', bottom: '16%', width: '48%', height: 56 }]} />
    </View>
  );
}

function Patch({ rect }: { rect: Rect }) {
  const sway = useLoop(4200, seedOf(rect) / 997);
  const opacity = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 1, 0.85] });
  return (
    <View pointerEvents="none" style={box(rect, 8, 6, 6)}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity }}>
        <Svg width={rect.w + 16} height={rect.h + 12}>
          <Ellipse cx={rect.w / 2 + 8} cy={rect.h / 2 + 6} rx={rect.w / 2 + 6} ry={rect.h / 2 + 4} fill={rect.fill ?? SAVANNAH_GRASS} />
          <Ellipse
            cx={rect.w * 0.35 + 8}
            cy={rect.h * 0.4 + 6}
            rx={rect.w * 0.16}
            ry={rect.h * 0.1}
            fill="rgba(255,255,255,0.18)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Stream({ rect }: { rect: Rect }) {
  const flow = useLoop(2800, seedOf(rect) / 997);
  const shift = flow.interpolate({ inputRange: [0, 1], outputRange: [0, 10] });
  return (
    <View pointerEvents="none" style={box(rect, 4, 4, 4)}>
      <Svg width={rect.w + 8} height={rect.h + 8} style={{ position: 'absolute' }}>
        <Ellipse cx={rect.w / 2 + 4} cy={rect.h / 2 + 4} rx={rect.w / 2} ry={rect.h / 2} fill={rect.fill ?? '#64B5F6'} opacity={0.75} />
        <Ellipse cx={rect.w / 2 + 4} cy={rect.h / 2 + 4} rx={rect.w / 2 - 6} ry={rect.h / 2 - 4} fill="#BBDEFB" opacity={0.45} />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: shift }] }}>
        <Svg width={rect.w + 8} height={rect.h + 8}>
          <Ellipse cx={rect.w * 0.3 + 4} cy={rect.h * 0.45 + 4} rx={rect.w * 0.12} ry={rect.h * 0.12} fill="rgba(255,255,255,0.45)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function FlatStone({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w / 2} cy={rect.h / 2} rx={rect.w / 2} ry={rect.h / 2} fill={rect.fill ?? '#b0bec5'} stroke="#78909c" strokeWidth={2} />
        <Ellipse cx={rect.w * 0.4} cy={rect.h * 0.4} rx={rect.w * 0.18} ry={rect.h * 0.12} fill="rgba(255,255,255,0.25)" />
      </Svg>
    </View>
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

function Mound({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Path
          d={`M0 ${rect.h * 0.75} Q${rect.w * 0.25} ${rect.h * 0.15} ${rect.w * 0.55} ${rect.h * 0.4} T${rect.w} ${rect.h * 0.7} L${rect.w} ${rect.h} L0 ${rect.h} Z`}
          fill={rect.fill ?? '#9CCC65'}
        />
      </Svg>
    </View>
  );
}

function AcaciaTree({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 2.2;
  const pad = w * 0.2;
  const sway = useLoop(3800, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-1.5deg', '1.5deg', '-1.5deg'] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect, pad, lift, 4), { transform: [{ translateY: h / 2 }, { rotate }, { translateY: -h / 2 }] }]}
    >
      <Svg width={w + pad * 2} height={h + lift + 4}>
        <G x={pad} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.85} rx={w * 0.42} ry={h * 0.22} fill="rgba(40, 30, 10, 0.22)" />
          <Path d={`M${w * 0.46} ${h * 0.7} L${w * 0.5} ${-lift * 0.55} L${w * 0.54} ${h * 0.7} Z`} fill="#6d4c41" />
          <Ellipse cx={w / 2} cy={-lift * 0.45} rx={w * 0.55} ry={h * 0.55} fill={rect.fill ?? '#6f8f3a'} />
          <Ellipse cx={w * 0.35} cy={-lift * 0.4} rx={w * 0.28} ry={h * 0.32} fill="#8aa64a" />
          <Ellipse cx={w * 0.65} cy={-lift * 0.42} rx={w * 0.3} ry={h * 0.34} fill="#558b2f" />
        </G>
      </Svg>
    </Animated.View>
  );
}

function SavRock({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 0.9;
  return (
    <View pointerEvents="none" style={box(rect, 4, lift, 2)}>
      <Svg width={w + 8} height={h + lift + 2}>
        <G x={4} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.8} rx={w * 0.48} ry={h * 0.22} fill="rgba(40, 30, 10, 0.2)" />
          <Path
            d={`M0 ${h * 0.55} L${w * 0.2} ${-lift * 0.35} L${w * 0.55} ${-lift * 0.55} L${w * 0.85} ${-lift * 0.2} L${w} ${h * 0.5} L${w * 0.7} ${h} L${w * 0.2} ${h} Z`}
            fill={rect.fill ?? '#a1887f'}
            stroke="#6d4c41"
            strokeWidth={2}
          />
          <Path d={`M${w * 0.2} ${-lift * 0.35} L${w * 0.55} ${-lift * 0.55} L${w * 0.5} ${-lift * 0.05}`} fill="rgba(255,255,255,0.2)" />
        </G>
      </Svg>
    </View>
  );
}

function HeatShimmer({ rect }: { rect: Rect }) {
  const pulse = useLoop(2200, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.12, 0.4, 0.12] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity }]}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w / 2} cy={rect.h / 2} rx={rect.w / 2} ry={rect.h / 2} fill={rect.fill ?? 'rgba(255, 224, 130, 0.2)'} />
      </Svg>
    </Animated.View>
  );
}

function WindBrush({ rect }: { rect: Rect }) {
  const gust = useLoop(1800, seedOf(rect) / 997);
  const shift = gust.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(156, 126, 60, 0.28)" />
        {[0.25, 0.45, 0.65, 0.8].map((at) => (
          <Path
            key={at}
            d={`M${w * at} ${h * 0.85} L${w * (at + 0.04)} ${h * 0.25} L${w * (at + 0.08)} ${h * 0.85} Z`}
            fill="#795548"
          />
        ))}
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: shift }] }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.1} ${h * 0.35} Q${w * 0.35} ${h * 0.15} ${w * 0.55} ${h * 0.4} T${w * 0.9} ${h * 0.3}`}
            stroke="rgba(255, 236, 179, 0.7)"
            strokeWidth={3}
            fill="none"
          />
          <Path
            d={`M${w * 0.15} ${h * 0.55} Q${w * 0.4} ${h * 0.4} ${w * 0.65} ${h * 0.6} T${w * 0.92} ${h * 0.5}`}
            stroke="rgba(255, 213, 79, 0.55)"
            strokeWidth={2.5}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function CrackedPit({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(121, 85, 72, 0.35)" />
        <Path
          d={`M${w * 0.18} ${h * 0.4} L${w * 0.42} ${h * 0.22} L${w * 0.58} ${h * 0.7} L${w * 0.28} ${h * 0.82} Z`}
          fill="#5d4037"
        />
        <Path
          d={`M${w * 0.48} ${h * 0.28} L${w * 0.82} ${h * 0.38} L${w * 0.7} ${h * 0.82} L${w * 0.46} ${h * 0.68} Z`}
          fill="#6d4c41"
        />
        <Line x1={w * 0.2} y1={h * 0.5} x2={w * 0.75} y2={h * 0.45} stroke="#3e2723" strokeWidth={3} />
        <Line x1={w * 0.4} y1={h * 0.25} x2={w * 0.55} y2={h * 0.8} stroke="#3e2723" strokeWidth={2.5} />
        <Line x1={w * 0.55} y1={h * 0.35} x2={w * 0.85} y2={h * 0.7} stroke="#4e342e" strokeWidth={2} />
      </Svg>
    </View>
  );
}

const LOOT_BOX = 44;

export function SavannaLoot({ drop }: { drop: LootActor }) {
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
            <SvgRect x={7} y={14} width={30} height={5} fill="#c9a24e" opacity={0.85} />
            <Line x1={8} y1={24} x2={36} y2={24} stroke="#8BC34A" strokeWidth={2} />
            <Circle cx={22} cy={26} r={3.5} fill={drop.tint} stroke="#2b1c10" strokeWidth={1} />
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(139, 195, 74, 0.45)" />
          </>
        ) : (
          <>
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(40, 30, 10, 0.25)" />
            <Path d="M12 34 Q10 20 16 16 L28 16 Q34 20 32 34 Z" fill="#8d6e4a" stroke="#3e2723" strokeWidth={2} />
            <Path d="M16 16 L14 10 L22 13 L30 10 L28 16 Z" fill="#c9a24e" stroke="#3e2723" strokeWidth={1.4} />
            <Line x1={14} y1={22} x2={30} y2={22} stroke="#8BC34A" strokeWidth={2} />
            <Circle cx={22} cy={26} r={4} fill={drop.kind === 'gold' ? '#ffd24a' : drop.tint} />
          </>
        )}
      </Svg>
    </View>
  );
}

export type SavannaGateVariant = 'town' | 'frost' | 'volcano' | 'apex';

/** Return is the town arch, west (Băng Giá) the frost post, east (Núi Lửa) the ember gate. */
export function savannaGateVariant(sensorId: string): SavannaGateVariant {
  if (sensorId === 'return') return 'town';
  if (sensorId === 'ascent') return 'apex';
  if (sensorId === 'west') return 'frost';
  return 'volcano';
}

export function SavannaGateArt({ variant, width, height }: { variant: SavannaGateVariant; width: number; height: number }) {
  const pulse = useLoop(2600);
  const glow = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.95, 0.3] });
  const w = width;
  const h = height;
  if (variant === 'town') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.18} y={h * 0.28} width={w * 0.14} height={h * 0.6} fill="#8d6e4a" />
          <SvgRect x={w * 0.68} y={h * 0.28} width={w * 0.14} height={h * 0.6} fill="#8d6e4a" />
          <Path d={`M${w * 0.12} ${h * 0.32} Q${w * 0.5} ${h * 0.08} ${w * 0.88} ${h * 0.32}`} stroke="#6f8f3a" strokeWidth={12} fill="none" />
          <Path
            d={`M${w * 0.32} ${h * 0.9} L${w * 0.32} ${h * 0.48} Q${w * 0.5} ${h * 0.34} ${w * 0.68} ${h * 0.48} L${w * 0.68} ${h * 0.9} Z`}
            fill="rgba(139, 195, 74, 0.35)"
          />
          <Ellipse cx={w * 0.5} cy={h * 0.92} rx={w * 0.34} ry={h * 0.06} fill="#c9a24e" />
        </Svg>
      </View>
    );
  }
  if (variant === 'frost') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.1} ${h * 0.95} L${w * 0.2} ${h * 0.32} Q${w * 0.5} ${h * 0.08} ${w * 0.8} ${h * 0.32} L${w * 0.9} ${h * 0.95} Z`}
            fill="#90a4ae"
          />
          <Path d={`M${w * 0.28} ${h * 0.95} Q${w * 0.5} ${h * 0.3} ${w * 0.72} ${h * 0.95} Z`} fill="#80DEEA" opacity={0.55} />
          <Ellipse cx={w * 0.5} cy={h * 0.7} rx={w * 0.1} ry={h * 0.05} fill="rgba(224, 247, 250, 0.5)" />
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
            fill="#5d4037"
          />
          <Path d={`M${w * 0.3} ${h * 0.95} Q${w * 0.5} ${h * 0.28} ${w * 0.7} ${h * 0.95} Z`} fill="#ef6c00" opacity={0.7} />
          <Circle cx={w * 0.5} cy={h * 0.42} r={w * 0.06} fill="#ffeb3b" />
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.55} rx={w * 0.28} ry={h * 0.24} fill="rgba(255, 193, 7, 0.4)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <SvgRect x={w * 0.16} y={h * 0.34} width={w * 0.14} height={h * 0.52} fill="#6d4c41" />
        <SvgRect x={w * 0.7} y={h * 0.34} width={w * 0.14} height={h * 0.52} fill="#6d4c41" />
        <Path d={`M${w * 0.1} ${h * 0.36} Q${w * 0.5} ${h * 0.1} ${w * 0.9} ${h * 0.36}`} stroke="#c9a24e" strokeWidth={12} fill="none" />
        <Path
          d={`M${w * 0.3} ${h * 0.88} L${w * 0.3} ${h * 0.5} Q${w * 0.5} ${h * 0.36} ${w * 0.7} ${h * 0.5} L${w * 0.7} ${h * 0.88} Z`}
          fill="rgba(93, 64, 55, 0.85)"
          stroke="#ffb300"
          strokeWidth={3}
        />
        <Circle cx={w * 0.5} cy={h * 0.2} r={w * 0.045} fill="#ffeb3b" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  mist: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  mistBank: { position: 'absolute', borderRadius: 40, backgroundColor: 'rgba(255, 224, 130, 0.1)' },
});
