import { finalDamage, type DamageResult } from './combat/damage';
import { combatElement, type ElementId } from './combat/elements';
import { applyMastery, classCatalog, heroTraits, masteryOf, monsterCatalog, resolvePetLoadout, rollHeroKit, rollMonsterKit } from './combat/kits';
import type { Skill } from './combat/model';
import { turnOrder } from './combat/order';
import { monsterMana, professionPools } from './growth';
import { ITEMS, applyConsumable, removeOne } from './items';
import { expFromMonster } from './progression';
import type { Encounter, ItemId, Stack, Vitals } from './types';

export type { Skill };
export { applyMastery, masteryOf, rollHeroKit, rollMonsterKit };

export type Fighter = {
  id: string;
  name: string;
  side: 'player' | 'ally' | 'wild';
  kindId: string;
  level: number;
  tint: string;
  elite: boolean;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
  element: ElementId;
  /** The basic attack used in this fight. Heroes choose it before battle. */
  basic: Skill;
  /** Class basics offered on the setup screen. Monsters keep the one they rolled. */
  basics: Skill[];
  /** Active skills. Heroes and monsters both carry exactly two. */
  skills: Skill[];
  /** Hero leadership. Allies and wild fighters leave this at 0 and false. */
  mastery: number;
  initiative: boolean;
  cooldowns: Record<string, number>;
  /** Present on a captured ally. Wild fighters do not carry collection exp. */
  exp?: number;
};

export type TamedMonster = {
  id: string;
  kindId: string;
  name: string;
  level: number;
  exp: number;
  tint: string;
  maxHp: number;
  maxMp: number;
  /** Current pools. Fruits raise these after a fight. Missing values mean full. */
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  speed: number;
  /** Chosen in Kỹ Năng. Missing values use the roll from this monster's id. */
  basicId?: string;
  skillIds?: string[];
};

export type BattleDrop = { itemId: ItemId; qty: number };

export type PetProgress = {
  id: string;
  name: string;
  exp: number;
  hp: number;
  mp: number;
};

export type BattleRewards = {
  victory: boolean;
  exp: number;
  gold: number;
  drops: BattleDrop[];
  pets: PetProgress[];
};

export type BattleResult = {
  vitals: Vitals;
  bag: Stack[];
  exp: number;
  gold: number;
  tamed: TamedMonster[];
  notice: string;
  victory: boolean;
  petExp: { id: string; exp: number; hp: number; mp: number }[];
  drops: BattleDrop[];
};

/** Four equal zones. Each stop adds its bonus. Three green stops are +30%. */
export const TAMING_ZONES = [
  { id: 'red', label: 'Đỏ', bonus: 2.5, color: '#d4534a', from: 0, to: 0.25 },
  { id: 'orange', label: 'Cam', bonus: 5, color: '#e08a3c', from: 0.25, to: 0.5 },
  { id: 'yellow', label: 'Vàng', bonus: 7.5, color: '#e4c27a', from: 0.5, to: 0.75 },
  { id: 'green', label: 'Lục', bonus: 10, color: '#6fbf73', from: 0.75, to: 1 },
] as const;

export function classBasics(professionId: string | undefined): Skill[] {
  return rollHeroKit(professionId).basics;
}

export function classSkills(professionId: string | undefined, _level = 1): Skill[] {
  return rollHeroKit(professionId).skills;
}

export function wildBasic(kindId: string, seed = kindId): Skill {
  return rollMonsterKit(kindId, seed).basic;
}

export function wildSkills(kindId: string, _level = 1, seed = kindId): Skill[] {
  return rollMonsterKit(kindId, seed).skills;
}

/** Heal skills use power 0 and restore a slice of max HP instead of dealing damage. */
export function isHeal(skill: Skill): boolean {
  return skill.power <= 0;
}

export function healAmount(maxHp: number): number {
  return Math.max(8, Math.round(maxHp * 0.22));
}

/**
 * A wild foe at 5% health or less adds 5%. Three green stops add 30%.
 * Together that is the 35% ceiling.
 */
