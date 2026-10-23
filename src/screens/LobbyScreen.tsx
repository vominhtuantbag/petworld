import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterAvatar } from '../components/CharacterAvatar';
import { GlowButton } from '../components/GlowButton';
import { RegionMotif } from '../components/RegionMotif';
import { getCharacter } from '../data/characters';
import { getRegion } from '../data/regions';
import { useAuth } from '../state/AuthContext';
import { useBattle } from '../state/BattleContext';
import { useSetup } from '../state/SetupContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

/**
 * The region scene after setup. Matchmaking starts here; the arena replaces
 * this screen as soon as the server emits a battle snapshot.
 */
export function LobbyScreen({ onLeave }: { onLeave?: () => void }) {
  const { s, font, wide, height, compact } = useLayout();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const setup = useSetup();
  const battle = useBattle();
  const player = setup.player;
  const character = getCharacter(player?.baseCharacterId);
  const region = getRegion(player?.selectedRegion);
  const stats = auth.character?.stats;

  if (!player || !character || !region) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Chưa có nhân vật.</Text>
      </View>
    );
  }

  const online = battle.connection === 'online';
  const queued = battle.queue.state === 'queued';
  const connectionLabel =
    battle.connection === 'online' ? 'Đã kết nối máy chủ' : battle.connection === 'connecting' ? 'Đang kết nối lại...' : 'Chưa kết nối';

  return (
    <LinearGradient
      testID="lobby-screen"
      colors={[region.sky[0], region.sky[1]]}
      style={[
        styles.scene,
        {
          paddingTop: insets.top + s(12),
          paddingBottom: insets.bottom + s(12),
          paddingLeft: insets.left + s(16),
          paddingRight: insets.right + s(16),
        },
      ]}
    >
      <View style={[styles.stage, { flexDirection: wide ? 'row' : 'column', gap: compact ? s(8) : s(16) }]}>
        <View style={styles.world}>
          <Text style={[styles.kicker, { color: region.ink, fontSize: font(12) }]}>GAME THƯ GIÃN</Text>
          <View style={styles.motif}>
            <RegionMotif motif={region.motif} accent={region.accent} size={compact ? s(72) : s(110)} />
          </View>
          <CharacterAvatar
            character={character}
            hairColor={player.hairColor}
            outfitColor={player.outfitColor}
            size={Math.round(Math.max(72, Math.min(s(140), height * 0.36)))}
          />
          <View style={[styles.ground, { backgroundColor: region.ground, height: s(16), borderRadius: s(16) }]} />
        </View>
        <View style={[styles.panel, { borderRadius: s(18), padding: compact ? s(10) : s(16), gap: compact ? s(4) : s(8), maxWidth: wide ? s(400) : undefined }]}>
          <Text style={[styles.hello, { fontSize: font(13) }]} numberOfLines={1}>{region.nameVi} · {region.name}</Text>
          <Text style={[styles.name, { fontSize: font(compact ? 22 : 28) }]} numberOfLines={1}>{player.name}</Text>
          <Text style={[styles.meta, { fontSize: font(13) }]}>
            {auth.user?.username} · cấp {stats?.level ?? 1} · {stats?.wins ?? 0} thắng · {stats?.losses ?? 0} thua
          </Text>
          <Text style={[styles.meta, { fontSize: font(13) }]}>
            Máu {stats?.hp ?? '—'} · Tấn công {stats?.attack ?? '—'} · Thủ {stats?.defense ?? '—'}
          </Text>
          <Text style={[styles.link, { fontSize: font(13) }]}>{connectionLabel}</Text>
          {battle.notice ? <Text style={[styles.notice, { fontSize: font(13) }]}>{battle.notice}</Text> : null}
          <GlowButton
            testID="find-match-button"
            label={queued ? 'Đang tìm đối thủ...' : 'Tìm đối thủ PvP'}
            enabled={online && !queued}
            onPress={battle.findMatch}
          />
          {queued ? (
            <Text accessibilityRole="button" onPress={battle.cancelMatch} style={[styles.cancel, { fontSize: font(13) }]}>
              Hủy tìm trận
            </Text>
          ) : null}
          <View style={styles.links}>
            {onLeave ? (
              <Text accessibilityRole="button" onPress={onLeave} style={[styles.linkButton, { fontSize: font(13) }]}>
                Về thị trấn
              </Text>
            ) : null}
            <Text accessibilityRole="button" onPress={setup.editSetup} style={[styles.linkButton, { fontSize: font(13) }]}>
              Đổi nhân vật
            </Text>
            <Text
              accessibilityRole="button"
              onPress={() => {
                void auth.logout();
              }}
              style={[styles.linkButton, { fontSize: font(13) }]}
            >
              Đăng xuất
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1 },
  stage: { flex: 1, minHeight: 0, alignItems: 'stretch' },
  world: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'flex-end', alignSelf: 'stretch' },
  kicker: { position: 'absolute', top: 0, letterSpacing: 1.6, fontWeight: '700' },
  motif: { position: 'absolute', top: '16%', opacity: 0.55 },
  ground: { alignSelf: 'stretch', marginTop: -6 },
  panel: {
    alignSelf: 'stretch',
    flexShrink: 1,
    minHeight: 0,
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 18, 16, 0.78)',
    borderWidth: 1,
    borderColor: theme.line,
  },
  hello: { color: theme.gold, fontWeight: '700' },
  name: { color: theme.ink, fontWeight: '800' },
  meta: { color: theme.muted },
  link: { color: theme.dim },
  notice: { color: '#e7a3a3' },
  cancel: { color: theme.gold, fontWeight: '700' },
  links: { flexDirection: 'row', gap: 16, marginTop: 4 },
  linkButton: { color: theme.ink, fontWeight: '600' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg },
  missingText: { color: theme.ink },
});
