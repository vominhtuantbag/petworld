/**
 * Seven advanced combat attributes shared by heroes, pets, and monsters.
 * Every reader goes through `normalizeAdvanced` so legacy objects without
 * these fields still resolve to finite numbers instead of NaN.
 */

export const DEFAULT_CRIT_DAMAGE = 1.5;

export type StatusId =
  | 'poison'
  | 'freeze'
  | 'stun'
  | 'slow'
  | 'silence'
  | 'blind'
  | 'bleed'
  | 'burn'
  | 'mark'
  | 'stealth'
  | 'taunt'
  | 'guard'
  | 'charge'
  | 'immunity'
  | 'reflect'
  | 'crit_block'
  | 'spd_zero';

export type StatusEntry = {
  id: StatusId;
  turns: number;
  /** Optional potency (DoT %, absorb %, reflect %, mark bonuses, etc.). */
  power?: number;
  /** Secondary value (e.g. mark ignoreDef, guard absorb). */
  power2?: number;
  sourceId?: string;
};

export type AdvancedStats = {
  /** Max Toughness. Current toughness lives on the live fighter as `tgh`. */
  maxTgh: number;
  /** Armor penetration as a fraction (0.2 = 20%). */
  armPen: number;
  /** Status resistance as a fraction (0.25 = 25%). */
  res: number;
  /** Critical chance as a fraction. */
  critRate: number;
  /** Critical damage multiplier. Defaults to 1.5. */
  critDamage: number;
  /** Evasion as a fraction. */
  eva: number;
  /** Accuracy as a fraction. */
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

/** Class baselines. Tankier classes get more toughness and resistance. */
export const HERO_ADVANCED: Record<string, AdvancedStats> = {
  guardian: { maxTgh: 140, armPen: 0.04, res: 0.22, critRate: 0.08, critDamage: 1.5, eva: 0.04, acc: 0.9 },
  knight: { maxTgh: 130, armPen: 0.06, res: 0.18, critRate: 0.1, critDamage: 1.5, eva: 0.05, acc: 0.92 },
  mage: { maxTgh: 90, armPen: 0.12, res: 0.12, critRate: 0.14, critDamage: 1.55, eva: 0.06, acc: 0.9 },
  healer: { maxTgh: 100, armPen: 0.04, res: 0.2, critRate: 0.08, critDamage: 1.5, eva: 0.06, acc: 0.9 },
  rogue: { maxTgh: 95, armPen: 0.14, res: 0.1, critRate: 0.22, critDamage: 1.65, eva: 0.14, acc: 0.94 },
  bard: { maxTgh: 90, armPen: 0.12, res: 0.1, critRate: 0.2, critDamage: 1.6, eva: 0.12, acc: 0.93 },
  archer: { maxTgh: 100, armPen: 0.1, res: 0.12, critRate: 0.18, critDamage: 1.55, eva: 0.1, acc: 0.95 },
  ranger: { maxTgh: 110, armPen: 0.08, res: 0.14, critRate: 0.16, critDamage: 1.5, eva: 0.09, acc: 0.93 },
  scout: { maxTgh: 100, armPen: 0.09, res: 0.12, critRate: 0.16, critDamage: 1.5, eva: 0.12, acc: 0.94 },
  monk: { maxTgh: 120, armPen: 0.08, res: 0.16, critRate: 0.12, critDamage: 1.5, eva: 0.1, acc: 0.92 },
  wanderer: { maxTgh: 110, armPen: 0.07, res: 0.12, critRate: 0.12, critDamage: 1.5, eva: 0.07, acc: 0.91 },
};

export function heroAdvanced(professionId: string | undefined, level = 1): AdvancedStats {
  const base = HERO_ADVANCED[professionId ?? ''] ?? HERO_ADVANCED.wanderer;
  const lv = Math.max(1, level);
  return normalizeAdvanced({
    ...base,
    maxTgh: base.maxTgh + Math.floor((lv - 1) * 2.5),
    armPen: Math.min(0.45, base.armPen + (lv - 1) * 0.0015),
    res: Math.min(0.5, base.res + (lv - 1) * 0.001),
    critRate: Math.min(0.45, base.critRate + (lv - 1) * 0.001),
    eva: Math.min(0.35, base.eva + (lv - 1) * 0.0008),
    acc: Math.min(0.99, base.acc + (lv - 1) * 0.0005),
  });
}

/**
 * Combat archetype for wild monsters / pets.
 * Agile = eva/crit. Tank = tgh/res. Striker = arm_pen/crit.
 * Bruiser = thick body + solid pen. Mystic = res/pen. Balanced = mid.
 */
export type MonsterCombatRole = 'agile' | 'tank' | 'striker' | 'bruiser' | 'mystic' | 'balanced';

export type MonsterAdvancedOptions = {
  elite?: boolean;
  role?: MonsterCombatRole;
  /** Map-1 sub-zone 0–4. Zones 3–4 (town levels 7–10) gain arm_pen / res. */
  zone?: number;
  overrides?: AdvancedInput | null;
};

/** Level-1 baselines before level / zone scaling. */
export const MONSTER_ROLE_ADVANCED: Record<MonsterCombatRole, AdvancedStats> = {
  agile: { maxTgh: 70, armPen: 0.05, res: 0.08, critRate: 0.16, critDamage: 1.55, eva: 0.14, acc: 0.94 },
  tank: { maxTgh: 135, armPen: 0.03, res: 0.2, critRate: 0.06, critDamage: 1.45, eva: 0.03, acc: 0.88 },
  striker: { maxTgh: 85, armPen: 0.13, res: 0.1, critRate: 0.18, critDamage: 1.65, eva: 0.08, acc: 0.93 },
  bruiser: { maxTgh: 115, armPen: 0.07, res: 0.13, critRate: 0.1, critDamage: 1.55, eva: 0.05, acc: 0.9 },
  mystic: { maxTgh: 90, armPen: 0.1, res: 0.22, critRate: 0.12, critDamage: 1.55, eva: 0.07, acc: 0.91 },
  balanced: { maxTgh: 95, armPen: 0.06, res: 0.11, critRate: 0.1, critDamage: DEFAULT_CRIT_DAMAGE, eva: 0.06, acc: 0.9 },
};

/**
 * Monster / pet advanced rates from level, combat role, and town zone.
 * Accepts the legacy `(level, elite)` boolean form so older call sites keep working.
 */
export function monsterAdvanced(level: number, eliteOrOptions: boolean | MonsterAdvancedOptions = false): AdvancedStats {
  const options: MonsterAdvancedOptions =
    typeof eliteOrOptions === 'boolean' ? { elite: eliteOrOptions } : eliteOrOptions ?? {};
  const lv = Math.max(1, Number.isFinite(level) ? level : 1);
  const role = options.role && MONSTER_ROLE_ADVANCED[options.role] ? options.role : 'balanced';
  const base = MONSTER_ROLE_ADVANCED[role];
  const zone = clamp(Math.round(Number.isFinite(options.zone) ? Number(options.zone) : 0), 0, 4);
  const elite = Boolean(options.elite);
  const highTier = zone >= 3;
  const steps = lv - 1;
  const grown = normalizeAdvanced({
    maxTgh: base.maxTgh + steps * (role === 'tank' ? 5 : role === 'bruiser' ? 4.5 : 3.5) + zone * 8 + (elite ? 30 : 0),
    armPen: base.armPen + steps * 0.0012 + zone * 0.008 + (highTier ? 0.035 : 0) + (elite ? 0.04 : 0),
    res: base.res + steps * 0.001 + zone * 0.01 + (highTier ? 0.04 : 0) + (elite ? 0.05 : 0),
    critRate: base.critRate + steps * 0.0009 + zone * 0.006 + (elite ? 0.03 : 0),
    critDamage: base.critDamage + (elite ? 0.05 : 0) + (highTier && role === 'striker' ? 0.05 : 0),
    eva: base.eva + steps * 0.0007 + zone * 0.004 + (elite ? 0.02 : 0),
    acc: base.acc + steps * 0.0005 + zone * 0.003 + (elite ? 0.02 : 0),
  });
  if (!options.overrides) return grown;
  const patch: AdvancedInput = { ...grown };
  for (const [key, value] of Object.entries(options.overrides)) {
    if (value == null || (typeof value === 'number' && !Number.isFinite(value))) continue;
    (patch as Record<string, unknown>)[key] = value;
  }
  return normalizeAdvanced(patch);
}

export function normalizeAdvanced(input?: AdvancedInput | null): AdvancedStats {
  const source = input ?? {};
  const armPen = readFraction(source.armPen ?? source.arm_pen, DEFAULTS.armPen);
  const critRate = readFraction(source.critRate ?? source.crit_rate, DEFAULTS.critRate);
  const critDamage = readPositive(source.critDamage ?? source.crit_dmg, DEFAULTS.critDamage);
  return {
    maxTgh: Math.max(1, Math.round(readPositive(source.maxTgh, DEFAULTS.maxTgh))),
    armPen: clamp(armPen, 0, 0.75),
    res: clamp(readFraction(source.res, DEFAULTS.res), 0, 0.85),
    critRate: clamp(critRate, 0, 0.75),
    critDamage: clamp(critDamage, 1, 3),
    eva: clamp(readFraction(source.eva, DEFAULTS.eva), 0, 0.6),
    acc: clamp(readFraction(source.acc, DEFAULTS.acc), 0.4, 0.99),
  };
}

export function startingToughness(input?: AdvancedInput | null): { tgh: number; maxTgh: number } {
  const advanced = normalizeAdvanced(input);
  const current = Number.isFinite(input?.tgh) ? Number(input?.tgh) : advanced.maxTgh;
  return { tgh: clamp(current, 0, advanced.maxTgh), maxTgh: advanced.maxTgh };
}

/** Hit chance from ACC vs EVA. Floor 5%, ceiling 95%. */
export function hitChance(acc: number, eva: number): number {
  const accuracy = clamp(Number.isFinite(acc) ? acc : DEFAULTS.acc, 0, 1);
  const evasion = clamp(Number.isFinite(eva) ? eva : DEFAULTS.eva, 0, 1);
  return clamp(accuracy - evasion + 0.05, 0.05, 0.95);
}

export function doesHit(acc: number, eva: number, roll: number): boolean {
  const chance = hitChance(acc, eva);
  const safeRoll = Number.isFinite(roll) ? roll : 1;
  return safeRoll <= chance;
}

/**
 * Effective defense after armor penetration.
 * `Effective DEF = Target DEF * (1 - Attacker ARM_PEN)`.
 */
export function effectiveDefense(defense: number, armPen: number): number {
  const def = Math.max(0, Number.isFinite(defense) ? defense : 0);
  const pen = clamp(Number.isFinite(armPen) ? armPen : 0, 0, 0.75);
  return Math.max(0, def * (1 - pen));
}

/**
 * Status application check. Higher RES lowers success chance.
 * Duration is reduced by RES as well (at least 1 turn when it lands).
 */
export function resolveStatusApplication(
  chance: number,
  duration: number,
  res: number,
  roll: number,
): { applied: boolean; duration: number } {
  const resist = clamp(Number.isFinite(res) ? res : DEFAULTS.res, 0, 0.85);
  const rawChance = Number.isFinite(chance) ? chance : 0;
  const success = clamp(rawChance * (1 - resist), 0, 1);
  const safeRoll = Number.isFinite(roll) ? roll : 1;
  if (safeRoll > success || success <= 0) return { applied: false, duration: 0 };
  const turns = Math.max(1, Math.round((Number.isFinite(duration) ? duration : 1) * (1 - resist * 0.5)));
  return { applied: true, duration: turns };
}

/** Toughness chip from a weakness hit or armor-break skill. */
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
  // Accept either 0–1 fractions or 0–100 percents from configs.
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
