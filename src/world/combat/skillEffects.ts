/**
 * Declarative skill cast engine for adventure combat.
 * Legacy skills without `effects` fall back to a single power strike.
 */

import { resolveStatusApplication, type StatusEntry, type StatusId } from './advanced';
import { finalDamage } from './damage';
import type { Skill, SkillEffect, SkillTarget, StatMod, ModStat } from './model';

/** Minimal battle shapes to avoid circular imports with combat.ts. */
export type EffectFighter = {
  id: string;
  name: string;
  side: 'player' | 'ally' | 'wild';
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
  element: import('./elements').ElementId;
  tgh: number;
  maxTgh: number;
  armPen: number;
  res: number;
  eva: number;
  acc: number;
  staggered?: boolean;
  statuses?: import('./advanced').StatusEntry[];
  mods?: StatMod[];
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
  basic: Skill;
  skills: Skill[];
  cooldowns: Record<string, number>;
};

export type EffectBattleState = {
  player: EffectFighter;
  allies: EffectFighter[];
  foes: EffectFighter[];
  bag: unknown[];
  stamina: number;
  maxStamina: number;
  order: string[];
  round: number;
  turnId: string;
  log: string;
  over: 'win' | 'lose' | null;
  tamed: unknown[];
  redirectHighestTurns?: number;
  bioFieldTurns?: number;
  bioFieldPct?: number;
};

type BattleState = EffectBattleState;
type Fighter = EffectFighter;

type CastResult = { state: BattleState; log: string };

const DEBUFF_IDS: StatusId[] = ['poison', 'freeze', 'stun', 'slow', 'silence', 'blind', 'bleed', 'burn', 'spd_zero'];

export function needsEnemyTarget(skill: Skill | null | undefined): boolean {
  if (!skill) return true;
  const target = skill.target ?? inferTarget(skill);
  return target === 'enemy' || target === 'enemies' || target === 'enemy_pets';
}

export function needsAllyTarget(skill: Skill | null | undefined): boolean {
  if (!skill) return false;
  const target = skill.target ?? inferTarget(skill);
  return target === 'ally' || target === 'ally_pet';
}

function inferTarget(skill: Skill): SkillTarget {
  if (skill.power <= 0) return 'self';
  return 'enemy';
}

export function castSkill(
  state: BattleState,
  actorId: string,
  skill: Skill | null,
  targetId: string | null,
  rng: () => number = Math.random,
): CastResult {
  const actor = findUnit(state, actorId);
  if (!actor || actor.hp <= 0) return { state, log: state.log };

  let next = cloneState(state);
  let notes: string[] = [];

  // Release charged snipe instead of casting a new skill.
  if (!skill && actor.chargedPower && actor.chargedPower > 0) {
    const foe = pickEnemy(next, actor, targetId);
    if (!foe) return { state: next, log: 'Hãy chọn một quái còn sống.' };
    const result = applyDamage(next, actor, foe, {
      type: 'damage',
      power: actor.chargedPower,
      trueDamage: actor.chargedTrue,
    }, rng, true);
    next = result.state;
    const cleared = { ...findUnit(next, actor.id)!, chargedPower: undefined, chargedTrue: undefined, stealthTurns: 0 };
    next = putUnit(next, cleared);
    return { state: next, log: `${actor.name} phóng đòn tụ lực. ${result.notes.join(' ')}`.trim() };
  }

  const move = skill ?? actor.basic;
  const effects = move.effects?.length ? move.effects : ([{ type: 'damage', power: move.power || 1 }] as SkillEffect[]);

  // Stealth bonus for next damaging attack leaving stealth.
  const fromStealth = (actor.stealthTurns ?? 0) > 0;

  for (const effect of effects) {
    const applied = applyEffect(next, actor.id, effect, targetId, rng, fromStealth);
    next = applied.state;
    if (applied.notes.length) notes.push(...applied.notes);
  }

  if (fromStealth) {
    const self = findUnit(next, actor.id);
    if (self) next = putUnit(next, { ...self, stealthTurns: 0 });
  }

  const label = move.name;
  return { state: next, log: `${label}. ${notes.filter(Boolean).join(' ')}`.trim() };
}

