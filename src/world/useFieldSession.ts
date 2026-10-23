import { useEffect, useRef, useState } from 'react';

import { useWorld } from '../state/WorldContext';
import { createField, fieldNeedsRebuild } from './catalog';
import type { FieldState } from './types';

/**
 * One live map. Switching `zoneId` loads the saved field, or builds a new
 * one, and drops the player on a gate's arrival pad. The previous map is
 * kept on a ref so leaving the zone still saves where the player was.
 */
export function useFieldSession(zoneId: string) {
  const world = useWorld();
  const worldRef = useRef(world);
  worldRef.current = world;
  const [field, setField] = useState<FieldState>(() => place(world.takeField(zoneId), world.arrival, zoneId));
  const [loadedZone, setLoadedZone] = useState(zoneId);
  const latest = useRef(field);
  const pendingSave = useRef<FieldState | null>(null);

  if (loadedZone !== zoneId) {
    pendingSave.current = latest.current;
    const next = place(world.takeField(zoneId), world.arrival, zoneId);
    latest.current = next;
    setLoadedZone(zoneId);
    setField(next);
  }

  useEffect(() => {
    const current = latest.current;
    if (!fieldNeedsRebuild(current)) return;
    const fresh = createField(current.zoneId);
    if (current.width === fresh.width && current.height === fresh.height) {
      fresh.player = { ...fresh.player, x: current.player.x, y: current.player.y };
    }
    latest.current = fresh;
    setField(fresh);
  }, []);

  useEffect(() => {
    const leaving = pendingSave.current;
    pendingSave.current = null;
    if (leaving && leaving.zoneId !== zoneId) worldRef.current.saveField(leaving);
    if (worldRef.current.arrival?.zoneId === zoneId) worldRef.current.clearArrival();
    return () => {
      worldRef.current.saveField(latest.current);
    };
  }, [zoneId]);

  const update = (next: FieldState) => {
    latest.current = next;
    setField(next);
  };

  return { field, update };
}

function place(field: FieldState, arrival: { zoneId: string; x: number; y: number } | null, zoneId: string): FieldState {
  if (!arrival || arrival.zoneId !== zoneId) return field;
  return {
    ...field,
    heldSensorId: null,
    player: { ...field.player, x: arrival.x, y: arrival.y },
  };
}
