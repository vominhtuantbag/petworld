import { speciesById } from './monsters';
import { expFromMonster } from './progression';
import type { Encounter, FieldState, ItemId, Sensor } from './types';
import type { BattleDrop } from './combat';

/**
 * Fixed raid court. Slot 0 is the first player through the gate.
 * The boss is drawn at twice the add size (`RAID_BOSS_SCALE`).
 */
export const RAID_PARTY_CELLS = ['L14', 'J11', 'G11', 'I8', 'L10'] as const;
export const RAID_ADD_CELLS = ['J21', 'G19'] as const;
export const RAID_BOSS_CELL = 'H23';
export const RAID_BOSS_SCALE = 2;

export const MINE_DAILY_LIMIT = 5;
export const MINE_FLOOR_COUNT = 10;
export const MINE_WAVE_COUNT = 5;
export const MINE_TICKET_CHANCE = 0.4;
export const RAID_TAME_MS = 15_000;
export const RAID_TAME_CAP = 0.3;
export const RAID_EVO_CHANCE = 0.4;
export const RAID_WEAPON_CHANCE = 0.45;
export const RAID_MIN_PARTY = 2;
export const RAID_MAX_PARTY = 5;

const MINE_KIND = 'savannah-lion';
const MINION_KIND = 'plains-boar';

export function mineLabel(floor: number, wave: number): string {
  return `${clamp(floor, 1, MINE_FLOOR_COUNT)}-${clamp(wave, 1, MINE_WAVE_COUNT)}`;
}

/** One floor, one wave. Waves 1–4 are a single foe. Wave 5 is two minions and a mini-boss. */
export function mineEncounter(level: number, floor = 1, wave = 1): Encounter {
  const safeFloor = clamp(floor, 1, MINE_FLOOR_COUNT);
  const safeWave = clamp(wave, 1, MINE_WAVE_COUNT);
  if (safeWave === MINE_WAVE_COUNT) {
    const minionA = mineFoe(level, safeFloor, safeWave, 'minion', 1);
    const minionB = mineFoe(level, safeFloor, safeWave, 'minion', 2);
    const boss = mineFoe(level, safeFloor, safeWave, 'boss', 0);
    return {
      ...boss,
      mine: true,
      mineFloor: safeFloor,
      mineWave: safeWave,
      solo: false,
      pool: [minionA, minionB, boss],
    };
  }
  const foe = mineFoe(level, safeFloor, safeWave, 'minion', 1);
  return { ...foe, mine: true, mineFloor: safeFloor, mineWave: safeWave, solo: true, pool: [foe] };
}

export function mineWaveExp(level: number, floor: number, wave: number): number {
  const safe = Math.max(1, Math.round(level));
  if (wave >= MINE_WAVE_COUNT) return expFromMonster(safe + floor + 4, true) + expFromMonster(safe + floor + 2, false) * 2;
  return expFromMonster(safe + floor + wave, wave >= 4);
}

/** Random items plus a 40% dungeon ticket. Used only after wave 1-5. */
export function mineClearDrops(rng: () => number = Math.random): BattleDrop[] {
  const pool: ItemId[] = ['hp-potion', 'mana-potion', 'ration', 'berry', 'evo-shard', 'stamina-potion'];
  const drops: BattleDrop[] = [{ itemId: pool[Math.floor(rng() * pool.length)] ?? 'hp-potion', qty: 1 }];
  if (rng() < 0.5) {
    const extra = pool[Math.floor(rng() * pool.length)] ?? 'ration';
    if (extra !== drops[0].itemId) drops.push({ itemId: extra, qty: 1 });
    else drops[0] = { ...drops[0], qty: 2 };
  }
  if (rng() < MINE_TICKET_CHANCE) drops.push({ itemId: 'mine-ticket', qty: 1 });
  return drops;
}

export function dungeonGateSensors(field: { width: number; height: number }): Sensor[] {
  return [
    {
      id: 'dungeon-mine',
      x: Math.round(field.width * 0.32),
      y: Math.round(field.height * 0.46),
      r: 64,
      label: 'Hầm mỏ',
      dungeon: 'mine',
    },
    {
      id: 'dungeon-raid',
      x: Math.round(field.width * 0.46),
      y: Math.round(field.height * 0.58),
      r: 64,
      label: 'Hầm ngục',
      dungeon: 'raid',
    },
  ];
}

/** Live gates during golden hour. Towns stay clear. Saved maps drop these sensors. */
export function withDungeonGates(field: FieldState, open: boolean): FieldState {
  const kept = field.sensors.filter((sensor) => !sensor.dungeon);
  const next = open && !field.zoneId.startsWith('town:') ? [...kept, ...dungeonGateSensors(field)] : kept;
  if (next.length === field.sensors.length && next.every((sensor, index) => sensor.id === field.sensors[index]?.id)) return field;
  return { ...field, sensors: next };
}

export function withoutDungeonGates(field: FieldState): FieldState {
  if (!field.sensors.some((sensor) => sensor.dungeon)) return field;
  return { ...field, sensors: field.sensors.filter((sensor) => !sensor.dungeon) };
}

function mineFoe(level: number, floor: number, wave: number, role: 'minion' | 'boss', index: number): Encounter {
  const kind = speciesById(role === 'boss' ? MINE_KIND : MINION_KIND) ?? speciesById(MINE_KIND);
  const safe = Math.max(1, Math.min(200, Math.round(level)));
  const steps = safe + floor * 2 + wave + (role === 'boss' ? 6 : 2);
  const body = role === 'boss' ? 2.4 : 1.35 + wave * 0.12;
  const hp = Math.round(((kind?.hp ?? 52) + steps * 12) * body);
  const label = role === 'boss' ? `Tiểu boss hầm mỏ ${floor}-${wave}` : `Quái hầm mỏ ${floor}-${wave}${index > 1 ? ` ${index}` : ''}`;
  return {
    id: `mine-${floor}-${wave}-${role}-${index}`,
    kindId: kind?.id ?? (role === 'boss' ? MINE_KIND : MINION_KIND),
    name: label,
    level: safe + floor + wave,
    hp,
    maxHp: hp,
    attack: Math.round(((kind?.attack ?? 16) + steps * 1.8) * (role === 'boss' ? 1.55 : 1.25)),
    defense: (kind?.defense ?? 6) + Math.floor(steps * 0.7) + (role === 'boss' ? 4 : 0),
    tint: role === 'boss' ? '#c4472f' : (kind?.tint ?? '#8a5a42'),
    elite: role === 'boss',
    speed: (kind?.speed ?? 70) + safe - (role === 'boss' ? 8 : 0),
  };
}

function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return low;
  return Math.max(low, Math.min(high, Math.round(value)));
}
