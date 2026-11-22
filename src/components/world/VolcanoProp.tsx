import { memo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect as SvgRect } from 'react-native-svg';

import { VOLCANO_ASH, VOLCANO_BASALT, VOLCANO_CRIMSON, VOLCANO_MAGMA } from '../../world/volcanoDecor';
import { isGearItem } from '../../world/items';
import type { LootActor, Rect } from '../../world/types';
import type { DepthStop } from './DepthGradient';
import { useLoop } from './useLoop';

export const VOLCANO_DEPTH_STOPS: readonly DepthStop[] = [
  { at: 0, color: VOLCANO_ASH },
  { at: 0.18, color: VOLCANO_ASH },
  { at: 0.45, color: VOLCANO_BASALT },
  { at: 0.78, color: VOLCANO_CRIMSON },
  { at: 1, color: VOLCANO_MAGMA },
];

const KINDS = new Set([
  'ashsoil',
  'pumice',
  'basalt',
  'heatcrack',
  'magmachannel',
  'sulfurvent',
  'ashdrift',
  'ember',
  'basaltcrag',
  'volrock',
  'hoinong_nuilua',
  'dungnham_nuilua',
]);

export function isVolcanoKind(kind: Rect['kind']): boolean {
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

export const VolcanoProp = memo(function VolcanoProp({ rect }: { rect: Rect }) {
  switch (rect.kind) {
    case 'ashsoil':
    case 'pumice':
    case 'basalt':
      return <Patch rect={rect} />;
    case 'heatcrack':
      return <HeatCrack rect={rect} />;
    case 'magmachannel':
      return <MagmaChannel rect={rect} />;
    case 'sulfurvent':
      return <SulfurVent rect={rect} />;
    case 'ashdrift':
      return <AshDrift rect={rect} />;
    case 'ember':
      return <Ember rect={rect} />;
    case 'basaltcrag':
      return <BasaltCrag rect={rect} />;
    case 'volrock':
      return <VolRock rect={rect} />;
    case 'hoinong_nuilua':
      return <HeatGust rect={rect} />;
    case 'dungnham_nuilua':
      return <LavaFissure rect={rect} />;
    default:
      return null;
  }
});

/** Rising ash / heat haze over the whole viewport. */
export function VolcanoAsh() {
  return (
    <View pointerEvents="none" style={styles.mist}>
      <View style={[styles.mistBank, { left: '7%', top: '14%', width: '38%', height: 46 }]} />
      <View style={[styles.mistBank, { right: '9%', top: '36%', width: '32%', height: 40 }]} />
      <View style={[styles.mistBank, { left: '20%', bottom: '14%', width: '46%', height: 54 }]} />
    </View>
  );
}

function Patch({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect, 8, 6, 6)}>
      <Svg width={rect.w + 16} height={rect.h + 12}>
        <Ellipse cx={rect.w / 2 + 8} cy={rect.h / 2 + 6} rx={rect.w / 2 + 6} ry={rect.h / 2 + 4} fill={rect.fill ?? VOLCANO_ASH} />
        <Ellipse
          cx={rect.w * 0.38 + 8}
          cy={rect.h * 0.42 + 6}
          rx={rect.w * 0.14}
          ry={rect.h * 0.1}
          fill="rgba(255,255,255,0.08)"
        />
      </Svg>
    </View>
  );
}

