import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AdvancedStatsGrid } from '../combat/AdvancedStatsGrid';
import { monsterInitials } from '../world/monsterArt';
import { monsterPortrait } from '../world/MonsterToken';
import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import type { TamedMonster } from '../../world/combat';
import { monsterCatalog, resolvePetLoadout } from '../../world/combat/kits';
import { petAdvancedView } from '../../world/combat/statView';
import { collectionSpecies, type CollectionSpecies } from '../../world/collection';

type Props = { onClose: () => void };

/** Captured monsters, plus the plains rabbit species card. */
export function CollectionModal({ onClose }: Props) {
  const world = useWorld();
  const { s, font } = useLayout();
  const species = collectionSpecies();
  const owned = new Set(world.tamed.map((monster) => monster.kindId));
  const met = new Set([...world.discovered, ...world.tamed.map((monster) => monster.kindId)]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [fragmentId, setFragmentId] = useState<string | null>(null);
  const fragmentTarget = world.tamed.find((monster) => monster.id === fragmentId) ?? null;

  const startRename = (monster: TamedMonster) => {
    setEditingId(monster.id);
    setDraft(monster.name);
  };

  const commitRename = () => {
    if (!editingId || !draft.trim()) return;
    world.renamePet(editingId, draft);
    setEditingId(null);
  };

  const confirmFragment = () => {
    if (!fragmentId) return;
    world.fragmentPet(fragmentId);
    if (editingId === fragmentId) setEditingId(null);
    setFragmentId(null);
  };

  return (
    <View style={styles.scrim}>
      <View style={[styles.sheet, { padding: s(10), gap: s(6) }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: font(16) }]}>PET · {world.tamed.length}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Text style={[styles.closeLabel, { fontSize: font(13) }]}>Đóng</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.grid}>
          {species.map((entry) => (
            <SpeciesCard key={entry.id} entry={entry} caught={owned.has(entry.id)} seen={met.has(entry.id)} font={font} />
          ))}
          {world.tamed.length === 0 ? (
            <Text style={[styles.copy, { fontSize: font(13), width: '100%' }]}>
              Chưa thu phục. Hạ máu xuống 5% rồi dùng Lưới.
            </Text>
          ) : (
            world.tamed.map((monster) => (
              <Card
                key={monster.id}
                monster={monster}
                font={font}
                editing={editingId === monster.id}
                draft={draft}
                onDraft={setDraft}
                onEdit={() => startRename(monster)}
                onCommit={commitRename}
                onFragment={() => setFragmentId(monster.id)}
              />
            ))
          )}
        </ScrollView>
        {fragmentTarget ? (
          <View style={styles.askScrim}>
            <View style={styles.askCard}>
              <Text style={[styles.askTitle, { fontSize: font(16) }]}>Bạn có muốn phân mảnh không?</Text>
              <Text style={[styles.copy, { fontSize: font(13) }]} numberOfLines={2}>
                {fragmentTarget.name} biến thành 1–7 mảnh. Thú này sẽ mất.
              </Text>
              <View style={styles.askRow}>
                <Pressable accessibilityRole="button" onPress={() => setFragmentId(null)} style={styles.askCancel}>
                  <Text style={[styles.askLabel, { fontSize: font(14) }]}>Huỷ</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={confirmFragment} style={styles.askOk}>
                  <Text style={[styles.askLabel, { fontSize: font(14) }]}>OK</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SpeciesCard({ entry, caught, seen, font }: { entry: CollectionSpecies; caught: boolean; seen: boolean; font: (size: number) => number }) {
  const art = monsterPortrait(entry.id);
  const advanced = {
    tgh: entry.tgh,
    maxTgh: entry.maxTgh,
    armPen: entry.armPen,
    res: entry.res,
    critRate: entry.critRate,
    critDamage: entry.critDamage,
    eva: entry.eva,
    acc: entry.acc,
  };
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: entry.tint }]}>
        {art ? (
          <Image accessibilityLabel={entry.name} source={art.source} resizeMode="contain" style={styles.image} />
        ) : (
          <Text style={[styles.letter, { fontSize: font(16) }]}>{monsterInitials(entry.name)}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { fontSize: font(13) }]} numberOfLines={1}>
          {entry.name}
        </Text>
        <Text style={[styles.status, caught && styles.statusOn, { fontSize: font(11) }]} numberOfLines={1}>
          {caught ? 'Đã thu phục' : seen ? 'Đã gặp' : 'Chưa gặp'}
        </Text>
        <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
          Cấp {entry.levelMin}–{entry.levelMax} · Máu {entry.hp} · Mana {entry.mp}
        </Text>
        <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={2}>
          {entry.skills.join(' · ')}
        </Text>
        <AdvancedStatsGrid stats={advanced} font={font} compact />
      </View>
    </View>
  );
}

