import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import { emptyQuests, listQuests, type QuestView } from '../../world/quests';

type Props = { onClose: () => void };

/** Daily board resets with the calendar day. Main quests stay claimed. */
export function QuestModal({ onClose }: Props) {
  const world = useWorld();
  const { s, font } = useLayout();
  const [group, setGroup] = useState<'daily' | 'main'>('daily');
  const quests = listQuests({
    level: world.adventureLevel,
    tamed: world.tamed.length,
    track: world.quests ?? emptyQuests(),
  }).filter((quest) => quest.group === group);

  return (
    <View style={styles.scrim}>
      <View style={[styles.sheet, { padding: s(10), gap: s(6) }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: font(16) }]}>Nhiệm vụ</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Text style={[styles.closeLabel, { fontSize: font(13) }]}>Đóng</Text>
          </Pressable>
        </View>
        <View style={styles.tabs}>
          <Tab label="Hàng ngày" on={group === 'daily'} onPress={() => setGroup('daily')} font={font} />
          <Tab label="Nhiệm vụ lớn" on={group === 'main'} onPress={() => setGroup('main')} font={font} />
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {quests.map((quest) => (
            <QuestRow key={quest.id} quest={quest} font={font} onClaim={() => world.claimQuest(quest.id)} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function Tab({ label, on, onPress, font }: { label: string; on: boolean; onPress: () => void; font: (size: number) => number }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.tab, on && styles.tabOn]}>
      <Text style={[styles.tabLabel, { fontSize: font(13) }, on && styles.tabLabelOn]}>{label}</Text>
    </Pressable>
  );
}

function QuestRow({ quest, font, onClaim }: { quest: QuestView; font: (size: number) => number; onClaim: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <Text style={[styles.name, { fontSize: font(13) }]} numberOfLines={1}>
          {quest.title}
        </Text>
        <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
          {quest.detail} · {quest.progress}/{quest.need} · {quest.reward}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!quest.done || quest.claimed}
        onPress={onClaim}
        style={[styles.claim, (!quest.done || quest.claimed) && styles.claimOff]}
      >
        <Text style={[styles.claimLabel, { fontSize: font(12) }]}>{quest.claimed ? 'Đã nhận' : quest.done ? 'Nhận' : 'Đang làm'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000002,
    backgroundColor: theme.overlay,
    padding: 8,
  },
  sheet: { flex: 1, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.gold },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: theme.ink, fontWeight: '800' },
  close: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.goldDeep },
  closeLabel: { color: theme.ink, fontWeight: '800' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: theme.line },
  tabOn: { backgroundColor: theme.goldDeep, borderColor: theme.gold },
  tabLabel: { color: theme.muted, fontWeight: '700' },
  tabLabelOn: { color: theme.ink },
  list: { gap: 6, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: theme.cardRaised,
  },
  body: { flex: 1, minWidth: 0 },
  name: { color: theme.ink, fontWeight: '800' },
  copy: { color: theme.muted },
  claim: { minWidth: 72, alignItems: 'center', paddingVertical: 6, borderRadius: 8, backgroundColor: theme.goldDeep },
  claimOff: { opacity: 0.45 },
  claimLabel: { color: theme.ink, fontWeight: '800' },
});
