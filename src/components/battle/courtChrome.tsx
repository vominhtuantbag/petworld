import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CharacterAvatar } from '../CharacterAvatar';
import { portraitScaleX } from '../world/facing';
import { monsterInitials } from '../world/monsterArt';
import { monsterPortrait } from '../world/MonsterToken';
import type { CharacterDefinition } from '../../data/characters';
import type { StatusEntry } from '../../world/combat/advanced';
import { locomotionTypeOf, type LocomotionType } from '../../world/combat/petSkills';
import type { StatMod } from '../../world/combat/model';
import { combatSfx } from '../../world/combat/combatSfx';
import { FAINT_OPACITY } from '../../world/combat/faint';
import { theme } from '../../theme/theme';
import { CourtFx, type Fate, type Step } from './CourtFx';
import { overheadDrop } from './courtSlots';
import { StatusIcons } from './StatusIcons';
import type { TimelineRole } from './TurnTimeline';

/** Idle court motion per biological locomotion. Halted when fainted (HP ≤ 0). */
const COURT_IDLE: Record<
  LocomotionType,
  { duration: number; x: [number, number]; y: [number, number]; scaleX: [number, number]; scaleY: [number, number]; rotate: [string, string] }
> = {
  BIPEDAL: { duration: 900, x: [0, 0], y: [0, -1.5], scaleX: [1, 1], scaleY: [1, 1.04], rotate: ['0deg', '0deg'] },
  QUADRUPEDAL: { duration: 1000, x: [0, 0], y: [0, 0], scaleX: [1, 1], scaleY: [1, 1.03], rotate: ['0deg', '0deg'] },
  MULTI_LEGGED: { duration: 420, x: [-2, 2], y: [0, 0], scaleX: [1, 1], scaleY: [1, 1], rotate: ['-3deg', '3deg'] },
  SLITHERING: { duration: 800, x: [-4, 4], y: [0, 0], scaleX: [1, 1], scaleY: [1, 1], rotate: ['-8deg', '8deg'] },
  LEAPING: { duration: 1100, x: [0, 0], y: [0, -3], scaleX: [1, 1.02], scaleY: [1, 0.96], rotate: ['0deg', '0deg'] },
  AERIAL: { duration: 1000, x: [0, 0], y: [-4, 4], scaleX: [1, 1], scaleY: [1, 1], rotate: ['-2deg', '2deg'] },
  SWIMMING: { duration: 950, x: [-2, 2], y: [-2, 2], scaleX: [1, 1], scaleY: [1, 1], rotate: ['-5deg', '5deg'] },
  PULSATING_FLOAT: { duration: 1200, x: [0, 0], y: [-5, 3], scaleX: [0.92, 1.08], scaleY: [0.92, 1.08], rotate: ['0deg', '0deg'] },
};

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
  const fainted = fighter.hp <= 0;
  /** Compact over-head tracks — ~60% of the caller’s barWidth. */
  const trackW = Math.max(16, Math.round(barWidth * 0.6));
  const boxW = Math.max(size + 28, trackW);
  const hasShield = !fainted && (fighter.shieldHp ?? 0) > 0;
  const barH = 3;
  const iconSize = Math.max(10, Math.round(size * 0.12));
  const barCount = fainted ? 1 : hasShield ? 3 : 2;
  const barsH = barCount * (barH + 1);
  const iconPad = Math.round(iconSize + 4);
  const chrome = iconPad + barsH + 2;
  const labelWidth = Math.max(trackW, Math.round(size * 0.55));
  const drop = overheadDrop(slot.y, size, chrome);
  /** Tiny air gap between the bar stack bottom and the sprite crown. */
  const headGap = Math.max(2, Math.round(size * 0.02));
  const loco: LocomotionType = fighter.kindId ? locomotionTypeOf(fighter.kindId) : 'QUADRUPEDAL';
  const idleProfile = COURT_IDLE[loco];
  const idle = useRef(new Animated.Value(0)).current;
  const phase = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < fighter.id.length; i += 1) hash = (hash * 31 + fighter.id.charCodeAt(i)) >>> 0;
    return hash % 900;
  }, [fighter.id]);
  const hitDir = face === 'right' ? -1 : 1;

  useEffect(() => {
    idle.setValue(0);
    if (fainted) return;
    const half = idleProfile.duration;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(phase),
        Animated.timing(idle, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(idle, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      idle.stopAnimation();
      idle.setValue(0);
    };
  }, [fainted, idle, idleProfile.duration, phase]);

  const breathY = idle.interpolate({ inputRange: [0, 1], outputRange: idleProfile.y });
  const breathX = idle.interpolate({ inputRange: [0, 1], outputRange: idleProfile.x });
  const breathScaleX = idle.interpolate({ inputRange: [0, 1], outputRange: idleProfile.scaleX });
  const breathScaleY = idle.interpolate({ inputRange: [0, 1], outputRange: idleProfile.scaleY });
  const breathTilt = idle.interpolate({ inputRange: [0, 1], outputRange: idleProfile.rotate });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        fainted
          ? `${fighter.name}, ngất`
          : `${fighter.name}, HP ${Math.round(fighter.hp)}/${Math.round(fighter.maxHp)}`
      }
      accessibilityState={{ disabled: !onPress }}
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
          zIndex: (front ? 56 : 8 + Math.min(40, Math.round(slot.y / 8))) + (active && !fainted ? 4 : 0),
          transform: [{ translateX: -(boxW / 2) }, { translateY: -size }],
          opacity: fainted ? FAINT_OPACITY : 1,
        },
      ]}
    >
      <CourtFx step={step ?? null} slashKey={slashKey ?? 0} shakeKey={shakeKey ?? 0} fate={fate ?? null} hitDir={hitDir}>
        <View
          pointerEvents="none"
          style={[
            styles.hud,
            {
              // Bottom-anchor so bars sit snug above the head; status icons grow upward.
              bottom: size + headGap - drop,
              width: labelWidth,
              marginLeft: (boxW - labelWidth) / 2,
            },
          ]}
        >
          <StatusIcons fighter={fighter} size={iconSize} max={size >= 90 ? 6 : 4} />
          <FloatBar value={fighter.hp} max={fighter.maxHp} tint="#e53935" width={trackW} height={barH} />
          {!fainted ? <FloatBar value={fighter.mp} max={fighter.maxMp} tint="#2f6fe0" width={trackW} height={barH} /> : null}
          {hasShield ? (
            <FloatBar value={fighter.shieldHp ?? 0} max={Math.max(fighter.shieldHp ?? 1, fighter.maxHp)} tint="#43a047" width={trackW} height={barH} />
          ) : null}
        </View>
        <Animated.View
          style={[
            styles.spriteWrap,
            {
              width: size,
              height: size,
              transform: [
                { translateX: breathX },
                { translateY: breathY },
                { rotate: breathTilt },
                { scaleX: breathScaleX },
                { scaleY: breathScaleY },
              ],
            },
            fainted && styles.faintedSprite,
          ]}
        >
          {active && !fainted ? <View style={[styles.greenRing, { width: size * 0.9, height: size * 0.32 }]} /> : null}
          {!fainted && fighter.statuses?.some((entry) => entry.id === 'defend' && entry.turns > 0) ? (
            <View
              pointerEvents="none"
              style={[styles.defendAura, { width: size * 1.08, height: size * 1.08, borderRadius: size }]}
            />
          ) : null}
          {character && hairColor && outfitColor ? (
            <View
              style={{
                transform: [{ scaleX: portraitScaleX(face === 'left' ? -1 : 1, character.professionId, character.gender) }],
              }}
            >
              <CharacterAvatar character={character} hairColor={hairColor} outfitColor={outfitColor} size={Math.round(size * 0.82)} />
            </View>
          ) : (
            <FaceArt kindId={fighter.kindId} tint={fighter.tint} name={fighter.name} size={size} facing={face} />
          )}
          {targeted && !fainted ? (
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
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [kindId, art?.source]);

  if (!art || broken) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint }]}>
        <Text style={styles.fallbackText}>{monsterInitials(name)}</Text>
      </View>
    );
  }
  const flip = facing === 'right' ? (art.facesRight ? 1 : -1) : art.facesRight ? -1 : 1;
  return (
    <Image
      accessibilityLabel={name}
      source={art.source}
      resizeMode="contain"
      style={{ width: size, height: size, transform: [{ scaleX: flip }] }}
      onError={() => setBroken(true)}
    />
  );
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

