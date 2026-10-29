import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { getCharacter } from '../data/characters';
import { getRegion } from '../data/regions';
import { professionPools } from '../world/growth';
import { HAZARD_HP_PER_TICK, HAZARD_STAMINA_PER_TICK } from '../world/hazards';
import { emptyQuests, findQuest, normalizeQuests, type QuestTrack } from '../world/quests';
import type { RegionId } from '../types/game';
import { useSetup } from './SetupContext';
import { entryBlock, isSpecialRegion, LOCKED_LAND, parseSector, parseTier, resolveZoneId, specialRegionOpen } from '../world/atlas';
import { createField, fieldNeedsRebuild, monsterStats, nextRegion, townZoneId } from '../world/catalog';
import { mineEncounter, withoutDungeonGates } from '../world/dungeons';
import { speciesById } from '../world/monsters';
import { grantFleePeace, rejectPortal } from '../world/sim';
import { ADVENTURE_LEVEL_CAP, expForNextLevel, MARCH_REGEN_PER_SEC, MARCH_STAMINA_PER_PX } from '../world/progression';
import {
  BAG_SLOTS,
  INN_COOLDOWN_MS,
  INN_COST,
  ITEMS,
  UPGRADE_CAP,
  addStack,
  applyConsumable,
  armorDefense,
  fruitRestore,
  fullRestore,
  lootFits,
  removeOne,
  upgradeCost,
  weaponAttack,
} from '../world/items';
import type { RaidRewardView } from '../net/protocol';
import type { BattleResult, TamedMonster } from '../world/combat';
import { useWorldPersistence } from './save/useWorldPersistence';
import {
  classCatalog,
  monsterCatalog,
  placeActiveSkill,
  resolveHeroLoadout,
  resolvePetLoadout,
  type HeroSkillLoadout,
} from '../world/combat/kits';
import type { Encounter, FieldScene, FieldState, Gear, ItemId, LootActor, MonsterActor, Pet, ServiceId, Stack, Vec, Vitals } from '../world/types';

/**
 * Exploration session for the signed-in character. Progress is written to
 * this device and to the account when the server can be reached. The PvP
 * server still owns duel level and the win record; this wallet does not
 * overwrite them.
 *
 * A reload restores the same bag, pets, and town. Editing hair or the
 * starting region keeps that progress.
 */

type Arrival = { zoneId: string; x: number; y: number };

export type WorldState = {
  ready: boolean;
  scene: FieldScene;
  regionId: RegionId;
  zoneId: string;
  vitals: Vitals;
  pet: Pet;
  gold: number;
  bag: Stack[];
  storage: Stack[];
  weapon: Gear | null;
  armor: Gear | null;
  baseAttack: number;
  baseDefense: number;
  innReadyAt: number;
  unlocked: RegionId[];
  homeRegion: RegionId;
  adventureLevel: number;
  adventureExp: number;
  encounter: Encounter | null;
  /** Pets (player team) and consumables chosen on the squad screen. Null until Vào trận. */
  squad: { allyIds: string[]; itemIds: ItemId[]; basicId: string } | null;
  /** Monsters / Quái captured from the wild. They become pets once the squad selects them. */
  tamed: TamedMonster[];
  /** Basic attack and two active skills equipped for the signed-in hero. */
  heroSkills: HeroSkillLoadout | null;
  quests: QuestTrack;
  /** Species met in the wild or tamed. The collection book reads this. */
  discovered: string[];
  /** Skill ids the hero or a pet has equipped. The skill book marks these. */
  knownSkills: string[];
  notice: string | null;
  fields: Record<string, FieldState>;
  arrival: Arrival | null;
};

type WorldContextValue = WorldState & {
  attack: number;
  defense: number;
  openService: (service: ServiceId) => void;
  returnToTown: () => void;
  travelTo: (toZone: string, arrive?: Vec, unlock?: RegionId) => void;
  fastTravel: (regionId: RegionId) => void;
  buy: (itemId: ItemId) => void;
  upgrade: (slot: 'weapon' | 'armor') => void;
  equipFromBag: (itemId: 'sword' | 'armor' | 'might-blade') => void;
  useBagItem: (itemId: ItemId) => void;
  claimQuest: (id: string) => void;
  touchQuests: () => void;
  stash: (itemId: ItemId) => void;
  withdraw: (itemId: ItemId) => void;
  rest: () => void;
  collect: (loot: LootActor) => boolean;
  confirmSquad: (allyIds: string[], itemIds: ItemId[], basicId: string) => void;
  equipHeroBasic: (basicId: string) => void;
  equipHeroSkill: (skillId: string) => void;
  equipPetBasic: (monsterId: string, basicId: string) => void;
  equipPetSkill: (monsterId: string, skillId: string) => void;
  cancelSquad: () => void;
  returnToSquad: (patch: { vitals: Vitals; bag: Stack[]; pets: { id: string; hp: number; mp: number }[] }) => void;
  beginEncounter: (monster: Encounter) => void;
  approachMine: () => void;
  grantRaidReward: (reward: RaidRewardView) => void;
  say: (notice: string) => void;
  openDuelSquad: () => void;
  leaveDuelPrep: () => void;
  resolveBattle: (result: BattleResult) => void;
  march: (distance: number, dt: number) => void;
  sufferHazard: (dt: number) => void;
  hurtQuicksand: () => void;
  drainPuddle: () => void;
  saveField: (field: FieldState) => void;
  takeField: (zoneId: string) => FieldState;
  clearArrival: () => void;
};