function Card({
  monster,
  font,
  editing,
  draft,
  onDraft,
  onEdit,
  onCommit,
  onFragment,
}: {
  monster: TamedMonster;
  font: (size: number) => number;
  editing: boolean;
  draft: string;
  onDraft: (value: string) => void;
  onEdit: () => void;
  onCommit: () => void;
  onFragment: () => void;
}) {
  const art = monsterPortrait(monster.kindId);
  const hp = monster.hp || monster.maxHp;
  const mp = monster.mp || monster.maxMp;
  const book = monsterCatalog(monster.kindId);
  const loadout = resolvePetLoadout(monster);
  const basic = book.basics.find((skill) => skill.id === loadout.basicId) ?? book.basics[0];
  const skills = loadout.skillIds.map((id) => book.skills.find((skill) => skill.id === id)).filter((skill) => skill != null);
  const advanced = petAdvancedView(monster);
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: monster.tint }]}>
        {art ? (
          <Image accessibilityLabel={monster.name} source={art.source} resizeMode="contain" style={styles.image} />
        ) : (
          <Text style={[styles.letter, { fontSize: font(16) }]}>{monsterInitials(monster.name)}</Text>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          {editing ? (
            <TextInput
              value={draft}
              onChangeText={onDraft}
              onSubmitEditing={onCommit}
              maxLength={40}
              autoFocus
              selectTextOnFocus
              placeholder="Tên thú"
              placeholderTextColor={theme.dim}
              style={[styles.nameInput, { fontSize: font(13) }]}
            />
          ) : (
            <Text style={[styles.name, { fontSize: font(13) }]} numberOfLines={1}>
              {monster.name}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? `Lưu tên ${monster.name}` : `Đổi tên ${monster.name}`}
            onPress={editing ? onCommit : onEdit}
            style={styles.pencil}
          >
            {editing ? (
              <Text style={[styles.pencilSave, { fontSize: font(11) }]}>Lưu</Text>
            ) : (
              <PencilIcon size={font(14)} />
            )}
          </Pressable>
        </View>
        <Text style={[styles.status, styles.statusOn, { fontSize: font(11) }]} numberOfLines={1}>
          Đã thu phục
        </Text>
        <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
          Cấp {monster.level} · EXP {monster.exp} · Công {monster.attack} · Thủ {monster.defense}
        </Text>
        <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
          Máu {hp}/{monster.maxHp} · Mana {mp}/{monster.maxMp}
        </Text>
        <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={2}>
          {basic.name} · {skills.map((skill) => skill.name).join(' · ')}
        </Text>
        <AdvancedStatsGrid stats={advanced} font={font} compact />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Phân mảnh ${monster.name}`}
        onPress={onFragment}
        style={styles.fragment}
      >
        <ShardIcon size={font(18)} />
      </Pressable>
    </View>
  );
}

function PencilIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        fill={theme.gold}
      />
    </Svg>
  );
}

function ShardIcon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2l7 6-3 14H8L5 8l7-6z" fill={theme.gold} />
      <Path d="M12 2v20M5 8h14" stroke="#1b140c" strokeWidth="1.4" />
    </Svg>
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
  sheet: { flex: 1, position: 'relative', backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.gold },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: theme.ink, fontWeight: '800' },
  close: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.goldDeep },
  closeLabel: { color: theme.ink, fontWeight: '800' },
  copy: { color: theme.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  card: {
    width: 320,
    maxWidth: '48%',
    flexGrow: 1,
    position: 'relative',
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: theme.cardRaised,
    borderWidth: 1,
    borderColor: theme.line,
  },
  avatar: { width: 54, height: 54, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: 50, height: 50 },
  letter: { color: '#1b140c', fontWeight: '800' },
  body: { flex: 1, minWidth: 0, paddingRight: 30 },
  nameRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%', gap: 2 },
  name: { flexShrink: 1, minWidth: 0, color: theme.ink, fontWeight: '800' },
  nameInput: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 120,
    color: theme.ink,
    fontWeight: '800',
    margin: 0,
    paddingVertical: 0,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.gold,
    backgroundColor: theme.bgDeep,
  },
  pencil: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  pencilSave: { color: theme.gold, fontWeight: '800' },
  fragment: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.overlay,
    borderRadius: 16,
    padding: 16,
  },
  askCard: {
    width: 320,
    maxWidth: '100%',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.gold,
  },
  askTitle: { color: theme.ink, fontWeight: '800', textAlign: 'center' },
  askRow: { flexDirection: 'row', gap: 8 },
  askCancel: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: theme.cardRaised },
  askOk: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: theme.goldDeep },
  askLabel: { color: theme.ink, fontWeight: '800' },
  status: { color: theme.muted, fontWeight: '800' },
  statusOn: { color: theme.gold },
});
