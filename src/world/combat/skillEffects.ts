/**
 * Declarative skill cast engine for adventure combat.
 * Legacy skills without `effects` fall back to a single power strike.
 */

import { resolveStatusApplication, type StatusEntry, type StatusId } from './advanced';
import { DEFEND_DAMAGE_MULT, finalDamage } from './damage';
import type { Skill, SkillEffect, SkillTarget, StatMod, ModStat } from './model';
import {
  ENGINE_DEBUFF_IDS,
  accuracyMultiplier,
  burnAttackMultiplier,
  canSwapOrFlee,
  collectDisplayStatuses,
  effectiveSpeed,
  resolveStatusDefaults,
} from './statuses';

export const DEFEND_STATUS_ID: StatusId = 'defend';

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
  shieldHp?: number;
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
  chantTurns?: number;
  chantHpPct?: number;
  chantMpPct?: number;
};

type BattleState = EffectBattleState;
type Fighter = EffectFighter;

type CastResult = { state: BattleState; log: string };

const DEBUFF_IDS: StatusId[] = ENGINE_DEBUFF_IDS;

const RANDOM_HIT_STATUSES: StatusId[] = ['burn', 'freeze', 'poison', 'stun'];

export { canSwapOrFlee, collectDisplayStatuses, effectiveSpeed };

export function manaCost(fighter: EffectFighter, skill: Skill): number {
  const thirst = hasStatus(fighter, 'thirst') || (fighter.mpCostMult ?? 1) > 1;
  const mult = Math.max(1, fighter.mpCostMult ?? (thirst ? 2 : 1));
  return Math.max(0, Math.round((skill.mana || 0) * mult));
}

export function fighterBlockedFromSwap(fighter: EffectFighter): boolean {
  return !canSwapOrFlee(fighter);
}

export function isUltimateSkill(skill: Skill | null | undefined): boolean {
  if (!skill) return false;
  return /(?:-5)$/.test(skill.id);
}

