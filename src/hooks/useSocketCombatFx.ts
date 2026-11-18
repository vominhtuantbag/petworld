import { useEffect, useRef, useState } from 'react';

import type { Step } from '../components/battle/CourtFx';
import {
  STANCE_PX,
  classifyLastHit,
  hpStrikeFacts,
  strikeFlow,
  type CombatFloat,
  type LastHitView,
} from '../world/combat/loop';

type UnitLike = { id: string; hp: number };

type SlotFn = (id: string) => { x: number; y: number } | null;

/**
 * Shared CourtFx + float pipeline for socket battles (dungeon, challenge, rank).
 * Turn timing comes from `strikeFlow`, the same schedule PvE uses.
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
  const actorRef = useRef<string | null>(null);
  const serial = useRef(0);
  const [presentedTurnId, setPresentedTurnId] = useState<string | null>(turnId);
  const [resting, setResting] = useState(false);
  const missMark = useRef<string | null>(null);
  const presentedHp = useRef<Map<string, number> | null>(null);
  const unitsRef = useRef(units);
  unitsRef.current = units;
  const hpKey = units.map((unit) => `${unit.id}:${unit.hp}`).join('|');

  useEffect(() => {
    if (finished || units.length === 0) {
      hpWatch.current = null;
      missMark.current = null;
      setFloats((current) => (current.length === 0 ? current : []));
      return;
    }
    const previous = hpWatch.current;
    const next = new Map(units.map((unit) => [unit.id, unit.hp]));
    hpWatch.current = next;
    if (!previous) {
      actorRef.current = turnId;
      return;
    }

    const born: CombatFloat[] = [];
    const hitIds: string[] = [];
    const openIds: string[] = [];
    const previousActor = actorRef.current;
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
      if (delta < 0) {
        const opening = previousActor != null && unit.id === previousActor && lastHit?.targetId !== unit.id;
        if (opening) openIds.push(unit.id);
        else hitIds.push(unit.id);
      }
    }
    actorRef.current = turnId;
    if (lastHit?.miss && lastHit.damage <= 0) {
      const mark = `${lastHit.attackerId}:${lastHit.targetId}:${lastLog ?? ''}`;
      const previousHp = previous.get(lastHit.targetId);
      const currentHp = next.get(lastHit.targetId);
      const untouched = previousHp != null && currentHp != null && currentHp >= previousHp;
      if (untouched && missMark.current !== mark) {
        missMark.current = mark;
        serial.current += 1;
        born.push({
          id: serial.current,
          fighterId: lastHit.targetId,
          amount: 0,
          kind: 'miss',
        });
      }
    }
    if (born.length > 0) setFloats((current) => [...current, ...born].slice(-24));

    if (openIds.length > 0) {
      const impact: Record<string, number> = {};
      for (const id of openIds) {
        serial.current += 1;
        impact[id] = serial.current;
      }
      setShakes((current) => ({ ...current, ...impact }));
    }
    if (hitIds.length === 0) return;
    const slashMarks: Record<string, number> = {};
    const impact: Record<string, number> = {};
    for (const id of hitIds) {
      serial.current += 1;
      slashMarks[id] = serial.current;
      serial.current += 1;
      impact[id] = serial.current;
    }
    setSlashes((current) => ({ ...current, ...slashMarks }));
    setShakes((current) => ({ ...current, ...impact }));
  }, [finished, hpKey, lastHit, lastLog, turnId, units]);

  useEffect(() => {
    const hpNow = unitsRef.current.map((unit) => ({ id: unit.id, hp: unit.hp }));
    if (presentedTurnId === turnId) {
      presentedHp.current = new Map(hpNow.map((unit) => [unit.id, unit.hp]));
      setResting(false);
      return;
    }
    const before = presentedHp.current;
    const facts = before
      ? hpStrikeFacts([...before].map(([id, hp]) => ({ id, hp })), hpNow)
      : { struck: Boolean(lastHit && lastHit.damage > 0), lethal: false };
    const flow = strikeFlow({ ...facts, captured: false, turnChanged: true, over: Boolean(finished) });
    presentedHp.current = new Map(hpNow.map((unit) => [unit.id, unit.hp]));
    const homeTimer = setTimeout(() => setResting(true), flow.swingMs);
    const timer = setTimeout(() => setPresentedTurnId(turnId), flow.restMs);
    return () => {
      clearTimeout(homeTimer);
      clearTimeout(timer);
    };
  }, [finished, lastHit, presentedTurnId, turnId, hpKey]);

  // Step-forward anticipation toward the focused (or first living) foe.
  useEffect(() => {
    if (finished || !presentedTurnId) {
      setSteps({});
      return;
    }
    if (resting) {
      setSteps((current) => {
        let changed = false;
        const home: Record<string, Step> = {};
        for (const [id, pose] of Object.entries(current)) {
          if (pose.x === 0 && pose.y === 0) {
            home[id] = pose;
            continue;
          }
          serial.current += 1;
          home[id] = { key: serial.current, x: 0, y: 0 };
          changed = true;
        }
        return changed ? home : current;
      });
      return;
    }
    const living = units.filter((unit) => unit.hp > 0);
    const actorSlot = slotOf(presentedTurnId);
    const targetId = focusId ?? living.find((unit) => unit.id !== presentedTurnId)?.id ?? null;
    const targetSlot = targetId ? slotOf(targetId) : null;
    setSteps((current) => {
      const next: Record<string, Step> = {};
      let changed = false;
      for (const unit of living) {
        if (unit.id === presentedTurnId && actorSlot && targetSlot) {
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
  }, [finished, focusId, presentedTurnId, resting, slotOf, hpKey]);

  return {
    floats,
    dismissFloat: (id: number) => setFloats((current) => current.filter((entry) => entry.id !== id)),
    steps,
    slashes,
    shakes,
    presentedTurnId,
  };
}

function floatFromLog(line: string | undefined, delta: number) {
  if (delta > 0) return 'heal' as const;
  if (delta < 0) {
    const text = (line ?? '').toLowerCase();
    if (text.includes('chí mạng') || text.includes('crit')) return 'crit' as const;
    return 'damage' as const;
  }
  return 'damage' as const;
}
