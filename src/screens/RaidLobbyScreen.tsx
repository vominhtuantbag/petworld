import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CharacterAvatar } from '../components/CharacterAvatar';
import { getCharacter } from '../data/characters';
import { useBattle } from '../state/BattleContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

/**
 * Five arrival slots and one shared 30s clock.
 * A fighter who is not ready when it hits zero is sent back to the map.
 */
export function RaidLobbyScreen() {
  const battle = useBattle();
  const lobby = battle.raidLobby;
  const { s, font } = useLayout();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  if (!lobby) return null;
  const seconds = Math.max(0, Math.ceil((lobby.deadline - now) / 1000));
  const you = lobby.slots[lobby.youIndex] ?? null;

  return (
    <View testID="raid-lobby" style={styles.screen}>
      <View style={[styles.card, { padding: s(16), gap: s(10), borderRadius: s(16) }]}>
        <Text style={[styles.title, { fontSize: font(22) }]}>Hầm ngục</Text>
        <Text style={[styles.copy, { fontSize: font(13) }]}>
          {seconds}s. Một trận boss trên sân đấu. Khi cả nhóm sẵn sàng, trận bắt đầu ngay. Cần 2–5 người. Ai chưa sẵn sàng khi hết giờ sẽ bị đưa về bản đồ.
        </Text>
        <View style={styles.slots}>
          {lobby.slots.map((slot, index) => {
            const character = slot ? getCharacter(slot.baseAvatarId) : null;
            const mine = index === lobby.youIndex;
            return (
              <View key={slot?.userId ?? `empty-${index}`} style={[styles.slot, mine && styles.slotMine, { minHeight: s(64) }]}>
                <Text style={[styles.index, { fontSize: font(12) }]}>{index + 1}</Text>
                {slot && character ? (
                  <CharacterAvatar character={character} hairColor={slot.hairColor} outfitColor={slot.outfitColor} size={s(36)} />
                ) : (
                  <View style={[styles.emptyFace, { width: s(36), height: s(36) }]} />
                )}
                <View style={styles.slotCopy}>
                  <Text style={[styles.name, { fontSize: font(13) }]} numberOfLines={1}>
                    {slot ? slot.name : 'Trống'}
                  </Text>
                  <Text style={[styles.meta, { fontSize: font(11) }]}>{slot ? (slot.ready ? 'Sẵn sàng' : 'Chờ') : '—'}</Text>
                </View>
              </View>
            );
          })}
        </View>
        {battle.notice ? <Text style={[styles.notice, { fontSize: font(12) }]}>{battle.notice}</Text> : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sẵn sàng"
            testID="raid-ready"
            disabled={!you || you.ready}
            onPress={battle.readyRaid}
            style={[styles.ready, (!you || you.ready) && styles.disabled]}
          >
            <Text style={[styles.readyLabel, { fontSize: font(14) }]}>{you?.ready ? 'Đã sẵn sàng' : 'Sẵn sàng'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Rời hầm" testID="raid-leave" onPress={battle.leaveRaid} style={styles.leave}>
            <Text style={[styles.leaveLabel, { fontSize: font(13) }]}>Rời hầm</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 560, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.gold },
  title: { color: theme.gold, fontWeight: '800', textAlign: 'center' },
  copy: { color: theme.muted, textAlign: 'center' },
  slots: { gap: 6 },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: theme.bgDeep,
  },
  slotMine: { borderWidth: 1, borderColor: theme.gold },
  index: { width: 16, color: theme.gold, fontWeight: '800', textAlign: 'center' },
  emptyFace: { borderRadius: 18, backgroundColor: 'rgba(246,241,231,0.08)' },
  slotCopy: { flex: 1 },
  name: { color: theme.ink, fontWeight: '700' },
  meta: { color: theme.dim },
  notice: { color: '#e7a3a3', textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  ready: { backgroundColor: '#e23a22', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  readyLabel: { color: theme.ink, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  leave: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: theme.line },
  leaveLabel: { color: theme.muted, fontWeight: '700' },
});
