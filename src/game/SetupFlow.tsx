import { StyleSheet, View } from 'react-native';

import { ScreenFade } from '../components/ScreenFade';
import { CharacterCreationScreen } from '../screens/CharacterCreationScreen';
import { RegionSelectionScreen } from '../screens/RegionSelectionScreen';
import { useSetup } from '../state/SetupContext';
import { theme } from '../theme/theme';

/**
 * Character creation, then the starting region. The town and arena live
 * outside this flow so the match socket stays connected while those screens swap.
 */
export function SetupFlow() {
  const { step } = useSetup();

  return (
    <View style={styles.root}>
      <ScreenFade screenKey={step}>
        {step === 'character' ? <CharacterCreationScreen /> : null}
        {step === 'region' ? <RegionSelectionScreen /> : null}
      </ScreenFade>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
});
