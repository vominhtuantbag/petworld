/**
 * Canonical 29-status catalog for Game Thư Giãn.
 * Engine StatusIds map here; UI icons + duration controllers read this module.
 */

import type { StatusEntry, StatusId } from './advanced.js';
import type { ModStat, StatMod } from './model.js';

/** The 29 player-facing status keys (15 debuffs + 14 buffs). */
export type CatalogStatusKey =
  // Debuffs (15)
  | 'acc_down'
  | 'bound'
  | 'poison'
  | 'bleed'
  | 'slow'
  | 'def_down'
  | 'energy_lock'
  | 'stun'
  | 'freeze'
  | 'thirst'
  | 'silence'
  | 'burn'
  | 'atk_down'
  | 'sealed'
  | 'block_swap'
  // Buffs (14)
  | 'regen'
  | 'def_up'
  | 'shield'
  | 'immunity'
  | 'mark'
  | 'cleanse'
  | 'spd_up'
  | 'endure'
  | 'evade'
  | 'stat_convert'
  | 'atk_up'
  | 'reflect'
  | 'nullify'
  | 'undying';

export type StatusPolarity = 'debuff' | 'buff';

export type StatusVisual = {
  /** Short glyph used when SVG art is unavailable. */
  glyph: string;
  /** Icon plate fill. */
  tint: string;
  /** Accent stroke / symbol color. */
  accent: string;
  /** SVG shape family for StatusIconArt. */
  art:
    | 'eye_x'
    | 'chains'
    | 'poison_drop'
    | 'bleed_wound'
    | 'arrow_down'
    | 'shield_crack'
    | 'energy_lock'
    | 'stun_stars'
    | 'ice_block'
    | 'dry_flask'
    | 'silence_mouth'
    | 'fire'
    | 'sword_down'
    | 'padlock'
    | 'prison'
    | 'heart_regen'
    | 'shield_glow'
    | 'shield_bar'
    | 'aura_resist'
    | 'crosshair'
    | 'cleanse_burst'
    | 'speed_wing'
    | 'phoenix'
    | 'shadow_evade'
    | 'swap_arrows'
    | 'sword_up'
    | 'reflect_ring'
    | 'null_dome'
    | 'immortal_halo';
};

export type StatusDefinition = {
  key: CatalogStatusKey;
  /** Primary engine status id when one exists. */
  engineId?: StatusId;
  /** Extra engine ids that render as this catalog key. */
  aliases?: StatusId[];
  nameVi: string;
  nameEn: string;
  polarity: StatusPolarity;
  /** Default duration in turns when a skill omits an override. */
  defaultTurns: number;
  /** Default potency (DoT %, ACC cut, reflect %, etc.). */
  defaultPower?: number;
  blurb: string;
  visual: StatusVisual;
};

