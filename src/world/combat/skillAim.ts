import type { Skill } from './model';
import { CLASS_KITS } from './characterSkills';
import { BIOME_KITS } from './biomeSkills';
import { LOCOMOTION_KITS } from './petSkills';
import { lowestHpId, type QuickTargetUnit } from '../../hooks/useQuickTarget';

const BASIC_ATTACK: Skill = {
  id: 'attack',
  name: 'Đánh thường',
  mana: 0,
  power: 1,
  cooldown: 0,
  target: 'enemy',
  effects: [{ type: 'damage', power: 1 }],
};

let skillIndex: Map<string, Skill> | null = null;

function skillsById(): Map<string, Skill> {
  if (skillIndex) return skillIndex;
  const index = new Map<string, Skill>();
  for (const kit of Object.values(CLASS_KITS)) {
    for (const skill of [...kit.basics, ...kit.skills]) index.set(skill.id, skill);
  }
  for (const kit of Object.values(BIOME_KITS)) {
    for (const skill of kit) index.set(skill.id, skill);
  }
  for (const kit of Object.values(LOCOMOTION_KITS)) {
    for (const skill of kit.basics) index.set(skill.id, skill);
  }
  skillIndex = index;
  return index;
}

/** Full skill record for ring aims. Basic attacks fall back to a single-enemy strike. */
export function skillById(id: string | null | undefined): Skill | null {
  if (!id || id === 'attack') return id === 'attack' ? BASIC_ATTACK : null;
  return skillsById().get(id) ?? null;
}

export type AimSpan = 'none' | 'one' | 'many';

export type SkillAim = {
  ally: AimSpan;
  enemy: AimSpan;
  /** Ally rings stay on pets when the skill never names the hero. */
  petsOnly: boolean;
  /** When many, ring this many weakest units. Null rings the whole pool. */
  allyCount: number | null;
  enemyCount: number | null;
};

const ALLY_ONE = new Set(['ally', 'ally_pet', 'ally_lowest']);
const ALLY_MANY = new Set(['party', 'party_pets', 'party_lowest_two']);
const ENEMY_ONE = new Set(['enemy', 'enemy_back']);
const ENEMY_MANY = new Set(['enemies', 'enemy_pets', 'enemies_top_hp']);
const PET_ALLY = new Set(['ally_pet', 'party_pets']);

function widen(current: AimSpan, next: AimSpan): AimSpan {
  if (current === 'many' || next === 'many') return 'many';
  if (current === 'one' || next === 'one') return 'one';
  return 'none';
}

/** Who a skill paints underfoot: allies, enemies, both, or only the acting unit. */
export function skillAim(skill: Skill | null | undefined): SkillAim {
  const empty: SkillAim = { ally: 'none', enemy: 'none', petsOnly: false, allyCount: null, enemyCount: null };
  if (!skill) return empty;
  let ally: AimSpan = 'none';
  let enemy: AimSpan = 'none';
  let sawAlly = false;
  let sawNonPet = false;
  let allyCount: number | null = null;
  let enemyCount: number | null = null;
  const noteAlly = (token: string | undefined) => {
    if (!token || (!ALLY_ONE.has(token) && !ALLY_MANY.has(token))) return;
    sawAlly = true;
    if (!PET_ALLY.has(token)) sawNonPet = true;
    if (token === 'party_lowest_two') allyCount = allyCount ?? 2;
    ally = widen(ally, ALLY_MANY.has(token) ? 'many' : 'one');
  };
  const noteEnemy = (token: string | undefined, count?: number) => {
    if (!token || (!ENEMY_ONE.has(token) && !ENEMY_MANY.has(token))) return;
    if (token === 'enemies_top_hp' && count && count > 1) enemyCount = enemyCount ?? count;
    enemy = widen(enemy, ENEMY_MANY.has(token) ? 'many' : 'one');
  };
  noteAlly(skill.target);
  noteEnemy(skill.target);
  for (const effect of skill.effects ?? []) {
    const target = 'target' in effect && typeof effect.target === 'string' ? effect.target : undefined;
    const count = 'count' in effect && typeof effect.count === 'number' ? effect.count : undefined;
    noteAlly(target);
    noteEnemy(target, count);
    const aoe = 'aoe' in effect && typeof effect.aoe === 'string' ? effect.aoe : undefined;
    if (aoe === 'enemies' || aoe === 'enemy_pets' || aoe === 'all') enemy = 'many';
    if (effect.type === 'damage' && !aoe) enemy = widen(enemy, 'one');
  }
  if ((ally as AimSpan) !== 'many') allyCount = null;
  if ((enemy as AimSpan) !== 'many') enemyCount = null;
  if (skill.target == null && ally === 'none' && enemy === 'none' && skill.power > 0) enemy = 'one';
  return { ally, enemy, petsOnly: sawAlly && !sawNonPet, allyCount, enemyCount };
}

