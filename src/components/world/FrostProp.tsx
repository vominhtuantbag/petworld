import { memo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect as SvgRect } from 'react-native-svg';

import { FROST_COBALT, FROST_JADE, FROST_SNOW } from '../../world/frostDecor';
import { isGearItem } from '../../world/items';
import type { LootActor, Rect } from '../../world/types';
import type { DepthStop } from './DepthGradient';
import { useLoop } from './useLoop';

export const FROST_DEPTH_STOPS: readonly DepthStop[] = [
  { at: 0, color: FROST_SNOW },
  { at: 0.16, color: FROST_SNOW },
  { at: 0.48, color: FROST_JADE },
  { at: 0.82, color: FROST_COBALT },
  { at: 1, color: FROST_COBALT },
];

const KINDS = new Set([
  'frostsnow',
  'jadeice',
  'cobaltice',
  'snowdrift',
  'frostbush',
  'crystalshard',
  'glacierock',
  'icepillar',
  'frostcliff',
  'snowflake',
  'frostwind',
  'iceglare',
  'baotruyet',
  'khebang',
]);

export function isFrostKind(kind: Rect['kind']): boolean {
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

export const FrostProp = memo(function FrostProp({ rect }: { rect: Rect }) {
  switch (rect.kind) {
    case 'frostsnow':
    case 'jadeice':
    case 'cobaltice':
      return <Patch rect={rect} />;
    case 'snowdrift':
      return <Drift rect={rect} />;
    case 'frostbush':
      return <Bush rect={rect} />;
    case 'crystalshard':
      return <Shard rect={rect} />;
    case 'glacierock':
      return <GlacierRock rect={rect} />;
    case 'icepillar':
      return <IcePillar rect={rect} />;
    case 'frostcliff':
      return <FrostCliff rect={rect} />;
    case 'snowflake':
      return <Snowflake rect={rect} />;
    case 'frostwind':
      return <Wind rect={rect} />;
    case 'iceglare':
      return <Glare rect={rect} />;
    case 'baotruyet':
      return <BlizzardGust rect={rect} />;
    case 'khebang':
      return <Crevasse rect={rect} />;
    default:
      return null;
  }
});

/** Continuous falling snow haze over the whole viewport. */
export function FrostSnow() {
  return (
    <View pointerEvents="none" style={styles.mist}>
      <View style={[styles.mistBank, { left: '6%', top: '10%', width: '42%', height: 54 }]} />
      <View style={[styles.mistBank, { right: '8%', top: '28%', width: '36%', height: 44 }]} />
      <View style={[styles.mistBank, { left: '18%', bottom: '18%', width: '50%', height: 60 }]} />
    </View>
  );
}

function Patch({ rect }: { rect: Rect }) {
  const glare = useLoop(3600, seedOf(rect) / 997);
  const opacity = glare.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.45, 0.15] });
  return (
    <View pointerEvents="none" style={box(rect, 8, 6, 6)}>
      <Svg width={rect.w + 16} height={rect.h + 12} style={{ position: 'absolute' }}>
        <Ellipse cx={rect.w / 2 + 8} cy={rect.h / 2 + 6} rx={rect.w / 2 + 6} ry={rect.h / 2 + 4} fill={rect.fill ?? FROST_SNOW} />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity }}>
        <Svg width={rect.w + 16} height={rect.h + 12}>
          <Ellipse
            cx={rect.w * 0.4 + 8}
            cy={rect.h * 0.4 + 6}
            rx={rect.w * 0.18}
            ry={rect.h * 0.08}
            fill="rgba(255,255,255,0.55)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Drift({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Path
          d={`M0 ${rect.h * 0.7} Q${rect.w * 0.25} ${rect.h * 0.15} ${rect.w * 0.55} ${rect.h * 0.45} T${rect.w} ${rect.h * 0.65} L${rect.w} ${rect.h} L0 ${rect.h} Z`}
          fill={rect.fill ?? '#f7fafc'}
        />
      </Svg>
    </View>
  );
}

function Bush({ rect }: { rect: Rect }) {
  const sway = useLoop(3200, seedOf(rect) / 997);
  const rotate = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-3deg', '3deg', '-3deg'] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[box(rect), { transform: [{ translateY: rect.h / 2 }, { rotate }, { translateY: -rect.h / 2 }] }]}
    >
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w * 0.35} cy={rect.h * 0.55} rx={rect.w * 0.28} ry={rect.h * 0.35} fill={rect.fill ?? '#90a4ae'} />
        <Ellipse cx={rect.w * 0.65} cy={rect.h * 0.5} rx={rect.w * 0.3} ry={rect.h * 0.38} fill="#78909c" />
        <Ellipse cx={rect.w * 0.5} cy={rect.h * 0.35} rx={rect.w * 0.22} ry={rect.h * 0.28} fill="#cfd8dc" />
      </Svg>
    </Animated.View>
  );
}