const EMPTY_VITALS: Vitals = { hp: 100, maxHp: 100, mana: 40, maxMana: 40, stamina: 40, maxStamina: 40 };

const EMPTY: WorldState = {
  ready: false,
  scene: 'town',
  regionId: 'forest',
  zoneId: townZoneId('forest'),
  vitals: EMPTY_VITALS,
  pet: starterPet(),
  gold: 40,
  bag: [],
  storage: [],
  weapon: null,
  armor: null,
  baseAttack: 10,
  baseDefense: 4,
  innReadyAt: 0,
  unlocked: ['forest'],
  homeRegion: 'forest',
  adventureLevel: 1,
  adventureExp: 0,
  encounter: null,
  squad: null,
  tamed: [],
  heroSkills: null,
  quests: emptyQuests(),
  discovered: [],
  knownSkills: [],
  notice: null,
  fields: {},
  arrival: null,
};

const WorldContext = createContext<WorldContextValue | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const setup = useSetup();
  const [state, setState] = useState<WorldState>(EMPTY);
  const stateRef = useRef(state);
  stateRef.current = state;
  const professionRef = useRef<string | undefined>(undefined);
  const nameRef = useRef('');
  professionRef.current = getCharacter(setup.player?.baseCharacterId)?.professionId;
  nameRef.current = setup.player?.name ?? '';

  useWorldPersistence(state, setState);

  useEffect(() => {
    if (!state.notice) return;
    const timer = setTimeout(() => setState((current) => ({ ...current, notice: null })), 2400);
    return () => clearTimeout(timer);
  }, [state.notice]);

  const say = useCallback((notice: string) => {
    setState((current) => ({ ...current, notice }));
  }, []);

  const saveField = useCallback((field: FieldState) => {
    const clean = withoutDungeonGates(field);
    setState((current) => ({ ...current, fields: { ...current.fields, [clean.zoneId]: clean } }));
  }, []);

  const takeField = useCallback((zoneId: string) => {
    const saved = state.fields[zoneId];
    if (saved && fieldNeedsRebuild(saved)) {
      const fresh = createField(zoneId);
      if (saved.width === fresh.width && saved.height === fresh.height) {
        fresh.player = { ...fresh.player, x: saved.player.x, y: saved.player.y };
      }
      return fresh;
    }
    if (saved) return JSON.parse(JSON.stringify(saved)) as FieldState;
    return createField(zoneId);
  }, [state.fields]);

  const clearArrival = useCallback(() => {
    setState((current) => ({ ...current, arrival: null }));
  }, []);

  const returnToTown = useCallback(() => {
    setState((current) => ({
      ...current,
      scene: 'town',
      zoneId: townZoneId(current.regionId),
      encounter: null,
      arrival: null,
    }));
  }, []);

  const travelTo = useCallback((toZone: string, arrive?: Vec, unlock?: RegionId) => {
    const snapshot = stateRef.current;
    const zoneId = resolveZoneId(toZone);
    const blocked = entryBlock(snapshot.adventureLevel, zoneId, snapshot.homeRegion);
    if (blocked) {
      rejectPortal();
      Alert.alert(blocked === LOCKED_LAND ? 'Vùng đất' : 'Không vào được', blocked);
      setState((current) => ({ ...current, notice: blocked }));
      return;
    }
    setState((current) => {
      const denied = entryBlock(current.adventureLevel, zoneId, current.homeRegion);
      if (denied) return { ...current, notice: denied };
      const tierMap = parseTier(zoneId);
      const sector = parseSector(zoneId);
      const regionId = zoneId.startsWith('town:')
        ? (zoneId.slice(5) as RegionId)
        : (tierMap?.province.regionId ?? sector?.province.regionId ?? current.regionId);
      const opened = unlock && unlock !== current.homeRegion ? unlock : null;
      let unlocked = current.unlocked;
      if (opened && !unlocked.includes(opened) && (!isSpecialRegion(opened) || specialRegionOpen(opened, current.adventureLevel))) {
        unlocked = [...unlocked, opened];
      }
      if (isSpecialRegion(regionId) && specialRegionOpen(regionId, current.adventureLevel) && !unlocked.includes(regionId)) {
        unlocked = [...unlocked, regionId];
      }
      const scene: FieldScene = zoneId.startsWith('town:') ? 'town' : 'wilds';
      const region = opened ? getRegion(opened) : null;
      return {
        ...current,
        scene,
        regionId,
        zoneId,
        unlocked,
        arrival: arrive ? { zoneId, x: arrive.x, y: arrive.y } : null,
        notice: region && opened && !current.unlocked.includes(opened) ? `Đã mở đường tới ${region.nameVi}.` : current.notice,
      };
    });
  }, []);

  const openService = useCallback((service: ServiceId) => {
    if (service === 'pvp' || service === 'cup') {
      setState((current) => ({ ...current, scene: service }));
    }
  }, []);

  const fastTravel = useCallback((regionId: RegionId) => {
    const snapshot = stateRef.current;
    if (isSpecialRegion(regionId) && !specialRegionOpen(regionId, snapshot.adventureLevel)) {
      Alert.alert('Vùng đất', LOCKED_LAND);
      setState((current) => ({ ...current, notice: LOCKED_LAND }));
      return;
    }
    const townZone = townZoneId(regionId);
    const blocked = entryBlock(snapshot.adventureLevel, townZone, snapshot.homeRegion);
    if (blocked) {
      Alert.alert(blocked === LOCKED_LAND ? 'Vùng đất' : 'Không vào được', blocked);
      setState((current) => ({ ...current, notice: blocked }));
      return;
    }
    setState((current) => {
      if (regionId === current.regionId && current.scene === 'town') return { ...current, notice: 'Bạn đang ở thị trấn này.' };
      const denied = entryBlock(current.adventureLevel, townZone, current.homeRegion);
      if (denied) return { ...current, notice: denied };
      const unlocked =
        isSpecialRegion(regionId) && !current.unlocked.includes(regionId) ? [...current.unlocked, regionId] : current.unlocked;
      return {
        ...current,
        scene: 'town',
        regionId,
        homeRegion: isSpecialRegion(regionId) ? current.homeRegion : regionId,
        zoneId: townZone,
        unlocked,
        arrival: null,
        notice: `Đã tới thị trấn ${getRegion(regionId)?.nameVi ?? regionId}.`,
      };
    });
  }, []);

  const buy = useCallback((itemId: ItemId) => {
    setState((current) => {
      const item = ITEMS[itemId];
      if (current.gold < item.price) return { ...current, notice: 'Không đủ vàng.' };
      if ((itemId === 'sword' && current.weapon) || (itemId === 'armor' && current.armor)) {
        return { ...current, notice: 'Bạn đã có món này. Hãy nâng cấp.' };
      }
      const bag = addStack(current.bag, itemId);
      if (!bag) return { ...current, notice: `Túi đã đầy (${BAG_SLOTS}).` };
      return { ...current, gold: current.gold - item.price, bag, notice: `Đã mua ${item.nameVi}.` };
    });
  }, []);

  const equipFromBag = useCallback((itemId: 'sword' | 'armor' | 'might-blade') => {
    setState((current) => {
      if (itemId === 'armor' && current.armor) return { ...current, notice: 'Món này đang được trang bị.' };
      if ((itemId === 'sword' || itemId === 'might-blade') && current.weapon) {
        return { ...current, notice: 'Ô vũ khí đang có đồ.' };
      }
      const bag = removeOne(current.bag, itemId);
      if (!bag) return { ...current, notice: 'Không có trong túi.' };
      const gear = { itemId, plus: 0 } as Gear;
      return {
        ...current,
        bag,
        weapon: itemId === 'armor' ? current.weapon : gear,
        armor: itemId === 'armor' ? gear : current.armor,
        notice: `Đã trang bị ${ITEMS[itemId].nameVi}.`,
      };
    });
  }, []);

  const upgrade = useCallback((slot: 'weapon' | 'armor') => {
    setState((current) => {
      const gear = current[slot];
      if (!gear) return { ...current, notice: 'Hãy mua và trang bị trước.' };
      if (gear.plus >= UPGRADE_CAP) return { ...current, notice: 'Đã nâng tối đa.' };
      const cost = upgradeCost(gear.plus);
      if (current.gold < cost) return { ...current, notice: `Cần ${cost} vàng.` };
      const next = { ...gear, plus: gear.plus + 1 };
      return {
        ...current,
        gold: current.gold - cost,
        weapon: slot === 'weapon' ? next : current.weapon,
        armor: slot === 'armor' ? next : current.armor,
        notice: `${ITEMS[gear.itemId].nameVi} +${next.plus}.`,
      };
    });
  }, []);

  const useBagItem = useCallback((itemId: ItemId) => {
    setState((current) => {
      const quests = readQuests(current.quests);
      if (itemId === 'net') return { ...current, quests, notice: 'Lưới dùng trong trận để thu phục quái.' };
      if (itemId === 'mine-ticket') return { ...current, quests, notice: 'Vé vào Hầm mỏ. Đến cửa hầm trong giờ vàng.' };
      if (itemId === 'evo-shard') return { ...current, quests, notice: 'Mảnh tiến hóa thú. Giữ trong túi.' };
      if (itemId === 'might-blade') {
        if (current.weapon) return { ...current, quests, notice: 'Ô vũ khí đang có đồ. Kiếm sức mạnh nằm trong túi.' };
        const bag = removeOne(current.bag, itemId);
        if (!bag) return { ...current, quests, notice: 'Không còn trong túi.' };
        return { ...current, quests, bag, weapon: { itemId: 'might-blade', plus: 0 }, notice: 'Đã trang bị Kiếm sức mạnh.' };
      }
      if (itemId === 'town-scroll') {
        if (current.scene === 'town') return { ...current, quests, notice: 'Bạn đang ở thị trấn.' };
        const bag = removeOne(current.bag, itemId);
        if (!bag) return { ...current, quests, notice: 'Không còn hồi thành chú.' };
        return {
          ...current,
          bag,
          quests: { ...quests, scrollsToday: quests.scrollsToday + 1 },
          scene: 'town',
          zoneId: townZoneId(current.regionId),
          encounter: null,
          arrival: null,
          notice: 'Hồi thành chú đưa bạn về thị trấn.',
        };
      }
      const fruit = fruitRestore(itemId);
      if (fruit) {
        const pet = hungriest(current.tamed);
        if (!pet) return { ...current, quests, notice: 'Chưa có quái đã thu phục.' };
        const hpNow = pet.hp || pet.maxHp;
        const mpNow = pet.mp || pet.maxMp;
        const hp = Math.min(pet.maxHp, hpNow + fruit.hp);
        const mp = Math.min(pet.maxMp || 1, mpNow + fruit.mp);
        if (hp === hpNow && mp === mpNow) return { ...current, quests, notice: `${pet.name} đã đầy máu và mana.` };
        const bag = removeOne(current.bag, itemId);
        if (!bag) return { ...current, quests, notice: 'Không còn trái này.' };
        return {
          ...current,
          bag,
          quests: { ...quests, feedsToday: quests.feedsToday + 1 },
          tamed: current.tamed.map((monster) => (monster.id === pet.id ? { ...monster, hp, mp } : monster)),
          notice: `${pet.name} đã ăn ${ITEMS[itemId].nameVi}.`,
        };
      }
      const healed = applyConsumable(current.vitals, itemId);
      if (!healed) return { ...current, quests, notice: 'Món này không dùng được lúc này.' };
      const bag = removeOne(current.bag, itemId);
      if (!bag) return { ...current, quests, notice: 'Không còn trong túi.' };
      return { ...current, quests, bag, vitals: healed, notice: `Đã dùng ${ITEMS[itemId].nameVi}.` };
    });
  }, []);

  const claimQuest = useCallback((id: string) => {
    setState((current) => {
      const quests = readQuests(current.quests);
      const quest = findQuest({ level: current.adventureLevel, tamed: current.tamed.length, track: quests }, id);
      if (!quest) return { ...current, quests };
      if (quest.claimed) return { ...current, quests, notice: 'Đã nhận thưởng này.' };
      if (!quest.done) return { ...current, quests, notice: 'Nhiệm vụ chưa xong.' };
      let bag = current.bag;
      if (quest.itemId) {
        const next = addStack(bag, quest.itemId, 1);
        if (!next) return { ...current, quests, notice: 'Túi đầy, chưa nhận được thưởng.' };
        bag = next;
      }
      return {
        ...current,
        bag,
        gold: current.gold + quest.gold,
        quests: { ...quests, claimed: [...quests.claimed, id] },
        notice: `Nhận thưởng: ${quest.reward}.`,
      };
    });
  }, []);

  const touchQuests = useCallback(() => {
    setState((current) => {
      const quests = readQuests(current.quests);
      if (quests === current.quests) return current;
      return { ...current, quests };
    });
  }, []);

  const stash = useCallback((itemId: ItemId) => {
    setState((current) => moveStack(current, 'bag', 'storage', itemId));
  }, []);

  const withdraw = useCallback((itemId: ItemId) => {
    setState((current) => moveStack(current, 'storage', 'bag', itemId));
  }, []);

  const rest = useCallback(() => {
    setState((current) => {
      const wait = current.innReadyAt - Date.now();
      if (wait > 0) return { ...current, notice: `Nhà nghỉ còn ${Math.ceil(wait / 1000)} giây.` };
      if (current.gold < INN_COST) return { ...current, notice: `Nghỉ ngơi tốn ${INN_COST} vàng.` };
      return {
        ...current,
        gold: current.gold - INN_COST,
        innReadyAt: Date.now() + INN_COOLDOWN_MS,
        vitals: fullRestore(current.vitals),
        pet: { ...current.pet, hp: current.pet.maxHp, mana: current.pet.maxMana, stamina: current.pet.maxStamina },
        tamed: current.tamed.map((monster) => ({ ...monster, hp: monster.maxHp, mp: monster.maxMp })),
        notice: 'Bạn và mọi thú đã hồi đầy máu, mana và thể lực.',
      };
    });
  }, []);

  const collect = useCallback((loot: LootActor) => {
    let accepted = false;
    setState((current) => {
      if (!lootFits(current.bag, loot)) {
        return { ...current, notice: 'Túi đầy, không nhặt được.' };
      }
      accepted = true;
      if (loot.kind === 'gold') {
        return { ...applyExp(current, 1, professionRef.current), gold: current.gold + loot.amount, notice: `Nhặt ${loot.amount} vàng.` };
      }
      const bag = loot.itemId ? addStack(current.bag, loot.itemId, loot.amount) : null;
      if (!bag) return { ...current, notice: 'Túi đầy, không nhặt được.' };
      return { ...current, bag, notice: `Nhặt ${loot.label}.` };
    });
    return accepted;
  }, []);

  const approachMine = useCallback(() => {
    setState((current) => {
      if (current.encounter?.mine && (current.scene === 'squad' || current.scene === 'encounter')) return current;
      if (current.scene !== 'wilds') return current;
      const ticket = current.bag.some((stack) => stack.itemId === 'mine-ticket' && stack.qty > 0);
      if (!ticket) return { ...current, notice: 'Cần vé Hầm mỏ. Vé rơi ngẫu nhiên khi đi săn.' };
      return {
        ...current,
        scene: 'squad',
        encounter: mineEncounter(current.adventureLevel),
        squad: null,
        notice: 'Hầm mỏ. Một quái mạnh hơn quái ngoài map.',
      };
    });
  }, []);

  const grantRaidReward = useCallback((reward: RaidRewardView) => {
    setState((current) => {
      const progressed = applyExp(current, reward.exp, professionRef.current);
      const leveled = progressed.adventureLevel > current.adventureLevel;
      let bag = current.bag;
      const gained: string[] = [];
      for (const drop of reward.drops) {
        if (!(drop.itemId in ITEMS)) continue;
        const next = addStack(bag, drop.itemId as ItemId, Math.max(1, drop.qty));
        if (!next) continue;
        bag = next;
        gained.push(ITEMS[drop.itemId as ItemId].nameVi);
      }
      const notice = [leveled ? `Cấp phiêu lưu ${progressed.adventureLevel}.` : '', `Hầm ngục +${reward.exp} kinh nghiệm.`, gained.join(', ')]
        .filter(Boolean)
        .join(' ');
      return { ...progressed, bag, notice };
    });
  }, []);

  const beginEncounter = useCallback((monster: Encounter) => {
    setState((current) => ({
      ...current,
      scene: 'squad',
      encounter: monster,
      squad: null,
      discovered: rememberSpecies(current.discovered, monster.kindId ?? monster.id),
    }));
  }, []);

  const equipHeroBasic = useCallback((basicId: string) => {
    setState((current) => {
      const catalog = classCatalog(professionRef.current);
      if (!catalog.basics.some((skill) => skill.id === basicId)) return current;
      const loadout = resolveHeroLoadout(current.heroSkills, professionRef.current, nameRef.current);
      return { ...current, heroSkills: { ...loadout, basicId } };
    });
  }, []);

  const equipHeroSkill = useCallback((skillId: string) => {
    setState((current) => {
      const catalog = classCatalog(professionRef.current);
      const allowed = catalog.skills.map((skill) => skill.id);
      if (!allowed.includes(skillId)) return current;
      const loadout = resolveHeroLoadout(current.heroSkills, professionRef.current, nameRef.current);
      return { ...current, heroSkills: { ...loadout, skillIds: placeActiveSkill(loadout.skillIds, skillId, allowed) } };
    });
  }, []);

  const equipPetBasic = useCallback((monsterId: string, basicId: string) => {
    setState((current) => ({
      ...current,
      tamed: current.tamed.map((monster) => {
        if (monster.id !== monsterId) return monster;
        const catalog = monsterCatalog(monster.kindId);
        if (!catalog.basics.some((skill) => skill.id === basicId)) return monster;
        const loadout = resolvePetLoadout(monster);
        return { ...monster, basicId, skillIds: loadout.skillIds };
      }),
    }));
  }, []);

  const equipPetSkill = useCallback((monsterId: string, skillId: string) => {
    setState((current) => ({
      ...current,
      tamed: current.tamed.map((monster) => {
        if (monster.id !== monsterId) return monster;
        const offered = monsterCatalog(monster.kindId).skills.slice(0, 3).map((skill) => skill.id);
        if (!offered.includes(skillId)) return monster;
        const loadout = resolvePetLoadout(monster);
        return { ...monster, basicId: loadout.basicId, skillIds: placeActiveSkill(loadout.skillIds, skillId, offered) };
      }),
    }));
  }, []);

  const confirmSquad = useCallback((allyIds: string[], itemIds: ItemId[], basicId: string) => {
    setState((current) => {
      let bag = current.bag;
      if (current.encounter?.mine) {
        const next = removeOne(bag, 'mine-ticket');
        if (!next) return { ...current, notice: 'Cần vé Hầm mỏ.' };
        bag = next;
      }
      const living = new Set(current.tamed.filter((monster) => monster.hp > 0).map((monster) => monster.id));
      const ready = allyIds.filter((id) => living.has(id));
      return {
        ...current,
        bag,
        scene: 'encounter',
        squad: { allyIds: ready.slice(0, 3), itemIds: itemIds.slice(0, 3), basicId },
        notice: ready.length < allyIds.length ? 'Thú hết máu không thể ra trận.' : current.notice,
      };
    });
  }, []);

  const returnToSquad = useCallback((patch: { vitals: Vitals; bag: Stack[]; pets: { id: string; hp: number; mp: number }[] }) => {
    setState((current) => ({
      ...current,
      scene: 'squad',
      squad: null,
      vitals: {
        ...patch.vitals,
        hp: Math.max(0, Math.min(patch.vitals.maxHp, patch.vitals.hp)),
        mana: Math.max(0, Math.min(patch.vitals.maxMana, patch.vitals.mana)),
        stamina: Math.max(0, Math.min(patch.vitals.maxStamina, patch.vitals.stamina)),
      },
      bag: patch.bag,
      tamed: current.tamed.map((monster) => {
        const pet = patch.pets.find((entry) => entry.id === monster.id);
        if (!pet) return monster;
        return { ...monster, hp: Math.max(0, pet.hp), mp: Math.max(0, pet.mp) };
      }),
      notice: 'Chuẩn bị lại trước khi vào trận.',
    }));
  }, []);

  const cancelSquad = useCallback(() => {
    setState((current) => {
      const saved = current.fields[current.zoneId];
      const healed = saved ? restoreWild(grantFleePeace(saved), encounterIds(current.encounter)) : saved;
      const fields = healed ? { ...current.fields, [current.zoneId]: healed } : current.fields;
      return { ...current, scene: 'wilds', encounter: null, squad: null, notice: 'Đã rút khỏi trận.', fields };
    });
  }, []);

  const openDuelSquad = useCallback(() => {
    setState((current) => {
      if (current.scene === 'squad' && current.encounter == null) return current;
      return {
        ...current,
        scene: 'squad',
        encounter: null,
        squad: null,
        notice: 'Khiêu chiến. Chọn đội trong 30 giây.',
      };
    });
  }, []);

  const leaveDuelPrep = useCallback(() => {
    setState((current) => {
      if (current.scene !== 'squad' || current.encounter) return current;
      const scene: FieldScene = current.zoneId.startsWith('town:') ? 'town' : 'wilds';
      return { ...current, scene, squad: null };
    });
  }, []);

  const resolveBattle = useCallback((result: BattleResult) => {
    setState((current) => {
      const reward = result.victory
        ? result
        : {
            ...result,
            exp: 0,
            gold: 0,
            drops: [],
            petExp: (result.petExp ?? []).map((entry) => ({ ...entry, exp: 0 })),
          };
      const progressed = applyExp(current, reward.exp, professionRef.current);
      const leveled = progressed.adventureLevel > current.adventureLevel;
      const quests = readQuests(current.quests);
      const gains = new Map((reward.petExp ?? []).map((entry) => [entry.id, entry]));
      const updated = current.tamed.map((monster) => {
        const gain = gains.get(monster.id);
        if (!gain) return monster;
        const hp = result.victory ? gain.hp : 0;
        return growTamed(monster, gain.exp, hp, gain.mp);
      });
      const captured = result.tamed.filter((monster) => !updated.some((entry) => entry.id === monster.id));
      let discovered = current.encounter ? rememberSpecies(current.discovered, current.encounter.kindId ?? current.encounter.id) : current.discovered;
      for (const monster of captured) discovered = rememberSpecies(discovered, monster.kindId);
      let bag = result.bag;
      for (const drop of reward.drops ?? []) {
        const next = addStack(bag, drop.itemId, drop.qty);
        if (next) bag = next;
      }
      const grown = updated
        .filter((monster) => {
          const prev = current.tamed.find((entry) => entry.id === monster.id);
          return prev != null && monster.level > prev.level;
        })
        .map((monster) => `${monster.name} lên cấp ${monster.level}.`)
        .join(' ');
      const notice = [leveled ? `Cấp phiêu lưu ${progressed.adventureLevel}.` : '', result.notice, grown].filter(Boolean).join(' ');
      const saved = current.fields[current.zoneId];
      const fields =
        saved && result.fieldMonsters && result.fieldMonsters.length > 0
          ? { ...current.fields, [current.zoneId]: rememberFieldVitals(saved, result.fieldMonsters) }
          : current.fields;
      return {
        ...progressed,
        scene: 'wilds',
        encounter: null,
        squad: null,
        fields,
        vitals: {
          ...result.vitals,
          hp: result.victory ? Math.max(0, Math.min(result.vitals.maxHp, result.vitals.hp)) : 1,
          mana: Math.max(0, Math.min(result.vitals.maxMana, result.vitals.mana)),
        },
        bag,
        gold: current.gold + reward.gold,
        tamed: captured.length ? [...updated, ...captured] : updated,
        discovered,
        quests: result.victory ? { ...quests, winsToday: quests.winsToday + 1, totalWins: quests.totalWins + 1 } : quests,
        notice,
      };
    });
  }, []);

  const hazardClock = useRef(0);
  const march = useCallback((distance: number, dt: number) => {
    setState((current) => {
      if (current.scene !== 'wilds') return current;
      const drain = distance * MARCH_STAMINA_PER_PX;
      const regen = distance < 1 ? dt * MARCH_REGEN_PER_SEC : 0;
      const stamina = Math.max(0, Math.min(current.vitals.maxStamina, current.vitals.stamina - drain + regen));
      if (Math.abs(stamina - current.vitals.stamina) < 0.05) return current;
      return { ...current, vitals: { ...current.vitals, stamina } };
    });
  }, []);

  const hurtQuicksand = useCallback(() => {
    setState((current) => {
      const hp = Math.max(0, current.vitals.hp - HAZARD_HP_PER_TICK);
      if (hp === current.vitals.hp) return current;
      return { ...current, vitals: { ...current.vitals, hp } };
    });
  }, []);

  const drainPuddle = useCallback(() => {
    setState((current) => {
      const stamina = Math.max(0, current.vitals.stamina - HAZARD_STAMINA_PER_TICK);
      if (stamina === current.vitals.stamina) return current;
      return { ...current, vitals: { ...current.vitals, stamina } };
    });
  }, []);

  const sufferHazard = useCallback((dt: number) => {
    hazardClock.current += dt;
    if (hazardClock.current < 0.5) return;
    const step = hazardClock.current;
    hazardClock.current = 0;
    setState((current) => {
      const stamina = Math.max(0, current.vitals.stamina - step * 8);
      const hp = stamina <= 0 ? Math.max(1, current.vitals.hp - step * 5) : current.vitals.hp;
      return {
        ...current,
        vitals: { ...current.vitals, stamina, hp },
        notice: current.notice ?? 'Độc địa đang bào mòn thể lực.',
      };
    });
  }, []);

  const value = useMemo<WorldContextValue>(() => {
    const weaponKind = state.weapon?.itemId === 'might-blade' ? 'might-blade' : 'sword';
    const attack = state.baseAttack + (state.weapon ? weaponAttack(state.weapon.plus, weaponKind) : 0);
    const defense = state.baseDefense + (state.armor ? armorDefense(state.armor.plus) : 0);
    return {
      ...state,
      attack,
      defense,
      openService,
      returnToTown,
      travelTo,
      fastTravel,
      buy,
      upgrade,
      equipFromBag,
      useBagItem,
      claimQuest,
      touchQuests,
      stash,
      withdraw,
      rest,
      collect,
      beginEncounter,
      approachMine,
      grantRaidReward,
      say,
      openDuelSquad,
      leaveDuelPrep,
      confirmSquad,
      equipHeroBasic,
      equipHeroSkill,
      equipPetBasic,
      equipPetSkill,
      cancelSquad,
      returnToSquad,
      resolveBattle,
      march,
      sufferHazard,
      hurtQuicksand,
      drainPuddle,
      saveField,
      takeField,
      clearArrival,
    };
  }, [
    state,
    openService,
    returnToTown,
    travelTo,
    fastTravel,
    buy,
    upgrade,
    equipFromBag,
    useBagItem,
    claimQuest,
    touchQuests,
    stash,
    withdraw,
    rest,
    collect,
    beginEncounter,
    approachMine,
    grantRaidReward,
    say,
    openDuelSquad,
    leaveDuelPrep,
    confirmSquad,
    equipHeroBasic,
    equipHeroSkill,
    equipPetBasic,
    equipPetSkill,
    cancelSquad,
    returnToSquad,
    resolveBattle,
    march,
    sufferHazard,
    hurtQuicksand,
    drainPuddle,
    saveField,
    takeField,
    clearArrival,
  ]);

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld(): WorldContextValue {
  const value = useContext(WorldContext);
  if (!value) throw new Error('useWorld must be used within WorldProvider');
  return value;
}

