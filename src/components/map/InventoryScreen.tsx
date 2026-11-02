import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { CharacterAvatar } from '../CharacterAvatar';
import { monsterPortrait } from '../world/MonsterToken';
import { getCharacter, getProfession } from '../../data/characters';
import { useAvatarLook } from '../../state/avatarLook';
import { useSetup } from '../../state/SetupContext';
import { useWorld } from '../../state/WorldContext';
import { theme } from '../../theme/theme';
import { useLayout } from '../../theme/useLayout';
import type { TamedMonster } from '../../world/combat';
import {
  classCatalog,
  monsterCatalog,
  resolveHeroLoadout,
  resolvePetLoadout,
  type HeroSkillLoadout,
} from '../../world/combat/kits';
import type { Skill } from '../../world/combat/model';
import {
  BAG_COLUMNS,
  BAG_ROWS,
  BAG_SLOTS,
  ITEMS,
  RARITY_BORDER,
  RARITY_LABEL,
  bagCells,
  gearBonuses,
  gearRarity,
  gearSlot,
  isGearItem,
  itemBorder,
  shortItemName,
} from '../../world/items';
import { expForNextLevel } from '../../world/progression';
import type { Gear, GearSlot, Stack } from '../../world/types';

type Props = { onClose: () => void };

type RosterEntry =
  | { key: 'hero'; kind: 'hero' }
  | { key: string; kind: 'pet'; monster: TamedMonster };

type DragState = { from: number; stack: Stack };

const DOUBLE_MS = 320;
const DRAG_PX = 8;

const DOLL: { slot: GearSlot; label: string; col: number; row: number }[] = [
  { slot: 'helm', label: 'Mũ', col: 1, row: 0 },
  { slot: 'weapon', label: 'Vũ khí', col: 0, row: 1 },
  { slot: 'armor', label: 'Giáp', col: 1, row: 1 },
  { slot: 'ring', label: 'Nhẫn', col: 2, row: 1 },
  { slot: 'shoes', label: 'Giày', col: 1, row: 2 },
];

/**
 * Landscape inventory: character switcher, paper-doll gear, and a 6×10 bag.
 * Single tap inspects or selects. Double tap uses, equips, or unequips.
 * Drag or tap-then-tap moves stacks between bag cells.
 */