function Shard({ rect }: { rect: Rect }) {
  const pulse = useLoop(2400, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] });
  const fill = rect.fill ?? '#80DEEA';
  return (
    <View pointerEvents="none" style={box(rect, 4, 8, 2)}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity }}>
        <Svg width={rect.w + 8} height={rect.h + 10}>
          <Ellipse cx={rect.w / 2 + 4} cy={rect.h * 0.5 + 8} rx={rect.w * 0.7} ry={rect.h * 0.55} fill={fill} opacity={0.35} />
        </Svg>
      </Animated.View>
      <Svg width={rect.w + 8} height={rect.h + 10} style={{ position: 'absolute' }}>
        <Polygon
          points={`${4 + rect.w / 2},8 ${4 + rect.w},${8 + rect.h * 0.85} ${4},${8 + rect.h * 0.85}`}
          fill={fill}
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
}

function GlacierRock({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 1.3;
  return (
    <View pointerEvents="none" style={box(rect, 6, lift, 4)}>
      <Svg width={w + 12} height={h + lift + 4}>
        <G x={6} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.75} rx={w * 0.5} ry={h * 0.28} fill="rgba(20,24,28,0.25)" />
          <Path
            d={`M0 ${h * 0.55} L${w * 0.15} ${-lift * 0.4} L${w * 0.45} ${-lift * 0.75} L${w * 0.75} ${-lift * 0.3} L${w} ${h * 0.5} L${w * 0.65} ${h} L${w * 0.2} ${h} Z`}
            fill={rect.fill ?? '#90a4ae'}
          />
          <Path d={`M${w * 0.15} ${-lift * 0.4} L${w * 0.45} ${-lift * 0.75} L${w * 0.4} ${-lift * 0.1}`} fill="rgba(255,255,255,0.35)" />
        </G>
      </Svg>
    </View>
  );
}

function IcePillar({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 4;
  const pad = w * 0.4;
  return (
    <View pointerEvents="none" style={box(rect, pad, lift, 4)}>
      <Svg width={w + pad * 2} height={h + lift + 4}>
        <G x={pad} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.7} rx={w * 0.55} ry={h * 0.25} fill="rgba(0, 96, 100, 0.25)" />
          <Path
            d={`M${w * 0.2} ${h * 0.7} L${w * 0.28} ${-lift * 0.85} L${w * 0.5} ${-lift} L${w * 0.72} ${-lift * 0.85} L${w * 0.8} ${h * 0.7} Z`}
            fill={rect.fill ?? '#b2ebf2'}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={1.5}
          />
          <Line x1={w * 0.4} y1={-lift * 0.7} x2={w * 0.42} y2={h * 0.5} stroke="rgba(255,255,255,0.45)" strokeWidth={2} />
        </G>
      </Svg>
    </View>
  );
}

function FrostCliff({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  const lift = h * 2.2;
  return (
    <View pointerEvents="none" style={box(rect, 8, lift, 6)}>
      <Svg width={w + 16} height={h + lift + 6}>
        <G x={8} y={lift}>
          <Ellipse cx={w / 2} cy={h * 0.85} rx={w * 0.52} ry={h * 0.28} fill="rgba(0, 40, 48, 0.45)" />
          <Path
            d={`M0 ${h * 0.55} L${w * 0.1} ${-lift * 0.5} L${w * 0.3} ${-lift * 0.85} L${w * 0.55} ${-lift * 0.35} L${w * 0.78} ${-lift * 0.75} L${w * 0.95} ${-lift * 0.25} L${w} ${h * 0.55} L${w * 0.7} ${h} L${w * 0.25} ${h} Z`}
            fill={rect.fill ?? '#004d56'}
          />
          <Path d={`M${w * 0.1} ${-lift * 0.5} L${w * 0.3} ${-lift * 0.85} L${w * 0.28} ${-lift * 0.15}`} fill="rgba(128, 222, 234, 0.35)" />
        </G>
      </Svg>
    </View>
  );
}

function Snowflake({ rect }: { rect: Rect }) {
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={rect.w} height={rect.h}>
        <Circle cx={rect.w / 2} cy={rect.h / 2} r={Math.max(1.5, rect.w * 0.28)} fill={rect.fill ?? '#ffffff'} opacity={0.85} />
      </Svg>
    </View>
  );
}