/** Combat feed under the turn bar — white ink with a hard black outline. */
export function BattleLogLine({
  text,
  fontSize,
  testID,
}: {
  text: string;
  fontSize: number;
  testID?: string;
}) {
  return (
    <Text style={[styles.battleLog, { fontSize }]} numberOfLines={2} testID={testID}>
      {text}
    </Text>
  );
}

/** Bottom-center action tooltip. Transparent so the arena stays visible. */
export function ActionTipBanner({
  text,
  fontSize,
  testID,
}: {
  text: string;
  fontSize: number;
  testID?: string;
}) {
  return (
    <View style={styles.actionTip} testID={testID} pointerEvents="none">
      <Text style={[styles.actionTipText, { fontSize }]} numberOfLines={4}>
        {text || 'Chọn một lệnh để xem mô tả.'}
      </Text>
    </View>
  );
}

/** Single click arms + shows tip; second click within window executes. */
export function armThenFire(
  store: { current: { key: string; at: number } },
  key: string,
  windowMs: number,
  fire: () => void,
): 'armed' | 'fired' {
  const now = Date.now();
  if (store.current.key === key && now - store.current.at < windowMs) {
    store.current = { key: '', at: 0 };
    fire();
    return 'fired';
  }
  store.current = { key, at: now };
  return 'armed';
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
  onHighlight,
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
  /** Fires on press-in so the dock tip can preview this command. */
  onHighlight?: () => void;
}) {
  const buttonWidth = width ?? size;
  const press = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });
  const shade = press.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] });
  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.45] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.5, 0] });

  const pressIn = () => {
    onHighlight?.();
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
  /** Inner padding inside the 16:9 battle world. */
  worldPad: { paddingHorizontal: 8, paddingVertical: 6 },
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
  headerLeft: { flexGrow: 0, flexShrink: 0, zIndex: 8 },
  headerCenter: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-start', gap: 4, zIndex: 2 },
  headerRight: { flexGrow: 0, flexShrink: 0, zIndex: 8, alignItems: 'flex-end' },
  headerControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'center' },
  timeFace: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#d7d2c8' },
  timeFaceActive: {
    borderColor: '#ffe082',
    backgroundColor: '#efe6c8',
  },
  stage: { flex: 1, minHeight: 0, overflow: 'hidden' },
  unit: { position: 'absolute', alignItems: 'center' },
  hud: { position: 'absolute', left: 0, alignItems: 'center', gap: 1 },
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
  /** @deprecated Prefer BattleLogLine under the turn bar. Kept for pause overlays. */
  log: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    color: '#ffffff',
    textAlign: 'center',
    zIndex: 50,
    fontWeight: '800',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  battleLog: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '800',
    maxWidth: '100%',
    paddingHorizontal: 6,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
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
  targets: { gap: 2, flexShrink: 1, maxWidth: '22%' },
  actionTip: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
    minHeight: 48,
  },
  actionTipText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '800',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: 6,
    maxWidth: '42%',
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
  fainted: { opacity: FAINT_OPACITY },
  faintedSprite: { opacity: 1 },
});
