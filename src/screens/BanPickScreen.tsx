import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RankStars } from '../components/arena/RankStars';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { GlowButton } from '../components/GlowButton';
import { monsterInitials } from '../components/world/monsterArt';
import { monsterPortrait } from '../components/world/MonsterToken';
import { getCharacter } from '../data/characters';
import type { DraftPetView } from '../net/protocol';
import { useBattle } from '../state/BattleContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';
import { rankTint, rankTitle } from '../world/ranks';

/**
 * Ranked Ban & Pick. Phase 1 locks the character and 4 pets. Phase 2
 * bans one pet from the opponent's locked four, then the 3-round fight starts.
 */
export function BanPickScreen() {
  const battle = useBattle();
  const draft = battle.draft;
  const { s, font, wide } = useLayout();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const [picked, setPicked] = useState<string[]>([]);
  const [banId, setBanId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [timerArmed, setTimerArmed] = useState(false);
  const phase = draft?.phase ?? 'pick';

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPicked([]);
    setBanId(null);
    setLocked(false);
    setTimerArmed(false);
  }, [draft?.matchId]);

  useEffect(() => {
    setLocked(false);
    if (phase !== 'ban') setBanId(null);
  }, [phase]);

  const seconds = draft ? Math.max(0, Math.ceil((draft.deadline - now) / 1000)) : 0;
  const you = draft?.you;
  const foe = draft?.opponent;
  const youArt = getCharacter(you?.baseAvatarId);
  const foeArt = getCharacter(foe?.baseAvatarId);
  const youTint = rankTint(you?.rankIndex ?? 0);
  const foeTint = rankTint(foe?.rankIndex ?? 0);
  const picking = phase === 'pick';
  const canConfirm = Boolean(draft && !locked && !draft.confirmed && (picking || banId || (foe?.pets.length ?? 0) === 0));

  const submit = () => {
    if (!draft || locked || draft.confirmed) return;
    setLocked(true);
    battle.readyDraft(picked, banId);
  };

  useEffect(() => {
    if (seconds > 0) setTimerArmed(true);
  }, [seconds]);

  useEffect(() => {
    if (!draft || draft.confirmed || locked || !timerArmed) return;
    if (seconds > 0) return;
    setLocked(true);
    battle.readyDraft(picked, banId);
  }, [banId, battle, draft, locked, picked, seconds, timerArmed]);

  const togglePet = (id: string) => {
    if (!picking || locked || draft?.confirmed) return;
    setPicked((current) => {
      if (current.includes(id)) return current.filter((entry) => entry !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  };

  const status = useMemo(() => {
    if (!draft) return 'Đang ghép trận...';
    if (draft.confirmed && draft.opponentReady && !picking) return 'Cả hai đã cấm. Vào trận...';
    if (draft.confirmed) return picking ? 'Đã khóa đội hình. Đợi đối thủ...' : 'Đã cấm. Đợi đối thủ...';
    if (draft.opponentReady) return picking ? 'Đối thủ đã khóa 4 thú.' : 'Đối thủ đã cấm.';
    return picking
      ? `${(draft.bout ?? 1) > 1 ? `Chuẩn bị hiệp ${draft.bout} · ` : ''}Chọn 4 thú · ${picked.length}/4`
      : 'Cấm 1 thú trong đội hình 4 thú của đối thủ';
  }, [draft, picked.length, picking]);

  if (!draft || !you || !foe) return <View style={styles.fill} />;

  return (
    <LinearGradient
      testID="ban-pick-screen"
      colors={['#14241c', '#0c1612']}
      style={[
        styles.scene,
        {
          paddingTop: insets.top + s(8),
          paddingBottom: insets.bottom + s(8),
          paddingLeft: insets.left + s(12),
          paddingRight: insets.right + s(12),
        },
      ]}
    >
      <View style={styles.top}>
        <Text style={[styles.kicker, { fontSize: font(12) }]}>
          {`HIỆP ${draft.bout ?? 1}/3 · ${draft.boutScore?.you ?? 0}-${draft.boutScore?.opponent ?? 0} · ${picking ? 'CHỌN ĐỘI HÌNH' : 'CẤM THÚ'}`}
        </Text>
        <View style={[styles.timer, { borderColor: seconds <= 5 ? '#e7a3a3' : theme.gold }]}>
          <Text style={[styles.timerText, { fontSize: font(28), color: seconds <= 5 ? '#e7a3a3' : theme.gold }]}>{seconds}s</Text>
        </View>
        <Text style={[styles.status, { fontSize: font(13) }]}>{status}</Text>
      </View>

      <View style={[styles.board, { flexDirection: wide ? 'row' : 'column', gap: s(10) }]}>
        <View style={[styles.side, { borderColor: youTint }]}>
          <View style={styles.heroRow}>
            {youArt ? (
              <CharacterAvatar character={youArt} hairColor={you.hairColor} outfitColor={you.outfitColor} size={s(72)} />
            ) : null}
            <View style={styles.heroMeta}>
              <Text style={[styles.heroName, { fontSize: font(16) }]} numberOfLines={1}>
                {you.name}
              </Text>
              <Text style={[styles.heroRank, { fontSize: font(12), color: youTint }]}>{rankTitle(you.rankIndex)}</Text>
              <RankStars stars={you.stars} tint={youTint} size={font(14)} />
              <Text style={[styles.lockedNote, { fontSize: font(11) }]}>Nhân vật đã khóa</Text>
            </View>
          </View>
          <Text style={[styles.section, { fontSize: font(12) }]}>{picking ? 'Chọn 4 thú' : 'Đội hình đã khóa'}</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
            {you.pets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                selected={picking ? picked.includes(pet.id) : true}
                disabled={Boolean(!picking || locked || draft.confirmed || (!picked.includes(pet.id) && picked.length >= 4))}
                onPress={() => togglePet(pet.id)}
                font={font}
                s={s}
              />
            ))}
            {you.pets.length === 0 ? <Text style={[styles.empty, { fontSize: font(12) }]}>Chưa có thú. Hệ thống sẽ chọn hộ.</Text> : null}
          </ScrollView>
        </View>

        <View style={[styles.side, { borderColor: foeTint }]}>
          <View style={styles.heroRow}>
            {foeArt ? (
              <CharacterAvatar character={foeArt} hairColor={foe.hairColor} outfitColor={foe.outfitColor} size={s(72)} />
            ) : null}
            <View style={styles.heroMeta}>
              <Text style={[styles.heroName, { fontSize: font(16) }]} numberOfLines={1}>
                {foe.name}
              </Text>
              <Text style={[styles.heroRank, { fontSize: font(12), color: foeTint }]}>{rankTitle(foe.rankIndex)}</Text>
              <RankStars stars={foe.stars} tint={foeTint} size={font(14)} />
              <Text style={[styles.lockedNote, { fontSize: font(11) }]}>{draft.opponentReady ? 'Đã sẵn sàng' : 'Đang chọn...'}</Text>
            </View>
          </View>
          <Text style={[styles.section, { fontSize: font(12) }]}>{picking ? 'Đối thủ đang chọn 4 thú' : 'Cấm 1 thú trong 4 thú đã chọn'}</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
            {foe.pets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                selected={banId === pet.id}
                banned={banId === pet.id}
                disabled={Boolean(picking || locked || draft.confirmed)}
                onPress={() => {
                  if (picking || locked || draft.confirmed) return;
                  setBanId((current) => (current === pet.id ? null : pet.id));
                }}
                font={font}
                s={s}
              />
            ))}
            {foe.pets.length === 0 ? (
              <Text style={[styles.empty, { fontSize: font(12) }]}>
                {picking ? 'Đội hình đối thủ hiện sau khi họ khóa 4 thú.' : 'Đối thủ không mang thú.'}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <View style={styles.bottom}>
        <GlowButton
          testID="draft-confirm-button"
          label={draft.confirmed ? 'Đã khóa' : picking ? 'Khóa đội hình' : 'Cấm thú này'}
          enabled={canConfirm}
          onPress={submit}
        />
      </View>
    </LinearGradient>
  );
}

