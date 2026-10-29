import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import { getRegion, listStarterRegions } from '../../data/regions';
import { isRingTown, LOCKED_LAND, SPECIAL_REGION_IDS, specialRegionOpen, tierWindow } from '../../world/atlas';
import { TIER_MAP_H, TIER_MAP_W } from '../../world/grid';
import { entrancePad, MAP_TIERS, tierRange, tierZoneId } from '../../world/tiers';
import {
  INN_COST,
  ITEMS,
  SMITH_STOCK,
  STORE_STOCK,
  UPGRADE_CAP,
  armorDefense,
  upgradeCost,
  weaponAttack,
} from '../../world/items';
import type { ServiceId } from '../../world/types';

type PanelId = ServiceId | 'bag';

type Props = {
  panel: PanelId;
  onClose: () => void;
};

/**
 * Landscape sheet for one town service. The map keeps running underneath
 * with movement paused, so closing the sheet returns you to the same spot.
 */
export function ServicePanel({ panel, onClose }: Props) {
  const world = useWorld();
  const { font, wide, height } = useLayout();
  const title =
    panel === 'store'
      ? 'Tạp hóa'
      : panel === 'smith'
        ? 'Thợ rèn'
        : panel === 'storage'
          ? 'Kho đồ'
          : panel === 'travel'
            ? 'Dịch chuyển'
            : panel === 'inn'
              ? 'Nhà nghỉ'
              : panel === 'bag'
                ? 'Túi đồ'
                : 'Đấu trường';

  return (
    <View style={[styles.sheet, wide ? styles.sheetWide : styles.sheetNarrow]}>
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: font(20) }]}>{title}</Text>
        <Text accessibilityRole="button" onPress={onClose} style={[styles.close, { fontSize: font(14) }]}>
          Đóng
        </Text>
      </View>
      <ScrollView style={wide ? styles.scrollWide : { maxHeight: Math.round(height * 0.52) }} contentContainerStyle={styles.body}>
        {panel === 'store' ? <StoreRows /> : null}
        {panel === 'smith' ? <SmithRows /> : null}
        {panel === 'storage' ? <StorageRows /> : null}
        {panel === 'travel' ? <TravelRows /> : null}
        {panel === 'inn' ? <InnRows /> : null}
        {panel === 'bag' ? <BagRows /> : null}
        {panel === 'pvp' ? <Text style={styles.copy}>Bảng đấu trường mở sảnh PvP.</Text> : null}
        <Text style={styles.copy}>Vàng: {world.gold}</Text>
      </ScrollView>
    </View>
  );
}

function StoreRows() {
  const world = useWorld();
  return (
    <>
      {STORE_STOCK.map((itemId) => (
        <Row
          key={itemId}
          title={`${ITEMS[itemId].nameVi} · ${ITEMS[itemId].price} vàng`}
          detail={ITEMS[itemId].blurb}
          action="Mua"
          onPress={() => world.buy(itemId)}
        />
      ))}
      <BagRows />
    </>
  );
}

function SmithRows() {
  const world = useWorld();
  return (
    <>
      <Text style={styles.copy}>
        Tấn công {world.attack} · Thủ {world.defense}
      </Text>
      {SMITH_STOCK.map((itemId) => (
        <Row
          key={itemId}
          title={`${ITEMS[itemId].nameVi} · ${ITEMS[itemId].price} vàng`}
          detail={ITEMS[itemId].blurb}
          action="Mua"
          onPress={() => world.buy(itemId)}
        />
      ))}
      {world.bag.some((stack) => stack.itemId === 'sword') ? (
        <Row title="Kiếm trong túi" detail="Trang bị để cộng tấn công." action="Đeo" onPress={() => world.equipFromBag('sword')} />
      ) : null}
      {world.bag.some((stack) => stack.itemId === 'armor') ? (
        <Row title="Giáp trong túi" detail="Trang bị để cộng thủ." action="Đeo" onPress={() => world.equipFromBag('armor')} />
      ) : null}
      {world.bag.some((stack) => stack.itemId === 'might-blade') ? (
        <Row
          title="Kiếm sức mạnh trong túi"
          detail={world.weapon ? 'Ô vũ khí đang có đồ.' : 'Vũ khí hầm ngục. Tấn công cao hơn kiếm thường.'}
          action="Đeo"
          onPress={() => world.equipFromBag('might-blade')}
        />
      ) : null}
      {world.weapon ? (
        <Row
          title={`${ITEMS[world.weapon.itemId].nameVi} +${world.weapon.plus}`}
          detail={
            world.weapon.plus >= UPGRADE_CAP
              ? `Tấn công +${weaponAttack(world.weapon.plus, world.weapon.itemId === 'might-blade' ? 'might-blade' : 'sword')}.`
              : `Tấn công +${weaponAttack(world.weapon.plus, world.weapon.itemId === 'might-blade' ? 'might-blade' : 'sword')}. Nâng cấp ${upgradeCost(world.weapon.plus)} vàng.`
          }
          action="Nâng"
          onPress={() => world.upgrade('weapon')}
        />
      ) : null}
      {world.armor ? (
        <Row
          title={`Giáp +${world.armor.plus}`}
          detail={
            world.armor.plus >= UPGRADE_CAP
              ? `Thủ +${armorDefense(world.armor.plus)}.`
              : `Thủ +${armorDefense(world.armor.plus)}. Nâng cấp ${upgradeCost(world.armor.plus)} vàng.`
          }
          action="Nâng"
          onPress={() => world.upgrade('armor')}
        />
      ) : null}
    </>
  );
}