function HeatCrack({ rect }: { rect: Rect }) {
  const pulse = useLoop(2000, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 1, 0.45] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect, 2, 4, 2)}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity }}>
        <Svg width={w + 4} height={h + 6}>
          <Path
            d={`M2 ${h * 0.55 + 3} Q${w * 0.3} ${2} ${w * 0.55} ${h * 0.45 + 3} T${w + 2} ${h * 0.5 + 3}`}
            stroke={rect.fill ?? VOLCANO_MAGMA}
            strokeWidth={Math.max(4, h * 0.55)}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={`M${w * 0.15} ${h * 0.7 + 3} Q${w * 0.4} ${h * 0.2 + 3} ${w * 0.75} ${h * 0.65 + 3}`}
            stroke="#ffeb3b"
            strokeWidth={2}
            fill="none"
            opacity={0.7}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function MagmaChannel({ rect }: { rect: Rect }) {
  const flow = useLoop(2600, seedOf(rect) / 997);
  const shift = flow.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect, 4, 4, 4)}>
      <Svg width={w + 8} height={h + 8} style={{ position: 'absolute' }}>
        <Ellipse cx={w / 2 + 4} cy={h / 2 + 4} rx={w / 2} ry={h / 2} fill={rect.fill ?? VOLCANO_CRIMSON} />
        <Ellipse cx={w / 2 + 4} cy={h / 2 + 4} rx={w / 2 - 8} ry={h / 2 - 4} fill={VOLCANO_MAGMA} opacity={0.65} />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateX: shift }] }}>
        <Svg width={w + 8} height={h + 8}>
          <Ellipse cx={w * 0.3 + 4} cy={h * 0.45 + 4} rx={w * 0.1} ry={h * 0.15} fill="rgba(255, 235, 59, 0.55)" />
          <Ellipse cx={w * 0.6 + 4} cy={h * 0.55 + 4} rx={w * 0.08} ry={h * 0.12} fill="rgba(255, 138, 101, 0.5)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function SulfurVent({ rect }: { rect: Rect }) {
  const puff = useLoop(2400, seedOf(rect) / 997);
  const rise = puff.interpolate({ inputRange: [0, 1], outputRange: [6, -14] });
  const opacity = puff.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.7, 0.2] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect, 8, 24, 4)}>
      <Svg width={w + 16} height={h + 28} style={{ position: 'absolute' }}>
        <Ellipse cx={w / 2 + 8} cy={h + 20} rx={w * 0.45} ry={h * 0.28} fill="#3a3e44" />
        <Ellipse cx={w / 2 + 8} cy={h + 16} rx={w * 0.28} ry={h * 0.18} fill="#2a2e34" />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity, transform: [{ translateY: rise }] }}>
        <Svg width={w + 16} height={h + 28}>
          <Ellipse cx={w / 2 + 8} cy={h * 0.4} rx={w * 0.35} ry={h * 0.35} fill={rect.fill ?? '#d4c43a'} opacity={0.55} />
          <Ellipse cx={w / 2 + 4} cy={h * 0.2} rx={w * 0.22} ry={h * 0.22} fill="#fff59d" opacity={0.4} />
        </Svg>
      </Animated.View>
    </View>
  );
}

function AshDrift({ rect }: { rect: Rect }) {
  const drift = useLoop(3600, seedOf(rect) / 997);
  const shift = drift.interpolate({ inputRange: [0, 1], outputRange: [-6, 10] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { transform: [{ translateX: shift }] }]}>
      <Svg width={rect.w} height={rect.h}>
        <Path
          d={`M0 ${rect.h * 0.7} Q${rect.w * 0.25} ${rect.h * 0.2} ${rect.w * 0.55} ${rect.h * 0.5} T${rect.w} ${rect.h * 0.65} L${rect.w} ${rect.h} L0 ${rect.h} Z`}
          fill={rect.fill ?? 'rgba(180, 180, 184, 0.35)'}
        />
      </Svg>
    </Animated.View>
  );
}

function Ember({ rect }: { rect: Rect }) {
  const pulse = useLoop(1800, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.25, 0.95, 0.25] });
  const rise = pulse.interpolate({ inputRange: [0, 1], outputRange: [4, -10] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity, transform: [{ translateY: rise }] }]}>
      <Svg width={rect.w} height={rect.h}>
        <Circle cx={rect.w / 2} cy={rect.h / 2} r={Math.min(rect.w, rect.h) / 2} fill={rect.fill ?? VOLCANO_MAGMA} />
      </Svg>
    </Animated.View>
  );
}

function BasaltCrag({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.6;
  return (
    <View pointerEvents="none" style={box(rect, 6, lift, 4)}>
      <Svg width={w + 12} height={h + lift + 4}>
        <G x={6} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.8} rx={w * 0.48} ry={h * 0.22} fill="rgba(10, 8, 6, 0.35)" />
          <Path
            d={`M0 ${h * 0.55} L${w * 0.18} ${-lift * 0.35} L${w * 0.42} ${-lift * 0.75} L${w * 0.7} ${-lift * 0.3} L${w} ${h * 0.5} L${w * 0.72} ${h} L${w * 0.22} ${h} Z`}
            fill={rect.fill ?? VOLCANO_BASALT}
            stroke="#12151a"
            strokeWidth={2}
          />
          <Path d={`M${w * 0.18} ${-lift * 0.35} L${w * 0.42} ${-lift * 0.75} L${w * 0.38} ${-lift * 0.1}`} fill="rgba(255,87,34,0.18)" />
          <Line x1={w * 0.35} y1={-lift * 0.2} x2={w * 0.55} y2={h * 0.3} stroke="#FF5722" strokeWidth={2} opacity={0.5} />
        </G>
      </Svg>
    </View>
  );
}