export function linkedRegion(regionId: RegionId): string | null {
  return nextRegion(regionId);
}

function growTamed(monster: TamedMonster, gained: number, hp: number, mp: number): TamedMonster {
  const amount = Number.isFinite(gained) ? Math.max(0, Math.round(gained)) : 0;
  let level = Math.max(1, monster.level);
  let exp = Math.max(0, monster.exp) + amount;
  let maxHp = monster.maxHp;
  let maxMp = monster.maxMp;
  let attack = monster.attack;
  let defense = monster.defense;
  let speed = monster.speed;
  let nextHp = Number.isFinite(hp) ? Math.max(0, hp) : monster.hp;
  let nextMp = Number.isFinite(mp) ? Math.max(0, mp) : monster.mp;
  const species = speciesById(monster.kindId);
  while (level < ADVENTURE_LEVEL_CAP) {
    const need = expForNextLevel(level);
    if (exp < need) break;
    exp -= need;
    level += 1;
    if (!species) continue;
    const stats = monsterStats(species, level);
    const hpGain = Math.max(0, stats.hp - maxHp);
    const mpGain = Math.max(0, stats.mp - maxMp);
    maxHp = stats.hp;
    maxMp = stats.mp;
    attack = stats.attack;
    defense = stats.defense;
    speed = species.speed + (level - 1);
    nextHp += hpGain;
    nextMp += mpGain;
  }
  return {
    ...monster,
    level,
    exp,
    maxHp,
    maxMp,
    attack,
    defense,
    speed,
    hp: Math.max(0, Math.min(maxHp, nextHp)),
    mp: Math.max(0, Math.min(Math.max(0, maxMp), nextMp)),
  };
}

