import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';

import type { RegionDefinition } from '../data/regions';
import { usePointerHover } from '../hooks/usePointerHover';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';
import { RegionMotif } from './RegionMotif';

type Props = {
  region: RegionDefinition;
  selected: boolean;
  onPress: () => void;
};

export function RegionCard({ region, selected, onPress }: Props) {
  const { s, font, compact } = useLayout();
  const { hovered, hoverHandlers } = usePointerHover();
  const locked = region.status !== 'available';

  return (
    <Pressable
      testID={`region-card-${region.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${region.nameVi}, ${region.name}`}
      accessibilityState={{ selected, disabled: locked }}
      disabled={locked}
      onPress={onPress}
      {...hoverHandlers}
      style={({ pressed }) => [
        styles.card,
        {
          borderRadius: s(14),
          borderColor: selected ? theme.gold : hovered && !locked ? theme.line : 'transparent',
          transform: [{ scale: pressed && !locked ? 0.98 : 1 }],
        },
      ]}
    >
      <LinearGradient
        colors={[region.sky[0], region.sky[1]]}
        style={[styles.fill, { borderRadius: s(13), padding: compact ? s(6) : s(8) }]}
      >
        <View style={styles.top}>
          <RegionMotif motif={region.motif} accent={region.accent} size={compact ? s(22) : s(28)} />
          {locked ? <LockGlyph size={s(14)} /> : null}
        </View>
        <Text style={[styles.title, { color: region.ink, fontSize: font(compact ? 13 : 15) }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          {region.nameVi}
        </Text>
        <Text style={[styles.english, { color: region.ink, fontSize: font(10) }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
          {region.name}
        </Text>
        <Text style={[styles.description, { color: region.ink, fontSize: font(10) }]} numberOfLines={compact ? 1 : 2} maxFontSizeMultiplier={1.1}>
          {locked ? 'Sắp mở' : region.description}
        </Text>
      </LinearGradient>
      {locked ? <View pointerEvents="none" style={[styles.lockWash, { borderRadius: s(13) }]} /> : null}
    </Pressable>
  );
}

function LockGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={10} width={14} height={10} rx={2} fill={theme.ink} />
      <Path d="M8 10 V7 a4 4 0 0 1 8 0 V10" stroke={theme.ink} strokeWidth={2} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    alignSelf: 'stretch',
    borderWidth: 2,
    overflow: 'hidden',
  },
  fill: {
    flex: 1,
    minHeight: 0,
    gap: 1,
    justifyContent: 'center',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontWeight: '700',
  },
  english: {
    opacity: 0.8,
    fontWeight: '600',
  },
  description: {
    opacity: 0.9,
    marginTop: 2,
  },
  lockWash: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.overlay,
  },
});