export function captureChance(hp: number, maxHp: number, bonuses: number[]): number {
  const list = Array.isArray(bonuses) ? bonuses : [];
  const low = maxHp > 0 && hp / maxHp <= 0.05 ? 5 : 0;
  const rhythm = list.reduce((sum, bonus) => sum + (Number.isFinite(bonus) ? bonus : 0), 0);
  return Math.min(35, Math.max(0, low + rhythm));
}

export function zoneAt(position: number): (typeof TAMING_ZONES)[number] {
  const raw = Number.isFinite(position) ? position : 0;
  const clamped = Math.min(0.999, Math.max(0, raw));
  return TAMING_ZONES.find((zone) => clamped >= zone.from && clamped < zone.to) ?? TAMING_ZONES[TAMING_ZONES.length - 1];
}

export function tickCooldowns(fighter: Fighter): Fighter {
  const cooldowns: Record<string, number> = {};
  for (const [id, left] of Object.entries(fighter.cooldowns)) {
    if (left > 1) cooldowns[id] = left - 1;
  }
  return { ...fighter, cooldowns };
}

export function skillReady(fighter: Fighter, skill: Skill): boolean {
  return fighter.mp >= skill.mana && (fighter.cooldowns[skill.id] ?? 0) <= 0;
}

export const COMBAT_ITEMS: ItemId[] = ['hp-potion', 'mana-potion', 'antidote', 'stamina-potion', 'ration'];
/** Brought from the squad screen. Other consumables stay in the bag. */
export const SQUAD_ITEMS: ItemId[] = ['hp-potion', 'mana-potion', 'antidote'];

/**
 * `allies` are Pets: tamed units fighting on the player team.
 * `foes` are Monsters / Quái: wild units on the enemy team.
 * A captured monster is stored in `tamed` and becomes a pet only after the squad picks it.
 */
export type BattleState = {
  player: Fighter;
  allies: Fighter[];
  foes: Fighter[];
  bag: Stack[];
  stamina: number;
  maxStamina: number;
  order: string[];
  /** Round 1 puts an initiative hero first. Later rounds sort by speed only. */
  round: number;
  turnId: string;
  log: string;
  over: 'win' | 'lose' | null;
  tamed: TamedMonster[];
};

export function makePlayer(input: {
  name: string;
  professionId: string | undefined;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  /** Basic attack chosen on the pre-battle screen. Defaults to the first class basic. */
  basicId?: string;
  /** Two class skills equipped in Kỹ Năng. A missing pair uses the hero roll. */
  skillIds?: string[];
}): Fighter {
  const pace = professionPools(input.professionId, input.level);
  const traits = heroTraits(input.professionId);
  const catalog = classCatalog(input.professionId);
  const kit = rollHeroKit(input.professionId, input.name);
  const basic = catalog.basics.find((skill) => skill.id === input.basicId) ?? catalog.basics[0];
  const equipped = (input.skillIds ?? [])
    .map((id) => catalog.skills.find((skill) => skill.id === id))
    .filter((skill): skill is Skill => Boolean(skill));
  const skills = equipped.length === 2 ? equipped : kit.skills;
  return {
    id: 'player',
    name: input.name,
    side: 'player',
    kindId: input.professionId ?? 'wanderer',
    level: input.level,
    tint: '#e4c27a',
    elite: false,
    hp: input.hp,
    maxHp: input.maxHp,
    mp: input.mp,
    maxMp: input.maxMp,
    attack: input.attack,
    defense: input.defense,
    speed: pace.speed,
    critRate: traits.critRate,
    critDamage: traits.critDamage,
    element: traits.element,
    basic,
    basics: catalog.basics,
    skills,
    mastery: traits.mastery,
    initiative: traits.initiative,
    cooldowns: {},
  };
}

/** Monster / Quái fighter for the enemy team. */
export function makeWild(card: Encounter): Fighter {
  const kindId = card.kindId ?? card.id;
  const maxMp = monsterMana(kindId, card.level);
  const kit = rollMonsterKit(kindId, card.id);
  return {
    id: card.id,
    name: card.name,
    side: 'wild',
    kindId,
    level: card.level,
    tint: card.tint,
    elite: Boolean(card.elite),
    hp: card.maxHp,
    maxHp: card.maxHp,
    mp: maxMp,
    maxMp,
    attack: card.attack,
    defense: card.defense,
    speed: card.speed ?? 46 + card.level,
    critRate: card.elite ? 0.12 : 0.08,
    critDamage: 1.5,
    element: combatElement(kindId),
    basic: kit.basic,
    basics: [kit.basic],
    skills: kit.skills,
    mastery: 0,
    initiative: false,
    cooldowns: {},
  };
}