function applyExp(current: WorldState, amount: number, professionId?: string): WorldState {
  if (amount <= 0) return current;
  let level = current.adventureLevel;
  let exp = current.adventureExp + amount;
  while (level < ADVENTURE_LEVEL_CAP) {
    const need = expForNextLevel(level);
    if (exp < need) break;
    exp -= need;
    level += 1;
  }
  const progressed = { ...current, adventureLevel: level, adventureExp: exp };
  if (level === current.adventureLevel) return progressed;
  return growWithProfession(progressed, professionId);
}

function growWithProfession(current: WorldState, professionId: string | undefined): WorldState {
  const pools = professionPools(professionId, current.adventureLevel);
  const vitals = current.vitals;
  return {
    ...current,
    baseAttack: pools.attack,
    baseDefense: pools.defense,
    vitals: {
      hp: Math.min(pools.hp, vitals.hp + Math.max(0, pools.hp - vitals.maxHp)),
      maxHp: pools.hp,
      mana: Math.min(pools.mp, vitals.mana + Math.max(0, pools.mp - vitals.maxMana)),
      maxMana: pools.mp,
      stamina: Math.min(pools.stamina, vitals.stamina + Math.max(0, pools.stamina - vitals.maxStamina)),
      maxStamina: pools.stamina,
    },
  };
}