export function needsEnemyTarget(skill: Skill | null | undefined): boolean {
  if (!skill) return true;
  const target = skill.target ?? inferTarget(skill);
  return target === 'enemy' || target === 'enemy_back' || target === 'enemies' || target === 'enemy_pets';
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
  const fromSkill = Boolean(skill && (skill.mana > 0 || skill.cooldown > 0));
  const liveActor = findUnit(next, actor.id) ?? actor;
  if (fromSkill && hasStatus(liveActor, 'miasma')) {
    const tax = Math.max(1, Math.round(liveActor.maxHp * (getStatus(liveActor, 'miasma')?.power ?? 0.1)));
    next = putUnit(next, { ...liveActor, hp: Math.max(0, liveActor.hp - tax), damageTaken: (liveActor.damageTaken ?? 0) + tax });
    notes.push(`${liveActor.name} mất ${tax} HP vì miasma.`);
  }
  if ((liveActor.trapTurns ?? 0) > 0 && fromSkill) {
    const tax = Math.max(1, Math.round(liveActor.maxHp * (liveActor.trapPct ?? 0.08)));
    const trapped = findUnit(next, liveActor.id)!;
    next = putUnit(next, { ...trapped, hp: Math.max(0, trapped.hp - tax), damageTaken: (trapped.damageTaken ?? 0) + tax });
    notes.push(`${trapped.name} dính bẫy (${tax}).`);
  }
  const effects = move.effects?.length ? move.effects : ([{ type: 'damage', power: move.power || 1 }] as SkillEffect[]);

  // Stealth bonus for next damaging attack leaving stealth.
  const fromStealth = (actor.stealthTurns ?? 0) > 0;

  for (const effect of effects) {
    const applied = applyEffect(next, actor.id, effect, targetId, rng, fromStealth, fromSkill);
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
  fromSkill = false,
): { state: BattleState; notes: string[] } {
  const actor = findUnit(state, actorId);
  if (!actor) return { state, notes: [] };

  switch (effect.type) {
    case 'damage':
      return applyDamage(
        state,
        actor,
        effect.preferBackRow ? pickBackRow(state, actor) : pickEnemy(state, actor, targetId),
        effect,
        rng,
        fromStealth,
        fromSkill,
      );
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
    case 'strip_buff':
      return stripBuff(state, actor, effect, targetId);
    case 'random':
      return applyRandom(state, actorId, effect, targetId, rng, fromStealth, fromSkill);
    case 'shield':
      return applyShield(state, actor, effect);
    case 'extra_turn': {
      const self = { ...actor, extraTurns: (actor.extraTurns ?? 0) + 1 };
      return { state: putUnit(state, self), notes: [`${actor.name} nhận thêm 1 lượt.`] };
    }
    case 'delay_turn':
      return applyDelayTurn(state, actor, targetId);
    case 'mp_cost_mult':
      return applyMpCostMult(state, actor, effect, targetId);
    case 'lock_energy':
      return applyLockEnergy(state, actor, effect, targetId);
    case 'pull_lowest':
      return applyPullLowest(state, actor, effect);
    case 'detonate_frost':
      return applyDetonateFrost(state, actor, targetId, rng);
    case 'swap_hp_pct':
      return applySwapHpPct(state, actor, targetId);
    case 'swap_stat':
      return applySwapStat(state, actor, effect, targetId, rng);
    case 'transfer_debuffs':
      return applyTransferDebuffs(state, actor);
    case 'seal_ultimate':
      return applySealUltimate(state, actor, effect, targetId);
    case 'sacrifice_hp':
      return applySacrificeHp(state, actor, effect, targetId);
    case 'reset_cds':
      return resetCooldowns(state, actor);
    case 'undying':
      return {
        state: putUnit(state, withStatus(actor, { id: 'undying', turns: effect.turns })),
        notes: [`${actor.name} bất tử 1 HP trong ${effect.turns} lượt.`],
      };
    case 'endure':
      return {
        state: putUnit(state, { ...actor, endureUsed: false }),
        notes: [`${actor.name} gieo Hạt Giống Sinh Cơ.`],
      };
    case 'next_skill_evade':
      return {
        state: putUnit(state, withStatus(actor, { id: 'evade_skill', turns: 2 })),
        notes: [`${actor.name} né kỹ năng kế.`],
      };
    case 'evade_basics':
      return {
        state: putUnit(state, withStatus(actor, { id: 'evade_basic', turns: effect.turns })),
        notes: [`${actor.name} né đòn thường ${effect.turns} lượt.`],
      };
    case 'barrier':
      return applyBarrier(state, actor, effect);
    case 'magic_reduce':
      return {
        state: putUnit(state, {
          ...actor,
          magicReducePct: effect.pct,
          magicReduceTurns: effect.turns,
        }),
        notes: [`${actor.name} giảm ${Math.round(effect.pct * 100)}% sát thương kỹ năng.`],
      };
    case 'steal_stat':
      return applyStealStat(state, actor, effect, targetId);
    case 'absorb_def':
      return applyAbsorbDef(state, actor, effect, targetId);
    case 'hp_mp_chant': {
      let chanted: BattleState = {
        ...state,
        chantTurns: effect.turns,
        chantHpPct: effect.hpPct,
        chantMpPct: effect.mpPct,
      };
      for (const unit of [chanted.player, ...chanted.allies].filter((entry) => entry.hp > 0)) {
        chanted = putUnit(
          chanted,
          withStatus(unit, { id: 'regen', turns: effect.turns, power: effect.hpPct, power2: effect.mpPct }),
        );
      }
      return { state: chanted, notes: [`Chuông cầu nguyện ${effect.turns} lượt.`] };
    }
    case 'burn_mp':
      return applyBurnMp(state, actor, effect, targetId);
    case 'convert_def_to_atk':
      return applyConvertDefToAtk(state, actor, effect);
    case 'next_attack_boost':
      return {
        state: putUnit(state, { ...actor, nextAttackBoost: (actor.nextAttackBoost ?? 0) + effect.amount }),
        notes: [`Đòn kế của ${actor.name} +${Math.round(effect.amount * 100)}%.`],
      };
    case 'melee_thorns':
      return {
        state: putUnit(state, {
          ...actor,
          meleeThornsPct: effect.pct,
          meleeThornsTurns: effect.turns,
          meleeThornsBurn: effect.burn,
        }),
        notes: [`${actor.name} kích giáp phản.`],
      };
    case 'enrage_below':
      return maybeEnrage(state, actor, effect);
    case 'trap_cast':
      return applyTrap(state, actor, effect);
    case 'cleanse':
      return applyCleanse(state, actor, effect, targetId);
    case 'frost_stack':
      return applyFrostStack(state, actor, effect, targetId);
    case 'cleanse_target_buffs':
      return applyCleanseTargetBuffs(state, actor, targetId);
    case 'steal_mp':
      return applyStealMp(state, actor, effect, targetId);
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
  fromSkill = false,
): { state: BattleState; notes: string[] } {
  let next = state;
  const notes: string[] = [];
  if (effect.mpSpentPower) {
    const spent = actor.mp;
    const ratio = spent / Math.max(1, actor.maxMp);
    effect = { ...effect, power: (effect.power ?? 1) * (0.4 + 1.6 * ratio) };
    next = putUnit(next, { ...actor, mp: 0 });
    notes.push(`Đốt ${spent} MP.`);
    actor = findUnit(next, actor.id) ?? actor;
  }
  const hits = effect.randomHits
    ? Math.max(1, effect.randomHits[0] + Math.floor(rng() * (effect.randomHits[1] - effect.randomHits[0] + 1)))
    : Math.max(1, effect.hits ?? 1);
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

      const prepared = prepareConvert(next, liveActor, liveTarget, effect);
      next = prepared.state;
      const result = computeHit(
        findUnit(next, liveActor.id) ?? liveActor,
        findUnit(next, liveTarget.id) ?? liveTarget,
        { ...effect, power: prepared.power ?? power },
        rng,
        fromStealth && isPrimary && hit === 0,
        fromSkill,
      );
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

      if (dealt > 0 && effect.tghPct) {
        const chip = Math.max(1, Math.round((damaged.maxTgh || 100) * effect.tghPct));
        let tgh = Math.max(0, (damaged.tgh || damaged.maxTgh || 100) - chip);
        let staggered = damaged.staggered ?? false;
        if (tgh <= 0) {
          staggered = true;
          tgh = damaged.maxTgh || 100;
        }
        damaged = { ...damaged, tgh, staggered };
        notes.push(`TGH ${damaged.name} −${chip}.`);
      }
      if (dealt > 0 && (damaged.shieldHp ?? 0) > 0) {
        damaged = { ...damaged, shieldHp: Math.max(0, (damaged.shieldHp ?? 0) - Math.round((damaged.maxTgh || 100) * (effect.tghPct ?? 0))) };
      }
      next = putUnit(next, {
        ...damaged,
        damageTaken: (damaged.damageTaken ?? 0) + dealt,
      });
      if (dealt > 0 && effect.lifesteal) {
        const heal = Math.max(1, Math.round(dealt * effect.lifesteal));
        const self = findUnit(next, liveActor.id)!;
        next = putUnit(next, { ...self, hp: Math.min(self.maxHp, self.hp + heal) });
        notes.push(`${self.name} hút ${heal} HP.`);
      }
      if (dealt > 0 && (liveActor.meleeThornsTurns ?? 0) <= 0 && (damaged.meleeThornsTurns ?? 0) > 0 && !effect.aoe) {
        const thorn = Math.max(1, Math.round(dealt * (damaged.meleeThornsPct ?? 0.25)));
        const attacker = findUnit(next, liveActor.id)!;
        let hurt: Fighter = { ...attacker, hp: Math.max(0, attacker.hp - thorn), damageTaken: (attacker.damageTaken ?? 0) + thorn };
        if (damaged.meleeThornsBurn) {
          hurt = withStatus(hurt, { id: 'burn', turns: 2, power: 0.05, sourceId: damaged.id });
        }
        next = putUnit(next, hurt);
        notes.push(`Phản giáp ${thorn}.`);
      }
      if (!result.miss && effect.statusOnHit && rng() < effect.statusOnHit.chance) {
        const statusId = (RANDOM_HIT_STATUSES[Math.floor(rng() * RANDOM_HIT_STATUSES.length)] ?? effect.statusOnHit.id) as StatusId;
        const updated = findUnit(next, liveTarget.id);
        if (updated) next = putUnit(next, withStatus(updated, { id: statusId, turns: effect.statusOnHit.turns }));
      }
      if (!result.miss && effect.stunChanceVs?.includes(liveTarget.element) && rng() < 0.3) {
        const updated = findUnit(next, liveTarget.id);
        if (updated) next = putUnit(next, withStatus(updated, { id: 'stun', turns: 1 }));
        notes.push(`${liveTarget.name} choáng.`);
      }
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
  if (effect.killRestore) {
    const slain = primary ? findUnit(next, primary.id) : null;
    if (slain && slain.hp <= 0) {
      const self = findUnit(next, actor.id)!;
      next = putUnit(next, { ...self, mp: self.maxMp, cooldowns: {} });
      notes.push(`${self.name} kết liễu, hồi MP và reset hồi chiêu.`);
    }
  }
  const boosted = findUnit(next, actor.id);
  if (boosted?.nextAttackBoost) {
    next = putUnit(next, { ...boosted, nextAttackBoost: 0 });
  }
  return { state: next, notes };
}

function prepareConvert(
  state: BattleState,
  actor: Fighter,
  target: Fighter,
  effect: Extract<SkillEffect, { type: 'damage' }>,
): { state: BattleState; power?: number } {
  if (!effect.convertBuffsToDamage) return { state };
  const buffs = (target.mods ?? []).filter((mod) => mod.amount > 0);
  const shield = target.shieldHp ?? 0;
  const converted = shield + buffs.length * Math.max(8, Math.round(actor.attack * 0.25));
  const stripped: Fighter = {
    ...target,
    shieldHp: 0,
    mods: (target.mods ?? []).filter((mod) => mod.amount <= 0),
  };
  return {
    state: putUnit(state, stripped),
    power: Math.max(effect.power ?? 1, converted / Math.max(1, actor.attack)),
  };
}

function computeHit(
  attacker: Fighter,
  defender: Fighter,
  effect: Extract<SkillEffect, { type: 'damage' }>,
  rng: () => number,
  fromStealth: boolean,
  fromSkill = false,
): { damage: number; miss: boolean; crit: boolean; staggered: boolean; target: Fighter } {
  if (hasStatus(defender, 'nullify')) {
    const left = (getStatus(defender, 'nullify')?.turns ?? 1) > 0;
    if (left) {
      return {
        damage: 0,
        miss: true,
        crit: false,
        staggered: false,
        target: {
          ...defender,
          statuses: (defender.statuses ?? []).filter((entry) => entry.id !== 'nullify'),
        },
      };
    }
  }
  if (fromSkill && hasStatus(defender, 'evade_skill')) {
    return {
      damage: 0,
      miss: true,
      crit: false,
      staggered: false,
      target: { ...defender, statuses: (defender.statuses ?? []).filter((entry) => entry.id !== 'evade_skill') },
    };
  }
  if (!fromSkill && hasStatus(defender, 'evade_basic')) {
    return { damage: 0, miss: true, crit: false, staggered: false, target: defender };
  }
  if (hasStatus(defender, 'veil') && rng() < (getStatus(defender, 'veil')?.power ?? 0.5)) {
    return { damage: 0, miss: true, crit: false, staggered: false, target: defender };
  }

  let power = effect.power ?? 1;
  const hpRatio = defender.maxHp > 0 ? defender.hp / defender.maxHp : 1;
  if (effect.ifHpAbove != null && hpRatio > effect.ifHpAbove) power += effect.bonusPower ?? 0;
  if (effect.ifHpBelow != null && hpRatio < effect.ifHpBelow) power *= effect.finishMult ?? 1;
  if (effect.ifDebuffedBonus && hasDebuff(defender)) power += effect.ifDebuffedBonus;
  if (fromStealth) power += effect.fromStealthBonus ?? 0.5;
  if (effect.ifDefGreaterMult && (attacker.defense || 0) > (defender.defense || 0)) power *= effect.ifDefGreaterMult;
  if (effect.ifSlowBonus && (hasStatus(defender, 'slow') || modSum(defender, 'spd') < 0)) power += effect.ifSlowBonus;
  if (effect.ifCasterHpGreater && attacker.hp > defender.hp) power += effect.ifCasterHpGreater;
  if (effect.missingTargetHpStep && effect.missingTargetHpBonus) {
    const missing = Math.max(0, 1 - hpRatio);
    power += Math.floor(missing / effect.missingTargetHpStep) * effect.missingTargetHpBonus;
  }
  if (attacker.nextAttackBoost) power *= 1 + attacker.nextAttackBoost;

  const atkMods = modSum(attacker, 'atk');
  const defMods = modSum(defender, 'def');
  const critMods = modSum(attacker, 'critRate');
  const critDmgMods = modSum(attacker, 'critDamage');
  const accMods = modSum(attacker, 'acc');
  const evaMods = modSum(defender, 'eva');
  const armPenMods = modSum(attacker, 'armPen');

  let attack = (attacker.attack || 0) * (1 + atkMods) * burnAttackMultiplier(attacker);
  if (effect.scaleFromDef) attack = (attacker.defense || 0) * (1 + modSum(attacker, 'def'));
  if (effect.scaleFromTargetAtk) attack = (defender.attack || 0) * effect.scaleFromTargetAtk;
  if (effect.missingHpPower != null) {
    const missing = Math.max(0, attacker.maxHp - attacker.hp);
    const raw = Math.max(1, Math.round(missing * effect.missingHpPower));
    return { damage: raw, miss: false, crit: false, staggered: false, target: takeHit(defender, raw, fromSkill) };
  }
  if (effect.damageTakenPower != null) {
    const raw = Math.max(1, Math.round((attacker.damageTaken ?? 0) * effect.damageTakenPower));
    return { damage: raw, miss: false, crit: false, staggered: false, target: takeHit(defender, raw, fromSkill) };
  }

  const mark = getStatus(defender, 'mark');
  let armPen = (attacker.armPen || 0) + (effect.armPenBonus ?? 0) + armPenMods + (mark?.power2 ?? 0);
  let critRate = (attacker.critRate || 0) + (effect.critRateBonus ?? 0) + critMods + (mark?.power ?? 0);
  // Critical Mark: guarantee the next landed strike is a crit, then consume.
  if (mark) critRate = 1;
  if (defender.critBlockTurns && defender.critBlockTurns > 0) critRate = 0;

  const acc = Math.max(0.05, ((attacker.acc || 0.9) + accMods) * accuracyMultiplier(attacker));
  const eva = Math.max(0, (defender.eva || 0) + evaMods);
  let defense = Math.max(0, (defender.defense || 0) * (1 + defMods));
  if (defender.staggered) defense = Math.round(defense * 0.5);

  const ignoreDef = Boolean(effect.trueDamage || effect.bypassDefVs?.includes(defender.element));
  if (ignoreDef) {
    const raw = Math.max(1, Math.round(attack * power));
    let target = takeHit(defender, raw, fromSkill);
    if (mark) target = { ...target, statuses: (target.statuses ?? []).filter((entry) => entry.id !== 'mark') };
    return { damage: raw, miss: false, crit: Boolean(mark), staggered: false, target };
  }

  const slowCrit = effect.ifSlowCritDamage && (hasStatus(defender, 'slow') || modSum(defender, 'spd') < 0) ? effect.ifSlowCritDamage : 0;
  const hit = finalDamage({
    attack,
    multiplier: power,
    critRate,
    critDamage: (attacker.critDamage || 1.5) + critDmgMods + (effect.critDamageBonus ?? 0) + slowCrit,
    attackerElement: attacker.element,
    defenderElement: defender.element,
    defense,
    armPen,
    acc,
    eva,
    hitRoll: rng(),
    critRoll: rng(),
  });

  let dealt = hit.miss ? 0 : hit.damage;
  if (!hit.miss && effect.defBonus) {
    const casterDef = (attacker.defense || 0) * (1 + modSum(attacker, 'def'));
    dealt += Math.max(0, Math.round(casterDef * effect.defBonus));
  }
  let target = takeHit(defender, dealt, fromSkill);
  if (!hit.miss && mark) {
    target = { ...target, statuses: (target.statuses ?? []).filter((entry) => entry.id !== 'mark') };
  }
  return { damage: dealt, miss: hit.miss, crit: hit.crit, staggered: false, target };
}

function takeHit(defender: Fighter, dealt: number, fromSkill: boolean): Fighter {
  let remaining = Math.max(0, dealt);
  let shield = defender.shieldHp ?? 0;
  if (shield > 0 && remaining > 0) {
    const absorb = Math.min(shield, remaining);
    shield -= absorb;
    remaining -= absorb;
  }
  if (fromSkill && remaining > 0 && (defender.magicReduceTurns ?? 0) > 0) {
    remaining = Math.max(0, Math.round(remaining * (1 - (defender.magicReducePct ?? 0))));
  }
  if (remaining > 0 && hasStatus(defender, DEFEND_STATUS_ID)) {
    remaining = Math.max(0, Math.round(remaining * DEFEND_DAMAGE_MULT));
  }
  let hp = defender.hp - remaining;
  let endureUsed = defender.endureUsed;
  if (hp <= 0 && hasStatus(defender, 'undying')) hp = 1;
  if (hp <= 0 && endureUsed === false) {
    hp = 1;
    endureUsed = true;
  }
  return { ...defender, hp: Math.max(0, hp), shieldHp: shield, endureUsed };
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
      if (effect.cleanse.includes('all_debuff')) {
        healed = withStatus(healed, { id: 'cleanse_flash', turns: 1 });
      }
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
    if (hasStatus(live, 'energy_lock')) {
      notes.push(`${live.name} bị khóa năng lượng.`);
      continue;
    }
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
  const statusId = effect.id as StatusId;
  const defaults = resolveStatusDefaults(statusId, effect.turns, effect.power);
  const targets = resolveStatusTargets(next, actor, effect, targetId);
  for (const unit of targets) {
    const live = findUnit(next, unit.id) ?? unit;
    if (hasStatus(live, 'immunity') && DEBUFF_IDS.includes(statusId)) {
      notes.push(`${live.name} miễn nhiễm.`);
      continue;
    }
    // Stun Immunity also hard-blocks stun/freeze even if a future skill bypasses the DEBUFF list.
    if (hasStatus(live, 'immunity') && (statusId === 'stun' || statusId === 'freeze')) {
      notes.push(`${live.name} miễn nhiễm khống chế.`);
      continue;
    }
    const roll = resolveStatusApplication(effect.chance, defaults.turns, live.res || 0, rng());
    if (!roll.applied) {
      notes.push(`${live.name} kháng hiệu ứng.`);
      continue;
    }
    let tagged = withStatus(live, {
      id: statusId,
      turns: roll.duration,
      power: statusId === 'curse_doom' ? live.damageTaken ?? 0 : defaults.power,
      sourceId: actor.id,
    });
    tagged = syncStatusSecondaryMods(tagged, statusId, roll.duration, defaults.power);
    next = putUnit(next, tagged);
    if (statusId === 'slow' || statusId === 'spd_zero') {
      next = delayUnitInOrder(next, tagged.id);
    }
    notes.push(`${tagged.name} dính ${statusId} (${roll.duration}).`);
  }
  return { state: next, notes };
}

/** Pair lasting statuses with the stat mods the damage pipeline already reads. */
function syncStatusSecondaryMods(
  fighter: Fighter,
  statusId: StatusId,
  turns: number,
  power?: number,
): Fighter {
  const mods = [...(fighter.mods ?? [])];
  const push = (stat: ModStat, amount: number, id: string) => {
    mods.push({ id, stat, amount, turns });
  };
  if (statusId === 'blind' && !(mods.some((mod) => mod.stat === 'acc' && mod.amount < 0))) {
    push('acc', -(power ?? 0.3), `status-blind-${turns}`);
  }
  if (statusId === 'slow' && !(mods.some((mod) => mod.stat === 'spd' && mod.amount < 0))) {
    push('spd', -(power ?? 0.3), `status-slow-${turns}`);
  }
  if (statusId === 'burn' && !(mods.some((mod) => mod.stat === 'atk' && mod.amount < 0))) {
    push('atk', -0.2, `status-burn-atk-${turns}`);
  }
  if (statusId === 'atk_down') push('atk', -(power ?? 0.22), `status-atk-down-${turns}`);
  if (statusId === 'def_down') push('def', -(power ?? 0.35), `status-def-down-${turns}`);
  if (statusId === 'atk_up') push('atk', power ?? 0.4, `status-atk-up-${turns}`);
  if (statusId === 'def_up') push('def', power ?? 0.35, `status-def-up-${turns}`);
  if (statusId === 'spd_up') push('spd', power ?? 0.5, `status-spd-up-${turns}`);
  return mods.length === (fighter.mods ?? []).length ? fighter : { ...fighter, mods };
}

function delayUnitInOrder(state: BattleState, unitId: string): BattleState {
  if (!state.order.includes(unitId)) return state;
  const rest = state.order.filter((id) => id !== unitId);
  return { ...state, order: [...rest, unitId] };
}

function mirrorModStatus(stat: ModStat, amount: number, turns: number): StatusEntry | null {
  if (stat === 'atk' && amount > 0) return { id: 'atk_up', turns, power: amount };
  if (stat === 'atk' && amount < 0) return { id: 'atk_down', turns, power: Math.abs(amount) };
  if (stat === 'def' && amount > 0) return { id: 'def_up', turns, power: amount };
  if (stat === 'def' && amount < 0) return { id: 'def_down', turns, power: Math.abs(amount) };
  if (stat === 'spd' && amount > 0) return { id: 'spd_up', turns, power: amount };
  if (stat === 'spd' && amount < 0) return { id: 'slow', turns, power: Math.abs(amount) };
  if (stat === 'acc' && amount < 0) return { id: 'blind', turns, power: Math.abs(amount) };
  return null;
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
    const live = findUnit(next, unit.id) ?? unit;
    const mod: StatMod = {
      id: `${effect.stat}-${Date.now()}-${Math.floor(rng() * 9999)}`,
      stat: effect.stat,
      amount: effect.amount,
      turns: effect.turns,
    };
    let tagged: Fighter = { ...live, mods: [...(live.mods ?? []), mod] };
    const mirror = mirrorModStatus(effect.stat, effect.amount, effect.turns);
    if (mirror) tagged = withStatus(tagged, mirror);
    if (effect.stat === 'spd' && effect.amount < 0) next = delayUnitInOrder(next, tagged.id);
    next = putUnit(next, tagged);
    notes.push(`${tagged.name} ${effect.stat} ${effect.amount >= 0 ? '+' : ''}${Math.round(effect.amount * 100)}%.`);
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

function stripBuff(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'strip_buff' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  const count = Math.max(1, effect.count ?? 1);
  const buffs = (foe.mods ?? []).filter((mod) => mod.stat === effect.stat && mod.amount > 0);
  if (!buffs.length) return { state, notes: [`${foe.name} không có buff ${effect.stat}.`] };
  const stripped = buffs.slice(0, count);
  const remove = new Set(stripped.map((mod) => mod.id));
  return {
    state: putUnit(state, { ...foe, mods: (foe.mods ?? []).filter((mod) => !remove.has(mod.id)) }),
    notes: [`Gỡ buff ${effect.stat} của ${foe.name}.`],
  };
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

function applyShield(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'shield' }>,
): { state: BattleState; notes: string[] } {
  const shield = Math.max(1, Math.round(actor.maxHp * effect.pctMax));
  return {
    state: putUnit(state, { ...actor, shieldHp: (actor.shieldHp ?? 0) + shield }),
    notes: [`${actor.name} tạo khiên ${shield} HP.`],
  };
}

function applyDelayTurn(
  state: BattleState,
  actor: Fighter,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: ['Hãy chọn mục tiêu.'] };
  const rest = state.order.filter((id) => id !== foe.id);
  return {
    state: putUnit({ ...state, order: [...rest, foe.id] }, { ...foe, delayed: true, statuses: [...(foe.statuses ?? []).filter((entry) => entry.id !== 'delayed'), { id: 'delayed', turns: 1 }] }),
    notes: [`${foe.name} bị đẩy xuống cuối lượt.`],
  };
}

function applyMpCostMult(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'mp_cost_mult' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  return {
    state: putUnit(
      state,
      withStatus({ ...foe, mpCostMult: effect.amount }, { id: 'thirst', turns: effect.turns, power: effect.amount }),
    ),
    notes: [`${foe.name} tốn ×${effect.amount} MP trong ${effect.turns} lượt.`],
  };
}

function applyLockEnergy(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'lock_energy' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  let next = withStatus(foe, { id: 'energy_lock', turns: effect.turns });
  if (effect.blockItems) next = withStatus(next, { id: 'item_lock', turns: effect.turns });
  return { state: putUnit(state, next), notes: [`Khóa năng lượng ${foe.name}.`] };
}

function applyPullLowest(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'pull_lowest' }>,
): { state: BattleState; notes: string[] } {
  const pool = opponentsOf(state, actor).filter((unit) => unit.hp > 0);
  if (!pool.length) return { state, notes: [] };
  const weakest = [...pool].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.id.localeCompare(b.id))[0];
  const others = pool.filter((unit) => unit.id !== weakest.id);
  const foes = actor.side === 'wild' ? state.foes : [weakest, ...others];
  let next: BattleState = actor.side === 'wild' ? state : { ...state, foes };
  next = putUnit(next, {
    ...weakest,
    mods: [...(weakest.mods ?? []), { id: `pull-def`, stat: 'def' as ModStat, amount: -effect.defAmount, turns: effect.turns }],
  });
  return { state: next, notes: [`Kéo ${weakest.name} ra hàng trước. DEF −${Math.round(effect.defAmount * 100)}%.`] };
}

