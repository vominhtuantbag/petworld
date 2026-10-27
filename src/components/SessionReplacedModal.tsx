import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

export const SESSION_REPLACED_MESSAGE = 'Tài khoản đã được đăng nhập ở thiết bị khác.';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Blocks the game until the player acknowledges that another login took this account. */
export function SessionReplacedModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.cover}>
        <View style={styles.card} testID="session-replaced">
          <Text style={styles.message}>{SESSION_REPLACED_MESSAGE}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.button} testID="session-replaced-close">
            <Text style={styles.buttonLabel}>Đóng</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cover: {
    flex: 1,
    backgroundColor: 'rgba(8, 14, 12, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.gold,
    padding: 22,
    gap: 18,
  },
  message: {
    color: theme.ink,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  button: {
    alignSelf: 'center',
    minWidth: 120,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.goldDeep,
  },
  buttonLabel: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: '800',
  },
});
