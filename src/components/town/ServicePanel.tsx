import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import { getRegion, listStarterRegions } from '../../data/regions';
import { isRingTown, LOCKED_LAND, SPECIAL_REGION_IDS, specialRegionOpen, tierWindow } from '../../world/atlas';
import { TIER_MAP_H, TIER_MAP_W } from '../../world/grid';
import { entrancePad, MAP_TIERS, tierRange, tierZoneId } from '../../world/tiers';
import {
  GEAR_SLOTS,
  grocerPrice,
  grocerWeekendSale,
  INN_COST,
  isGearItem,
  ITEMS,
  RARITY_LABEL,
  SMITH_STOCK,
  STORE_STOCK,
  UPGRADE_CAP,
  equippedBonuses,
  gearBonuses,
  gearRarity,
  upgradeCost,
} from '../../world/items';
import { evoCost, evoStageOf, evoTitle, MAX_EVO_STAGE, redundantPets, shardForKind, shardLabel } from '../../world/evolution';
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
  const sale = grocerWeekendSale();
  return (
    <>
      <Text style={styles.copy}>
        {sale
          ? 'Thứ 6–Chủ nhật: giảm 15% mọi mặt hàng tạp hóa.'
          : 'Thứ 2–Thứ 5: giá gốc. Cuối tuần giảm 15%.'}
      </Text>
      {STORE_STOCK.map((itemId) => {
        const price = grocerPrice(itemId);
        const full = ITEMS[itemId].price;
        return (
          <Row
            key={itemId}
            title={`${ITEMS[itemId].nameVi} · ${price} vàng${sale && price !== full ? ` (gốc ${full})` : ''}`}
            detail={ITEMS[itemId].blurb}
            action="Mua"
            onPress={() => world.buy(itemId, 'store')}
          />
        );
      })}
      <BagRows />
    </>
  );
}

function SmithRows() {
  const world = useWorld();
  const bonus = equippedBonuses(world);
  const bagGear = world.bag.filter((stack) => isGearItem(stack.itemId));
  return (
    <>
      <Text style={styles.copy}>
        Tấn công {world.attack} · Thủ {world.defense} · Máu +{bonus.hp} · Mana +{bonus.mana} · Thể lực +{bonus.stamina} · Tốc độ +
        {bonus.speed}
      </Text>
      {SMITH_STOCK.map((itemId) => (
        <Row
          key={itemId}
          title={`${ITEMS[itemId].nameVi} · ${ITEMS[itemId].price} vàng`}
          detail={ITEMS[itemId].blurb}
          action="Mua"
          onPress={() => world.buy(itemId, 'smith')}
        />
      ))}
      {bagGear.map((stack) => (
        <Row
          key={`wear-${stack.itemId}`}
          title={`${ITEMS[stack.itemId].nameVi} trong túi`}
          detail={`${RARITY_LABEL[gearRarity(stack.itemId)]}. ${ITEMS[stack.itemId].blurb}`}
          action="Đeo"
          onPress={() => world.equipFromBag(stack.itemId)}
        />
      ))}
      {GEAR_SLOTS.map(({ slot, label }) => {
        const piece = world[slot];
        if (!piece) return null;
        const stats = gearBonuses(piece);
        const cap = piece.plus >= UPGRADE_CAP;
        return (
          <Row
            key={`up-${slot}`}
            title={`${label}: ${ITEMS[piece.itemId].nameVi} +${piece.plus}`}
            detail={
              cap
                ? gearStatLine(stats)
                : `${gearStatLine(stats)} Nâng cấp ${upgradeCost(piece.plus)} vàng.`
            }
            action="Nâng"
            onPress={() => world.upgrade(slot)}
          />
        );
      })}
      {GEAR_SLOTS.map(({ slot, label }) =>
        world[slot] ? (
          <Row
            key={`off-${slot}`}
            title={`Tháo ${label}`}
            detail={ITEMS[world[slot]!.itemId].nameVi}
            action="Tháo"
            onPress={() => world.unequip(slot)}
          />
        ) : null,
      )}
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
  const allowed = window.high <= 1 ? 'bản đồ 1' : `bản đồ 1 đến ${window.high}`;
  const here = world.regionId;
  return (
    <>
      <Text style={styles.copy}>Cấp {world.adventureLevel} vào được {allowed}. Thị trấn và bản đồ thấp hơn luôn mở. Cổng cao hơn vẫn kiểm tra cấp.</Text>
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
  const extras = redundantPets(world.tamed);
  const evolving = world.tamed.filter((monster) => evoStageOf(monster) < MAX_EVO_STAGE);
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
      <Text style={styles.copy}>Đổi thú trùng lấy 3–5 mảnh tiến hoá của vùng đó. Giữ lại con mạnh nhất.</Text>
      {extras.length === 0 ? <Text style={styles.copy}>Không có thú trùng để đổi.</Text> : null}
      {extras.map((monster) => (
        <Row
          key={`trade-${monster.id}`}
          title={evoTitle(monster)}
          detail={`Cấp ${monster.level}. Đổi lấy ${shardLabel(shardForKind(monster.kindId))}.`}
          action="Đổi mảnh"
          onPress={() => world.tradePet(monster.id)}
        />
      ))}
      <Text style={styles.copy}>Tiến hoá thú. Mảnh 7 màu và mảnh tiến hoá thay được mảnh vùng.</Text>
      {evolving.length === 0 ? <Text style={styles.copy}>Chưa có thú để tiến hoá.</Text> : null}
      {evolving.map((monster) => {
        const cost = evoCost(monster);
        if (!cost) return null;
        return (
          <Row
            key={`evo-${monster.id}`}
            title={evoTitle(monster)}
            detail={`Cấp ${monster.level}/${cost.level}. Cần ${cost.shards} ${shardLabel(cost.shardId)}.`}
            action="Tiến hoá"
            onPress={() => world.evolvePet(monster.id)}
          />
        );
      })}
    </>
  );
}

function BagRows() {
  const world = useWorld();
  const usable = world.bag.filter((stack) => !isGearItem(stack.itemId));
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

function gearStatLine(stats: { attack: number; defense: number; hp: number; mana: number; stamina: number; speed: number }): string {
  const parts = [
    stats.attack ? `Tấn công +${stats.attack}` : '',
    stats.defense ? `Thủ +${stats.defense}` : '',
    stats.hp ? `Máu +${stats.hp}` : '',
    stats.mana ? `Mana +${stats.mana}` : '',
    stats.stamina ? `Thể lực +${stats.stamina}` : '',
    stats.speed ? `Tốc độ +${stats.speed}` : '',
  ].filter(Boolean);
  return parts.join(' · ') || 'Không có chỉ số.';
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
