import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingCombatText } from '../components/battle/FloatingCombatText';
import { TurnTimeline } from '../components/battle/TurnTimeline';
import { BATTLE_GRID_POSITIONS, feetInView } from '../components/battle/courtSlots';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { CourtUnit, FaceArt, RoundButton, TimelineFace, styles as court, timelineFaceSize, type CourtActor } from '../components/battle/courtChrome';
import { getCharacter } from '../data/characters';
import type { CombatAction, DuelPet, FighterView } from '../net/protocol';
import { useBattle } from '../state/BattleContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

const ARENA = require('../../assets/images/sandau_2.jpg');

const ACTIONS: { id: CombatAction; label: string }[] = [
  { id: 'attack', label: 'Đánh thường' },
  { id: 'skill', label: 'Kỹ năng' },
  { id: 'defend', label: 'Phòng thủ' },
];

const PET_CELLS = [BATTLE_GRID_POSITIONS.pet1, BATTLE_GRID_POSITIONS.pet2, BATTLE_GRID_POSITIONS.pet3];
const FOE_PET_CELLS = [BATTLE_GRID_POSITIONS.enemy2, BATTLE_GRID_POSITIONS.enemy3, BATTLE_GRID_POSITIONS.boar1];
const PET_TINTS = ['#c4a574', '#7aa2c4', '#8fbf7a'];

/**
 * The same court as a wild encounter. You stand on the hero cell, your pets
 * hold the squad cells, and the opponent stands on the lead foe cell.
 * The server still resolves both locked actions after 30 seconds.
 */