function applyDetonateFrost(
  state: BattleState,
  actor: Fighter,
  targetId: string | null,
  rng: () => number,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  const stacks = Math.max(1, Math.round(getStatus(foe, 'frost')?.power ?? 0));
  const power = 0.35 * stacks;
  const cleared = { ...foe, statuses: (foe.statuses ?? []).filter((entry) => entry.id !== 'frost') };
  const next = putUnit(state, cleared);
  return applyDamage(next, actor, findUnit(next, foe.id) ?? cleared, { type: 'damage', power, trueDamage: true }, rng, false, true);
}

function applySwapHpPct(
  state: BattleState,
  actor: Fighter,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  const selfPct = actor.maxHp > 0 ? actor.hp / actor.maxHp : 0;
  const foePct = foe.maxHp > 0 ? foe.hp / foe.maxHp : 0;
  let next = putUnit(state, { ...actor, hp: Math.max(1, Math.round(actor.maxHp * foePct)) });
  next = putUnit(next, { ...foe, hp: Math.max(1, Math.round(foe.maxHp * selfPct)) });
  return { state: next, notes: [`${actor.name} và ${foe.name} đổi % HP.`] };
}

function applySwapStat(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'swap_stat' }>,
  targetId: string | null,
  rng: () => number,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  const stat = effect.stats[Math.floor(rng() * effect.stats.length)] ?? 'atk';
  const selfVal = stat === 'atk' ? actor.attack : actor.defense;
  const foeVal = stat === 'atk' ? foe.attack : foe.defense;
  const selfRatio = (foeVal - selfVal) / Math.max(1, selfVal);
  const foeRatio = (selfVal - foeVal) / Math.max(1, foeVal);
  let next = putUnit(state, {
    ...actor,
    mods: [...(actor.mods ?? []), { id: `swap-self-${stat}`, stat, amount: selfRatio, turns: 2 }],
  });
  next = putUnit(next, {
    ...foe,
    mods: [...(foe.mods ?? []), { id: `swap-foe-${stat}`, stat, amount: foeRatio, turns: 2 }],
  });
  return { state: next, notes: [`Tráo ${stat} với ${foe.name}.`] };
}

