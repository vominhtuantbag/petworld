import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path } from 'react-native-svg';

import { CharacterAvatar } from '../CharacterAvatar';
import { CHARACTERS, getCharacter, type CharacterDefinition } from '../../data/characters';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import type { Vitals } from '../../world/types';

type Props = {
  name: string;
  level: number;
  classTitle: string;
  exp: number;
  expNeeded: number;
  vitals: Vitals;
  gold: number;
  portrait: CharacterDefinition | null;
  customUri: string | null;
  hairColor: string;
  outfitColor: string;
  ownCharacterId: string | null;
  notice?: string | null;
  onChoosePreset: (characterId: string) => void;
  onChooseImage: (uri: string) => Promise<void>;
  onBusy?: (open: boolean) => void;
};

/**
 * Top-left profile card. The portrait is cosmetic. Class, level, and pools
 * stay on the character that was created. The card is 70% of the previous size
 * and only as wide as its contents, so the map beside it still receives taps.
 */
export function PlayerInfoHUD({
  name,
  level,
  classTitle,
  exp,
  expNeeded,
  vitals,
  gold,
  portrait,
  customUri,
  hairColor,
  outfitColor,
  ownCharacterId,
  notice,
  onChoosePreset,
  onChooseImage,
  onBusy,
}: Props) {
  const { s, font, width, compact } = useLayout();
  const z = (value: number) => Math.max(1, Math.round(s(value) * 0.7));
  const fz = (value: number) => Math.max(8, Math.round(font(value) * 0.7));
  const [open, setOpen] = useState(false);
  const burst = useLevelBurst(level, exp, expNeeded);
  const reserve = compact ? 96 : 140;
  const cardWidth = Math.max(z(168), Math.min(z(340), width - reserve));
  const avatar = compact ? z(46) : z(54);
  const shownName = name.trim() || 'Bạn';

  const setOpenSafe = (next: boolean) => {
    setOpen(next);
    onBusy?.(next);
  };

  return (
    <View pointerEvents="box-none" style={styles.anchor} testID="player-info-hud">
      <View style={[styles.card, { width: cardWidth, borderRadius: z(16), padding: z(8), gap: z(4) }]}>
        <View style={styles.sheen} />
        <View style={styles.body}>
          <View style={styles.avatarWrap}>
            <View style={[styles.ring, { borderRadius: avatar, padding: 1 }]}>
              <RoundPortrait
                character={customUri ? null : portrait}
                customUri={customUri}
                hairColor={hairColor}
                outfitColor={outfitColor}
                diameter={avatar}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đổi diện mạo"
              testID="player-avatar-edit"
              onPress={() => setOpenSafe(true)}
              hitSlop={8}
              style={[styles.camera, { width: z(22), height: z(22), borderRadius: z(11) }]}
            >
              <CameraMark size={z(12)} />
            </Pressable>
          </View>
          <View style={[styles.stats, { gap: z(3) }]}>
            <Meter value={vitals.hp} max={vitals.maxHp} fill="#e23b3b" track="#4a1818" height={z(13)} font={fz(8)} />
            <Meter value={vitals.mana} max={vitals.maxMana} fill="#b07cff" track="#2c1848" height={z(13)} font={fz(8)} />
            <Meter value={vitals.stamina} max={vitals.maxStamina} fill="#3dce6e" track="#14361f" height={z(13)} font={fz(8)} />
            <View>
              <Meter label="Exp" value={exp} max={expNeeded} fill={burst ? '#ffe08a' : '#f0d048'} track="#4a3a10" height={z(13)} font={fz(8)} />
              {burst ? (
                <Animated.Text
                  style={[
                    styles.levelUp,
                    {
                      fontSize: fz(10),
                      opacity: burst,
                      transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
                    },
                  ]}
                >
                  LEVEL UP!
                </Animated.Text>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { fontSize: fz(12) }]}>{shownName}</Text>
          <Text style={[styles.level, { fontSize: fz(10) }]}>Lv.{level} - {classTitle}</Text>
          <View style={styles.gold}>
            <Coin size={z(12)} />
            <Text style={[styles.goldValue, { fontSize: fz(11) }]}>{grouped(gold)}</Text>
          </View>
        </View>
      </View>
      {notice ? (
        <Text pointerEvents="none" style={[styles.notice, { fontSize: fz(11), maxWidth: cardWidth }]} numberOfLines={1}>
          {notice}
        </Text>
      ) : null}
      <AvatarCustomizationModal
        visible={open}
        selectedId={customUri ? null : portrait?.id ?? null}
        customUri={customUri}
        ownCharacterId={ownCharacterId}
        hairColor={hairColor}
        outfitColor={outfitColor}
        onChoose={(id) => {
          onChoosePreset(id);
          setOpenSafe(false);
        }}
        onUpload={async (uri) => {
          await onChooseImage(uri);
          setOpenSafe(false);
        }}
        onClose={() => setOpenSafe(false)}
      />
    </View>
  );
}

