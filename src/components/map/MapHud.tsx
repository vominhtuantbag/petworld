import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCharacter } from '../../data/characters';
import { useBattle } from '../../state/BattleContext';
import { useMapGrid } from '../../state/mapGrid';
import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import { CharacterAvatar } from '../CharacterAvatar';
import { nearestChallenger, type NearbyFighter } from '../world/PvpChallenge';
import { CollectionModal } from './CollectionModal';
import { InventoryModal } from './InventoryModal';
import { QuestModal } from './QuestModal';
import { SettingsModal } from './SettingsModal';
import { SkillDictionaryModal } from './SkillDictionaryModal';

export type MapMenuId = 'items' | 'collection' | 'quests' | 'dictionary' | 'settings';

type Props = {
  menu: MapMenuId | null;
  onOpen: (menu: MapMenuId) => void;
  onClose: () => void;
  self?: { x: number; y: number };
  remotes?: NearbyFighter[];
};

const BUTTONS: { id: MapMenuId; label: string; testID: string }[] = [
  { id: 'items', label: 'Vật phẩm', testID: 'map-items' },
  { id: 'collection', label: 'Sưu Tập', testID: 'map-collection' },
  { id: 'quests', label: 'Nhiệm Vụ', testID: 'map-quests' },
  { id: 'dictionary', label: 'Kỹ Năng', testID: 'map-skills' },
  { id: 'settings', label: 'Cài Đặt', testID: 'map-settings' },
];

/**
 * Equal squares along the bottom-right. The row stops short of the
 * movement stick, which sits at the bottom-left at the same size FieldStage uses.
 */
export function MapHud({ menu, onOpen, onClose, self, remotes = [] }: Props) {
  const world = useWorld();
  const battle = useBattle();
  const { width, height, s, font } = useLayout();
  const insets = useSafeAreaInsets();
  const gap = Math.max(4, Math.round(width * 0.008));
  const stick = Math.round(Math.min(height * 0.34, Math.max(96, s(118))));
  const room = width - insets.left - insets.right - 12 - stick - 24 - 8;
  const count = BUTTONS.length;
  const preferred = Math.min(s(72), (width / 3 - gap * 2) / 3);
  const original = Math.max(36, Math.min(preferred, (room - gap * (count - 1)) / count));
  const side = Math.round(Math.min(original * 0.8, Math.max(36, height * 0.2)));
  const [gridOn, setGridOn] = useMapGrid();
  const nearby = self ? nearestChallenger(self, remotes) : null;
  const [open, setOpen] = useState(false);
  const [inspect, setInspect] = useState(false);
  const busy = Boolean(battle.prep || battle.pvpOutgoing || battle.pvpIncoming || battle.battle);
  useEffect(() => {
    if (!nearby) {
      setOpen(false);
      setInspect(false);
    }
  }, [nearby]);

  useEffect(() => {
    if (menu === 'quests') world.touchQuests();
  }, [menu, world]);

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.dock, { right: insets.right + 8, bottom: insets.bottom + 12, gap }]}
      >
        {nearby && !busy && open ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Thông tin ${nearby.name}`}
              testID="nearby-info"
              onPress={() => setInspect(true)}
              style={[styles.button, nearbyStyle(side)]}
            >
              <Text style={[styles.label, nearbyLabel(font, side)]} numberOfLines={1}>
                Thông tin
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Khiêu chiến ${nearby.name}`}
              testID="nearby-pvp"
              onPress={() => battle.sendChallenge(nearby.userId)}
              style={[styles.button, nearbyStyle(side)]}
            >
              <Text style={[styles.label, nearbyLabel(font, side)]} numberOfLines={1}>
                Khiêu chiến
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mời party ${nearby.name}`}
              testID="nearby-party"
              onPress={() => battle.inviteParty(nearby.userId)}
              style={[styles.button, nearbyStyle(side)]}
            >
              <Text style={[styles.label, nearbyLabel(font, side)]} numberOfLines={1}>
                Mời party
              </Text>
            </Pressable>
          </>
        ) : nearby && !busy ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Tương tác ${nearby.name}`}
            testID="nearby-interact"
            onPress={() => setOpen(true)}
            style={[styles.button, nearbyStyle(side)]}
          >
            <Text style={[styles.label, nearbyLabel(font, side)]} numberOfLines={1}>
              Tương tác
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: gridOn }}
          accessibilityLabel={gridOn ? 'Ẩn lưới bản đồ' : 'Hiện lưới bản đồ'}
          testID="map-grid-toggle"
          onPress={() => setGridOn(!gridOn)}
          style={[
            styles.button,
            styles.gridButton,
            {
              width: side,
              height: Math.max(32, Math.round(side * 0.72)),
              borderRadius: Math.max(8, Math.round(side * 0.22)),
            },
            gridOn ? styles.gridOn : styles.gridOff,
          ]}
        >
          <Text
            style={[styles.label, { fontSize: Math.max(9, Math.min(font(12), side * 0.22)), lineHeight: Math.max(11, Math.round(side * 0.26)) }]}
            numberOfLines={1}
          >
            Lưới
          </Text>
        </Pressable>
        <View style={[styles.row, { gap }]}>
        {BUTTONS.map((button) => (
          <Pressable
            key={button.id}
            accessibilityRole="button"
            accessibilityLabel={button.label}
            testID={button.testID}
            onPress={() => onOpen(button.id)}
            style={[styles.button, { width: side, height: side, padding: 2, borderRadius: Math.max(8, Math.round(side * 0.22)) }]}
          >
            <Text style={[styles.label, { fontSize: Math.max(9, Math.min(font(12), side * 0.24)), lineHeight: Math.max(11, Math.round(side * 0.3)) }]} numberOfLines={2}>
              {button.label}
            </Text>
          </Pressable>
        ))}
        </View>
      </View>
      {menu === 'items' ? <InventoryModal onClose={onClose} /> : null}
      {menu === 'collection' ? <CollectionModal onClose={onClose} /> : null}
      {menu === 'quests' ? <QuestModal onClose={onClose} /> : null}
      {menu === 'dictionary' ? <SkillDictionaryModal onClose={onClose} /> : null}
      {menu === 'settings' ? <SettingsModal onClose={onClose} /> : null}
      {inspect && nearby ? <PlayerInspectCard target={nearby} onClose={() => setInspect(false)} /> : null}
    </>
  );
}

