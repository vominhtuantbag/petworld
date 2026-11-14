import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, StyleSheet, Text, View } from 'react-native';

import { TamingMiniGameModal } from '../components/battle/TamingMiniGameModal';
import { FloatingCombatText } from '../components/battle/FloatingCombatText';
import { GestureActionButton } from '../components/battle/GestureActionButton';
import { useCombatJuice } from '../components/battle/JuiceOverlay';
import { QuickTargetStrip } from '../components/battle/QuickTargetStrip';
import { TurnTimeline } from '../components/battle/TurnTimeline';
import { feetInView } from '../components/battle/courtSlots';
import { BattleWorldFrame, BATTLE_DESIGN_H, BATTLE_DESIGN_W } from '../components/battle/BattleWorldFrame';
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
import { useQuickTarget } from '../hooks/useQuickTarget';
import { useSocketCombatFx } from '../hooks/useSocketCombatFx';
import { combatSfx } from '../world/combat/combatSfx';
import { heroTraits } from '../world/combat/kits';
import type { RaidUnitView } from '../net/protocol';
import { useBattle } from '../state/BattleContext';
import { useWorld } from '../state/WorldContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';
import { ITEMS } from '../world/items';
import { RAID_ADD_CELLS, RAID_BOSS_CELL, RAID_BOSS_SCALE, RAID_PARTY_CELLS, RAID_TAME_CAP } from '../world/dungeons';
import type { ItemId } from '../world/types';

const ARENA = require('../../assets/images/sandau_2.jpg');

type Pick = 'attack' | 0 | 1;

/**
 * One co-op boss arena on the PvP court. No extra floors. Speed timeline,
 * Quick Target strip, and hold-drag / double-tap casts. At 0 a hero auto-attacks.
 * Foes swing on their own clock. The boss is drawn at 2×.
 */