function PetCard({
  pet,
  selected,
  banned,
  disabled,
  onPress,
  font,
  s,
}: {
  pet: DraftPetView;
  selected: boolean;
  banned?: boolean;
  disabled: boolean;
  onPress: () => void;
  font: (n: number) => number;
  s: (n: number) => number;
}) {
  const art = pet.kindId ? monsterPortrait(pet.kindId) : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.pet,
        { minHeight: s(44), opacity: disabled && !selected ? 0.45 : 1, borderColor: banned ? '#e7a3a3' : selected ? theme.gold : theme.line },
      ]}
    >
      {art ? (
        <Image source={art.source} style={{ width: s(28), height: s(28) }} resizeMode="contain" />
      ) : (
        <View style={[styles.petFallback, { width: s(28), height: s(28), borderRadius: s(14) }]}>
          <Text style={{ fontSize: font(10), fontWeight: '800', color: '#10211c' }}>{monsterInitials(pet.name)}</Text>
        </View>
      )}
      <View style={styles.petMeta}>
        <Text style={[styles.petName, { fontSize: font(12) }]} numberOfLines={1}>
          {banned ? `CẤM · ${pet.name}` : pet.name}
        </Text>
        <Text style={[styles.petSub, { fontSize: font(11) }]}>
          Lv {pet.level} · {pet.hp}/{pet.maxHp}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
  scene: { flex: 1 },
  top: { alignItems: 'center', gap: 4, marginBottom: 6 },
  kicker: { color: theme.gold, fontWeight: '800', letterSpacing: 1.4 },
  timer: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 2, backgroundColor: 'rgba(10,18,16,0.7)' },
  timerText: { fontWeight: '800' },
  status: { color: theme.muted },
  board: { flex: 1, minHeight: 0 },
  side: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    backgroundColor: 'rgba(10, 18, 16, 0.78)',
    gap: 6,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroMeta: { flex: 1, minWidth: 0, gap: 2 },
  heroName: { color: theme.ink, fontWeight: '800' },
  heroRank: { fontWeight: '700' },
  lockedNote: { color: theme.dim },
  section: { color: theme.gold, fontWeight: '700' },
  list: { flex: 1, minHeight: 0 },
  listInner: { gap: 6, paddingBottom: 8 },
  empty: { color: theme.dim },
  pet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(18, 30, 26, 0.9)',
  },
  petFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.gold },
  petMeta: { flex: 1, minWidth: 0 },
  petName: { color: theme.ink, fontWeight: '700' },
  petSub: { color: theme.muted },
  bottom: { alignItems: 'center', marginTop: 8 },
});
