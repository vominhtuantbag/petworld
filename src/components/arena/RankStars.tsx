import { StyleSheet, Text, View } from 'react-native';

import { STARS_PER_TIER } from '../../world/ranks';

type Props = {
  stars: number;
  size?: number;
  tint?: string;
};

/** Five star slots for the current ranked tier. Filled stars use the rank tint. */
export function RankStars({ stars, size = 16, tint = '#e4c27a' }: Props) {
  const filled = Math.max(0, Math.min(STARS_PER_TIER, Math.round(stars || 0)));
  return (
    <View style={styles.row} accessibilityLabel={`${filled} trên ${STARS_PER_TIER} sao`}>
      {Array.from({ length: STARS_PER_TIER }, (_, index) => (
        <Text key={index} style={{ fontSize: size, color: index < filled ? tint : 'rgba(246, 241, 231, 0.22)', lineHeight: size + 2 }}>
          ★
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
