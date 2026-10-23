import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EndGameModal, type ExpMember, type LootSlot } from '../components/battle/EndGameModal';
import { FloatingCombatText } from '../components/battle/FloatingCombatText';
import { TamingMiniGameModal } from '../components/battle/TamingMiniGameModal';
import { BATTLE_GRID_POSITIONS, feetInView, overheadDrop } from '../components/battle/courtSlots';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { portraitScaleX } from '../components/world/facing';
import { monsterPortrait } from '../components/world/MonsterToken';
import { getCharacter, type CharacterDefinition } from '../data/characters';
import { useSetup } from '../state/SetupContext';
import { useWorld } from '../state/WorldContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';
import {
  COMBAT_ITEMS,
  actAlly,
  actAuto,
  actAutoPlayer,
  actBasic,
  actSkill,
  actTame,
  applyMastery,
  battleRewards,
  battleVitals,
  type BattleRewards,
  makeAlly,
  masteryOf,
  makePlayer,
  makeWild,
  startBattle,
  type BattleState,
  type Fighter,
} from '../world/combat';
import { ITEMS } from '../world/items';
import type { Encounter, ItemId } from '../world/types';

const ARENA = require('../../assets/images/sandau_2.jpg');

/**
 * Isometric arena. The hero stands large on the left border. Squad pets 1–3
 * hold their cells on the left half. Three foes use the right-hand group;
 * a boar encounter fills the six-boar pack. Feet stay on the cell center.
 */