function useLevelBurst(level: number, exp: number, expNeeded: number) {
  const glow = useRef(new Animated.Value(0)).current;
  const seenLevel = useRef(level);
  const wasFull = useRef(expNeeded > 0 && exp >= expNeeded);
  const [token, setToken] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const filled = expNeeded > 0 && exp >= expNeeded;
    const leveled = level > seenLevel.current;
    const justFilled = filled && !wasFull.current;
    seenLevel.current = Math.max(seenLevel.current, level);
    wasFull.current = filled;
    if (leveled || justFilled) setToken((current) => current + 1);
  }, [level, exp, expNeeded]);

  useEffect(() => {
    if (token === 0) return;
    setActive(true);
    glow.setValue(0);
    const run = Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(880),
      Animated.timing(glow, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]);
    run.start(({ finished }) => {
      if (finished) setActive(false);
    });
    return () => run.stop();
  }, [token, glow]);

  return active ? glow : null;
}

function Meter({ label, value, max, fill, track, height, font }: { label?: string; value: number; max: number; fill: string; track: string; height: number; font: number }) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const figures = `${grouped(value)} / ${grouped(max)}`;
  return (
    <View style={[styles.track, { height, backgroundColor: track }]}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: fill }]} />
      <Text style={[styles.meterText, { fontSize: font, lineHeight: height }]} numberOfLines={1}>
        {label ? `${label} ${figures}` : figures}
      </Text>
    </View>
  );
}

function RoundPortrait({
  character,
  customUri,
  hairColor,
  outfitColor,
  diameter,
}: {
  character: CharacterDefinition | null;
  customUri?: string | null;
  hairColor: string;
  outfitColor: string;
  diameter: number;
}) {
  if (customUri) {
    return <Image source={{ uri: customUri }} accessibilityIgnoresInvertColors style={{ width: diameter, height: diameter, borderRadius: diameter / 2 }} />;
  }
  if (!character) {
    return <View style={{ width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: '#24312c' }} />;
  }
  const art = Math.round(diameter * 1.55);
  return (
    <View style={{ width: diameter, height: diameter, borderRadius: diameter / 2, overflow: 'hidden', backgroundColor: '#1a2420' }}>
      <View style={{ position: 'absolute', top: 0, left: (diameter - art) / 2 }}>
        <CharacterAvatar character={character} hairColor={hairColor} outfitColor={outfitColor} size={art} />
      </View>
    </View>
  );
}

function AvatarCustomizationModal({
  visible,
  selectedId,
  customUri,
  ownCharacterId,
  hairColor,
  outfitColor,
  onChoose,
  onUpload,
  onClose,
}: {
  visible: boolean;
  selectedId: string | null;
  customUri: string | null;
  ownCharacterId: string | null;
  hairColor: string;
  outfitColor: string;
  onChoose: (characterId: string) => void;
  onUpload: (uri: string) => Promise<void>;
  onClose: () => void;
}) {
  const { s, font, width, height } = useLayout();
  const own = getCharacter(ownCharacterId);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const males = CHARACTERS.filter((entry) => entry.gender === 'male');
  const females = CHARACTERS.filter((entry) => entry.gender === 'female');

  const upload = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Hãy cho phép mở thư viện ảnh.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setPicking(true);
    try {
      await onUpload(result.assets[0].uri);
    } catch {
      setError('Không lưu được ảnh này.');
      setPicking(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={[styles.sheet, { width: Math.min(width - 24, s(520)), maxHeight: height * 0.86, borderRadius: s(16), padding: s(12) }]} testID="avatar-custom-modal">
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { fontSize: font(16) }]}>Diện mạo</Text>
            <Pressable accessibilityRole="button" testID="avatar-custom-close" onPress={onClose} style={styles.close}>
              <Text style={[styles.closeLabel, { fontSize: font(13) }]}>Đóng</Text>
            </Pressable>
          </View>
          <Text style={[styles.hint, { fontSize: font(11) }]}>Ảnh đại diện không đổi lớp nhân vật.</Text>
          <Pressable accessibilityRole="button" testID="avatar-upload" disabled={picking} onPress={() => void upload()} style={styles.upload}>
            <Text style={[styles.uploadLabel, { fontSize: font(13) }]}>{picking ? 'Đang lưu...' : 'Tải ảnh từ máy'}</Text>
          </Pressable>
          {error ? <Text style={[styles.error, { fontSize: font(11) }]}>{error}</Text> : null}
          <ScrollView contentContainerStyle={{ gap: s(10), paddingBottom: s(4) }}>
            <PortraitRow title="Nam" entries={males} selectedId={selectedId} customUri={customUri} ownProfessionId={own?.professionId ?? null} hairColor={hairColor} outfitColor={outfitColor} onChoose={onChoose} />
            <PortraitRow title="Nữ" entries={females} selectedId={selectedId} customUri={customUri} ownProfessionId={own?.professionId ?? null} hairColor={hairColor} outfitColor={outfitColor} onChoose={onChoose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PortraitRow({
  title,
  entries,
  selectedId,
  customUri,
  ownProfessionId,
  hairColor,
  outfitColor,
  onChoose,
}: {
  title: string;
  entries: CharacterDefinition[];
  selectedId: string | null;
  customUri: string | null;
  ownProfessionId: string | null;
  hairColor: string;
  outfitColor: string;
  onChoose: (characterId: string) => void;
}) {
  const { font } = useLayout();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.section, { fontSize: font(11) }]}>
        {title} · {entries.length}
      </Text>
      <View style={styles.grid}>
        {entries.map((entry) => (
          <LookChoice
            key={entry.id}
            character={entry}
            hairColor={hairColor}
            outfitColor={outfitColor}
            selected={!customUri && entry.id === selectedId}
            badge={entry.professionId === ownProfessionId ? 'Lớp của bạn' : undefined}
            onPress={() => onChoose(entry.id)}
          />
        ))}
      </View>
    </View>
  );
}

