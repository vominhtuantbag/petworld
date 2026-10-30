import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CharacterAvatar } from '../components/CharacterAvatar';
import { MapHud, type MapMenuId } from '../components/map/MapHud';
import { portraitFacesRight } from '../components/world/facing';
import { FieldStage } from '../components/world/FieldStage';
import { MapChat } from '../components/world/MapChat';
import { toNearby } from '../components/world/PvpChallenge';
import { PlayerInfoHUD } from '../components/world/PlayerInfoHUD';
import { Minimap } from '../components/world/Minimap';
import { RemotePlayer } from '../components/world/RemotePlayer';
import { getCharacter } from '../data/characters';
import { useAvatarLook } from '../state/avatarLook';
import { useBattle } from '../state/BattleContext';
import { useSetup } from '../state/SetupContext';
import { useMultiplayer } from '../state/useMultiplayer';
import { useWorld } from '../state/WorldContext';
import { theme } from '../theme/theme';
import { worldZoom } from '../web/mobileWeb';
import { lootFits } from '../world/items';
import { expForNextLevel } from '../world/progression';
import { useFieldSession } from '../world/useFieldSession';
import type { Encounter, FieldEvent, MonsterActor } from '../world/types';

/**
 * Wilderness around the current town. Monsters stay inside their uneven
 * level zone and chase when you enter the hidden danger circle. Gates link
 * the neighboring towns and, far from the entrance, the next map tier.
 */
export function OpenWorldMapScreen() {
  const world = useWorld();
  const battle = useBattle();
  const setup = useSetup();
  const { field, update } = useFieldSession(world.zoneId);
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
    if (event.type === 'travel') {
      world.travelTo(event.toZone, event.arrive, event.unlock);
      return;
    }
    if (event.type === 'pickup') {
      world.collect(event.loot);
      return;
    }
    if (event.type === 'hazard') {
      world.sufferHazard(event.dt);
      return;
    }
    if (event.type === 'march') {
      world.march(event.distance, event.dt);
      return;
    }
    if (event.type === 'quicksand') {
      world.hurtQuicksand();
      return;
    }
    if (event.type === 'puddle') {
      world.drainPuddle();
      return;
    }
    if (event.type === 'encounter') {
      const pool = battlePool(field.monsters, field.player, event.monster);
      world.beginEncounter({ ...pool[0], pool });
      return;
    }
    if (event.type === 'dungeon') {
      if (event.dungeon === 'mine') world.approachMine();
      else enterRaid();
    }
  };

  const enterRaid = () => {
    if (!setup.player) return;
    const ticket = world.bag.some((stack) => stack.itemId === 'mine-ticket' && stack.qty > 0);
    if (!ticket) {
      world.say('Cần vé hầm ngục. Hoàn thành tầng cuối Hầm mỏ để nhận vé.');
      return;
    }
    battle.joinRaid({
      zoneId: world.zoneId,
      name: setup.player.name,
      gender: setup.player.gender,
      baseAvatarId: setup.player.baseCharacterId,
      hairColor: setup.player.hairColor,
      outfitColor: setup.player.outfitColor,
      level: world.adventureLevel,
      attack: world.attack,
      defense: world.defense,
      maxHp: world.vitals.maxHp,
      hasTicket: true,
    });
  };

  useEffect(() => {
    if (!battle.raidCall) return;
    if (battle.raidCall !== world.zoneId) {
      battle.clearRaidCall();
      world.say('Hãy đứng cùng khu với party để vào hầm ngục.');
      return;
    }
    battle.clearRaidCall();
    enterRaid();
    // Party members auto-join the same-zone lobby once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle.raidCall]);

  return (
    <View style={styles.screen}>
      <FieldStage
        field={field}
        onField={update}
        onEvent={onEvent}
        canTake={(loot) => lootFits(world.bag, loot)}
        paused={menu !== null || customizing || chatFocused}
        playerLevel={world.adventureLevel}
        stamina={world.vitals.stamina}
        testID="world-screen"
        zoom={worldZoom()}
        dungeonOpen={battle.goldenHour.active}
        speedBonus={world.speed}
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
          <Minimap field={field} />
        </View>
        {battle.goldenHour.active ? (
          <Text pointerEvents="none" style={styles.hour}>
            Giờ vàng 00:00–24:00 — Hầm mỏ và Hầm ngục đã mở
          </Text>
        ) : null}
      </FieldStage>
      <MapChat messages={others.messages} online={others.players.length} selfUserId={others.selfUserId} onSend={others.sendChat} onFocusChange={setChatFocused} />
      <MapHud menu={menu} onOpen={setMenu} onClose={() => setMenu(null)} self={field.player} remotes={toNearby(others.players)} />
    </View>
  );
}

function battlePool(monsters: MonsterActor[], player: { x: number; y: number }, trigger: MonsterActor): Encounter[] {
  const ranked = [...monsters].sort((a, b) => {
    const da = Math.hypot(a.x - player.x, a.y - player.y);
    const db = Math.hypot(b.x - player.x, b.y - player.y);
    return da - db;
  });
  const pool: Encounter[] = [];
  const seen = new Set<string>();
  for (const monster of [trigger, ...ranked]) {
    if (seen.has(monster.id)) continue;
    seen.add(monster.id);
    pool.push(toCard(monster));
    if (pool.length >= 6) break;
  }
  while (pool.length < 3) {
    const base = pool[pool.length - 1];
    pool.push({ ...base, id: `${base.id}-pack-${pool.length}`, name: `${base.name} ${pool.length + 1}` });
  }
  return pool;
}

function toCard(monster: MonsterActor): Encounter {
  return {
    id: monster.id,
    kindId: monster.kindId,
    name: monster.name,
    level: monster.level,
    hp: monster.hp,
    maxHp: monster.maxHp,
    mp: monster.mp,
    attack: monster.attack,
    defense: monster.defense,
    speed: monster.speed,
    tint: monster.tint,
    elite: monster.elite,
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bgDeep },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  hour: {
    alignSelf: 'center',
    marginTop: 6,
    color: theme.gold,
    fontWeight: '800',
    backgroundColor: 'rgba(16, 33, 28, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
