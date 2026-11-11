/**
 * Battle status controller — duration ticks, queries, and display snapshots
 * for the 29 buff/debuff system. Fighters keep the live arrays; this module
 * is the single place UI and combat helpers ask for status state.
 */

import type { StatusEntry, StatusId } from '../world/combat/advanced';
import {
  BUFF_CATALOG_KEYS,
  DEBUFF_CATALOG_KEYS,
  STATUS_CATALOG,
  canSwapOrFlee,
  collectDisplayStatuses,
  effectiveSpeed,
  hasEngineStatus,
  isControlLocked,
  tickStatMods,
  tickStatusEntries,
  type CatalogStatusKey,
  type DisplayStatus,
  type StatusCarrier,
} from '../world/combat/statuses';
import type { StatMod } from '../world/combat/model';

export type StatusSnapshot = {
  displays: DisplayStatus[];
  debuffs: DisplayStatus[];
  buffs: DisplayStatus[];
  canSwap: boolean;
  controlLocked: boolean;
  speed: number;
};

export function snapshotStatuses(
  carrier: StatusCarrier & { speed?: number },
  maxIcons = 6,
): StatusSnapshot {
  const displays = collectDisplayStatuses(carrier, maxIcons);
  return {
    displays,
    debuffs: displays.filter((entry) => entry.def.polarity === 'debuff'),
    buffs: displays.filter((entry) => entry.def.polarity === 'buff'),
    canSwap: canSwapOrFlee(carrier),
    controlLocked: isControlLocked(carrier),
    speed: effectiveSpeed({ ...carrier, speed: carrier.speed ?? 0 }),
  };
}

export function tickCarrierTimers<T extends StatusCarrier>(carrier: T): T {
  return {
    ...carrier,
    statuses: tickStatusEntries(carrier.statuses),
    mods: tickStatMods(carrier.mods as StatMod[] | undefined),
  };
}

export function upsertStatus(statuses: StatusEntry[] | undefined, entry: StatusEntry): StatusEntry[] {
  const others = (statuses ?? []).filter((status) => status.id !== entry.id);
  return [...others, entry];
}

export function removeStatus(statuses: StatusEntry[] | undefined, id: StatusId): StatusEntry[] {
  return (statuses ?? []).filter((status) => status.id !== id);
}

export function carrierHas(carrier: StatusCarrier, id: StatusId): boolean {
  return hasEngineStatus(carrier, id);
}

export function catalogMeta(key: CatalogStatusKey) {
  return STATUS_CATALOG[key];
}

export const STATUS_DEBUFF_KEYS = DEBUFF_CATALOG_KEYS;
export const STATUS_BUFF_KEYS = BUFF_CATALOG_KEYS;
export const STATUS_COUNT = DEBUFF_CATALOG_KEYS.length + BUFF_CATALOG_KEYS.length;