function hungriest(tamed: TamedMonster[]): TamedMonster | null {
  if (tamed.length === 0) return null;
  return [...tamed].sort((a, b) => hunger(a) - hunger(b))[0];
}

function hunger(monster: TamedMonster): number {
  const hp = monster.maxHp > 0 ? monster.hp / monster.maxHp : 0;
  const mp = monster.maxMp > 0 ? monster.mp / monster.maxMp : 0;
  return hp + mp;
}

/** A finished fight, including a loss or a flee, puts every wild creature back to full HP and MP. */
function rememberFieldVitals(field: FieldState, report: { id: string; hp: number; mp: number }[]): FieldState {
  return restoreWild(field, report.map((entry) => entry.id));
}

function encounterIds(encounter: Encounter | null): string[] {
  if (!encounter) return [];
  return [...new Set([encounter.id, ...(encounter.pool ?? []).map((card) => card.id)])];
}

function restoreWild(field: FieldState, ids: string[]): FieldState {
  const wanted = new Set(ids);
  if (wanted.size === 0) return field;
  const heal = (monster: MonsterActor): MonsterActor =>
    wanted.has(monster.id) ? { ...monster, hp: monster.maxHp, mp: monster.maxMp } : monster;
  const chunks = { ...field.chunks };
  for (const key of Object.keys(chunks)) {
    const bucket = chunks[key];
    if (!bucket) continue;
    chunks[key] = { ...bucket, monsters: bucket.monsters.map(heal) };
  }
  return { ...field, monsters: field.monsters.map(heal), chunks };
}

