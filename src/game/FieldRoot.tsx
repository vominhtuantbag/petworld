import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { useOverworldBgm } from '../audio/useOverworldBgm';
import { PartyInvitePrompt, PvpChallengePrompt } from '../components/world/PvpChallenge';
import { BattleScreen } from '../screens/BattleScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { OpenWorldMapScreen } from '../screens/OpenWorldMapScreen';
import { RaidLobbyScreen } from '../screens/RaidLobbyScreen';
import { SquadSetupScreen } from '../screens/SquadSetupScreen';
import { TournamentScreen } from '../screens/TournamentScreen';
import { TownScreen } from '../screens/TownScreen';
import { useBattle } from '../state/BattleContext';
import { useWorld } from '../state/WorldContext';
import { theme } from '../theme/theme';

/**
 * Live world shell after character setup. Kept out of App.tsx so expo-audio,
 * BGM assets, and field art are not evaluated during splash / auth.
 */
export function FieldRoot() {
  const world = useWorld();
  const battle = useBattle();
  useOverworldBgm({ scene: world.scene, zoneId: world.zoneId });

  let body: ReactNode = <TownScreen />;
  if (battle.raidLobby) body = <RaidLobbyScreen />;
  else if (world.scene === 'wilds') body = <OpenWorldMapScreen />;
  else if (world.scene === 'squad') body = <SquadSetupScreen />;
  else if (world.scene === 'encounter') body = <BattleScreen />;
  else if (world.scene === 'cup') body = <TournamentScreen />;
  else if (world.scene === 'pvp') {
    body = (
      <LobbyScreen
        onLeave={() => {
          battle.cancelMatch();
          world.returnToTown();
        }}
      />
    );
  }

  return (
    <View style={styles.fill}>
      {body}
      {battle.raidLobby ? null : (
        <>
          <PvpChallengePrompt />
          <PartyInvitePrompt />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.bg },
});
