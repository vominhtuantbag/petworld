import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

import {
  collectDisplayStatuses,
  type DisplayStatus,
  type StatusCarrier,
  type StatusVisual,
} from '../../world/combat/statuses';

type Props = {
  fighter: StatusCarrier;
  size?: number;
  max?: number;
};

/** Floating status plates above a court avatar (debuffs left-biased, buffs right). */
export function StatusIcons({ fighter, size = 16, max = 6 }: Props) {
  const icons = collectDisplayStatuses(fighter, max);
  if (!icons.length) return null;
  return (
    <View pointerEvents="none" style={styles.row} accessibilityLabel={icons.map((entry) => entry.def.nameVi).join(', ')}>
      {icons.map((entry) => (
        <StatusPlate key={entry.key} entry={entry} size={size} />
      ))}
    </View>
  );
}

function StatusPlate({ entry, size }: { entry: DisplayStatus; size: number }) {
  const { visual } = entry.def;
  const turns = entry.turns >= 90 ? '∞' : String(entry.turns);
  const scale = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(1)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const expiring = entry.turns === 1;

  useEffect(() => {
    scale.setValue(0);
    flash.setValue(1);
    const pop = Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.3, friction: 4, tension: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 160, useNativeDriver: true }),
      ]),
      Animated.timing(flash, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    pop.start();
    return () => pop.stop();
  }, [flash, scale]);

  useEffect(() => {
    if (!expiring) {
      blink.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.35, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blink, expiring]);

  return (
    <Animated.View
      style={[
        styles.plate,
        {
          width: size + 4,
          height: size + 8,
          backgroundColor: visual.tint,
          borderColor: expiring ? '#ffe082' : visual.accent,
          opacity: blink,
          transform: [{ scale }],
        },
      ]}
    >
      <StatusIconArt art={visual.art} accent={visual.accent} size={size} />
      <Text style={[styles.turns, { color: visual.accent, fontSize: Math.max(7, Math.round(size * 0.55)) }]}>{turns}</Text>
      <Animated.View pointerEvents="none" style={[styles.sparkle, { opacity: flash }]} />
    </Animated.View>
  );
}