export const STATUS_CATALOG: Record<CatalogStatusKey, StatusDefinition> = {
  acc_down: {
    key: 'acc_down',
    engineId: 'blind',
    nameVi: 'Giảm Độ Chính Xác',
    nameEn: 'Accuracy Down',
    polarity: 'debuff',
    defaultTurns: 2,
    defaultPower: 0.3,
    blurb: 'Giảm tỉ lệ trúng 20%–50% trong 1–2 lượt.',
    visual: { glyph: '👁', tint: '#3a2a18', accent: '#ffb347', art: 'eye_x' },
  },
  bound: {
    key: 'bound',
    engineId: 'bound',
    nameVi: 'Trói Buộc',
    nameEn: 'Bind',
    polarity: 'debuff',
    defaultTurns: 2,
    blurb: 'Khóa đổi pet và kỹ năng di chuyển trong 2 lượt.',
    visual: { glyph: '⛓', tint: '#2a3a22', accent: '#9ad06a', art: 'chains' },
  },
  poison: {
    key: 'poison',
    engineId: 'poison',
    aliases: ['miasma'],
    nameVi: 'Độc',
    nameEn: 'Poison / Miasma',
    polarity: 'debuff',
    defaultTurns: 3,
    defaultPower: 0.08,
    blurb: 'Mất % HP tối đa mỗi lượt/hành động, xuyên DEF.',
    visual: { glyph: '☠', tint: '#2a1840', accent: '#c77dff', art: 'poison_drop' },
  },
  bleed: {
    key: 'bleed',
    engineId: 'bleed',
    nameVi: 'Chảy Máu',
    nameEn: 'Bleed',
    polarity: 'debuff',
    defaultTurns: 2,
    defaultPower: 0.05,
    blurb: 'Gây sát thương chuẩn theo thời gian.',
    visual: { glyph: '🩸', tint: '#3a1014', accent: '#ff4d6d', art: 'bleed_wound' },
  },
  slow: {
    key: 'slow',
    engineId: 'slow',
    aliases: ['spd_zero', 'quicksand'],
    nameVi: 'Giảm Tốc Độ',
    nameEn: 'Slow',
    polarity: 'debuff',
    defaultTurns: 2,
    defaultPower: 0.3,
    blurb: 'Giảm SPD 20%–40% trong 2 lượt, tụt thứ tự Timeline.',
    visual: { glyph: '⬇', tint: '#1a2240', accent: '#7aa2ff', art: 'arrow_down' },
  },
  def_down: {
    key: 'def_down',
    engineId: 'def_down',
    nameVi: 'Giảm Phòng Thủ',
    nameEn: 'DEF Down',
    polarity: 'debuff',
    defaultTurns: 2,
    defaultPower: 0.35,
    blurb: 'Giảm DEF 30%–50% trong 2 lượt.',
    visual: { glyph: '🛡', tint: '#2a2a2a', accent: '#c0c0c0', art: 'shield_crack' },
  },
  energy_lock: {
    key: 'energy_lock',
    engineId: 'energy_lock',
    aliases: ['item_lock'],
    nameVi: 'Khóa Năng Lượng',
    nameEn: 'AP/MP Lock',
    polarity: 'debuff',
    defaultTurns: 2,
    blurb: 'Khóa hồi năng lượng, nhân đôi MP skill hoặc đốt MP.',
    visual: { glyph: '⚡', tint: '#3a2810', accent: '#ff9f1c', art: 'energy_lock' },
  },
  stun: {
    key: 'stun',
    engineId: 'stun',
    nameVi: 'Choáng',
    nameEn: 'Stun',
    polarity: 'debuff',
    defaultTurns: 1,
    blurb: 'Bỏ qua toàn bộ lượt trong 1 lượt.',
    visual: { glyph: '✦', tint: '#3a3010', accent: '#ffe066', art: 'stun_stars' },
  },
  freeze: {
    key: 'freeze',
    engineId: 'freeze',
    nameVi: 'Đóng Băng',
    nameEn: 'Freeze',
    polarity: 'debuff',
    defaultTurns: 1,
    blurb: 'Khóa hành động hoàn toàn trong 1 lượt.',
    visual: { glyph: '❄', tint: '#143048', accent: '#9ad7ff', art: 'ice_block' },
  },
  thirst: {
    key: 'thirst',
    engineId: 'thirst',
    nameVi: 'Khát Nước',
    nameEn: 'Thirst',
    polarity: 'debuff',
    defaultTurns: 2,
    defaultPower: 2,
    blurb: 'Nhân đôi MP tiêu hao của mọi kỹ năng.',
    visual: { glyph: '💧', tint: '#3a2a18', accent: '#d4a373', art: 'dry_flask' },
  },
  silence: {
    key: 'silence',
    engineId: 'silence',
    nameVi: 'Câm Lặng',
    nameEn: 'Silence',
    polarity: 'debuff',
    defaultTurns: 2,
    blurb: 'Chỉ đánh thường; khóa skill hệ thống/biome 2 lượt.',
    visual: { glyph: '🤐', tint: '#2a2a32', accent: '#adb5bd', art: 'silence_mouth' },
  },
  burn: {
    key: 'burn',
    engineId: 'burn',
    nameVi: 'Bỏng',
    nameEn: 'Burn',
    polarity: 'debuff',
    defaultTurns: 2,
    defaultPower: 0.05,
    blurb: 'DoT theo lượt, giảm ATK hoặc phản sát thương cận chiến.',
    visual: { glyph: '🔥', tint: '#3a1808', accent: '#ff6b35', art: 'fire' },
  },
  atk_down: {
    key: 'atk_down',
    engineId: 'atk_down',
    nameVi: 'Giảm Tấn Công',
    nameEn: 'ATK Down',
    polarity: 'debuff',
    defaultTurns: 2,
    defaultPower: 0.22,
    blurb: 'Giảm ATK 20%–25% trong 2 lượt.',
    visual: { glyph: '⚔', tint: '#2a1a1a', accent: '#ff8787', art: 'sword_down' },
  },
  sealed: {
    key: 'sealed',
    engineId: 'sealed',
    nameVi: 'Khóa Kỹ Năng Mạnh',
    nameEn: 'Skill Seal',
    polarity: 'debuff',
    defaultTurns: 2,
    blurb: 'Khóa Skill 5 / Ultimate trong 2 lượt.',
    visual: { glyph: '🔒', tint: '#3a3010', accent: '#ffd43b', art: 'padlock' },
  },
  block_swap: {
    key: 'block_swap',
    engineId: 'block_swap',
    nameVi: 'Khóa Đổi Quái',
    nameEn: 'Lock Swap',
    polarity: 'debuff',
    defaultTurns: 2,
    blurb: 'Không đổi pet hoặc bỏ chạy trong thời gian hiệu lực.',
    visual: { glyph: '⛓', tint: '#2a1818', accent: '#fa5252', art: 'prison' },
  },
  regen: {
    key: 'regen',
    engineId: 'regen',
    aliases: ['chant'],
    nameVi: 'Hồi Phục',
    nameEn: 'Heal / Regen',
    polarity: 'buff',
    defaultTurns: 3,
    defaultPower: 0.1,
    blurb: 'Hồi % HP/MP tức thì hoặc liên tục trong tối đa 3 lượt.',
    visual: { glyph: '❤', tint: '#10283a', accent: '#4dabf7', art: 'heart_regen' },
  },
  def_up: {
    key: 'def_up',
    engineId: 'def_up',
    nameVi: 'Tăng Phòng Thủ',
    nameEn: 'DEF Up',
    polarity: 'buff',
    defaultTurns: 2,
    defaultPower: 0.35,
    blurb: 'Tăng DEF 20%–60% trong 1–2 lượt.',
    visual: { glyph: '🛡', tint: '#12302a', accent: '#69db7c', art: 'shield_glow' },
  },
  shield: {
    key: 'shield',
    engineId: undefined,
    nameVi: 'Khiên Hấp Thụ',
    nameEn: 'Shield',
    polarity: 'buff',
    defaultTurns: 3,
    defaultPower: 0.2,
    blurb: 'Lớp hấp thụ sát thương theo % HP tối đa cho đến khi vỡ.',
    visual: { glyph: '▭', tint: '#102848', accent: '#74c0fc', art: 'shield_bar' },
  },
  immunity: {
    key: 'immunity',
    engineId: 'immunity',
    nameVi: 'Miễn Nhiễm Choáng',
    nameEn: 'Stun Immunity',
    polarity: 'buff',
    defaultTurns: 2,
    blurb: 'Kháng tuyệt đối hiệu ứng khống chế trong thời gian hiệu lực.',
    visual: { glyph: '◎', tint: '#2a2440', accent: '#b197fc', art: 'aura_resist' },
  },
  mark: {
    key: 'mark',
    engineId: 'mark',
    nameVi: 'Đánh Dấu Chí Mạng',
    nameEn: 'Critical Mark',
    polarity: 'buff',
    defaultTurns: 2,
    defaultPower: 1,
    blurb: 'Đòn kế tiếp chắc chắn Chí Mạng.',
    visual: { glyph: '◎', tint: '#3a1010', accent: '#ff6b6b', art: 'crosshair' },
  },
  cleanse: {
    key: 'cleanse',
    engineId: 'cleanse_flash',
    nameVi: 'Thanh Tẩy',
    nameEn: 'Cleanse',
    polarity: 'buff',
    defaultTurns: 1,
    blurb: 'Xóa toàn bộ debuff trên bản thân hoặc đồng minh.',
    visual: { glyph: '✦', tint: '#3a3810', accent: '#fff3bf', art: 'cleanse_burst' },
  },
  spd_up: {
    key: 'spd_up',
    engineId: 'spd_up',
    nameVi: 'Tăng Tốc Độ',
    nameEn: 'SPD Up',
    polarity: 'buff',
    defaultTurns: 2,
    defaultPower: 0.5,
    blurb: 'Tăng SPD 50%–100% và có thể nhận thêm lượt.',
    visual: { glyph: '➤', tint: '#10301a', accent: '#8ce99a', art: 'speed_wing' },
  },
  endure: {
    key: 'endure',
    engineId: undefined,
    nameVi: 'Cản Tử',
    nameEn: 'Death Prevention',
    polarity: 'buff',
    defaultTurns: 99,
    blurb: 'Sống sót đòn chí tử với 1 HP (1 lần/trận).',
    visual: { glyph: '🕊', tint: '#2a2030', accent: '#e599f7', art: 'phoenix' },
  },
  evade: {
    key: 'evade',
    engineId: 'evade_basic',
    aliases: ['evade_skill', 'veil'],
    nameVi: 'Né Tránh Hoàn Toàn',
    nameEn: '100% Evasion',
    polarity: 'buff',
    defaultTurns: 1,
    blurb: 'Né hoàn toàn đòn thường hoặc kỹ năng trong 1 lượt/hit.',
    visual: { glyph: '◌', tint: '#1a2430', accent: '#a5d8ff', art: 'shadow_evade' },
  },
  stat_convert: {
    key: 'stat_convert',
    engineId: 'stat_convert',
    nameVi: 'Chuyển Hóa Chỉ Số',
    nameEn: 'Stat Swap',
    polarity: 'buff',
    defaultTurns: 2,
    blurb: 'Đổi DEF↔ATK hoặc cướp chỉ số trong 2 lượt.',
    visual: { glyph: '⇄', tint: '#302010', accent: '#ffd8a8', art: 'swap_arrows' },
  },
  atk_up: {
    key: 'atk_up',
    engineId: 'atk_up',
    nameVi: 'Tăng Tấn Công',
    nameEn: 'ATK Up',
    polarity: 'buff',
    defaultTurns: 2,
    defaultPower: 0.4,
    blurb: 'Tăng ATK 30%–60% trong 2 lượt.',
    visual: { glyph: '⚔', tint: '#3a1808', accent: '#ffa94d', art: 'sword_up' },
  },
  reflect: {
    key: 'reflect',
    engineId: 'reflect',
    aliases: ['thorns'],
    nameVi: 'Khiên Phản Thương',
    nameEn: 'Reflect Shield',
    polarity: 'buff',
    defaultTurns: 2,
    defaultPower: 0.3,
    blurb: 'Phản một phần sát thương về kẻ tấn công trong 2 lượt.',
    visual: { glyph: '✴', tint: '#301820', accent: '#ff8787', art: 'reflect_ring' },
  },
  nullify: {
    key: 'nullify',
    engineId: 'nullify',
    nameVi: 'Giáp Vô Hiệu',
    nameEn: 'Immunity Shield',
    polarity: 'buff',
    defaultTurns: 2,
    blurb: 'Vô hiệu hóa hoàn toàn đòn địch kế tiếp.',
    visual: { glyph: '◯', tint: '#183040', accent: '#99e9f2', art: 'null_dome' },
  },
  undying: {
    key: 'undying',
    engineId: 'undying',
    nameVi: 'Bất Tử',
    nameEn: 'Immortal',
    polarity: 'buff',
    defaultTurns: 1,
    blurb: 'Khóa HP không dưới 1 trong 1 lượt định mệnh.',
    visual: { glyph: '☼', tint: '#3a2808', accent: '#ffd43b', art: 'immortal_halo' },
  },
};

