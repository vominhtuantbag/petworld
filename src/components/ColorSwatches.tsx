import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HAIR_COLORS, OUTFIT_COLORS, type HairColorId, type OutfitColorId } from '../data/colors';
import { usePointerHover } from '../hooks/usePointerHover';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

type HairProps = {
  kind: 'hair';
  label: string;
  selectedId: HairColorId;
  enabled: boolean;
  onSelect: (id: HairColorId) => void;
};

type OutfitProps = {
  kind: 'outfit';
  label: string;
  selectedId: OutfitColorId;
  enabled: boolean;
  onSelect: (id: OutfitColorId) => void;
};

/**
 * One palette row. Disabled until a character exists, so a color is always
 * stored together with a base character.
 */
export function ColorSwatches(props: HairProps | OutfitProps) {
  const { s, font } = useLayout();
  const swatches = props.kind === 'hair' ? HAIR_COLORS : OUTFIT_COLORS;
  const selected = swatches.find((item) => item.id === props.selectedId);
  const [rowWidth, setRowWidth] = useState(0);
  const gap = s(6);
  const fitted =
    rowWidth > 0 ? Math.floor((rowWidth - gap * (swatches.length - 1)) / swatches.length) : s(22);
  const size = Math.max(14, Math.min(s(26), fitted));

  return (
    <View style={{ gap: s(3), opacity: props.enabled ? 1 : 0.4 }} pointerEvents={props.enabled ? 'auto' : 'none'}>
      <Text style={[styles.caption, { fontSize: font(11) }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
        {props.label}
        {props.enabled && selected ? ` · ${selected.label}` : ''}
      </Text>
      <View style={[styles.row, { gap }]} onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}>
        {swatches.map((swatch) => (
          <SwatchButton
            key={swatch.id}
            testID={`${props.kind}-color-${swatch.id}`}
            label={`${props.label} ${swatch.label}`}
            active={swatch.id === props.selectedId}
            color={swatch.hex}
            size={size}
            onPress={() => {
              if (props.kind === 'hair') props.onSelect(swatch.id as HairColorId);
              else props.onSelect(swatch.id as OutfitColorId);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function SwatchButton({
  testID,
  label,
  active,
  color,
  size,
  onPress,
}: {
  testID: string;
  label: string;
  active: boolean;
  color: string;
  size: number;
  onPress: () => void;
}) {
  const { hovered, hoverHandlers } = usePointerHover();

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onPress={onPress}
      {...hoverHandlers}
      style={({ pressed }) => [
        styles.swatch,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderColor: active ? theme.gold : 'rgba(255,255,255,0.28)',
          borderWidth: active ? 3 : 1,
          transform: [{ scale: pressed ? 0.92 : hovered ? 1.08 : 1 }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  caption: {
    color: theme.muted,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
  },
  swatch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
