import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { monsterPortrait } from '../components/world/MonsterToken';
import { getCharacter } from '../data/characters';
import { useSetup } from '../state/SetupContext';
import { useWorld } from '../state/WorldContext';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';
import { SQUAD_ITEMS, classBasics } from '../world/combat';
import { monsterCatalog, resolvePetLoadout } from '../world/combat/kits';
import { ITEMS } from '../world/items';
import type { ItemId } from '../world/types';

const SLOTS = [1, 2, 3] as const;

/**
 * Landscape gate before a fight. Three slots on top, captured pets on the
 * left, and only máu, mana, and giải độc on the right.
 */
export function SquadSetupScreen() {
  const world = useWorld();
  const setup = useSetup();
  const { s, font } = useLayout();
  const professionId = getCharacter(setup.player?.baseCharacterId)?.professionId;
  const basics = classBasics(professionId);
  const savedBasic = world.heroSkills?.professionId === (professionId ?? 'wanderer') ? world.heroSkills.basicId : '';
  const [basicId, setBasicId] = useState(basics.some((skill) => skill.id === savedBasic) ? savedBasic : (basics[0]?.id ?? ''));
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [items, setItems] = useState<ItemId[]>([]);
  const captured = world.tamed;
  const supplies = world.bag.filter((stack) => SQUAD_ITEMS.includes(stack.itemId));
  const chosen = slots.filter((id): id is string => id != null);

  const assign = (id: string) => {
    const pet = captured.find((monster) => monster.id === id);
    if (!pet || pet.hp <= 0) return;
    setSlots((current) => {
      const existing = current.indexOf(id);
      if (existing >= 0) {
        const next = [...current];
        next[existing] = null;
        return next;
      }
      const hole = current.indexOf(null);
      if (hole < 0) return current;
      const next = [...current];
      next[hole] = id;
      return next;
    });
  };

  const clearSlot = (index: number) => {
    setSlots((current) => current.map((id, slot) => (slot === index ? null : id)));
  };

  const toggleItem = (itemId: ItemId) => {
    setItems((current) => (current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]));
  };

  return (
    <SafeAreaView testID="squad-setup" style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.top}>
        {SLOTS.map((number, index) => {
          const pet = captured.find((monster) => monster.id === slots[index]);
          return (
            <Pressable
              key={number}
              accessibilityRole="button"
              accessibilityLabel={pet ? `Ô ${number} ${pet.name}` : `Ô ${number} trống`}
              testID={`squad-slot-${number}`}
              onPress={() => pet && clearSlot(index)}
              style={[styles.slot, { width: s(108), height: s(72) }, pet && styles.slotOn]}
            >
              <Text style={[styles.slotIndex, { fontSize: font(12) }]}>{number}</Text>
              {pet ? <PetFace kindId={pet.kindId} name={pet.name} tint={pet.tint} /> : null}
              <Text style={[styles.slotName, { fontSize: font(11) }]} numberOfLines={1}>
                {pet ? pet.name : 'Trống'}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          testID="squad-confirm"
          onPress={() => {
            const chosenBasic = basicId || basics[0]?.id || '';
            world.equipHeroBasic(chosenBasic);
            world.confirmSquad(
              chosen.filter((id) => captured.some((monster) => monster.id === id && monster.hp > 0)),
              items,
              chosenBasic,
            );
          }}
          style={[styles.confirm, { minHeight: s(72) }]}
        >
          <Text style={[styles.confirmLabel, { fontSize: font(16) }]}>Vào trận</Text>
          <Text style={[styles.confirmHint, { fontSize: font(11) }]}>
            {chosen.length}/3 thú · {items.length} vật phẩm
          </Text>
        </Pressable>
      </View>
      <Text style={[styles.copy, { fontSize: font(12) }]}>
        Máu {Math.round(world.vitals.hp)} / {world.vitals.maxHp} · Mana {Math.round(world.vitals.mana)} / {world.vitals.maxMana}
        {world.notice ? ` · ${world.notice}` : ''}
      </Text>
      <View style={styles.split}>
        <View style={styles.pane}>
          <Text style={[styles.paneTitle, { fontSize: font(14) }]}>Sưu tập · Đã thu phục</Text>
          {captured.length === 0 ? (
            <Text style={[styles.copy, { fontSize: font(12) }]}>Chưa có thú đã thu phục. Bạn vẫn có thể vào trận một mình.</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {captured.map((monster) => {
                const on = slots.includes(monster.id);
                const downed = monster.hp <= 0;
                const book = monsterCatalog(monster.kindId);
                const petLoadout = resolvePetLoadout(monster);
                const basic = book.basics.find((skill) => skill.id === petLoadout.basicId) ?? book.basics[0];
                const skills = petLoadout.skillIds
                  .map((id) => book.skills.find((skill) => skill.id === id))
                  .filter((skill) => skill != null);
                const mark = downed ? 'Hết máu' : on ? 'Đã chọn' : 'Đã thu phục';
                return (
                  <Pressable
                    key={monster.id}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: downed, selected: on }}
                    accessibilityLabel={`${monster.name} ${mark}`}
                    disabled={downed}
                    onPress={() => assign(monster.id)}
                    style={[styles.card, on && styles.cardOn, downed && styles.cardDown]}
                  >
                    <PetFace kindId={monster.kindId} name={monster.name} tint={monster.tint} />
                    <View style={styles.cardBody}>
                      <Text style={[styles.cardName, { fontSize: font(13) }, downed && styles.downedText]} numberOfLines={1}>
                        {monster.name} · {mark}
                      </Text>
                      <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
                        Cấp {monster.level} · Công {monster.attack} · Thủ {monster.defense} · Tốc {monster.speed}
                      </Text>
                      <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
                        HP {Math.max(0, monster.hp)}/{monster.maxHp} · MP {Math.max(0, monster.mp)}/{monster.maxMp} · EXP {monster.exp}
                      </Text>
                      <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
                        {basic.name} · {skills.map((skill) => skill.name).join(' · ')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
        <View style={styles.pane}>
          <Text style={[styles.paneTitle, { fontSize: font(14) }]}>Vật phẩm</Text>
          <Text style={[styles.copy, { fontSize: font(11) }]}>Chỉ thuốc máu, thuốc mana, và giải độc.</Text>
          {supplies.length === 0 ? (
            <Text style={[styles.copy, { fontSize: font(12) }]}>Túi không có món nào trong ba loại này.</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {supplies.map((stack) => {
                const on = items.includes(stack.itemId);
                const item = ITEMS[stack.itemId];
                return (
                  <Pressable
                    key={stack.itemId}
                    accessibilityRole="button"
                    accessibilityLabel={item.nameVi}
                    onPress={() => toggleItem(stack.itemId)}
                    style={[styles.card, on && styles.cardOn]}
                  >
                    <View style={[styles.swatch, { backgroundColor: item.tint }]} />
                    <View style={styles.cardBody}>
                      <Text style={[styles.cardName, { fontSize: font(13) }]} numberOfLines={1}>
                        {item.nameVi} ×{stack.qty} · {on ? 'Mang theo' : 'Chưa chọn'}
                      </Text>
                      <Text style={[styles.copy, { fontSize: font(11) }]} numberOfLines={1}>
                        {item.blurb}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Dùng ${item.nameVi}`}
                      onPress={() => world.useBagItem(stack.itemId)}
                      style={styles.use}
                    >
                      <Text style={[styles.useLabel, { fontSize: font(11) }]}>Dùng</Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bỏ chạy"
        testID="run-away"
        onPress={() => world.cancelSquad()}
        style={styles.flee}
      >
        <Text style={[styles.fleeLabel, { fontSize: font(14) }]}>Bỏ chạy</Text>
      </Pressable>
      <View style={styles.basics}>
        <Text style={[styles.paneTitle, { fontSize: font(13) }]}>Đòn đánh thường</Text>
        {basics.map((skill) => {
          const on = basicId === skill.id;
          return (
            <Pressable
              key={skill.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={skill.name}
              onPress={() => setBasicId(skill.id)}
              style={[styles.basic, on && styles.cardOn]}
            >
              <Text style={[styles.cardName, { fontSize: font(12) }]}>{skill.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function PetFace({ kindId, name, tint }: { kindId: string; name: string; tint: string }) {
  const art = monsterPortrait(kindId);
  return (
    <View style={[styles.face, { backgroundColor: tint }]}>
      {art ? (
        <Image accessibilityLabel={name} source={art.source} resizeMode="contain" style={styles.faceImage} />
      ) : (
        <Text style={styles.faceLetter}>{name.slice(0, 1)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: 8, gap: 8 },
  flee: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    zIndex: 4,
    minWidth: 112,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.gold,
  },
  fleeLabel: { color: theme.ink, fontWeight: '800' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slot: {
    flex: 1,
    maxWidth: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  slotOn: { borderColor: theme.gold, backgroundColor: theme.cardRaised },
  slotIndex: { position: 'absolute', top: 4, left: 8, color: theme.gold, fontWeight: '800' },
  slotName: { color: theme.ink, fontWeight: '700', paddingHorizontal: 6 },
  confirm: {
    marginLeft: 'auto',
    minWidth: 120,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#e25b2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: { color: '#1b140c', fontWeight: '800' },
  confirmHint: { color: '#1b140c' },
  basics: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 128 },
  basic: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
  },
  split: { flex: 1, flexDirection: 'row', gap: 8 },
  pane: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.card,
    padding: 8,
    gap: 6,
  },
  paneTitle: { color: theme.ink, fontWeight: '800' },
  copy: { color: theme.muted },
  list: { gap: 6, paddingBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    borderRadius: 10,
    backgroundColor: theme.cardRaised,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardOn: { borderColor: theme.gold },
  cardDown: { opacity: 0.4 },
  downedText: { color: theme.muted },
  cardBody: { flex: 1, minWidth: 0 },
  use: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e25b2a' },
  useLabel: { color: '#1b140c', fontWeight: '800' },
  cardName: { color: theme.ink, fontWeight: '800' },
  face: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  faceImage: { width: 38, height: 38 },
  faceLetter: { color: '#1b140c', fontWeight: '800' },
  swatch: { width: 42, height: 42, borderRadius: 8 },
});
