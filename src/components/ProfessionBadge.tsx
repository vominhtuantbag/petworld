import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { Emblem } from '../types/game';
import { assertNever } from '../types/assertNever';
import { theme } from '../theme/theme';

type Props = {
  emblem: Emblem;
  size: number;
};

/** Neutral job mark shown before a gender is chosen. */
export function ProfessionBadge({ emblem, size }: Props) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48">
        <Mark emblem={emblem} />
      </Svg>
    </View>
  );
}

function Mark({ emblem }: { emblem: Emblem }) {
  const ink = theme.gold;
  switch (emblem) {
    case 'leaf':
      return <Path fill={ink} d="M24 6 C34 16 34 30 24 42 C14 30 14 16 24 6 Z" />;
    case 'chevron':
      return <Path d="M10 18 L24 34 L38 18" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />;
    case 'star':
      return <Path fill={ink} d="M24 6 L28.5 18 H41 L31 26 L35 39 L24 31 L13 39 L17 26 L7 18 H19.5 Z" />;
    case 'compass':
      return (
        <>
          <Circle cx={24} cy={24} r={14} stroke={ink} strokeWidth={3} fill="none" />
          <Path fill={ink} d="M24 10 L28 24 L24 38 L20 24 Z" />
        </>
      );
    case 'bead':
      return <Circle cx={24} cy={24} r={8} fill={ink} />;
    case 'bow':
      return <Path d="M8 16 Q24 40 40 16" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />;
    case 'heart':
      return <Path fill={ink} d="M24 40 C16 32 6 28 10 18 C14 10 24 16 24 16 C24 16 34 10 38 18 C42 28 32 32 24 40 Z" />;
    case 'mask':
      return <Path d="M8 24 H40" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />;
    case 'shield':
      return <Path fill={ink} d="M24 6 L40 12 V24 C40 34 24 42 24 42 C24 42 8 34 8 24 V12 Z" />;
    case 'strap':
      return <Path d="M10 8 L38 40" stroke={ink} strokeWidth={5} strokeLinecap="round" fill="none" />;
    case 'dagger':
      return (
        <>
          <Path fill={ink} d="M24 4 L31 20 H17 Z" />
          <Path d="M14 20 H34" stroke={ink} strokeWidth={3.5} strokeLinecap="round" />
          <Path d="M24 20 V42" stroke={ink} strokeWidth={4} strokeLinecap="round" />
        </>
      );
    default:
      return assertNever(emblem);
  }
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bgDeep,
    borderWidth: 1,
    borderColor: theme.line,
  },
});