export function InventoryScreen({ onClose }: Props) {
  const world = useWorld();
  const setup = useSetup();
  const { s, font, width, height, compact } = useLayout();
  const look = useAvatarLook(setup.player?.baseCharacterId);
  const character = getCharacter(setup.player?.baseCharacterId);
  const profession = getProfession(character?.professionId);
  const [rosterIndex, setRosterIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<GearSlot | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragFrom = useRef<number | null>(null);
  const ghost = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastBagTap = useRef({ index: -1, at: 0 });
  const lastGearTap = useRef<{ slot: GearSlot | null; at: number }>({ slot: null, at: 0 });

  const roster = useMemo<RosterEntry[]>(
    () => [{ key: 'hero', kind: 'hero' }, ...world.tamed.map((monster) => ({ key: monster.id, kind: 'pet' as const, monster }))],
    [world.tamed],
  );
  const active = roster[Math.min(rosterIndex, roster.length - 1)] ?? roster[0];
  const cells = useMemo(() => bagCells(world.bag), [world.bag]);
  const gap = Math.max(3, Math.round(s(4) * 0.85));
  const pad = s(8);
  const headerH = s(36);
  const bodyH = height - 16 - pad * 2 - headerH - s(6);
  const colGap = s(8);
  const area1W = Math.max(s(176), Math.round((width - 16 - pad * 2 - colGap * 2) * 0.26));
  const area2W = Math.max(s(168), Math.round((width - 16 - pad * 2 - colGap * 2) * 0.26));
  const area3W = Math.max(s(220), width - 16 - pad * 2 - colGap * 2 - area1W - area2W);
  const sortH = s(32);
  const cell = Math.max(
    18,
    Math.min(
      s(44),
      Math.floor((area3W - s(16) - gap * (BAG_COLUMNS - 1)) / BAG_COLUMNS),
      Math.floor((bodyH - sortH - s(28) - gap * (BAG_ROWS - 1)) / BAG_ROWS),
    ),
  );
  const dollGap = 6;
  const dollCell = Math.max(48, Math.min(s(72), Math.floor((area2W - s(16) - dollGap * 2) / 3), Math.floor((bodyH * 0.58 - dollGap * 2) / 3)));
  const dollGridW = dollCell * 3 + dollGap * 2;
  const dollGridH = dollCell * 3 + dollGap * 2;

  useEffect(() => {
    if (rosterIndex >= roster.length) setRosterIndex(0);
  }, [roster.length, rosterIndex]);

  const prev = () => setRosterIndex((index) => (index - 1 + roster.length) % roster.length);
  const next = () => setRosterIndex((index) => (index + 1) % roster.length);
  const switcher = useRef({ prev, next });
  useEffect(() => {
    switcher.current = { prev, next };
  });
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -40) switcher.current.next();
          if (gesture.dx > 40) switcher.current.prev();
        },
      }),
    [],
  );

  const useTarget = active.kind === 'pet' ? { kind: 'pet' as const, id: active.monster.id } : { kind: 'hero' as const };

  const activateBag = (stack: Stack) => {
    world.useBagItem(stack.itemId, useTarget);
    setSelected(null);
  };

  const moveOrSelect = (index: number) => {
    if (selected != null && selected !== index) {
      world.moveBagSlot(selected, index);
      setSelected(null);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    setSelected(cells[index] ? index : null);
  };

  const onBagPress = (index: number) => {
    if (drag) return;
    const stack = cells[index];
    const now = Date.now();
    const doubled = lastBagTap.current.index === index && now - lastBagTap.current.at < DOUBLE_MS;
    lastBagTap.current = { index, at: now };
    if (doubled && stack) {
      activateBag(stack);
      return;
    }
    moveOrSelect(index);
  };

  const onGearPress = (slot: GearSlot) => {
    const piece = world[slot];
    if (!piece) {
      setTooltip(null);
      return;
    }
    const now = Date.now();
    const doubled = lastGearTap.current.slot === slot && now - lastGearTap.current.at < DOUBLE_MS;
    lastGearTap.current = { slot, at: now };
    if (doubled) {
      world.unequip(slot);
      setTooltip(null);
      return;
    }
    setTooltip(slot);
  };

  const beginDrag = (index: number, pageX: number, pageY: number) => {
    const stack = cells[index];
    if (!stack) return;
    dragFrom.current = index;
    ghost.setValue({ x: pageX - cell / 2, y: pageY - cell / 2 });
    setDrag({ from: index, stack });
    setSelected(index);
  };

  const moveDrag = (pageX: number, pageY: number) => {
    ghost.setValue({ x: pageX - cell / 2, y: pageY - cell / 2 });
  };

  const endDrag = (to: number | null) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    setDrag(null);
    if (from == null || to == null || to === from) return;
    world.moveBagSlot(from, to);
    setSelected(null);
  };

  const inspected = tooltip ? world[tooltip] : null;

  return (
    <View style={styles.scrim}>
      <View style={[styles.sheet, { padding: pad, gap: s(6) }]}>
        <View style={[styles.header, { minHeight: headerH - 8 }]}>
          <Text style={[styles.title, { fontSize: font(16) }]}>Túi đồ</Text>
          <Text style={[styles.gold, { fontSize: font(13) }]}>{world.gold} vàng</Text>
          <Text style={[styles.hint, { fontSize: font(11), flex: 1 }]} numberOfLines={1}>
            {world.notice ?? (active.kind === 'hero' ? 'Vuốt nhân vật · chạm đôi để dùng' : `Đang chọn ${active.monster.name}`)}
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close} testID="inventory-close">
            <Text style={[styles.closeLabel, { fontSize: font(13) }]}>Đóng</Text>
          </Pressable>
        </View>

        <View style={[styles.areas, { gap: colGap, height: bodyH }]}>
          <View style={[styles.area, styles.area1, { width: area1W }]} {...swipe.panHandlers}>
            <CharacterPane
              active={active}
              canSwitch={roster.length > 1}
              compact={compact}
              font={font}
              s={s}
              paneWidth={area1W}
              look={look}
              character={character}
              name={setup.player?.name ?? 'Bạn'}
              classTitle={profession?.title ?? 'Nhân vật'}
              professionId={character?.professionId}
              heroSkills={world.heroSkills}
              level={world.adventureLevel}
              exp={world.adventureExp}
              attack={world.attack}
              defense={world.defense}
              speed={world.speed}
              vitals={world.vitals}
              hairColor={setup.player?.hairColor ?? '#e0aa78'}
              outfitColor={setup.player?.outfitColor ?? '#3d6b45'}
              onPrev={prev}
              onNext={next}
            />
          </View>

          <View style={[styles.area, styles.area2, { width: area2W }]}>
            <Text style={[styles.areaTitle, { fontSize: font(12) }]}>Trang bị</Text>
            <View style={styles.dollStage}>
              <View style={styles.dollAnchor}>
                <View style={{ width: dollGridW, height: dollGridH }}>
                  {DOLL.map((node) => (
                    <View
                      key={node.slot}
                      style={{
                        position: 'absolute',
                        left: node.col * (dollCell + dollGap),
                        top: node.row * (dollCell + dollGap),
                        width: dollCell,
                        height: dollCell,
                      }}
                    >
                      <GearCell
                        label={node.label}
                        piece={world[node.slot]}
                        size={dollCell}
                        font={font}
                        selected={tooltip === node.slot}
                        onPress={() => onGearPress(node.slot)}
                      />
                    </View>
                  ))}
                </View>
              </View>
              {inspected ? (
                <View pointerEvents="none" style={styles.tooltipOverlay}>
                  <ItemTooltip piece={inspected} font={font} />
                </View>
              ) : (
                <Text pointerEvents="none" style={[styles.dollHint, { fontSize: font(11) }]}>
                  Chạm một lần xem. Chạm đôi tháo.
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.area, styles.area3, { width: area3W, flex: 1 }]}>
            <Text style={[styles.areaTitle, { fontSize: font(12) }]}>Túi · {world.bag.length}/{BAG_SLOTS}</Text>
            <BagGrid
              cells={cells}
              cell={cell}
              gap={gap}
              font={font}
              selected={selected}
              dragFrom={drag?.from ?? null}
              onTap={onBagPress}
              onDragStart={beginDrag}
              onDragMove={moveDrag}
              onDragEnd={endDrag}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tự sắp xếp"
              testID="inventory-autosort"
              onPress={() => {
                world.sortInventory();
                setSelected(null);
              }}
              style={styles.sort}
            >
              <Text style={[styles.sortLabel, { fontSize: font(12) }]}>Tự sắp xếp</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {drag ? (
        <Animated.View pointerEvents="none" style={[styles.ghost, { width: cell, height: cell, transform: ghost.getTranslateTransform() }]}>
          <FilledCell stack={drag.stack} size={cell} font={font} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function CharacterPane({
  active,
  canSwitch,
  compact,
  font,
  s,
  paneWidth,
  look,
  character,
  name,
  classTitle,
  professionId,
  heroSkills,
  level,
  exp,
  attack,
  defense,
  speed,
  vitals,
  hairColor,
  outfitColor,
  onPrev,
  onNext,
}: {
  active: RosterEntry;
  canSwitch: boolean;
  compact: boolean;
  font: (size: number) => number;
  s: (size: number) => number;
  paneWidth: number;
  look: { portrait: ReturnType<typeof getCharacter>; customUri: string | null };
  character: ReturnType<typeof getCharacter>;
  name: string;
  classTitle: string;
  professionId: string | undefined;
  heroSkills: HeroSkillLoadout | null;
  level: number;
  exp: number;
  attack: number;
  defense: number;
  speed: number;
  vitals: { hp: number; maxHp: number; mana: number; maxMana: number; stamina: number; maxStamina: number };
  hairColor: string;
  outfitColor: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [artBox, setArtBox] = useState({ w: 0, h: 0 });
  const pet = active.kind === 'pet' ? active.monster : null;
  const art = pet ? monsterPortrait(pet.kindId) : null;
  const title = pet ? pet.name : name.trim() || 'Bạn';
  const subtitle = pet
    ? `Cấp ${pet.level} · Thú`
    : `Lv.${level} · ${classTitle} · ${exp}/${expForNextLevel(level)}`;
  const kit = kitFor(active, heroSkills, professionId, name);
  const bars = pet
    ? [
        { label: 'HP', value: pet.hp || pet.maxHp, max: pet.maxHp, fill: '#e23b3b', track: '#4a1818' },
        { label: 'Mana', value: pet.mp || pet.maxMp, max: pet.maxMp, fill: '#7d8cff', track: '#1c2448' },
        { label: 'Thể lực', value: 0, max: 0, fill: '#3dce6e', track: '#14361f' },
      ]
    : [
        { label: 'HP', value: vitals.hp, max: vitals.maxHp, fill: '#e23b3b', track: '#4a1818' },
        { label: 'Mana', value: vitals.mana, max: vitals.maxMana, fill: '#7d8cff', track: '#1c2448' },
        { label: 'Thể lực', value: vitals.stamina, max: vitals.maxStamina, fill: '#3dce6e', track: '#14361f' },
      ];
  const atk = pet ? pet.attack : attack;
  const def = pet ? pet.defense : defense;
  const spd = pet ? pet.speed : speed;
  const fz = (size: number) => Math.max(8, font(compact ? size - 1 : size));
  const avatarSize =
    artBox.w > 0 && artBox.h > 0
      ? Math.max(28, Math.min(artBox.w, Math.floor(artBox.h / 1.22)))
      : Math.max(48, Math.min(s(88), paneWidth - s(64)));
  const arrow = { width: compact ? 22 : 26, height: compact ? 28 : 32 };
  const barH = compact ? 11 : 12;

  return (
    <View style={styles.pane}>
      <Text style={[styles.areaTitle, { fontSize: fz(11) }]}>Nhân vật</Text>
      <View style={styles.switchRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nhân vật trước"
          disabled={!canSwitch}
          onPress={onPrev}
          style={[styles.arrow, arrow, !canSwitch && styles.arrowOff]}
          testID="inventory-prev"
        >
          <Text style={[styles.arrowLabel, { fontSize: fz(16) }]}>‹</Text>
        </Pressable>
        <View
          style={styles.spriteWell}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setArtBox((prev) => (prev.w === Math.round(width) && prev.h === Math.round(height) ? prev : { w: Math.round(width), h: Math.round(height) }));
          }}
        >
          {pet ? (
            art ? (
              <Image accessibilityLabel={pet.name} source={art.source} resizeMode="contain" style={styles.spriteFill} />
            ) : (
              <View style={[styles.petFallback, { backgroundColor: pet.tint }]}>
                <Text style={[styles.petLetter, { fontSize: fz(16) }]}>{pet.name.slice(0, 1)}</Text>
              </View>
            )
          ) : look.customUri ? (
            <Image source={{ uri: look.customUri }} accessibilityIgnoresInvertColors resizeMode="contain" style={styles.spriteFill} />
          ) : character ? (
            <CharacterAvatar character={look.portrait ?? character} hairColor={hairColor} outfitColor={outfitColor} size={avatarSize} />
          ) : (
            <View style={styles.spriteFill} />
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nhân vật sau"
          disabled={!canSwitch}
          onPress={onNext}
          style={[styles.arrow, arrow, !canSwitch && styles.arrowOff]}
          testID="inventory-next"
        >
          <Text style={[styles.arrowLabel, { fontSize: fz(16) }]}>›</Text>
        </Pressable>
      </View>
      <Text style={[styles.heroName, { fontSize: fz(12) }]} numberOfLines={1}>
        {title} · {subtitle}
      </Text>
      <View style={styles.bars}>
        {bars.map((bar) => (
          <VitalBar key={bar.label} {...bar} height={barH} font={fz} />
        ))}
      </View>
      <Text style={[styles.statLine, { fontSize: fz(10) }]} numberOfLines={1}>
        Tấn công {atk} · Thủ {def} · Tốc {spd}
      </Text>
      <View style={styles.skillBox}>
        <Text style={[styles.skillLine, { fontSize: fz(10) }]} numberOfLines={1}>
          <Text style={styles.skillHead}>Đòn thường  </Text>
          {kit.basic?.name ?? '—'}
        </Text>
        <Text style={[styles.skillLine, { fontSize: fz(10) }]} numberOfLines={1}>
          <Text style={styles.skillHead}>Kỹ năng  </Text>
          {kit.skills.length ? kit.skills.map((skill) => skill.name).join(' · ') : '—'}
        </Text>
      </View>
    </View>
  );
}

function kitFor(
  active: RosterEntry,
  heroSkills: HeroSkillLoadout | null,
  professionId: string | undefined,
  seed: string,
): { basic: Skill | undefined; skills: Skill[] } {
  if (active.kind === 'pet') {
    const book = monsterCatalog(active.monster.kindId);
    const loadout = resolvePetLoadout(active.monster);
    return {
      basic: book.basics.find((skill) => skill.id === loadout.basicId) ?? book.basics[0],
      skills: loadout.skillIds
        .map((id) => book.skills.find((skill) => skill.id === id))
        .filter((skill): skill is Skill => skill != null),
    };
  }
  const loadout = resolveHeroLoadout(heroSkills, professionId, seed);
  const catalog = classCatalog(professionId);
  return {
    basic: catalog.basics.find((skill) => skill.id === loadout.basicId) ?? catalog.basics[0],
    skills: loadout.skillIds
      .map((id) => catalog.skills.find((skill) => skill.id === id))
      .filter((skill): skill is Skill => skill != null),
  };
}

function GearCell({
  label,
  piece,
  size,
  font,
  selected,
  onPress,
}: {
  label: string;
  piece: Gear | null;
  size: number;
  font: (size: number) => number;
  selected: boolean;
  onPress: () => void;
}) {
  const rarity = piece ? gearRarity(piece.itemId) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={piece ? ITEMS[piece.itemId].nameVi : label}
      onPress={onPress}
      style={[
        styles.gearCell,
        {
          width: size,
          height: size,
          backgroundColor: piece ? ITEMS[piece.itemId].tint : 'rgba(0,0,0,0.22)',
          borderColor: selected ? theme.gold : piece && rarity ? RARITY_BORDER[rarity] : 'rgba(246,241,231,0.28)',
        },
      ]}
    >
      <Text style={[styles.gearSlot, { fontSize: font(9) }]}>{label}</Text>
      <Text style={[styles.cellName, { fontSize: font(10) }]} numberOfLines={2}>
        {piece ? shortItemName(piece.itemId) : '—'}
      </Text>
      {piece ? <Text style={[styles.qty, { fontSize: font(9) }]}>+{piece.plus}</Text> : null}
    </Pressable>
  );
}

function ItemTooltip({ piece, font }: { piece: Gear; font: (size: number) => number }) {
  const rarity = gearRarity(piece.itemId);
  const bonus = gearBonuses(piece);
  const lines = [
    bonus.attack ? `Tấn công +${bonus.attack}` : null,
    bonus.defense ? `Phòng thủ +${bonus.defense}` : null,
    bonus.hp ? `Máu +${bonus.hp}` : null,
    bonus.mana ? `Mana +${bonus.mana}` : null,
    bonus.stamina ? `Thể lực +${bonus.stamina}` : null,
    bonus.speed ? `Tốc độ +${bonus.speed}` : null,
  ].filter((line): line is string => Boolean(line));
  return (
    <View style={[styles.tooltip, { borderColor: RARITY_BORDER[rarity] }]}>
      <Text style={[styles.tooltipName, { fontSize: font(12), color: RARITY_BORDER[rarity] }]} numberOfLines={1}>
        {ITEMS[piece.itemId].nameVi} +{piece.plus}
      </Text>
      <Text style={[styles.tooltipMeta, { fontSize: font(10) }]}>
        {RARITY_LABEL[rarity]} · {slotLabel(gearSlot(piece.itemId))}
      </Text>
      {lines.map((line) => (
        <Text key={line} style={[styles.tooltipStat, { fontSize: font(11) }]}>
          {line}
        </Text>
      ))}
      <Text style={[styles.muted, { fontSize: font(10) }]} numberOfLines={2}>
        {ITEMS[piece.itemId].blurb}
      </Text>
    </View>
  );
}

function BagGrid({
  cells,
  cell,
  gap,
  font,
  selected,
  dragFrom,
  onTap,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  cells: (Stack | null)[];
  cell: number;
  gap: number;
  font: (size: number) => number;
  selected: number | null;
  dragFrom: number | null;
  onTap: (index: number) => void;
  onDragStart: (index: number, x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (to: number | null) => void;
}) {
  const gesture = useRef({ from: -1, dragging: false });
  const cellsRef = useRef(cells);
  const metrics = useRef({ cell, gap });
  const actions = useRef({ onTap, onDragStart, onDragMove, onDragEnd });
  useEffect(() => {
    cellsRef.current = cells;
    metrics.current = { cell, gap };
    actions.current = { onTap, onDragStart, onDragMove, onDragEnd };
  });
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const index = slotFromLocal(event.nativeEvent.locationX, event.nativeEvent.locationY, metrics.current.cell, metrics.current.gap);
          gesture.current = { from: index ?? -1, dragging: false };
        },
        onPanResponderMove: (event, state) => {
          const from = gesture.current.from;
          if (from < 0 || !cellsRef.current[from]) return;
          if (!gesture.current.dragging && state.dx * state.dx + state.dy * state.dy > DRAG_PX * DRAG_PX) {
            gesture.current.dragging = true;
            actions.current.onDragStart(from, event.nativeEvent.pageX, event.nativeEvent.pageY);
          }
          if (gesture.current.dragging) actions.current.onDragMove(event.nativeEvent.pageX, event.nativeEvent.pageY);
        },
        onPanResponderRelease: (event) => {
          const to = slotFromLocal(event.nativeEvent.locationX, event.nativeEvent.locationY, metrics.current.cell, metrics.current.gap);
          if (gesture.current.dragging) {
            actions.current.onDragEnd(to);
            return;
          }
          if (gesture.current.from >= 0) actions.current.onTap(gesture.current.from);
        },
        onPanResponderTerminate: () => {
          if (gesture.current.dragging) actions.current.onDragEnd(null);
        },
      }),
    [],
  );

  return (
    <View
      {...pan.panHandlers}
      style={[styles.grid, { width: BAG_COLUMNS * cell + gap * (BAG_COLUMNS - 1), gap }]}
    >
      {cells.map((stack, index) => (
        <BagCell
          key={stack ? `${stack.itemId}-${stack.slot ?? index}` : `empty-${index}`}
          index={index}
          stack={stack}
          size={cell}
          font={font}
          selected={selected === index}
          dimmed={dragFrom != null && dragFrom !== index}
        />
      ))}
    </View>
  );
}