/** Pet fighter for the player team, built from a captured monster. */
export function makeAlly(monster: TamedMonster): Fighter {
  const level = monster.level;
  const maxHp = monster.maxHp || 22 + level * 6;
  const maxMp = monster.maxMp || monsterMana(monster.kindId, level);
  const kit = rollMonsterKit(monster.kindId, monster.id);
  const loadout = resolvePetLoadout(monster);
  const petCatalog = monsterCatalog(monster.kindId);
  const basic = petCatalog.basics.find((skill) => skill.id === loadout.basicId) ?? kit.basic;
  const skills = loadout.skillIds
    .map((id) => petCatalog.skills.find((skill) => skill.id === id))
    .filter((skill): skill is Skill => Boolean(skill));
  return {
    id: `ally-${monster.id}`,
    name: monster.name,
    side: 'ally',
    kindId: monster.kindId,
    level,
    tint: monster.tint,
    elite: false,
    hp: monster.hp || maxHp,
    maxHp,
    mp: monster.mp || maxMp,
    maxMp,
    attack: monster.attack || 6 + level,
    defense: monster.defense || 1,
    speed: monster.speed || 48 + level,
    exp: monster.exp,
    critRate: 0.08,
    critDamage: 1.5,
    element: combatElement(monster.kindId),
    basic,
    basics: [basic],
    skills: skills.length === 2 ? skills : kit.skills,
    mastery: 0,
    initiative: false,
    cooldowns: {},
  };
}

export function startBattle(
  player: Fighter,
  allies: Fighter[],
  foes: Fighter[],
  bag: Stack[],
  stamina: number,
  maxStamina: number,
): BattleState {
  const round = 1;
  const order = turnOrder([player, ...allies, ...foes], round);
  return {
    player,
    allies,
    foes,
    bag,
    stamina,
    maxStamina,
    order,
    round,
    turnId: order[0] ?? 'player',
    log: 'Chọn mục tiêu, chọn đòn, rồi xác nhận.',
    over: null,
    tamed: [],
  };
}

export function actBasic(state: BattleState, foeId: string): BattleState {
  return strikeFoe(state, foeId, null);
}

export function actSkill(state: BattleState, foeId: string | null, skillId: string): BattleState {
  return strikeFoe(state, foeId, skillId);
}

/** The pet whose turn it is. Manual play waits for this; auto battle calls it itself. */
export function actAlly(state: BattleState, foeId: string | null, skillId: string | null): BattleState {
  if (state.over) return state;
  const actor = unit(state, state.turnId);
  if (!actor || actor.side !== 'ally' || actor.hp <= 0) return state;
  let ready = tickCooldowns(actor);
  const skill = skillId ? ready.skills.find((entry) => entry.id === skillId) ?? null : null;
  if (skillId && !skill) return state;
  if (skill && !skillReady(ready, skill)) return { ...state, log: `${skill.name} chưa sẵn sàng.` };
  if (skill) {
    ready = {
      ...ready,
      mp: ready.mp - skill.mana,
      cooldowns: { ...ready.cooldowns, [skill.id]: skill.cooldown },
    };
  }
  if (skill && isHeal(skill)) {
    const amount = healAmount(ready.maxHp);
    ready = { ...ready, hp: Math.min(ready.maxHp, ready.hp + amount) };
    return after(replace(state, ready), ready.id, `${ready.name} dùng ${skill.name}, hồi ${amount} máu.`);
  }
  const foe = state.foes.find((entry) => entry.id === foeId && entry.hp > 0);
  if (!foe) return { ...state, log: 'Hãy chọn một quái còn sống.' };
  const hit = deal(ready, foe, skill ? skill.power : ready.basic.power);
  const hurt = { ...foe, hp: Math.max(0, foe.hp - hit.damage) };
  const name = skill ? skill.name : ready.basic.name;
  return after(replace(replace(state, ready), hurt), ready.id, `${ready.name} dùng ${name}, gây ${hitText(hit)} sát thương lên ${foe.name}.`);
}

