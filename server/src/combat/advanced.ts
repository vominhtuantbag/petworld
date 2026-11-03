/**
 * Advanced combat rates for arena / PvP. Mirrors the client module so both
 * sides resolve miss, armor pen, crit, status resist, and toughness the same way.
 */

export const DEFAULT_CRIT_DAMAGE = 1.5;

export type StatusId = 'poison' | 'freeze' | 'stun' | 'slow';

export type AdvancedStats = {
  maxTgh: number;
  armPen: number;
  res: number;
  critRate: number;
  critDamage: number;
  eva: number;
  acc: number;
};

export type AdvancedInput = Partial<AdvancedStats> & {
  tgh?: number;
  arm_pen?: number;
  crit_rate?: number;
  crit_dmg?: number;
};

const DEFAULTS: AdvancedStats = {
  maxTgh: 100,
  armPen: 0.05,
  res: 0.1,
  critRate: 0.1,
  critDamage: DEFAULT_CRIT_DAMAGE,
  eva: 0.05,
  acc: 0.9,
};

export function normalizeAdvanced(input?: AdvancedInput | null): AdvancedStats {
  const source = input ?? {};
  return {
    maxTgh: Math.max(1, Math.round(readPositive(source.maxTgh, DEFAULTS.maxTgh))),
    armPen: clamp(readFraction(source.armPen ?? source.arm_pen, DEFAULTS.armPen), 0, 0.75),
    res: clamp(readFraction(source.res, DEFAULTS.res), 0, 0.85),
    critRate: clamp(readFraction(source.critRate ?? source.crit_rate, DEFAULTS.critRate), 0, 0.75),
    critDamage: clamp(readPositive(source.critDamage ?? source.crit_dmg, DEFAULTS.critDamage), 1, 3),
    eva: clamp(readFraction(source.eva, DEFAULTS.eva), 0, 0.6),
    acc: clamp(readFraction(source.acc, DEFAULTS.acc), 0.4, 0.99),
  };
}

export function advancedAtLevel(level: number, role: 'hero' | 'pet' | 'elite' = 'hero'): AdvancedStats {
  const lv = Math.max(1, Number.isFinite(level) ? level : 1);
  if (role === 'pet') {
    return normalizeAdvanced({
      maxTgh: 70 + lv * 4,
      armPen: 0.04 + lv * 0.0015,
      res: 0.08 + lv * 0.0012,
      critRate: 0.08 + lv * 0.001,
      critDamage: DEFAULT_CRIT_DAMAGE,
      eva: 0.04 + lv * 0.001,
      acc: 0.86 + lv * 0.001,
    });
  }
  if (role === 'elite') {
    return normalizeAdvanced({
      maxTgh: 100 + lv * 5,
      armPen: 0.08 + lv * 0.002,
      res: 0.12 + lv * 0.0015,
      critRate: 0.12 + lv * 0.001,
      critDamage: 1.6,
      eva: 0.06 + lv * 0.001,
      acc: 0.9 + lv * 0.001,
    });
  }
  return normalizeAdvanced({
    maxTgh: 110 + lv * 2.5,
    armPen: 0.07 + lv * 0.0015,
    res: 0.12 + lv * 0.001,
    critRate: 0.12 + lv * 0.001,
    critDamage: DEFAULT_CRIT_DAMAGE,
    eva: 0.07 + lv * 0.0008,
    acc: 0.91 + lv * 0.0005,
  });
}

export function hitChance(acc: number, eva: number): number {
  return clamp((Number.isFinite(acc) ? acc : DEFAULTS.acc) - (Number.isFinite(eva) ? eva : DEFAULTS.eva) + 0.05, 0.05, 0.95);
}

export function doesHit(acc: number, eva: number, roll: number): boolean {
  return (Number.isFinite(roll) ? roll : 1) <= hitChance(acc, eva);
}

export function effectiveDefense(defense: number, armPen: number): number {
  const def = Math.max(0, Number.isFinite(defense) ? defense : 0);
  const pen = clamp(Number.isFinite(armPen) ? armPen : 0, 0, 0.75);
  return Math.max(0, def * (1 - pen));
}

export function resolveStatusApplication(
  chance: number,
  duration: number,
  res: number,
  roll: number,
): { applied: boolean; duration: number } {
  const resist = clamp(Number.isFinite(res) ? res : DEFAULTS.res, 0, 0.85);
  const success = clamp((Number.isFinite(chance) ? chance : 0) * (1 - resist), 0, 1);
  if ((Number.isFinite(roll) ? roll : 1) > success || success <= 0) return { applied: false, duration: 0 };
  return {
    applied: true,
    duration: Math.max(1, Math.round((Number.isFinite(duration) ? duration : 1) * (1 - resist * 0.5))),
  };
}

export function toughnessDamage(maxTgh: number, options: { weakness: boolean; armorBreak: boolean; skillPower: number }): number {
  if (!options.weakness && !options.armorBreak) return 0;
  const pool = Math.max(1, Number.isFinite(maxTgh) ? maxTgh : DEFAULTS.maxTgh);
  let chip = 0;
  if (options.weakness) chip += Math.max(8, Math.round(pool * 0.18));
  if (options.armorBreak) chip += Math.max(10, Math.round(pool * (0.12 + Math.max(0, options.skillPower - 1) * 0.08)));
  return chip;
}

export function isArmorBreakSkill(power: number, name?: string): boolean {
  if (power >= 1.7) return true;
  if (!name) return false;
  return /phá|vỡ|xuyên|búa|giáo|nổ|phán|thiêu|sấm|sụp|nuốt/i.test(name);
}

function readFraction(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value > 1 ? value / 100 : value;
}

function readPositive(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
