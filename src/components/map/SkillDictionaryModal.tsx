import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getCharacter, PROFESSIONS } from '../../data/characters';
import { useSetup } from '../../state/SetupContext';
import { useWorld } from '../../state/WorldContext';
import { learnedSkillIds } from '../../state/save/gameSave';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import { ELEMENTS, elementLabel, type ElementId } from '../../world/combat/elements';
import {
  LOCOMOTION_IDS,
  locomotionBasicSkills,
  locomotionTitle,
  numberedBiomeSkills,
  numberedClassSkills,
  skillEffect,
  skillKind,
  skillTarget,
  type LocomotionId,
} from '../../world/combat/kits';
import type { Skill } from '../../world/combat/model';
import { classSkillArt, petBasicArt, petBiomeArt } from '../../world/skillArt';
import { biomeSkillTitle } from '../../world/combat/biomeSkills';

type Props = { onClose: () => void };

type Book = 'hero' | 'wild';

type Row = {
  key: string;
  groupId: string;
  group: string;
  skill: Skill;
  tint: string;
  /** 1–5. Class lists use the number. Regional lists mark slot 5 as Ultimate. */
  slot?: number;
  ultimate?: boolean;
};

const PROFESSION_TINT: Record<string, string> = {
  ranger: '#7dba6a',
  knight: '#d7c56a',
  mage: '#7aa2e8',
  scout: '#8fd0c4',
  monk: '#e0b07a',
  healer: '#f0d2a0',
  archer: '#c4a574',
  rogue: '#c47a8a',
  bard: '#b79adf',
  guardian: '#9aa8b8',
  wanderer: '#e4c27a',
};

const ELEMENT_TINT: Record<ElementId, string> = {
  plains: '#9fd77a',
  mountain: '#c4b8a8',
  forest: '#3e9a4a',
  swamp: '#6a8f4a',
  beach: '#e6d08a',
  ocean: '#3d8fd6',
  frost: '#b9e4f2',
  savanna: '#d4a84a',
  volcano: '#e25b2a',
  desert: '#e6c48a',
  darkness: '#6a5a8a',
  light: '#f6e7a8',
  heaven: '#f0e6c8',
  hell: '#c43a22',
  chaos: '#c9a0e8',
  cosmic: '#7a90d8',
};

const LOCOMOTION_TINT: Record<LocomotionId, string> = {
  quadruped: '#c4a574',
  biped: '#c9b4f0',
  leaping: '#7dba8a',
  crawling: '#8dba6a',
  swimming: '#5b9fd6',
  flying: '#9fd0e4',
};

/**
 * Read-only skill book. Hero classes stay separate from pet and monster kits.
 * Equipping still lives in Kỹ Năng.
 */