function Wind({ rect }: { rect: Rect }) {
  const drift = useLoop(9000, seedOf(rect) / 997);
  const translateX = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-50, 50, -50] });
  const opacity = drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.45, 1, 0.45] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity, transform: [{ translateX }] }]}>
      <Svg width={rect.w} height={rect.h}>
        <Ellipse cx={rect.w * 0.4} cy={rect.h * 0.55} rx={rect.w * 0.38} ry={rect.h * 0.4} fill={rect.fill ?? 'rgba(236,239,241,0.2)'} />
        <Ellipse cx={rect.w * 0.68} cy={rect.h * 0.48} rx={rect.w * 0.28} ry={rect.h * 0.32} fill="rgba(255,255,255,0.16)" />
      </Svg>
    </Animated.View>
  );
}

function Glare({ rect }: { rect: Rect }) {
  const pulse = useLoop(3800, seedOf(rect) / 997);
  const opacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.7, 0.2] });
  return (
    <Animated.View pointerEvents="none" style={[box(rect), { opacity }]}>
      <Svg width={rect.w} height={rect.h}>
        <Path
          d={`M${rect.w * 0.4} 0 L${rect.w * 0.7} ${rect.h} L${rect.w * 0.3} ${rect.h} L${rect.w * 0.55} 0 Z`}
          fill={rect.fill ?? 'rgba(178, 235, 242, 0.22)'}
        />
      </Svg>
    </Animated.View>
  );
}

