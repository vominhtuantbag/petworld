import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { monsterPortrait } from '../world/MonsterToken';
import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import type { TamedMonster } from '../../world/combat';
import { monsterCatalog, resolvePetLoadout } from '../../world/combat/kits';
import { collectionSpecies, type CollectionSpecies } from '../../world/collection';

type Props = { onClose: () => void };

/** Captured monsters, plus the three plains species that can be met and tamed. */
export function CollectionModal({ onClose }: Props) {
  const world = useWorld();
  const { s, font } = useLayout();
  const species = collectionSpecies();
  const owned = new Set(world.tamed.map((monster) => monster.kindId));
  const met = new Set([...world.discovered, ...world.tamed.map((monster) => monster.kindId)]);

  return (
    <View style={styles.scrim}>
      <View style={[styles.sheet, { padding: s(10), gap: s(6) }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: font(16) }]}>Sưu tập · {world.tamed.length}</Text>
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
              Chưa thu phục. Hạ máu xuống 5% rồi dùng Lưới. Thỏ đồng và Chuột đồng ở khu cấp 1–2, Nhái bén ở khu cấp 3–4.
            </Text>
          ) : (
            world.tamed.map((monster) => <Card key={monster.id} monster={monster} font={font} />)
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function SpeciesCard({ entry, caught, seen, font }: { entry: CollectionSpecies; caught: boolean; seen: boolean; font: (size: number) => number }) {
  const art = monsterPortrait(entry.id);
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: entry.tint }]}>
        {art ? (
          <Image accessibilityLabel={entry.name} source={art.source} resizeMode="contain" style={styles.image} />
        ) : (
          <Text style={[styles.letter, { fontSize: font(16) }]}>{entry.name.slice(0, 1)}</Text>
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
      </View>
    </View>
  );
}

function Card({ monster, font }: { monster: TamedMonster; font: (size: number) => number }) {
  const art = monsterPortrait(monster.kindId);
  const hp = monster.hp || monster.maxHp;
  const mp = monster.mp || monster.maxMp;
  const book = monsterCatalog(monster.kindId);
  const loadout = resolvePetLoadout(monster);
  const basic = book.basics.find((skill) => skill.id === loadout.basicId) ?? book.basics[0];
  const skills = loadout.skillIds.map((id) => book.skills.find((skill) => skill.id === id)).filter((skill) => skill != null);
  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: monster.tint }]}>
        {art ? (
          <Image accessibilityLabel={monster.name} source={art.source} resizeMode="contain" style={styles.image} />
        ) : (
          <Text style={[styles.letter, { fontSize: font(16) }]}>{monster.name.slice(0, 1)}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { fontSize: font(13) }]} numberOfLines={1}>
          {monster.name}
        </Text>
        <Text style={[styles.status, styles.statusOn, { fontSize: font(11) }]} numberOfLines={1}>
          Đã thu phục
        </Text>
        <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
          Cấp {monster.level} · EXP {monster.exp}
        </Text>
        <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
          Máu {hp}/{monster.maxHp} · Mana {mp}/{monster.maxMp}
        </Text>
        <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={2}>
          {basic.name} · {skills.map((skill) => skill.name).join(' · ')}
        </Text>
      </View>
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
  copy: { color: theme.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  card: {
    width: 280,
    maxWidth: '48%',
    flexGrow: 1,
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
  body: { flex: 1, minWidth: 0 },
  name: { color: theme.ink, fontWeight: '800' },
  status: { color: theme.muted, fontWeight: '800' },
  statusOn: { color: theme.gold },
});