function applyTransferDebuffs(state: BattleState, actor: Fighter): { state: BattleState; notes: string[] } {
  const debuffs = (actor.statuses ?? []).filter((entry) => DEBUFF_IDS.includes(entry.id));
  let next = putUnit(state, { ...actor, statuses: (actor.statuses ?? []).filter((entry) => !DEBUFF_IDS.includes(entry.id)) });
  for (const foe of opponentsOf(next, actor).filter((unit) => unit.hp > 0)) {
    let live = findUnit(next, foe.id)!;
    for (const debuff of debuffs) live = withStatus(live, { ...debuff });
    next = putUnit(next, live);
  }
  return { state: next, notes: [`Chuyển ${debuffs.length} debuff sang địch.`] };
}

function applySealUltimate(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'seal_ultimate' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  return {
    state: putUnit(state, withStatus(foe, { id: 'sealed', turns: effect.turns })),
    notes: [`Phong ấn ultimate của ${foe.name}.`],
  };
}

function applySacrificeHp(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'sacrifice_hp' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const unit =
    effect.target === 'ally'
      ? (targetId ? findUnit(state, targetId) : null) ??
        state.allies.filter((entry) => entry.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
      : actor;
  if (!unit || unit.hp <= 0) return { state, notes: ['Không có mục tiêu hiến tế.'] };
  const loss = effect.pctCurrent
    ? Math.max(1, Math.round(unit.hp * effect.pctCurrent))
    : Math.max(1, Math.round(unit.maxHp * (effect.pctMax ?? 0.2)));
  return {
    state: putUnit(state, { ...unit, hp: Math.max(1, unit.hp - loss) }),
    notes: [`${unit.name} hiến ${loss} HP.`],
  };
}

function resetCooldowns(state: BattleState, actor: Fighter): { state: BattleState; notes: string[] } {
  return { state: putUnit(state, { ...actor, cooldowns: {} }), notes: [`Reset hồi chiêu ${actor.name}.`] };
}

function applyBarrier(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'barrier' }>,
): { state: BattleState; notes: string[] } {
  let next = state;
  const pool = effect.target === 'party' ? [next.player, ...next.allies] : [actor];
  for (const unit of pool.filter((entry) => entry.hp > 0)) {
    next = putUnit(next, withStatus(unit, { id: 'nullify', turns: 2 }));
  }
  return { state: next, notes: ['Rào chắn thánh kích hoạt.'] };
}

