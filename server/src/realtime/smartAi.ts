import type { DraftPetView } from './protocol.js';

/**
 * Server-side Smart AI for a real registered account. It never invents a
 * dummy fighter. It only ranks that account's own pets and plays their
 * turns with target and skill choices.
 */

export function petScore(pet: { level: number; hp: number; maxHp: number }): number {
  return pet.level * 20 + pet.maxHp + pet.hp;
}

export function pickSquad(roster: DraftPetView[], count = 4): string[] {
  return [...roster]
    .sort((left, right) => petScore(right) - petScore(left))
    .slice(0, count)
    .map((pet) => pet.id);
}

export function banTarget(foePets: DraftPetView[]): string | null {
  const ranked = [...foePets].sort((left, right) => petScore(right) - petScore(left));
  return ranked[0]?.id ?? null;
}

export type AiActor = {
  id: string;
  hp: number;
  attack: number;
  skills: { power: number }[];
};

export type AiFoe = {
  id: string;
  hp: number;
  maxHp: number;
  defense: number;
};

export function decideTurn(actor: AiActor, foes: AiFoe[]): { action: 'attack' | 'skill'; skill: 0 | 1; targetId: string } {
  const living = foes.filter((foe) => foe.hp > 0);
  const target = living.slice().sort((left, right) => {
    const leftKill = canFinish(actor, left) === canFinish(actor, right) ? 0 : canFinish(actor, left) ? -1 : 1;
    if (leftKill !== 0) return leftKill;
    const leftRatio = left.hp / Math.max(1, left.maxHp);
    const rightRatio = right.hp / Math.max(1, right.maxHp);
    if (leftRatio !== rightRatio) return leftRatio - rightRatio;
    return left.hp - right.hp;
  })[0];
  const targetId = target?.id ?? living[0]?.id ?? foes[0]?.id ?? '';
  const picked = living.find((foe) => foe.id === targetId) ?? target;
  const skillIndex = betterSkill(actor, picked);
  const damage = expectedDamage(actor, picked, skillIndex >= 0);
  const useSkill = skillIndex >= 0 && Boolean(picked) && (canFinish(actor, picked) || picked.hp > actor.attack || damage > actor.attack);
  return {
    action: useSkill ? 'skill' : 'attack',
    skill: useSkill ? (skillIndex as 0 | 1) : 0,
    targetId,
  };
}

function betterSkill(actor: AiActor, target: AiFoe | undefined): 0 | 1 | -1 {
  if (!target) return -1;
  let best: 0 | 1 | -1 = -1;
  let bestDamage = expectedDamage(actor, target, false);
  actor.skills.forEach((skill, index) => {
    if (index > 1) return;
    const damage = Math.max(1, Math.round(actor.attack * skill.power) - Math.floor(target.defense / 3));
    if (damage > bestDamage) {
      bestDamage = damage;
      best = index === 1 ? 1 : 0;
    }
  });
  return best;
}

function expectedDamage(actor: AiActor, target: AiFoe | undefined, skill: boolean): number {
  if (!target) return 0;
  const pierced = skill ? Math.floor(target.defense / 3) : Math.floor(target.defense / 2);
  const power = skill ? actor.skills[0]?.power ?? 1.55 : 1;
  return Math.max(1, Math.round(actor.attack * power) - pierced);
}

function canFinish(actor: AiActor, target: AiFoe): boolean {
  return expectedDamage(actor, target, true) >= target.hp || expectedDamage(actor, target, false) >= target.hp;
}
