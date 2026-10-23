import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCharacter, getProfession } from '../../data/characters';
import { useAuth } from '../../state/AuthContext';
import { useSetup } from '../../state/SetupContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';

type Props = { onClose: () => void };

/** Character card and the two session actions already used on the town. */
export function SettingsModal({ onClose }: Props) {
  const setup = useSetup();
  const auth = useAuth();
  const { s, font } = useLayout();
  const character = getCharacter(setup.player?.baseCharacterId);
  const profession = getProfession(character?.professionId);

  return (
    <View style={styles.scrim}>
      <View style={[styles.sheet, { padding: s(14), gap: s(10), maxWidth: 420 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: font(16) }]}>Cài Đặt</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close} testID="settings-close">
            <Text style={[styles.closeLabel, { fontSize: font(13) }]}>Đóng</Text>
          </Pressable>
        </View>
        <Text style={[styles.name, { fontSize: font(15) }]}>{setup.player?.name ?? 'Nhân vật'}</Text>
        <Text style={[styles.copy, { fontSize: font(13) }]}>
          {profession?.title ?? 'Chưa chọn nghề'}
          {character?.gender === 'female' ? ' · Nữ' : character?.gender === 'male' ? ' · Nam' : ''}
        </Text>
        <Pressable accessibilityRole="button" onPress={setup.editSetup} style={styles.action} testID="settings-edit">
          <Text style={[styles.actionLabel, { fontSize: font(14) }]}>Đổi nhân vật</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void auth.logout();
          }}
          style={styles.action}
          testID="settings-logout"
        >
          <Text style={[styles.actionLabel, { fontSize: font(14) }]}>Đăng xuất</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000002,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: { alignSelf: 'stretch', backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.gold },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: theme.ink, fontWeight: '800' },
  close: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.goldDeep },
  closeLabel: { color: theme.ink, fontWeight: '800' },
  name: { color: theme.ink, fontWeight: '800' },
  copy: { color: theme.muted },
  action: { alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.line },
  actionLabel: { color: theme.ink, fontWeight: '800' },
});
