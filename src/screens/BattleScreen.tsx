import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { CourtFx, type Fate, type Step } from '../components/battle/CourtFx';
import { EndGameModal, type ExpMember, type LootSlot } from '../components/battle/EndGameModal';
import { FloatingCombatText } from '../components/battle/FloatingCombatText';
import { useCombatJuice } from '../components/battle/JuiceOverlay';
import { TamingMiniGameModal } from '../components/battle/TamingMiniGameModal';
import { TurnTimeline, type TimelineRole } from '../components/battle/TurnTimeline';
import {
  BATTLE_GRID_POSITIONS,
  ENEMY_UNIT_CELLS,
  PLAYER_PET_CELLS,
  allySpawnCell,
  enemySpawnCell,
  feetInView,
} from '../components/battle/courtSlots';
import { BattleWorldFrame, BATTLE_DESIGN_H, BATTLE_DESIGN_W } from '../components/battle/BattleWorldFrame';
import { BattleInfoPanel, formatUnitInspectTip } from '../components/battle/BattleInfoPanel';
import {
  ActionTipBanner,
  BattleLogLine,
  CourtUnit,
  FaceArt,
  RoundButton,
  TimelineFace,
  armThenFire,
  styles,
  timelineFaceSize,
} from '../components/battle/courtChrome';
import { GestureActionButton } from '../components/battle/GestureActionButton';
import { QuickTargetStrip } from '../components/battle/QuickTargetStrip';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { getCharacter } from '../data/characters';
import { useBattleCommandSize } from '../hooks/useBattleCommandSize';
import { useQuickTarget } from '../hooks/useQuickTarget';
import { useSocket } from '../state/BattleContext';
import { useSetup } from '../state/SetupContext';
import { useWorld } from '../state/WorldContext';
import { useLayout } from '../theme/useLayout';
import {
  COMBAT_ITEMS,
  actAlly,
  actAuto,
  actAutoPlayer,
  actBasic,
  actDefend,
  actSkill,
  actTame,
  cancelTame,
  applyMastery,
  battleRewards,
  battleVitals,
  type BattleRewards,
  makeAlly,
  masteryOf,
  makePlayer,
  makeWild,
  needsAllyTarget,
  skillNeedsFoe,
  startBattle,
  type BattleState,
  type Fighter,
} from '../world/combat';
import { combatSfx } from '../world/combat/combatSfx';
import { allowsFallenTargets, selectableCombatants } from '../world/combat/faint';
import { describeSkill } from '../world/combat/kits';
import { floatKindFromLog, IMPACT_MS, SLASH_MS, STANCE_MS, STANCE_PX, TEAR_MS, TURN_MS } from '../world/combat/loop';
import { upcomingQueue } from '../world/combat/order';
import { ITEMS } from '../world/items';
import { MINE_WAVE_COUNT, mineClearDrops, mineEncounter, mineLabel } from '../world/dungeons';
import type { Encounter, ItemId } from '../world/types';

const ARENA = require('../../assets/images/sandau_2.jpg');

type Beat = 'stance' | 'ready' | 'slash' | 'impact' | 'tear' | 'hold';

/**
 * Isometric arena. NV1 (hero) at L3; ally pets on P1–P5; foes on Q1–Q5.
 * Same default spawn map as PvP / Arena / Raid. Feet stay on the cell center.
 */