function applyEffect(
  state: BattleState,
  actorId: string,
  effect: SkillEffect,
  targetId: string | null,
  rng: () => number,
  fromStealth: boolean,
): { state: BattleState; notes: string[] } {
  const actor = findUnit(state, actorId);
  if (!actor) return { state, notes: [] };

  switch (effect.type) {
    case 'damage':
      return applyDamage(state, actor, pickEnemy(state, actor, targetId), effect, rng, fromStealth);
    case 'heal':
      return applyHeal(state, actor, effect, targetId);
    case 'restore_mp':
      return applyRestoreMp(state, actor, effect);
    case 'status':
      return applyStatusEffect(state, actor, effect, targetId, rng);
    case 'mod':
      return applyModEffect(state, actor, effect, targetId, rng);
    case 'chip_tgh':
      return applyChipTgh(state, actor, effect, targetId, rng);
    case 'mark':
      return applyMark(state, actor, effect, targetId);
    case 'taunt': {
      const self = { ...actor, tauntTurns: effect.turns };
      return { state: putUnit(state, self), notes: [`${actor.name} khiêu khích ${effect.turns} lượt.`] };
    }
    case 'redirect_highest_hp':
      return {
        state: { ...state, redirectHighestTurns: effect.turns },
        notes: [`Mồi dụ: địch phải đánh mục tiêu HP cao nhất (${effect.turns} lượt).`],
      };
    case 'guard':
      return applyGuard(state, actor, effect, targetId);
    case 'stealth': {
      const self = { ...actor, stealthTurns: effect.turns };
      return { state: putUnit(state, withStatus(self, { id: 'stealth', turns: effect.turns })), notes: [`${actor.name} ẩn thân.`] };
    }
    case 'charge': {
      const self = { ...actor, chargedPower: effect.power, chargedTrue: effect.trueDamage };
      return { state: putUnit(state, self), notes: [`${actor.name} tụ lực (lượt sau phóng đòn).`] };
    }
    case 'reflect':
      return applyReflect(state, actor, effect, targetId);
    case 'crit_block':
      return applyCritBlock(state, actor, effect);
    case 'cleanse_enemy_buffs':
      return cleanseEnemyBuffs(state, actor);
    case 'steal_buffs':
      return stealBuffs(state, actor, effect, targetId, rng);
    case 'cd_reduce':
      return reduceCooldowns(state, actor, effect);
    case 'bio_field':
      return {
        state: { ...state, bioFieldTurns: effect.turns, bioFieldPct: effect.pctHeal },
        notes: [`Trụ sinh học kích hoạt ${effect.turns} lượt.`],
      };
    case 'strip_def':
      return stripDefHits(state, actor, effect, rng);
    case 'random':
      return applyRandom(state, actorId, effect, targetId, rng, fromStealth);
    default:
      return { state, notes: [] };
  }
}