export function StatusIconArt({
  art,
  accent,
  size,
}: {
  art: StatusVisual['art'];
  accent: string;
  size: number;
}) {
  const s = size;
  const stroke = Math.max(1.2, s * 0.1);
  switch (art) {
    case 'eye_x':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M1 8 C4 4, 12 4, 15 8 C12 12, 4 12, 1 8 Z" stroke={accent} strokeWidth={stroke} fill="none" />
          <Circle cx="8" cy="8" r="2" fill={accent} />
          <Line x1="3" y1="3" x2="13" y2="13" stroke={accent} strokeWidth={stroke} />
        </Svg>
      );
    case 'chains':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M4 5 H8 V7 H4 Z M8 9 H12 V11 H8 Z" stroke={accent} strokeWidth={stroke} fill="none" />
          <Line x1="7" y1="6" x2="9" y2="10" stroke={accent} strokeWidth={stroke} />
        </Svg>
      );
    case 'poison_drop':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M8 2 C8 2, 13 8, 13 11 A5 5 0 0 1 3 11 C3 8, 8 2, 8 2 Z" fill={accent} opacity={0.9} />
        </Svg>
      );
    case 'bleed_wound':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M3 5 L13 5 L11 13 L5 13 Z" fill={accent} opacity={0.85} />
          <Line x1="8" y1="2" x2="8" y2="6" stroke={accent} strokeWidth={stroke} />
        </Svg>
      );
    case 'faint_ghost':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path
            d="M8 2 C11 2, 13 4.5, 13 7.5 C13 10, 12 12, 12 14 L10 12.5 L8 14 L6 12.5 L4 14 C4 12, 3 10, 3 7.5 C3 4.5, 5 2, 8 2 Z"
            fill={accent}
            opacity={0.55}
          />
          <Circle cx="6.2" cy="7" r="0.9" fill="#111" />
          <Circle cx="9.8" cy="7" r="0.9" fill="#111" />
        </Svg>
      );
    case 'arrow_down':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Line x1="8" y1="2" x2="8" y2="11" stroke={accent} strokeWidth={stroke} />
          <Polygon points="4,10 8,14 12,10" fill={accent} />
        </Svg>
      );
    case 'shield_crack':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M8 1 L14 4 V8 C14 12, 8 15, 8 15 C8 15, 2 12, 2 8 V4 Z" stroke={accent} strokeWidth={stroke} fill="none" />
          <Path d="M8 4 L6 8 L9 9 L7 13" stroke={accent} strokeWidth={stroke} fill="none" />
        </Svg>
      );
    case 'energy_lock':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Polygon points="9,1 5,8 8,8 7,15 12,7 9,7" fill={accent} />
          <Line x1="2" y1="2" x2="14" y2="14" stroke="#fff" strokeWidth={stroke} />
        </Svg>
      );
    case 'stun_stars':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Polygon points="4,3 5,5 7,5 5.5,6.5 6,9 4,7.5 2,9 2.5,6.5 1,5 3,5" fill={accent} />
          <Polygon points="12,2 12.7,3.5 14.3,3.5 13,4.6 13.4,6.2 12,5.3 10.6,6.2 11,4.6 9.7,3.5 11.3,3.5" fill={accent} />
          <Circle cx="9" cy="11" r="1.2" fill={accent} />
        </Svg>
      );
    case 'ice_block':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Polygon points="8,1 14,5 14,11 8,15 2,11 2,5" stroke={accent} strokeWidth={stroke} fill="rgba(154,215,255,0.25)" />
          <Line x1="8" y1="1" x2="8" y2="15" stroke={accent} strokeWidth={1} />
        </Svg>
      );
    case 'dry_flask':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M6 2 H10 V5 L13 12 A4 4 0 0 1 3 12 L6 5 Z" stroke={accent} strokeWidth={stroke} fill="none" />
          <Path d="M5 11 L7 10 L9 12 L11 10" stroke={accent} strokeWidth={1} fill="none" />
        </Svg>
      );
    case 'silence_mouth':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M3 7 Q8 12, 13 7" stroke={accent} strokeWidth={stroke} fill="none" />
          <Line x1="4" y1="9" x2="12" y2="9" stroke={accent} strokeWidth={stroke} />
        </Svg>
      );
    case 'fire':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M8 1 C10 5, 14 6, 12 10 A4.5 4.5 0 1 1 4 10 C3 7, 6 5, 8 1 Z" fill={accent} />
        </Svg>
      );
    case 'sword_down':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Line x1="8" y1="2" x2="8" y2="11" stroke={accent} strokeWidth={stroke} />
          <Line x1="5" y1="5" x2="11" y2="5" stroke={accent} strokeWidth={stroke} />
          <Polygon points="6,11 8,14 10,11" fill={accent} />
        </Svg>
      );
    case 'padlock':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Rect x="4" y="7" width="8" height="7" rx="1" fill={accent} />
          <Path d="M6 7 V5 A2 2 0 0 1 10 5 V7" stroke={accent} strokeWidth={stroke} fill="none" />
        </Svg>
      );
    case 'prison':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Rect x="2" y="3" width="12" height="11" stroke={accent} strokeWidth={stroke} fill="none" />
          <Line x1="5" y1="3" x2="5" y2="14" stroke={accent} strokeWidth={1.2} />
          <Line x1="8" y1="3" x2="8" y2="14" stroke={accent} strokeWidth={1.2} />
          <Line x1="11" y1="3" x2="11" y2="14" stroke={accent} strokeWidth={1.2} />
        </Svg>
      );
    case 'heart_regen':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M8 14 C8 14, 2 10, 2 6 A3 3 0 0 1 8 5 A3 3 0 0 1 14 6 C14 10, 8 14, 8 14 Z" fill={accent} />
        </Svg>
      );
    case 'shield_glow':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M8 1 L14 4 V8 C14 12, 8 15, 8 15 C8 15, 2 12, 2 8 V4 Z" fill={accent} opacity={0.85} />
        </Svg>
      );
    case 'shield_bar':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Rect x="2" y="6" width="12" height="4" rx="1" fill={accent} />
          <Rect x="2" y="6" width="8" height="4" rx="1" fill="#fff" opacity={0.35} />
        </Svg>
      );
    case 'aura_resist':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Circle cx="8" cy="8" r="6" stroke={accent} strokeWidth={stroke} fill="none" />
          <Circle cx="8" cy="8" r="3" fill={accent} opacity={0.5} />
        </Svg>
      );
    case 'crosshair':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Circle cx="8" cy="8" r="5" stroke={accent} strokeWidth={stroke} fill="none" />
          <Line x1="8" y1="1" x2="8" y2="4" stroke={accent} strokeWidth={stroke} />
          <Line x1="8" y1="12" x2="8" y2="15" stroke={accent} strokeWidth={stroke} />
          <Line x1="1" y1="8" x2="4" y2="8" stroke={accent} strokeWidth={stroke} />
          <Line x1="12" y1="8" x2="15" y2="8" stroke={accent} strokeWidth={stroke} />
        </Svg>
      );
    case 'cleanse_burst':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Line x1="8" y1="1" x2="8" y2="15" stroke={accent} strokeWidth={stroke} />
          <Line x1="1" y1="8" x2="15" y2="8" stroke={accent} strokeWidth={stroke} />
          <Line x1="3" y1="3" x2="13" y2="13" stroke={accent} strokeWidth={1.2} />
          <Line x1="13" y1="3" x2="3" y2="13" stroke={accent} strokeWidth={1.2} />
        </Svg>
      );
    case 'speed_wing':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M2 8 L10 3 L9 8 L10 13 Z" fill={accent} />
          <Path d="M10 5 L15 8 L10 11" stroke={accent} strokeWidth={stroke} fill="none" />
        </Svg>
      );
    case 'phoenix':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M8 14 C5 11, 3 8, 5 5 C6 6, 7 6, 8 4 C9 6, 10 6, 11 5 C13 8, 11 11, 8 14 Z" fill={accent} />
        </Svg>
      );
    case 'shadow_evade':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Circle cx="7" cy="8" r="5" stroke={accent} strokeWidth={stroke} fill="none" opacity={0.9} />
          <Circle cx="10" cy="8" r="5" stroke={accent} strokeWidth={1} fill="none" opacity={0.45} />
        </Svg>
      );
    case 'swap_arrows':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M3 5 H12 L10 3" stroke={accent} strokeWidth={stroke} fill="none" />
          <Path d="M13 11 H4 L6 13" stroke={accent} strokeWidth={stroke} fill="none" />
        </Svg>
      );
    case 'sword_up':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Line x1="8" y1="14" x2="8" y2="5" stroke={accent} strokeWidth={stroke} />
          <Line x1="5" y1="11" x2="11" y2="11" stroke={accent} strokeWidth={stroke} />
          <Polygon points="6,5 8,2 10,5" fill={accent} />
        </Svg>
      );
    case 'reflect_ring':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Circle cx="8" cy="8" r="5" stroke={accent} strokeWidth={stroke} fill="none" />
          <Polygon points="8,2 9,5 8,4 7,5" fill={accent} />
          <Polygon points="14,8 11,9 12,8 11,7" fill={accent} />
          <Polygon points="8,14 7,11 8,12 9,11" fill={accent} />
          <Polygon points="2,8 5,7 4,8 5,9" fill={accent} />
        </Svg>
      );
    case 'null_dome':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Path d="M2 10 A6 6 0 0 1 14 10" stroke={accent} strokeWidth={stroke} fill="rgba(153,233,242,0.2)" />
          <Line x1="2" y1="10" x2="14" y2="10" stroke={accent} strokeWidth={1} />
        </Svg>
      );
    case 'immortal_halo':
      return (
        <Svg width={s} height={s} viewBox="0 0 16 16">
          <Circle cx="8" cy="8" r="5" stroke={accent} strokeWidth={stroke} fill="none" />
          <Circle cx="8" cy="8" r="2" fill={accent} />
          <Line x1="8" y1="1" x2="8" y2="3" stroke={accent} strokeWidth={stroke} />
        </Svg>
      );
    default:
      return <View style={{ width: s, height: s }} />;
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
    maxWidth: 96,
    marginBottom: 2,
  },
  plate: {
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
    overflow: 'hidden',
  },
  turns: {
    fontWeight: '800',
    lineHeight: 9,
    marginTop: -1,
  },
  sparkle: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
});
