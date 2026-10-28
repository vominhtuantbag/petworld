import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGameLoop } from '../../hooks/useGameLoop';
import { useLayout } from '../../theme/useLayout';
import { stepField, armPortal, resetPortal, resetTerrainHazards, type FieldAxes } from '../../world/sim';
import type { FieldEvent, FieldState, LootActor } from '../../world/types';
import { FieldView, type FieldRemote } from './FieldView';
import { MovePad } from './MovePad';

type Props = {
  field: FieldState;
  onField: (field: FieldState) => void;
  onEvent: (event: FieldEvent) => void;
  canTake: (loot: LootActor) => boolean;
  paused: boolean;
  playerLevel?: number;
  stamina?: number;
  testID: string;
  player: ReactNode;
  /** False when the portrait is painted facing left. */
  playerFacesRight?: boolean;
  /** 1 keeps the original framing. Town and the open world pass a smaller value on mobile. */
  zoom?: number;
  remotes?: FieldRemote[];
  children?: ReactNode;
};

/**
 * Shared loop for the town and the wilderness. `paused` freezes the player
 * while a shop is open; monsters still advance so the world does not nap.
 */
export function FieldStage({ field, onField, onEvent, canTake, paused, playerLevel = 1, stamina, testID, player, playerFacesRight = true, zoom = 1, remotes, children }: Props) {
  const insets = useSafeAreaInsets();
  const { s, height } = useLayout();
  const pad = Math.round(Math.min(height * 0.34, Math.max(96, s(118))));
  const sim = useRef(field);
  const zoneRef = useRef(field.zoneId);
  if (zoneRef.current !== field.zoneId) {
    zoneRef.current = field.zoneId;
    sim.current = field;
    resetPortal();
    resetTerrainHazards();
  }
  const stick = useRef<FieldAxes>({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const onEventRef = useRef(onEvent);
  const onFieldRef = useRef(onField);
  const canTakeRef = useRef(canTake);
  const pausedRef = useRef(paused);
  const levelRef = useRef(playerLevel);
  const staminaRef = useRef(stamina ?? Number.POSITIVE_INFINITY);
  const marchClock = useRef(0);
  const marched = useRef(0);
  onEventRef.current = onEvent;
  onFieldRef.current = onField;
  canTakeRef.current = canTake;
  pausedRef.current = paused;
  levelRef.current = playerLevel;
  staminaRef.current = stamina ?? Number.POSITIVE_INFINITY;

  useEffect(() => listenKeys(keys.current), []);

  useGameLoop(true, (dt) => {
    const axes = pausedRef.current ? { x: 0, y: 0 } : combine(stick.current, keys.current);
    const stepped = stepField(sim.current, axes, dt, canTakeRef.current, levelRef.current, staminaRef.current);
    sim.current = stepped.state;
    onFieldRef.current(stepped.state);
    for (const event of stepped.events) {
      if (event.type !== 'march') {
        onEventRef.current(event);
        continue;
      }
      marched.current += event.distance;
      marchClock.current += event.dt;
      if (marchClock.current < 0.25) continue;
      onEventRef.current({ type: 'march', distance: marched.current, dt: marchClock.current });
      marched.current = 0;
      marchClock.current = 0;
    }
  });

  const command = combine(stick.current, keys.current);

  return (
    <View testID={testID} style={styles.stage}>
      <FieldView
        field={field}
        player={player}
        playerFacesRight={playerFacesRight}
        zoom={zoom}
        remotes={remotes}
        onSensor={(sensor) => {
          if (pausedRef.current) return;
          if (sensor.service) onEventRef.current({ type: 'service', service: sensor.service });
          if (sensor.toZone) armPortal(sensor);
        }}
      />
      <View pointerEvents="box-none" style={styles.hud}>
        <View
          pointerEvents="box-none"
          // Status bar is hidden, so its inset would leave a band above the HUD.
          style={{ paddingTop: 0, paddingLeft: insets.left, paddingRight: insets.right }}
        >
          {children}
        </View>
        <View style={[styles.padSlot, { left: insets.left + 12, bottom: insets.bottom + 12 }]}>
          <MovePad size={pad} axis={command} onChange={(axis) => (stick.current = axis)} />
        </View>
      </View>
    </View>
  );
}

function combine(stick: FieldAxes, keys: Set<string>): FieldAxes {
  let x = stick.x;
  let y = stick.y;
  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) x -= 1;
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) x += 1;
  if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) y -= 1;
  if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) y += 1;
  return { x, y };
}

function listenKeys(keys: Set<string>) {
  const target = globalThis as {
    addEventListener?: (type: string, listener: (event: { key: string; preventDefault?: () => void }) => void) => void;
    removeEventListener?: (type: string, listener: (event: { key: string; preventDefault?: () => void }) => void) => void;
  };
  if (!target.addEventListener || !target.removeEventListener) return () => undefined;
  const down = (event: { key: string; preventDefault?: () => void }) => {
    keys.add(event.key);
    if (event.key.startsWith('Arrow')) event.preventDefault?.();
  };
  const up = (event: { key: string; preventDefault?: () => void }) => {
    keys.delete(event.key);
  };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  return () => {
    target.removeEventListener?.('keydown', down);
    target.removeEventListener?.('keyup', up);
    keys.clear();
  };
}

const styles = StyleSheet.create({
  stage: { flex: 1, zIndex: 0 },
  hud: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
  },
  padSlot: { position: 'absolute', left: 16, bottom: 16 },
});
