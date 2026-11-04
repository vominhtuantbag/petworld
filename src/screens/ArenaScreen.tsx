import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FloatingCombatText } from '../components/battle/FloatingCombatText';
import { TurnTimeline } from '../components/battle/TurnTimeline';
import { BATTLE_GRID_POSITIONS, feetInView } from '../components/battle/courtSlots';
import { RankStars } from '../components/arena/RankStars';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { CourtUnit, FaceArt, RoundButton, TimelineFace, styles as court, timelineFaceSize, type CourtActor } from '../components/battle/courtChrome';
import { getCharacter } from '../data/characters';
import { useSocketCombatFx } from '../hooks/useSocketCombatFx';
import type { DuelUnitView } from '../net/protocol';
import { useBattle } from '../state/BattleContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';
import { rankTint, rankTitle } from '../world/ranks';

const ARENA = require('../../assets/images/sandau_2.jpg');

const PET_CELLS = [BATTLE_GRID_POSITIONS.pet1, BATTLE_GRID_POSITIONS.pet2, BATTLE_GRID_POSITIONS.pet3];
const FOE_PET_CELLS = ['J21', 'H23', 'G19'];
const PET_TINTS = ['#c4a574', '#7aa2c4', '#8fbf7a'];

type Pick = 'attack' | 0 | 1;

/**
 * Same court as a wild fight. Each hero and pet acts on its own speed turn.
 * Confirm resolves that turn immediately. At 0 the server swings a basic attack.
 */