export const DEBUFF_CATALOG_KEYS: CatalogStatusKey[] = [
  'acc_down',
  'bound',
  'poison',
  'bleed',
  'slow',
  'def_down',
  'energy_lock',
  'stun',
  'freeze',
  'thirst',
  'silence',
  'burn',
  'atk_down',
  'sealed',
  'block_swap',
];

export const BUFF_CATALOG_KEYS: CatalogStatusKey[] = [
  'regen',
  'def_up',
  'shield',
  'immunity',
  'mark',
  'cleanse',
  'spd_up',
  'endure',
  'evade',
  'stat_convert',
  'atk_up',
  'reflect',
  'nullify',
  'undying',
];

/** Engine status ids treated as cleansable debuffs. */
export const ENGINE_DEBUFF_IDS: StatusId[] = [
  'poison',
  'freeze',
  'stun',
  'slow',
  'silence',
  'blind',
  'bleed',
  'burn',
  'spd_zero',
  'bound',
  'energy_lock',
  'item_lock',
  'miasma',
  'thirst',
  'curse_doom',
  'sealed',
  'block_swap',
  'quicksand',
  'atk_down',
  'def_down',
];

export type DisplayStatus = {
  key: CatalogStatusKey;
  turns: number;
  power?: number;
  def: StatusDefinition;
};

