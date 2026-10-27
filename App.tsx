import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DebugGrid } from './src/components/battle/DebugGrid';
import { RotateToLandscape } from './src/components/RotateToLandscape';
import { useImmersiveChrome } from './src/components/ImmersiveChrome';
import { useLandscapeLock } from './src/hooks/useLandscapeLock';
import { SetupFlow } from './src/game/SetupFlow';
import { getRegion } from './src/data/regions';
import type { ServerCharacter } from './src/net/protocol';
import { ArenaScreen } from './src/screens/ArenaScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { BattleScreen } from './src/screens/BattleScreen';
import { SquadSetupScreen } from './src/screens/SquadSetupScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { OpenWorldMapScreen } from './src/screens/OpenWorldMapScreen';
import { TournamentScreen } from './src/screens/TournamentScreen';
import { TownScreen } from './src/screens/TownScreen';
import { AuthProvider, useAuth } from './src/state/AuthContext';
import { playerFromSave } from './src/state/save/gameSave';
import { readDeviceSave, readLocalSave } from './src/state/save/localSave';
import { BattleProvider, useBattle } from './src/state/BattleContext';
import { SetupProvider, useSetup } from './src/state/SetupContext';
import { WorldProvider, useWorld } from './src/state/WorldContext';
import { theme } from './src/theme/theme';
import type { InitializedPlayer } from './src/types/game';

/**
 * Game Thư Giãn
 *
 * App.tsx            session gate: auth, setup, town, wilds, arena
 * src/data           character, color, and region catalogs
 * src/state          auth, setup draft, and the live battle socket
 * src/net            REST client and the socket payload types
 * src/screens        landscape screens
 * server/            Express, JWT, and the Socket.io arena
 */
export default function App() {
  useLandscapeLock();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SetupProvider>
          <BattleProvider>
            <WorldProvider>
              <GameRoot />
            </WorldProvider>
          </BattleProvider>
        </SetupProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function GameRoot() {
  const auth = useAuth();
  const setup = useSetup();
  const battle = useBattle();
  const world = useWorld();
  const chrome = useImmersiveChrome();
  useSavedCharacter();

  let screen: ReactNode = <SetupFlow />;
  if (!auth.ready) screen = <View style={styles.fill} />;
  else if (!auth.token) screen = <AuthScreen />;
  else if (battle.battle) screen = <ArenaScreen />;
  else if (setup.step === 'gameplay' && setup.player) {
    screen = world.ready ? <FieldRoot /> : <View style={styles.fill} />;
  }

  return (
    <View style={styles.root} {...chrome.panHandlers}>
      {screen}
      <DebugGrid />
      {chrome.bar}
      <RotateToLandscape />
    </View>
  );
}

function FieldRoot() {
  const world = useWorld();
  const battle = useBattle();
  if (world.scene === 'wilds') return <OpenWorldMapScreen />;
  if (world.scene === 'squad') return <SquadSetupScreen />;
  if (world.scene === 'encounter') return <BattleScreen />;
  if (world.scene === 'cup') return <TournamentScreen />;
  if (world.scene === 'pvp') {
    return (
      <LobbyScreen
        onLeave={() => {
          battle.cancelMatch();
          world.returnToTown();
        }}
      />
    );
  }
  return <TownScreen />;
}

/**
 * Restores a saved character into the lobby once per login.
 * "Đổi nhân vật" clears the local player on purpose, and this must not
 * put that draft straight back into the lobby.
 */
function useSavedCharacter() {
  const auth = useAuth();
  const setup = useSetup();
  const hydratedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!auth.ready) return;
    if (!auth.user) {
      hydratedUserId.current = null;
      setup.resetSetup();
      return;
    }
    if (hydratedUserId.current === auth.user.id) return;
    const userId = auth.user.id;
    const fromServer = auth.character ? toPlayer(auth.character) : null;
    if (fromServer) {
      hydratedUserId.current = userId;
      setup.applySavedPlayer(fromServer);
      return;
    }
    let cancel = false;
    void (async () => {
      const save = (await readLocalSave(userId)) ?? (await readDeviceSave());
      if (cancel || hydratedUserId.current === userId) return;
      const player = save ? playerFromSave(save) : null;
      if (!player) return;
      hydratedUserId.current = userId;
      setup.applySavedPlayer(player);
    })();
    return () => {
      cancel = true;
    };
  }, [auth.ready, auth.user, auth.character, setup]);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  fill: { flex: 1, backgroundColor: theme.bg },
});

function toPlayer(character: ServerCharacter): InitializedPlayer | null {
  const region = getRegion(character.startingRegion);
  if (!region || region.status !== 'available') return null;
  return {
    name: character.name,
    gender: character.gender,
    baseCharacterId: character.baseAvatarId,
    hairColor: character.hairColor,
    outfitColor: character.outfitColor,
    selectedRegion: region.id,
  };
}
