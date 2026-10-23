import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PROFESSIONS, getCharacter, getProfession } from '../../data/characters';
import { useSetup } from '../../state/SetupContext';
import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import { combatElement, elementLabel } from '../../world/combat/elements';
import { classCatalog, describeSkill, monsterCatalog, resolveHeroLoadout, resolvePetLoadout, skillKind } from '../../world/combat/kits';
import type { Skill } from '../../world/combat/model';

type Props = { onClose: () => void };

type Pick = { owner: string; skillId: string };

/**
 * Skill book for the signed-in hero and every tamed monster.
 * The hero equips one basic attack and two class skills.
 * A pet equips one of three basics and two of its element's first three skills.
 */
export function SkillModal({ onClose }: Props) {
  const world = useWorld();
  const setup = useSetup();
  const { s, font } = useLayout();
  const character = getCharacter(setup.player?.baseCharacterId);
  const mine = character?.professionId ?? 'wanderer';
  const [professionId, setProfessionId] = useState(mine);
  const [picked, setPicked] = useState<Pick | null>(null);
  const hero = resolveHeroLoadout(world.heroSkills, mine, setup.player?.name);
  const viewingMine = professionId === mine;
  const catalog = classCatalog(professionId);
  const title = getProfession(professionId)?.title ?? 'Nhân vật';
  const inspected = findSkill(picked, professionId, world.tamed);

  return (
    <View style={styles.scrim}>
      <View style={[styles.sheet, { padding: s(10), gap: s(6) }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { fontSize: font(16) }]}>Kỹ Năng</Text>
          <Text style={[styles.copy, { fontSize: font(12) }]} numberOfLines={1}>
            {getProfession(mine)?.title ?? 'Nhân vật'} · một đòn thường · hai kỹ năng
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close} testID="skills-close">
            <Text style={[styles.closeLabel, { fontSize: font(13) }]}>Đóng</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chips}>
          {PROFESSIONS.map((profession) => {
            const on = profession.id === professionId;
            return (
              <Pressable
                key={profession.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setProfessionId(profession.id)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipLabel, { fontSize: font(12) }, on && styles.chipLabelOn]}>{profession.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.split}>
          <ScrollView style={styles.pane} contentContainerStyle={styles.list}>
            <Text style={[styles.section, { fontSize: font(13) }]}>
              {title}
              {viewingMine ? ' · đang dùng' : ' · chỉ xem'}
            </Text>
            {catalog.basics.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                font={font}
                equipped={viewingMine && hero.basicId === skill.id ? 'basic' : 'none'}
                locked={!viewingMine}
                selected={picked?.owner === 'hero' && picked.skillId === skill.id}
                onInspect={() => setPicked({ owner: 'hero', skillId: skill.id })}
                onEquip={viewingMine ? () => world.equipHeroBasic(skill.id) : undefined}
              />
            ))}
            {catalog.skills.map((skill) => {
              const slot = viewingMine ? hero.skillIds.indexOf(skill.id) : -1;
              return (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  font={font}
                  equipped={slot === 0 ? 'first' : slot === 1 ? 'second' : 'none'}
                  locked={!viewingMine}
                  selected={picked?.owner === 'hero' && picked.skillId === skill.id}
                  onInspect={() => setPicked({ owner: 'hero', skillId: skill.id })}
                  onEquip={viewingMine ? () => world.equipHeroSkill(skill.id) : undefined}
                />
              );
            })}
          </ScrollView>
          <ScrollView style={styles.pane} contentContainerStyle={styles.list}>
            <Text style={[styles.section, { fontSize: font(13) }]}>Đã thu phục · {world.tamed.length}</Text>
            {world.tamed.length === 0 ? (
              <Text style={[styles.copy, { fontSize: font(12) }]}>Chưa có quái. Thu phục trên bản đồ để mang kỹ năng của chúng.</Text>
            ) : (
              world.tamed.map((monster) => {
                const book = monsterCatalog(monster.kindId);
                const loadout = resolvePetLoadout(monster);
                const offered = new Set(book.skills.slice(0, 3).map((skill) => skill.id));
                return (
                  <View key={monster.id} style={styles.pet}>
                    <Text style={[styles.section, { fontSize: font(12) }]} numberOfLines={1}>
                      {monster.name} · {elementLabel(combatElement(monster.kindId))} · cấp {monster.level}
                    </Text>
                    {book.basics.map((skill) => (
                      <SkillRow
                        key={skill.id}
                        skill={skill}
                        font={font}
                        equipped={loadout.basicId === skill.id ? 'basic' : 'none'}
                        selected={picked?.owner === monster.id && picked.skillId === skill.id}
                        onInspect={() => setPicked({ owner: monster.id, skillId: skill.id })}
                        onEquip={() => world.equipPetBasic(monster.id, skill.id)}
                      />
                    ))}
                    {book.skills.map((skill) => {
                      const slot = loadout.skillIds.indexOf(skill.id);
                      const locked = !offered.has(skill.id);
                      return (
                        <SkillRow
                          key={skill.id}
                          skill={skill}
                          font={font}
                          equipped={slot === 0 ? 'first' : slot === 1 ? 'second' : 'none'}
                          locked={locked}
                          selected={picked?.owner === monster.id && picked.skillId === skill.id}
                          onInspect={() => setPicked({ owner: monster.id, skillId: skill.id })}
                          onEquip={locked ? undefined : () => world.equipPetSkill(monster.id, skill.id)}
                        />
                      );
                    })}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
        <Detail skill={inspected} font={font} />
      </View>
    </View>
  );
}

function findSkill(picked: Pick | null, professionId: string, tamed: { id: string; kindId: string }[]): Skill | null {
  if (!picked) return null;
  const pool = picked.owner === 'hero' ? [...classCatalog(professionId).basics, ...classCatalog(professionId).skills] : skillPool(tamed.find((monster) => monster.id === picked.owner)?.kindId);
  return pool.find((skill) => skill.id === picked.skillId) ?? null;
}

function skillPool(kindId: string | undefined): Skill[] {
  if (!kindId) return [];
  const book = monsterCatalog(kindId);
  return [...book.basics, ...book.skills];
}

function SkillRow({
  skill,
  font,
  equipped,
  locked,
  selected,
  onInspect,
  onEquip,
}: {
  skill: Skill;
  font: (size: number) => number;
  equipped: 'none' | 'basic' | 'first' | 'second';
  locked?: boolean;
  selected: boolean;
  onInspect: () => void;
  onEquip?: () => void;
}) {
  const kind = skillKind(skill);
  const tint = kind === 'basic' ? '#e4c27a' : kind === 'heal' ? '#3cba45' : '#7fd0c4';
  const mark = equipped === 'basic' ? 'Đang dùng' : equipped === 'first' ? 'Ô 1' : equipped === 'second' ? 'Ô 2' : locked ? 'Khóa' : 'Mang theo';
  return (
    <View style={[styles.row, selected && styles.rowOn]}>
      <Pressable accessibilityRole="button" accessibilityLabel={skill.name} onPress={onInspect} style={styles.inspect}>
        <View style={[styles.icon, { backgroundColor: locked ? '#5c6b66' : tint }]}>
          <Text style={[styles.glyph, { fontSize: font(14) }]}>{skill.name.slice(0, 1)}</Text>
        </View>
        <View style={styles.body}>
          <Text style={[styles.name, { fontSize: font(13) }]} numberOfLines={1}>
            {skill.name}
          </Text>
          <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
            {kind === 'basic' ? 'Đòn thường' : kind === 'heal' ? 'Hồi máu' : 'Kỹ năng'} · Mana {skill.mana} · Hồi {skill.cooldown} · ×{skill.power}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${mark} ${skill.name}`}
        disabled={!onEquip || equipped === 'basic' || equipped === 'first'}
        onPress={onEquip}
        style={[styles.equip, !onEquip && styles.equipOff]}
      >
        <Text style={[styles.equipLabel, { fontSize: font(11) }]}>{mark}</Text>
      </Pressable>
    </View>
  );
}

function Detail({ skill, font }: { skill: Skill | null; font: (size: number) => number }) {
  if (!skill) {
    return (
      <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={2}>
        Chọn một dòng để xem mô tả. Ô 2 là ô bị thay. Bấm kỹ năng đang ở ô 2 để đưa nó lên ô 1.
      </Text>
    );
  }
  const kind = skillKind(skill);
  return (
    <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={2}>
      {kind === 'basic' ? 'Đòn thường' : kind === 'heal' ? 'Hồi máu' : 'Kỹ năng'} · {describeSkill(skill)}
    </Text>
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
  sheet: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.gold },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: theme.ink, fontWeight: '800' },
  close: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.goldDeep },
  closeLabel: { color: theme.ink, fontWeight: '800' },
  chipBar: { flexGrow: 0, flexShrink: 0, maxHeight: 40 },
  chips: { gap: 6, paddingRight: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: theme.line },
  chipOn: { backgroundColor: theme.goldDeep, borderColor: theme.gold },
  chipLabel: { color: theme.muted, fontWeight: '700' },
  chipLabelOn: { color: theme.ink },
  split: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 8 },
  pane: { flex: 1, minHeight: 0 },
  list: { gap: 6, paddingBottom: 8 },
  section: { color: theme.gold, fontWeight: '800' },
  pet: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4, borderRadius: 10, backgroundColor: theme.cardRaised },
  rowOn: { borderWidth: 1, borderColor: theme.gold },
  inspect: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  icon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  glyph: { color: '#10211c', fontWeight: '800' },
  body: { flex: 1, minWidth: 0 },
  name: { color: theme.ink, fontWeight: '800' },
  copy: { color: theme.muted },
  equip: { minWidth: 72, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 6, borderRadius: 8, backgroundColor: theme.goldDeep },
  equipOff: { opacity: 0.55 },
  equipLabel: { color: theme.ink, fontWeight: '800', textAlign: 'center' },
});