export function actItem(state: BattleState, itemId: ItemId): BattleState {
  if (!isPlayerTurn(state)) return state;
  const stack = state.bag.find((entry) => entry.itemId === itemId);
  if (!stack) return { ...state, log: 'Hết vật phẩm này.' };
  const healed = applyConsumable(toVitals(state), itemId);
  if (!healed) return { ...state, log: 'Vật phẩm không còn tác dụng.' };
  const bag = state.bag.flatMap((entry) => {
    if (entry.itemId !== itemId) return [entry];
    if (entry.qty <= 1) return [];
    return [{ ...entry, qty: entry.qty - 1 }];
  });
  const player = tickCooldowns({
    ...state.player,
    hp: healed.hp,
    mp: healed.mana,
  });
  return after({ ...state, player, bag, stamina: healed.stamina }, 'player', `Dùng ${ITEMS[itemId].nameVi}.`);
}

export function actTame(state: BattleState, foeId: string, bonuses: number[], roll: number): BattleState {
  if (!state || !isPlayerTurn(state) || !foeId) return state;
  const foe = state.foes.find((entry) => entry.id === foeId && entry.hp > 0);
  if (!foe) return state;
  const bag = removeOne(state.bag, 'net');
  if (!bag) return { ...state, log: 'Hết lưới.' };
  const bonusList = Array.isArray(bonuses) ? bonuses.filter((bonus) => Number.isFinite(bonus)) : [];
  const chance = captureChance(foe.hp, foe.maxHp, bonusList);
  const player = tickCooldowns(state.player);
  const safeRoll = Number.isFinite(roll) ? roll : 1;
  if (safeRoll * 100 >= chance) {
    const hit = deal(foe, player, foe.basic?.power ?? 0);
    const penalty = Math.floor(hit.damage / 2);
    const hurt = { ...player, hp: Math.max(0, player.hp - penalty) };
    return after(
      { ...state, player: hurt, bag },
      'player',
      `Thu phục thất bại (${chance}%). ${foe.name} đánh thường, gây ${penalty} sát thương lên ${player.name}.`,
    );
  }
  const tamed: TamedMonster = {
    id: foe.id,
    kindId: foe.kindId,
    name: foe.name,
    level: foe.level,
    exp: 0,
    tint: foe.tint,
    maxHp: foe.maxHp,
    maxMp: foe.maxMp,
    hp: Math.max(1, foe.hp),
    mp: foe.mp,
    attack: foe.attack,
    defense: foe.defense,
    speed: foe.speed,
  };
  const foes = state.foes.map((entry) => (entry.id === foe.id ? { ...entry, hp: 0 } : entry));
  return after(
    { ...state, player, foes, bag, tamed: [...state.tamed, tamed] },
    'player',
    `Đã thu phục ${foe.name} (${chance}%).`,
  );
}

/**
 * Wild turns, and ally turns only when auto battle asked for them.
 * A manual pet turn stays put until `actAlly`.
 */
export function actAuto(state: BattleState, allowAlly = false): BattleState {
  if (state.over || state.turnId === 'player') return state;
  const actor = unit(state, state.turnId);
  if (!actor || actor.hp <= 0) return after(state, state.turnId, state.log);
  if (actor.side === 'ally' && !allowAlly) return state;
  if (actor.side !== 'wild' && actor.side !== 'ally') return state;
  const ready = tickCooldowns(actor);
  const skill = [...ready.skills].filter((entry) => entry.power > 0 && skillReady(ready, entry)).sort((a, b) => b.power - a.power)[0];
  const spent = skill
    ? { ...ready, mp: ready.mp - skill.mana, cooldowns: { ...ready.cooldowns, [skill.id]: skill.cooldown } }
    : ready;
  const pool = actor.side === 'wild' ? friendlies(state) : state.foes;
  const target = weakest(pool);
  if (!target) return after(replace(state, spent), spent.id, state.log);
  const hit = deal(spent, target, skill ? skill.power : spent.basic.power);
  const hurt = { ...target, hp: Math.max(0, target.hp - hit.damage) };
  const name = skill ? skill.name : spent.basic.name;
  return after(replace(replace(state, spent), hurt), spent.id, `${spent.name} dùng ${name}, gây ${hitText(hit)} sát thương lên ${target.name}.`);
}