function applyStealStat(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'steal_stat' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  let next = putUnit(state, {
    ...foe,
    mods: [...(foe.mods ?? []), { id: `steal-${effect.stat}`, stat: effect.stat, amount: -effect.pct, turns: effect.turns }],
  });
  const self = findUnit(next, actor.id)!;
  const base = effect.stat === 'atk' ? Math.max(1, self.attack) : Math.max(1, self.defense);
  const stolen = ((effect.stat === 'atk' ? foe.attack : foe.defense) * effect.pct) / base;
  next = putUnit(next, {
    ...self,
    mods: [...(self.mods ?? []), { id: `gain-${effect.stat}`, stat: effect.stat, amount: stolen, turns: effect.turns }],
  });
  return { state: next, notes: [`Hấp thụ ${Math.round(effect.pct * 100)}% ${effect.stat} từ ${foe.name}.`] };
}

function applyAbsorbDef(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'absorb_def' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  const reduced = foe.defense * effect.defAmount;
  let next = putUnit(state, {
    ...foe,
    mods: [...(foe.mods ?? []), { id: 'absorb-def', stat: 'def' as ModStat, amount: -effect.defAmount, turns: effect.turns }],
  });
  const self = findUnit(next, actor.id)!;
  const atkGain = (reduced * effect.absorb) / Math.max(1, self.attack);
  next = putUnit(next, {
    ...self,
    mods: [...(self.mods ?? []), { id: 'absorb-atk', stat: 'atk' as ModStat, amount: atkGain, turns: effect.turns }],
  });
  return { state: next, notes: [`${foe.name} −${Math.round(effect.defAmount * 100)}% DEF. ${self.name} hấp thụ ATK.`] };
}

