import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CharacterAvatar } from '../components/CharacterAvatar';
import { GlowButton } from '../components/GlowButton';
import { RegionMotif } from '../components/RegionMotif';
import { HAIR_COLORS, OUTFIT_COLORS } from '../data/colors';
import { getCharacter } from '../data/characters';
import { getRegion } from '../data/regions';
import { useSetup } from '../state/SetupContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

/**
 * Scene shell the setup flow hands off to.
 * Replace the backdrop and profile card with the world renderer later.
 * `player` is the same object written to the console from Start Game.
 */
export function GameplayScreen() {
  const { s, font, wide, height, compact } = useLayout();
  const insets = useSafeAreaInsets();
  const { player, editSetup } = useSetup();
  const character = getCharacter(player?.baseCharacterId);
  const region = getRegion(player?.selectedRegion);

  if (!player || !character || !region) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Chưa có trạng thái người chơi.</Text>
      </View>
    );
  }

  const hairLabel = labelForHex(player.hairColor, HAIR_COLORS);
  const outfitLabel = labelForHex(player.outfitColor, OUTFIT_COLORS);
  const genderLabel = player.gender === 'male' ? 'Nam' : 'Nữ';

  return (
    <LinearGradient
      testID="gameplay-screen"
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
            <RegionMotif motif={region.motif} accent={region.accent} size={compact ? s(72) : s(120)} />
          </View>
          <CharacterAvatar
            character={character}
            hairColor={player.hairColor}
            outfitColor={player.outfitColor}
            size={Math.round(Math.max(72, Math.min(s(150), height * 0.38)))}
          />
          <View style={[styles.ground, { backgroundColor: region.ground, height: s(16), borderRadius: s(16) }]} />
        </View>
        <View style={[styles.dossier, { borderRadius: s(18), padding: compact ? s(10) : s(16), gap: compact ? s(4) : s(8), maxWidth: wide ? s(380) : undefined }]}>
          <Text style={[styles.hello, { color: region.accent, fontSize: font(14) }]} numberOfLines={1}>Đã vào vùng chơi</Text>
          <Text style={[styles.playerName, { fontSize: font(compact ? 22 : 28) }]} testID="player-name" numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.regionName, { fontSize: font(16) }]} testID="player-region">
            {region.nameVi} · {region.name}
          </Text>
          <View style={styles.rows}>
            <StateRow testID="player-gender" label="Giới tính" value={`${genderLabel} (${player.gender})`} />
            <StateRow
              testID="player-character"
              label="Nhân vật gốc"
              value={`${character.title} · ${player.baseCharacterId}`}
            />
            <StateRow testID="player-hair" label="Màu tóc" value={`${hairLabel} · ${player.hairColor}`} />
            <StateRow testID="player-outfit" label="Màu trang phục" value={`${outfitLabel} · ${player.outfitColor}`} />
            <StateRow testID="player-region-id" label="Vùng" value={player.selectedRegion} />
          </View>
          <Text style={[styles.logNote, { fontSize: font(12) }]}>
            Cùng nội dung này đã được ghi ra console khi bấm Bắt đầu chơi.
          </Text>
          <GlowButton testID="edit-setup-button" label="Chỉnh thiết lập" enabled onPress={editSetup} />
        </View>
      </View>
    </LinearGradient>
  );
}

function StateRow({ label, value, testID }: { label: string; value: string; testID: string }) {
  const { font } = useLayout();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { fontSize: font(12) }]}>{label}</Text>
      <Text style={[styles.rowValue, { fontSize: font(13) }]} testID={testID} selectable numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function labelForHex(hex: string, list: readonly { hex: string; label: string }[]) {
  return list.find((item) => item.hex.toLowerCase() === hex.toLowerCase())?.label ?? hex;
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
  },
  stage: {
    flex: 1,
    minHeight: 0,
    alignItems: 'stretch',
  },
  world: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
  },
  kicker: {
    position: 'absolute',
    top: 0,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  motif: {
    position: 'absolute',
    top: '18%',
    opacity: 0.55,
  },
  ground: {
    alignSelf: 'stretch',
    marginTop: -8,
  },
  dossier: {
    alignSelf: 'stretch',
    flexShrink: 1,
    minHeight: 0,
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 18, 16, 0.78)',
    borderWidth: 1,
    borderColor: theme.line,
  },
  hello: {
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  playerName: {
    color: theme.ink,
    fontWeight: '800',
  },
  regionName: {
    color: theme.muted,
    fontWeight: '600',
  },
  rows: {
    gap: 6,
    marginTop: 6,
  },
  row: {
    gap: 1,
  },
  rowLabel: {
    color: theme.dim,
    fontWeight: '600',
  },
  rowValue: {
    color: theme.ink,
  },
  logNote: {
    color: theme.dim,
    marginTop: 4,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
  missingText: {
    color: theme.ink,
  },
});