function BagCell({
  index,
  stack,
  size,
  font,
  selected,
  dimmed,
}: {
  index: number;
  stack: Stack | null;
  size: number;
  font: (size: number) => number;
  selected: boolean;
  dimmed: boolean;
}) {
  return (
    <View
      testID={`inventory-slot-${index}`}
      pointerEvents="none"
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          backgroundColor: stack ? ITEMS[stack.itemId].tint : 'rgba(0,0,0,0.18)',
          borderColor: selected ? theme.gold : stack ? itemBorder(stack.itemId) : 'rgba(246,241,231,0.28)',
          opacity: dimmed ? 0.45 : 1,
        },
      ]}
    >
      {stack ? <FilledCell stack={stack} size={size} font={font} /> : null}
    </View>
  );
}

function FilledCell({ stack, size, font }: { stack: Stack; size: number; font: (size: number) => number }) {
  return (
    <View style={[styles.fillCell, { width: size, height: size }]}>
      <Text style={[styles.cellName, { fontSize: Math.max(8, Math.min(font(10), size * 0.28)) }]} numberOfLines={1}>
        {shortItemName(stack.itemId)}
      </Text>
      <Text style={[styles.qty, { fontSize: Math.max(8, Math.min(font(10), size * 0.26)) }]}>
        {isGearItem(stack.itemId) ? `+${stack.plus ?? 0}` : stack.qty}
      </Text>
    </View>
  );
}