export type AimBody = { id: string; hp: number; maxHp: number; name?: string; tint?: string };

function asQuick(units: readonly AimBody[]): QuickTargetUnit[] {
  return units.map((unit) => ({
    id: unit.id,
    hp: unit.hp,
    maxHp: unit.maxHp,
    name: unit.name ?? unit.id,
    tint: unit.tint ?? '#fff',
  }));
}

function weakestIds(units: readonly AimBody[], count: number): string[] {
  const ranked = [...asQuick(units)].filter((unit) => unit.hp > 0).sort((a, b) => {
    const ra = a.maxHp > 0 ? a.hp / a.maxHp : 1;
    const rb = b.maxHp > 0 ? b.hp / b.maxHp : 1;
    return ra - rb || a.hp - b.hp || a.id.localeCompare(b.id);
  });
  return ranked.slice(0, count).map((unit) => unit.id);
}

export type BattleAim = {
  greenIds: string[];
  redIds: string[];
  leftId: string | null;
  rightId: string | null;
  allyLock: string | null;
  foeLock: string | null;
};

/**
 * Rings and status-bar subjects for the user's turn.
 * A click that only reads an ally does not add a ring; skill aims do.
 */
export function battleAim(input: {
  userTurn: boolean;
  actorId: string | null;
  actorIsFoe: boolean;
  aim: SkillAim;
  party: readonly AimBody[];
  pets: readonly AimBody[];
  foes: readonly AimBody[];
  allyViewId: string | null;
  allyPin: string | null;
  foePin: string | null;
}): BattleAim {
  const { userTurn, actorId, actorIsFoe, aim, party, pets, foes, allyViewId, allyPin, foePin } = input;
  const foeLiving = foes.filter((unit) => unit.hp > 0);
  const foeWeak = lowestHpId(asQuick(foeLiving));
  const foeLock = foeLiving.some((unit) => unit.id === foePin) ? foePin : foeWeak;
  if (!userTurn) {
    return {
      greenIds: [],
      redIds: [],
      leftId: allyViewId,
      rightId: actorIsFoe ? actorId : foePin ?? foeWeak,
      allyLock: null,
      foeLock,
    };
  }
  const allyPool = aim.petsOnly ? pets : party;
  const allyLiving = allyPool.filter((unit) => unit.hp > 0);
  const allyWeak = lowestHpId(asQuick(allyLiving));
  const allyLock = allyLiving.some((unit) => unit.id === allyPin) ? allyPin : allyWeak;
  const greenIds =
    aim.ally === 'one' && allyLock
      ? [allyLock]
      : aim.ally === 'many'
        ? aim.allyCount
          ? weakestIds(allyLiving, aim.allyCount)
          : allyLiving.map((unit) => unit.id)
        : [];
  const redIds =
    aim.enemy === 'one' && foeLock
      ? [foeLock]
      : aim.enemy === 'many'
        ? aim.enemyCount
          ? weakestIds(foeLiving, aim.enemyCount)
          : foeLiving.map((unit) => unit.id)
        : [];
  const pinnedAlly = allyLiving.some((unit) => unit.id === allyPin) ? allyPin : null;
  const leftId =
    aim.ally === 'one'
      ? allyLock
      : aim.ally === 'many'
        ? pinnedAlly ?? allyWeak
        : allyViewId ?? actorId;
  const viewedFoe = foeLiving.some((unit) => unit.id === foePin) ? foePin : null;
  const rightId = aim.enemy === 'one' ? foeLock : aim.enemy === 'many' ? viewedFoe ?? foeWeak : foePin ?? foeWeak;
  return { greenIds, redIds, leftId, rightId, allyLock, foeLock };
}