function applyDamage(
  state: BattleState,
  actor: Fighter,
  primary: Fighter | null,
  effect: Extract<SkillEffect, { type: 'damage' }>,
  rng: () => number,
  fromStealth: boolean,
): { state: BattleState; notes: string[] } {
  let next = state;
  const notes: string[] = [];
  const hits = Math.max(1, effect.hits ?? 1);
  const targets = resolveDamageTargets(next, actor, primary, effect.aoe);
  if (!targets.length) return { state: next, notes: ['Không có mục tiêu.'] };

  for (const target of targets) {
    const isPrimary = primary ? target.id === primary.id : targets[0]?.id === target.id;
    let power = effect.power ?? 1;
    if (effect.randomPower) {
      const [lo, hi] = effect.randomPower;
      power = lo + (hi - lo) * rng();
    }
    if (!isPrimary && effect.aoe && effect.secondaryPower != null) power = effect.secondaryPower;
    if (effect.aoe === 'all' && sameTeam(actor, target) && effect.allyHarmRange) {
      const [lo, hi] = effect.allyHarmRange;
      power = lo + (hi - lo) * rng();
    }

    for (let hit = 0; hit < hits; hit += 1) {
      const liveActor = findUnit(next, actor.id) ?? actor;
      const liveTarget = findUnit(next, target.id);
      if (!liveTarget || liveTarget.hp <= 0) continue;
      if ((liveTarget.stealthTurns ?? 0) > 0) {
        notes.push(`${liveTarget.name} đang ẩn, né đòn.`);
        continue;
      }

      const result = computeHit(liveActor, liveTarget, { ...effect, power }, rng, fromStealth && isPrimary && hit === 0);
      let damaged = result.target;
      let reflectedNote = '';
      if (result.damage > 0 && (damaged.reflectCharges ?? 0) > 0 && (damaged.reflectPct ?? 0) > 0) {
        const bounce = Math.max(1, Math.round(result.damage * (damaged.reflectPct || 0)));
        const attacker = findUnit(next, liveActor.id)!;
        const hurt = {
          ...attacker,
          hp: Math.max(0, attacker.hp - bounce),
          damageTaken: (attacker.damageTaken ?? 0) + bounce,
        };
        next = putUnit(next, hurt);
        damaged = {
          ...damaged,
          reflectCharges: Math.max(0, (damaged.reflectCharges ?? 1) - 1),
        };
        reflectedNote = ` Phản ${bounce}.`;
      }

      let dealt = result.damage;
      if (dealt > 0) {
        const guardian = everyone(next).find(
          (unit) => unit.hp > 0 && (unit.guardTurns ?? 0) > 0 && unit.guardTargetId === damaged.id,
        );
        if (guardian) {
          const share = Math.round(dealt * (guardian.guardAbsorb ?? 0.5));
          const rest = Math.max(0, dealt - share);
          const before = findUnit(next, target.id)?.hp ?? target.hp;
          // Undo full hit, apply only the unguarded remainder.
          damaged = {
            ...damaged,
            hp: Math.max(0, before + dealt - rest),
          };
          dealt = rest;
          const g = findUnit(next, guardian.id)!;
          next = putUnit(next, {
            ...g,
            hp: Math.max(0, g.hp - share),
            damageTaken: (g.damageTaken ?? 0) + share,
          });
          notes.push(`${guardian.name} đỡ ${share} sát thương.`);
        }
      }

      next = putUnit(next, {
        ...damaged,
        damageTaken: (damaged.damageTaken ?? 0) + dealt,
      });
      if (result.crit && liveActor.basic?.id === 'bard-ambush') {
        const healed = Math.round(liveActor.maxHp * 0.1);
        const self = findUnit(next, liveActor.id)!;
        next = putUnit(next, { ...self, hp: Math.min(self.maxHp, self.hp + healed) });
        notes.push(`${self.name} chí mạng, hồi ${healed} HP.`);
      }
      notes.push(
        result.miss
          ? `Trượt ${liveTarget.name}.`
          : `Gây ${result.damage} lên ${liveTarget.name}${result.crit ? ' (chí mạng)' : ''}${result.staggered ? ' (gục)' : ''}.${reflectedNote}`,
      );
    }
  }
  return { state: next, notes };
}

function computeHit(
  attacker: Fighter,
  defender: Fighter,
  effect: Extract<SkillEffect, { type: 'damage' }>,
  rng: () => number,
  fromStealth: boolean,
): { damage: number; miss: boolean; crit: boolean; staggered: boolean; target: Fighter } {
  let power = effect.power ?? 1;
  const hpRatio = defender.maxHp > 0 ? defender.hp / defender.maxHp : 1;
  if (effect.ifHpAbove != null && hpRatio > effect.ifHpAbove) power += effect.bonusPower ?? 0;
  if (effect.ifHpBelow != null && hpRatio < effect.ifHpBelow) power *= effect.finishMult ?? 1;
  if (effect.ifDebuffedBonus && hasDebuff(defender)) power += effect.ifDebuffedBonus;
  if (fromStealth) power += effect.fromStealthBonus ?? 0.5;

  const atkMods = modSum(attacker, 'atk');
  const defMods = modSum(defender, 'def');
  const critMods = modSum(attacker, 'critRate');
  const critDmgMods = modSum(attacker, 'critDamage');
  const accMods = modSum(attacker, 'acc');
  const evaMods = modSum(defender, 'eva');
  const armPenMods = modSum(attacker, 'armPen');

  let attack = (attacker.attack || 0) * (1 + atkMods);
  if (effect.scaleFromDef) attack = (attacker.defense || 0) * (1 + modSum(attacker, 'def'));
  if (effect.missingHpPower != null) {
    const missing = Math.max(0, attacker.maxHp - attacker.hp);
    return {
      damage: Math.max(1, Math.round(missing * effect.missingHpPower)),
      miss: false,
      crit: false,
      staggered: false,
      target: { ...defender, hp: Math.max(0, defender.hp - Math.max(1, Math.round(missing * effect.missingHpPower))) },
    };
  }
  if (effect.damageTakenPower != null) {
    const raw = Math.max(1, Math.round((attacker.damageTaken ?? 0) * effect.damageTakenPower));
    return {
      damage: raw,
      miss: false,
      crit: false,
      staggered: false,
      target: { ...defender, hp: Math.max(0, defender.hp - raw) },
    };
  }

  const mark = getStatus(defender, 'mark');
  let armPen = (attacker.armPen || 0) + (effect.armPenBonus ?? 0) + armPenMods + (mark?.power2 ?? 0);
  let critRate = (attacker.critRate || 0) + (effect.critRateBonus ?? 0) + critMods + (mark?.power ?? 0);
  if (defender.critBlockTurns && defender.critBlockTurns > 0) critRate = 0;

  // Blind on attacker: already in acc mods via status-applied mods.
  const acc = Math.max(0.05, (attacker.acc || 0.9) + accMods);
  const eva = Math.max(0, (defender.eva || 0) + evaMods);
  let defense = Math.max(0, (defender.defense || 0) * (1 + defMods));
  if (defender.staggered) defense = Math.round(defense * 0.5);

  if (effect.trueDamage) {
    const raw = Math.max(1, Math.round(attack * power));
    return {
      damage: raw,
      miss: false,
      crit: false,
      staggered: false,
      target: { ...defender, hp: Math.max(0, defender.hp - raw) },
    };
  }

  const hit = finalDamage({
    attack,
    multiplier: power,
    critRate,
    critDamage: (attacker.critDamage || 1.5) + critDmgMods + (effect.critDamageBonus ?? 0),
    attackerElement: attacker.element,
    defenderElement: defender.element,
    defense,
    armPen,
    acc,
    eva,
    hitRoll: rng(),
    critRoll: rng(),
  });

  let target: Fighter = { ...defender, hp: Math.max(0, defender.hp - (hit.miss ? 0 : hit.damage)) };
  let staggered = false;
  if (!hit.miss && effect.armPenBonus && effect.armPenBonus >= 0.15) {
    // light toughness pressure on armor-pen skills handled elsewhere
  }
  return { damage: hit.miss ? 0 : hit.damage, miss: hit.miss, crit: hit.crit, staggered, target };
}