function VitalBar({
  label,
  value,
  max,
  fill,
  track,
  height,
  font,
}: {
  label: string;
  value: number;
  max: number;
  fill: string;
  track: string;
  height: number;
  font: (size: number) => number;
}) {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const figures = max <= 0 ? `${label} —` : `${label} ${Math.round(value)} / ${Math.round(max)}`;
  return (
    <View style={[styles.track, { height, backgroundColor: track }]}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: fill }]} />
      <Text style={[styles.meterText, { fontSize: font(8) }]} numberOfLines={1}>
        {figures}
      </Text>
    </View>
  );
}

function slotFromLocal(x: number, y: number, cell: number, gap: number): number | null {
  if (x < 0 || y < 0) return null;
  const stride = cell + gap;
  const col = Math.floor(x / stride);
  const row = Math.floor(y / stride);
  if (col < 0 || col >= BAG_COLUMNS || row < 0 || row >= BAG_ROWS) return null;
  if (x - col * stride > cell || y - row * stride > cell) return null;
  return row * BAG_COLUMNS + col;
}

function slotLabel(slot: GearSlot | null): string {
  if (slot === 'helm') return 'Mũ';
  if (slot === 'armor') return 'Giáp';
  if (slot === 'weapon') return 'Vũ khí';
  if (slot === 'ring') return 'Nhẫn';
  if (slot === 'shoes') return 'Giày';
  return 'Trang bị';
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: theme.ink, fontWeight: '800' },
  gold: { color: theme.gold, fontWeight: '800' },
  hint: { color: theme.muted },
  close: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: theme.goldDeep },
  closeLabel: { color: theme.ink, fontWeight: '800' },
  areas: { flexDirection: 'row', alignItems: 'stretch' },
  area: {
    backgroundColor: theme.cardRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 8,
    minWidth: 0,
  },
  area1: { justifyContent: 'flex-start', overflow: 'hidden' },
  area2: { position: 'relative', overflow: 'hidden' },
  area3: { position: 'relative' },
  areaTitle: { color: theme.gold, fontWeight: '800', alignSelf: 'flex-start' },
  pane: { flex: 1, minWidth: 0, minHeight: 0, gap: 3 },
  switchRow: { flex: 1, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', gap: 4, minHeight: 0 },
  arrow: {
    width: 26,
    height: 32,
    alignSelf: 'center',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.goldDeep,
  },
  arrowOff: { opacity: 0.35 },
  arrowLabel: { color: theme.ink, fontWeight: '900' },
  spriteWell: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 10,
    backgroundColor: 'rgba(8,14,12,0.28)',
    overflow: 'hidden',
  },
  spriteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  petFallback: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  petLetter: { color: '#1b140c', fontWeight: '900' },
  heroName: { color: theme.ink, fontWeight: '800', flexShrink: 0 },
  muted: { color: theme.muted },
  bars: { gap: 2, flexShrink: 0 },
  track: { borderRadius: 99, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  meterText: {
    color: '#fff8ee',
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowRadius: 2,
  },
  statLine: { color: theme.ink, fontWeight: '700', flexShrink: 0 },
  skillBox: {
    gap: 1,
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: theme.lineSoft,
    flexShrink: 0,
  },
  skillHead: { color: theme.gold, fontWeight: '800' },
  skillLine: { color: theme.ink, fontWeight: '700' },
  dollStage: { flex: 1, alignSelf: 'stretch', position: 'relative', minHeight: 0 },
  dollAnchor: { position: 'absolute', top: 4, left: 0, right: 0, alignItems: 'center' },
  dollHint: { position: 'absolute', left: 4, right: 4, bottom: 4, color: theme.muted, textAlign: 'center' },
  tooltipOverlay: { position: 'absolute', left: 4, right: 4, bottom: 4, zIndex: 5 },
  gearCell: {
    borderRadius: 10,
    borderWidth: 2,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearSlot: { color: '#1b140c', fontWeight: '700' },
  tooltip: {
    alignSelf: 'stretch',
    borderRadius: 10,
    borderWidth: 2,
    padding: 8,
    gap: 2,
    backgroundColor: 'rgba(8,14,12,0.72)',
  },
  tooltipName: { fontWeight: '800' },
  tooltipMeta: { color: theme.muted, fontWeight: '700' },
  tooltipStat: { color: theme.ink, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center' },
  cell: { borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
  fillCell: { alignItems: 'center', justifyContent: 'center' },
  cellName: { color: '#1b140c', fontWeight: '800', textAlign: 'center' },
  qty: { color: '#1b140c', fontWeight: '700' },
  sort: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.goldDeep,
    borderWidth: 1,
    borderColor: theme.gold,
  },
  sortLabel: { color: theme.ink, fontWeight: '800' },
  ghost: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.gold,
    overflow: 'hidden',
  },
});
