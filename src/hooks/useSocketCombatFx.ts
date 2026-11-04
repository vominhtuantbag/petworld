import { useEffect, useRef, useState } from 'react';

import type { Step } from '../components/battle/CourtFx';
import {
  IMPACT_MS,
  SLASH_MS,
  STANCE_PX,
  classifyLastHit,
  type CombatFloat,
  type LastHitView,
} from '../world/combat/loop';

type UnitLike = { id: string; hp: number };

type SlotFn = (id: string) => { x: number; y: number } | null;

/**
 * Shared CourtFx + float pipeline for Socket-driven battles (arena / raid).
 * Step A: active unit steps toward focus. Step D/E: HP deltas trigger slash →
 * shake → floating numbers with crit/miss kinds from lastHit.
 */
export function useSocketCombatFx(input: {
  units: UnitLike[];
  turnId: string | null;
  focusId: string | null;
  lastHit?: LastHitView | null;
  lastLog?: string;
  slotOf: SlotFn;
  finished?: boolean;
}) {
  const { units, turnId, focusId, lastHit, lastLog, slotOf, finished } = input;
  const [floats, setFloats] = useState<CombatFloat[]>([]);
  const [steps, setSteps] = useState<Record<string, Step>>({});
  const [slashes, setSlashes] = useState<Record<string, number>>({});
  const [shakes, setShakes] = useState<Record<string, number>>({});
  const hpWatch = useRef<Map<string, number> | null>(null);
  const serial = useRef(0);
  const hpKey = units.map((unit) => `${unit.id}:${unit.hp}`).join('|');

  useEffect(() => {
    if (finished || units.length === 0) {
      hpWatch.current = null;
      setFloats((current) => (current.length === 0 ? current : []));
      return;
    }
    const previous = hpWatch.current;
    const next = new Map(units.map((unit) => [unit.id, unit.hp]));
    hpWatch.current = next;
    if (!previous) return;

    const born: CombatFloat[] = [];
    const hitIds: string[] = [];
    for (const unit of units) {
      if (!previous.has(unit.id)) continue;
      const delta = unit.hp - (previous.get(unit.id) ?? unit.hp);
      if (!Number.isFinite(delta) || delta === 0) continue;
      serial.current += 1;
      born.push({
        id: serial.current,
        fighterId: unit.id,
        amount: delta,
        kind: lastHit ? classifyLastHit(lastHit, unit.id, delta) : floatFromLog(lastLog, delta),
      });
      if (delta < 0) hitIds.push(unit.id);
    }
    if (born.length > 0) setFloats((current) => [...current, ...born].slice(-24));

    if (hitIds.length === 0) return;
    const slashMarks: Record<string, number> = {};
    for (const id of hitIds) {
      serial.current += 1;
      slashMarks[id] = serial.current;
    }
    setSlashes((current) => ({ ...current, ...slashMarks }));
    const timer = setTimeout(() => {
      const impact: Record<string, number> = {};
      for (const id of hitIds) {
        serial.current += 1;
        impact[id] = serial.current;
      }
      setShakes((current) => ({ ...current, ...impact }));
    }, SLASH_MS + IMPACT_MS * 0);
    return () => clearTimeout(timer);
  }, [finished, hpKey, lastHit, lastLog, units]);

  // Step-forward anticipation toward the focused (or first living) foe.
  useEffect(() => {
    if (finished || !turnId) {
      setSteps({});
      return;
    }
    const living = units.filter((unit) => unit.hp > 0);
    const actorSlot = slotOf(turnId);
    const targetId = focusId ?? living.find((unit) => unit.id !== turnId)?.id ?? null;
    const targetSlot = targetId ? slotOf(targetId) : null;
    setSteps((current) => {
      const next: Record<string, Step> = {};
      let changed = false;
      for (const unit of living) {
        if (unit.id === turnId && actorSlot && targetSlot) {
          const dx = targetSlot.x - actorSlot.x;
          const dy = targetSlot.y - actorSlot.y;
          const span = Math.hypot(dx, dy);
          const hold = Math.min(STANCE_PX, span * 0.35);
          const x = span < 8 ? 0 : (dx / span) * hold;
          const y = span < 8 ? 0 : (dy / span) * hold;
          const pose = current[unit.id];
          if (!pose || Math.abs(pose.x - x) > 2 || Math.abs(pose.y - y) > 2) {
            serial.current += 1;
            next[unit.id] = { key: serial.current, x, y };
            changed = true;
          } else {
            next[unit.id] = pose;
          }
        } else if (current[unit.id] && (current[unit.id].x !== 0 || current[unit.id].y !== 0)) {
          serial.current += 1;
          next[unit.id] = { key: serial.current, x: 0, y: 0 };
          changed = true;
        } else if (current[unit.id]) {
          next[unit.id] = current[unit.id];
        }
      }
      return changed ? next : current;
    });
    // Intentionally keyed on turn/focus/layout, not the units array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, focusId, slotOf, turnId, hpKey]);

  return {
    floats,
    dismissFloat: (id: number) => setFloats((current) => current.filter((entry) => entry.id !== id)),
    steps,
    slashes,
    shakes,
  };
}

function floatFromLog(line: string | undefined, delta: number) {
  if (delta > 0) return 'heal' as const;
  const text = (line ?? '').toLowerCase();
  if (text.includes('trượt') || text.includes('miss') || text.includes('né')) return 'miss' as const;
  if (text.includes('chí mạng') || text.includes('crit')) return 'crit' as const;
  return 'damage' as const;
}