function applyHeal(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'heal' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const notes: string[] = [];
  let next = state;
  const targets = resolveHealTargets(next, actor, effect.target ?? 'self', targetId);
  for (const unit of targets) {
    const amount = Math.max(1, Math.round((effect.pctMax ?? 0) * unit.maxHp + (effect.flat ?? 0)));
    let healed = { ...unit, hp: Math.min(unit.maxHp, unit.hp + amount) };
    if (effect.cleanse?.length) {
      healed = {
        ...healed,
        statuses: (healed.statuses ?? []).filter((entry) => {
          if (effect.cleanse!.includes('all_debuff')) return !DEBUFF_IDS.includes(entry.id);
          return !effect.cleanse!.includes(entry.id as 'poison' | 'bleed' | 'burn');
        }),
      };
    }
    next = putUnit(next, healed);
    notes.push(`Hồi ${amount} cho ${unit.name}.`);
  }
  return { state: next, notes };
}

function applyRestoreMp(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'restore_mp' }>,
): { state: BattleState; notes: string[] } {
  const notes: string[] = [];
  let next = state;
  const pool =
    effect.target === 'party_pets'
      ? next.allies.filter((unit) => unit.hp > 0)
      : effect.target === 'party'
        ? [next.player, ...next.allies].filter((unit) => unit.hp > 0)
        : [actor];
  for (const unit of pool) {
    const live = findUnit(next, unit.id)!;
    const gain = Math.max(1, Math.round((effect.amount ?? 0) + (effect.pctMax ?? 0) * live.maxMp));
    next = putUnit(next, { ...live, mp: Math.min(live.maxMp, live.mp + gain) });
    notes.push(`${live.name} +${gain} MP.`);
  }
  return { state: next, notes };
}

function applyStatusEffect(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'status' }>,
  targetId: string | null,
  rng: () => number,
): { state: BattleState; notes: string[] } {
  // Special: rogue pickpocket uses slow status with turns 0 as MP steal signal.
  if (effect.id === 'slow' && effect.turns === 0 && effect.power) {
    const foe = pickEnemy(state, actor, targetId);
    if (!foe || rng() > effect.chance) return { state, notes: ['Móc túi thất bại.'] };
    const steal = Math.max(1, Math.round(foe.mp * effect.power));
    let next = putUnit(state, { ...foe, mp: Math.max(0, foe.mp - steal) });
    const self = findUnit(next, actor.id)!;
    next = putUnit(next, { ...self, mp: Math.min(self.maxMp, self.mp + steal) });
    return { state: next, notes: [`Cướp ${steal} MP từ ${foe.name}.`] };
  }

  const notes: string[] = [];
  let next = state;
  const targets = resolveStatusTargets(next, actor, effect, targetId);
  for (const unit of targets) {
    if (hasStatus(unit, 'immunity') && DEBUFF_IDS.includes(effect.id as StatusId)) {
      notes.push(`${unit.name} miễn nhiễm.`);
      continue;
    }
    const roll = resolveStatusApplication(effect.chance, effect.turns, unit.res || 0, rng());
    if (!roll.applied) {
      notes.push(`${unit.name} kháng hiệu ứng.`);
      continue;
    }
    next = putUnit(
      next,
      withStatus(unit, {
        id: effect.id as StatusId,
        turns: roll.duration,
        power: effect.power,
        sourceId: actor.id,
      }),
    );
    notes.push(`${unit.name} dính ${effect.id} (${roll.duration}).`);
  }
  return { state: next, notes };
}

