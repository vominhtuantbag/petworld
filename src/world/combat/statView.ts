/**
 * Resolve display-ready advanced stats for heroes and pets.
 * Missing stored fields fall back to role / class baselines so UI never shows blanks.
 */

import { heroAdvanced, monsterAdvanced, type AdvancedStats } from './advanced';
import { speciesById } from '../monsters';

export type AdvancedStatView = AdvancedStats & { tgh: number };

export function heroAdvancedView(professionId: string | undefined, level: number): AdvancedStatView {
  const advanced = heroAdvanced(professionId, level);
  return { ...advanced, tgh: advanced.maxTgh };
}

export function petAdvancedView(input: {
  kindId: string;
  level: number;
  tgh?: number;
  maxTgh?: number;
  armPen?: number;
  res?: number;
  critRate?: number;
  critDamage?: number;
  eva?: number;
  acc?: number;
}): AdvancedStatView {
  const species = speciesById(input.kindId);
  const advanced = monsterAdvanced(input.level, {
    role: species?.role,
    zone: species?.zone,
    overrides: definedOnly({
      ...species?.advanced,
      maxTgh: input.maxTgh,
      armPen: input.armPen,
      res: input.res,
      critRate: input.critRate,
      critDamage: input.critDamage,
      eva: input.eva,
      acc: input.acc,
    }),
  });
  const maxTgh = advanced.maxTgh;
  const tgh = Number.isFinite(input.tgh) ? Math.max(0, Math.min(maxTgh, Number(input.tgh))) : maxTgh;
  return { ...advanced, tgh };
}

export function speciesAdvancedView(input: {
  kindId: string;
  level: number;
  tgh?: number;
  maxTgh?: number;
  armPen?: number;
  res?: number;
  critRate?: number;
  critDamage?: number;
  eva?: number;
  acc?: number;
}): AdvancedStatView {
  return petAdvancedView(input);
}

function definedOnly<T extends Record<string, unknown>>(source: T): Partial<T> | undefined {
  const out: Partial<T> = {};
  let any = false;
  for (const [key, value] of Object.entries(source)) {
    if (value == null || (typeof value === 'number' && !Number.isFinite(value))) continue;
    (out as Record<string, unknown>)[key] = value;
    any = true;
  }
  return any ? out : undefined;
}
