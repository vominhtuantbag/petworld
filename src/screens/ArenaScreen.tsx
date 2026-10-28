import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BATTLE_GRID_POSITIONS, feetInView, overheadDrop } from '../components/battle/courtSlots';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { portraitScaleX } from '../components/world/facing';
import { GlowButton } from '../components/GlowButton';
import { getCharacter } from '../data/characters';
import type { CombatAction, FighterView } from '../net/protocol';
import { useBattle } from '../state/BattleContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

const ARENA = require('../../assets/images/sandau_2.jpg');

const ACTIONS: { id: CombatAction; label: string }[] = [
  { id: 'attack', label: 'Tấn công' },
  { id: 'skill', label: 'Kỹ năng' },
  { id: 'defend', label: 'Phòng thủ' },
];

/**
 * Both fighters are drawn from the server snapshot, including the opponent's
 * hair and outfit. Damage is never calculated on this device.
 */
export function ArenaScreen() {
  const battle = useBattle();
  const snapshot = battle.battle;
  const { s, font } = useLayout();
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState({ w: 0, h: 0 });
  const [stageBox, setStageBox] = useState({ x: 0, y: 0 });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);

  if (!snapshot) return null;

  const seconds = Math.max(0, Math.ceil((snapshot.deadline - now) / 1000));
  const finished = snapshot.status === 'finished';
  const youWon = snapshot.winnerId === snapshot.you.userId;
  const draw = finished && snapshot.winnerId === null;
  const resultTitle = draw ? 'Hòa' : youWon ? 'Chiến thắng' : 'Thất bại';

  const foot = (cell: string) => feetInView(cell, screen.w, screen.h, insets.left + stageBox.x, insets.top + stageBox.y);
  const youSize = s(118);
  const foeSize = s(84);

  return (
    <View
      style={styles.screen}
      testID="arena-screen"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setScreen((current) => (current.w === width && current.h === height ? current : { w: width, h: height }));
      }}
    >
      <Image source={ARENA} resizeMode="cover" pointerEvents="none" style={styles.arena} />
      <SafeAreaView style={styles.frame} edges={['top', 'bottom', 'left', 'right']}>
      <View style={[styles.top, { paddingHorizontal: s(12), paddingTop: s(8) }]}>
        <Text style={[styles.kicker, { fontSize: font(12) }]}>ĐẤU TRƯỜNG · HIỆP {snapshot.round}</Text>
        <Text style={[styles.timer, { fontSize: font(16) }]}>{finished ? 'Kết thúc' : `${seconds}s`}</Text>
      </View>
      <View
        style={styles.stage}
        onLayout={(event) => {
          const { x, y } = event.nativeEvent.layout;
          setStageBox((current) => (current.x === x && current.y === y ? current : { x, y }));
        }}
      >
        <ArenaFighter fighter={snapshot.you} slot={foot(BATTLE_GRID_POSITIONS.player)} portrait={youSize} face="right" statFont={font(10)} barWidth={s(104)} testID="arena-you" />
        <ArenaFighter fighter={snapshot.opponent} slot={foot(BATTLE_GRID_POSITIONS.enemyPlayer)} portrait={foeSize} face="left" statFont={font(10)} barWidth={s(96)} testID="arena-opponent" />
        <View style={[styles.logCard, { borderRadius: s(12), padding: s(8), maxHeight: s(72) }]}>
          <ScrollView style={styles.logScroll} contentContainerStyle={{ gap: 4 }}>
            {snapshot.log.map((line, index) => (
              <Text key={`${index}-${line}`} style={[styles.logLine, { fontSize: font(12) }]}>
                {line}
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>
      <View style={[styles.actions, { gap: s(8), padding: s(12) }]}>
        {ACTIONS.map((action) => (
          <View key={action.id} style={styles.action}>
            <GlowButton
              testID={`action-${action.id}`}
              label={action.label}
              enabled={!finished && !snapshot.you.ready}
              onPress={() => battle.sendAction(action.id)}
            />
          </View>
        ))}
      </View>
      {!finished ? <Text style={styles.waiting}>Mỗi lượt 30 giây. Hết giờ sẽ tự tấn công.</Text> : null}
      {snapshot.you.ready && !finished ? <Text style={styles.waiting}>Đã khóa đòn. Đang chờ đối thủ.</Text> : null}
      {finished ? (
        <View style={styles.overlay}>
          <View style={[styles.result, { borderRadius: s(18), padding: s(18), gap: s(8) }]}>
            <Text style={[styles.resultTitle, { fontSize: font(28) }]}>{resultTitle}</Text>
            <Text style={[styles.resultCopy, { fontSize: font(14) }]}>
              {snapshot.you.name} {snapshot.you.hp} · {snapshot.opponent.name} {snapshot.opponent.hp}
            </Text>
            <GlowButton testID="leave-battle" label="Về sảnh" enabled onPress={battle.leaveBattle} />
          </View>
        </View>
      ) : null}
      </SafeAreaView>
    </View>
  );
}

function ArenaFighter({
  fighter,
  slot,
  portrait,
  face,
  statFont,
  barWidth,
  testID,
}: {
  fighter: FighterView;
  slot: { x: number; y: number };
  portrait: number;
  face: 'left' | 'right';
  statFont: number;
  barWidth: number;
  testID: string;
}) {
  const character = getCharacter(fighter.baseAvatarId);
  const ratio = fighter.maxHp <= 0 ? 0 : Math.max(0, Math.min(1, fighter.hp / fighter.maxHp));
  const attack = Math.round(fighter.attack);
  const defense = Math.round(fighter.defense);
  const pets = fighter.pets ?? [];
  const body = Math.round(portrait * 1.22);
  const chrome = pets.length > 0 ? 64 : 46;
  const labelWidth = Math.max(barWidth, Math.round(statFont * 13));
  const drop = overheadDrop(slot.y, body, chrome);
  return (
    <View
      testID={testID}
      style={[
        styles.fighter,
        {
          left: slot.x,
          top: slot.y,
          width: Math.max(barWidth, labelWidth),
          height: body,
          zIndex: 8 + Math.min(40, Math.round(slot.y / 8)),
          transform: [{ translateX: -(Math.max(barWidth, labelWidth) / 2) }, { translateY: -body }],
        },
      ]}
    >
      <View pointerEvents="none" style={{ position: 'absolute', top: -chrome + drop, width: labelWidth, alignSelf: 'center' }}>
        <Text style={[styles.statLine, { fontSize: statFont, width: labelWidth }]} numberOfLines={1}>
          Cấp {fighter.level} · ATK {attack} / DEF {defense}
        </Text>
        {pets.length > 0 ? (
          <Text style={[styles.statLine, { fontSize: statFont, width: labelWidth }]} numberOfLines={1}>
            {pets.map((pet) => `${pet.name} ${pet.hp}/${pet.maxHp}`).join(' · ')}
          </Text>
        ) : null}
        <View style={[styles.track, { width: barWidth, alignSelf: 'center' }]}>
          <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: face === 'right' ? theme.gold : '#d9897a' }]} />
          <Text style={styles.hpText}>
            {fighter.hp}/{fighter.maxHp}
          </Text>
        </View>
        <Text style={[styles.name, { fontSize: statFont, width: labelWidth }]} numberOfLines={1}>
          {fighter.name}
        </Text>
      </View>
      <View
        style={[
          styles.avatar,
          {
            height: body,
            transform: [{ scaleX: portraitScaleX(face === 'left' ? -1 : 1, character?.professionId, character?.gender) }],
          },
        ]}
      >
        {character ? (
          <CharacterAvatar character={character} hairColor={fighter.hairColor} outfitColor={fighter.outfitColor} size={portrait} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1a1612', overflow: 'hidden' },
  arena: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  frame: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: theme.gold, fontWeight: '700', letterSpacing: 1 },
  timer: { color: theme.ink, fontWeight: '800' },
  stage: { flex: 1, minHeight: 0 },
  fighter: { position: 'absolute', alignItems: 'center' },
  statLine: {
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  track: {
    height: 14,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 24, 22, 0.45)',
    marginTop: 2,
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  hpText: { color: '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center', lineHeight: 14 },
  name: { color: '#f6f1e7', fontWeight: '700', textAlign: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  logCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    backgroundColor: 'rgba(10, 18, 16, 0.72)',
    borderWidth: 1,
    borderColor: theme.lineSoft,
  },
  logScroll: { flex: 1 },
  logLine: { color: theme.ink },
  actions: { flexDirection: 'row' },
  action: { flex: 1 },
  waiting: { textAlign: 'center', color: theme.muted, paddingBottom: 8 },
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