function applyModEffect(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'mod' }>,
  targetId: string | null,
  rng: () => number,
): { state: BattleState; notes: string[] } {
  if (effect.chance != null && rng() > effect.chance) return { state, notes: [] };
  const notes: string[] = [];
  let next = state;
  const targets = resolveModTargets(next, actor, effect.target ?? 'self', targetId);
  for (const unit of targets) {
    const mod: StatMod = {
      id: `${effect.stat}-${Date.now()}-${Math.floor(rng() * 9999)}`,
      stat: effect.stat,
      amount: effect.amount,
      turns: effect.turns,
    };
    next = putUnit(next, { ...unit, mods: [...(unit.mods ?? []), mod] });
    notes.push(`${unit.name} ${effect.stat} ${effect.amount >= 0 ? '+' : ''}${Math.round(effect.amount * 100)}%.`);
  }
  // Wanderer fate "ally" without targetId: buff lowest HP ally
  return { state: next, notes };
}

function applyChipTgh(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'chip_tgh' }>,
  targetId: string | null,
  rng: () => number,
): { state: BattleState; notes: string[] } {
  if (rng() > effect.chance) return { state, notes: [] };
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  const chip = Math.max(1, Math.round((foe.maxTgh || 100) * effect.pct));
  let tgh = Math.max(0, (foe.tgh || foe.maxTgh || 100) - chip);
  let staggered = false;
  if (tgh <= 0) {
    staggered = true;
    tgh = foe.maxTgh || 100;
  }
  return {
    state: putUnit(state, { ...foe, tgh, staggered: staggered || foe.staggered }),
    notes: [`TGH ${foe.name} −${chip}${staggered ? ' (gục)' : ''}.`],
  };
}

function applyMark(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'mark' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: ['Hãy chọn mục tiêu.'] };
  return {
    state: putUnit(
      state,
      withStatus(foe, { id: 'mark', turns: effect.turns, power: effect.critBonus, power2: effect.ignoreDef, sourceId: actor.id }),
    ),
    notes: [`Đánh dấu ${foe.name}.`],
  };
}

function applyGuard(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'guard' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const ally =
    (targetId ? findUnit(state, targetId) : null) ??
    state.allies.filter((unit) => unit.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (!ally || ally.side === 'wild') return { state, notes: ['Hãy chọn pet đồng minh.'] };
  const self = {
    ...actor,
    guardTargetId: ally.id,
    guardAbsorb: effect.absorb,
    guardTurns: effect.turns,
  };
  return { state: putUnit(state, self), notes: [`${actor.name} bảo vệ ${ally.name}.`] };
}

function applyReflect(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'reflect' }>,
  _targetId: string | null,
): { state: BattleState; notes: string[] } {
  let next = state;
  const pool =
    effect.target === 'party'
      ? [next.player, ...next.allies]
      : effect.target === 'self'
        ? [actor]
        : next.allies;
  for (const unit of pool.filter((entry) => entry.hp > 0)) {
    next = putUnit(next, {
      ...unit,
      reflectCharges: effect.charges ?? 1,
      reflectPct: effect.pct,
      statuses: [...(unit.statuses ?? []).filter((entry) => entry.id !== 'reflect'), { id: 'reflect', turns: effect.turns, power: effect.pct }],
    });
  }
  return { state: next, notes: ['Khiên phản chiếu kích hoạt.'] };
}

function applyCritBlock(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'crit_block' }>,
): { state: BattleState; notes: string[] } {
  let next = state;
  const pool = effect.target === 'self' ? [actor] : [next.player, ...next.allies];
  for (const unit of pool.filter((entry) => entry.hp > 0)) {
    next = putUnit(next, { ...unit, critBlockTurns: effect.turns });
  }
  return { state: next, notes: ['Chặn chí mạng kích hoạt.'] };
}