export function BattleScreen() {
  const world = useWorld();
  const setup = useSetup();
  const { s, font } = useLayout();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState({ w: 0, h: 0 });
  const [stageBox, setStageBox] = useState({ x: 0, y: 0 });
  const foot = (cell: string) => feetInView(cell, screen.w, screen.h, insets.left + stageBox.x, insets.top + stageBox.y);
  const petCells = [BATTLE_GRID_POSITIONS.pet1, BATTLE_GRID_POSITIONS.pet2, BATTLE_GRID_POSITIONS.pet3];
  const encounter = world.encounter;
  const character = getCharacter(setup.player?.baseCharacterId);
  const [pickedFoes, setPickedFoes] = useState<string[] | null>(null);
  const [pickedAllies, setPickedAllies] = useState<string[] | null>(null);
  const [pickedItems, setPickedItems] = useState<ItemId[] | null>(null);
  const [opening] = useState(() => {
    const squad = world.squad;
    const player = setup.player;
    if (!squad || !world.encounter || !player) return null;
    const lead = masteryOf(character?.professionId);
    const allies = world.tamed
      .filter((monster) => squad.allyIds.includes(monster.id))
      .slice(0, 3)
      .map((monster) => applyMastery(makeAlly(monster), lead));
    const foes = fieldFoes(world.encounter).map(makeWild);
    return {
      battle: startBattle(
        makePlayer({
          name: player.name,
          professionId: character?.professionId,
          level: world.adventureLevel,
          hp: world.vitals.hp,
          maxHp: world.vitals.maxHp,
          mp: world.vitals.mana,
          maxMp: world.vitals.maxMana,
          attack: world.attack,
          defense: world.defense,
          basicId: squad.basicId,
          skillIds: world.heroSkills?.professionId === (character?.professionId ?? 'wanderer') ? world.heroSkills.skillIds : undefined,
        }),
        allies,
        foes,
        world.bag.map((stack) => ({ ...stack })),
        world.vitals.stamina,
        world.vitals.maxStamina,
      ),
    };
  });
  const [battle, setBattle] = useState<BattleState | null>(opening?.battle ?? null);
  const [focusId, setFocusId] = useState<string | null>(opening?.battle.foes[0]?.id ?? null);
  const [basicId, setBasicId] = useState<string | null>(world.squad?.basicId ?? null);
  const [actionId, setActionId] = useState('basic');
  const [tameId, setTameId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);
  const [floats, setFloats] = useState<{ id: number; fighterId: string; amount: number }[]>([]);
  const focusRef = useRef<string | null>(null);
  const autoRef = useRef(false);
  const rewardsRef = useRef<BattleRewards | null>(null);
  const hpWatch = useRef<Map<string, number> | null>(null);
  const floatSerial = useRef(0);
  autoRef.current = auto;
  if (battle?.over && !rewardsRef.current) rewardsRef.current = battleRewards(battle);

  const turnToken = battle && !battle.over && !paused ? battle.turnId : null;
  const handsOff = Boolean(
    battle && (battle.turnId === 'player' || battle.allies.some((ally) => ally.id === battle.turnId)),
  );
  useEffect(() => {
    setActionId('basic');
  }, [battle?.turnId]);
  useEffect(() => {
    if (!turnToken || tameId) return;
    if (handsOff && !auto) return;
    const timer = setTimeout(() => {
      setBattle((current) => {
        if (!current || current.over || current.turnId !== turnToken) return current;
        if (turnToken === 'player') return autoRef.current ? actAutoPlayer(current, focusRef.current) : current;
        const allyTurn = current.allies.some((ally) => ally.id === turnToken);
        if (allyTurn && !autoRef.current) return current;
        return actAuto(current, allyTurn && autoRef.current);
      });
    }, 480);
    return () => clearTimeout(timer);
  }, [turnToken, tameId, auto, handsOff]);
  useEffect(() => {
    if (!battle) {
      hpWatch.current = null;
      setFloats((current) => (current.length === 0 ? current : []));
      return;
    }
    const lineup = [battle.player, ...battle.allies, ...battle.foes];
    const previous = hpWatch.current;
    const next = new Map(lineup.map((fighter) => [fighter.id, fighter.hp]));
    hpWatch.current = next;
    if (!previous) {
      setFloats((current) => (current.length === 0 ? current : []));
      return;
    }
    const born: { id: number; fighterId: string; amount: number }[] = [];
    for (const fighter of lineup) {
      if (!previous.has(fighter.id)) continue;
      const delta = fighter.hp - (previous.get(fighter.id) ?? fighter.hp);
      if (!Number.isFinite(delta) || delta === 0) continue;
      floatSerial.current += 1;
      born.push({ id: floatSerial.current, fighterId: fighter.id, amount: delta });
    }
    if (born.length === 0) return;
    setFloats((current) => [...current, ...born].slice(-24));
  }, [battle]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  if (!encounter || !setup.player) {
    return (
      <View style={styles.screen}>
        <Text style={styles.log}>Không có trận đấu.</Text>
      </View>
    );
  }

  const cards = roster(encounter);
  const consumables = world.bag.filter((stack) => COMBAT_ITEMS.includes(stack.itemId));
  const captured = world.tamed;
  const capturedIds = new Set(captured.map((monster) => monster.id));
  const foeIds = pickedFoes ?? cards.slice(0, 3).map((card) => card.id);
  const allyIds = (pickedAllies ?? captured.slice(0, 3).map((monster) => monster.id)).filter((id) => capturedIds.has(id));
  const itemIds = pickedItems ?? consumables.slice(0, 1).map((stack) => stack.itemId);
  const allyNeed = Math.min(3, captured.length);
  const itemNeed = Math.min(1, consumables.length);
  const ready = foeIds.length === 3 && allyIds.length === allyNeed && itemIds.length === itemNeed;
  const playerPreview = makePlayer({
    name: setup.player.name,
    professionId: character?.professionId,
    level: world.adventureLevel,
    hp: world.vitals.hp,
    maxHp: world.vitals.maxHp,
    mp: world.vitals.mana,
    maxMp: world.vitals.maxMana,
    attack: world.attack,
    defense: world.defense,
    basicId: basicId ?? world.squad?.basicId ?? world.heroSkills?.basicId,
    skillIds: world.heroSkills?.professionId === (character?.professionId ?? 'wanderer') ? world.heroSkills.skillIds : undefined,
  });
  const living = battle?.foes.filter((foe) => foe.hp > 0) ?? [];
  const targetPool = battle ? [...battle.foes, ...battle.allies] : [];
  const selected = targetPool.find((fighter) => fighter.id === focusId && fighter.hp > 0) ?? null;
  const focus = selected?.side === 'wild' ? selected : (living[0] ?? null);
  const marked = selected ?? focus;
  focusRef.current = focus?.id ?? null;
  const tameFoe = battle?.foes.find((foe) => foe?.id === tameId && foe.hp > 0) ?? null;
  const nets = countNets(battle?.bag ?? world.bag);
  const rewards = battle?.over ? rewardsRef.current : null;
  const actingAlly = battle?.allies.find((ally) => ally.id === battle.turnId && ally.hp > 0) ?? null;
  const playerTurn = Boolean(battle && !battle.over && !paused && battle.turnId === 'player' && !tameId);
  const commandTurn = playerTurn || Boolean(actingAlly && !auto && !paused && !tameId && battle && !battle.over);
  const lineup = battle ? [battle.player, ...battle.allies, ...battle.foes] : [];
  const player = battle?.player ?? playerPreview;
  const shownAllies = battle
    ? battle.allies
    : captured.filter((monster) => allyIds.includes(monster.id)).map(makeAlly);
  const shownFoes = battle ? battle.foes : cards.filter((card) => foeIds.includes(card.id)).map(makeWild);
  const boarPack = shownFoes.length > 3;
  const foeCells = boarPack
    ? [BATTLE_GRID_POSITIONS.boar1, BATTLE_GRID_POSITIONS.boar2, BATTLE_GRID_POSITIONS.boar3, BATTLE_GRID_POSITIONS.boar4, BATTLE_GRID_POSITIONS.boar5, BATTLE_GRID_POSITIONS.boar6]
    : [BATTLE_GRID_POSITIONS.enemy1, BATTLE_GRID_POSITIONS.enemy2, BATTLE_GRID_POSITIONS.enemy3];

  const finish = () => {
    if (!battle?.over) return;
    const payout = rewardsRef.current ?? battleRewards(battle);
    const names = battle.tamed.map((monster) => monster.name).join(', ');
    const itemText = payout.drops.map((drop) => `${ITEMS[drop.itemId].nameVi} ×${drop.qty}`).join(', ');
    const notice = payout.victory
      ? `Thắng trận. +${payout.exp} kinh nghiệm, +${payout.gold} vàng${itemText ? `, ${itemText}` : ''}.`
      : `Thua trận. +${payout.exp} kinh nghiệm.`;
    world.resolveBattle({
      vitals: battleVitals(battle, world.vitals.maxHp, world.vitals.maxMana),
      bag: battle.bag,
      exp: payout.exp,
      gold: payout.gold,
      tamed: battle.tamed,
      notice: names ? `${notice} Đội thú: ${names}.` : notice,
      victory: payout.victory,
      petExp: payout.pets.map(({ id, exp, hp, mp }) => ({ id, exp, hp, mp })),
      drops: payout.drops,
    });
  };

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const openTame = () => {
    try {
      if (!battle || battle.over || paused || battle.turnId !== 'player' || tameId) return;
      const available = countNets(battle.bag);
      if (!(available > 0)) {
        showToast('Hết lưới bắt quái!');
        return;
      }
      const foe = battle.foes.find((entry) => entry && entry.id === focus?.id && entry.hp > 0 && entry.side === 'wild');
      if (!foe || typeof foe.id !== 'string' || !foe.id) {
        showToast('Hãy chọn một quái còn sống.');
        return;
      }
      setTameId(foe.id);
    } catch (error) {
      console.warn('[Game Thư Giãn] Taming could not open.', error);
      setTameId(null);
      showToast('Không mở được lưới.');
    }
  };

  const finishTame = (bonuses: number[]) => {
    try {
      const id = tameFoe?.id ?? null;
      const rolls = Array.isArray(bonuses) ? bonuses.filter((bonus) => Number.isFinite(bonus)) : [];
      setTameId(null);
      if (!id) return;
      setBattle((current) => {
        if (!current) return current;
        try {
          return actTame(current, id, rolls, Math.random());
        } catch (error) {
          console.warn('[Game Thư Giãn] Taming could not resolve.', error);
          return current;
        }
      });
    } catch (error) {
      console.warn('[Game Thư Giãn] Taming could not resolve.', error);
      setTameId(null);
    }
  };

  const confirmAttack = () => {
    setBattle((current) => {
      if (!current || current.over) return current;
      const ally = current.allies.find((entry) => entry.id === current.turnId && entry.hp > 0) ?? null;
      if (current.turnId !== 'player' && !ally) return current;
      const picked = [...current.foes, ...current.allies].find((fighter) => fighter.id === focusId && fighter.hp > 0) ?? null;
      const foe = picked?.side === 'wild' ? picked : picked ? null : current.foes.find((fighter) => fighter.hp > 0) ?? null;
      if (ally) {
        if (actionId !== 'basic') {
          const skill = ally.skills.find((entry) => entry.id === actionId);
          if (skill && skill.power <= 0) return actAlly(current, null, skill.id);
        }
        if (!foe) return { ...current, log: 'Hãy chọn một quái còn sống.' };
        return actAlly(current, foe.id, actionId === 'basic' ? null : actionId);
      }
      if (current.turnId !== 'player') return current;
      if (actionId === 'basic') {
        if (!foe) return { ...current, log: 'Hãy chọn một quái còn sống.' };
        return actBasic(current, foe.id);
      }
      const skill = current.player.skills.find((entry) => entry.id === actionId);
      if (!skill) return current;
      if (skill.power <= 0) return actSkill(current, null, skill.id);
      if (!foe) return { ...current, log: 'Hãy chọn một quái còn sống.' };
      return actSkill(current, foe.id, skill.id);
    });
  };

  const begin = () => {
    if (!ready) return;
    const lead = masteryOf(character?.professionId);
    const allies = captured
      .filter((monster) => allyIds.includes(monster.id))
      .slice(0, 3)
      .map((monster) => applyMastery(makeAlly(monster), lead));
    const foes = (cards[0] && isBoar(cards[0]) ? fieldFoes(encounter) : cards.filter((card) => foeIds.includes(card.id))).map(makeWild);
    const next = startBattle(
      playerPreview,
      allies,
      foes,
      world.bag.map((stack) => ({ ...stack })),
      world.vitals.stamina,
      world.vitals.maxStamina,
    );
    setFocusId(next.foes[0]?.id ?? null);
    setBattle(next);
  };

  const retry = () => {
    if (!battle) return;
    world.returnToSquad({
      vitals: battleVitals(battle, world.vitals.maxHp, world.vitals.maxMana),
      bag: battle.bag,
      pets: battle.allies.map((ally) => ({
        id: ally.id.startsWith('ally-') ? ally.id.slice('ally-'.length) : ally.id,
        hp: Math.max(0, ally.hp),
        mp: Math.max(0, ally.mp),
      })),
    });
  };

  const toggleId = <T extends string>(list: T[], id: T, max: number, set: (next: T[]) => void) => {
    if (list.includes(id)) set(list.filter((entry) => entry !== id));
    else if (list.length < max) set([...list, id]);
  };

  return (
    <View
      testID="field-battle"
      style={styles.screen}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setScreen((current) => (current.w === width && current.h === height ? current : { w: width, h: height }));
      }}
    >
      <Image source={ARENA} resizeMode="cover" pointerEvents="none" style={styles.arena} />
      <SafeAreaView style={styles.frame} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <RoundButton label={paused ? '▶' : 'Dừng'} hint="Tạm dừng" disabled={!battle || Boolean(battle.over)} hot={paused} onPress={() => setPaused((value) => !value)} testID="battle-pause" size={s(36)} width={s(72)} font={font(12)} />
          <RoundButton label={auto ? 'Tự: Bật' : 'Tự: Tắt'} hint={auto ? 'Tắt tự động đánh' : 'Bật tự động đánh'} disabled={!battle || Boolean(battle.over)} hot={auto} onPress={() => setAuto((value) => !value)} testID="battle-auto" size={s(36)} width={s(78)} font={font(11)} />
        </View>
        <View style={styles.timeline}>
          {battle
            ? battle.order.map((id) => {
                const fighter = lineup.find((entry) => entry.id === id);
                if (!fighter) return null;
                return (
                  <TimelineFace
                    key={id}
                    fighter={fighter}
                    active={battle.turnId === id && !battle.over}
                    size={s(30)}
                    character={fighter.side === 'player' ? character : null}
                    hairColor={setup.player?.hairColor}
                    outfitColor={setup.player?.outfitColor}
                  />
                );
              })
            : null}
        </View>
      </View>

      <View
        style={styles.stage}
        onLayout={(event) => {
          const { x, y } = event.nativeEvent.layout;
          setStageBox((current) => (current.x === x && current.y === y ? current : { x, y }));
        }}
      >
        <CourtUnit
          fighter={player}
          slot={foot(BATTLE_GRID_POSITIONS.player)}
          active={Boolean(battle && battle.turnId === player.id)}
          face="right"
          size={s(118)}
          statFont={font(10)}
          barWidth={s(104)}
          testID="court-player"
          character={character}
          hairColor={setup.player.hairColor}
          outfitColor={setup.player.outfitColor}
        />
        {shownAllies.map((fighter, index) => (
          <CourtUnit
            key={fighter.id}
            fighter={fighter}
            slot={foot(petCells[index] ?? petCells[0])}
            active={battle ? battle.turnId === fighter.id : allyIds.includes(rawId(fighter.id))}
            face="right"
            size={Math.round(s(64) * 0.8)}
            statFont={font(10)}
            barWidth={s(86)}
            testID={`court-ally-${index}`}
            onPress={battle ? undefined : () => toggleId(allyIds, rawId(fighter.id), 3, setPickedAllies)}
          />
        ))}
        {shownFoes.map((fighter, index) => (
          <CourtUnit
            key={fighter.id}
            fighter={fighter}
            slot={foot(foeCells[index] ?? foeCells[0])}
            active={Boolean(battle && battle.turnId === fighter.id)}
            targeted={battle ? focus?.id === fighter.id && fighter.hp > 0 : true}
            face="left"
            size={Math.round((boarPack ? s(56) : s(64)) * 0.8)}
            statFont={font(10)}
            barWidth={boarPack ? s(72) : s(86)}
            front={foeCells[index] === BATTLE_GRID_POSITIONS.enemy3}
            testID={`court-foe-${index}`}
            onPress={
              battle
                ? fighter.hp > 0
                  ? () => setFocusId(fighter.id)
                  : undefined
                : () => toggleId(foeIds, fighter.id, 3, setPickedFoes)
            }
          />
        ))}
        {floats.map((note) => {
          const anchor = floatAnchor(note.fighterId, player.id, shownAllies, shownFoes, foot, petCells, foeCells, s, boarPack);
          if (!anchor) return null;
          const stack = floats.filter((entry) => entry.fighterId === note.fighterId);
          const index = stack.findIndex((entry) => entry.id === note.id);
          return (
            <FloatingCombatText
              key={note.id}
              amount={note.amount}
              x={anchor.x + (index - (stack.length - 1) / 2) * 16}
              y={anchor.y}
              onDone={() => setFloats((current) => current.filter((entry) => entry.id !== note.id))}
            />
          );
        })}
        {paused && battle ? (
          <Text style={[styles.pauseBanner, { fontSize: font(14) }]}>Tạm dừng</Text>
        ) : (
          <Text style={[styles.log, { fontSize: font(11) }]} numberOfLines={1}>
            {battle
              ? `${battle.over === 'win' ? 'Chiến thắng. ' : battle.over === 'lose' ? 'Thất bại. ' : ''}${battle.log}`
              : `Chọn 3 địch${allyNeed ? ` và ${allyNeed} đồng đội` : ''}${itemNeed ? ' và 1 vật phẩm' : ''}.`}
          </Text>
        )}
      </View>

      <View style={styles.dock}>
        <View style={styles.targets}>
          {!battle && captured.length > 0 ? (
            <>
              <Text style={[styles.dockLabel, { fontSize: font(10) }]} numberOfLines={1}>
                Đã thu phục · {allyIds.length}/{allyNeed}
              </Text>
              <View style={[styles.targetRow, styles.rosterRow]}>
                {captured.map((monster) => {
                  const on = allyIds.includes(monster.id);
                  return (
                    <Pressable
                      key={monster.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${monster.name} Đã thu phục`}
                      onPress={() => toggleId(allyIds, monster.id, 3, setPickedAllies)}
                      style={[styles.target, { width: s(32), height: s(32), borderRadius: s(16) }, on && styles.targetOn]}
                    >
                      <FaceArt kindId={monster.kindId} tint={monster.tint} name={monster.name} size={s(32)} facing="right" />
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
          <Text style={[styles.dockLabel, { fontSize: font(10) }]} numberOfLines={1}>
            {battle && marked
              ? `${marked.name}: ${marked.basic?.name ?? 'Đòn thường'} · ${(marked.skills ?? []).map((skill) => skill.name).join(' · ')}`
              : 'Mục tiêu'}
          </Text>
          <View style={styles.targetRow}>
            {battle
              ? battle.foes.map((fighter, index) => {
                  const on = marked?.id === fighter.id;
                  return (
                    <Pressable
                      key={fighter.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Mục tiêu ${index + 1} ${fighter.name}`}
                      testID={`target-${index + 1}`}
                      disabled={fighter.hp <= 0}
                      onPress={() => setFocusId(fighter.id)}
                      style={[styles.square, { width: s(44), height: s(44) }, on && styles.targetOn, fighter.hp <= 0 && styles.fainted]}
                    >
                      <Text style={styles.slotIndex}>{index + 1}</Text>
                      <FaceArt kindId={fighter.kindId} tint={fighter.tint} name={fighter.name} size={s(26)} facing="left" />
                    </Pressable>
                  );
                })
              : cards.slice(0, 6).map((fighter) => {
                  const on = foeIds.includes(fighter.id);
                  return (
                    <Pressable
                      key={fighter.id}
                      accessibilityRole="button"
                      accessibilityLabel={fighter.name}
                      onPress={() => toggleId(foeIds, fighter.id, 3, setPickedFoes)}
                      style={[styles.target, { width: s(32), height: s(32), borderRadius: s(16) }, on && styles.targetOn]}
                    >
                      <FaceArt kindId={fighter.kindId} tint={fighter.tint} name={fighter.name} size={s(32)} facing="left" />
                    </Pressable>
                  );
                })}
          </View>
        </View>
        <View style={styles.commands}>
          {!battle ? (
            <>
              {playerPreview.basics.map((skill) => (
                <RoundButton
                  key={skill.id}
                  label={skill.name}
                  hint="Đòn đánh thường"
                  square
                  hot={(basicId ?? playerPreview.basic.id) === skill.id}
                  onPress={() => setBasicId(skill.id)}
                  size={s(48)}
                  font={font(10)}
                />
              ))}
              {consumables.map((stack) => (
                <RoundButton
                  key={stack.itemId}
                  label={shortItem(stack.itemId)}
                  tint={ITEMS[stack.itemId].tint}
                  hot={itemIds.includes(stack.itemId)}
                  onPress={() => toggleId(itemIds, stack.itemId, 1, setPickedItems)}
                  size={s(44)}
                  font={font(10)}
                />
              ))}
              <RoundButton label="Vào" hint="Vào trận" hot={ready} disabled={!ready} onPress={begin} testID="battle-start" size={s(52)} font={font(12)} tint="#e25b2a" />
            </>
          ) : battle.over ? null : (
            <>
              {actingAlly ? null : (
                <RoundButton
                  label={nets > 0 ? `Lưới ×${nets}` : 'Lưới'}
                  hint={nets > 0 ? `Thu phục, còn ${nets} lưới` : 'Hết lưới bắt quái!'}
                  square
                  tint="#3cba45"
                  disabled={!playerTurn}
                  dim={nets <= 0}
                  testID="tame-open"
                  onPress={openTame}
                  size={s(48)}
                  font={font(10)}
                />
              )}
              <RoundButton
                label="Đánh thường"
                hint={`Đòn đánh thường ${(actingAlly ?? battle.player).basic?.name ?? 'Đòn thường'}`}
                square
                picked={actionId === 'basic'}
                disabled={!commandTurn}
                testID="battle-basic"
                onPress={() => setActionId('basic')}
                size={s(48)}
                font={font(10)}
              />
              {((actingAlly ?? battle.player).skills ?? []).slice(0, 2).map((skill, index) => {
                const actor = actingAlly ?? battle.player;
                const wait = actor.cooldowns[skill.id] ?? 0;
                return (
                  <RoundButton
                    key={skill.id}
                    label={wait > 0 ? String(wait) : skill.name}
                    hint={`Chiêu ${index + 1} ${skill.name}`}
                    square
                    tint="#7fd0c4"
                    hot={actionId === skill.id}
                    disabled={!commandTurn || actor.mp < skill.mana || wait > 0}
                    testID={`battle-skill-${index + 1}`}
                    onPress={() => setActionId(skill.id)}
                    size={s(48)}
                    font={font(10)}
                  />
                );
              })}
              <RoundButton
                label="Xác nhận"
                hint="Xác nhận tấn công"
                square
                tint="#e23a22"
                hot
                disabled={!commandTurn}
                testID="battle-confirm"
                onPress={confirmAttack}
                size={s(48)}
                font={font(10)}
              />
            </>
          )}
        </View>
      </View>

      </SafeAreaView>
      {toast ? (
        <View pointerEvents="none" style={styles.toast} testID="battle-toast">
          <Text style={[styles.toastLabel, { fontSize: font(13) }]}>{toast}</Text>
        </View>
      ) : null}
      {tameFoe?.id ? (
        <TamingMiniGameModal
          key={tameFoe.id}
          monsterName={tameFoe.name || 'Quái'}
          lowHp={tameFoe.maxHp > 0 && tameFoe.hp / tameFoe.maxHp <= 0.05}
          onClose={() => setTameId(null)}
          onFinish={finishTame}
        />
      ) : null}
      {rewards && battle?.over ? (
        <EndGameModal
          victory={rewards.victory}
          members={expMembers(battle, rewards, world.adventureLevel, world.adventureExp, world.tamed)}
          slots={rewards.victory ? lootSlots(rewards) : []}
          onConfirm={finish}
          onRetry={retry}
        />
      ) : null}
    </View>
  );
}

function expMembers(
  battle: BattleState,
  rewards: BattleRewards,
  level: number,
  exp: number,
  tamed: { id: string; level: number; exp: number }[],
): ExpMember[] {
  const members: ExpMember[] = [
    {
      id: 'player',
      name: battle.player.name || 'Bạn',
      level,
      exp,
      gain: rewards.exp,
    },
  ];
  for (const pet of rewards.pets) {
    if (pet.exp <= 0) continue;
    const saved = tamed.find((monster) => monster.id === pet.id);
    const ally = battle.allies.find((fighter) => fighter.id === `ally-${pet.id}`);
    members.push({
      id: pet.id,
      name: pet.name,
      level: saved?.level ?? ally?.level ?? 1,
      exp: saved?.exp ?? ally?.exp ?? 0,
      gain: pet.exp,
    });
  }
  return members;
}

function lootSlots(rewards: BattleRewards): LootSlot[] {
  const slots: LootSlot[] = [];
  if (rewards.gold > 0) slots.push({ id: 'gold', label: 'Vàng', detail: `+${rewards.gold}`, tint: '#e4c27a' });
  for (const drop of rewards.drops) {
    slots.push({
      id: `${drop.itemId}-${slots.length}`,
      label: lootLabel(drop.itemId),
      detail: drop.itemId === 'berry' || drop.itemId === 'mana-fruit' || drop.itemId === 'hearty-fruit' ? ITEMS[drop.itemId].nameVi : `×${drop.qty}`,
      tint: ITEMS[drop.itemId].tint,
    });
  }
  return slots;
}

function lootLabel(itemId: string): string {
  if (itemId === 'hp-potion') return 'Bình máu';
  if (itemId === 'mana-potion') return 'Bình mana';
  if (itemId === 'berry' || itemId === 'mana-fruit' || itemId === 'hearty-fruit') return 'Thức ăn';
  return 'Vật phẩm';
}

function floatAnchor(
  fighterId: string,
  playerId: string,
  allies: { id: string }[],
  foes: { id: string }[],
  foot: (cell: string) => { x: number; y: number },
  petCells: string[],
  foeCells: string[],
  s: (value: number) => number,
  boarPack: boolean,
): { x: number; y: number } | null {
  if (fighterId === playerId) {
    const slot = foot(BATTLE_GRID_POSITIONS.player);
    return { x: slot.x, y: slot.y - s(118) - s(36) };
  }
  const allyIndex = allies.findIndex((fighter) => fighter.id === fighterId);
  if (allyIndex >= 0) {
    const slot = foot(petCells[allyIndex] ?? petCells[0]);
    const size = Math.round(s(64) * 0.8);
    return { x: slot.x, y: slot.y - size - s(36) };
  }
  const foeIndex = foes.findIndex((fighter) => fighter.id === fighterId);
  if (foeIndex >= 0) {
    const slot = foot(foeCells[foeIndex] ?? foeCells[0]);
    const size = Math.round((boarPack ? s(56) : s(64)) * 0.8);
    return { x: slot.x, y: slot.y - size - s(32) };
  }
  return null;
}

function isBoar(card: Encounter): boolean {
  return /boar/i.test(card.kindId ?? '') || /heo/i.test(card.name);
}

function fieldFoes(encounter: Encounter): Encounter[] {
  const cards = roster(encounter);
  const lead = cards[0];
  if (!lead || !isBoar(lead)) return cards.slice(0, 3);
  while (cards.length < 6) {
    const base = cards[cards.length - 1];
    cards.push({ ...base, id: `${base.id}-pack-${cards.length}`, name: `${base.name} ${cards.length + 1}` });
  }
  return cards.slice(0, 6);
}

function roster(encounter: Encounter): Encounter[] {
  const source = encounter.pool?.length ? encounter.pool : [encounter];
  const cards = source.map((card) => ({ ...card, pool: undefined }));
  while (cards.length < 3) {
    const base = cards[cards.length - 1];
    cards.push({ ...base, id: `${base.id}-pack-${cards.length}`, name: `${base.name} ${cards.length + 1}` });
  }
  return cards.slice(0, 6);
}

function rawId(id: string): string {
  return id.replace(/^ally-/, '');
}

function shortItem(itemId: ItemId): string {
  if (itemId === 'hp-potion') return 'Máu';
  if (itemId === 'mana-potion') return 'Mana';
  if (itemId === 'antidote') return 'Độc';
  if (itemId === 'stamina-potion') return 'Lực';
  return 'Bánh';
}

function CourtUnit({
  fighter,
  slot,
  active,
  targeted,
  face,
  size,
  statFont,
  barWidth,
  front,
  testID,
  character,
  hairColor,
  outfitColor,
  onPress,
}: {
  fighter: Fighter;
  slot: { x: number; y: number };
  active?: boolean;
  targeted?: boolean;
  face: 'left' | 'right';
  size: number;
  statFont: number;
  barWidth: number;
  /** Paint this unit above neighbors so a high cell keeps its HUD. */
  front?: boolean;
  testID?: string;
  character?: CharacterDefinition | null;
  hairColor?: string;
  outfitColor?: string;
  onPress?: () => void;
}) {
  const attack = Math.round(fighter.attack);
  const defense = Math.round(fighter.defense);
  const boxW = Math.max(size + 28, barWidth);
  const chrome = 44;
  const labelWidth = Math.max(barWidth, Math.round(statFont * 13));
  const drop = overheadDrop(slot.y, size, chrome);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${fighter.name}, ATK ${attack} / DEF ${defense}`}
      testID={testID}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.unit,
        {
          left: slot.x,
          top: slot.y,
          width: boxW,
          height: size,
          zIndex: (front ? 56 : 8 + Math.min(40, Math.round(slot.y / 8))) + (active ? 4 : 0),
          transform: [{ translateX: -(boxW / 2) }, { translateY: -size }],
        },
        fighter.hp <= 0 && styles.fainted,
      ]}
    >
      <View pointerEvents="none" style={[styles.hud, { top: -chrome + drop, width: labelWidth, marginLeft: (boxW - labelWidth) / 2 }]}>
        <Text style={[styles.statLine, { fontSize: statFont, width: labelWidth }]} numberOfLines={1}>
          ATK {attack} / DEF {defense}
        </Text>
        <FloatBar value={fighter.hp} max={fighter.maxHp} tint="#3cba45" width={barWidth} />
        <FloatBar value={fighter.mp} max={fighter.maxMp} tint="#2f6fe0" width={barWidth} />
      </View>
      <View style={[styles.spriteWrap, { width: size, height: size }]}>
        {active ? <View style={[styles.greenRing, { width: size * 0.9, height: size * 0.32 }]} /> : null}
        {character && hairColor && outfitColor ? (
          <View style={{ transform: [{ scaleX: portraitScaleX(face === 'left' ? -1 : 1, character.professionId, character.gender) }] }}>
            <CharacterAvatar character={character} hairColor={hairColor} outfitColor={outfitColor} size={Math.round(size * 0.82)} />
          </View>
        ) : (
          <FaceArt kindId={fighter.kindId} tint={fighter.tint} name={fighter.name} size={size} facing={face} />
        )}
        {targeted ? (
          <View pointerEvents="none" style={[styles.redRing, { width: size * 1.05, height: size * 0.72, borderRadius: size }]} />
        ) : null}
      </View>
    </Pressable>
  );
}

function FloatBar({ value, max, tint, width }: { value: number; max: number; tint: string; width: number }) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const shown = Math.max(0, Math.round(value));
  return (
    <View style={[styles.floatTrack, { width }]}>
      <View style={[styles.floatFill, { width: `${ratio * 100}%`, backgroundColor: tint }]} />
      <Text style={styles.floatText}>
        {shown}/{max}
      </Text>
    </View>
  );
}

function FaceArt({
  kindId,
  tint,
  name,
  size,
  facing,
}: {
  kindId?: string;
  tint: string;
  name: string;
  size: number;
  facing: 'left' | 'right';
}) {
  const art = kindId ? monsterPortrait(kindId) : null;
  if (!art) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint }]}>
        <Text style={styles.fallbackText}>{name.slice(0, 1)}</Text>
      </View>
    );
  }
  // Same sign as Nữ hộ vệ: art drawn facing right stays put when looking right, and mirrors when looking left.
  const flip = facing === 'right' ? (art.facesRight ? 1 : -1) : art.facesRight ? -1 : 1;
  return <Image accessibilityLabel={name} source={art.source} resizeMode="contain" style={{ width: size, height: size, transform: [{ scaleX: flip }] }} />;
}

function TimelineFace({
  fighter,
  active,
  size,
  character,
  hairColor,
  outfitColor,
}: {
  fighter: Fighter;
  active: boolean;
  size: number;
  character?: CharacterDefinition | null;
  hairColor?: string;
  outfitColor?: string;
}) {
  return (
    <View
      style={[
        styles.timeFace,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: active ? 5 : 4,
          borderColor: fighter.side === 'wild' ? 'red' : 'green',
        },
        fighter.hp <= 0 && styles.fainted,
      ]}
    >
      {fighter.side === 'player' && character && hairColor && outfitColor ? (
        <CharacterAvatar character={character} hairColor={hairColor} outfitColor={outfitColor} size={size} />
      ) : (
        <FaceArt kindId={fighter.kindId} tint={fighter.tint} name={fighter.name} size={size - 2} facing={fighter.side === 'wild' ? 'left' : 'right'} />
      )}
    </View>
  );
}

function countNets(bag: { itemId?: string; qty?: number }[] | null | undefined): number {
  if (!Array.isArray(bag)) return 0;
  const stack = bag.find((entry) => entry?.itemId === 'net');
  const qty = stack?.qty;
  return typeof qty === 'number' && Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
}

function RoundButton({
  label,
  onPress,
  disabled,
  dim,
  hot,
  picked,
  hint,
  testID,
  size,
  font,
  tint,
  square,
  width,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Faded, but the press still runs so an empty stack can explain itself. */
  dim?: boolean;
  hot?: boolean;
  /** Thick solid border, the same weight as the active timeline face. */
  picked?: boolean;
  hint?: string;
  testID?: string;
  size: number;
  font: number;
  tint?: string;
  square?: boolean;
  width?: number;
}) {
  const buttonWidth = width ?? size;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ?? label}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={[
        square ? styles.square : styles.round,
        { width: buttonWidth, height: size, borderRadius: square ? 8 : size / 2, backgroundColor: tint ?? '#24352f' },
        hot && !picked && styles.roundHot,
        picked && styles.picked,
        (disabled || dim) && styles.fainted,
      ]}
    >
      <Text style={[styles.roundLabel, { fontSize: font }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1612', overflow: 'hidden' },
  arena: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  frame: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, zIndex: 4, paddingHorizontal: 8 },
  headerLeft: { flexDirection: 'row', gap: 8 },
  timeline: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5, minWidth: 0 },
  timeFace: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#d7d2c8' },
  stage: { flex: 1, minHeight: 0, overflow: 'hidden' },
  unit: { position: 'absolute', alignItems: 'center' },
  hud: { position: 'absolute', left: 0, alignItems: 'center' },
  spriteWrap: { alignItems: 'center', justifyContent: 'flex-end' },
  greenRing: {
    position: 'absolute',
    bottom: 2,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#7dffb2',
    backgroundColor: 'rgba(80, 220, 120, 0.35)',
  },
  redRing: {
    position: 'absolute',
    bottom: 4,
    borderWidth: 3,
    borderColor: '#ff2d2d',
  },
  statLine: {
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  floatTrack: {
    height: 14,
    borderRadius: 3,
    backgroundColor: 'rgba(20, 24, 22, 0.45)',
    overflow: 'hidden',
    marginBottom: 1,
  },
  floatFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  floatText: { color: '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center', lineHeight: 14 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: '#10211c', fontWeight: '800' },
  pauseBanner: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    color: theme.gold,
    fontWeight: '800',
    backgroundColor: 'rgba(8, 14, 12, 0.72)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 50,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 88,
    zIndex: 70,
    alignItems: 'center',
  },
  toastLabel: {
    color: '#1b140c',
    fontWeight: '800',
    backgroundColor: '#e4c27a',
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  log: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    color: '#f6f1e7',
    textAlign: 'center',
    zIndex: 50,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dock: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, minHeight: 58, paddingHorizontal: 8, paddingBottom: 6 },
  targets: { gap: 2 },
  dockLabel: {
    color: '#f6f1e7',
    fontWeight: '700',
    maxWidth: 240,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  targetRow: { flexDirection: 'row', gap: 6 },
  rosterRow: { flexWrap: 'wrap', maxWidth: 220 },
  target: { overflow: 'hidden', borderWidth: 2, borderColor: '#9aa89f', backgroundColor: '#d7d2c8' },
  targetOn: { borderColor: '#ff2d2d' },
  commands: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: '#24352f',
  },
  slotIndex: {
    position: 'absolute',
    top: 1,
    left: 3,
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    zIndex: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  round: { alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  roundHot: { borderColor: '#7dffb2' },
  picked: { borderWidth: 5, borderColor: '#2f6fe0', borderStyle: 'solid' },
  roundLabel: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  fainted: { opacity: 0.35 },
});
