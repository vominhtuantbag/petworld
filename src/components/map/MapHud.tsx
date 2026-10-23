import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
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
export function MapHud({ menu, onOpen, onClose }: Props) {
  const world = useWorld();
  const { width, height, s, font } = useLayout();
  const insets = useSafeAreaInsets();
  const gap = Math.max(4, Math.round(width * 0.008));
  const stick = Math.round(Math.min(height * 0.34, Math.max(96, s(118))));
  const room = width - insets.left - insets.right - 12 - stick - 24 - 8;
  const count = BUTTONS.length;
  const preferred = Math.min(s(72), (width / 3 - gap * 2) / 3);
  const original = Math.max(36, Math.min(preferred, (room - gap * (count - 1)) / count));
  const side = Math.round(original * 0.8);

  useEffect(() => {
    if (menu === 'quests') world.touchQuests();
  }, [menu, world]);

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.dock, { right: insets.right + 8, bottom: insets.bottom + 12, gap }]}
      >
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
      {menu === 'items' ? <InventoryModal onClose={onClose} /> : null}
      {menu === 'collection' ? <CollectionModal onClose={onClose} /> : null}
      {menu === 'quests' ? <QuestModal onClose={onClose} /> : null}
      {menu === 'dictionary' ? <SkillDictionaryModal onClose={onClose} /> : null}
      {menu === 'settings' ? <SettingsModal onClose={onClose} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    zIndex: 1000001,
    flexDirection: 'row',
    alignItems: 'center',
  },
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
});
