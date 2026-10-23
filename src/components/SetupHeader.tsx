import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePointerHover } from '../hooks/usePointerHover';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

type Props = {
  title: string;
  stepLabel: string;
  onBack?: () => void;
};

export function SetupHeader({ title, stepLabel, onBack }: Props) {
  const { s, font, compact } = useLayout();
  const { hovered, hoverHandlers } = usePointerHover();

  return (
    <View style={[styles.row, { paddingHorizontal: s(16), paddingVertical: compact ? s(4) : s(8), gap: s(12) }]}>
      {onBack ? (
        <Pressable
          testID="back-button"
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={onBack}
          hitSlop={8}
          {...hoverHandlers}
          style={({ pressed }) => [
            styles.back,
            {
              height: s(36),
              paddingHorizontal: s(12),
              borderRadius: s(10),
            },
            (pressed || hovered) && styles.backActive,
          ]}
        >
          <Text style={[styles.backLabel, { fontSize: font(13) }]}>Quay lại</Text>
        </Pressable>
      ) : (
        <View style={{ width: s(8) }} />
      )}
      <View style={styles.titles}>
        <Text style={[styles.kicker, { fontSize: font(compact ? 10 : 11) }]} maxFontSizeMultiplier={1.15}>
          GAME THƯ GIÃN
        </Text>
        <Text style={[styles.title, { fontSize: font(compact ? 16 : 20) }]} maxFontSizeMultiplier={1.15} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <Text style={[styles.step, { fontSize: font(13) }]}>{stepLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.lineSoft,
  },
  titles: {
    flex: 1,
  },
  kicker: {
    color: theme.gold,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  title: {
    color: theme.ink,
    fontWeight: '700',
  },
  step: {
    color: theme.muted,
    fontWeight: '600',
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
  },
  backActive: {
    backgroundColor: theme.cardRaised,
  },
  backLabel: {
    color: theme.ink,
    fontWeight: '600',
  },
});