export function RaidScreen() {
  const battle = useBattle();
  const world = useWorld();
  const snapshot = battle.raid;
  const { s, font } = useLayout();
  const juice = useCombatJuice();
  const [screen, setScreen] = useState({ w: BATTLE_DESIGN_W, h: BATTLE_DESIGN_H });
  const [stageBox, setStageBox] = useState({ x: 0, y: 0 });
  const [now, setNow] = useState(Date.now());
  const [picked, setPicked] = useState<Pick>('attack');
  const [tipOverride, setTipOverride] = useState<string | null>(null);
  const [aimKey, setAimKey] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [allyFocusId, setAllyFocusId] = useState<string | null>(null);
  const [utilityPicked, setUtilityPicked] = useState<string | null>(null);
  const utilityArm = useRef({ key: '', at: 0 });
  const aimUnits = useMemo(
    () =>
      (snapshot?.units ?? [])
        .filter((unit) => unit.side === 'foe' && unit.hp > 0)
        .map((unit) => ({
          id: unit.id,
          hp: unit.hp,
          maxHp: unit.maxHp,
          name: unit.name,
          tint: unit.tint,
        })),
    [snapshot],
  );
  const quick = useQuickTarget({
    targets: aimUnits,
    focusId,
    setFocusId: (id) => setFocusId(id),
  });
  const claimed = useRef<string | null>(null);
  const ticketRoom = useRef<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPicked('attack');
    setAimKey(null);
  }, [snapshot?.turnId]);

  useEffect(() => {
    if (!snapshot || snapshot.status === 'finished') return;
    if (ticketRoom.current === snapshot.roomId) return;
    ticketRoom.current = snapshot.roomId;
    world.consumeDungeonTicket();
  }, [snapshot, world]);

  const units = snapshot?.units ?? [];
  const party = units.filter((unit) => unit.side === 'party');
  const foes = units.filter((unit) => unit.side === 'foe');
  const livingFoes = foes.filter((unit) => unit.hp > 0);
  const focus = livingFoes.find((unit) => unit.id === focusId) ?? livingFoes[0] ?? null;
  const finishedEarly = snapshot?.status === 'finished' || snapshot?.status === 'taming';
  const footMemo = useMemo(() => {
    return (cell: string) => feetInView(cell, screen.w, screen.h, stageBox.x, stageBox.y);
  }, [screen.h, screen.w, stageBox.x, stageBox.y]);
  const slotOf = useMemo(() => {
    return (id: string) => {
      const unit = units.find((entry) => entry.id === id);
      return unit ? footMemo(cellFor(unit)) : null;
    };
  }, [footMemo, units]);
  const { floats, dismissFloat, steps, slashes, shakes } = useSocketCombatFx({
    units,
    turnId: finishedEarly ? null : snapshot?.turnId ?? null,
    focusId: focus?.id ?? null,
    lastHit: snapshot?.lastHit,
    lastLog: snapshot?.log[snapshot.log.length - 1],
    slotOf,
    finished: Boolean(finishedEarly),
  });

  if (!snapshot) return null;

  const finished = snapshot.status === 'finished';
  const taming = snapshot.status === 'taming';
  const yourTurn = snapshot.yourTurn && !finished && !taming;
  const seconds = Math.max(
    0,
    Math.ceil((((taming ? snapshot.tameUntil : snapshot.deadline) ?? snapshot.deadline) - now) / 1000),
  );
  const actor = units.find((unit) => unit.id === snapshot.turnId) ?? null;
  const queued = snapshot.queue ?? [];
  const turnQueue = queued.length > 0 ? queued : units.filter((unit) => unit.hp > 0).map((unit) => unit.id);
  const faceSize = timelineFaceSize(screen.w, 8, 8, turnQueue.length, s(28), 212 * 2 + 28);
  const foot = footMemo;
  const heroSize = s(88);
  const foeSize = Math.round(s(64) * 0.8);
  const bossSize = foeSize * RAID_BOSS_SCALE;
  const panelUnit = (unit: RaidUnitView | null, withSkills = false) => {
    if (!unit) return null;
    const face = unit.baseAvatarId ? getCharacter(unit.baseAvatarId) : null;
    return {
      id: unit.id,
      name: unit.name,
      tint: unit.tint,
      hp: unit.hp,
      maxHp: unit.maxHp,
      mp: unit.mp,
      maxMp: unit.maxMp,
      level: undefined,
      element: unit.element ?? (unit.kind === 'hero' ? heroTraits(face?.professionId).element : null),
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
    };
  };
  const skillCard1 = snapshot.skills?.[0];
  const skillCard2 = snapshot.skills?.[1];
  const skill1 = skillCard1?.name ?? 'Kỹ năng 1';
  const skill2 = skillCard2?.name ?? 'Kỹ năng 2';
  const skill1Wait = skillCard1?.wait ?? 0;
  const skill2Wait = skillCard2?.wait ?? 0;
  const skill1Locked = skill1Wait > 0 || (actor != null && (skillCard1?.mana ?? 0) > (actor.mp ?? 0));
  const skill2Locked = skill2Wait > 0 || (actor != null && (skillCard2?.mana ?? 0) > (actor.mp ?? 0));
  const lastLine = snapshot.log[snapshot.log.length - 1] ?? '';
  const resultTitle = snapshot.victory ? 'Chiến thắng' : 'Thất bại';
  const rewardLine = rewardText(snapshot.rewards);
  const log = finished
    ? `${resultTitle}. ${snapshot.victory ? rewardLine : lastLine}`
    : taming
      ? `Thu phục boss. ${seconds}s. Tối đa ${Math.round(RAID_TAME_CAP * 100)}%.`
      : yourTurn
        ? `${seconds}s. ${actor?.name ?? 'Bạn'} đang ra đòn. ${lastLine}`
        : `Đợi ${actor?.name ?? 'đối thủ'}. ${lastLine}`;

  const fire = (choice: Pick, targetMode: 'focus' | 'lowest' | string) => {
    if (!yourTurn) return;
    if (choice === 0 && skill1Locked) return;
    if (choice === 1 && skill2Locked) return;
    const pool = foes.filter((unit) => unit.hp > 0);
    const lowest = [...pool].sort((a, b) => {
      const ra = a.maxHp > 0 ? a.hp / a.maxHp : 1;
      const rb = b.maxHp > 0 ? b.hp / b.maxHp : 1;
      return ra - rb || a.hp - b.hp;
    })[0] ?? null;
    const exact = pool.find((unit) => unit.id === targetMode) ?? null;
    const target = targetMode === 'lowest' ? lowest : exact ?? focus ?? lowest;
    if (!target) return;
    combatSfx('cast');
    if (choice === 'attack') battle.sendRaidAction('attack', target.id);
    else battle.sendRaidAction('skill', target.id, choice);
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

  const leftUnit =
    party.find((unit) => unit.id === allyFocusId) ??
    party.find((unit) => unit.hp > 0) ??
    party[0] ??
    null;
  const rightUnit =
    foes.find((unit) => unit.id === focusId) ??
    livingFoes[0] ??
    foes[0] ??
    null;
  const inspectAlly = (unit: RaidUnitView) => {
    setAllyFocusId(unit.id);
    setUtilityPicked(null);
    setTipOverride(formatUnitInspectTip(panelUnit(unit, unit.kind === 'hero' && unit.ownerId != null)));
  };
  const inspectEnemy = (unit: RaidUnitView) => {
    setFocusId(unit.id);
    setUtilityPicked(null);
    setTipOverride(formatUnitInspectTip(panelUnit(unit)));
    if (unit.hp > 0 && quick.noteUnitTap(unit.id) === 'double') fire(picked, unit.id);
  };

  const actionTipText =
    tipOverride ??
    (picked === 'attack'
      ? 'Đánh thường · đòn vật lý cơ bản. Chạm đúp hoặc giữ-kéo để ra đòn.'
      : picked === 0
        ? `${skill1} · tốn ${skillCard1?.mana ?? 0} MP. Chạm đúp hoặc giữ-kéo để thi triển.`
        : `${skill2} · tốn ${skillCard2?.mana ?? 0} MP. Chạm đúp hoặc giữ-kéo để thi triển.`);

  const aimPopup = <QuickTargetStrip units={aimUnits} focusId={focus?.id ?? focusId} aiming size={s(36)} testIDPrefix="raid-target" />;

  const claim = () => {
    if (snapshot.victory && snapshot.rewards && claimed.current !== snapshot.roomId) {
      claimed.current = snapshot.roomId;
      world.grantRaidReward(snapshot.rewards);
    }
    battle.leaveRaid();
  };

  const shareFacebook = () => {
    const tame = snapshot.yourTame ? 'thu phục thành công boss' : 'không thu phục được boss';
    const text = `Tôi đã hạ boss Hầm ngục và ${tame} trong Game Thư Giãn!`;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://www.facebook.com/')}&quote=${encodeURIComponent(text)}`;
    void Linking.openURL(url);
  };

  const sizeOf = (unit: RaidUnitView) => (unit.kind === 'boss' ? bossSize : unit.kind === 'hero' ? heroSize : foeSize);

  return (
    <BattleWorldFrame
      testID="raid-screen"
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
              unit={panelUnit(leftUnit, leftUnit?.kind === 'hero')}
              avatarSize={s(48)}
              testID="info-active"
              portrait={(() => {
                if (leftUnit?.kind !== 'hero' || !leftUnit.baseAvatarId) return undefined;
                const character = getCharacter(leftUnit.baseAvatarId);
                if (!character) return undefined;
                return (
                  <CharacterAvatar
                    character={character}
                    hairColor={leftUnit.hairColor ?? '#3b2a1c'}
                    outfitColor={leftUnit.outfitColor ?? '#4a6b5a'}
                    size={s(46)}
                  />
                );
              })()}
            />
          </View>
          <View style={court.headerCenter}>
            <TurnTimeline
              ids={turnQueue}
              activeId={finished ? null : snapshot.turnId}
              size={faceSize}
              renderFace={(id, role) => {
                const fighter = units.find((entry) => entry.id === id);
                if (!fighter) return null;
                const face = portrait(fighter);
                return (
                  <TimelineFace
                    fighter={toCourt(fighter)}
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
              <RoundButton label={`Hiệp ${snapshot.round}`} hint="Hiệp đấu" onPress={() => undefined} size={s(32)} width={s(70)} font={font(10)} />
            </View>
            <BattleLogLine text={log} fontSize={font(11)} testID="raid-log" />
          </View>
          <View style={court.headerRight}>
            <BattleInfoPanel
              side="right"
              unit={panelUnit(rightUnit)}
              avatarSize={s(48)}
              testID="info-target"
              portrait={(() => {
                if (rightUnit?.kind !== 'hero' || !rightUnit.baseAvatarId) return undefined;
                const character = getCharacter(rightUnit.baseAvatarId);
                if (!character) return undefined;
                return (
                  <CharacterAvatar
                    character={character}
                    hairColor={rightUnit.hairColor ?? '#3b2a1c'}
                    outfitColor={rightUnit.outfitColor ?? '#4a6b5a'}
                    size={s(46)}
                  />
                );
              })()}
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
          {units.map((unit) => {
            const face = portrait(unit);
            const size = sizeOf(unit);
            return (
              <CourtUnit
                key={unit.id}
                fighter={toCourt(unit)}
                slot={foot(cellFor(unit))}
                active={snapshot.turnId === unit.id}
                targeted={
                  unit.side === 'party'
                    ? allyFocusId === unit.id
                    : focusId === unit.id && unit.hp > 0
                }
                face={unit.side === 'party' ? 'right' : 'left'}
                size={size}
                statFont={font(10)}
                barWidth={unit.kind === 'boss' ? s(120) : s(86)}
                front={unit.kind === 'boss'}
                testID={`raid-unit-${unit.kind}-${unit.slot}`}
                character={face.character}
                hairColor={face.hairColor}
                outfitColor={face.outfitColor}
                onPress={
                  unit.side === 'party'
                    ? () => inspectAlly(unit)
                    : () => inspectEnemy(unit)
                }
                step={steps[unit.id] ?? null}
                slashKey={slashes[unit.id] ?? 0}
                shakeKey={shakes[unit.id] ?? 0}
              />
            );
          })}
          {floats.map((note) => {
            const unit = units.find((entry) => entry.id === note.fighterId);
            if (!unit) return null;
            const slot = foot(cellFor(unit));
            const stack = floats.filter((entry) => entry.fighterId === note.fighterId);
            const index = stack.findIndex((entry) => entry.id === note.id);
            return (
              <FloatingCombatText
                key={note.id}
                amount={note.amount}
                kind={note.kind}
                x={slot.x + (index - (stack.length - 1) / 2) * 16}
                y={slot.y - sizeOf(unit) - s(36)}
                onImpact={juice.trigger}
                onDone={() => dismissFloat(note.id)}
              />
            );
          })}
        </Animated.View>
        {juice.overlay}

        <View style={court.dock}>
          <View style={court.targets} />
          <ActionTipBanner text={actionTipText} fontSize={font(11)} testID="raid-action-tip" />
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
                  testID="raid-attack"
                  size={s(52)}
                  font={font(10)}
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
                  testID="raid-skill-1"
                  size={s(52)}
                  font={font(10)}
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
                  testID="raid-skill-2"
                  size={s(52)}
                  font={font(10)}
                  {...bind(1)}
                />
                <RoundButton
                  label="Phòng thủ"
                  hint="Giảm sát thương đến lượt sau · chạm 2 lần để dùng"
                  square
                  tint="#2f6fe0"
                  picked={utilityPicked === 'defend'}
                  disabled={!yourTurn}
                  testID="raid-defend"
                  onHighlight={() =>
                    setTipOverride('Phòng thủ · giảm sát thương đến lượt sau. Chạm lần nữa để dùng.')
                  }
                  onPress={() => {
                    setTipOverride('Phòng thủ · giảm sát thương đến lượt sau. Chạm lần nữa để dùng.');
                    setUtilityPicked('defend');
                    armThenFire(utilityArm, 'defend', 450, () => {
                      setUtilityPicked(null);
                      combatSfx('cast');
                      battle.sendRaidAction('defend');
                    });
                  }}
                  size={s(52)}
                  font={font(10)}
                />
              </>
            )}
          </View>
        </View>
      </View>
      {taming && snapshot.yourTame == null ? (
        <TamingMiniGameModal
          monsterName="Boss hầm ngục"
          lowHp={false}
          deadlineAt={snapshot.tameUntil}
          capPercent={Math.round(RAID_TAME_CAP * 100)}
          onClose={() => battle.sendRaidTame([])}
          onFinish={(bonuses) => battle.sendRaidTame(bonuses)}
        />
      ) : null}
      {taming && snapshot.yourTame != null ? (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={[styles.resultCopy, { fontSize: font(14) }]}>
            {snapshot.yourTame ? 'Thu phục thành công. Đợi đồng đội.' : 'Thu phục thất bại. Đợi đồng đội.'}
          </Text>
        </View>
      ) : null}
      {finished ? (
        <View style={styles.overlay}>
          <View style={[styles.result, { borderRadius: s(18), padding: s(18), gap: s(8) }]}>
            <Text style={[styles.resultTitle, { fontSize: font(28) }]}>{resultTitle}</Text>
            <Text style={[styles.resultCopy, { fontSize: font(14) }]}>{snapshot.victory ? rewardLine : 'Không nhận thưởng.'}</Text>
            {snapshot.victory && snapshot.tameResults
              ? snapshot.tameResults.map((entry) => (
                  <Text key={entry.userId} style={[styles.resultCopy, { fontSize: font(13) }]}>
                    {entry.name}: {entry.success ? 'Thu phục thành công' : 'Thu phục thất bại'}
                  </Text>
                ))
              : null}
            {snapshot.victory ? (
              <RoundButton testID="raid-share" label="Chia sẻ Facebook" hint="Đăng thành tích" onPress={shareFacebook} size={s(44)} font={font(12)} />
            ) : null}
            <RoundButton testID="raid-done" label="Về bản đồ" hint="Rời trận" hot tint="#e23a22" onPress={claim} size={s(48)} font={font(12)} />
          </View>
        </View>
      ) : null}
    </BattleWorldFrame>
  );
}

function cellFor(unit: RaidUnitView): string {
  if (unit.kind === 'boss') return RAID_BOSS_CELL;
  if (unit.kind === 'monster') return RAID_ADD_CELLS[unit.slot] ?? RAID_ADD_CELLS[0];
  return RAID_PARTY_CELLS[unit.slot] ?? RAID_PARTY_CELLS[0];
}

function portrait(unit: RaidUnitView) {
  if (unit.kind !== 'hero' || !unit.baseAvatarId) return { character: null, hairColor: undefined, outfitColor: undefined };
  return {
    character: getCharacter(unit.baseAvatarId),
    hairColor: unit.hairColor,
    outfitColor: unit.outfitColor,
  };
}

function toCourt(unit: RaidUnitView): CourtActor {
  const face = unit.baseAvatarId ? getCharacter(unit.baseAvatarId) : null;
  return {
    id: unit.id,
    name: unit.name,
    side: unit.kind === 'hero' ? 'player' : 'wild',
    tint: unit.tint,
    hp: unit.hp,
    maxHp: unit.maxHp,
    mp: unit.mp,
    maxMp: unit.maxMp,
    attack: unit.attack,
    defense: unit.defense,
    element: unit.element ?? (unit.kind === 'hero' ? heroTraits(face?.professionId).element : null),
    shieldHp: unit.shieldHp ?? 0,
    statuses: (unit.statuses ?? []).map((entry) => ({
      id: entry.id as import('../world/combat/advanced').StatusId,
      turns: entry.turns,
      power: entry.power,
    })),
  };
}

function rewardText(rewards: { exp: number; drops: { itemId: string; qty: number }[] } | null): string {
  if (!rewards) return 'Mỗi người nhận như nhau.';
  const names = rewards.drops.map((drop) => (drop.itemId in ITEMS ? ITEMS[drop.itemId as ItemId].nameVi : drop.itemId)).join(', ');
  return `+${rewards.exp} kinh nghiệm. ${names}. Mỗi người nhận như nhau.`;
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
    maxWidth: 460,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.gold,
  },
  resultTitle: { color: theme.gold, fontWeight: '800', textAlign: 'center' },
  resultCopy: { color: theme.muted, textAlign: 'center' },
});
