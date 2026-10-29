import { speciesById } from './monsters';
import type { Encounter, FieldState, Sensor } from './types';

/**
 * Fixed raid court. Slot 0 is the first player through the gate.
 * The boss is drawn at twice the add size (`RAID_BOSS_SCALE`).
 */
export const RAID_PARTY_CELLS = ['L14', 'J11', 'G11', 'I8', 'L10'] as const;
export const RAID_ADD_CELLS = ['J21', 'G19'] as const;
export const RAID_BOSS_CELL = 'H23';
export const RAID_BOSS_SCALE = 2;

const MINE_KIND = 'savannah-lion';

/** One stronger foe. The wild battle screen fights this card alone. */
export function mineEncounter(level: number): Encounter {
  const kind = speciesById(MINE_KIND);
  const safe = Math.max(1, Math.min(200, Math.round(level)));
  const steps = safe + 4;
  const hp = Math.round(((kind?.hp ?? 60) + steps * 14) * 1.85);
  return {
    id: `mine-${Date.now().toString(36)}`,
    kindId: kind?.id ?? MINE_KIND,
    name: 'Quái hầm mỏ',
    level: safe + 4,
    hp,
    maxHp: hp,
    attack: Math.round(((kind?.attack ?? 16) + steps * 2) * 1.45),
    defense: (kind?.defense ?? 6) + steps,
    tint: kind?.tint ?? '#c4923a',
    elite: true,
    solo: true,
    mine: true,
    speed: (kind?.speed ?? 70) + safe,
  };
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