function StorageRows() {
  const world = useWorld();
  return (
    <View style={styles.split}>
      <View style={styles.column}>
        <Text style={styles.copy}>Túi</Text>
        {world.bag.length === 0 ? <Text style={styles.copy}>Trống</Text> : null}
        {world.bag.map((stack) => (
          <Row
            key={`bag-${stack.itemId}`}
            title={`${ITEMS[stack.itemId].nameVi} ×${stack.qty}`}
            detail="Cất vào kho"
            action="Cất"
            onPress={() => world.stash(stack.itemId)}
          />
        ))}
      </View>
      <View style={styles.column}>
        <Text style={styles.copy}>Kho</Text>
        {world.storage.length === 0 ? <Text style={styles.copy}>Trống</Text> : null}
        {world.storage.map((stack) => (
          <Row
            key={`bin-${stack.itemId}`}
            title={`${ITEMS[stack.itemId].nameVi} ×${stack.qty}`}
            detail="Lấy ra túi"
            action="Lấy"
            onPress={() => world.withdraw(stack.itemId)}
          />
        ))}
      </View>
    </View>
  );
}

function TravelRows() {
  const world = useWorld();
  const window = tierWindow(world.adventureLevel);
  const allowed = window.low === window.high ? `bản đồ ${window.low}` : `bản đồ ${window.low} và ${window.high}`;
  const here = world.regionId;
  return (
    <>
      <Text style={styles.copy}>Cấp {world.adventureLevel} vào được {allowed}. Cổng và dịch chuyển đều kiểm tra cấp.</Text>
      {listStarterRegions().map((region) => (
        <Row
          key={region.id}
          title={`${region.nameVi} · ${region.name}`}
          detail={region.id === here ? 'Thị trấn hiện tại' : 'Đi tới thị trấn'}
          action="Đi"
          onPress={() => world.fastTravel(region.id)}
        />
      ))}
      {isRingTown(here) ? (
        <>
          <Text style={styles.copy}>Bản đồ săn của {getRegion(here)?.nameVi ?? here}</Text>
          {Array.from({ length: MAP_TIERS }, (_, index) => index + 1).map((tier) => {
            const band = tierRange(tier);
            const open = tier >= window.low && tier <= window.high;
            return (
              <Row
                key={`map-${tier}`}
                title={`Bản đồ ${tier}`}
                detail={open ? `Cấp ${band.levelMin}–${band.levelMax}` : 'Chưa đúng cấp'}
                action="Đến"
                onPress={() => world.travelTo(tierZoneId(here, tier), entrancePad(TIER_MAP_W, TIER_MAP_H))}
              />
            );
          })}
        </>
      ) : null}
      <Text style={styles.copy}>Vùng đặc biệt</Text>
      {SPECIAL_REGION_IDS.map((id) => {
        const region = getRegion(id);
        const open = specialRegionOpen(id, world.adventureLevel);
        return (
          <Row
            key={id}
            title={region?.nameVi ?? id}
            detail={open ? 'Đã mở' : LOCKED_LAND}
            action="Đến"
            onPress={() => world.fastTravel(id)}
          />
        );
      })}
    </>
  );
}

function InnRows() {
  const world = useWorld();
  return (
    <>
      <Text style={styles.copy}>
        Hồi đầy máu, mana và thể lực cho bạn và mọi thú đã thu phục. Tốn {INN_COST} vàng, rồi nhà nghỉ nghỉ một lát.
      </Text>
      <Text style={styles.copy}>
        {world.pet.name}: máu {world.pet.hp}/{world.pet.maxHp} · mana {world.pet.mana}/{world.pet.maxMana} · thể lực {world.pet.stamina}/
        {world.pet.maxStamina}
      </Text>
      <Row title="Nghỉ ngơi" detail={`${INN_COST} vàng`} action="Nghỉ" onPress={world.rest} />
    </>
  );
}

function BagRows() {
  const world = useWorld();
  const usable = world.bag.filter((stack) => stack.itemId !== 'sword' && stack.itemId !== 'armor');
  if (usable.length === 0) return <Text style={styles.copy}>Không có vật phẩm dùng ngay.</Text>;
  return (
    <>
      {usable.map((stack) => (
        <Row
          key={`use-${stack.itemId}`}
          title={`${ITEMS[stack.itemId].nameVi} ×${stack.qty}`}
          detail={ITEMS[stack.itemId].blurb}
          action="Dùng"
          onPress={() => world.useBagItem(stack.itemId)}
        />
      ))}
    </>
  );
}

function Row({ title, detail, action, onPress }: { title: string; detail: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.copy}>{detail}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}>
        <Text style={styles.actionText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: 'rgba(10, 18, 16, 0.94)',
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
  },
  scrollWide: { flex: 1 },
  sheetWide: { position: 'absolute', top: 12, right: 12, bottom: 12, width: 360 },
  sheetNarrow: { position: 'absolute', left: 12, right: 12, bottom: 12, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: theme.gold, fontWeight: '800' },
  close: { color: theme.ink, fontWeight: '700' },
  body: { gap: 8, paddingBottom: 12 },
  copy: { color: theme.muted, fontSize: 13 },
  split: { flexDirection: 'row', gap: 8 },
  column: { flex: 1, gap: 8 },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.lineSoft,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: theme.ink, fontWeight: '700' },
  action: {
    backgroundColor: theme.goldDeep,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionText: { color: theme.ink, fontWeight: '800' },
});
