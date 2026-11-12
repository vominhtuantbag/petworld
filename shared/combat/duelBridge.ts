/**
 * Adapts arena/raid unit arrays into the PvE EffectBattleState shape so
 * castSkill / status / damage run identically to local adventure combat.
 */

import type { StatusEntry } from './advanced.js';
import { combatElement, type ElementId } from './elements.js';
import {
  applyMastery,
  classCatalog,
  heroTraits,
  monsterCatalog,
  resolveHeroLoadout,
  resolvePetLoadout,
  rollMonsterKit,
  type HeroSkillLoadout,
} from './kits.js';
import { executeCombatAction } from './executeCombatAction.js';
import type { Skill, StatMod } from './model.js';
import { type EffectBattleState, type EffectFighter } from './skillEffects.js';

export type DuelSkillCard = Skill;

export type DuelCombatUnit = {
  id: string;
  ownerId: string | null;
  name: string;
  kind: 'hero' | 'pet' | 'monster' | 'boss';
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  initiative?: boolean;
  kindId?: string;
  element: ElementId;
  basic: Skill;
  skills: [Skill, Skill];
  cooldowns: Record<string, number>;
  tgh: number;
  maxTgh: number;
  armPen: number;
  res: number;
  critRate: number;
  critDamage: number;
  eva: number;
  acc: number;
  staggered?: boolean;
  statuses?: StatusEntry[];
  mods?: StatMod[];
  shieldHp?: number;
  damageTaken?: number;
  stealthTurns?: number;
  tauntTurns?: number;
  guardTargetId?: string;
  guardAbsorb?: number;
  guardTurns?: number;
  chargedPower?: number;
  chargedTrue?: boolean;
  reflectCharges?: number;
  reflectPct?: number;
  critBlockTurns?: number;
  extraTurns?: number;
  mpCostMult?: number;
  nextAttackBoost?: number;
  magicReducePct?: number;
  magicReduceTurns?: number;
  meleeThornsPct?: number;
  meleeThornsTurns?: number;
  meleeThornsBurn?: boolean;
  trapTurns?: number;
  trapPct?: number;
  delayed?: boolean;
  enraged?: boolean;
  endureUsed?: boolean;
};

export type DuelCastAction = 'attack' | 'skill' | 'defend';

export type DuelCastResult = {
  units: DuelCombatUnit[];
  log: string;
  lastHit: {
    attackerId: string;
    targetId: string;
    damage: number;
    crit: boolean;
    miss: boolean;
    skillName?: string;
  } | null;
  skipped?: boolean;
};

/** Build hero skills from profession + optional saved loadout (same as PvE). */
export function heroLoadoutSkills(
  professionId: string | undefined,
  saved: HeroSkillLoadout | null | undefined,
  seed?: string,
): { basic: Skill; skills: [Skill, Skill]; element: ElementId } {
  const loadout = resolveHeroLoadout(saved, professionId, seed);
  const catalog = classCatalog(loadout.professionId);
  const basic = catalog.basics.find((skill) => skill.id === loadout.basicId) ?? catalog.basics[0];
  const skills = loadout.skillIds
    .map((id) => catalog.skills.find((skill) => skill.id === id))
    .filter((skill): skill is Skill => Boolean(skill));
  const pair: [Skill, Skill] =
    skills.length >= 2 ? [skills[0], skills[1]] : [catalog.skills[0], catalog.skills[1]];
  return { basic, skills: pair, element: heroTraits(loadout.professionId).element };
}

/** Build pet skills from kindId + optional saved ids (same as PvE). */
export function petLoadoutSkills(
  kindId: string,
  seed: string,
  saved?: { basicId?: string; skillIds?: string[] },
): { basic: Skill; skills: [Skill, Skill]; element: ElementId } {
  const kit = rollMonsterKit(kindId, seed);
  const loadout = resolvePetLoadout({ id: seed, kindId, basicId: saved?.basicId, skillIds: saved?.skillIds });
  const catalog = monsterCatalog(kindId);
  const basic = catalog.basics.find((skill) => skill.id === loadout.basicId) ?? kit.basic;
  const skills = loadout.skillIds
    .map((id) => catalog.skills.find((skill) => skill.id === id))
    .filter((skill): skill is Skill => Boolean(skill));
  const pair: [Skill, Skill] = skills.length >= 2 ? [skills[0], skills[1]] : [kit.skills[0], kit.skills[1]];
  return { basic, skills: pair, element: combatElement(kindId) };
}

export function applyOwnerMastery(units: DuelCombatUnit[], ownerId: string, professionId: string | undefined): DuelCombatUnit[] {
  const mastery = masteryOfSafe(professionId);
  if (mastery <= 0) return units;
  return units.map((unit) => {
    if (unit.ownerId !== ownerId || unit.kind !== 'pet') return unit;
    const buffed = applyMastery(unit, mastery);
    return { ...unit, attack: buffed.attack, defense: buffed.defense };
  });
}