export type StatusCarrier = {
  statuses?: StatusEntry[];
  mods?: StatMod[];
  shieldHp?: number;
  endureUsed?: boolean;
  mpCostMult?: number;
  reflectCharges?: number;
  reflectPct?: number;
  meleeThornsTurns?: number;
};

const ENGINE_TO_CATALOG: Partial<Record<StatusId, CatalogStatusKey>> = (() => {
  const map: Partial<Record<StatusId, CatalogStatusKey>> = {};
  for (const def of Object.values(STATUS_CATALOG)) {
    if (def.engineId) map[def.engineId] = def.key;
    for (const alias of def.aliases ?? []) map[alias] = def.key;
  }
  return map;
})();

/** Map a live engine status id onto the 29-key catalog when possible. */
export function catalogKeyForEngine(id: StatusId): CatalogStatusKey | null {
  return ENGINE_TO_CATALOG[id] ?? null;
}

export function statusDefinition(key: CatalogStatusKey): StatusDefinition {
  return STATUS_CATALOG[key];
}

export function hasEngineStatus(carrier: StatusCarrier, id: StatusId): boolean {
  return (carrier.statuses ?? []).some((entry) => entry.id === id && entry.turns > 0);
}

export function getEngineStatus(carrier: StatusCarrier, id: StatusId): StatusEntry | undefined {
  return (carrier.statuses ?? []).find((entry) => entry.id === id && entry.turns > 0);
}

