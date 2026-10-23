import { Pressable, StyleSheet, Text } from 'react-native';

import { usePointerHover } from '../hooks/usePointerHover';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

type Props = {
  label: string;
  enabled: boolean;
  onPress: () => void;
  testID: string;
};

/**
 * Primary action. Disabled stays dim and ignores presses.
 * Enabled picks up a gold glow; web hover lifts it slightly.
 */
export function GlowButton({ label, enabled, onPress, testID }: Props) {
  const { s, font } = useLayout();
  const { hovered, hoverHandlers } = usePointerHover();

  return (
    <Pressable
      testID={testID}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      onPress={onPress}
      {...hoverHandlers}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: s(44),
          paddingHorizontal: s(22),
          borderRadius: s(14),
          opacity: enabled ? 1 : 0.38,
        },
        enabled && styles.glow,
        enabled && hovered && styles.hover,
        enabled && pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { fontSize: font(16) }]} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.goldDeep,
    borderWidth: 1,
    borderColor: theme.gold,
  },
  glow: {
    shadowColor: theme.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 12,
    elevation: 8,
  },
  hover: {
    transform: [{ scale: 1.03 }],
    backgroundColor: '#c4923f',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  label: {
    color: '#1a140c',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