function readQuests(track: QuestTrack | undefined): QuestTrack {
  if (!track) return emptyQuests();
  return normalizeQuests(track);
}

function starterPet(): Pet {
  return { name: 'Sóc nhỏ', hp: 18, maxHp: 18, mana: 8, maxMana: 8, stamina: 12, maxStamina: 12 };
}

function rememberSpecies(list: string[], id: string): string[] {
  if (!speciesById(id) || list.includes(id)) return list;
  return [...list, id];
}

function moveStack(current: WorldState, from: 'bag' | 'storage', to: 'bag' | 'storage', itemId: ItemId): WorldState {
  const source = removeOne(current[from], itemId);
  if (!source) return { ...current, notice: 'Không có món này.' };
  if ((itemId === 'sword' || itemId === 'might-blade' || itemId === 'armor') && from === 'bag') {
    const equipped = itemId === 'armor' ? current.armor?.itemId : current.weapon?.itemId;
    if (equipped === itemId) return { ...current, notice: 'Hãy tháo trang bị trước khi cất.' };
  }
  const dest = addStack(current[to], itemId);
  if (!dest) return { ...current, notice: to === 'bag' ? 'Túi đầy.' : 'Kho đầy.' };
  return {
    ...current,
    [from]: source,
    [to]: dest,
    notice: to === 'storage' ? `Đã cất ${ITEMS[itemId].nameVi}.` : `Đã lấy ${ITEMS[itemId].nameVi}.`,
  };
}
