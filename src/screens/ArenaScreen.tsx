import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { FloatingCombatText } from '../components/battle/FloatingCombatText';
import { GestureActionButton } from '../components/battle/GestureActionButton';
import { useCombatJuice } from '../components/battle/JuiceOverlay';
import { QuickTargetStrip } from '../components/battle/QuickTargetStrip';
import { TurnTimeline } from '../components/battle/TurnTimeline';
import {
  BATTLE_GRID_POSITIONS,
  ENEMY_UNIT_CELLS,
  PLAYER_PET_CELLS,
  feetInView,
} from '../components/battle/courtSlots';
import { BattleWorldFrame, BATTLE_DESIGN_H, BATTLE_DESIGN_W } from '../components/battle/BattleWorldFrame';
import { RankStars } from '../components/arena/RankStars';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { BattleInfoPanel, formatUnitInspectTip } from '../components/battle/BattleInfoPanel';
import {
  ActionTipBanner,
  BattleLogLine,
  CourtUnit,
  RoundButton,
  TimelineFace,
  armThenFire,
  styles as court,
  timelineFaceSize,
  type CourtActor,
} from '../components/battle/courtChrome';
import { getCharacter } from '../data/characters';
import { useBattleCommandSize } from '../hooks/useBattleCommandSize';
import { useQuickTarget } from '../hooks/useQuickTarget';
import { useSocketCombatFx } from '../hooks/useSocketCombatFx';
import { combatSfx } from '../world/combat/combatSfx';
import { heroTraits } from '../world/combat/kits';
import type { DuelUnitView } from '../net/protocol';
import { useBattle } from '../state/BattleContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';
import { rankTint, rankTitle } from '../world/ranks';

const ARENA = require('../../assets/images/sandau_2.jpg');

const PET_CELLS = [...PLAYER_PET_CELLS];
const FOE_PET_CELLS = [...ENEMY_UNIT_CELLS];
const PET_TINTS = ['#c4a574', '#7aa2c4', '#8fbf7a'];

type Pick = 'attack' | 0 | 1;

/**
 * Same court as a wild fight. Each hero and pet acts on its own speed turn.
 * Hold-drag / double-tap casts immediately. At 0 the server swings a basic attack.
 */
