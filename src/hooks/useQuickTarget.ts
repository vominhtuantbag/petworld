import { useCallback, useRef, useState } from 'react';

import { combatSfx } from '../world/combat/combatSfx';

export const HOLD_MS = 220;
export const DOUBLE_TAP_MS = 280;
export const CYCLE_PX = 36;
export const CANCEL_DY = 78;

export type QuickTargetUnit = {
  id: string;
  hp: number;
  maxHp: number;
  name: string;
  kindId?: string;
  tint: string;
};

export function lowestHpId(units: readonly QuickTargetUnit[]): string | null {
  const living = units.filter((unit) => unit.hp > 0);
  if (!living.length) return null;
  return [...living].sort((a, b) => {
    const ra = a.maxHp > 0 ? a.hp / a.maxHp : 1;
    const rb = b.maxHp > 0 ? b.hp / b.maxHp : 1;
    return ra - rb || a.hp - b.hp || a.id.localeCompare(b.id);
  })[0]?.id ?? null;
}

export function cycleTargetId(ids: readonly string[], current: string | null, steps: number): string | null {
  if (!ids.length) return null;
  const start = Math.max(0, ids.indexOf(current ?? ids[0]));
  const next = (start + steps) % ids.length;
  return ids[(next + ids.length) % ids.length] ?? ids[0];
}

/**
 * Hold-and-drag targeting plus double-tap windows for skill buttons and court units.
 */
export function useQuickTarget(input: {
  targets: readonly QuickTargetUnit[];
  focusId: string | null;
  setFocusId: (id: string) => void;
}) {
  const { targets, focusId, setFocusId } = input;
  const [aiming, setAiming] = useState(false);
  const aimingRef = useRef(false);
  const originIndex = useRef(0);
  const lastStep = useRef(0);
  const lastActionTap = useRef<{ id: string; at: number } | null>(null);
  const lastUnitTap = useRef<{ id: string; at: number } | null>(null);
  const livingIds = targets.filter((unit) => unit.hp > 0).map((unit) => unit.id);
  const livingIdsRef = useRef(livingIds);
  const focusRef = useRef(focusId);
  livingIdsRef.current = livingIds;
  focusRef.current = focusId;

  const beginAim = useCallback(() => {
    if (aimingRef.current) return;
    const ids = livingIdsRef.current;
    aimingRef.current = true;
    lastStep.current = 0;
    originIndex.current = Math.max(0, ids.indexOf(focusRef.current ?? ids[0] ?? ''));
    setAiming(true);
    combatSfx('arm');
  }, []);

  const moveAim = useCallback(
    (dx: number, dy: number) => {
      if (!aimingRef.current) {
        if (Math.abs(dx) > 12) beginAim();
        else return;
      }
      if (Math.abs(dy) > CANCEL_DY && Math.abs(dy) > Math.abs(dx)) return;
      const step = Math.trunc(dx / CYCLE_PX);
      if (step === lastStep.current) return;
      lastStep.current = step;
      const ids = livingIdsRef.current;
      const nextId = cycleTargetId(ids, ids[originIndex.current] ?? focusRef.current, step);
      if (nextId && nextId !== focusRef.current) {
        setFocusId(nextId);
        combatSfx('tick');
      }
    },
    [beginAim, setFocusId],
  );

  const endAim = useCallback((dy: number): 'cast' | 'cancel' | 'idle' => {
    if (!aimingRef.current) return 'idle';
    aimingRef.current = false;
    setAiming(false);
    if (Math.abs(dy) > CANCEL_DY) {
      combatSfx('cancel');
      return 'cancel';
    }
    return 'cast';
  }, []);

  const noteActionTap = useCallback((actionId: string): 'double' | 'single' => {
    const now = Date.now();
    const prev = lastActionTap.current;
    lastActionTap.current = { id: actionId, at: now };
    if (prev && prev.id === actionId && now - prev.at <= DOUBLE_TAP_MS) {
      lastActionTap.current = null;
      return 'double';
    }
    return 'single';
  }, []);

  const noteUnitTap = useCallback((unitId: string): 'double' | 'single' => {
    const now = Date.now();
    const prev = lastUnitTap.current;
    lastUnitTap.current = { id: unitId, at: now };
    if (prev && prev.id === unitId && now - prev.at <= DOUBLE_TAP_MS) {
      lastUnitTap.current = null;
      return 'double';
    }
    return 'single';
  }, []);

  return { aiming, beginAim, moveAim, endAim, noteActionTap, noteUnitTap, lowestId: lowestHpId(targets) };
}