function VolRock({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 0.85;
  return (
    <View pointerEvents="none" style={box(rect, 4, lift, 2)}>
      <Svg width={w + 8} height={h + lift + 2}>
        <G x={4} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.8} rx={w * 0.46} ry={h * 0.2} fill="rgba(10, 8, 6, 0.28)" />
          <Path
            d={`M0 ${h * 0.55} L${w * 0.22} ${-lift * 0.3} L${w * 0.55} ${-lift * 0.5} L${w * 0.85} ${-lift * 0.15} L${w} ${h * 0.5} L${w * 0.7} ${h} L${w * 0.2} ${h} Z`}
            fill={rect.fill ?? '#5a5e64'}
            stroke="#2a2e34"
            strokeWidth={2}
          />
        </G>
      </Svg>
    </View>
  );
}

function HeatGust({ rect }: { rect: Rect }) {
  const gust = useLoop(1700, seedOf(rect) / 997);
  const shift = gust.interpolate({ inputRange: [0, 1], outputRange: [-6, 8] });
  const opacity = gust.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.85, 0.35] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(255, 87, 34, 0.22)" />
        {[0.28, 0.48, 0.68].map((at) => (
          <Path
            key={at}
            d={`M${w * at} ${h * 0.85} L${w * (at + 0.05)} ${h * 0.2} L${w * (at + 0.1)} ${h * 0.85} Z`}
            fill="#6a6460"
            opacity={0.7}
          />
        ))}
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity, transform: [{ translateX: shift }] }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.12} ${h * 0.4} Q${w * 0.35} ${h * 0.15} ${w * 0.55} ${h * 0.42} T${w * 0.9} ${h * 0.3}`}
            stroke="rgba(255, 183, 77, 0.75)"
            strokeWidth={3}
            fill="none"
          />
          <Path
            d={`M${w * 0.18} ${h * 0.6} Q${w * 0.42} ${h * 0.4} ${w * 0.68} ${h * 0.62} T${w * 0.92} ${h * 0.52}`}
            stroke="rgba(255, 87, 34, 0.55)"
            strokeWidth={2.5}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function LavaFissure({ rect }: { rect: Rect }) {
  const pulse = useLoop(2100, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 1, 0.55] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(142, 22, 0, 0.4)" />
        <Path
          d={`M${w * 0.15} ${h * 0.4} L${w * 0.4} ${h * 0.2} L${w * 0.55} ${h * 0.75} L${w * 0.25} ${h * 0.85} Z`}
          fill="#3e1010"
        />
        <Path
          d={`M${w * 0.48} ${h * 0.25} L${w * 0.85} ${h * 0.4} L${w * 0.7} ${h * 0.85} L${w * 0.45} ${h * 0.7} Z`}
          fill="#5a1510"
        />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.22} ${h * 0.55} Q${w * 0.45} ${h * 0.35} ${w * 0.7} ${h * 0.6}`}
            stroke={VOLCANO_MAGMA}
            strokeWidth={5}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={`M${w * 0.35} ${h * 0.3} Q${w * 0.5} ${h * 0.55} ${w * 0.62} ${h * 0.8}`}
            stroke="#ffeb3b"
            strokeWidth={2.5}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const LOOT_BOX = 44;

export function VolcanoLoot({ drop }: { drop: LootActor }) {
  const chest = drop.kind === 'item' && drop.itemId != null && isGearItem(drop.itemId);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: drop.x - LOOT_BOX / 2, top: drop.y - LOOT_BOX / 2, width: LOOT_BOX, height: LOOT_BOX }}
    >
      <Svg width={LOOT_BOX} height={LOOT_BOX}>
        {chest ? (
          <>
            <SvgRect x={7} y={14} width={30} height={20} rx={2} fill="#3a2a22" stroke="#1a1010" strokeWidth={2} />
            <SvgRect x={7} y={14} width={30} height={5} fill="#FF5722" opacity={0.8} />
            <Line x1={8} y1={24} x2={36} y2={24} stroke="#ff8a65" strokeWidth={2} />
            <Circle cx={22} cy={26} r={3.5} fill={drop.tint} stroke="#1a1010" strokeWidth={1} />
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(255, 87, 34, 0.35)" />
          </>
        ) : (
          <>
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(10, 8, 6, 0.3)" />
            <Path d="M12 34 Q10 20 16 16 L28 16 Q34 20 32 34 Z" fill="#4A4E54" stroke="#1a1d22" strokeWidth={2} />
            <Path d="M16 16 L14 10 L22 13 L30 10 L28 16 Z" fill="#8E1600" stroke="#1a1d22" strokeWidth={1.4} />
            <Line x1={14} y1={22} x2={30} y2={22} stroke="#FF5722" strokeWidth={2} />
            <Circle cx={22} cy={26} r={4} fill={drop.kind === 'gold' ? '#ffd24a' : drop.tint} />
          </>
        )}
      </Svg>
    </View>
  );
}