export function BattleScreen() {
  const world = useWorld();
  const setup = useSetup();
  const socket = useSocket();
  const { s, font } = useLayout();
  const { cmdSize, cmdFont } = useBattleCommandSize();
  const juice = useCombatJuice();
  /** Design-canvas size (letterboxed world) — not the raw browser viewport. */
  const [screen, setScreen] = useState({ w: BATTLE_DESIGN_W, h: BATTLE_DESIGN_H });
  const [stageBox, setStageBox] = useState({ x: 0, y: 0 });
  const foot = (cell: string) => feetInView(cell, screen.w, screen.h, stageBox.x, stageBox.y);
  const petCells = [...PLAYER_PET_CELLS];
  const encounter = world.encounter;
  const character = getCharacter(setup.player?.baseCharacterId);
  const [pickedFoes, setPickedFoes] = useState<string[] | null>(null);
  const [pickedAllies, setPickedAllies] = useState<string[] | null>(null);
  const [pickedItems, setPickedItems] = useState<ItemId[] | null>(null);
  const [opening] = useState(() => {
    const squad = world.squad;
    const player = setup.player;
    if (!squad || !world.encounter || !player) return null;
    const lead = masteryOf(character?.professionId);
    const allies = world.tamed
      .filter((monster) => squad.allyIds.includes(monster.id) && monster.hp > 0)
      .slice(0, 3)
      .map((monster) => applyMastery(makeAlly(monster), lead));
    const foes = fieldFoes(world.encounter).map(makeWild);
    return {
      battle: startBattle(
        makePlayer({
          name: player.name,
          professionId: character?.professionId,
          level: world.adventureLevel,
          hp: world.vitals.hp,
          maxHp: world.vitals.maxHp,
          mp: world.vitals.mana,
          maxMp: world.vitals.maxMana,
          attack: world.attack,
          defense: world.defense,
          basicId: squad.basicId,
          skillIds: world.heroSkills?.professionId === (character?.professionId ?? 'wanderer') ? world.heroSkills.skillIds : undefined,
        }),
        allies,
        foes,
        world.bag.map((stack) => ({ ...stack })),
        world.vitals.stamina,
        world.vitals.maxStamina,
      ),
    };
  });
  const [battle, setBattle] = useState<BattleState | null>(opening?.battle ?? null);
  const [focusId, setFocusId] = useState<string | null>(opening?.battle.foes[0]?.id ?? null);
  const [allyFocusId, setAllyFocusId] = useState<string | null>(opening?.battle.player.id ?? 'player');
  const [basicId, setBasicId] = useState<string | null>(world.squad?.basicId ?? null);
  const [actionId, setActionId] = useState('basic');
  const [aimKey, setAimKey] = useState<string | null>(null);
  const [tipOverride, setTipOverride] = useState<string | null>(null);
  const [utilityPicked, setUtilityPicked] = useState<string | null>(null);
  const utilityArm = useRef({ key: '', at: 0 });
  const aimUnits = useMemo(() => {
    if (!battle || battle.over) return [];
    const ally = battle.allies.find((entry) => entry.id === battle.turnId && entry.hp > 0) ?? null;
    const actor = ally ?? battle.player;
    const skill = actionId === 'basic' ? actor.basic : actor.skills.find((entry) => entry.id === actionId) ?? actor.basic;
    const allyAim = needsAllyTarget(skill);
    const pool = allyAim ? battle.allies : battle.foes;
    // Enemy aim never includes KO units; ally revive/heal skills may.
    const selectable = selectableCombatants(pool, allyAim ? skill : null);
    return selectable.map((fighter) => ({
      id: fighter.id,
      hp: fighter.hp,
      maxHp: fighter.maxHp,
      name: fighter.name,
      kindId: fighter.kindId,
      tint: fighter.tint,
    }));
  }, [actionId, battle]);
  const quick = useQuickTarget({
    targets: aimUnits,
    focusId,
    setFocusId: (id) => setFocusId(id),
  });
  const aimPopup = (
    <QuickTargetStrip units={aimUnits} focusId={focusId} aiming size={s(36)} testIDPrefix="target" />
  );
  const [tameId, setTameId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);
  const [auto, setAuto] = useState(false);
  const [floats, setFloats] = useState<{ id: number; fighterId: string; amount: number; kind?: 'damage' | 'heal' | 'crit' | 'miss' }[]>([]);
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(Date.now());
  const focusRef = useRef<string | null>(null);
  const autoRef = useRef(false);
  const rewardsRef = useRef<BattleRewards | null>(null);
  const mineWaveRef = useRef(world.encounter?.mineWave ?? 1);
  const mineAcc = useRef({ exp: 0, gold: 0 });
  const advancingRef = useRef(false);
  const hpWatch = useRef<Map<string, number> | null>(null);
  const floatSerial = useRef(0);
  const fxSerial = useRef(0);
  const battleRef = useRef<BattleState | null>(null);
  const prevBattle = useRef<BattleState | null>(null);
  const [steps, setSteps] = useState<Record<string, Step>>({});
  const [slashes, setSlashes] = useState<Record<string, number>>({});
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const [fates, setFates] = useState<Record<string, Fate>>({});
  const [beat, setBeat] = useState<Beat>('stance');
  const beatRef = useRef<Beat>('stance');
  const strikeGen = useRef(0);
  const clocks = useRef<ReturnType<typeof setTimeout>[]>([]);
  const beginStrikeRef = useRef<(before: BattleState, next: BattleState) => void>(() => {});
  const queueRef = useRef<string[]>([]);
  autoRef.current = auto;
  battleRef.current = battle;
  if (battle?.over && !rewardsRef.current) {
    const midMine = battle.over === 'win' && Boolean(world.encounter?.mine) && mineWaveRef.current < MINE_WAVE_COUNT;
    if (!midMine) {
      const payout = battleRewards(battle);
      if (world.encounter?.mine && battle.over === 'win') {
        payout.exp += mineAcc.current.exp;
        payout.gold += mineAcc.current.gold;
        payout.drops = mineClearDrops();
      }
      rewardsRef.current = payout;
    }
  }

  const turnToken = battle && !battle.over && !paused ? battle.turnId : null;
  const handsOff = Boolean(
    battle && (battle.turnId === 'player' || battle.allies.some((ally) => ally.id === battle.turnId)),
  );
  useEffect(() => {
    setActionId('basic');
    setAimKey(null);
  }, [battle?.turnId]);
  // Step C: 30s human turn clock (adventure / mines). Resets each new turn.
  useEffect(() => {
    if (!turnToken || !handsOff || auto || tameId || paused) {
      setTurnDeadline(null);
      return;
    }
    setTurnDeadline(Date.now() + TURN_MS);
  }, [turnToken, handsOff, auto, tameId, paused]);
  useEffect(() => {
    if (turnDeadline == null) return;
    const timer = setInterval(() => setClockNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, [turnDeadline]);
  useEffect(() => {
    if (beat !== 'stance' || !turnToken) return;
    const timer = setTimeout(() => {
      if (beatRef.current !== 'stance') return;
      beatRef.current = 'ready';
      setBeat('ready');
    }, STANCE_MS);
    return () => clearTimeout(timer);
  }, [beat, turnToken]);
  useEffect(() => {
    if (beat !== 'ready' || !turnToken || tameId) return;
    if (handsOff && !auto) return;
    const timer = setTimeout(() => {
      const current = battleRef.current;
      if (!current || current.over || current.turnId !== turnToken || beatRef.current !== 'ready') return;
      const next = current.turnId === 'player'
        ? autoRef.current ? actAutoPlayer(current, focusRef.current) : current
        : actAuto(current, current.allies.some((ally) => ally.id === turnToken) && autoRef.current);
      if (next === current) return;
      beginStrikeRef.current(current, next);
    }, 40);
    return () => clearTimeout(timer);
  }, [beat, turnToken, tameId, auto, handsOff]);
  // Step C expiry: default basic attack when the 30s clock hits zero.
  useEffect(() => {
    if (turnDeadline == null || beat !== 'ready' || !turnToken || tameId || auto || paused) return;
    if (clockNow < turnDeadline) return;
    const current = battleRef.current;
    if (!current || current.over || current.turnId !== turnToken || beatRef.current !== 'ready') return;
    const next =
      current.turnId === 'player'
        ? actAutoPlayer(current, focusRef.current)
        : actAuto(current, true);
    if (next === current) return;
    setTurnDeadline(null);
    beginStrikeRef.current(current, next);
  }, [beat, clockNow, turnDeadline, turnToken, tameId, auto, paused]);
  useEffect(() => {
    if (!battle) {
      hpWatch.current = null;
      setFloats((current) => (current.length === 0 ? current : []));
      return;
    }
    const lineup = [battle.player, ...battle.allies, ...battle.foes];
    const previous = hpWatch.current;
    const next = new Map(lineup.map((fighter) => [fighter.id, fighter.hp]));
    hpWatch.current = next;
    if (!previous) {
      setFloats((current) => (current.length === 0 ? current : []));
      return;
    }
    const born: { id: number; fighterId: string; amount: number; kind?: 'damage' | 'heal' | 'crit' | 'miss' }[] = [];
    for (const fighter of lineup) {
      if (!previous.has(fighter.id)) continue;
      const delta = fighter.hp - (previous.get(fighter.id) ?? fighter.hp);
      if (!Number.isFinite(delta) || delta === 0) continue;
      floatSerial.current += 1;
      born.push({
        id: floatSerial.current,
        fighterId: fighter.id,
        amount: delta,
        kind: floatKindFromLog(battle.log, delta),
      });
    }
    if (born.length === 0) return;
    setFloats((current) => [...current, ...born].slice(-24));
  }, [battle]);
  useEffect(() => {
    const previous = prevBattle.current;
    prevBattle.current = battle;
    if (!battle || !previous || previous === battle) return;
    const captured = battle.tamed.filter((monster) => !previous.tamed.some((entry) => entry.id === monster.id));
    if (captured.length === 0) return;
    const fallen: Record<string, Fate> = {};
    for (const monster of captured) {
      fxSerial.current += 1;
      fallen[monster.id] = { key: fxSerial.current, kind: 'heart' };
    }
    setFates((current) => ({ ...current, ...fallen }));
  }, [battle]);
  useEffect(() => {
    if (beat !== 'stance' && beat !== 'ready') return;
    if (!battle || battle.over || screen.w <= 0) return;
    const actor = fighterById(battle, battle.turnId);
    const targetId = actor && actor.hp > 0 ? approachTarget(battle, focusId) : null;
    const place = (id: string) => {
      const cell = battleCell(id, battle);
      return cell ? feetInView(cell, screen.w, screen.h, stageBox.x, stageBox.y) : null;
    };
    setSteps((current) => {
      const next = { ...current };
      const ids = [battle.player.id, ...battle.allies.map((entry) => entry.id), ...battle.foes.map((entry) => entry.id)];
      let changed = false;
      for (const id of ids) {
        if (id === actor?.id && targetId) continue;
        const fighter = fighterById(battle, id);
        if (fighter && fighter.hp <= 0) continue;
        const pose = next[id];
        if (!pose || (pose.x === 0 && pose.y === 0)) continue;
        fxSerial.current += 1;
        next[id] = { key: fxSerial.current, x: 0, y: 0 };
        changed = true;
      }
      if (actor && targetId) {
        const from = place(actor.id);
        const to = place(targetId);
        if (from && to) {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const span = Math.hypot(dx, dy);
          const hold = Math.min(STANCE_PX, span * 0.35);
          const x = span < 8 ? 0 : (dx / span) * hold;
          const y = span < 8 ? 0 : (dy / span) * hold;
          const pose = next[actor.id];
          if (!pose || Math.abs(pose.x - x) > 2 || Math.abs(pose.y - y) > 2) {
            fxSerial.current += 1;
            next[actor.id] = { key: fxSerial.current, x, y };
            changed = true;
          }
        }
      }
      return changed ? next : current;
    });
  }, [battle, beat, focusId, screen.h, screen.w, stageBox.x, stageBox.y]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      clocks.current.forEach(clearTimeout);
    };
  }, []);

  beginStrikeRef.current = (before, next) => {
    if (next === before) return;
    const hits = lostHp(before, next);
    const captured = new Set(next.tamed.map((monster) => monster.id).filter((id) => !before.tamed.some((monster) => monster.id === id)));
    const struck = hits.filter((hit) => !captured.has(hit.id));
    const lethal = struck.some((hit) => hit.hp <= 0);
    const release = (gen: number, finalState: BattleState) => {
      if (strikeGen.current !== gen) return;
      setBattle(finalState);
      if (finalState.over) {
        beatRef.current = 'ready';
        setBeat('ready');
        return;
      }
      beatRef.current = 'stance';
      setBeat('stance');
    };
    const later = (ms: number, fn: () => void) => {
      const timer = setTimeout(() => {
        clocks.current = clocks.current.filter((entry) => entry !== timer);
        fn();
      }, ms);
      clocks.current.push(timer);
    };
    if (struck.length === 0) {
      if (captured.size > 0 && next.turnId !== before.turnId) {
        const gen = ++strikeGen.current;
        setBattle(next);
        beatRef.current = 'hold';
        setBeat('hold');
        later(TEAR_MS, () => release(gen, next));
        return;
      }
      setBattle(next);
      if (next.turnId !== before.turnId && !next.over) {
        beatRef.current = 'stance';
        setBeat('stance');
      }
      return;
    }
    const marks: Record<string, number> = {};
    for (const hit of struck) {
      fxSerial.current += 1;
      marks[hit.id] = fxSerial.current;
    }
    setSlashes((current) => ({ ...current, ...marks }));
    const gen = ++strikeGen.current;
    beatRef.current = 'slash';
    setBeat('slash');
    later(SLASH_MS, () => {
      if (strikeGen.current !== gen) return;
      setBattle({ ...next, turnId: before.turnId, over: null });
      const impact: Record<string, number> = {};
      for (const hit of struck) {
        fxSerial.current += 1;
        impact[hit.id] = fxSerial.current;
      }
      setShakes((current) => ({ ...current, ...impact }));
      beatRef.current = 'impact';
      setBeat('impact');
      later(IMPACT_MS, () => {
        if (strikeGen.current !== gen) return;
        if (!lethal) {
          release(gen, next);
          return;
        }
        const fallen: Record<string, Fate> = {};
        for (const hit of struck) {
          if (hit.hp > 0) continue;
          fxSerial.current += 1;
          fallen[hit.id] = { key: fxSerial.current, kind: 'tear' };
        }
        if (Object.keys(fallen).length > 0) setFates((current) => ({ ...current, ...fallen }));
        beatRef.current = 'tear';
        setBeat('tear');
        later(TEAR_MS, () => release(gen, next));
      });
    });
  };

  const liveQueue = useMemo(() => {
    if (!battle) return [] as string[];
    const living = new Set([battle.player, ...battle.allies, ...battle.foes].filter((fighter) => fighter.hp > 0).map((fighter) => fighter.id));
    return upcomingQueue(battle.order, battle.turnId, living);
  }, [battle]);
  const queueHeld = beat === 'slash' || beat === 'impact' || beat === 'tear' || beat === 'hold';
  if (!queueHeld) queueRef.current = liveQueue;
  const turnQueue = queueHeld ? queueRef.current : liveQueue;

  if (!encounter || !setup.player) {
    return (
      <View style={styles.screen}>
        <Text style={styles.log}>Không có trận đấu.</Text>
      </View>
    );
  }

  const cards = roster(encounter);
  const consumables = world.bag.filter((stack) => COMBAT_ITEMS.includes(stack.itemId));
  const captured = world.tamed;
  const readyPets = captured.filter((monster) => monster.hp > 0);
  const readyIds = new Set(readyPets.map((monster) => monster.id));
  const foeIds = pickedFoes ?? cards.slice(0, 3).map((card) => card.id);
  const allyIds = (pickedAllies ?? readyPets.slice(0, 3).map((monster) => monster.id)).filter((id) => readyIds.has(id));
  const itemIds = pickedItems ?? consumables.slice(0, 1).map((stack) => stack.itemId);
  const allyNeed = Math.min(3, readyPets.length);
  const itemNeed = Math.min(1, consumables.length);
  const ready = foeIds.length === 3 && allyIds.length === allyNeed && itemIds.length === itemNeed;
  const playerPreview = makePlayer({
    name: setup.player.name,
    professionId: character?.professionId,
    level: world.adventureLevel,
    hp: world.vitals.hp,
    maxHp: world.vitals.maxHp,
    mp: world.vitals.mana,
    maxMp: world.vitals.maxMana,
    attack: world.attack,
    defense: world.defense,
    basicId: basicId ?? world.squad?.basicId ?? world.heroSkills?.basicId,
    skillIds: world.heroSkills?.professionId === (character?.professionId ?? 'wanderer') ? world.heroSkills.skillIds : undefined,
  });
  const living = battle?.foes.filter((foe) => foe.hp > 0) ?? [];
  const targetPool = battle ? [...battle.foes, ...battle.allies] : [];
  const selected = targetPool.find((fighter) => fighter.id === focusId && fighter.hp > 0) ?? null;
  const focus = selected?.side === 'wild' ? selected : (living[0] ?? null);
  const marked = selected ?? focus;
  focusRef.current = focus?.id ?? null;
  const tameFoe = battle?.foes.find((foe) => foe?.id === tameId && foe.hp > 0) ?? null;
  const nets = countNets(battle?.bag ?? world.bag);
  const rewards = battle?.over ? rewardsRef.current : null;
  const actingAlly = battle?.allies.find((ally) => ally.id === battle.turnId && ally.hp > 0) ?? null;
  const queued = beat === 'ready';
  const playerTurn = Boolean(battle && !battle.over && !paused && queued && battle.turnId === 'player' && !tameId);
  const commandTurn = playerTurn || Boolean(actingAlly && !auto && !paused && queued && !tameId && battle && !battle.over);
  const lineup = battle ? [battle.player, ...battle.allies, ...battle.foes] : [];
  const player = battle?.player ?? playerPreview;
  const shownAllies = battle
    ? battle.allies
    : captured.filter((monster) => allyIds.includes(monster.id)).map(makeAlly);
  const shownFoes = battle ? battle.foes : cards.filter((card) => foeIds.includes(card.id)).map(makeWild);
  const densePack = shownFoes.length > 3;
  const foeCells = [...ENEMY_UNIT_CELLS];

  const finish = () => {
    if (!battle?.over) return;
    const payout = rewardsRef.current ?? battleRewards(battle);
    const names = battle.tamed.map((monster) => monster.name).join(', ');
    const itemText = payout.drops.map((drop) => `${ITEMS[drop.itemId].nameVi} ×${drop.qty}`).join(', ');
    const notice = payout.victory
      ? `Thắng trận. +${payout.exp} kinh nghiệm, +${payout.gold} vàng${itemText ? `, ${itemText}` : ''}.`
      : 'Thua trận. Không nhận thưởng. Máu còn 1. Thú tham chiến hết máu, mana giữ nguyên.';
    socket?.emit('battle:settle', {
      victory: payout.victory,
      exp: payout.exp,
      gold: payout.gold,
      drops: payout.drops,
    });
    world.resolveBattle({
      vitals: battleVitals(battle, world.vitals.maxHp, world.vitals.maxMana),
      bag: battle.bag,
      exp: payout.exp,
      gold: payout.gold,
      tamed: battle.tamed,
      notice: names ? `${notice} Đội thú: ${names}.` : notice,
      victory: payout.victory,
      petExp: payout.pets.map(({ id, exp, hp, mp }) => ({ id, exp, hp, mp })),
      drops: payout.drops,
      fieldMonsters: battle.foes.map((foe) => ({ id: foe.id, hp: foe.hp, mp: foe.mp })),
    });
  };

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const bootMineWave = (prev: BattleState, floor: number, wave: number) => {
    mineWaveRef.current = wave;
    const foes = fieldFoes(mineEncounter(world.adventureLevel, floor, wave)).map(makeWild);
    const next = startBattle(
      { ...prev.player, cooldowns: {} },
      prev.allies.map((ally) => ({ ...ally, cooldowns: {} })),
      foes,
      prev.bag,
      prev.stamina,
      prev.maxStamina,
    );
    next.tamed = prev.tamed;
    advancingRef.current = false;
    rewardsRef.current = null;
    setFocusId(next.foes[0]?.id ?? null);
    setAllyFocusId(next.player.id);
    strikeGen.current += 1;
    beatRef.current = 'stance';
    setBeat('stance');
    setSteps({});
    setSlashes({});
    setShakes({});
    setFates({});
    prevBattle.current = null;
    hpWatch.current = null;
    clocks.current.forEach(clearTimeout);
    clocks.current = [];
    setPaused(false);
    setBattle(next);
  };

  useEffect(() => {
    if (!battle?.over || battle.over !== 'win' || rewardsRef.current) return;
    if (!world.encounter?.mine || mineWaveRef.current >= MINE_WAVE_COUNT) return;
    if (advancingRef.current) return;
    advancingRef.current = true;
    const payout = battleRewards(battle);
    mineAcc.current.exp += payout.exp;
    mineAcc.current.gold += payout.gold;
    const floor = world.encounter.mineFloor ?? world.mineFloor ?? 1;
    const from = mineWaveRef.current;
    const nextWave = from + 1;
    showToast(`Sóng ${mineLabel(floor, from)} xong. Máu và mana giữ nguyên.`);
    world.setMineWave(nextWave);
    const snapshot = battle;
    const timer = setTimeout(() => bootMineWave(snapshot, floor, nextWave), 800);
    return () => clearTimeout(timer);
    // Wave advance is driven by this over-state, not by world identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battle]);

  const openTame = () => {
    try {
      if (!battle || battle.over || paused || beatRef.current !== 'ready' || battle.turnId !== 'player' || tameId) return;
      const available = countNets(battle.bag);
      if (!(available > 0)) {
        showToast('Hết lưới bắt quái!');
        return;
      }
      const foe = battle.foes.find((entry) => entry && entry.id === focus?.id && entry.hp > 0 && entry.side === 'wild');
      if (!foe || typeof foe.id !== 'string' || !foe.id) {
        showToast('Hãy chọn một quái còn sống.');
        return;
      }
      setTameId(foe.id);
    } catch (error) {
      console.warn('[Game Thư Giãn] Taming could not open.', error);
      setTameId(null);
      showToast('Không mở được lưới.');
    }
  };

  const finishTame = (bonuses: number[]) => {
    try {
      const id = tameFoe?.id ?? null;
      const rolls = Array.isArray(bonuses) ? bonuses.filter((bonus) => Number.isFinite(bonus)) : [];
      setTameId(null);
      if (!id) return;
      const current = battleRef.current;
      if (!current) return;
      try {
        beginStrikeRef.current(current, actTame(current, id, rolls, Math.random()));
      } catch (error) {
        console.warn('[Game Thư Giãn] Taming could not resolve.', error);
      }
    } catch (error) {
      console.warn('[Game Thư Giãn] Taming could not resolve.', error);
      setTameId(null);
    }
  };

  const commitAction = (skillKey: string, targetMode: 'focus' | 'lowest' | string) => {
    const current = battleRef.current;
    if (!current || current.over || beatRef.current !== 'ready' || paused) return;
    const ally = current.allies.find((entry) => entry.id === current.turnId && entry.hp > 0) ?? null;
    if (current.turnId !== 'player' && !ally) return;
    if (skillKey === 'defend') {
      const next = actDefend(current);
      if (next === current) return;
      setAimKey(null);
      combatSfx('cast');
      beginStrikeRef.current(current, next);
      return;
    }
    const actor = ally ?? current.player;
    const skill = skillKey === 'basic' ? null : actor.skills.find((entry) => entry.id === skillKey) ?? null;
    const move = skill ?? actor.basic;
    const wantAlly = skill ? needsAllyTarget(skill) : false;
    const foePool = current.foes.filter((fighter) => fighter.hp > 0);
    const allyPool = selectableCombatants(current.allies, wantAlly ? skill : null);
    const pool = wantAlly ? allyPool : foePool;
    const lowest = [...pool].sort((a, b) => {
      const ra = a.maxHp > 0 ? a.hp / a.maxHp : 1;
      const rb = b.maxHp > 0 ? b.hp / b.maxHp : 1;
      return ra - rb || a.hp - b.hp;
    })[0] ?? null;
    const exact = pool.find((fighter) => fighter.id === targetMode) ?? null;
    const focused = pool.find((fighter) => fighter.id === focusId) ?? null;
    const chosen = targetMode === 'lowest' ? lowest : exact ?? (targetMode === 'focus' ? focused ?? lowest : focused ?? lowest);
    const foe = wantAlly ? null : chosen;
    const allyPick = wantAlly ? chosen : null;
    let next = current;
    if (ally) {
      if (skill) {
        if (skillNeedsFoe(skill) && !foe) next = { ...current, log: 'Hãy chọn một quái còn sống.' };
        else if (needsAllyTarget(skill) && !allyPick) next = { ...current, log: 'Hãy chọn một pet đồng minh.' };
        else next = actAlly(current, skillNeedsFoe(skill) ? foe?.id ?? null : allyPick?.id ?? null, skill.id);
      } else if (!foe) next = { ...current, log: 'Hãy chọn một quái còn sống.' };
      else next = actAlly(current, foe.id, null);
    } else if (current.turnId === 'player') {
      if (!skill) {
        if (current.player.chargedPower) {
          next = foe ? actBasic(current, foe.id) : { ...current, log: 'Hãy chọn một quái còn sống.' };
        } else if (skillNeedsFoe(move) && !foe) next = { ...current, log: 'Hãy chọn một quái còn sống.' };
        else next = actBasic(current, foe?.id ?? 'none');
      } else if (skillNeedsFoe(skill) && !foe) next = { ...current, log: 'Hãy chọn một quái còn sống.' };
      else if (needsAllyTarget(skill) && !allyPick) next = { ...current, log: 'Hãy chọn một pet đồng minh.' };
      else next = actSkill(current, skillNeedsFoe(skill) ? foe?.id ?? null : allyPick?.id ?? null, skill.id);
    }
    if (next === current) return;
    combatSfx('cast');
    beginStrikeRef.current(current, next);
  };

  const bindAction = (skillKey: string) => ({
    onArm: () => {
      setUtilityPicked(null);
      utilityArm.current = { key: '', at: 0 };
      setTipOverride(null);
      setActionId(skillKey);
      setAimKey(null);
      combatSfx('arm');
    },
    onDoubleTap: () => {
      setUtilityPicked(null);
      setTipOverride(null);
      setActionId(skillKey);
      setAimKey(null);
      commitAction(skillKey, 'lowest');
    },
    onHoldStart: () => {
      setUtilityPicked(null);
      setTipOverride(null);
      setActionId(skillKey);
      setAimKey(skillKey);
      quick.beginAim();
    },
    onHoldMove: (dx: number, dy: number) => quick.moveAim(dx, dy),
    onHoldEnd: (dy: number, cancelled: boolean) => {
      const result = quick.endAim(cancelled ? 999 : dy);
      setAimKey(null);
      if (result === 'cast') commitAction(skillKey, 'focus');
    },
  });

  const actionTipText = (() => {
    if (tipOverride) return tipOverride;
    if (!battle) {
      return `Chọn 3 địch${allyNeed ? ` và ${allyNeed} đồng đội` : ''}${itemNeed ? ' và 1 vật phẩm' : ''}, rồi nhấn Vào.`;
    }
    if (battle.over) {
      return battle.over === 'win' ? 'Chiến thắng. Nhận thưởng và tiếp tục.' : 'Thất bại. Máu còn 1.';
    }
    const actor = actingAlly ?? battle.player;
    if (actionId === 'basic') {
      const basic = actor.basic;
      return basic ? `Đánh thường · ${basic.name}. ${basic.blurb || 'Đòn vật lý cơ bản.'}` : 'Đòn đánh thường.';
    }
    const skill = (actor.skills ?? []).find((entry) => entry.id === actionId);
    return skill ? describeSkill(skill) : 'Chọn một lệnh để xem mô tả.';
  })();

  const battleLogText = battle
    ? `${battle.over === 'win' ? 'Chiến thắng. ' : battle.over === 'lose' ? 'Thất bại. ' : ''}${battle.log}`
    : `Chuẩn bị trận · chọn đội hình bên dưới.`;

  const begin = () => {
    if (!ready) return;
    const lead = masteryOf(character?.professionId);
    const allies = captured
      .filter((monster) => allyIds.includes(monster.id) && monster.hp > 0)
      .slice(0, 3)
      .map((monster) => applyMastery(makeAlly(monster), lead));
    const foes = (cards[0] && isBoar(cards[0]) ? fieldFoes(encounter) : cards.filter((card) => foeIds.includes(card.id))).map(makeWild);
    const next = startBattle(
      playerPreview,
      allies,
      foes,
      world.bag.map((stack) => ({ ...stack })),
      world.vitals.stamina,
      world.vitals.maxStamina,
    );
    setFocusId(next.foes[0]?.id ?? null);
    setAllyFocusId(next.player.id);
    strikeGen.current += 1;
    beatRef.current = 'stance';
    setBeat('stance');
    setSteps({});
    setSlashes({});
    setShakes({});
    setFates({});
    prevBattle.current = null;
    setBattle(next);
  };

  const retry = () => {
    if (!battle) return;
    world.returnToSquad({
      vitals: battleVitals(battle, world.vitals.maxHp, world.vitals.maxMana),
      bag: battle.bag,
      pets: battle.allies.map((ally) => ({
        id: ally.id.startsWith('ally-') ? ally.id.slice('ally-'.length) : ally.id,
        hp: Math.max(0, ally.hp),
        mp: Math.max(0, ally.mp),
      })),
    });
  };

  const toggleId = <T extends string>(list: T[], id: T, max: number, set: (next: T[]) => void) => {
    if (list.includes(id)) set(list.filter((entry) => entry !== id));
    else if (list.length < max) set([...list, id]);
  };
  const faceSize = timelineFaceSize(screen.w, 8, 8, turnQueue.length, s(28), 212 * 2 + 28);
  const panelOf = (fighter: typeof player | null) =>
    fighter
      ? {
          id: fighter.id,
          name: fighter.name,
          tint: fighter.tint,
          hp: fighter.hp,
          maxHp: fighter.maxHp,
          mp: fighter.mp,
          maxMp: fighter.maxMp,
          shieldHp: fighter.shieldHp,
          level: fighter.level,
          element: fighter.element,
          kindId: fighter.kindId,
          statuses: fighter.statuses,
          mods: fighter.mods,
          skills: [
            { id: fighter.basic.id, name: fighter.basic.name, wait: fighter.cooldowns?.[fighter.basic.id] ?? 0 },
            ...(fighter.skills ?? []).map((skill) => ({
              id: skill.id,
              name: skill.name,
              wait: fighter.cooldowns?.[skill.id] ?? 0,
              mana: skill.mana,
            })),
          ],
        }
      : null;
  const allyRoster = battle ? [battle.player, ...battle.allies] : [player, ...shownAllies];
  const enemyRoster = battle ? battle.foes : shownFoes;
  const leftFighter =
    allyRoster.find((entry) => entry.id === allyFocusId) ??
    allyRoster.find((entry) => entry.hp > 0) ??
    allyRoster[0] ??
    null;
  const rightFighter =
    enemyRoster.find((entry) => entry.id === focusId) ??
    enemyRoster.find((entry) => entry.hp > 0) ??
    enemyRoster[0] ??
    null;
  const inspectAlly = (fighter: (typeof allyRoster)[number]) => {
    setAllyFocusId(fighter.id);
    setUtilityPicked(null);
    setTipOverride(formatUnitInspectTip(panelOf(fighter)));
  };
  const inspectEnemy = (fighter: (typeof enemyRoster)[number]) => {
    setFocusId(fighter.id);
    setUtilityPicked(null);
    setTipOverride(formatUnitInspectTip(panelOf(fighter)));
  };

  return (
    <BattleWorldFrame
      testID="field-battle"
      arenaSource={ARENA}
      onMetrics={(metrics) => {
        setScreen((current) =>
          current.w === metrics.worldW && current.h === metrics.worldH
            ? current
            : { w: metrics.worldW, h: metrics.worldH },
        );
      }}
    >
      <View style={[styles.frame, styles.worldPad]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BattleInfoPanel
            side="left"
            unit={panelOf(leftFighter)}
            avatarSize={s(48)}
            testID="info-active"
            portrait={
              leftFighter?.side === 'player' && character ? (
                <CharacterAvatar character={character} hairColor={setup.player.hairColor} outfitColor={setup.player.outfitColor} size={s(46)} />
              ) : undefined
            }
          />
        </View>
        <View style={styles.headerCenter}>
          <TurnTimeline
            ids={turnQueue}
            activeId={battle && !battle.over ? battle.turnId : null}
            size={faceSize}
            renderFace={(id, role) => {
              const fighter = lineup.find((entry) => entry.id === id);
              if (!fighter) return null;
              return (
                <TimelineFace
                  fighter={fighter}
                  active={role === 'now'}
                  role={role}
                  size={faceSize}
                  character={fighter.side === 'player' ? character : null}
                  hairColor={setup.player?.hairColor}
                  outfitColor={setup.player?.outfitColor}
                />
              );
            }}
          />
            <View style={styles.headerControls}>
            <RoundButton
              label={
                battle?.over
                  ? 'Hết'
                  : turnDeadline != null && handsOff && !auto
                    ? `${Math.max(0, Math.ceil((turnDeadline - clockNow) / 1000))}s`
                    : '—'
              }
              hint="Thời gian lượt (30s)"
              onPress={() => undefined}
              size={s(32)}
              width={s(52)}
              font={font(11)}
            />
            <RoundButton label={paused ? '▶' : 'Dừng'} hint="Tạm dừng" disabled={!battle || Boolean(battle.over)} hot={paused} onPress={() => setPaused((value) => !value)} testID="battle-pause" size={s(32)} width={s(56)} font={font(11)} />
            <RoundButton label={auto ? 'Tự: Bật' : 'Tự: Tắt'} hint={auto ? 'Tắt tự động đánh' : 'Bật tự động đánh'} disabled={!battle || Boolean(battle.over)} hot={auto} onPress={() => setAuto((value) => !value)} testID="battle-auto" size={s(32)} width={s(70)} font={font(10)} />
            {world.encounter?.mine ? (
              <RoundButton
                label={mineLabel(world.encounter.mineFloor ?? world.mineFloor ?? 1, mineWaveRef.current)}
                hint="Sóng hầm mỏ"
                onPress={() => undefined}
                size={s(32)}
                width={s(64)}
                font={font(11)}
              />
            ) : null}
          </View>
          {paused && battle ? (
            <Text style={[styles.pauseBanner, { position: 'relative', top: 0, alignSelf: 'center', fontSize: font(12) }]}>Tạm dừng</Text>
          ) : (
            <BattleLogLine text={battleLogText} fontSize={font(11)} testID="battle-log" />
          )}
        </View>
        <View style={styles.headerRight}>
          <BattleInfoPanel
            side="right"
            unit={panelOf(rightFighter)}
            avatarSize={s(48)}
            testID="info-target"
            portrait={
              rightFighter?.side === 'player' && character ? (
                <CharacterAvatar character={character} hairColor={setup.player.hairColor} outfitColor={setup.player.outfitColor} size={s(46)} />
              ) : undefined
            }
          />
        </View>
      </View>

      <Animated.View
        style={[styles.stage, juice.stageStyle]}
        onLayout={(event) => {
          const { x, y } = event.nativeEvent.layout;
          setStageBox((current) => (current.x === x && current.y === y ? current : { x, y }));
        }}
      >
        <CourtUnit
          fighter={player}
          slot={foot(BATTLE_GRID_POSITIONS.player)}
          active={Boolean(battle && battle.turnId === player.id)}
          targeted={allyFocusId === player.id}
          face="right"
          size={s(118)}
          statFont={font(10)}
          barWidth={s(104)}
          step={steps[player.id] ?? null}
          slashKey={slashes[player.id] ?? 0}
          shakeKey={shakes[player.id] ?? 0}
          fate={fates[player.id] ?? null}
          testID="court-player"
          character={character}
          hairColor={setup.player.hairColor}
          outfitColor={setup.player.outfitColor}
          onPress={() => {
            inspectAlly(player);
            if (battle && quick.noteUnitTap(player.id) === 'double' && needsAllyTarget(
              ((actingAlly ?? battle.player).skills.find((entry) => entry.id === actionId) ?? (actingAlly ?? battle.player).basic),
            )) {
              commitAction(actionId, player.id);
            }
          }}
        />
        {shownAllies.map((fighter, index) => (
          <CourtUnit
            key={fighter.id}
            fighter={fighter}
            slot={foot(petCells[index] ?? petCells[0])}
            active={battle ? battle.turnId === fighter.id : allyIds.includes(rawId(fighter.id))}
            targeted={allyFocusId === fighter.id}
            face="right"
            size={Math.round(s(64) * 0.8)}
            statFont={font(10)}
            barWidth={s(86)}
            step={steps[fighter.id] ?? null}
            slashKey={slashes[fighter.id] ?? 0}
            shakeKey={shakes[fighter.id] ?? 0}
            fate={fates[fighter.id] ?? null}
            testID={`court-ally-${index}`}
            onPress={
              battle
                ? (() => {
                    const actor =
                      battle.allies.find((entry) => entry.id === battle.turnId && entry.hp > 0) ?? battle.player;
                    const skill =
                      actionId === 'basic' ? actor.basic : actor.skills.find((entry) => entry.id === actionId) ?? actor.basic;
                    const canPick = fighter.hp > 0 || (needsAllyTarget(skill) && allowsFallenTargets(skill));
                    if (!canPick) return () => inspectAlly(fighter);
                    return () => {
                      inspectAlly(fighter);
                      setFocusId(fighter.id);
                      if (quick.noteUnitTap(fighter.id) === 'double') commitAction(actionId, fighter.id);
                    };
                  })()
                : () => {
                    inspectAlly(fighter);
                    toggleId(allyIds, rawId(fighter.id), 3, setPickedAllies);
                  }
            }
          />
        ))}
        {shownFoes.map((fighter, index) => (
          <CourtUnit
            key={fighter.id}
            fighter={fighter}
            slot={foot(foeCells[index] ?? foeCells[0])}
            active={Boolean(battle && battle.turnId === fighter.id)}
            targeted={battle ? focusId === fighter.id && fighter.hp > 0 : true}
            face="left"
            size={Math.round((densePack ? s(56) : s(64)) * 0.8)}
            statFont={font(10)}
            barWidth={densePack ? s(72) : s(86)}
          front={foeCells[index] === BATTLE_GRID_POSITIONS.enemy3}
          step={steps[fighter.id] ?? null}
          slashKey={slashes[fighter.id] ?? 0}
          shakeKey={shakes[fighter.id] ?? 0}
          fate={fates[fighter.id] ?? null}
          testID={`court-foe-${index}`}
            onPress={
              battle
                ? () => {
                    inspectEnemy(fighter);
                    if (fighter.hp > 0 && quick.noteUnitTap(fighter.id) === 'double') commitAction(actionId, fighter.id);
                  }
                : () => {
                    inspectEnemy(fighter);
                    toggleId(foeIds, fighter.id, 3, setPickedFoes);
                  }
            }
          />
        ))}
        {floats.map((note) => {
          const anchor = floatAnchor(note.fighterId, player.id, shownAllies, shownFoes, foot, petCells, foeCells, s, densePack);
          if (!anchor) return null;
          const stack = floats.filter((entry) => entry.fighterId === note.fighterId);
          const index = stack.findIndex((entry) => entry.id === note.id);
          return (
            <FloatingCombatText
              key={note.id}
              amount={note.amount}
              kind={note.kind}
              x={anchor.x + (index - (stack.length - 1) / 2) * 16}
              y={anchor.y}
              onImpact={juice.trigger}
              onDone={() => setFloats((current) => current.filter((entry) => entry.id !== note.id))}
            />
          );
        })}
      </Animated.View>
      {juice.overlay}

      <View style={styles.dock}>
        <View style={styles.targets}>
          {!battle && captured.length > 0 ? (
            <>
              <Text style={[styles.dockLabel, { fontSize: font(10) }]} numberOfLines={1}>
                Đã thu phục · {allyIds.length}/{allyNeed}
              </Text>
              <View style={[styles.targetRow, styles.rosterRow]}>
                {captured.map((monster) => {
                  const downed = monster.hp <= 0;
                  const on = allyIds.includes(monster.id);
                  return (
                    <Pressable
                      key={monster.id}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: downed }}
                      accessibilityLabel={`${monster.name} ${downed ? 'Hết máu' : 'Đã thu phục'}`}
                      disabled={downed}
                      onPress={() => toggleId(allyIds, monster.id, 3, setPickedAllies)}
                      style={[styles.target, { width: s(32), height: s(32), borderRadius: s(16) }, on && styles.targetOn, downed && styles.fainted]}
                    >
                      <FaceArt kindId={monster.kindId} tint={monster.tint} name={monster.name} size={s(32)} facing="right" />
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
          {!battle ? (
            <>
              <Text style={[styles.dockLabel, { fontSize: font(10) }]} numberOfLines={1}>
                Địch
              </Text>
              <View style={styles.targetRow}>
                {cards.slice(0, 6).map((fighter) => {
                  const on = foeIds.includes(fighter.id);
                  return (
                    <Pressable
                      key={fighter.id}
                      accessibilityRole="button"
                      accessibilityLabel={fighter.name}
                      onPress={() => toggleId(foeIds, fighter.id, 3, setPickedFoes)}
                      style={[styles.target, { width: s(32), height: s(32), borderRadius: s(16) }, on && styles.targetOn]}
                    >
                      <FaceArt kindId={fighter.kindId} tint={fighter.tint} name={fighter.name} size={s(32)} facing="left" />
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
        <ActionTipBanner text={actionTipText} fontSize={Math.max(font(11), cmdFont)} testID="action-tip" />
        <View style={styles.commands}>
          {!battle ? (
            <>
              {playerPreview.basics.map((skill) => (
                <RoundButton
                  key={skill.id}
                  label={skill.name}
                  hint="Đòn đánh thường"
                  square
                  hot={(basicId ?? playerPreview.basic.id) === skill.id}
                  onHighlight={() => setTipOverride(`Đòn đánh thường · ${skill.name}. ${skill.blurb || ''}`.trim())}
                  onPress={() => {
                    setTipOverride(`Đòn đánh thường · ${skill.name}. ${skill.blurb || ''}`.trim());
                    setBasicId(skill.id);
                  }}
                  size={cmdSize}
                  font={cmdFont}
                />
              ))}
              {consumables.map((stack) => (
                <RoundButton
                  key={stack.itemId}
                  label={shortItem(stack.itemId)}
                  tint={ITEMS[stack.itemId].tint}
                  hot={itemIds.includes(stack.itemId)}
                  onHighlight={() => setTipOverride(`${ITEMS[stack.itemId].nameVi} · mang vào trận.`)}
                  onPress={() => {
                    setTipOverride(`${ITEMS[stack.itemId].nameVi} · mang vào trận.`);
                    toggleId(itemIds, stack.itemId, 1, setPickedItems);
                  }}
                  size={Math.round(cmdSize * 0.88)}
                  font={cmdFont}
                />
              ))}
              <RoundButton
                label="Vào"
                hint="Vào trận"
                hot={ready}
                disabled={!ready}
                onHighlight={() => setTipOverride('Bắt đầu trận với đội hình đã chọn.')}
                onPress={begin}
                testID="battle-start"
                size={cmdSize}
                font={Math.max(cmdFont, 12)}
                tint="#e25b2a"
              />
            </>
          ) : battle.over ? null : (
            <>
              {actingAlly ? null : (
                <RoundButton
                  label={nets > 0 ? `Lưới ×${nets}` : 'Lưới'}
                  hint={nets > 0 ? `Thu phục, còn ${nets} lưới · chạm 2 lần để dùng` : 'Hết lưới bắt quái!'}
                  square
                  tint="#3cba45"
                  picked={utilityPicked === 'tame'}
                  disabled={!playerTurn}
                  dim={nets <= 0}
                  testID="tame-open"
                  onHighlight={() =>
                    setTipOverride(
                      nets > 0
                        ? `Lưới · thu phục mục tiêu. Còn ${nets} lưới. Chạm lần nữa để dùng.`
                        : 'Hết lưới bắt quái!',
                    )
                  }
                  onPress={() => {
                    const tip =
                      nets > 0
                        ? `Lưới · thu phục mục tiêu. Còn ${nets} lưới. Chạm lần nữa để dùng.`
                        : 'Hết lưới bắt quái!';
                    setTipOverride(tip);
                    setUtilityPicked('tame');
                    if (nets <= 0) return;
                    armThenFire(utilityArm, 'tame', 450, () => {
                      setUtilityPicked(null);
                      openTame();
                    });
                  }}
                  size={cmdSize}
                  font={cmdFont}
                />
              )}
              <GestureActionButton
                label="Đánh thường"
                hint={`Đòn đánh thường ${(actingAlly ?? battle.player).basic?.name ?? 'Đòn thường'}`}
                picked={actionId === 'basic'}
                aiming={aimKey === 'basic' && quick.aiming}
                aimPopup={aimPopup}
                disabled={!commandTurn}
                testID="battle-basic"
                size={cmdSize}
                font={cmdFont}
                {...bindAction('basic')}
              />
              {((actingAlly ?? battle.player).skills ?? []).slice(0, 2).map((skill, index) => {
                const actor = actingAlly ?? battle.player;
                const wait = actor.cooldowns[skill.id] ?? 0;
                const locked = wait > 0 || actor.mp < skill.mana;
                return (
                  <GestureActionButton
                    key={skill.id}
                    label={skill.name}
                    hint={describeSkill(skill)}
                    tint="#7fd0c4"
                    hot={actionId === skill.id}
                    picked={actionId === skill.id}
                    aiming={aimKey === skill.id && quick.aiming}
                    aimPopup={aimPopup}
                    disabled={!commandTurn || locked}
                    dim={locked}
                    testID={`battle-skill-${index + 1}`}
                    size={cmdSize}
                    font={cmdFont}
                    {...bindAction(skill.id)}
                  />
                );
              })}
              <RoundButton
                label="Phòng thủ"
                hint="Giảm 25% sát thương đến lượt sau · chạm 2 lần để dùng"
                square
                tint="#2f6fe0"
                picked={utilityPicked === 'defend'}
                disabled={!commandTurn}
                testID="battle-defend"
                onHighlight={() =>
                  setTipOverride('Phòng thủ · giảm 25% sát thương đến lượt sau. Chạm lần nữa để dùng.')
                }
                onPress={() => {
                  setTipOverride('Phòng thủ · giảm 25% sát thương đến lượt sau. Chạm lần nữa để dùng.');
                  setUtilityPicked('defend');
                  armThenFire(utilityArm, 'defend', 450, () => {
                    setUtilityPicked(null);
                    commitAction('defend', 'focus');
                  });
                }}
                size={cmdSize}
                font={cmdFont}
              />
            </>
          )}
        </View>
      </View>

      </View>
      {toast ? (
        <View pointerEvents="none" style={styles.toast} testID="battle-toast">
          <Text style={[styles.toastLabel, { fontSize: font(13) }]}>{toast}</Text>
        </View>
      ) : null}
      {tameFoe?.id ? (
        <TamingMiniGameModal
          key={tameFoe.id}
          monsterName={tameFoe.name || 'Quái'}
          lowHp={tameFoe.maxHp > 0 && tameFoe.hp / tameFoe.maxHp <= 0.05}
          onClose={(turnsPlayed) => {
            setTameId(null);
            if (turnsPlayed < 3) return;
            const current = battleRef.current;
            if (current && current.turnId === 'player' && !current.over) beginStrikeRef.current(current, cancelTame(current));
          }}
          onFinish={finishTame}
        />
      ) : null}
      {rewards && battle?.over ? (
        <EndGameModal
          victory={rewards.victory}
          members={expMembers(battle, rewards, world.adventureLevel, world.adventureExp, world.tamed)}
          slots={rewards.victory ? lootSlots(rewards) : []}
          onConfirm={finish}
          onRetry={world.encounter?.mine ? undefined : retry}
        />
      ) : null}
    </BattleWorldFrame>
  );
}

function expMembers(
  battle: BattleState,
  rewards: BattleRewards,
  level: number,
  exp: number,
  tamed: { id: string; level: number; exp: number }[],
): ExpMember[] {
  const members: ExpMember[] = [
    {
      id: 'player',
      name: battle.player.name || 'Bạn',
      level,
      exp,
      gain: rewards.exp,
    },
  ];
  for (const pet of rewards.pets) {
    if (pet.exp <= 0) continue;
    const saved = tamed.find((monster) => monster.id === pet.id);
    const ally = battle.allies.find((fighter) => fighter.id === `ally-${pet.id}`);
    members.push({
      id: pet.id,
      name: pet.name,
      level: saved?.level ?? ally?.level ?? 1,
      exp: saved?.exp ?? ally?.exp ?? 0,
      gain: pet.exp,
    });
  }
  return members;
}

function lootSlots(rewards: BattleRewards): LootSlot[] {
  const slots: LootSlot[] = [];
  if (rewards.gold > 0) slots.push({ id: 'gold', label: 'Vàng', detail: `+${rewards.gold}`, tint: '#e4c27a' });
  for (const drop of rewards.drops) {
    slots.push({
      id: `${drop.itemId}-${slots.length}`,
      label: lootLabel(drop.itemId),
      detail: drop.itemId === 'banana' || drop.itemId === 'grape' || drop.itemId === 'apple' ? ITEMS[drop.itemId].nameVi : `×${drop.qty}`,
      tint: ITEMS[drop.itemId].tint,
    });
  }
  return slots;
}

function lootLabel(itemId: string): string {
  if (itemId.startsWith('hp-potion')) return 'Bình máu';
  if (itemId.startsWith('mana-potion')) return 'Bình mana';
  if (itemId === 'banana' || itemId === 'grape' || itemId === 'apple') return 'Thức ăn';
  return 'Vật phẩm';
}

function floatAnchor(
  fighterId: string,
  playerId: string,
  allies: { id: string }[],
  foes: { id: string }[],
  foot: (cell: string) => { x: number; y: number },
  petCells: string[],
  foeCells: string[],
  s: (value: number) => number,
  densePack: boolean,
): { x: number; y: number } | null {
  if (fighterId === playerId) {
    const slot = foot(BATTLE_GRID_POSITIONS.player);
    return { x: slot.x, y: slot.y - s(118) - s(36) };
  }
  const allyIndex = allies.findIndex((fighter) => fighter.id === fighterId);
  if (allyIndex >= 0) {
    const slot = foot(petCells[allyIndex] ?? petCells[0]);
    const size = Math.round(s(64) * 0.8);
    return { x: slot.x, y: slot.y - size - s(36) };
  }
  const foeIndex = foes.findIndex((fighter) => fighter.id === fighterId);
  if (foeIndex >= 0) {
    const slot = foot(foeCells[foeIndex] ?? foeCells[0]);
    const size = Math.round((densePack ? s(56) : s(64)) * 0.8);
    return { x: slot.x, y: slot.y - size - s(32) };
  }
  return null;
}

function isBoar(card: Encounter): boolean {
  return /boar/i.test(card.kindId ?? '') || /heo/i.test(card.name);
}

function fieldFoes(encounter: Encounter): Encounter[] {
  if (encounter.mine) {
    const cards = (encounter.pool?.length ? encounter.pool : [encounter]).map((card) => ({ ...card, pool: undefined }));
    return encounter.solo ? cards.slice(0, 1) : cards;
  }
  if (encounter.solo) return roster(encounter);
  const cards = roster(encounter);
  const lead = cards[0];
  if (!lead || !isBoar(lead)) return cards.slice(0, 3);
  while (cards.length < 6) {
    const base = cards[cards.length - 1];
    cards.push({ ...base, id: `${base.id}-pack-${cards.length}`, name: `${base.name} ${cards.length + 1}` });
  }
  return cards.slice(0, 6);
}

function roster(encounter: Encounter): Encounter[] {
  const source = encounter.pool?.length ? encounter.pool : [encounter];
  const cards = source.map((card) => ({ ...card, pool: undefined }));
  if (encounter.solo) return cards.slice(0, 1);
  while (cards.length < 3) {
    const base = cards[cards.length - 1];
    cards.push({ ...base, id: `${base.id}-pack-${cards.length}`, name: `${base.name} ${cards.length + 1}` });
  }
  return cards.slice(0, 6);
}


function rawId(id: string): string {
  return id.replace(/^ally-/, '');
}

function shortItem(itemId: ItemId): string {
  if (itemId.startsWith('hp-potion')) return 'Máu';
  if (itemId.startsWith('mana-potion')) return 'Mana';
  if (itemId === 'antidote') return 'Độc';
  if (itemId.startsWith('stamina-potion')) return 'Lực';
  return 'Bánh';
}

function approachTarget(state: BattleState, focusId: string | null): string | null {
  const actor = fighterById(state, state.turnId);
  if (!actor || actor.hp <= 0) return null;
  if (actor.side === 'wild') {
    const friends = [state.player, ...state.allies].filter((fighter) => fighter.hp > 0);
    friends.sort((a, b) => a.hp / Math.max(1, a.maxHp) - b.hp / Math.max(1, b.maxHp) || a.id.localeCompare(b.id));
    return friends[0]?.id ?? null;
  }
  const marked = state.foes.find((fighter) => fighter.id === focusId && fighter.hp > 0);
  return marked?.id ?? state.foes.find((fighter) => fighter.hp > 0)?.id ?? null;
}

function fighterById(state: BattleState, id: string): Fighter | undefined {
  if (state.player.id === id) return state.player;
  return state.allies.find((entry) => entry.id === id) ?? state.foes.find((entry) => entry.id === id);
}

function lostHp(before: BattleState, after: BattleState): { id: string; hp: number }[] {
  const hits: { id: string; hp: number }[] = [];
  const watch = (prev: Fighter | undefined, next: Fighter) => {
    if (!prev || next.hp >= prev.hp) return;
    hits.push({ id: next.id, hp: next.hp });
  };
  watch(before.player, after.player);
  for (const ally of after.allies) watch(before.allies.find((entry) => entry.id === ally.id), ally);
  for (const foe of after.foes) watch(before.foes.find((entry) => entry.id === foe.id), foe);
  return hits;
}

function battleCell(id: string, state: BattleState): string | null {
  if (id === state.player.id) return BATTLE_GRID_POSITIONS.player;
  const allyIndex = state.allies.findIndex((entry) => entry.id === id);
  if (allyIndex >= 0) return allySpawnCell(allyIndex);
  const foeIndex = state.foes.findIndex((entry) => entry.id === id);
  if (foeIndex < 0) return null;
  return enemySpawnCell(foeIndex);
}

function countNets(bag: { itemId?: string; qty?: number }[] | null | undefined): number {
  if (!Array.isArray(bag)) return 0;
  const stack = bag.find((entry) => entry?.itemId === 'net');
  const qty = stack?.qty;
  return typeof qty === 'number' && Number.isFinite(qty) ? Math.max(0, Math.floor(qty)) : 0;
}
