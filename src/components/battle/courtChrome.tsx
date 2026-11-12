import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CharacterAvatar } from '../CharacterAvatar';
import { portraitScaleX } from '../world/facing';
import { monsterPortrait } from '../world/MonsterToken';
import type { CharacterDefinition } from '../../data/characters';
import type { StatusEntry } from '../../world/combat/advanced';
import { locomotionOf } from '../../world/combat/petSkills';
import type { StatMod } from '../../world/combat/model';
import { combatSfx } from '../../world/combat/combatSfx';
import { theme } from '../../theme/theme';
import { CourtFx, type Fate, type Step } from './CourtFx';
import { overheadDrop } from './courtSlots';
import { StatusIcons } from './StatusIcons';
import type { TimelineRole } from './TurnTimeline';

/** Fields the court HUD reads. A full combat fighter satisfies this. */
export type CourtActor = {
  id: string;
  name: string;
  side: 'player' | 'ally' | 'wild';
  kindId?: string;
  tint: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  level?: number;
  element?: string | null;
  statuses?: StatusEntry[];
  mods?: StatMod[];
  shieldHp?: number;
  endureUsed?: boolean;
  mpCostMult?: number;
  reflectCharges?: number;
  reflectPct?: number;
  meleeThornsTurns?: number;
};

export function timelineFaceSize(screenW: number, insetL: number, insetR: number, count: number, preferred: number, reserved: number): number {
  const seats = Math.max(count, 1);
  if (screenW <= 0) return preferred;
  const room = screenW - insetL - insetR - reserved;
  const fitted = Math.floor((room - 6 * (seats - 1)) / seats);
  return Math.max(20, Math.min(preferred, fitted));
}