function masteryOfSafe(professionId: string | undefined): number {
  try {
    return heroTraits(professionId).mastery;
  } catch {
    return 0;
  }
}

function toFighter(unit: DuelCombatUnit, side: EffectFighter['side']): EffectFighter {
  return {
    id: unit.id,
    name: unit.name,
    side,
    hp: unit.hp,
    maxHp: unit.maxHp,
    mp: unit.mp,
    maxMp: unit.maxMp,
    attack: unit.attack,
    defense: unit.defense,
    speed: unit.speed,
    critRate: unit.critRate,
    critDamage: unit.critDamage,
    element: unit.element,
    tgh: unit.tgh,
    maxTgh: unit.maxTgh,
    armPen: unit.armPen,
    res: unit.res,
    eva: unit.eva,
    acc: unit.acc,
    staggered: unit.staggered,
    statuses: unit.statuses,
    mods: unit.mods,
    shieldHp: unit.shieldHp,
    damageTaken: unit.damageTaken,
    stealthTurns: unit.stealthTurns,
    tauntTurns: unit.tauntTurns,
    guardTargetId: unit.guardTargetId,
    guardAbsorb: unit.guardAbsorb,
    guardTurns: unit.guardTurns,
    chargedPower: unit.chargedPower,
    chargedTrue: unit.chargedTrue,
    reflectCharges: unit.reflectCharges,
    reflectPct: unit.reflectPct,
    critBlockTurns: unit.critBlockTurns,
    extraTurns: unit.extraTurns,
    mpCostMult: unit.mpCostMult,
    nextAttackBoost: unit.nextAttackBoost,
    magicReducePct: unit.magicReducePct,
    magicReduceTurns: unit.magicReduceTurns,
    meleeThornsPct: unit.meleeThornsPct,
    meleeThornsTurns: unit.meleeThornsTurns,
    meleeThornsBurn: unit.meleeThornsBurn,
    trapTurns: unit.trapTurns,
    trapPct: unit.trapPct,
    delayed: unit.delayed,
    enraged: unit.enraged,
    endureUsed: unit.endureUsed,
    basic: unit.basic,
    skills: [...unit.skills],
    cooldowns: { ...unit.cooldowns },
  };
}

function fromFighter(fighter: EffectFighter, previous: DuelCombatUnit): DuelCombatUnit {
  return {
    ...previous,
    hp: fighter.hp,
    maxHp: fighter.maxHp,
    mp: fighter.mp,
    maxMp: fighter.maxMp,
    attack: fighter.attack,
    defense: fighter.defense,
    speed: fighter.speed,
    critRate: fighter.critRate,
    critDamage: fighter.critDamage,
    element: fighter.element,
    tgh: fighter.tgh,
    maxTgh: fighter.maxTgh,
    armPen: fighter.armPen,
    res: fighter.res,
    eva: fighter.eva,
    acc: fighter.acc,
    staggered: fighter.staggered,
    statuses: fighter.statuses,
    mods: fighter.mods,
    shieldHp: fighter.shieldHp,
    damageTaken: fighter.damageTaken,
    stealthTurns: fighter.stealthTurns,
    tauntTurns: fighter.tauntTurns,
    guardTargetId: fighter.guardTargetId,
    guardAbsorb: fighter.guardAbsorb,
    guardTurns: fighter.guardTurns,
    chargedPower: fighter.chargedPower,
    chargedTrue: fighter.chargedTrue,
    reflectCharges: fighter.reflectCharges,
    reflectPct: fighter.reflectPct,
    critBlockTurns: fighter.critBlockTurns,
    extraTurns: fighter.extraTurns,
    mpCostMult: fighter.mpCostMult,
    nextAttackBoost: fighter.nextAttackBoost,
    magicReducePct: fighter.magicReducePct,
    magicReduceTurns: fighter.magicReduceTurns,
    meleeThornsPct: fighter.meleeThornsPct,
    meleeThornsTurns: fighter.meleeThornsTurns,
    meleeThornsBurn: fighter.meleeThornsBurn,
    trapTurns: fighter.trapTurns,
    trapPct: fighter.trapPct,
    delayed: fighter.delayed,
    enraged: fighter.enraged,
    endureUsed: fighter.endureUsed,
    cooldowns: { ...fighter.cooldowns },
    basic: fighter.basic,
    skills: [fighter.skills[0] ?? previous.skills[0], fighter.skills[1] ?? previous.skills[1]],
  };
}