function cleanseEnemyBuffs(state: BattleState, _actor: Fighter): { state: BattleState; notes: string[] } {
  let next = state;
  for (const foe of next.foes.filter((unit) => unit.hp > 0)) {
    next = putUnit(next, {
      ...foe,
      mods: (foe.mods ?? []).filter((mod) => mod.amount < 0),
    });
  }
  return { state: next, notes: ['Đã xóa buff địch.'] };
}

function stealBuffs(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'steal_buffs' }>,
  targetId: string | null,
  rng: () => number,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: ['Hãy chọn mục tiêu.'] };
  const success = rng() < effect.chance;
  const buffs = (foe.mods ?? []).filter((mod) => mod.amount > 0);
  let next = state;
  let power = effect.failPower;
  if (success && buffs.length) {
    power = effect.successPower;
    const self = findUnit(next, actor.id)!;
    next = putUnit(next, { ...foe, mods: (foe.mods ?? []).filter((mod) => mod.amount <= 0) });
    next = putUnit(next, { ...self, mods: [...(self.mods ?? []), ...buffs.map((mod) => ({ ...mod, turns: Math.max(1, mod.turns) }))] });
  }
  return applyDamage(next, findUnit(next, actor.id)!, findUnit(next, foe.id) ?? null, { type: 'damage', power }, rng, false);
}

function reduceCooldowns(
  state: BattleState,
  _actor: Fighter,
  effect: Extract<SkillEffect, { type: 'cd_reduce' }>,
): { state: BattleState; notes: string[] } {
  let next = state;
  const pool = effect.target === 'self' ? [next.player] : effect.target === 'party' ? [next.player, ...next.allies] : next.allies;
  for (const unit of pool.filter((entry) => entry.hp > 0)) {
    const cds: Record<string, number> = {};
    for (const [id, value] of Object.entries(unit.cooldowns ?? {})) {
      cds[id] = Math.max(0, value - effect.amount);
    }
    next = putUnit(next, { ...unit, cooldowns: cds });
  }
  return { state: next, notes: [`Giảm CD ${effect.amount}.`] };
}

function stripDefHits(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'strip_def' }>,
  rng: () => number,
): { state: BattleState; notes: string[] } {
  const [lo, hi] = effect.randomTargets ?? [3, 5];
  const count = lo + Math.floor(rng() * (hi - lo + 1));
  const foes = state.foes.filter((unit) => unit.hp > 0);
  if (!foes.length) return { state, notes: [] };
  let next = state;
  const notes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const foe = foes[Math.floor(rng() * foes.length)];
    const live = findUnit(next, foe.id);
    if (!live || live.hp <= 0) continue;
    const dmg = applyDamage(next, findUnit(next, actor.id)!, live, { type: 'damage', power: 0.7 }, rng, false);
    next = dmg.state;
    notes.push(...dmg.notes);
    if (rng() < (effect.chance ?? 0.4)) {
      const updated = findUnit(next, live.id)!;
      next = putUnit(next, {
        ...updated,
        mods: [...(updated.mods ?? []), { id: `strip-${i}`, stat: 'def' as ModStat, amount: -effect.amount, turns: 2 }],
      });
    }
  }
  return { state: next, notes };
}

function applyRandom(
  state: BattleState,
  actorId: string,
  effect: Extract<SkillEffect, { type: 'random' }>,
  targetId: string | null,
  rng: () => number,
  fromStealth: boolean,
): { state: BattleState; notes: string[] } {
  const chances = effect.chances ?? effect.options.map(() => 1 / Math.max(1, effect.options.length));
  let roll = rng();
  let index = effect.options.length - 1;
  for (let i = 0; i < chances.length; i += 1) {
    roll -= chances[i];
    if (roll <= 0) {
      index = i;
      break;
    }
  }
  let next = state;
  const notes: string[] = [];
  for (const child of effect.options[index] ?? []) {
    const applied = applyEffect(next, actorId, child, targetId, rng, fromStealth);
    next = applied.state;
    notes.push(...applied.notes);
  }
  return { state: next, notes };
}

