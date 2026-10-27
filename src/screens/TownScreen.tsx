import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CharacterAvatar } from '../components/CharacterAvatar';
import { MapHud, type MapMenuId } from '../components/map/MapHud';
import { portraitFacesRight } from '../components/world/facing';
import { FieldStage } from '../components/world/FieldStage';
import { MapChat } from '../components/world/MapChat';
import { PlayerInfoHUD } from '../components/world/PlayerInfoHUD';
import { RemotePlayer } from '../components/world/RemotePlayer';
import { ServicePanel } from '../components/town/ServicePanel';
import { getCharacter } from '../data/characters';
import { useAvatarLook } from '../state/avatarLook';
import { useSetup } from '../state/SetupContext';
import { useMultiplayer } from '../state/useMultiplayer';
import { useWorld } from '../state/WorldContext';
import { theme } from '../theme/theme';
import { worldZoom } from '../web/mobileWeb';
import { lootFits } from '../world/items';
import { expForNextLevel } from '../world/progression';
import { useFieldSession } from '../world/useFieldSession';
import type { FieldEvent, ServiceId } from '../world/types';

/**
 * Walkable town for the current region. Doors open services. The east gate
 * leaves for that town's first hunting map. Add a building by extending the town
 * layout in `src/world/catalog.ts` and a panel branch in `ServicePanel`.
 */
export function TownScreen() {
  const world = useWorld();
  const setup = useSetup();
  const { field, update } = useFieldSession(world.zoneId);
  const [panel, setPanel] = useState<ServiceId | 'bag' | null>(null);
  const [menu, setMenu] = useState<MapMenuId | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [chatFocused, setChatFocused] = useState(false);
  const look = useAvatarLook(setup.player?.baseCharacterId);
  const character = getCharacter(setup.player?.baseCharacterId);
  const others = useMultiplayer(
    setup.player
      ? {
          zoneId: world.zoneId,
          x: field.player.x,
          y: field.player.y,
          name: setup.player.name,
          baseCharacterId: setup.player.baseCharacterId,
          gender: setup.player.gender,
          hairColor: setup.player.hairColor,
          outfitColor: setup.player.outfitColor,
          level: world.adventureLevel,
          hp: world.vitals.hp,
          maxHp: world.vitals.maxHp,
        }
      : null,
  );

  const onEvent = (event: FieldEvent) => {
    if (event.type === 'service') {
      if (event.service === 'pvp' || event.service === 'cup') world.openService(event.service);
      else setPanel(event.service);
      return;
    }
    if (event.type === 'travel') {
      world.travelTo(event.toZone, event.arrive, event.unlock);
    }
  };

  return (
    <View style={styles.screen}>
      <FieldStage
        field={field}
        onField={update}
        onEvent={onEvent}
        canTake={(loot) => lootFits(world.bag, loot)}
        paused={panel !== null || menu !== null || customizing || chatFocused}
        testID="town-screen"
        zoom={worldZoom()}
        playerFacesRight={portraitFacesRight(character?.professionId, character?.gender)}
        remotes={others.players.map((player) => ({
          id: player.userId,
          x: player.x,
          y: player.y,
          node: <RemotePlayer player={player} />,
        }))}
        player={
          character && setup.player ? (
            <CharacterAvatar
              character={character}
              hairColor={setup.player.hairColor}
              outfitColor={setup.player.outfitColor}
              size={89}
            />
          ) : null
        }
      >
        <View pointerEvents="box-none" style={styles.top}>
          <PlayerInfoHUD
            name={setup.player?.name ?? 'Bạn'}
            level={world.adventureLevel}
            classTitle={character?.title ?? 'Nhân vật'}
            exp={world.adventureExp}
            expNeeded={expForNextLevel(world.adventureLevel)}
            vitals={world.vitals}
            gold={world.gold}
            portrait={look.portrait}
            customUri={look.customUri}
            hairColor={setup.player?.hairColor ?? '#e0aa78'}
            outfitColor={setup.player?.outfitColor ?? '#3d6b45'}
            ownCharacterId={setup.player?.baseCharacterId ?? null}
            notice={world.notice}
            onChoosePreset={look.choosePreset}
            onChooseImage={look.chooseImage}
            onBusy={setCustomizing}
          />
        </View>
      </FieldStage>
      <MapChat messages={others.messages} online={others.players.length} onSend={others.sendChat} onFocusChange={setChatFocused} />
      <MapHud menu={menu} onOpen={setMenu} onClose={() => setMenu(null)} />
      {panel ? <ServicePanel panel={panel} onClose={() => setPanel(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
});