export function ArenaScreen() {
  const battle = useBattle();
  const snapshot = battle.battle;
  const { s, font } = useLayout();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState({ w: 0, h: 0 });
  const [stageBox, setStageBox] = useState({ x: 0, y: 0 });
  const [now, setNow] = useState(Date.now());
  const [picked, setPicked] = useState<CombatAction>('attack');
  const [floats, setFloats] = useState<{ id: number; fighterId: string; amount: number }[]>([]);
  const hpWatch = useRef<Map<string, number> | null>(null);
  const floatSerial = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPicked('attack');
  }, [snapshot?.round]);

  const you = snapshot ? personActor('you', snapshot.you, 'player') : null;
  const foe = snapshot ? personActor('foe', snapshot.opponent, 'wild') : null;
  const yourPets = snapshot ? (snapshot.you.pets ?? []).slice(0, 3).map((pet, index) => petActor('ally', pet, index, 'ally')) : [];
  const foePets = snapshot ? (snapshot.opponent.pets ?? []).slice(0, 3).map((pet, index) => petActor('wild', pet, index, 'wild')) : [];
  const cast = you && foe ? [you, ...yourPets, foe, ...foePets] : [];

  useEffect(() => {
    if (!you || !foe) {
      hpWatch.current = null;
      setFloats((current) => (current.length === 0 ? current : []));
      return;
    }
    const previous = hpWatch.current;
    const next = new Map(cast.map((fighter) => [fighter.id, fighter.hp]));
    hpWatch.current = next;
    if (!previous) return;
    const born: { id: number; fighterId: string; amount: number }[] = [];
    for (const fighter of cast) {
      if (!previous.has(fighter.id)) continue;
      const delta = fighter.hp - (previous.get(fighter.id) ?? fighter.hp);
      if (!Number.isFinite(delta) || delta === 0) continue;
      floatSerial.current += 1;
      born.push({ id: floatSerial.current, fighterId: fighter.id, amount: delta });
    }
    if (born.length > 0) setFloats((current) => [...current, ...born].slice(-24));
  }, [snapshot?.you.hp, snapshot?.opponent.hp, snapshot?.round, snapshot?.status]);

  if (!snapshot || !you || !foe) return null;

  const finished = snapshot.status === 'finished';
  const locked = finished || snapshot.you.ready;
  const youWon = snapshot.winnerId === snapshot.you.userId;
  const draw = finished && snapshot.winnerId === null;
  const resultTitle = draw ? 'Hòa' : youWon ? 'Chiến thắng' : 'Thất bại';
  const seconds = Math.max(0, Math.ceil((snapshot.deadline - now) / 1000));
  const activeId = finished ? null : snapshot.you.ready ? foe.id : you.id;
  const living = cast.filter((fighter) => fighter.hp > 0).map((fighter) => fighter.id);
  const start = activeId ? living.indexOf(activeId) : 0;
  const turnQueue = start > 0 ? [...living.slice(start), ...living.slice(0, start)] : living;
  const faceSize = timelineFaceSize(screen.w, insets.left, insets.right, turnQueue.length, s(30), s(72) + s(78) + 36);
  const foot = (cell: string) => feetInView(cell, screen.w, screen.h, insets.left + stageBox.x, insets.top + stageBox.y);
  const heroSize = s(118);
  const petSize = Math.round(s(64) * 0.8);
  const youCharacter = getCharacter(snapshot.you.baseAvatarId);
  const foeCharacter = getCharacter(snapshot.opponent.baseAvatarId);
  const pickedLabel = ACTIONS.find((action) => action.id === picked)?.label ?? 'Đánh thường';
  const lastLine = snapshot.log[snapshot.log.length - 1] ?? '';
  const log = finished
    ? `${resultTitle}. ${lastLine}`
    : snapshot.you.ready
      ? `Đã khóa đòn. Đang chờ đối thủ. ${lastLine}`
      : `${seconds}s. Hết giờ sẽ tự tấn công. ${lastLine}`;

  const portrait = (id: string) => {
    if (id === you.id) return { character: youCharacter, hairColor: snapshot.you.hairColor, outfitColor: snapshot.you.outfitColor };
    if (id === foe.id) return { character: foeCharacter, hairColor: snapshot.opponent.hairColor, outfitColor: snapshot.opponent.outfitColor };
    return { character: null, hairColor: undefined, outfitColor: undefined };
  };

  return (
    <View
      testID="arena-screen"
      style={court.screen}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setScreen((current) => (current.w === width && current.h === height ? current : { w: width, h: height }));
      }}
    >
      <Image source={ARENA} resizeMode="cover" pointerEvents="none" style={court.arena} />
      <SafeAreaView style={court.frame} edges={['top', 'bottom', 'left', 'right']}>
        <View style={court.header}>
          <View style={court.headerLeft}>
            <RoundButton label={finished ? 'Hết' : `${seconds}s`} hint="Thời gian hiệp" onPress={() => undefined} size={s(36)} width={s(72)} font={font(12)} />
            <RoundButton label={`Hiệp ${snapshot.round}`} hint="Hiệp đấu" onPress={() => undefined} size={s(36)} width={s(78)} font={font(11)} />
          </View>
          <TurnTimeline
            ids={turnQueue}
            activeId={activeId}
            size={faceSize}
            renderFace={(id, role) => {
              const fighter = cast.find((entry) => entry.id === id);
              if (!fighter) return null;
              const face = portrait(id);
              return (
                <TimelineFace
                  fighter={fighter}
                  active={role === 'now'}
                  role={role}
                  size={faceSize}
                  character={face.character}
                  hairColor={face.hairColor}
                  outfitColor={face.outfitColor}
                />
              );
            }}
          />
        </View>

        <View
          style={court.stage}
          onLayout={(event) => {
            const { x, y } = event.nativeEvent.layout;
            setStageBox((current) => (current.x === x && current.y === y ? current : { x, y }));
          }}
        >
          <CourtUnit
            fighter={you}
            slot={foot(BATTLE_GRID_POSITIONS.player)}
            active={activeId === you.id}
            face="right"
            size={heroSize}
            statFont={font(10)}
            barWidth={s(104)}
            testID="arena-you"
            character={youCharacter}
            hairColor={snapshot.you.hairColor}
            outfitColor={snapshot.you.outfitColor}
          />
          {yourPets.map((fighter, index) => (
            <CourtUnit
              key={fighter.id}
              fighter={fighter}
              slot={foot(PET_CELLS[index] ?? PET_CELLS[0])}
              active={activeId === fighter.id}
              face="right"
              size={petSize}
              statFont={font(10)}
              barWidth={s(86)}
              testID={`court-ally-${index}`}
            />
          ))}
          <CourtUnit
            fighter={foe}
            slot={foot(BATTLE_GRID_POSITIONS.enemy1)}
            active={activeId === foe.id}
            targeted={!finished && foe.hp > 0}
            face="left"
            size={petSize}
            statFont={font(10)}
            barWidth={s(86)}
            testID="arena-opponent"
            character={foeCharacter}
            hairColor={snapshot.opponent.hairColor}
            outfitColor={snapshot.opponent.outfitColor}
          />
          {foePets.map((fighter, index) => (
            <CourtUnit
              key={fighter.id}
              fighter={fighter}
              slot={foot(FOE_PET_CELLS[index] ?? FOE_PET_CELLS[0])}
              active={activeId === fighter.id}
              face="left"
              size={petSize}
              statFont={font(10)}
              barWidth={s(86)}
              front={FOE_PET_CELLS[index] === BATTLE_GRID_POSITIONS.enemy3}
              testID={`court-foe-${index}`}
            />
          ))}
          {floats.map((note) => {
            const anchor = floatAnchor(note.fighterId, foot, yourPets, foePets, heroSize, petSize, s);
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
          <Text style={[court.log, { fontSize: font(11) }]} numberOfLines={1}>
            {log}
          </Text>
        </View>

        <View style={court.dock}>
          <View style={court.targets}>
            <Text style={[court.dockLabel, { fontSize: font(10) }]} numberOfLines={1}>
              {foe.name}: {pickedLabel}
            </Text>
            <View style={court.targetRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mục tiêu 1 ${foe.name}`}
                testID="target-1"
                disabled
                style={[court.square, { width: s(44), height: s(44) }, court.targetOn, foe.hp <= 0 && court.fainted]}
              >
                <Text style={court.slotIndex}>1</Text>
                {foeCharacter ? (
                  <CharacterAvatar character={foeCharacter} hairColor={snapshot.opponent.hairColor} outfitColor={snapshot.opponent.outfitColor} size={s(26)} />
                ) : (
                  <FaceArt tint={foe.tint} name={foe.name} size={s(26)} facing="left" />
                )}
              </Pressable>
              {foePets.map((fighter, index) => (
                <View key={fighter.id} style={[court.square, { width: s(44), height: s(44) }, fighter.hp <= 0 && court.fainted]}>
                  <Text style={court.slotIndex}>{index + 2}</Text>
                  <FaceArt tint={fighter.tint} name={fighter.name} size={s(26)} facing="left" />
                </View>
              ))}
            </View>
          </View>
          <View style={court.commands}>
            {finished ? null : (
              <>
                {ACTIONS.map((action) => (
                  <RoundButton
                    key={action.id}
                    label={action.label}
                    hint={action.label}
                    square
                    picked={picked === action.id}
                    disabled={locked}
                    testID={`action-${action.id}`}
                    onPress={() => setPicked(action.id)}
                    size={s(48)}
                    font={font(10)}
                    tint={action.id === 'skill' ? '#7fd0c4' : undefined}
                  />
                ))}
                <RoundButton
                  label="Xác nhận"
                  hint="Xác nhận đòn"
                  square
                  tint="#e23a22"
                  hot
                  disabled={locked}
                  testID="battle-confirm"
                  onPress={() => battle.sendAction(picked)}
                  size={s(48)}
                  font={font(10)}
                />
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
      {finished ? (
        <View style={styles.overlay}>
          <View style={[styles.result, { borderRadius: s(18), padding: s(18), gap: s(8) }]}>
            <Text style={[styles.resultTitle, { fontSize: font(28) }]}>{resultTitle}</Text>
            <Text style={[styles.resultCopy, { fontSize: font(14) }]}>
              {snapshot.you.name} {snapshot.you.hp}/{snapshot.you.maxHp} · {snapshot.opponent.name} {snapshot.opponent.hp}/{snapshot.opponent.maxHp}
            </Text>
            <RoundButton testID="leave-battle" label="Về sảnh" hint="Rời trận" hot tint="#e23a22" onPress={battle.leaveBattle} size={s(48)} font={font(12)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function personActor(id: string, fighter: FighterView, side: CourtActor['side']): CourtActor {
  const maxMp = Math.max(10, fighter.level * 8);
  return {
    id,
    name: fighter.name,
    side,
    tint: side === 'wild' ? '#d9897a' : '#e4c27a',
    hp: fighter.hp,
    maxHp: fighter.maxHp,
    mp: fighter.hp > 0 ? maxMp : 0,
    maxMp,
    attack: fighter.attack,
    defense: fighter.defense,
  };
}

function petActor(prefix: string, pet: DuelPet, index: number, side: CourtActor['side']): CourtActor {
  const level = Math.max(1, pet.level);
  const maxMp = Math.max(10, level * 8);
  return {
    id: `${prefix}-${index}`,
    name: pet.name,
    side,
    tint: PET_TINTS[index] ?? PET_TINTS[0],
    hp: pet.hp,
    maxHp: Math.max(1, pet.maxHp),
    mp: pet.hp > 0 ? maxMp : 0,
    maxMp,
    attack: 6 + level * 2,
    defense: 3 + level,
  };
}

function floatAnchor(
  fighterId: string,
  foot: (cell: string) => { x: number; y: number },
  allies: { id: string }[],
  foes: { id: string }[],
  heroSize: number,
  petSize: number,
  s: (value: number) => number,
): { x: number; y: number } | null {
  if (fighterId === 'you') {
    const slot = foot(BATTLE_GRID_POSITIONS.player);
    return { x: slot.x, y: slot.y - heroSize - s(36) };
  }
  if (fighterId === 'foe') {
    const slot = foot(BATTLE_GRID_POSITIONS.enemy1);
    return { x: slot.x, y: slot.y - petSize - s(32) };
  }
  const allyIndex = allies.findIndex((fighter) => fighter.id === fighterId);
  if (allyIndex >= 0) {
    const slot = foot(PET_CELLS[allyIndex] ?? PET_CELLS[0]);
    return { x: slot.x, y: slot.y - petSize - s(36) };
  }
  const foeIndex = foes.findIndex((fighter) => fighter.id === fighterId);
  if (foeIndex >= 0) {
    const slot = foot(FOE_PET_CELLS[foeIndex] ?? FOE_PET_CELLS[0]);
    return { x: slot.x, y: slot.y - petSize - s(32) };
  }
  return null;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  result: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.gold,
  },
  resultTitle: { color: theme.gold, fontWeight: '800', textAlign: 'center' },
  resultCopy: { color: theme.muted, textAlign: 'center' },
});
