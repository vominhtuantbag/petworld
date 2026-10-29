import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import { ADVENTURE_LEVEL_CAP, expForNextLevel } from '../../world/progression';

export type ExpMember = {
  id: string;
  name: string;
  level: number;
  exp: number;
  gain: number;
};

export type LootSlot = {
  id: string;
  label: string;
  detail: string;
  tint: string;
};

type Props = {
  victory: boolean;
  members: ExpMember[];
  slots: LootSlot[];
  notes?: string[];
  shareLabel?: string;
  onShare?: () => void;
  onConfirm: () => void;
  onRetry?: () => void;
};

type Progress = {
  level: number;
  exp: number;
  need: number;
  levelsGained: number;
};

/**
 * Victory claims loot and returns to the map. Defeat offers another try
 * or a return, and the party keeps none of the fight's rewards.
 */
export function EndGameModal({ victory, members, slots, notes, shareLabel, onShare, onConfirm, onRetry }: Props) {
  const { s, font, width } = useLayout();
  const banner = victory
    ? { kicker: 'VICTORY', title: 'CHIẾN THẮNG', colors: ['#f3d48a', '#a97832'] as const }
    : { kicker: 'DEFEAT', title: 'THẤT BẠI', colors: ['#f08a78', '#8a2e24'] as const };
  const cardWidth = Math.min(width - 24, s(460));

  return (
    <View style={styles.scrim} testID="end-game-modal">
      <View style={[styles.card, { width: cardWidth, borderRadius: s(18), borderColor: victory ? theme.gold : '#e23a22' }]}>
        <LinearGradient colors={banner.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, { paddingVertical: s(14), borderTopLeftRadius: s(17), borderTopRightRadius: s(17) }]}>
          <Text style={[styles.kicker, { fontSize: font(11) }]}>{banner.kicker}</Text>
          <Text style={[styles.bannerTitle, { fontSize: font(26) }]}>{banner.title}</Text>
        </LinearGradient>
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: s(14), gap: s(10) }}>
          <Text style={[styles.section, { fontSize: font(12) }]}>Kinh nghiệm</Text>
          {members.map((member) => (
            <ExpLine key={member.id} member={member} font={font} barHeight={s(10)} />
          ))}
          {victory ? (
            <>
              <Text style={[styles.section, { fontSize: font(12), marginTop: s(4) }]}>Phần thưởng</Text>
              <View style={styles.slots}>
                {slots.map((slot) => (
                  <View key={slot.id} style={[styles.slot, { minWidth: s(92), padding: s(8), borderRadius: s(12) }]}>
                    <View style={[styles.swatch, { backgroundColor: slot.tint, width: s(28), height: s(28), borderRadius: s(8) }]} />
                    <Text style={[styles.slotLabel, { fontSize: font(12) }]} numberOfLines={1}>
                      {slot.label}
                    </Text>
                    <Text style={[styles.slotDetail, { fontSize: font(12) }]}>{slot.detail}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={[styles.note, { fontSize: font(12) }]}>Thua trận không nhận kinh nghiệm, vàng hay vật phẩm.</Text>
          )}
          {notes && notes.length > 0
            ? notes.map((note) => (
                <Text key={note} style={[styles.note, { fontSize: font(12) }]}>
                  {note}
                </Text>
              ))
            : null}
        </ScrollView>
        <View style={[styles.actions, { padding: s(12), gap: s(8) }]}>
          {victory ? (
            <>
              {onShare ? (
                <Pressable accessibilityRole="button" testID="end-game-share" onPress={onShare} style={[styles.ghost, { minHeight: s(42), borderRadius: s(12) }]}>
                  <Text style={[styles.ghostLabel, { fontSize: font(14) }]}>{shareLabel ?? 'Chia sẻ Facebook'}</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" testID="end-game-confirm" onPress={onConfirm} style={[styles.primary, { minHeight: s(42), borderRadius: s(12) }]}>
                <Text style={[styles.primaryLabel, { fontSize: font(15) }]}>Tiếp tục</Text>
              </Pressable>
            </>
          ) : (
            <>
              {onRetry ? (
                <Pressable accessibilityRole="button" testID="end-game-retry" onPress={onRetry} style={[styles.ghost, { minHeight: s(42), borderRadius: s(12) }]}>
                  <Text style={[styles.ghostLabel, { fontSize: font(14) }]}>Thử lại</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" testID="end-game-return" onPress={onConfirm} style={[styles.primary, styles.actionGrow, { minHeight: s(42), borderRadius: s(12) }]}>
                <Text style={[styles.primaryLabel, { fontSize: font(15) }]}>Quay về</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

function ExpLine({ member, font, barHeight }: { member: ExpMember; font: (size: number) => number; barHeight: number }) {
  const before = Math.max(1, expForNextLevel(member.level));
  const progress = applyGain(member.level, member.exp, member.gain);
  const held = Math.min(1, Math.max(0, member.exp) / before);
  const added = progress.levelsGained > 0 ? Math.max(0, 1 - held) : Math.min(1 - held, Math.max(0, member.gain) / before);
  const name = member.name.trim() || 'Bạn';
  return (
    <View style={styles.member}>
      <View style={styles.memberTop}>
        <Text style={[styles.memberName, { fontSize: font(14) }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.gain, { fontSize: font(13) }]}>+{member.gain} EXP</Text>
      </View>
      <Text style={[styles.level, { fontSize: font(11) }]}>
        Cấp {member.level}
        {progress.levelsGained > 0 ? ` → Cấp ${progress.level}` : ` · ${Math.min(before, member.exp + member.gain)}/${before}`}
      </Text>
      <View style={[styles.track, { height: barHeight, borderRadius: barHeight }]}>
        <View style={[styles.held, { width: `${held * 100}%` }]} />
        <View style={[styles.fill, { width: `${added * 100}%` }]} />
      </View>
      {progress.levelsGained > 0 ? (
        <Text style={[styles.levelUp, { fontSize: font(11) }]}>
          Lên cấp{progress.levelsGained > 1 ? ` +${progress.levelsGained}` : ''} · {progress.exp}/{progress.need}
        </Text>
      ) : null}
    </View>
  );
}

function applyGain(level: number, exp: number, gain: number): Progress {
  let nextLevel = Math.max(1, level);
  let pool = Math.max(0, exp) + Math.max(0, gain);
  let levelsGained = 0;
  while (nextLevel < ADVENTURE_LEVEL_CAP) {
    const need = expForNextLevel(nextLevel);
    if (pool < need) return { level: nextLevel, exp: pool, need, levelsGained };
    pool -= need;
    nextLevel += 1;
    levelsGained += 1;
  }
  const need = expForNextLevel(nextLevel);
  return { level: nextLevel, exp: Math.min(pool, need), need, levelsGained };
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 80,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  card: {
    alignSelf: 'center',
    maxHeight: '88%',
    backgroundColor: '#121816',
    borderWidth: 1,
    overflow: 'hidden',
  },
  scroll: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  banner: { alignItems: 'center', justifyContent: 'center' },
  kicker: { color: '#1b140c', fontWeight: '800', letterSpacing: 3 },
  bannerTitle: { color: '#1b140c', fontWeight: '900', letterSpacing: 1 },
  section: { color: theme.gold, fontWeight: '800', letterSpacing: 0.4 },
  member: { gap: 3 },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { flex: 1, color: theme.ink, fontWeight: '800' },
  gain: { color: '#f3d48a', fontWeight: '800' },
  level: { color: theme.muted, fontWeight: '700' },
  track: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  held: { height: '100%', backgroundColor: 'rgba(228,194,122,0.4)' },
  fill: { height: '100%', backgroundColor: '#e4c27a' },
  levelUp: { color: '#9dffb8', fontWeight: '800' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { flexGrow: 1, alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(228,194,122,0.28)' },
  swatch: {},
  slotLabel: { color: theme.ink, fontWeight: '800' },
  slotDetail: { color: theme.gold, fontWeight: '800' },
  note: { color: theme.muted, textAlign: 'center' },
  actions: { flexDirection: 'row' },
  actionGrow: { flex: 1 },
  primary: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e25b2a' },
  primaryLabel: { color: '#1b140c', fontWeight: '900' },
  ghost: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.gold },
  ghostLabel: { color: theme.ink, fontWeight: '800' },
});