export function withEngineStatus(carrier: StatusCarrier, entry: StatusEntry): StatusEntry[] {
  const others = (carrier.statuses ?? []).filter((status) => status.id !== entry.id);
  return [...others, entry];
}

export function modSumOf(carrier: StatusCarrier, stat: ModStat): number {
  return (carrier.mods ?? []).filter((mod) => mod.stat === stat).reduce((sum, mod) => sum + mod.amount, 0);
}

export function maxModTurns(carrier: StatusCarrier, stat: ModStat, positive: boolean): number {
  const mods = (carrier.mods ?? []).filter((mod) => mod.stat === stat && (positive ? mod.amount > 0 : mod.amount < 0));
  if (!mods.length) return 0;
  return Math.max(...mods.map((mod) => mod.turns));
}

/**
 * Effective SPD after mods + Slow / SPD Zero.
 * Used by timeline reordering and combat calculations.
 */
export function effectiveSpeed(carrier: StatusCarrier & { speed: number }): number {
  if (hasEngineStatus(carrier, 'spd_zero')) return 0;
  const spdMods = modSumOf(carrier, 'spd');
  let spd = Math.max(0, carrier.speed) * (1 + spdMods);
  // Prefer explicit SPD mods when a skill also stamped the Slow status for the HUD.
  const slow = getEngineStatus(carrier, 'slow');
  if (slow && spdMods >= 0) {
    const cut = Math.min(0.9, Math.abs(slow.power ?? STATUS_CATALOG.slow.defaultPower ?? 0.3));
    spd *= 1 - cut;
  }
  if (hasEngineStatus(carrier, 'quicksand') && spdMods >= 0) spd *= 0.7;
  return Math.max(0, Math.round(spd));
}

/** Accuracy multiplier from Accuracy Down / Blind (skipped when ACC mods already apply the cut). */
export function accuracyMultiplier(carrier: StatusCarrier): number {
  if (modSumOf(carrier, 'acc') < 0) return 1;
  const blind = getEngineStatus(carrier, 'blind');
  if (!blind) return 1;
  const cut = Math.min(0.9, Math.max(0.2, Math.abs(blind.power ?? STATUS_CATALOG.acc_down.defaultPower ?? 0.3)));
  return 1 - cut;
}

/** Extra ATK cut from Burn when the burn entry carries no paired ATK mod. */
export function burnAttackMultiplier(carrier: StatusCarrier): number {
  const burn = getEngineStatus(carrier, 'burn');
  if (!burn) return 1;
  if (modSumOf(carrier, 'atk') < 0) return 1;
  return 1 - Math.min(0.35, Math.abs(burn.power2 ?? 0.2));
}