export function CourtUnit({
  fighter,
  slot,
  active,
  targeted,
  face,
  size,
  statFont,
  barWidth,
  front,
  step,
  slashKey,
  shakeKey,
  fate,
  testID,
  character,
  hairColor,
  outfitColor,
  onPress,
}: {
  fighter: CourtActor;
  slot: { x: number; y: number };
  active?: boolean;
  targeted?: boolean;
  face: 'left' | 'right';
  size: number;
  statFont: number;
  barWidth: number;
  /** Paint this unit above neighbors so a high cell keeps its HUD. */
  front?: boolean;
  step?: Step | null;
  slashKey?: number;
  shakeKey?: number;
  fate?: Fate | null;
  testID?: string;
  character?: CharacterDefinition | null;
  hairColor?: string;
  outfitColor?: string;
  onPress?: () => void;
}) {
  void statFont;
  const boxW = Math.max(size + 28, barWidth);
  const hasShield = (fighter.shieldHp ?? 0) > 0;
  const barH = 4;
  const iconSize = Math.max(12, Math.round(size * 0.14));
  const iconPad = Math.round(iconSize + 10);
  const chrome = iconPad + (hasShield ? 3 : 2) * (barH + 2) + 2;
  const labelWidth = Math.max(barWidth, Math.round(size * 0.9));
  const drop = overheadDrop(slot.y, size, chrome);
  const flying = Boolean(fighter.kindId && locomotionOf(fighter.kindId) === 'flying');
  const idle = useRef(new Animated.Value(0)).current;
  const phase = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < fighter.id.length; i += 1) hash = (hash * 31 + fighter.id.charCodeAt(i)) >>> 0;
    return hash % 900;
  }, [fighter.id]);
  const hitDir = face === 'right' ? -1 : 1;

  useEffect(() => {
    idle.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(phase),
        Animated.timing(idle, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(idle, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [idle, phase]);

  const breathY = idle.interpolate({ inputRange: [0, 1], outputRange: flying ? [-4, 4] : [0, 0] });
  const breathScaleY = idle.interpolate({ inputRange: [0, 1], outputRange: flying ? [1, 1] : [1, 1.03] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${fighter.name}, HP ${Math.round(fighter.hp)}/${Math.round(fighter.maxHp)}`}
      testID={testID}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.unit,
        {
          left: slot.x,
          top: slot.y,
          width: boxW,
          height: size,
          zIndex: (front ? 56 : 8 + Math.min(40, Math.round(slot.y / 8))) + (active ? 4 : 0),
          transform: [{ translateX: -(boxW / 2) }, { translateY: -size }],
        },
      ]}
    >
      <CourtFx step={step ?? null} slashKey={slashKey ?? 0} shakeKey={shakeKey ?? 0} fate={fate ?? null} hitDir={hitDir}>
        <View pointerEvents="none" style={[styles.hud, { top: -chrome + drop, width: labelWidth, marginLeft: (boxW - labelWidth) / 2 }]}>
          <StatusIcons fighter={fighter} size={iconSize} max={size >= 90 ? 6 : 4} />
          <FloatBar value={fighter.hp} max={fighter.maxHp} tint="#e53935" width={barWidth} height={barH} />
          <FloatBar value={fighter.mp} max={fighter.maxMp} tint="#2f6fe0" width={barWidth} height={barH} />
          {hasShield ? (
            <FloatBar value={fighter.shieldHp ?? 0} max={Math.max(fighter.shieldHp ?? 1, fighter.maxHp)} tint="#43a047" width={barWidth} height={barH} />
          ) : null}
        </View>
        <Animated.View
          style={[
            styles.spriteWrap,
            {
              width: size,
              height: size,
              transform: [{ translateY: breathY }, { scaleY: breathScaleY }],
            },
          ]}
        >
          {active ? <View style={[styles.greenRing, { width: size * 0.9, height: size * 0.32 }]} /> : null}
          {fighter.statuses?.some((entry) => entry.id === 'defend' && entry.turns > 0) ? (
            <View
              pointerEvents="none"
              style={[styles.defendAura, { width: size * 1.08, height: size * 1.08, borderRadius: size }]}
            />
          ) : null}
          {character && hairColor && outfitColor ? (
            <View style={{ transform: [{ scaleX: portraitScaleX(face === 'left' ? -1 : 1, character.professionId, character.gender) }] }}>
              <CharacterAvatar character={character} hairColor={hairColor} outfitColor={outfitColor} size={Math.round(size * 0.82)} />
            </View>
          ) : (
            <FaceArt kindId={fighter.kindId} tint={fighter.tint} name={fighter.name} size={size} facing={face} />
          )}
          {targeted ? (
            <View pointerEvents="none" style={[styles.redRing, { width: size * 1.05, height: size * 0.72, borderRadius: size }]} />
          ) : null}
        </Animated.View>
      </CourtFx>
    </Pressable>
  );
}

function FloatBar({ value, max, tint, width, height = 4 }: { value: number; max: number; tint: string; width: number; height?: number }) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={[styles.floatTrack, { width, height, borderRadius: Math.max(1, height / 2) }]}>
      <View style={[styles.floatFill, { width: `${ratio * 100}%`, backgroundColor: tint }]} />
    </View>
  );
}

export function FaceArt({
  kindId,
  tint,
  name,
  size,
  facing,
}: {
  kindId?: string;
  tint: string;
  name: string;
  size: number;
  facing: 'left' | 'right';
}) {
  const art = kindId ? monsterPortrait(kindId) : null;
  if (!art) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint }]}>
        <Text style={styles.fallbackText}>{name.slice(0, 1)}</Text>
      </View>
    );
  }
  const flip = facing === 'right' ? (art.facesRight ? 1 : -1) : art.facesRight ? -1 : 1;
  return <Image accessibilityLabel={name} source={art.source} resizeMode="contain" style={{ width: size, height: size, transform: [{ scaleX: flip }] }} />;
}

export function TimelineFace({
  fighter,
  active,
  role,
  size,
  character,
  hairColor,
  outfitColor,
}: {
  fighter: CourtActor;
  active: boolean;
  role: TimelineRole;
  size: number;
  character?: CharacterDefinition | null;
  hairColor?: string;
  outfitColor?: string;
}) {
  const face = active ? Math.round(size * 1.18) : size;
  const rim = fighter.side === 'wild' ? '#ff5252' : '#69f0ae';
  return (
    <View
      style={[
        styles.timeFace,
        {
          width: face,
          height: face,
          borderRadius: face / 2,
          borderWidth: 3,
          borderColor: active ? '#ffe082' : rim,
          opacity: role === 'later' ? 0.78 : 1,
          shadowColor: active ? '#ffd54f' : 'transparent',
          shadowOpacity: active ? 0.95 : 0,
          shadowRadius: active ? 10 : 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: active ? 10 : 0,
        },
        active && styles.timeFaceActive,
        fighter.hp <= 0 && styles.fainted,
      ]}
    >
      {character && hairColor && outfitColor ? (
        <CharacterAvatar character={character} hairColor={hairColor} outfitColor={outfitColor} size={face - 4} />
      ) : (
        <FaceArt kindId={fighter.kindId} tint={fighter.tint} name={fighter.name} size={face - 4} facing={fighter.side === 'wild' ? 'left' : 'right'} />
      )}
    </View>
  );
}

export function RoundButton({
  label,
  onPress,
  disabled,
  dim,
  hot,
  picked,
  hint,
  testID,
  size,
  font,
  tint,
  square,
  width,
  juicy = true,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Faded, but the press still runs so an empty stack can explain itself. */
  dim?: boolean;
  hot?: boolean;
  /** Thick solid border, the same weight as the active timeline face. */
  picked?: boolean;
  hint?: string;
  testID?: string;
  size: number;
  font: number;
  tint?: string;
  square?: boolean;
  width?: number;
  /** Press scale + click + release glow. Off for inert labels. */
  juicy?: boolean;
}) {
  const buttonWidth = width ?? size;
  const press = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });
  const shade = press.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] });
  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.45] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.5, 0] });

  const pressIn = () => {
    if (!juicy || disabled) return;
    combatSfx('click');
    Animated.timing(press, { toValue: 1, duration: 70, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    if (!juicy) return;
    Animated.spring(press, { toValue: 0, friction: 5, tension: 220, useNativeDriver: true }).start();
    ripple.setValue(0);
    Animated.timing(ripple, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hint ?? label}
        testID={testID}
        disabled={disabled}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[
          square ? styles.square : styles.round,
          { width: buttonWidth, height: size, borderRadius: square ? 8 : size / 2, backgroundColor: tint ?? '#24352f', overflow: 'visible' },
          hot && !picked && styles.roundHot,
          picked && styles.picked,
          (disabled || dim) && styles.fainted,
        ]}
      >
        <Text style={[styles.roundLabel, { fontSize: font }]} numberOfLines={2}>
          {label}
        </Text>
        {juicy ? <Animated.View pointerEvents="none" style={[styles.pressShade, { opacity: shade }]} /> : null}
        {juicy ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pressRipple,
              {
                width: Math.min(buttonWidth, size),
                height: size,
                borderRadius: square ? 8 : size / 2,
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1612', overflow: 'hidden' },
  arena: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  frame: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 44,
    zIndex: 4,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  headerLeft: { flexShrink: 0, maxWidth: '28%', zIndex: 8 },
  headerCenter: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-start', gap: 4, zIndex: 2 },
  headerRight: { flexShrink: 0, maxWidth: '28%', zIndex: 8, alignItems: 'flex-end' },
  headerControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'center' },
  timeFace: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#d7d2c8' },
  timeFaceActive: {
    borderColor: '#ffe082',
    backgroundColor: '#efe6c8',
  },
  stage: { flex: 1, minHeight: 0, overflow: 'hidden' },
  unit: { position: 'absolute', alignItems: 'center' },
  hud: { position: 'absolute', left: 0, alignItems: 'center', gap: 2 },
  spriteWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  pressShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
  },
  pressRipple: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 224, 130, 0.95)',
    backgroundColor: 'rgba(255, 224, 130, 0.16)',
  },
  greenRing: {
    position: 'absolute',
    bottom: 2,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#7dffb2',
    backgroundColor: 'rgba(80, 220, 120, 0.35)',
  },
  defendAura: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(77, 171, 247, 0.95)',
    backgroundColor: 'rgba(47, 111, 224, 0.22)',
    shadowColor: '#4dabf7',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  redRing: {
    position: 'absolute',
    bottom: 4,
    borderWidth: 3,
    borderColor: '#ff2d2d',
  },
  floatTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(20, 24, 22, 0.55)',
    overflow: 'hidden',
  },
  floatFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: '#10211c', fontWeight: '800' },
  pauseBanner: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    color: theme.gold,
    fontWeight: '800',
    backgroundColor: 'rgba(8, 14, 12, 0.72)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 50,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    zIndex: 70,
    alignItems: 'center',
  },
  toastLabel: {
    color: '#1b140c',
    fontWeight: '800',
    backgroundColor: '#e4c27a',
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  log: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    color: '#f6f1e7',
    textAlign: 'center',
    zIndex: 50,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 64,
    paddingHorizontal: 8,
    paddingBottom: 6,
    overflow: 'visible',
    zIndex: 20,
  },
  targets: { gap: 2, flexShrink: 1 },
  dockLabel: {
    color: '#f6f1e7',
    fontWeight: '700',
    maxWidth: 240,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  targetRow: { flexDirection: 'row', gap: 6 },
  rosterRow: { flexWrap: 'wrap', maxWidth: 220 },
  target: { overflow: 'hidden', borderWidth: 2, borderColor: '#9aa89f', backgroundColor: '#d7d2c8' },
  targetOn: { borderColor: '#ff2d2d' },
  commands: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: '62%',
    overflow: 'visible',
    zIndex: 30,
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: '#24352f',
  },
  slotIndex: {
    position: 'absolute',
    top: 1,
    left: 3,
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    zIndex: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  round: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  roundHot: { borderColor: '#7dffb2' },
  picked: { borderWidth: 5, borderColor: '#2f6fe0', borderStyle: 'solid' },
  roundLabel: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  fainted: { opacity: 0.35 },
});