export function ArenaScreen() {
  const battle = useBattle();
  const snapshot = battle.battle;
  const { s, font } = useLayout();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState({ w: 0, h: 0 });
  const [stageBox, setStageBox] = useState({ x: 0, y: 0 });
  const [now, setNow] = useState(Date.now());
  const [picked, setPicked] = useState<Pick>('attack');
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPicked('attack');
  }, [snapshot?.turnId]);

  const units = snapshot?.units ?? [];
  const youHero = units.find((unit) => unit.side === 'you' && unit.kind === 'hero') ?? null;
  const foeHero = units.find((unit) => unit.side === 'opponent' && unit.kind === 'hero') ?? null;
  const yourPets = units.filter((unit) => unit.side === 'you' && unit.kind === 'pet').slice(0, 3);
  const foePets = units.filter((unit) => unit.side === 'opponent' && unit.kind === 'pet').slice(0, 3);
  const cast = units.map(toCourt);
  const foes = units.filter((unit) => unit.side === 'opponent' && unit.hp > 0);
  const focus = foes.find((unit) => unit.id === focusId) ?? foes[0] ?? null;
  const finishedEarly = snapshot?.status === 'finished';
  const footMemo = useMemo(() => {
    return (cell: string) => feetInView(cell, screen.w, screen.h, insets.left + stageBox.x, insets.top + stageBox.y);
  }, [insets.left, insets.top, screen.h, screen.w, stageBox.x, stageBox.y]);
  const slotOf = useMemo(() => {
    return (id: string) => {
      if (!youHero || !foeHero) return null;
      if (id === youHero.id) return footMemo(BATTLE_GRID_POSITIONS.player);
      if (id === foeHero.id) return footMemo('G28');
      const allyIndex = yourPets.findIndex((unit) => unit.id === id);
      if (allyIndex >= 0) return footMemo(PET_CELLS[allyIndex] ?? PET_CELLS[0]);
      const foeIndex = foePets.findIndex((unit) => unit.id === id);
      if (foeIndex >= 0) return footMemo(FOE_PET_CELLS[foeIndex] ?? FOE_PET_CELLS[0]);
      return null;
    };
  }, [foeHero, foePets, footMemo, youHero, yourPets]);
  const { floats, dismissFloat, steps, slashes, shakes } = useSocketCombatFx({
    units,
    turnId: finishedEarly ? null : snapshot?.turnId ?? null,
    focusId: focus?.id ?? null,
    lastHit: snapshot?.lastHit,
    lastLog: snapshot?.log[snapshot.log.length - 1],
    slotOf,
    finished: finishedEarly,
  });

  if (!snapshot || !youHero || !foeHero) return null;

  const finished = snapshot.status === 'finished';
  const yourTurn = snapshot.yourTurn && !finished;
  const youWon = snapshot.winnerId === snapshot.you.userId;
  const draw = finished && snapshot.winnerId === null;
  const starNote = snapshot.rank?.starDelta ?? snapshot.starDelta;
  const starLabel = starNote ? (starNote > 0 ? ' · +1 sao' : ' · −1 sao') : '';
  const resultTitle = draw ? 'Hòa' : youWon ? `Chiến thắng${starLabel}` : `Thất bại${starLabel}`;
  const resultRank = snapshot.rank;
  const seconds = Math.max(0, Math.ceil((snapshot.deadline - now) / 1000));
  const actor = units.find((unit) => unit.id === snapshot.turnId) ?? null;
  const queued = snapshot.queue ?? [];
  const turnQueue = queued.length > 0 ? queued : cast.filter((unit) => unit.hp > 0).map((unit) => unit.id);
  const faceSize = timelineFaceSize(screen.w, insets.left, insets.right, turnQueue.length, s(30), s(72) + s(78) + 36);
  const foot = footMemo;
  const heroSize = s(118);
  const petSize = Math.round(s(64) * 0.8);
  const foeHeroSize = Math.round(petSize * 1.5);
  const youCharacter = getCharacter(snapshot.you.baseAvatarId);
  const foeCharacter = getCharacter(snapshot.opponent.baseAvatarId);
  const skillCard1 = snapshot.skills?.[0];
  const skillCard2 = snapshot.skills?.[1];
  const skill1 = skillCard1?.name ?? 'Kỹ năng 1';
  const skill2 = skillCard2?.name ?? 'Kỹ năng 2';
  const skill1Wait = skillCard1?.wait ?? 0;
  const skill2Wait = skillCard2?.wait ?? 0;
  const skill1Locked = skill1Wait > 0 || (actor != null && (skillCard1?.mana ?? 0) > (actor.mp ?? 0));
  const skill2Locked = skill2Wait > 0 || (actor != null && (skillCard2?.mana ?? 0) > (actor.mp ?? 0));
  const pickedLabel = picked === 0 ? skill1 : picked === 1 ? skill2 : 'Đánh thường';
  const lastLine = snapshot.log[snapshot.log.length - 1] ?? '';
  const log = finished
    ? `${resultTitle}. ${lastLine}`
    : yourTurn
      ? `${seconds}s. ${actor?.name ?? 'Bạn'} đang ra đòn. ${lastLine}`
      : `Đợi ${actor?.name ?? 'đối thủ'}. ${lastLine}`;

  const portrait = (id: string) => {
    if (id === youHero.id) return { character: youCharacter, hairColor: snapshot.you.hairColor, outfitColor: snapshot.you.outfitColor };
    if (id === foeHero.id) return { character: foeCharacter, hairColor: snapshot.opponent.hairColor, outfitColor: snapshot.opponent.outfitColor };
    return { character: null, hairColor: undefined, outfitColor: undefined };
  };

  const confirm = () => {
    if (!yourTurn || !focus) return;
    if (picked === 0 && skill1Locked) return;
    if (picked === 1 && skill2Locked) return;
    if (picked === 'attack') battle.sendAction('attack', focus.id);
    else battle.sendAction('skill', focus.id, picked);
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
            <RoundButton label={finished ? 'Hết' : `${seconds}s`} hint="Thời gian lượt" onPress={() => undefined} size={s(36)} width={s(72)} font={font(12)} />
            <RoundButton
              label={snapshot.ranked ? `HIỆP ${snapshot.bout ?? 1}/3 · ${snapshot.boutScore?.you ?? 0}-${snapshot.boutScore?.opponent ?? 0}` : `Hiệp ${snapshot.round}`}
              hint={snapshot.ranked ? 'Best of 3' : 'Hiệp đấu'}
              onPress={() => undefined}
              size={s(36)}
              width={s(118)}
              font={font(10)}
            />
          </View>
          <TurnTimeline
            ids={turnQueue}
            activeId={finished ? null : snapshot.turnId}
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
            fighter={toCourt(youHero)}
            slot={foot(BATTLE_GRID_POSITIONS.player)}
            active={snapshot.turnId === youHero.id}
            face="right"
            size={heroSize}
            statFont={font(10)}
            barWidth={s(104)}
            testID="arena-you"
            character={youCharacter}
            hairColor={snapshot.you.hairColor}
            outfitColor={snapshot.you.outfitColor}
            step={steps[youHero.id] ?? null}
            slashKey={slashes[youHero.id] ?? 0}
            shakeKey={shakes[youHero.id] ?? 0}
          />
          {yourPets.map((unit, index) => (
            <CourtUnit
              key={unit.id}
              fighter={toCourt(unit)}
              slot={foot(PET_CELLS[index] ?? PET_CELLS[0])}
              active={snapshot.turnId === unit.id}
              face="right"
              size={petSize}
              statFont={font(10)}
              barWidth={s(86)}
              testID={`court-ally-${index}`}
              step={steps[unit.id] ?? null}
              slashKey={slashes[unit.id] ?? 0}
              shakeKey={shakes[unit.id] ?? 0}
            />
          ))}
          <CourtUnit
            fighter={toCourt(foeHero)}
            slot={foot('G28')}
            active={snapshot.turnId === foeHero.id}
            targeted={focus?.id === foeHero.id && foeHero.hp > 0}
            face="left"
            size={foeHeroSize}
            statFont={font(10)}
            barWidth={s(96)}
            testID="arena-opponent"
            character={foeCharacter}
            hairColor={snapshot.opponent.hairColor}
            outfitColor={snapshot.opponent.outfitColor}
            onPress={foeHero.hp > 0 ? () => setFocusId(foeHero.id) : undefined}
            step={steps[foeHero.id] ?? null}
            slashKey={slashes[foeHero.id] ?? 0}
            shakeKey={shakes[foeHero.id] ?? 0}
          />
          {foePets.map((unit, index) => (
            <CourtUnit
              key={unit.id}
              fighter={toCourt(unit)}
              slot={foot(FOE_PET_CELLS[index] ?? FOE_PET_CELLS[0])}
              active={snapshot.turnId === unit.id}
              targeted={focus?.id === unit.id && unit.hp > 0}
              face="left"
              size={petSize}
              statFont={font(10)}
              barWidth={s(86)}
              front={FOE_PET_CELLS[index] === 'G19'}
              testID={`court-foe-${index}`}
              onPress={unit.hp > 0 ? () => setFocusId(unit.id) : undefined}
              step={steps[unit.id] ?? null}
              slashKey={slashes[unit.id] ?? 0}
              shakeKey={shakes[unit.id] ?? 0}
            />
          ))}
          {floats.map((note) => {
            const anchor = floatAnchor(note.fighterId, youHero.id, foeHero.id, yourPets, foePets, foot, heroSize, petSize, foeHeroSize, s);
            if (!anchor) return null;
            const stack = floats.filter((entry) => entry.fighterId === note.fighterId);
            const index = stack.findIndex((entry) => entry.id === note.id);
            return (
              <FloatingCombatText
                key={note.id}
                amount={note.amount}
                kind={note.kind}
                x={anchor.x + (index - (stack.length - 1) / 2) * 16}
                y={anchor.y}
                onDone={() => dismissFloat(note.id)}
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
              {focus ? `${focus.name}: ${pickedLabel}` : 'Mục tiêu'}
            </Text>
            <View style={court.targetRow}>
              {[foeHero, ...foePets].map((unit, index) => {
                const on = focus?.id === unit.id;
                return (
                  <Pressable
                    key={unit.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Mục tiêu ${index + 1} ${unit.name}`}
                    testID={`target-${index + 1}`}
                    disabled={unit.hp <= 0 || finished}
                    onPress={() => setFocusId(unit.id)}
                    style={[court.square, { width: s(44), height: s(44) }, on && court.targetOn, unit.hp <= 0 && court.fainted]}
                  >
                    <Text style={court.slotIndex}>{index + 1}</Text>
                    {unit.kind === 'hero' && foeCharacter ? (
                      <CharacterAvatar character={foeCharacter} hairColor={snapshot.opponent.hairColor} outfitColor={snapshot.opponent.outfitColor} size={s(26)} />
                    ) : (
                      <FaceArt tint={PET_TINTS[index] ?? foeTint(unit)} name={unit.name} size={s(26)} facing="left" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={court.commands}>
            {finished ? null : (
              <>
                <RoundButton
                  label="Đánh thường"
                  hint="Đòn đánh thường"
                  square
                  picked={picked === 'attack'}
                  disabled={!yourTurn}
                  testID="action-attack"
                  onPress={() => setPicked('attack')}
                  size={s(48)}
                  font={font(10)}
                />
                <RoundButton
                  label={skill1Wait > 0 ? `CD ${skill1Wait}` : skill1}
                  hint={`${skill1} · MP ${skillCard1?.mana ?? 0}`}
                  square
                  tint="#7fd0c4"
                  picked={picked === 0}
                  disabled={!yourTurn || skill1Locked}
                  dim={skill1Locked}
                  testID="action-skill-1"
                  onPress={() => setPicked(0)}
                  size={s(48)}
                  font={font(10)}
                />
                <RoundButton
                  label={skill2Wait > 0 ? `CD ${skill2Wait}` : skill2}
                  hint={`${skill2} · MP ${skillCard2?.mana ?? 0}`}
                  square
                  tint="#7fd0c4"
                  picked={picked === 1}
                  disabled={!yourTurn || skill2Locked}
                  dim={skill2Locked}
                  testID="action-skill-2"
                  onPress={() => setPicked(1)}
                  size={s(48)}
                  font={font(10)}
                />
                <RoundButton
                  label="Xác nhận"
                  hint="Xác nhận đòn"
                  square
                  tint="#e23a22"
                  hot
                  disabled={!yourTurn || !focus || (picked === 0 && skill1Locked) || (picked === 1 && skill2Locked)}
                  testID="battle-confirm"
                  onPress={confirm}
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
            {resultRank ? (
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={[styles.resultCopy, { fontSize: font(14), color: rankTint(resultRank.rankIndex) }]}>
                  {rankTitle(resultRank.rankIndex)} · {resultRank.stars}/5 sao
                </Text>
                <RankStars stars={resultRank.stars} tint={rankTint(resultRank.rankIndex)} size={font(16)} />
                <Text style={[styles.resultCopy, { fontSize: font(12) }]}>
                  {resultRank.wins} thắng · {resultRank.losses} thua
                </Text>
              </View>
            ) : null}
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

function toCourt(unit: DuelUnitView): CourtActor {
  return {
    id: unit.id,
    name: unit.name,
    side: unit.side === 'you' ? (unit.kind === 'hero' ? 'player' : 'ally') : 'wild',
    tint: unit.side === 'you' ? '#e4c27a' : foeTint(unit),
    hp: unit.hp,
    maxHp: unit.maxHp,
    mp: unit.mp,
    maxMp: unit.maxMp,
    attack: unit.attack,
    defense: unit.defense,
  };
}

function foeTint(unit: DuelUnitView): string {
  if (unit.kind === 'hero') return '#d9897a';
  const index = Number(unit.id.split(':').pop());
  return PET_TINTS[index] ?? PET_TINTS[0];
}

function floatAnchor(
  fighterId: string,
  youId: string,
  foeId: string,
  allies: { id: string }[],
  foes: { id: string }[],
  foot: (cell: string) => { x: number; y: number },
  heroSize: number,
  petSize: number,
  foeHeroSize: number,
  s: (value: number) => number,
): { x: number; y: number } | null {
  if (fighterId === youId) {
    const slot = foot(BATTLE_GRID_POSITIONS.player);
    return { x: slot.x, y: slot.y - heroSize - s(36) };
  }
  if (fighterId === foeId) {
    const slot = foot('G28');
    return { x: slot.x, y: slot.y - foeHeroSize - s(32) };
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
