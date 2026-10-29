import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { TamingMiniGameModal } from '../components/battle/TamingMiniGameModal';
import { FloatingCombatText } from '../components/battle/FloatingCombatText';
import { TurnTimeline } from '../components/battle/TurnTimeline';
import { feetInView } from '../components/battle/courtSlots';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { CourtUnit, FaceArt, RoundButton, TimelineFace, styles as court, timelineFaceSize, type CourtActor } from '../components/battle/courtChrome';
import { getCharacter } from '../data/characters';
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
 * Co-op raid on the PvP court: speed timeline, target row, and
 * Đánh thường → Kỹ năng 1 → Kỹ năng 2 → Xác nhận. Confirm resolves the turn
 * early. At 0 the server swings a basic attack. The boss is drawn at 2×.
 */
export function RaidScreen() {
  const battle = useBattle();
  const world = useWorld();
  const snapshot = battle.raid;
  const { s, font } = useLayout();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState({ w: 0, h: 0 });
  const [stageBox, setStageBox] = useState({ x: 0, y: 0 });
  const [now, setNow] = useState(Date.now());
  const [picked, setPicked] = useState<Pick>('attack');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [floats, setFloats] = useState<{ id: number; fighterId: string; amount: number }[]>([]);
  const hpWatch = useRef<Map<string, number> | null>(null);
  const floatSerial = useRef(0);
  const claimed = useRef<string | null>(null);
  const ticketRoom = useRef<string | null>(null);
  const hpKey = (snapshot?.units ?? []).map((unit) => `${unit.id}:${unit.hp}`).join('|');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPicked('attack');
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

  useEffect(() => {
    if (!snapshot) {
      hpWatch.current = null;
      setFloats((current) => (current.length === 0 ? current : []));
      return;
    }
    const previous = hpWatch.current;
    const next = new Map(snapshot.units.map((unit) => [unit.id, unit.hp]));
    hpWatch.current = next;
    if (!previous) return;
    const born: { id: number; fighterId: string; amount: number }[] = [];
    for (const unit of snapshot.units) {
      if (!previous.has(unit.id)) continue;
      const delta = unit.hp - (previous.get(unit.id) ?? unit.hp);
      if (!Number.isFinite(delta) || delta === 0) continue;
      floatSerial.current += 1;
      born.push({ id: floatSerial.current, fighterId: unit.id, amount: delta });
    }
    if (born.length > 0) setFloats((current) => [...current, ...born].slice(-24));
  }, [hpKey, snapshot]);

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
  const faceSize = timelineFaceSize(screen.w, insets.left, insets.right, turnQueue.length, s(30), s(72) + s(78) + 36);
  const foot = (cell: string) => feetInView(cell, screen.w, screen.h, insets.left + stageBox.x, insets.top + stageBox.y);
  const heroSize = s(88);
  const foeSize = Math.round(s(64) * 0.8);
  const bossSize = foeSize * RAID_BOSS_SCALE;
  const skill1 = snapshot.skills?.[0]?.name ?? 'Kỹ năng 1';
  const skill2 = snapshot.skills?.[1]?.name ?? 'Kỹ năng 2';
  const pickedLabel = picked === 0 ? skill1 : picked === 1 ? skill2 : 'Đánh thường';
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

  const confirm = () => {
    if (!yourTurn || !focus) return;
    if (picked === 'attack') battle.sendRaidAction('attack', focus.id);
    else battle.sendRaidAction('skill', focus.id, picked);
  };

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
    <View
      testID="raid-screen"
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
            <RoundButton label={`Hiệp ${snapshot.round}`} hint="Hiệp đấu" onPress={() => undefined} size={s(36)} width={s(78)} font={font(11)} />
          </View>
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
        </View>

        <View
          style={court.stage}
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
                targeted={focus?.id === unit.id && unit.hp > 0}
                face={unit.side === 'party' ? 'right' : 'left'}
                size={size}
                statFont={font(10)}
                barWidth={unit.kind === 'boss' ? s(120) : s(86)}
                front={unit.kind === 'boss'}
                testID={`raid-unit-${unit.kind}-${unit.slot}`}
                character={face.character}
                hairColor={face.hairColor}
                outfitColor={face.outfitColor}
                onPress={unit.side === 'foe' && unit.hp > 0 ? () => setFocusId(unit.id) : undefined}
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
                x={slot.x + (index - (stack.length - 1) / 2) * 16}
                y={slot.y - sizeOf(unit) - s(36)}
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
              {focus ? `${focus.name}: ${pickedLabel}` : 'Mục tiêu'}
            </Text>
            <View style={court.targetRow}>
              {foes.map((unit, index) => {
                const on = focus?.id === unit.id;
                return (
                  <Pressable
                    key={unit.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Mục tiêu ${index + 1} ${unit.name}`}
                    testID={`raid-target-${index + 1}`}
                    disabled={unit.hp <= 0 || finished}
                    onPress={() => setFocusId(unit.id)}
                    style={[court.square, { width: s(44), height: s(44) }, on && court.targetOn, unit.hp <= 0 && court.fainted]}
                  >
                    <Text style={court.slotIndex}>{index + 1}</Text>
                    <FaceArt tint={unit.tint} name={unit.name} size={s(26)} facing="left" />
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
                  testID="raid-attack"
                  onPress={() => setPicked('attack')}
                  size={s(48)}
                  font={font(10)}
                />
                <RoundButton
                  label={skill1}
                  hint="Chiêu 1"
                  square
                  tint="#7fd0c4"
                  picked={picked === 0}
                  disabled={!yourTurn}
                  testID="raid-skill-1"
                  onPress={() => setPicked(0)}
                  size={s(48)}
                  font={font(10)}
                />
                <RoundButton
                  label={skill2}
                  hint="Chiêu 2"
                  square
                  tint="#7fd0c4"
                  picked={picked === 1}
                  disabled={!yourTurn}
                  testID="raid-skill-2"
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
                  disabled={!yourTurn || !focus}
                  testID="raid-confirm"
                  onPress={confirm}
                  size={s(48)}
                  font={font(10)}
                />
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
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
    </View>
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