export function canSwapOrFlee(carrier: StatusCarrier): boolean {
  return !hasEngineStatus(carrier, 'block_swap') && !hasEngineStatus(carrier, 'bound');
}

export function canUseMovementSkills(carrier: StatusCarrier): boolean {
  return !hasEngineStatus(carrier, 'bound');
}

export function isControlLocked(carrier: StatusCarrier): boolean {
  return hasEngineStatus(carrier, 'stun') || hasEngineStatus(carrier, 'freeze') || hasEngineStatus(carrier, 'spd_zero');
}

export function resistsControl(carrier: StatusCarrier): boolean {
  return hasEngineStatus(carrier, 'immunity');
}

/**
 * Build the floating icon list for a fighter: live statuses + derived mod/shield/endure icons.
 * Caps at 6 so the HUD stays readable.
 */
export function collectDisplayStatuses(carrier: StatusCarrier, max = 6): DisplayStatus[] {
  const byKey = new Map<CatalogStatusKey, DisplayStatus>();

  const upsert = (key: CatalogStatusKey, turns: number, power?: number) => {
    if (turns <= 0) return;
    const prev = byKey.get(key);
    if (prev && prev.turns >= turns) return;
    byKey.set(key, { key, turns, power, def: STATUS_CATALOG[key] });
  };

  for (const entry of carrier.statuses ?? []) {
    if (entry.turns <= 0) continue;
    const key = catalogKeyForEngine(entry.id);
    if (!key) continue;
    upsert(key, entry.turns, entry.power);
  }

  const atk = modSumOf(carrier, 'atk');
  if (atk > 0) upsert('atk_up', maxModTurns(carrier, 'atk', true), atk);
  if (atk < 0) upsert('atk_down', maxModTurns(carrier, 'atk', false), atk);

  const def = modSumOf(carrier, 'def');
  if (def > 0) upsert('def_up', maxModTurns(carrier, 'def', true), def);
  if (def < 0) upsert('def_down', maxModTurns(carrier, 'def', false), def);

  const spd = modSumOf(carrier, 'spd');
  if (spd > 0) upsert('spd_up', maxModTurns(carrier, 'spd', true), spd);

  const acc = modSumOf(carrier, 'acc');
  if (acc < 0) upsert('acc_down', maxModTurns(carrier, 'acc', false), acc);

  if ((carrier.shieldHp ?? 0) > 0) upsert('shield', 99, carrier.shieldHp);

  if (carrier.endureUsed === false) upsert('endure', 99);

  if ((carrier.mpCostMult ?? 1) > 1 && !hasEngineStatus(carrier, 'thirst')) {
    upsert('thirst', 2, carrier.mpCostMult);
  }

  if ((carrier.reflectCharges ?? 0) > 0 || (carrier.reflectPct ?? 0) > 0) {
    if (!byKey.has('reflect')) upsert('reflect', 2, carrier.reflectPct);
  }

  if ((carrier.meleeThornsTurns ?? 0) > 0) upsert('reflect', carrier.meleeThornsTurns!, undefined);

  const ordered = [...byKey.values()].sort((a, b) => {
    if (a.def.polarity !== b.def.polarity) return a.def.polarity === 'debuff' ? -1 : 1;
    return b.turns - a.turns || a.key.localeCompare(b.key);
  });
  return ordered.slice(0, max);
}

/** Tick remaining turns on status entries (shared by client/server controllers). */
export function tickStatusEntries(entries: StatusEntry[] | undefined): StatusEntry[] {
  return (entries ?? [])
    .map((entry) => ({ ...entry, turns: entry.turns - 1 }))
    .filter((entry) => entry.turns > 0);
}

export function tickStatMods(mods: StatMod[] | undefined): StatMod[] {
  return (mods ?? [])
    .map((mod) => ({ ...mod, turns: mod.turns - 1 }))
    .filter((mod) => mod.turns > 0);
}

/** Resolve catalog defaults onto a status payload before RES checks. */
export function resolveStatusDefaults(
  id: StatusId,
  turns?: number,
  power?: number,
): { turns: number; power?: number } {
  const key = catalogKeyForEngine(id);
  const def = key ? STATUS_CATALOG[key] : null;
  return {
    turns: Math.max(1, turns ?? def?.defaultTurns ?? 1),
    power: power ?? def?.defaultPower,
  };
}