function nearbyStyle(side: number) {
  return {
    width: Math.max(side, 88),
    height: Math.max(32, Math.round(side * 0.72)),
    borderRadius: Math.max(8, Math.round(side * 0.22)),
  };
}

function nearbyLabel(font: (size: number) => number, side: number) {
  return { fontSize: Math.max(9, Math.min(font(12), side * 0.22)), lineHeight: Math.max(11, Math.round(side * 0.26)) };
}

function PlayerInspectCard({ target, onClose }: { target: NearbyFighter; onClose: () => void }) {
  const character = getCharacter(target.baseCharacterId);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.inspectScrim} onPress={onClose} testID="nearby-inspect">
        <Pressable style={styles.inspectCard} onPress={() => undefined}>
          {character ? (
            <CharacterAvatar
              character={character}
              hairColor={target.hairColor ?? '#e0aa78'}
              outfitColor={target.outfitColor ?? '#3d6b45'}
              size={64}
            />
          ) : null}
          <Text style={styles.inspectName}>{target.name || target.username}</Text>
          <Text style={styles.inspectMeta}>
            {character?.title ?? 'Nhân vật'} · Cấp {target.level ?? 1}
          </Text>
          <Text style={styles.inspectMeta}>
            Máu {Math.round(target.hp ?? 0)}/{Math.round(target.maxHp ?? 0)}
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.inspectClose}>
            <Text style={styles.inspectCloseLabel}>Đóng</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    zIndex: 1000001,
    alignItems: 'flex-end',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  gridButton: { paddingHorizontal: 6 },
  gridOn: { backgroundColor: 'rgba(169, 120, 50, 0.94)' },
  gridOff: { backgroundColor: 'rgba(8, 14, 12, 0.55)', borderColor: 'rgba(228, 194, 122, 0.45)' },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(8, 14, 12, 0.82)',
    borderWidth: 1,
    borderColor: theme.gold,
  },
  label: { color: theme.ink, fontWeight: '800', textAlign: 'center' },
  inspectScrim: {
    flex: 1,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  inspectCard: {
    minWidth: 220,
    maxWidth: 360,
    padding: 16,
    gap: 8,
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.gold,
    alignItems: 'center',
  },
  inspectName: { color: theme.gold, fontWeight: '800', fontSize: 18 },
  inspectMeta: { color: theme.ink, fontWeight: '600', fontSize: 13 },
  inspectClose: {
    marginTop: 8,
    minHeight: 40,
    minWidth: 120,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.goldDeep,
  },
  inspectCloseLabel: { color: theme.ink, fontWeight: '800' },
});