export function ArenaScreen() {
  const battle = useBattle();
  const snapshot = battle.battle;
  const { s, font } = useLayout();
  const { cmdSize, cmdFont, unitScale } = useBattleCommandSize();
  const juice = useCombatJuice();
  const [screen, setScreen] = useState({ w: BATTLE_DESIGN_W, h: BATTLE_DESIGN_H });
  const [stageBox, setStageBox] = useState({ x: 0, y: 0 });
  const [now, setNow] = useState(Date.now());
  const [picked, setPicked] = useState<Pick>('attack');
  const [aimKey, setAimKey] = useState<string | null>(null);
  const [tipOverride, setTipOverride] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [allyFocusId, setAllyFocusId] = useState<string | null>(null);
  const [utilityPicked, setUtilityPicked] = useState<string | null>(null);
  const utilityArm = useRef({ key: '', at: 0 });
  const aimUnits = useMemo(
    () =>
      (snapshot?.units ?? [])
        .filter((unit) => unit.side === 'opponent' && unit.hp > 0)
        .map((unit) => ({
          id: unit.id,
          hp: unit.hp,
          maxHp: unit.maxHp,
          name: unit.name,
          tint: unit.kind === 'hero' ? '#d9897a' : '#c4a574',
        })),
    [snapshot],
  );
  const quick = useQuickTarget({
    targets: aimUnits,
    focusId,
    setFocusId: (id) => setFocusId(id),
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPicked('attack');
    setAimKey(null);
  }, [snapshot?.turnId]);

  const units = snapshot?.units ?? [];
  const youHero = units.find((unit) => unit.side === 'you' && unit.kind === 'hero') ?? null;
  const foeHero = units.find((unit) => unit.side === 'opponent' && unit.kind === 'hero') ?? null;
  const yourPets = units.filter((unit) => unit.side === 'you' && unit.kind === 'pet').slice(0, PLAYER_PET_CELLS.length);
  const foePets = units.filter((unit) => unit.side === 'opponent' && unit.kind === 'pet').slice(0, ENEMY_UNIT_CELLS.length);
  const cast = units.map((unit) => toCourt(unit));
  const foes = units.filter((unit) => unit.side === 'opponent' && unit.hp > 0);
  const focus = foes.find((unit) => unit.id === focusId) ?? foes[0] ?? null;
  const finishedEarly = snapshot?.status === 'finished';
  const footMemo = useMemo(() => {
    return (cell: string) => feetInView(cell, screen.w, screen.h, stageBox.x, stageBox.y);
  }, [screen.h, screen.w, stageBox.x, stageBox.y]);
  const slotOf = useMemo(() => {
    return (id: string) => {
      if (!youHero || !foeHero) return null;
      if (id === youHero.id) return footMemo(BATTLE_GRID_POSITIONS.player);
      if (id === foeHero.id) return footMemo(BATTLE_GRID_POSITIONS.enemyPlayer);
      const allyIndex = yourPets.findIndex((unit) => unit.id === id);
      if (allyIndex >= 0) return footMemo(PET_CELLS[allyIndex] ?? PET_CELLS[0]!);
      const foeIndex = foePets.findIndex((unit) => unit.id === id);
      if (foeIndex >= 0) return footMemo(FOE_PET_CELLS[foeIndex] ?? FOE_PET_CELLS[0]!);
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
  const faceSize = timelineFaceSize(screen.w, 8, 8, turnQueue.length, s(28), 212 * 2 + 28);
  const foot = footMemo;
  const heroSize = Math.round(s(118) * unitScale);
  const petSize = Math.round(s(64) * 0.8 * unitScale);
  const foeHeroSize = Math.round(petSize * 1.5);
  const youCharacter = getCharacter(snapshot.you.baseAvatarId);
  const foeCharacter = getCharacter(snapshot.opponent.baseAvatarId);
  const youElement = heroTraits(youCharacter?.professionId).element;
  const foeElement = heroTraits(foeCharacter?.professionId).element;
  const unitElement = (unit: DuelUnitView) =>
    unit.element ?? (unit.kind === 'hero' ? (unit.side === 'you' ? youElement : foeElement) : null);
  const panelUnit = (unit: DuelUnitView | null, withSkills = false) =>
    unit
      ? {
          id: unit.id,
          name: unit.name,
          tint: unit.side === 'you' ? '#e4c27a' : foeTint(unit),
          hp: unit.hp,
          maxHp: unit.maxHp,
          mp: unit.mp,
          maxMp: unit.maxMp,
          level: unit.level,
          element: unitElement(unit),
          kindId: unit.kindId,
          shieldHp: unit.shieldHp,
          statuses: (unit.statuses ?? []).map((entry) => ({
            id: entry.id as import('../world/combat/advanced').StatusId,
            turns: entry.turns,
            power: entry.power,
          })),
          skills: withSkills
            ? [
                { id: 'attack', name: 'Đánh thường', wait: 0 },
                ...(snapshot.skills ?? []).map((skill) => ({
                  id: skill.id ?? `skill-${skill.index}`,
                  name: skill.name,
                  wait: skill.wait ?? 0,
                  mana: skill.mana,
                })),
              ]
            : undefined,
        }
      : null;
  const skillCard1 = snapshot.skills?.[0];
  const skillCard2 = snapshot.skills?.[1];
  const skill1 = skillCard1?.name ?? 'Kỹ năng 1';
  const skill2 = skillCard2?.name ?? 'Kỹ năng 2';
  const skill1Wait = skillCard1?.wait ?? 0;
  const skill2Wait = skillCard2?.wait ?? 0;
  const skill1Locked = skill1Wait > 0 || (actor != null && (skillCard1?.mana ?? 0) > (actor.mp ?? 0));
  const skill2Locked = skill2Wait > 0 || (actor != null && (skillCard2?.mana ?? 0) > (actor.mp ?? 0));
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

  const fire = (choice: Pick, targetMode: 'focus' | 'lowest' | string) => {
    if (!yourTurn) return;
    if (choice === 0 && skill1Locked) return;
    if (choice === 1 && skill2Locked) return;
    const pool = [foeHero, ...foePets].filter((unit) => unit.hp > 0);
    const lowest = [...pool].sort((a, b) => {
      const ra = a.maxHp > 0 ? a.hp / a.maxHp : 1;
      const rb = b.maxHp > 0 ? b.hp / b.maxHp : 1;
      return ra - rb || a.hp - b.hp;
    })[0] ?? null;
    const exact = pool.find((unit) => unit.id === targetMode) ?? null;
    const target = targetMode === 'lowest' ? lowest : exact ?? focus ?? lowest;
    if (!target) return;
    combatSfx('cast');
    if (choice === 'attack') battle.sendAction('attack', target.id);
    else battle.sendAction('skill', target.id, choice);
  };

  const bind = (choice: Pick) => {
    const key = String(choice);
    return {
      onArm: () => {
        setUtilityPicked(null);
        utilityArm.current = { key: '', at: 0 };
        setTipOverride(null);
        setPicked(choice);
        setAimKey(null);
        combatSfx('arm');
      },
      onDoubleTap: () => {
        setUtilityPicked(null);
        setTipOverride(null);
        setPicked(choice);
        setAimKey(null);
        fire(choice, 'lowest');
      },
      onHoldStart: () => {
        setUtilityPicked(null);
        setTipOverride(null);
        setPicked(choice);
        setAimKey(key);
        quick.beginAim();
      },
      onHoldMove: (dx: number, dy: number) => quick.moveAim(dx, dy),
      onHoldEnd: (dy: number, cancelled: boolean) => {
        const result = quick.endAim(cancelled ? 999 : dy);
        setAimKey(null);
        if (result === 'cast') fire(choice, 'focus');
      },
    };
  };

  const actionTipText =
    tipOverride ??
    (picked === 'attack'
      ? 'Đánh thường · đòn vật lý cơ bản. Chạm đúp hoặc giữ-kéo để ra đòn.'
      : picked === 0
        ? `${skill1} · tốn ${skillCard1?.mana ?? 0} MP. Chạm đúp hoặc giữ-kéo để thi triển.`
        : `${skill2} · tốn ${skillCard2?.mana ?? 0} MP. Chạm đúp hoặc giữ-kéo để thi triển.`);

  const aimPopup = (
    <QuickTargetStrip
      units={aimUnits.map((unit) =>
        unit.id === foeHero.id && foeCharacter
          ? {
              ...unit,
              portrait: (
                <CharacterAvatar
                  character={foeCharacter}
                  hairColor={snapshot.opponent.hairColor}
                  outfitColor={snapshot.opponent.outfitColor}
                  size={s(26)}
                />
              ),
            }
          : unit,
      )}
      focusId={focus?.id ?? focusId}
      aiming
      size={s(36)}
      testIDPrefix="target"
    />
  );

  const allies = [youHero, ...yourPets];
  const enemies = [foeHero, ...foePets];
  const leftUnit =
    allies.find((unit) => unit.id === allyFocusId) ??
    allies.find((unit) => unit.hp > 0) ??
    youHero;
  const rightUnit =
    enemies.find((unit) => unit.id === focusId) ??
    enemies.find((unit) => unit.hp > 0) ??
    focus ??
    foeHero;
  const inspectAlly = (unit: DuelUnitView) => {
    setAllyFocusId(unit.id);
    setUtilityPicked(null);
    setTipOverride(formatUnitInspectTip(panelUnit(unit, unit.side === 'you' && unit.kind === 'hero')));
  };
  const markFoe = (unit: DuelUnitView) => {
    setFocusId(unit.id);
    setUtilityPicked(null);
    setTipOverride(formatUnitInspectTip(panelUnit(unit)));
    if (unit.hp > 0 && quick.noteUnitTap(unit.id) === 'double') fire(picked, unit.id);
  };

  return (
    <BattleWorldFrame
      testID="arena-screen"
      arenaSource={ARENA}
      onMetrics={(metrics) => {
        setScreen((current) =>
          current.w === metrics.worldW && current.h === metrics.worldH
            ? current
            : { w: metrics.worldW, h: metrics.worldH },
        );
      }}
    >
      <View style={[court.frame, court.worldPad]}>
        <View style={court.header}>
          <View style={court.headerLeft}>
            <BattleInfoPanel
              side="left"
              unit={panelUnit(leftUnit, leftUnit.id === youHero.id)}
              avatarSize={s(48)}
              testID="info-active"
              portrait={
                leftUnit.kind === 'hero' && leftUnit.side === 'you' && youCharacter ? (
                  <CharacterAvatar
                    character={youCharacter}
                    hairColor={snapshot.you.hairColor}
                    outfitColor={snapshot.you.outfitColor}
                    size={s(46)}
                  />
                ) : undefined
              }
            />
          </View>
          <View style={court.headerCenter}>
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
            <View style={court.headerControls}>
              <RoundButton label={finished ? 'Hết' : `${seconds}s`} hint="Thời gian lượt" onPress={() => undefined} size={s(32)} width={s(64)} font={font(11)} />
              <RoundButton
                label={snapshot.ranked ? `HIỆP ${snapshot.bout ?? 1}/3 · ${snapshot.boutScore?.you ?? 0}-${snapshot.boutScore?.opponent ?? 0}` : `Hiệp ${snapshot.round}`}
                hint={snapshot.ranked ? 'Best of 3' : 'Hiệp đấu'}
                onPress={() => undefined}
                size={s(32)}
                width={s(110)}
                font={font(10)}
              />
            </View>
            <BattleLogLine text={log} fontSize={font(11)} testID="arena-log" />
          </View>
          <View style={court.headerRight}>
            <BattleInfoPanel
              side="right"
              unit={panelUnit(rightUnit)}
              avatarSize={s(48)}
              testID="info-target"
              portrait={
                rightUnit.kind === 'hero' && foeCharacter ? (
                  <CharacterAvatar
                    character={foeCharacter}
                    hairColor={snapshot.opponent.hairColor}
                    outfitColor={snapshot.opponent.outfitColor}
                    size={s(46)}
                  />
                ) : undefined
              }
            />
          </View>
        </View>

        <Animated.View
          style={[court.stage, juice.stageStyle]}
          onLayout={(event) => {
            const { x, y } = event.nativeEvent.layout;
            setStageBox((current) => (current.x === x && current.y === y ? current : { x, y }));
          }}
        >
          <CourtUnit
            fighter={toCourt(youHero, youElement)}
            slot={foot(BATTLE_GRID_POSITIONS.player)}
            active={snapshot.turnId === youHero.id}
            targeted={allyFocusId === youHero.id}
            face="right"
            size={heroSize}
            statFont={font(10)}
            barWidth={Math.round(s(104) * unitScale)}
            testID="arena-you"
            character={youCharacter}
            hairColor={snapshot.you.hairColor}
            outfitColor={snapshot.you.outfitColor}
            onPress={() => inspectAlly(youHero)}
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
              targeted={allyFocusId === unit.id}
              face="right"
              size={petSize}
              statFont={font(10)}
              barWidth={Math.round(s(86) * unitScale)}
              testID={`court-ally-${index}`}
              onPress={() => inspectAlly(unit)}
              step={steps[unit.id] ?? null}
              slashKey={slashes[unit.id] ?? 0}
              shakeKey={shakes[unit.id] ?? 0}
            />
          ))}
          <CourtUnit
            fighter={toCourt(foeHero, foeElement)}
            slot={foot(BATTLE_GRID_POSITIONS.enemyPlayer)}
            active={snapshot.turnId === foeHero.id}
            targeted={focusId === foeHero.id && foeHero.hp > 0}
            face="left"
            size={foeHeroSize}
            statFont={font(10)}
            barWidth={Math.round(s(96) * unitScale)}
            testID="arena-opponent"
            character={foeCharacter}
            hairColor={snapshot.opponent.hairColor}
            outfitColor={snapshot.opponent.outfitColor}
            onPress={() => markFoe(foeHero)}
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
              targeted={focusId === unit.id && unit.hp > 0}
              face="left"
              size={petSize}
              statFont={font(10)}
              barWidth={Math.round(s(86) * unitScale)}
              front={FOE_PET_CELLS[index] === BATTLE_GRID_POSITIONS.enemy3}
              testID={`court-foe-${index}`}
              onPress={() => markFoe(unit)}
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
                onImpact={juice.trigger}
                onDone={() => dismissFloat(note.id)}
              />
            );
          })}
        </Animated.View>
        {juice.overlay}

        <View style={court.dock}>
          <View style={court.targets} />
          <ActionTipBanner text={actionTipText} fontSize={Math.max(font(11), cmdFont)} testID="arena-action-tip" />
          <View style={court.commands}>
            {finished ? null : (
              <>
                <GestureActionButton
                  label="Đánh thường"
                  hint="Đòn đánh thường"
                  picked={picked === 'attack'}
                  aiming={aimKey === 'attack' && quick.aiming}
                  aimPopup={aimPopup}
                  disabled={!yourTurn}
                  testID="action-attack"
                  size={cmdSize}
                  font={cmdFont}
                  {...bind('attack')}
                />
                <GestureActionButton
                  label={skill1}
                  hint={`${skill1} · MP ${skillCard1?.mana ?? 0}`}
                  tint="#7fd0c4"
                  picked={picked === 0}
                  aiming={aimKey === '0' && quick.aiming}
                  aimPopup={aimPopup}
                  disabled={!yourTurn || skill1Locked}
                  dim={skill1Locked}
                  testID="action-skill-1"
                  size={cmdSize}
                  font={cmdFont}
                  {...bind(0)}
                />
                <GestureActionButton
                  label={skill2}
                  hint={`${skill2} · MP ${skillCard2?.mana ?? 0}`}
                  tint="#7fd0c4"
                  picked={picked === 1}
                  aiming={aimKey === '1' && quick.aiming}
                  aimPopup={aimPopup}
                  disabled={!yourTurn || skill2Locked}
                  dim={skill2Locked}
                  testID="action-skill-2"
                  size={cmdSize}
                  font={cmdFont}
                  {...bind(1)}
                />
                <RoundButton
                  label="Phòng thủ"
                  hint="Giảm sát thương đến lượt sau · chạm 2 lần để dùng"
                  square
                  tint="#2f6fe0"
                  picked={utilityPicked === 'defend'}
                  disabled={!yourTurn}
                  testID="arena-defend"
                  onHighlight={() =>
                    setTipOverride('Phòng thủ · giảm sát thương đến lượt sau. Chạm lần nữa để dùng.')
                  }
                  onPress={() => {
                    setTipOverride('Phòng thủ · giảm sát thương đến lượt sau. Chạm lần nữa để dùng.');
                    setUtilityPicked('defend');
                    armThenFire(utilityArm, 'defend', 450, () => {
                      setUtilityPicked(null);
                      combatSfx('cast');
                      battle.sendAction('defend');
                    });
                  }}
                  size={cmdSize}
                  font={cmdFont}
                />
              </>
            )}
          </View>
        </View>
      </View>
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
    </BattleWorldFrame>
  );
}

function toCourt(unit: DuelUnitView, element?: string | null): CourtActor {
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
    level: unit.level,
    element: element ?? unit.element ?? null,
    kindId: unit.kindId,
    shieldHp: unit.shieldHp ?? 0,
    statuses: (unit.statuses ?? []).map((entry) => ({
      id: entry.id as import('../world/combat/advanced').StatusId,
      turns: entry.turns,
      power: entry.power,
    })),
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
    const slot = foot(BATTLE_GRID_POSITIONS.enemyPlayer);
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
