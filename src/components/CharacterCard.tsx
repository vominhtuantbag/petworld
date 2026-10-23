import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CharacterDefinition } from '../data/characters';
import { usePointerHover } from '../hooks/usePointerHover';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';
import { CharacterAvatar } from './CharacterAvatar';

type Props = {
  character: CharacterDefinition;
  selected: boolean;
  hairColor: string;
  outfitColor: string;
  width: number;
  onPress: () => void;
};

export function CharacterCard({ character, selected, hairColor, outfitColor, width, onPress }: Props) {
  const { s, font } = useLayout();
  const { hovered, hoverHandlers } = usePointerHover();

  return (
    <Pressable
      testID={`character-card-${character.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${character.title}, ${character.titleEn}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      {...hoverHandlers}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          borderRadius: s(14),
          paddingVertical: s(8),
          paddingHorizontal: s(4),
          borderColor: selected ? theme.gold : hovered ? theme.line : theme.lineSoft,
          backgroundColor: selected ? theme.cardRaised : theme.card,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <CharacterAvatar
        character={character}
        hairColor={hairColor}
        outfitColor={outfitColor}
        size={Math.max(52, Math.min(width - s(12), s(78)))}
      />
      <Text style={[styles.title, { fontSize: font(13), marginTop: s(2) }]} numberOfLines={1}>
        {character.title}
      </Text>
      <Text style={[styles.subtitle, { fontSize: font(11) }]} numberOfLines={1}>
        {character.titleEn}
      </Text>
      {selected ? <View style={[styles.dot, { width: s(8), height: s(8), borderRadius: s(4) }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderWidth: 1.5,
  },
  title: {
    color: theme.ink,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.muted,
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.gold,
  },
});