function BlizzardGust({ rect }: { rect: Rect }) {
  const swirl = useLoop(2200, seedOf(rect) / 997);
  const rotate = swirl.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const opacity = swirl.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] });
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(178, 235, 242, 0.28)" />
        <Ellipse cx={w / 2} cy={h / 2} rx={w * 0.36} ry={h * 0.22} fill="rgba(255,255,255,0.4)" />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity, transform: [{ rotate }] }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.18} ${h * 0.5} Q${w * 0.35} ${h * 0.18} ${w * 0.55} ${h * 0.42} T${w * 0.88} ${h * 0.28}`}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={`M${w * 0.2} ${h * 0.65} Q${w * 0.45} ${h * 0.8} ${w * 0.7} ${h * 0.55}`}
            stroke="rgba(178, 235, 242, 0.8)"
            strokeWidth={3}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Crevasse({ rect }: { rect: Rect }) {
  const w = rect.w;
  const h = rect.h;
  return (
    <View pointerEvents="none" style={box(rect)}>
      <Svg width={w} height={h}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="rgba(0, 96, 100, 0.35)" />
        <Path
          d={`M${w * 0.15} ${h * 0.35} L${w * 0.45} ${h * 0.2} L${w * 0.55} ${h * 0.75} L${w * 0.25} ${h * 0.85} Z`}
          fill="#00363a"
        />
        <Path
          d={`M${w * 0.5} ${h * 0.25} L${w * 0.85} ${h * 0.4} L${w * 0.7} ${h * 0.85} L${w * 0.48} ${h * 0.7} Z`}
          fill="#004d56"
        />
        {[0.28, 0.48, 0.68].map((at) => (
          <Polygon
            key={at}
            points={`${w * at},${h * 0.15} ${w * (at + 0.05)},${h * 0.45} ${w * (at - 0.04)},${h * 0.45}`}
            fill="#b2ebf2"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

const LOOT_BOX = 44;

export function FrostLoot({ drop }: { drop: LootActor }) {
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
            <SvgRect x={7} y={14} width={30} height={5} fill="#b2ebf2" opacity={0.7} />
            <Line x1={8} y1={24} x2={36} y2={24} stroke="#80DEEA" strokeWidth={2} />
            <Circle cx={22} cy={26} r={3.5} fill={drop.tint} stroke="#2b1c10" strokeWidth={1} />
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(236, 239, 241, 0.6)" />
          </>
        ) : (
          <>
            <Ellipse cx={22} cy={36} rx={12} ry={3} fill="rgba(20,24,28,0.25)" />
            <Path d="M12 34 Q10 20 16 16 L28 16 Q34 20 32 34 Z" fill="#5c6b73" stroke="#2a3438" strokeWidth={2} />
            <Path d="M16 16 L14 10 L22 13 L30 10 L28 16 Z" fill="#90a4ae" stroke="#2a3438" strokeWidth={1.4} />
            <Line x1={14} y1={22} x2={30} y2={22} stroke="#80DEEA" strokeWidth={2} />
            <Circle cx={22} cy={26} r={4} fill={drop.kind === 'gold' ? '#ffd24a' : drop.tint} />
          </>
        )}
      </Svg>
    </View>
  );
}

export type FrostGateVariant = 'crystal' | 'cave' | 'station' | 'shrine';

/** Return is the crystal arch, west (Đại Dương) the frozen cave, east (Thảo Nguyên) the snow station. */
export function frostGateVariant(sensorId: string): FrostGateVariant {
  if (sensorId === 'return') return 'crystal';
  if (sensorId === 'ascent') return 'shrine';
  if (sensorId === 'west') return 'cave';
  return 'station';
}

export function FrostGateArt({ variant, width, height }: { variant: FrostGateVariant; width: number; height: number }) {
  const pulse = useLoop(2600);
  const glow = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.95, 0.3] });
  const w = width;
  const h = height;
  if (variant === 'crystal') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.16} ${h * 0.95} C${w * 0.1} ${h * 0.5} ${w * 0.28} ${h * 0.12} ${w * 0.5} ${h * 0.1} C${w * 0.72} ${h * 0.12} ${w * 0.9} ${h * 0.5} ${w * 0.84} ${h * 0.95}`}
            stroke="#80DEEA"
            strokeWidth={w * 0.08}
            fill="none"
            strokeLinecap="round"
          />
          <Polygon points={`${w * 0.42},${h * 0.08} ${w * 0.5},${h * 0.02} ${w * 0.58},${h * 0.08}`} fill="#e0f7fa" />
          <Path
            d={`M${w * 0.3} ${h * 0.9} L${w * 0.3} ${h * 0.5} Q${w * 0.5} ${h * 0.32} ${w * 0.7} ${h * 0.5} L${w * 0.7} ${h * 0.9} Z`}
            fill="rgba(0, 96, 100, 0.55)"
          />
        </Svg>
      </View>
    );
  }
  if (variant === 'cave') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <Path
            d={`M${w * 0.08} ${h * 0.95} L${w * 0.18} ${h * 0.3} Q${w * 0.5} ${h * 0.06} ${w * 0.82} ${h * 0.3} L${w * 0.92} ${h * 0.95} Z`}
            fill="#78909c"
          />
          <Path d={`M${w * 0.24} ${h * 0.95} Q${w * 0.5} ${h * 0.28} ${w * 0.76} ${h * 0.95} Z`} fill="#006064" />
          <Ellipse cx={w * 0.5} cy={h * 0.7} rx={w * 0.12} ry={h * 0.06} fill="rgba(128, 222, 234, 0.35)" />
        </Svg>
      </View>
    );
  }
  if (variant === 'station') {
    return (
      <View pointerEvents="none" style={{ width: w, height: h }}>
        <Svg width={w} height={h}>
          <SvgRect x={w * 0.18} y={h * 0.45} width={w * 0.64} height={h * 0.22} fill="#90a4ae" stroke="#546e7a" strokeWidth={2} />
          <SvgRect x={w * 0.22} y={h * 0.28} width={w * 0.16} height={h * 0.5} fill="#607d8b" />
          <SvgRect x={w * 0.62} y={h * 0.28} width={w * 0.16} height={h * 0.5} fill="#607d8b" />
          <Path d={`M${w * 0.14} ${h * 0.3} Q${w * 0.5} ${h * 0.1} ${w * 0.86} ${h * 0.3}`} stroke="#cfd8dc" strokeWidth={10} fill="none" />
          <SvgRect x={w * 0.36} y={h * 0.5} width={w * 0.28} height={h * 0.12} fill="#80DEEA" opacity={0.5} />
          <Ellipse cx={w * 0.5} cy={h * 0.88} rx={w * 0.36} ry={h * 0.07} fill="#eceff1" />
        </Svg>
      </View>
    );
  }
  return (
    <View pointerEvents="none" style={{ width: w, height: h }}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, opacity: glow }}>
        <Svg width={w} height={h}>
          <Ellipse cx={w * 0.5} cy={h * 0.58} rx={w * 0.28} ry={h * 0.26} fill="rgba(128, 222, 234, 0.4)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} style={{ position: 'absolute' }}>
        <SvgRect x={w * 0.16} y={h * 0.32} width={w * 0.14} height={h * 0.56} fill="#b2ebf2" />
        <SvgRect x={w * 0.7} y={h * 0.32} width={w * 0.14} height={h * 0.56} fill="#b2ebf2" />
        <Path d={`M${w * 0.1} ${h * 0.34} Q${w * 0.5} ${h * 0.08} ${w * 0.9} ${h * 0.34}`} stroke="#e0f7fa" strokeWidth={12} fill="none" />
        <Path
          d={`M${w * 0.3} ${h * 0.88} L${w * 0.3} ${h * 0.5} Q${w * 0.5} ${h * 0.34} ${w * 0.7} ${h * 0.5} L${w * 0.7} ${h * 0.88} Z`}
          fill="rgba(0, 60, 70, 0.85)"
          stroke="#80DEEA"
          strokeWidth={3}
        />
        <Circle cx={w * 0.5} cy={h * 0.18} r={w * 0.045} fill="#e0f7fa" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  mist: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  mistBank: { position: 'absolute', borderRadius: 40, backgroundColor: 'rgba(236, 239, 241, 0.14)' },
});
