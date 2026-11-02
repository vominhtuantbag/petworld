import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RankStars } from '../components/arena/RankStars';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { GlowButton } from '../components/GlowButton';
import { getCharacter } from '../data/characters';
import type { ArenaFriendView } from '../net/protocol';
import { useAuth } from '../state/AuthContext';
import { useBattle } from '../state/BattleContext';
import { useSetup } from '../state/SetupContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';
import { rankTint, rankTitle, STARS_PER_TIER } from '../world/ranks';

/**
 * Town Arena. Rank and stars on the left, friends on the right, ready in
 * the center bottom. Online friends sort A–Z; offline cards stay gray.
 */
export function LobbyScreen({ onLeave }: { onLeave?: () => void }) {
  const { s, font, wide, height, compact } = useLayout();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const setup = useSetup();
  const battle = useBattle();
  const player = setup.player;
  const character = getCharacter(player?.baseCharacterId);
  const [pickedFriend, setPickedFriend] = useState<string | null>(null);

  useEffect(() => {
    battle.refreshArena();
  }, [battle.refreshArena]);

  if (!player || !character) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Chưa có nhân vật.</Text>
      </View>
    );
  }

  const stats = auth.character?.stats;
  const rankIndex = stats?.rankIndex ?? battle.queue.rankIndex ?? 0;
  const stars = stats?.stars ?? battle.queue.stars ?? 0;
  const mmr = stats?.mmr ?? battle.queue.mmr ?? 1000;
  const tint = rankTint(rankIndex);
  const online = battle.connection === 'online';
  const queued = battle.queue.state === 'queued';
  const waitSec = Math.max(0, battle.queueWaitSec, battle.queue.waitSec ?? 0);
  const selected = battle.friends.find((friend) => friend.userId === pickedFriend && friend.online) ?? null;

  return (
    <LinearGradient
      testID="lobby-screen"
      colors={['#1a2c22', '#0e1814']}
      style={[
        styles.scene,
        {
          paddingTop: insets.top + s(10),
          paddingBottom: insets.bottom + s(10),
          paddingLeft: insets.left + s(14),
          paddingRight: insets.right + s(14),
        },
      ]}
    >
      <Text style={[styles.kicker, { fontSize: font(12) }]}>ĐẤU TRƯỜNG THỊ TRẤN</Text>
      <View style={[styles.stage, { flexDirection: wide ? 'row' : 'column', gap: compact ? s(8) : s(14) }]}>
        <View style={[styles.left, { borderColor: tint, maxWidth: wide ? s(280) : undefined }]}>
          <CharacterAvatar
            character={character}
            hairColor={player.hairColor}
            outfitColor={player.outfitColor}
            size={Math.round(Math.max(88, Math.min(s(150), height * 0.34)))}
          />
          <Text style={[styles.name, { fontSize: font(compact ? 20 : 24) }]} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.rank, { fontSize: font(16), color: tint }]}>{rankTitle(rankIndex)}</Text>
          <RankStars stars={stars} size={font(18)} tint={tint} />
          <Text style={[styles.meta, { fontSize: font(12) }]}>
            {stars}/{STARS_PER_TIER} sao · MMR {mmr}
          </Text>
          <Text style={[styles.meta, { fontSize: font(12) }]}>
            Cấp {stats?.level ?? 1} · {stats?.wins ?? 0} thắng · {stats?.losses ?? 0} thua
          </Text>
          {(stats?.matchHistory ?? []).slice(0, 4).map((row, index) => (
            <Text key={`${row.at}-${index}`} style={[styles.history, { fontSize: font(11) }]} numberOfLines={1}>
              {row.outcome === 'win' ? 'Thắng' : row.outcome === 'loss' ? 'Thua' : 'Hòa'} {row.opponent}
              {row.starDelta > 0 ? ' · +1 sao' : row.starDelta < 0 ? ' · −1 sao' : ''}
            </Text>
          ))}
        </View>

        <View style={styles.right}>
          <Text style={[styles.listTitle, { fontSize: font(13) }]}>Bạn bè</Text>
          <ScrollView style={styles.list} contentContainerStyle={[styles.listInner, { gap: s(6) }]}>
            {battle.friends.map((friend) => (
              <FriendCard
                key={friend.userId}
                friend={friend}
                selected={pickedFriend === friend.userId}
                font={font}
                s={s}
                onPress={() => {
                  if (!friend.online) return;
                  setPickedFriend(friend.userId);
                  battle.sendChallenge(friend.userId);
                }}
              />
            ))}
            {battle.friends.length === 0 ? <Text style={[styles.empty, { fontSize: font(12) }]}>Chưa có bạn trong sổ. Người chơi khác sẽ hiện khi họ online.</Text> : null}
          </ScrollView>
        </View>
      </View>

      <View style={styles.bottom}>
        {battle.notice ? <Text style={[styles.notice, { fontSize: font(12) }]}>{battle.notice}</Text> : null}
        {queued ? (
          <Text style={[styles.search, { fontSize: font(13) }]} testID="queue-timer">
            Đang tìm đối thủ... ({waitSec} s)
          </Text>
        ) : selected ? (
          <Text style={[styles.search, { fontSize: font(12) }]}>Đã gửi thách đấu tới {selected.name}</Text>
        ) : null}
        <GlowButton
          testID="find-match-button"
          label={queued ? 'Đang tìm đối thủ...' : 'Sẵn sàng'}
          enabled={online && !queued}
          onPress={battle.findMatch}
        />
        <View style={styles.links}>
          {queued ? (
            <Text accessibilityRole="button" onPress={battle.cancelMatch} style={[styles.linkButton, { fontSize: font(13) }]}>
              Hủy tìm trận
            </Text>
          ) : null}
          {onLeave ? (
            <Text
              accessibilityRole="button"
              onPress={onLeave}
              style={[styles.linkButton, { fontSize: font(13) }]}
            >
              Về thị trấn
            </Text>
          ) : null}
          <Text accessibilityRole="button" onPress={setup.editSetup} style={[styles.linkButton, { fontSize: font(13) }]}>
            Đổi nhân vật
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function FriendCard({
  friend,
  selected,
  onPress,
  font,
  s,
}: {
  friend: ArenaFriendView;
  selected: boolean;
  onPress: () => void;
  font: (n: number) => number;
  s: (n: number) => number;
}) {
  const art = getCharacter(friend.baseAvatarId);
  const tint = rankTint(friend.rankIndex);
  return (
    <Pressable
      disabled={!friend.online}
      onPress={onPress}
      style={[
        styles.friend,
        {
          minHeight: s(56),
          opacity: friend.online ? 1 : 0.38,
          borderColor: selected ? theme.gold : theme.line,
        },
      ]}
    >
      {art ? <CharacterAvatar character={art} hairColor={friend.hairColor} outfitColor={friend.outfitColor} size={s(44)} /> : <View style={styles.friendGap} />}
      <View style={styles.friendMeta}>
        <Text style={[styles.friendName, { fontSize: font(13) }]} numberOfLines={1}>
          {friend.name}
        </Text>
        <Text style={[styles.friendRank, { fontSize: font(11), color: friend.online ? tint : theme.dim }]}>
          {rankTitle(friend.rankIndex)} · {friend.stars}★
        </Text>
      </View>
      <Text style={[styles.presence, { fontSize: font(10), color: friend.online ? '#8fbf7a' : theme.dim }]}>{friend.online ? 'Online' : 'Offline'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1 },
  kicker: { color: theme.gold, fontWeight: '800', letterSpacing: 1.6, marginBottom: 6 },
  stage: { flex: 1, minHeight: 0 },
  left: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(10, 18, 16, 0.78)',
  },
  name: { color: theme.ink, fontWeight: '800' },
  rank: { fontWeight: '800' },
  meta: { color: theme.muted, textAlign: 'center' },
  history: { color: theme.dim, textAlign: 'center' },
  right: {
    flex: 1.15,
    minHeight: 0,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 18,
    padding: 10,
    backgroundColor: 'rgba(10, 18, 16, 0.72)',
  },
  listTitle: { color: theme.gold, fontWeight: '700', marginBottom: 6 },
  list: { flex: 1, minHeight: 0 },
  listInner: { paddingBottom: 8 },
  empty: { color: theme.dim },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(18, 30, 26, 0.9)',
  },
  friendGap: { width: 44, height: 44 },
  friendMeta: { flex: 1, minWidth: 0 },
  friendName: { color: theme.ink, fontWeight: '700' },
  friendRank: { fontWeight: '600' },
  presence: { fontWeight: '700' },
  bottom: { alignItems: 'center', gap: 6, marginTop: 8 },
  notice: { color: '#e7a3a3' },
  search: { color: theme.gold, fontWeight: '700' },
  links: { flexDirection: 'row', gap: 16, marginTop: 2 },
  linkButton: { color: theme.ink, fontWeight: '600' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  missingText: { color: theme.ink },
});
