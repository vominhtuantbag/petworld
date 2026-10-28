import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CharacterAvatar } from '../CharacterAvatar';
import { portraitScaleX } from '../world/facing';
import { monsterPortrait } from '../world/MonsterToken';
import type { CharacterDefinition } from '../../data/characters';
import { theme } from '../../theme/theme';
import { CourtFx, type Fate, type Step } from './CourtFx';
import { overheadDrop } from './courtSlots';
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
  const attack = Math.round(fighter.attack);
  const defense = Math.round(fighter.defense);
  const boxW = Math.max(size + 28, barWidth);
  const chrome = 44;
  const labelWidth = Math.max(barWidth, Math.round(statFont * 13));
  const drop = overheadDrop(slot.y, size, chrome);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${fighter.name}, ATK ${attack} / DEF ${defense}`}
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
      <CourtFx step={step ?? null} slashKey={slashKey ?? 0} shakeKey={shakeKey ?? 0} fate={fate ?? null}>
        <View pointerEvents="none" style={[styles.hud, { top: -chrome + drop, width: labelWidth, marginLeft: (boxW - labelWidth) / 2 }]}>
          <Text style={[styles.statLine, { fontSize: statFont, width: labelWidth }]} numberOfLines={1}>
            ATK {attack} / DEF {defense}
          </Text>
          <FloatBar value={fighter.hp} max={fighter.maxHp} tint="#3cba45" width={barWidth} />
          <FloatBar value={fighter.mp} max={fighter.maxMp} tint="#2f6fe0" width={barWidth} />
        </View>
        <View style={[styles.spriteWrap, { width: size, height: size }]}>
          {active ? <View style={[styles.greenRing, { width: size * 0.9, height: size * 0.32 }]} /> : null}
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
        </View>
      </CourtFx>
    </Pressable>
  );
}

function FloatBar({ value, max, tint, width }: { value: number; max: number; tint: string; width: number }) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const shown = Math.max(0, Math.round(value));
  return (
    <View style={[styles.floatTrack, { width }]}>
      <View style={[styles.floatFill, { width: `${ratio * 100}%`, backgroundColor: tint }]} />
      <Text style={styles.floatText}>
        {shown}/{max}
      </Text>
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
  return (
    <View
      style={[
        styles.timeFace,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: active ? 5 : 4,
          borderColor: fighter.side === 'wild' ? 'red' : 'green',
          opacity: role === 'later' ? 0.78 : 1,
        },
        fighter.hp <= 0 && styles.fainted,
      ]}
    >
      {character && hairColor && outfitColor ? (
        <CharacterAvatar character={character} hairColor={hairColor} outfitColor={outfitColor} size={size} />
      ) : (
        <FaceArt kindId={fighter.kindId} tint={fighter.tint} name={fighter.name} size={size - 2} facing={fighter.side === 'wild' ? 'left' : 'right'} />
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
}) {
  const buttonWidth = width ?? size;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ?? label}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={[
        square ? styles.square : styles.round,
        { width: buttonWidth, height: size, borderRadius: square ? 8 : size / 2, backgroundColor: tint ?? '#24352f' },
        hot && !picked && styles.roundHot,
        picked && styles.picked,
        (disabled || dim) && styles.fainted,
      ]}
    >
      <Text style={[styles.roundLabel, { fontSize: font }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1612', overflow: 'hidden' },
  arena: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  frame: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, zIndex: 4, paddingHorizontal: 8, paddingTop: 4 },
  headerLeft: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  timeFace: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#d7d2c8' },
  stage: { flex: 1, minHeight: 0, overflow: 'hidden' },
  unit: { position: 'absolute', alignItems: 'center' },
  hud: { position: 'absolute', left: 0, alignItems: 'center' },
  spriteWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  greenRing: {
    position: 'absolute',
    bottom: 2,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#7dffb2',
    backgroundColor: 'rgba(80, 220, 120, 0.35)',
  },
  redRing: {
    position: 'absolute',
    bottom: 4,
    borderWidth: 3,
    borderColor: '#ff2d2d',
  },
  statLine: {
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  floatTrack: {
    height: 14,
    borderRadius: 3,
    backgroundColor: 'rgba(20, 24, 22, 0.45)',
    overflow: 'hidden',
    marginBottom: 1,
  },
  floatFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  floatText: { color: '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center', lineHeight: 14 },
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
  dock: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, minHeight: 58, paddingHorizontal: 8, paddingBottom: 6 },
  targets: { gap: 2 },
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
  commands: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
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