function applyBurnMp(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'burn_mp' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  const burn = Math.max(1, Math.round(foe.mp * (effect.pct ?? 1)));
  return { state: putUnit(state, { ...foe, mp: Math.max(0, foe.mp - burn) }), notes: [`Đốt ${burn} MP của ${foe.name}.`] };
}

function applyConvertDefToAtk(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'convert_def_to_atk' }>,
): { state: BattleState; notes: string[] } {
  const shifted = (actor.defense * effect.pct) / Math.max(1, actor.attack);
  return {
    state: putUnit(
      state,
      withStatus(
        {
          ...actor,
          mods: [
            ...(actor.mods ?? []),
            { id: 'shift-atk', stat: 'atk' as ModStat, amount: shifted, turns: effect.turns },
            { id: 'shift-def', stat: 'def' as ModStat, amount: -effect.pct, turns: effect.turns },
          ],
        },
        { id: 'stat_convert', turns: effect.turns, power: effect.pct },
      ),
    ),
    notes: [`${actor.name} đổi ${Math.round(effect.pct * 100)}% DEF thành ATK.`],
  };
}

function maybeEnrage(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'enrage_below' }>,
): { state: BattleState; notes: string[] } {
  if (actor.enraged || actor.maxHp <= 0 || actor.hp / actor.maxHp >= effect.hpPct) {
    return { state, notes: [`${actor.name} chờ Cuồng Nộ khi HP dưới ${Math.round(effect.hpPct * 100)}%.`] };
  }
  return {
    state: putUnit(state, {
      ...actor,
      enraged: true,
      mods: [
        ...(actor.mods ?? []),
        { id: 'enrage-atk', stat: 'atk' as ModStat, amount: effect.atk, turns: 9 },
        { id: 'enrage-crit', stat: 'critRate' as ModStat, amount: effect.crit, turns: 9 },
      ],
    }),
    notes: [`${actor.name} cuồng nộ.`],
  };
}