/** Start-of-turn ticks: DoT, bio-field, mod/status decay helpers used by combat.after. */
export function beginTurnAuras(state: BattleState, fighterId: string): BattleState {
  let next = state;
  if ((next.bioFieldTurns ?? 0) > 0 && (next.bioFieldPct ?? 0) > 0) {
    const pct = next.bioFieldPct!;
    for (const unit of [next.player, ...next.allies].filter((entry) => entry.hp > 0)) {
      const heal = Math.max(1, Math.round(unit.maxHp * pct));
      next = putUnit(next, { ...unit, hp: Math.min(unit.maxHp, unit.hp + heal) });
    }
  }
  const fighter = findUnit(next, fighterId);
  if (!fighter) return next;
  let hp = fighter.hp;
  for (const status of fighter.statuses ?? []) {
    if ((status.id === 'poison' || status.id === 'bleed' || status.id === 'burn') && status.power) {
      hp = Math.max(0, hp - Math.max(1, Math.round(fighter.maxHp * status.power)));
    }
  }
  if (hp !== fighter.hp) next = putUnit(next, { ...fighter, hp });
  return next;
}

export function tickFighterTimers<T extends EffectFighter>(fighter: T): T {
  const mods = (fighter.mods ?? [])
    .map((mod) => ({ ...mod, turns: mod.turns - 1 }))
    .filter((mod) => mod.turns > 0);
  const statuses = (fighter.statuses ?? [])
    .map((entry) => ({ ...entry, turns: entry.turns - 1 }))
    .filter((entry) => entry.turns > 0);
  return {
    ...fighter,
    mods,
    statuses,
    stealthTurns: Math.max(0, (fighter.stealthTurns ?? 0) - 1),
    tauntTurns: Math.max(0, (fighter.tauntTurns ?? 0) - 1),
    guardTurns: Math.max(0, (fighter.guardTurns ?? 0) - 1),
    critBlockTurns: Math.max(0, (fighter.critBlockTurns ?? 0) - 1),
  };
}

export function shouldSkipTurn(fighter: Fighter): string | null {
  if (fighter.staggered) return 'gục ngã';
  if (hasStatus(fighter, 'stun') || hasStatus(fighter, 'freeze')) return 'bị khống chế';
  if (hasStatus(fighter, 'spd_zero')) return 'tốc độ = 0';
  return null;
}

export function isSilenced(fighter: Fighter): boolean {
  return hasStatus(fighter, 'silence');
}

export function retargetAttack(
  state: BattleState,
  attacker: Fighter,
  intended: Fighter | null,
): Fighter | null {
  if (!intended) return null;
  const enemies = opponentsOf(state, attacker).filter((unit) => unit.hp > 0 && (unit.stealthTurns ?? 0) <= 0);
  if (!enemies.length) return null;
  if ((state.redirectHighestTurns ?? 0) > 0 && attacker.side === 'wild') {
    return [...enemies].sort((a, b) => b.hp - a.hp || a.id.localeCompare(b.id))[0] ?? intended;
  }
  const taunter = enemies.find((unit) => (unit.tauntTurns ?? 0) > 0);
  if (taunter) return taunter;
  if ((intended.stealthTurns ?? 0) > 0) return enemies[0] ?? null;
  return intended;
}

export function modSum(fighter: Fighter, stat: ModStat): number {
  return (fighter.mods ?? []).filter((mod) => mod.stat === stat).reduce((sum, mod) => sum + mod.amount, 0);
}

function resolveDamageTargets(
  state: BattleState,
  actor: Fighter,
  primary: Fighter | null,
  aoe: Extract<SkillEffect, { type: 'damage' }>['aoe'],
): Fighter[] {
  if (!aoe) return primary ? [primary] : [];
  if (aoe === 'enemy_pets') return state.foes.filter((unit) => unit.hp > 0 && unit.side === 'wild');
  if (aoe === 'enemies') return opponentsOf(state, actor).filter((unit) => unit.hp > 0);
  return everyone(state).filter((unit) => unit.hp > 0 && unit.id !== actor.id);
}

function resolveHealTargets(
  state: BattleState,
  actor: Fighter,
  mode: NonNullable<Extract<SkillEffect, { type: 'heal' }>['target']>,
  targetId: string | null,
): Fighter[] {
  if (mode === 'self') return [actor];
  if (mode === 'ally' || mode === undefined) {
    const ally = targetId ? findUnit(state, targetId) : null;
    if (ally && ally.side !== 'wild') return [ally];
    return state.allies.filter((unit) => unit.hp > 0).slice(0, 1);
  }
  if (mode === 'ally_lowest') {
    const pool = [state.player, ...state.allies].filter((unit) => unit.hp > 0);
    return pool.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 1);
  }
  if (mode === 'party_lowest_two') {
    return state.allies.filter((unit) => unit.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 2);
  }
  if (mode === 'party_pets') return state.allies.filter((unit) => unit.hp > 0);
  return [state.player, ...state.allies].filter((unit) => unit.hp > 0);
}