function toEffectState(
  units: DuelCombatUnit[],
  actorId: string,
  turnId: string,
  sameTeam: (a: DuelCombatUnit, b: DuelCombatUnit) => boolean,
): EffectBattleState {
  const actor = units.find((unit) => unit.id === actorId);
  if (!actor) throw new Error('Missing actor for duel cast');
  const mine = units.filter((unit) => sameTeam(unit, actor));
  const foes = units.filter((unit) => !sameTeam(unit, actor));
  const lead = mine.find((unit) => unit.id === actorId) ?? mine.find((unit) => unit.kind === 'hero') ?? mine[0];
  if (!lead) {
    throw new Error('Missing acting team for duel cast');
  }
  const allies = mine.filter((unit) => unit.id !== lead.id).map((unit) => toFighter(unit, 'ally'));
  const foeFighters = foes.map((unit) => toFighter(unit, 'wild'));
  return {
    player: toFighter(lead, 'player'),
    allies,
    foes: foeFighters,
    bag: [],
    stamina: 0,
    maxStamina: 0,
    order: units.map((unit) => unit.id),
    round: 1,
    turnId,
    log: '',
    over: null,
    tamed: [],
  };
}

function syncUnits(units: DuelCombatUnit[], state: EffectBattleState): DuelCombatUnit[] {
  const byId = new Map<string, EffectFighter>();
  byId.set(state.player.id, state.player);
  for (const ally of state.allies) byId.set(ally.id, ally);
  for (const foe of state.foes) byId.set(foe.id, foe);
  return units.map((unit) => {
    const live = byId.get(unit.id);
    return live ? fromFighter(live, unit) : unit;
  });
}

function pickLastHit(
  before: DuelCombatUnit[],
  after: DuelCombatUnit[],
  attackerId: string,
  preferredTargetId: string | null,
  skillName?: string,
): DuelCastResult['lastHit'] {
  let best: DuelCastResult['lastHit'] = null;
  let bestDelta = 0;
  for (const unit of after) {
    if (unit.ownerId === before.find((entry) => entry.id === attackerId)?.ownerId) continue;
    const prev = before.find((entry) => entry.id === unit.id);
    if (!prev) continue;
    const delta = prev.hp - unit.hp;
    if (delta > bestDelta || (delta === bestDelta && unit.id === preferredTargetId)) {
      bestDelta = delta;
      best = {
        attackerId,
        targetId: unit.id,
        damage: Math.max(0, delta),
        crit: /chí mạng|crit/i.test(''),
        miss: delta <= 0 && Boolean(skillName),
        skillName,
      };
    }
  }
  if (!best && preferredTargetId) {
    return {
      attackerId,
      targetId: preferredTargetId,
      damage: 0,
      crit: false,
      miss: true,
      skillName,
    };
  }
  return best;
}

const arenaTeams = (a: DuelCombatUnit, b: DuelCombatUnit) =>
  a.ownerId != null && b.ownerId != null && a.ownerId === b.ownerId;
const raidTeams = (a: DuelCombatUnit, b: DuelCombatUnit) => (a.kind === 'hero') === (b.kind === 'hero');

/**
 * Arena / proximity PvP adapter — converts unit arrays, then calls executeCombatAction.
 */
export function resolveDuelAction(
  units: DuelCombatUnit[],
  actorId: string,
  action: DuelCastAction,
  skillIndex: 0 | 1,
  targetId: string | undefined,
  rng: () => number = Math.random,
  sameTeam: (a: DuelCombatUnit, b: DuelCombatUnit) => boolean = arenaTeams,
): DuelCastResult {
  const actor = units.find((unit) => unit.id === actorId && unit.hp > 0);
  if (!actor) return { units, log: 'Không có đơn vị hành động.', lastHit: null, skipped: true };

  const before = units;
  const state = toEffectState(units, actorId, actorId, sameTeam);
  const resolved = executeCombatAction({
    state,
    actorId,
    action,
    skillIndex,
    targetId: targetId ?? null,
    rng,
    beginTurn: true,
  });
  const afterUnits = syncUnits(units, resolved.state);
  const crit = /chí mạng|crit/i.test(resolved.log);
  const miss = /trượt|miss|né/i.test(resolved.log);
  const lastHit = pickLastHit(before, afterUnits, actorId, resolved.focusId, resolved.skillName);
  if (lastHit) {
    lastHit.crit = crit;
    lastHit.miss = miss && lastHit.damage <= 0;
  }
  return { units: afterUnits, log: resolved.log, lastHit, skipped: resolved.skipped };
}

/** Raid adapter — same executeCombatAction, party split by hero/monster. */
export function resolveRaidAction(
  units: DuelCombatUnit[],
  actorId: string,
  action: DuelCastAction,
  skillIndex: 0 | 1,
  targetId: string | undefined,
  rng: () => number = Math.random,
): DuelCastResult {
  return resolveDuelAction(units, actorId, action, skillIndex, targetId, rng, raidTeams);
}

/** Wire status entries for client HUD. */
export function statusViewOf(unit: DuelCombatUnit): { id: string; turns: number; power?: number }[] {
  return (unit.statuses ?? [])
    .filter((entry) => entry.turns > 0)
    .map((entry) => ({ id: entry.id, turns: entry.turns, power: entry.power }));
}