function LookChoice({
  character,
  hairColor,
  outfitColor,
  selected,
  badge,
  onPress,
}: {
  character: CharacterDefinition;
  hairColor: string;
  outfitColor: string;
  selected: boolean;
  badge?: string;
  onPress: () => void;
}) {
  const { s, font } = useLayout();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={`avatar-option-${character.id}`}
      onPress={onPress}
      style={[styles.choice, { width: s(96), borderRadius: s(12) }, selected ? styles.choiceOn : null]}
    >
      <RoundPortrait character={character} hairColor={hairColor} outfitColor={outfitColor} diameter={s(44)} />
      <Text style={[styles.choiceTitle, { fontSize: font(11) }]} numberOfLines={1}>
        {character.title}
      </Text>
      {badge ? (
        <Text style={[styles.badge, { fontSize: font(8) }]} numberOfLines={1}>
          {badge}
        </Text>
      ) : null}
    </Pressable>
  );
}

function CameraMark({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M9 7.2 10.2 5h3.6L15 7.2h3.2A1.8 1.8 0 0 1 20 9v8.2A1.8 1.8 0 0 1 18.2 19H5.8A1.8 1.8 0 0 1 4 17.2V9a1.8 1.8 0 0 1 1.8-1.8H9z"
        fill="none"
        stroke="#1b140c"
        strokeWidth={1.8}
      />
      <Circle cx="12" cy="13" r="3.1" fill="none" stroke="#1b140c" strokeWidth={1.8} />
    </Svg>
  );
}

function Coin({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Circle cx="8" cy="8" r="6.5" fill="#e4c27a" stroke="#8a5a22" strokeWidth={1} />
      <Circle cx="8" cy="8" r="4.2" fill="none" stroke="#8a5a22" strokeWidth={0.8} />
    </Svg>
  );
}

function grouped(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('en-US');
}

const styles = StyleSheet.create({
  anchor: { alignSelf: 'flex-start', marginTop: 6, marginLeft: 6 },
  card: {
    backgroundColor: 'rgba(10, 14, 16, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(228, 194, 122, 0.78)',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: 'rgba(255, 236, 196, 0.55)',
  },
  body: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarWrap: { alignSelf: 'flex-start' },
  ring: { borderWidth: 1.5, borderColor: '#c9a15b' },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e4c27a',
    borderWidth: 1,
    borderColor: '#8a5a22',
  },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  name: { flex: 1, flexShrink: 1, color: theme.ink, fontWeight: '800' },
  level: { flexShrink: 0, color: '#ffe7b0', fontWeight: '800' },
  gold: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 3 },
  goldValue: { color: theme.gold, fontWeight: '800' },
  stats: { flex: 1, minWidth: 0, justifyContent: 'center' },
  track: { borderRadius: 99, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  meterText: {
    color: '#fff8ee',
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowRadius: 2,
  },
  levelUp: {
    position: 'absolute',
    right: 0,
    top: -1,
    color: '#ffe08a',
    fontWeight: '900',
    letterSpacing: 0.4,
    textShadowColor: '#b388ff',
    textShadowRadius: 6,
  },
  notice: {
    marginTop: 4,
    color: theme.ink,
    fontWeight: '700',
    backgroundColor: 'rgba(10, 14, 16, 0.72)',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  sheet: {
    backgroundColor: '#141a18',
    borderWidth: 1,
    borderColor: 'rgba(228, 194, 122, 0.78)',
    gap: 8,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: theme.ink, fontWeight: '900' },
  close: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.goldDeep },
  closeLabel: { color: theme.ink, fontWeight: '800' },
  hint: { color: theme.muted },
  upload: { alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: theme.gold },
  uploadLabel: { color: '#1b140c', fontWeight: '900' },
  error: { color: '#ff8d7a', fontWeight: '700' },
  section: { color: theme.gold, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(228, 194, 122, 0.28)',
  },
  choiceOn: { borderColor: theme.gold, backgroundColor: 'rgba(228, 194, 122, 0.16)' },
  choiceTitle: { color: theme.ink, fontWeight: '800' },
  badge: { color: '#9dffb8', fontWeight: '800' },
});