/** Auto-battle for the player: heal when low, otherwise the strongest ready skill. */
export function actAutoPlayer(state: BattleState, foeId: string | null): BattleState {
  if (!isPlayerTurn(state)) return state;
  const ready = tickCooldowns(state.player);
  if (ready.maxHp > 0 && ready.hp / ready.maxHp <= 0.45) {
    const heal = ready.skills.find((skill) => isHeal(skill) && skillReady(ready, skill));
    if (heal) return actSkill(state, null, heal.id);
  }
  const foe = state.foes.find((entry) => entry.id === foeId && entry.hp > 0) ?? weakest(state.foes);
  if (!foe) return state;
  const skill = [...ready.skills].filter((entry) => entry.power > 0 && skillReady(ready, entry)).sort((a, b) => b.power - a.power)[0];
  if (skill) return actSkill(state, foe.id, skill.id);
  return actBasic(state, foe.id);
}

const PET_FOOD: ItemId[] = ['berry', 'mana-fruit', 'hearty-fruit'];
/** Share of a lost fight's experience handed back to the party. */
const CONSOLATION = 0.35;

function rollIndex(rng: () => number, length: number): number {
  const raw = rng();
  const roll = Number.isFinite(raw) ? Math.min(0.999, Math.max(0, raw)) : 0;
  return Math.min(length - 1, Math.floor(roll * length));
}

function foeReward(state: BattleState, defeatedOnly: boolean): { exp: number; gold: number } {
  let exp = 0;
  let gold = 0;
  for (const foe of state.foes) {
    if (defeatedOnly && foe.hp > 0) continue;
    const tamed = state.tamed.some((entry) => entry.id === foe.id);
    const full = expFromMonster(foe.level, foe.elite);
    exp += defeatedOnly && tamed ? Math.round(full / 2) : full;
    if (defeatedOnly) gold += tamed ? 2 + foe.level : 4 + foe.level * 2;
  }
  return { exp, gold };
}

function collectionId(id: string): string {
  return id.startsWith('ally-') ? id.slice('ally-'.length) : id;
}

/**
 * Win: the player and every surviving pet earn the fight's experience, plus
 * gold and at least one item from thuốc máu, thuốc mana, or thức ăn quái.
 * Loss: the player and every pet that entered earn a smaller consolation.
 */
export function battleRewards(state: BattleState, rng: () => number = Math.random): BattleRewards {
  const victory = state.over === 'win';
  const defeated = foeReward(state, true);
  const field = foeReward(state, false);
  const exp = victory ? Math.max(1, defeated.exp) : Math.max(1, Math.round(field.exp * CONSOLATION));
  const pets = state.allies.map((ally) => ({
    id: collectionId(ally.id),
    name: ally.name,
    exp: victory && ally.hp <= 0 ? 0 : exp,
    hp: Math.max(0, ally.hp),
    mp: Math.max(0, ally.mp),
  }));
  if (!victory) return { victory: false, exp, gold: 0, drops: [], pets };
  const food = PET_FOOD[rollIndex(rng, PET_FOOD.length)];
  const pool: ItemId[] = ['hp-potion', 'mana-potion', food];
  const first = pool[rollIndex(rng, pool.length)];
  const drops: BattleDrop[] = [{ itemId: first, qty: 1 }];
  const rest = pool.filter((itemId) => itemId !== first);
  if (rest.length > 0 && rng() < 0.4) drops.push({ itemId: rest[rollIndex(rng, rest.length)], qty: 1 });
  return { victory: true, exp, gold: Math.max(1, defeated.gold), drops, pets };
}

export function battleVitals(state: BattleState, maxHp: number, maxMana: number): Vitals {
  return {
    hp: state.player.hp,
    maxHp,
    mana: state.player.mp,
    maxMana,
    stamina: state.stamina,
    maxStamina: state.maxStamina,
  };
}