function applyTrap(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'trap_cast' }>,
): { state: BattleState; notes: string[] } {
  let next = state;
  for (const foe of opponentsOf(state, actor).filter((unit) => unit.hp > 0)) {
    next = putUnit(next, { ...foe, trapTurns: effect.turns, trapPct: effect.pct });
  }
  return { state: next, notes: ['Bão cát gài bẫy.'] };
}

function applyCleanse(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'cleanse' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const unit =
    effect.target === 'ally'
      ? (targetId ? findUnit(state, targetId) : null) ?? actor
      : actor;
  const debuffs = (unit.statuses ?? []).filter((entry) => DEBUFF_IDS.includes(entry.id));
  const drop = new Set(debuffs.slice(0, effect.count ?? 1).map((entry) => entry.id));
  const cleared = {
    ...unit,
    statuses: (unit.statuses ?? []).filter((entry) => !drop.has(entry.id)),
    mods: (unit.mods ?? []).filter((mod) => mod.amount >= 0 || !drop.size),
  };
  return {
    state: putUnit(state, withStatus(cleared, { id: 'cleanse_flash', turns: 1 })),
    notes: [`Gỡ ${drop.size} debuff khỏi ${unit.name}.`],
  };
}

function applyFrostStack(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'frost_stack' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  const current = getStatus(foe, 'frost')?.power ?? 0;
  return {
    state: putUnit(state, withStatus(foe, { id: 'frost', turns: 4, power: current + (effect.stacks ?? 1) })),
    notes: [`${foe.name} +${effect.stacks ?? 1} tầng băng.`],
  };
}

function applyCleanseTargetBuffs(
  state: BattleState,
  actor: Fighter,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  return {
    state: putUnit(state, { ...foe, mods: (foe.mods ?? []).filter((mod) => mod.amount < 0), shieldHp: 0 }),
    notes: [`Xóa buff của ${foe.name}.`],
  };
}

function applyStealMp(
  state: BattleState,
  actor: Fighter,
  effect: Extract<SkillEffect, { type: 'steal_mp' }>,
  targetId: string | null,
): { state: BattleState; notes: string[] } {
  const foe = pickEnemy(state, actor, targetId);
  if (!foe) return { state, notes: [] };
  const steal = Math.max(1, Math.round(foe.mp * effect.pct));
  let next = putUnit(state, { ...foe, mp: Math.max(0, foe.mp - steal) });
  const self = findUnit(next, actor.id)!;
  next = putUnit(next, { ...self, mp: Math.min(self.maxMp, self.mp + steal) });
  return { state: next, notes: [`Cướp ${steal} MP từ ${foe.name}.`] };
}

