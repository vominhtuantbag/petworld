import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBattle } from '../../state/BattleContext';
import { theme } from '../../theme/theme';

/** How close two avatars must stand before Khiêu chiến appears. The server allows a few extra pixels. */
export const PVP_RANGE = 140;

export type NearbyFighter = {
  userId: string;
  username: string;
  name: string;
  x: number;
  y: number;
};

export function nearestChallenger(self: { x: number; y: number }, remotes: NearbyFighter[]): NearbyFighter | null {
  let best: NearbyFighter | null = null;
  let bestDistance = PVP_RANGE;
  for (const remote of remotes) {
    if (!remote.userId) continue;
    const distance = Math.hypot(remote.x - self.x, remote.y - self.y);
    if (distance > bestDistance) continue;
    best = remote;
    bestDistance = distance;
  }
  return best;
}

/** Shown on the open world and in town while another player is within {@link PVP_RANGE}. */
export function PvpChallengeButton({ self, remotes }: { self: { x: number; y: number }; remotes: NearbyFighter[] }) {
  const battle = useBattle();
  const insets = useSafeAreaInsets();
  const target = nearestChallenger(self, remotes);
  if (!target || battle.prep || battle.pvpOutgoing || battle.pvpIncoming || battle.battle) return null;
  return (
    <View pointerEvents="box-none" style={[styles.slot, { top: insets.top + 8, right: insets.right + 8 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Khiêu chiến ${target.username || target.name}`}
        testID="pvp-challenge"
        hitSlop={12}
        onPress={() => battle.sendChallenge(target.userId)}
        style={styles.challenge}
      >
        <Text style={styles.challengeLabel}>Khiêu chiến</Text>
        <Text style={styles.challengeName} numberOfLines={1}>
          {target.username || target.name}
        </Text>
      </Pressable>
    </View>
  );
}

/** Accept or decline a challenge. Mounted once above every field screen. */
export function PvpChallengePrompt() {
  const battle = useBattle();
  const incoming = battle.pvpIncoming;
  const outgoing = battle.pvpOutgoing;
  if (!incoming && !outgoing && !battle.notice) return null;
  return (
    <View pointerEvents="box-none" style={styles.bannerWrap}>
      {incoming ? (
        <View testID="pvp-prompt" style={styles.banner}>
          <Text style={styles.bannerText}>{incoming.fromUsername} muốn khiêu chiến</Text>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              testID="pvp-accept"
              hitSlop={8}
              onPress={() => battle.acceptChallenge(incoming.challengeId)}
              style={[styles.choice, styles.accept]}
            >
              <Text style={styles.choiceLabel}>Nhận</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="pvp-decline"
              hitSlop={8}
              onPress={() => battle.declineChallenge(incoming.challengeId)}
              style={[styles.choice, styles.decline]}
            >
              <Text style={styles.choiceLabel}>Từ chối</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {outgoing && !incoming ? (
        <View testID="pvp-waiting" style={styles.banner}>
          <Text style={styles.bannerText}>Đang chờ {outgoing.toUsername} nhận khiêu chiến</Text>
          <Pressable
            accessibilityRole="button"
            testID="pvp-cancel"
            onPress={() => battle.declineChallenge(outgoing.challengeId)}
            style={[styles.choice, styles.decline]}
          >
            <Text style={styles.choiceLabel}>Hủy</Text>
          </Pressable>
        </View>
      ) : null}
      {battle.notice && !incoming ? <Text style={styles.notice}>{battle.notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', zIndex: 1000020, alignItems: 'flex-end' },
  challenge: {
    minWidth: 148,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: theme.goldDeep,
    borderWidth: 1,
    borderColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  challengeLabel: { color: theme.ink, fontWeight: '800', fontSize: 16 },
  challengeName: { color: theme.ink, fontSize: 12, fontWeight: '600' },
  bannerWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000020,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  banner: {
    minWidth: 240,
    maxWidth: 420,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 33, 28, 0.94)',
    borderWidth: 1,
    borderColor: theme.gold,
    gap: 8,
    alignItems: 'center',
  },
  bannerText: { color: theme.ink, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  choice: { minWidth: 112, minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, cursor: 'pointer' },
  accept: { backgroundColor: '#2f6b45' },
  decline: { backgroundColor: '#6b3a32' },
  choiceLabel: { color: theme.ink, fontWeight: '800' },
  notice: { color: theme.gold, fontWeight: '700', backgroundColor: 'rgba(16, 33, 28, 0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
});