export type VolcanoGateVariant = 'town' | 'savanna' | 'desert' | 'core';

/** Return is the obsidian arch, west (Thảo Nguyên) the savanna post, east (Sa Mạc) the dune gate. */
export function volcanoGateVariant(sensorId: string): VolcanoGateVariant {
  if (sensorId === 'return') return 'town';
  if (sensorId === 'ascent') return 'core';
  if (sensorId === 'west') return 'savanna';
  return 'desert';
}

export function VolcanoGateArt({ variant, width, height }: { variant: VolcanoGateVariant; width: number; height: number }) {
  const pulse = useLoop(2400);
  const glow = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.95, 0.3] });
  const w = width;
  const h = height;
  if (variant === 'town') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.18} y={h * 0.3} width={w * 0.14} height={h * 0.58} fill="#3a3e44" />
          <SvgRect x={w * 0.68} y={h * 0.3} width={w * 0.14} height={h * 0.58} fill="#3a3e44" />
          <Path d={`M${w * 0.12} ${h * 0.34} Q${w * 0.5} ${h * 0.1} ${w * 0.88} ${h * 0.34}`} stroke="#5a5e64" strokeWidth={12} fill="none" />
          <Path
            d={`M${w * 0.32} ${h * 0.9} L${w * 0.32} ${h * 0.5} Q${w * 0.5} ${h * 0.36} ${w * 0.68} ${h * 0.5} L${w * 0.68} ${h * 0.9} Z`}
            fill="rgba(255, 87, 34, 0.28)"
          />
          <Ellipse cx={w * 0.5} cy={h * 0.92} rx={w * 0.34} ry={h * 0.06} fill="#4A4E54" />
        </Svg>
      </View>
    );
  }
  if (variant === 'savanna') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.2} y={h * 0.35} width={w * 0.12} height={h * 0.5} fill="#8d6e4a" />
          <SvgRect x={w * 0.68} y={h * 0.35} width={w * 0.12} height={h * 0.5} fill="#8d6e4a" />
          <Ellipse cx={w * 0.26} cy={h * 0.3} rx={w * 0.14} ry={h * 0.1} fill="#6f8f3a" />
          <Ellipse cx={w * 0.74} cy={h * 0.3} rx={w * 0.14} ry={h * 0.1} fill="#6f8f3a" />
          <Path d={`M${w * 0.14} ${h * 0.38} Q${w * 0.5} ${h * 0.14} ${w * 0.86} ${h * 0.38}`} stroke="#c9a24e" strokeWidth={10} fill="none" />
          <Ellipse cx={w * 0.5} cy={h * 0.9} rx={w * 0.32} ry={h * 0.06} fill="#c9a24e" />
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
          <Ellipse cx={w * 0.5} cy={h * 0.88} rx={w * 0.36} ry={h * 0.07} fill="#d4b07a" />
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.55} rx={w * 0.3} ry={h * 0.26} fill="rgba(255, 87, 34, 0.45)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <SvgRect x={w * 0.16} y={h * 0.34} width={w * 0.14} height={h * 0.52} fill="#26292E" />
        <SvgRect x={w * 0.7} y={h * 0.34} width={w * 0.14} height={h * 0.52} fill="#26292E" />
        <Path d={`M${w * 0.1} ${h * 0.36} Q${w * 0.5} ${h * 0.1} ${w * 0.9} ${h * 0.36}`} stroke="#8E1600" strokeWidth={12} fill="none" />
        <Path
          d={`M${w * 0.3} ${h * 0.88} L${w * 0.3} ${h * 0.5} Q${w * 0.5} ${h * 0.34} ${w * 0.7} ${h * 0.5} L${w * 0.7} ${h * 0.88} Z`}
          fill="rgba(142, 22, 0, 0.9)"
          stroke="#FF5722"
          strokeWidth={3}
        />
        <Circle cx={w * 0.5} cy={h * 0.2} r={w * 0.05} fill="#ffeb3b" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  mist: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  mistBank: { position: 'absolute', borderRadius: 40, backgroundColor: 'rgba(74, 78, 84, 0.16)' },
});