function applyRandom(
  state: BattleState,
  actorId: string,
  effect: Extract<SkillEffect, { type: 'random' }>,
  targetId: string | null,
  rng: () => number,
  fromStealth: boolean,
  fromSkill = false,
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
    const applied = applyEffect(next, actorId, child, targetId, rng, fromStealth, fromSkill);
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
  if ((next.chantTurns ?? 0) > 0) {
    const hpPct = next.chantHpPct ?? 0.1;
    const mpPct = next.chantMpPct ?? 0.1;
    for (const unit of [next.player, ...next.allies].filter((entry) => entry.hp > 0)) {
      const live = findUnit(next, unit.id)!;
      if (hasStatus(live, 'energy_lock')) {
        next = putUnit(next, { ...live, hp: Math.min(live.maxHp, live.hp + Math.max(1, Math.round(live.maxHp * hpPct))) });
        continue;
      }
      next = putUnit(next, {
        ...live,
        hp: Math.min(live.maxHp, live.hp + Math.max(1, Math.round(live.maxHp * hpPct))),
        mp: Math.min(live.maxMp, live.mp + Math.max(1, Math.round(live.maxMp * mpPct))),
      });
    }
  }
  const fighter = findUnit(next, fighterId);
  if (!fighter) return next;
  // Phòng thủ ends at the start of this unit's next action turn.
  let liveFighter = fighter;
  if (hasStatus(fighter, DEFEND_STATUS_ID)) {
    liveFighter = {
      ...fighter,
      statuses: (fighter.statuses ?? []).filter((entry) => entry.id !== DEFEND_STATUS_ID),
    };
    next = putUnit(next, liveFighter);
  }
  let hp = liveFighter.hp;
  let mp = liveFighter.mp;
  let shield = liveFighter.shieldHp ?? 0;
  for (const status of liveFighter.statuses ?? []) {
    if ((status.id === 'poison' || status.id === 'bleed' || status.id === 'burn' || status.id === 'miasma') && status.power) {
      hp = Math.max(0, hp - Math.max(1, Math.round(fighter.maxHp * status.power)));
    }
    if (status.id === 'regen' && status.power) {
      hp = Math.min(fighter.maxHp, hp + Math.max(1, Math.round(fighter.maxHp * status.power)));
      if (status.power2) {
        mp = Math.min(fighter.maxMp, mp + Math.max(1, Math.round(fighter.maxMp * status.power2)));
      }
    }
    if (status.id === 'quicksand' && shield > 0) {
      shield = Math.max(0, shield - Math.max(1, Math.round((fighter.maxHp || 1) * 0.1)));
    }
  }
  if (hp <= 0 && hasStatus(liveFighter, 'undying')) hp = 1;
  if (hp <= 0 && liveFighter.endureUsed === false) hp = 1;
  let updated: Fighter =
    hp !== liveFighter.hp || mp !== liveFighter.mp || shield !== (liveFighter.shieldHp ?? 0)
      ? { ...liveFighter, hp, mp, shieldHp: shield }
      : liveFighter;
  if (!updated.enraged && updated.element === 'volcano' && updated.maxHp > 0 && updated.hp / updated.maxHp < 0.3) {
    updated = {
      ...updated,
      enraged: true,
      mods: [
        ...(updated.mods ?? []),
        { id: 'enrage-atk', stat: 'atk', amount: 0.5, turns: 9 },
        { id: 'enrage-crit', stat: 'critRate', amount: 0.3, turns: 9 },
      ],
    };
  }
  if (updated !== liveFighter) next = putUnit(next, updated);
  return next;
}

export function tickFighterTimers<T extends EffectFighter>(fighter: T): T {
  let hp = fighter.hp;
  const curse = (fighter.statuses ?? []).find((entry) => entry.id === 'curse_doom' && entry.turns <= 1);
  if (curse) {
    const lost = Math.max(0, (fighter.damageTaken ?? 0) - (curse.power ?? 0));
    hp = Math.max(hasStatus(fighter, 'undying') || fighter.endureUsed === false ? 1 : 0, hp - Math.round(lost * 0.3));
  }
  const mods = (fighter.mods ?? [])
    .map((mod) => ({ ...mod, turns: mod.turns - 1 }))
    .filter((mod) => mod.turns > 0);
  const statuses = (fighter.statuses ?? [])
    .map((entry) => (entry.id === DEFEND_STATUS_ID ? entry : { ...entry, turns: entry.turns - 1 }))
    .filter((entry) => entry.turns > 0);
  return {
    ...fighter,
    hp,
    mods,
    statuses,
    stealthTurns: Math.max(0, (fighter.stealthTurns ?? 0) - 1),
    tauntTurns: Math.max(0, (fighter.tauntTurns ?? 0) - 1),
    guardTurns: Math.max(0, (fighter.guardTurns ?? 0) - 1),
    critBlockTurns: Math.max(0, (fighter.critBlockTurns ?? 0) - 1),
    magicReduceTurns: Math.max(0, (fighter.magicReduceTurns ?? 0) - 1),
    meleeThornsTurns: Math.max(0, (fighter.meleeThornsTurns ?? 0) - 1),
    trapTurns: Math.max(0, (fighter.trapTurns ?? 0) - 1),
    mpCostMult: (fighter.mpCostMult ?? 1) > 1 && !hasStatus({ ...fighter, statuses }, 'thirst') ? 1 : fighter.mpCostMult,
    delayed: statuses.some((entry) => entry.id === 'delayed') ? fighter.delayed : false,
  };
}

export function shouldSkipTurn(fighter: Fighter): string | null {
  if (fighter.staggered) return 'gục ngã';
  if ((fighter.shieldHp ?? 0) > 0 && (hasStatus(fighter, 'stun') || hasStatus(fighter, 'immunity'))) {
    if (hasStatus(fighter, 'freeze')) return 'bị khống chế';
    if (hasStatus(fighter, 'spd_zero')) return 'tốc độ = 0';
    return null;
  }
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

/** Front row is the first living opponent; back row is the last living one (pets behind the hero). */
function pickBackRow(state: BattleState, actor: Fighter): Fighter | null {
  const pool = opponentsOf(state, actor).filter((unit) => unit.hp > 0 && (unit.stealthTurns ?? 0) <= 0);
  if (!pool.length) return null;
  if (actor.side === 'wild') {
    const pets = pool.filter((unit) => unit.side === 'ally');
    return pets[pets.length - 1] ?? pool[pool.length - 1] ?? null;
  }
  return pool[pool.length - 1] ?? null;
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