function resolveStatusTargets(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'status' }>,
  targetId: string | null,
): Fighter[] {
  const mode = effect.target ?? 'enemy';
  if (mode === 'self') return [actor];
  if (mode === 'ally') {
    const ally = targetId ? findUnit(state, targetId) : null;
    return ally && ally.side !== 'wild' ? [ally] : state.allies.filter((unit) => unit.hp > 0).slice(0, 1);
  }
  if (mode === 'party_pets') return state.allies.filter((unit) => unit.hp > 0);
  if (mode === 'enemies') return opponentsOf(state, actor).filter((unit) => unit.hp > 0);
  if (mode === 'enemies_top_hp') {
    return opponentsOf(state, actor)
      .filter((unit) => unit.hp > 0)
      .sort((a, b) => b.hp - a.hp)
      .slice(0, effect.count ?? 2);
  }
  const foe = pickEnemy(state, actor, targetId);
  return foe ? [foe] : [];
}

function resolveModTargets(
  state: BattleState,
  actor: Fighter,
  mode: NonNullable<Extract<SkillEffect, { type: 'mod' }>['target']>,
  targetId: string | null,
): Fighter[] {
  if (mode === 'self') return [actor];
  if (mode === 'enemy') {
    const foe = pickEnemy(state, actor, targetId);
    return foe ? [foe] : [];
  }
  if (mode === 'enemies') return opponentsOf(state, actor).filter((unit) => unit.hp > 0);
  if (mode === 'party_pets') return state.allies.filter((unit) => unit.hp > 0);
  if (mode === 'party') return [state.player, ...state.allies].filter((unit) => unit.hp > 0);
  // ally: preferred target, else lowest HP friendly
  const ally = targetId ? findUnit(state, targetId) : null;
  if (ally && ally.side !== 'wild' && ally.hp > 0) return [ally];
  return [state.player, ...state.allies].filter((unit) => unit.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 1);
}

function pickEnemy(state: BattleState, actor: Fighter, targetId: string | null): Fighter | null {
  const pool = opponentsOf(state, actor).filter((unit) => unit.hp > 0 && (unit.stealthTurns ?? 0) <= 0);
  if (targetId) {
    const exact = pool.find((unit) => unit.id === targetId);
    if (exact) return exact;
  }
  return pool[0] ?? null;
}

function opponentsOf(state: BattleState, actor: Fighter): Fighter[] {
  if (actor.side === 'wild') return [state.player, ...state.allies];
  return state.foes;
}

function everyone(state: BattleState): Fighter[] {
  return [state.player, ...state.allies, ...state.foes];
}

function sameTeam(a: Fighter, b: Fighter): boolean {
  if (a.side === 'wild') return b.side === 'wild';
  return b.side !== 'wild';
}

function hasDebuff(fighter: Fighter): boolean {
  return (fighter.statuses ?? []).some((entry) => DEBUFF_IDS.includes(entry.id));
}

function hasStatus(fighter: Fighter, id: StatusId): boolean {
  return (fighter.statuses ?? []).some((entry) => entry.id === id && entry.turns > 0);
}

function getStatus(fighter: Fighter, id: StatusId): StatusEntry | undefined {
  return (fighter.statuses ?? []).find((entry) => entry.id === id && entry.turns > 0);
}

function withStatus(fighter: Fighter, entry: StatusEntry): Fighter {
  const others = (fighter.statuses ?? []).filter((status) => status.id !== entry.id);
  return { ...fighter, statuses: [...others, entry] };
}

export function findUnit(state: BattleState, id: string): Fighter | undefined {
  if (state.player.id === id) return state.player;
  return state.allies.find((entry) => entry.id === id) ?? state.foes.find((entry) => entry.id === id);
}

export function putUnit(state: BattleState, fighter: Fighter): BattleState {
  if (fighter.id === state.player.id) return { ...state, player: fighter };
  if (fighter.side === 'ally' || state.allies.some((entry) => entry.id === fighter.id)) {
    return { ...state, allies: state.allies.map((entry) => (entry.id === fighter.id ? fighter : entry)) };
  }
  return { ...state, foes: state.foes.map((entry) => (entry.id === fighter.id ? fighter : entry)) };
}

function cloneState(state: BattleState): BattleState {
  return {
    ...state,
    player: { ...state.player },
    allies: state.allies.map((unit) => ({ ...unit })),
    foes: state.foes.map((unit) => ({ ...unit })),
  };
}