export function SkillDictionaryModal({ onClose }: Props) {
  const { s, font, wide, width } = useLayout();
  const setup = useSetup();
  const world = useWorld();
  const known = useMemo(() => new Set(learnedSkillIds(world)), [world]);
  const ownProfession = getCharacter(setup.player?.baseCharacterId)?.professionId ?? PROFESSIONS[0].id;
  const [book, setBook] = useState<Book>('hero');
  const [heroId, setHeroId] = useState(ownProfession);
  const [wildId, setWildId] = useState<string>('basic');
  const [query, setQuery] = useState('');
  const needle = fold(query);

  const heroRows = useMemo(() => {
    const rows: Row[] = [];
    for (const profession of PROFESSIONS) {
      const tint = PROFESSION_TINT[profession.id] ?? theme.gold;
      for (const entry of numberedClassSkills(profession.id)) {
        rows.push({
          key: `${profession.id}:${entry.skill.id}`,
          groupId: profession.id,
          group: profession.title,
          skill: entry.skill,
          tint,
          slot: entry.slot,
        });
      }
    }
    return rows;
  }, []);

  const wildRows = useMemo(() => {
    const rows: Row[] = [];
    let basicSlot = 0;
    for (const motion of LOCOMOTION_IDS) {
      const tint = LOCOMOTION_TINT[motion];
      for (const skill of locomotionBasicSkills(motion)) {
        basicSlot += 1;
        rows.push({
          key: `loco:${motion}:${skill.id}`,
          groupId: `body:${motion}`,
          group: locomotionTitle(motion),
          skill,
          tint,
          slot: basicSlot,
        });
      }
    }
    for (const element of ELEMENTS) {
      const tint = ELEMENT_TINT[element];
      for (const entry of numberedBiomeSkills(element)) {
        rows.push({
          key: `element:${element}:${entry.skill.id}`,
          groupId: `elem:${element}`,
          group: `Hệ ${elementLabel(element)}`,
          skill: entry.skill,
          tint,
          slot: entry.slot,
          ultimate: entry.ultimate,
        });
      }
    }
    return rows;
  }, []);

  const shown = (book === 'hero' ? heroRows : wildRows).filter((row) => {
    const inGroup = book === 'hero'
      ? row.groupId === heroId
      : wildId === 'basic'
        ? row.groupId.startsWith('body:')
        : row.groupId === `elem:${wildId}`;
    if (!inGroup) return false;
    if (!needle) return true;
    const hay = fold(`${row.skill.name} ${row.group} ${skillEffect(row.skill)} ${skillTarget(row.skill)}`);
    return hay.includes(needle);
  });
  const classTabs = PROFESSIONS.map((profession) => ({ id: profession.id, label: profession.title }));
  const wildTabs = [{ id: 'basic', label: 'Đánh thường' }, ...ELEMENTS.map((element) => ({ id: element, label: elementLabel(element) }))];
  const tabs = book === 'hero' ? classTabs : wildTabs;
  const selectedId = book === 'hero' ? heroId : wildId;
  const tabFont =
    book === 'wild'
      ? Math.max(8, Math.min(font(10), 11))
      : Math.max(7, Math.min(font(10), Math.floor((width - 48) / Math.max(1, tabs.length) / 4.2)));

  return (
    <View style={styles.scrim} testID="skill-dictionary">
      <View style={[styles.sheet, { padding: s(10), gap: s(8) }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: font(16) }]}>Kỹ Năng</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close} testID="dictionary-close">
            <Text style={[styles.closeLabel, { fontSize: font(13) }]}>Đóng</Text>
          </Pressable>
        </View>
        <View style={styles.toolRow}>
          <View style={styles.bookHalf}>
            <Tab label="Nhân vật" selected={book === 'hero'} onPress={() => setBook('hero')} testID="dictionary-tab-hero" fontSize={font(12)} />
            <Tab label="Quái & thú" selected={book === 'wild'} onPress={() => setBook('wild')} testID="dictionary-tab-wild" fontSize={font(12)} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm tên kỹ năng"
            placeholderTextColor={theme.dim}
            autoCapitalize="none"
            autoCorrect={false}
            testID="dictionary-search"
            style={[styles.search, styles.searchHalf, { fontSize: font(13), minHeight: s(36), borderRadius: s(10), paddingHorizontal: s(10) }]}
          />
        </View>
        <View style={[styles.classRow, book === 'wild' && styles.classRowWrap]}>
          {tabs.map((entry) => (
            <Tab
              key={entry.id}
              label={entry.label}
              selected={selectedId === entry.id}
              onPress={() => (book === 'hero' ? setHeroId(entry.id) : setWildId(entry.id))}
              testID={`dictionary-group-${entry.id}`}
              fontSize={tabFont}
              compact
            />
          ))}
        </View>
        <ScrollView style={styles.list} contentContainerStyle={[styles.grid, wide && book !== 'hero' && styles.gridWide]}>
          {shown.length === 0 ? (
            <Text style={[styles.empty, { fontSize: font(13) }]}>Không có kỹ năng khớp.</Text>
          ) : (
            shown.map((row) => <SkillCard key={row.key} row={row} known={known.has(row.skill.id)} wide={wide} font={font} pad={s(8)} icon={s(36)} />)
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function SkillCard({ row, known, wide, font, pad, icon }: { row: Row; known: boolean; wide: boolean; font: (n: number) => number; pad: number; icon: number }) {
  const skill = row.skill;
  const kind = skillKind(skill);
  const art = skillArtFor(row);
  const title = row.ultimate ? biomeSkillTitle(row.slot ?? 5, skill.name) : row.slot ? `${row.slot}. ${skill.name}` : skill.name;
  const kindLabel = row.ultimate ? 'Ultimate' : kind === 'basic' ? 'Đòn thường' : kind === 'heal' ? 'Hồi máu' : kind === 'utility' ? 'Hỗ trợ' : 'Kỹ năng';
  return (
    <View style={[styles.card, wide && styles.cardWide, row.ultimate && styles.cardUltimate, { padding: pad, gap: 4 }]}>
      <View style={styles.cardTop}>
        <View style={[styles.icon, { width: icon, height: icon, borderRadius: icon / 4, backgroundColor: art ? '#14110e' : row.ultimate ? '#6a4a12' : row.tint }]}>
          {art ? (
            <Image source={art} style={{ width: icon, height: icon, borderRadius: icon / 4 }} resizeMode="cover" />
          ) : (
            <Text style={[styles.mark, { fontSize: font(14) }]}>{row.ultimate ? 'U' : skill.name.slice(0, 1)}</Text>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.name, row.slot || row.ultimate ? styles.nameNumbered : null, row.ultimate ? styles.nameUltimate : null, { fontSize: font(14) }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.meta, { fontSize: font(11) }]} numberOfLines={1}>
            {row.group} ·{' '}
            {kindLabel}
            {known ? ' · Đã mở' : ''}
          </Text>
        </View>
      </View>
      <Text style={[styles.meta, { fontSize: font(12) }]}>
        MP {skill.mana} · Hồi {skill.cooldown} lượt · {skillTarget(skill)}
      </Text>
      <Text style={[styles.effect, { fontSize: font(12) }]}>{skillEffect(skill)}</Text>
    </View>
  );
}

function skillArtFor(row: Row) {
  if (row.groupId.startsWith('body:') && row.slot) return petBasicArt(row.slot);
  if (row.groupId.startsWith('elem:') && row.slot) return petBiomeArt(row.groupId.slice(5), row.slot);
  if (row.slot && !row.ultimate) return classSkillArt(row.groupId, row.slot);
  return null;
}

function Tab({ label, selected, onPress, fontSize, testID, compact }: { label: string; selected: boolean; onPress: () => void; fontSize: number; testID?: string; compact?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={testID}
      onPress={onPress}
      style={[styles.tab, compact && styles.tabCompact, selected && styles.tabOn]}
    >
      <Text style={[styles.tabLabel, { fontSize }, selected && styles.tabLabelOn]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
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
    justifyContent: 'center',
  },
  sheet: { flex: 1, backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.gold },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: theme.ink, fontWeight: '800' },
  close: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.goldDeep },
  closeLabel: { color: theme.ink, fontWeight: '800' },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookHalf: { flex: 1, flexDirection: 'row', gap: 6 },
  searchHalf: { flex: 1 },
  classRow: { flexDirection: 'row', alignItems: 'stretch', gap: 2 },
  classRowWrap: { flexWrap: 'wrap' },
  tabs: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.cardRaised,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  tabCompact: { minHeight: 34, borderRadius: 8, paddingHorizontal: 1, minWidth: 52, flexGrow: 1, flexBasis: '11%' },
  tabOn: { borderColor: theme.gold, backgroundColor: theme.goldDeep },
  tabLabel: { color: theme.muted, fontWeight: '800', textAlign: 'center' },
  tabLabelOn: { color: theme.ink },
  search: { color: theme.ink, backgroundColor: theme.bgDeep, borderWidth: 1, borderColor: theme.line },
  list: { flex: 1 },
  grid: { gap: 8, paddingBottom: 12 },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { borderRadius: 12, backgroundColor: theme.cardRaised, borderWidth: 1, borderColor: theme.line },
  cardUltimate: { borderColor: '#ffe082', backgroundColor: '#2a2214' },
  cardWide: { flexGrow: 1, flexBasis: '46%', maxWidth: '49%' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { alignItems: 'center', justifyContent: 'center' },
  mark: { color: '#1b140c', fontWeight: '900' },
  cardBody: { flex: 1, minWidth: 0 },
  name: { color: theme.ink, fontWeight: '800' },
  nameNumbered: {
    color: '#ffffff',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(16, 12, 8, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  nameUltimate: { color: '#ffe082' },
  meta: { color: theme.muted, fontWeight: '700' },
  effect: { color: theme.ink },
  empty: { color: theme.muted, textAlign: 'center', padding: 16 },
});