function strikeFoe(state: BattleState, foeId: string | null, skillId: string | null): BattleState {
  if (!isPlayerTurn(state)) return state;
  let player = tickCooldowns(state.player);
  const skill = skillId ? player.skills.find((entry) => entry.id === skillId) ?? null : null;
  if (skillId && !skill) return state;
  if (skill && !skillReady(player, skill)) return { ...state, log: `${skill.name} chưa sẵn sàng.` };
  if (skill) {
    player = {
      ...player,
      mp: player.mp - skill.mana,
      cooldowns: { ...player.cooldowns, [skill.id]: skill.cooldown },
    };
  }
  if (skill && isHeal(skill)) {
    const amount = healAmount(player.maxHp);
    player = { ...player, hp: Math.min(player.maxHp, player.hp + amount) };
    return after({ ...state, player }, 'player', `${skill.name} hồi ${amount} máu.`);
  }
  const foe = state.foes.find((entry) => entry.id === foeId && entry.hp > 0);
  if (!foe) return { ...state, log: 'Hãy chọn một quái còn sống.' };
  const hit = deal(player, foe, skill ? skill.power : player.basic.power);
  const foes = state.foes.map((entry) => (entry.id === foe.id ? { ...entry, hp: Math.max(0, entry.hp - hit.damage) } : entry));
  const label = skill ? skill.name : player.basic.name;
  return after({ ...state, player, foes }, 'player', `${label} gây ${hitText(hit)} sát thương lên ${foe.name}.`);
}

function isPlayerTurn(state: BattleState): boolean {
  return !state.over && state.turnId === 'player';
}

function toVitals(state: BattleState): Vitals {
  return {
    hp: state.player.hp,
    maxHp: state.player.maxHp,
    mana: state.player.mp,
    maxMana: state.player.maxMp,
    stamina: state.stamina,
    maxStamina: state.maxStamina,
  };
}

function unit(state: BattleState, id: string): Fighter | undefined {
  if (state.player.id === id) return state.player;
  return state.allies.find((entry) => entry.id === id) ?? state.foes.find((entry) => entry.id === id);
}

function replace(state: BattleState, fighter: Fighter): BattleState {
  if (fighter.id === state.player.id) return { ...state, player: fighter };
  if (fighter.side === 'ally') return { ...state, allies: state.allies.map((entry) => (entry.id === fighter.id ? fighter : entry)) };
  return { ...state, foes: state.foes.map((entry) => (entry.id === fighter.id ? fighter : entry)) };
}

function friendlies(state: BattleState): Fighter[] {
  return [state.player, ...state.allies];
}

function weakest(fighters: Fighter[]): Fighter | undefined {
  return fighters
    .filter((fighter) => fighter.hp > 0)
    .sort((a, b) => a.hp / Math.max(1, a.maxHp) - b.hp / Math.max(1, b.maxHp) || a.id.localeCompare(b.id))[0];
}

function deal(attacker: Fighter, defender: Fighter, multiplier: number): DamageResult {
  return finalDamage({
    attack: attacker.attack,
    multiplier,
    critRate: attacker.critRate,
    critDamage: attacker.critDamage,
    attackerElement: attacker.element,
    defenderElement: defender.element,
    defense: defender.defense,
    critRoll: Math.random(),
  });
}

function hitText(hit: DamageResult): string {
  const notes: string[] = [];
  if (hit.crit) notes.push('chí mạng');
  if (hit.element === 2) notes.push('khắc hệ');
  if (hit.element === 0.5) notes.push('bị kháng');
  const suffix = notes.length ? ` (${notes.join(', ')})` : '';
  return `${hit.damage}${suffix}`;
}

function everyone(state: BattleState): Fighter[] {
  return [state.player, ...state.allies, ...state.foes];
}

function after(state: BattleState, actedId: string, log: string): BattleState {
  const next = { ...state, log };
  const friends = friendlies(next).some((fighter) => fighter.hp > 0);
  if (!friends) return { ...next, over: 'lose' };
  if (next.foes.every((foe) => foe.hp <= 0)) return { ...next, over: 'win' };
  const start = next.order.indexOf(actedId);
  if (start >= 0) {
    for (let step = start + 1; step < next.order.length; step += 1) {
      const fighter = unit(next, next.order[step]);
      if (fighter && fighter.hp > 0) return { ...next, turnId: fighter.id };
    }
  }
  const round = next.round + 1;
  const order = turnOrder(everyone(next), round);
  return { ...next, round, order, turnId: order[0] ?? next.turnId };
}
