import { useRef, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { FieldState, Rect, Sensor } from '../../world/types';
import { portalLayout } from '../../world/portals';
import { portalFade } from '../../world/sim';
import { DesertProp, desertFootY, isDesertKind } from './DesertProp';
import { stepHorizontalFacing } from './facing';
import { PortalGate } from './PortalGate';
import { advanceStride, createStride, type StridePose } from './stride';
import { MonsterToken } from './MonsterToken';
import { PlainsProp } from './PlainsProp';
import { isSwampKind, SwampMist, SwampProp } from './SwampProp';
import { TownHouse } from './TownHouse';

const TOWN_MAP = require('../../../assets/maps/town-valley.jpg');

type Props = {
  field: FieldState;
  player: ReactNode;
  /** False when the drawn portrait already looks left, so the mirror faces right. */
  playerFacesRight?: boolean;
  /**
   * 1 is the current framing: one world pixel per screen pixel, using the
   * original translate camera. A smaller value pulls the camera back.
   * Desktop web stays at 1. Phone browsers use the native zoom.
   */
  zoom?: number;
  onSensor: (sensor: Sensor) => void;
};

/**
 * Top-down camera. The map is larger than the screen; it translates so the
 * player stays near the middle. Building and gate labels are pressable, so
 * a tap works as well as walking into the sensor.
 */
export function FieldView({ field, player, playerFacesRight = true, zoom = 1, onSensor }: Props) {
  const [view, setView] = useState({ w: 0, h: 0 });
  const lastPlayer = useRef({ x: field.player.x, y: field.player.y });
  const playerFacing = useRef<1 | -1>(1);
  const stride = useRef(createStride());
  const playerDx = field.player.x - lastPlayer.current.x;
  const playerDy = field.player.y - lastPlayer.current.y;
  playerFacing.current = stepHorizontalFacing(playerFacing.current, playerDx, 0.35, playerDy);
  const stridePose = advanceStride(
    stride.current,
    Math.hypot(playerDx, playerDy) > 0.35,
    field.player.x,
    field.player.y,
    playerDx,
    playerDy,
  );
  lastPlayer.current = { x: field.player.x, y: field.player.y };
  const scenic = field.provinceId === 'plains' && field.chunkSize > 0;
  const zoned = (field.zones?.length ?? 0) >= 5;
  const playH = view.h;
  const scale = zoom > 0 && zoom < 1 ? zoom : 1;
  const focus = scale < 1 && view.w > 0 ? cameraFocus(field, view.w, playH, scale) : null;
  const camera = focus ? wideCamera(focus, view.w, playH, field, scale) : cameraOffset(field, view.w, playH);
  const frame = view.w > 0 ? (focus ? wideFrame(focus, view.w, playH, scale) : worldFrame(camera, view.w, playH)) : null;
  const shown = (rect: Rect) => frame != null && overlapsFrame(rect, frame);
  const desert = field.provinceId === 'desert' && field.chunkSize > 0;
  const swamp = field.provinceId === 'swamp' && field.chunkSize > 0;
  const terrain = field.decor.filter((rect) => TERRAIN.has(rect.kind ?? '') && shown(rect));
  const rolling = field.decor.filter((rect) => AMBIENT.has(rect.kind ?? '') && shown(rect));
  const flora = field.decor.filter((rect) => !TERRAIN.has(rect.kind ?? '') && !AMBIENT.has(rect.kind ?? '') && shown(rect));
  const overlay = field.blocks.filter(
    (rect) =>
      COVER.has(rect.kind ?? '') &&
      shown(rect) &&
      !(scenic && PLAINS_STANDING.has(rect.kind ?? '')) &&
      !(desert && DESERT_STANDING.has(rect.kind ?? '')),
  );
  const structures = field.blocks.filter((rect) => {
    if (!shown(rect) || COVER.has(rect.kind ?? '')) return false;
    if (scenic && (rect.kind === 'puddle' || PLAINS_STANDING.has(rect.kind ?? ''))) return false;
    if (desert && DESERT_STANDING.has(rect.kind ?? '')) return false;
    return true;
  });
  const floorWater = scenic ? field.blocks.filter((rect) => rect.kind === 'puddle' && shown(rect)) : [];
  const standing = scenic
    ? field.blocks.filter((rect) => PLAINS_STANDING.has(rect.kind ?? '') && shownTall(rect, frame))
    : desert
      ? field.blocks.filter((rect) => DESERT_STANDING.has(rect.kind ?? '') && shownTall(rect, frame))
      : [];
  const depth = scenic || desert
    ? [
        ...standing.map((rect, index) => ({
          key: `stand-${index}-${rect.kind ?? 'prop'}`,
          y: scenic ? rect.y + rect.h : desertFootY(rect),
          node: scenic ? <PlainsProp rect={rect} sprites /> : <DesertProp rect={rect} sprites />,
        })),
        ...field.monsters
          .filter((monster) => shown({ x: monster.x - monster.r, y: monster.y - monster.r, w: monster.r * 2, h: monster.r * 2 }))
          .map((monster) => ({
            key: monster.id,
            y: monster.y + monster.r,
            node: (
              <View pointerEvents="none">
                <MonsterToken monster={monster} />
                <Text style={[styles.actorLabel, { left: monster.x - 46, top: monster.y - monster.r - 28 }]}>
                  {monster.name} · cấp {monster.level}
                </Text>
              </View>
            ),
          })),
        ...field.loot
          .filter((drop) => shown({ x: drop.x - 8, y: drop.y - 8, w: 16, h: 16 }))
          .map((drop) => ({
            key: drop.id,
            y: drop.y,
            node: (
              <View
                pointerEvents="none"
                style={[styles.loot, { left: drop.x - 8, top: drop.y - 8, backgroundColor: drop.tint }]}
              />
            ),
          })),
        ...gateNodes(field, frame, onSensor),
        {
          key: 'party',
          y: field.player.y + 28,
          node: (
            <>
              <StepDust pose={stridePose} />
              <PortalSwirl x={field.player.x} y={field.player.y} />
              <PlayerMark
                x={field.player.x}
                y={field.player.y}
                facing={playerFacing.current}
                facesRight={playerFacesRight}
                pose={stridePose}
                player={player}
              />
            </>
          ),
        },
      ].sort((a, b) => a.y - b.y)
    : null;

  return (
    <View
      style={[styles.clip, { backgroundColor: field.ground }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setView({ w: width, h: height });
      }}
    >
      {/* The meadow fills the screen. Standing trees and rocks sort with actors by foot position. */}
      <View style={[styles.pane, { top: 0 }]}>
        <View
          style={
            focus
              ? {
                  position: 'absolute',
                  left: camera.x,
                  top: camera.y,
                  width: field.width,
                  height: field.height,
                  transform: [{ scale }],
                }
              : {
                  width: field.width,
                  height: field.height,
                  transform: [{ translateX: camera.x }, { translateY: camera.y }],
                }
          }
        >
          {field.zoneId.startsWith('town:') ? (
            <Image
              source={TOWN_MAP}
              resizeMode="stretch"
              style={{ position: 'absolute', left: 0, top: 0, width: field.width, height: field.height }}
            />
          ) : null}
          {terrain.map((rect, index) => drawProp(rect, index, 'terrain', desert, swamp, scenic))}
          {field.hazards.filter((hazard) => shown(hazard)).map((hazard) => (
            <View
              key={hazard.id}
              pointerEvents="none"
              style={[styles.rect, { left: hazard.x, top: hazard.y, width: hazard.w, height: hazard.h, backgroundColor: hazard.fill ?? 'rgba(180,60,90,0.28)' }]}
            >
              {hazard.label ? <Text style={styles.blockLabel}>{hazard.label}</Text> : null}
            </View>
          ))}
          {flora.map((rect, index) => drawProp(rect, index, 'decor', desert, swamp, scenic))}
          {floorWater.map((rect, index) => drawProp(rect, index, 'water', false, false, true))}
          {structures.map((rect, index) => drawStructure(rect, index))}
          {/* Level zones, the quiet entrance, and agro circles stay in the sim. They are not drawn. */}
          {depth
            ? depth.map((item) => (
                <View
                  key={item.key}
                  pointerEvents="box-none"
                  collapsable={false}
                  style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round(item.y * 10) }}
                >
                  {item.node}
                </View>
              ))
            : (
              <>
                {field.monsters.filter((monster) => shown({ x: monster.x - monster.r, y: monster.y - monster.r, w: monster.r * 2, h: monster.r * 2 })).map((monster) => (
                  <View
                    key={monster.id}
                    pointerEvents="box-none"
                    collapsable={false}
                    style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round((monster.y + monster.r) * 10) }}
                  >
                    <View pointerEvents="none">
                      <MonsterToken monster={monster} />
                      <Text style={[styles.actorLabel, { left: monster.x - 46, top: monster.y - monster.r - 28 }]}>
                        {monster.name} · cấp {monster.level}
                      </Text>
                    </View>
                  </View>
                ))}
                {field.loot.filter((drop) => shown({ x: drop.x - 8, y: drop.y - 8, w: 16, h: 16 })).map((drop) => (
                  <View
                    key={drop.id}
                    pointerEvents="none"
                    style={[styles.loot, { left: drop.x - 8, top: drop.y - 8, backgroundColor: drop.tint, zIndex: Math.round(drop.y * 10) }]}
                  />
                ))}
                {gateNodes(field, frame, onSensor).map((item) => (
                  <View
                    key={item.key}
                    pointerEvents="box-none"
                    collapsable={false}
                    style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round(item.y * 10) }}
                  >
                    {item.node}
                  </View>
                ))}
                <View
                  pointerEvents="box-none"
                  collapsable={false}
                  style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round((field.player.y + 28) * 10) }}
                >
                  <StepDust pose={stridePose} />
                  <PortalSwirl x={field.player.x} y={field.player.y} />
                  <PlayerMark
                    x={field.player.x}
                    y={field.player.y}
                    facing={playerFacing.current}
                    facesRight={playerFacesRight}
                    pose={stridePose}
                    player={player}
                  />
                </View>
              </>
            )}
          {rolling.map((rect, index) => drawProp(rect, index, 'weed', desert, swamp, scenic))}
          {overlay.map((rect, index) => drawProp(rect, index, 'cover', desert, swamp))}
          {field.sensors.filter((sensor) => !sensor.toZone && shown({ x: sensor.x - sensor.r, y: sensor.y - sensor.r, w: sensor.r * 2, h: sensor.r * 2 })).map((sensor) => (
            <Pressable
              key={sensor.id}
              accessibilityRole="button"
              accessibilityLabel={sensor.label}
              testID={`sensor-${sensor.id}`}
              onPress={() => onSensor(sensor)}
              style={[
                zoned ? styles.sensorPlain : styles.sensor,
                styles.sensorFront,
                {
                  left: sensor.x - sensor.r,
                  top: sensor.y - sensor.r,
                  width: sensor.r * 2,
                  height: sensor.r * 2,
                  borderRadius: sensor.r,
                },
              ]}
            >
              <Text style={styles.sensorLabel}>{sensor.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {swamp ? <SwampMist /> : null}
    </View>
  );
}

function gateNodes(
  field: FieldState,
  frame: { x: number; y: number; w: number; h: number } | null,
  onSensor: (sensor: Sensor) => void,
) {
  if (!frame) return [];
  const nodes: { key: string; y: number; node: ReactNode }[] = [];
  for (const sensor of field.sensors) {
    if (!sensor.toZone) continue;
    const pose = portalLayout(sensor);
    if (!overlapsFrame(pose.bounds, frame)) continue;
    nodes.push({
      key: `gate-${sensor.id}`,
      y: pose.sortY,
      node: <PortalGate pose={pose} label={sensor.label} onPress={() => onSensor(sensor)} />,
    });
  }
  return nodes;
}

function PortalSwirl({ x, y }: { x: number; y: number }) {
  const fade = portalFade();
  if (fade <= 0) return null;
  const size = 78 + fade * 36;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - 20 - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: `rgba(90, 200, 255, ${0.9 - fade * 0.35})`,
        backgroundColor: `rgba(140, 220, 255, ${0.22 * fade})`,
        transform: [{ rotate: `${fade * 240}deg` }, { scale: 1 - fade * 0.2 }],
      }}
    />
  );
}

function PlayerMark({
  x,
  y,
  facing,
  facesRight,
  pose,
  player,
}: {
  x: number;
  y: number;
  facing: 1 | -1;
  facesRight: boolean;
  pose: StridePose;
  player: ReactNode;
}) {
  // Facing 1 is a step to the right. facesRight is false for every class sheet,
  // matching Nữ hộ vệ, so a step right stays unmirrored. Squash stays positive.
  const face = facing * (facesRight ? -1 : 1);
  const drawH = 109;
  const drawW = Math.round(drawH / 1.22);
  const fade = portalFade();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - drawW / 2,
        top: y + 28 - drawH + pose.bob,
        width: drawW,
        height: drawH,
        alignItems: 'center',
        opacity: 1 - fade,
      }}
    >
      <View
        style={{
          transform: [
            { translateX: pose.sway },
            { rotate: `${pose.tilt}deg` },
            { scaleX: face * pose.breathX },
            { scaleY: pose.breathY },
          ],
        }}
      >
        {player}
      </View>
    </View>
  );
}

function StepDust({ pose }: { pose: StridePose }) {
  return (
    <>
      {pose.dust.map((mote) => {
        const age = (pose.now - mote.born) / mote.life;
        return (
          <View
            key={mote.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: mote.x + mote.vx * age - mote.size / 2,
              top: mote.y + mote.vy * age - mote.size / 2,
              width: mote.size + 2,
              height: Math.max(3, mote.size - 1),
              borderRadius: mote.size,
              opacity: (1 - age) * (1 - age * 0.35) * 0.82,
              backgroundColor: 'rgba(214, 216, 214, 0.96)',
            }}
          />
        );
      })}
    </>
  );
}

const TERRAIN = new Set(['light', 'dune', 'oasis', 'crack', 'quicksand', 'puddle', 'dry', 'mud']);
const AMBIENT = new Set(['tumbleweed', 'firefly', 'bubble', 'fog']);
const COVER = new Set(['tree', 'acacia', 'rock', 'saguaro', 'barrel', 'bunny', 'cactus', 'palm', 'mangrove', 'log', 'boulder']);
/** Trees, single rocks, and rock piles share the actor depth list on the plains. */
const PLAINS_STANDING = new Set(['tree', 'rock', 'pile']);
const DESERT_STANDING = new Set(['dune', 'rock', 'oasis', 'cactus', 'saguaro', 'barrel', 'bunny', 'palm']);

function shownTall(rect: Rect, frame: { x: number; y: number; w: number; h: number } | null): boolean {
  if (!frame) return false;
  return overlapsFrame({ x: rect.x - 70, y: rect.y - 170, w: rect.w + 140, h: rect.h + 170 }, frame);
}

function drawProp(rect: Rect, index: number, prefix: string, desert: boolean, swamp: boolean, sprites = false) {
  if (swamp && isSwampKind(rect.kind)) return <SwampProp key={`${prefix}-${index}`} rect={rect} />;
  if (desert && (isDesertKind(rect.kind) || rect.kind === 'rock')) {
    return <DesertProp key={`${prefix}-${index}`} rect={rect} sprites />;
  }
  if (rect.kind) return <PlainsProp key={`${prefix}-${index}`} rect={rect} sprites={sprites} />;
  return (
    <View
      key={`${prefix}-${index}`}
      style={[styles.rect, { left: rect.x, top: rect.y, width: rect.w, height: rect.h, backgroundColor: rect.fill }]}
    />
  );
}

function drawStructure(rect: Rect, index: number) {
  if (rect.roof) return <TownHouse key={`house-${index}`} house={rect} />;
  return (
    <View
      key={`block-${index}`}
      style={[styles.block, { left: rect.x, top: rect.y, width: rect.w, height: rect.h, backgroundColor: rect.fill ?? 'rgba(0,0,0,0.2)' }]}
    >
      {rect.label ? <Text style={styles.blockLabel}>{rect.label}</Text> : null}
    </View>
  );
}

function cameraFocus(field: FieldState, viewW: number, viewH: number, zoom: number) {
  return {
    x: axisFocus(field.player.x, viewW / zoom, field.width),
    y: axisFocus(field.player.y, viewH / zoom, field.height),
  };
}

function axisFocus(center: number, view: number, world: number) {
  if (view >= world) return world / 2;
  const half = view / 2;
  return Math.max(half, Math.min(world - half, center));
}

/** Screen position of the world view when scale is around its center. */
function wideCamera(
  focus: { x: number; y: number },
  viewW: number,
  viewH: number,
  field: FieldState,
  zoom: number,
) {
  return {
    x: viewW / 2 - focus.x * zoom - (field.width / 2) * (1 - zoom),
    y: viewH / 2 - focus.y * zoom - (field.height / 2) * (1 - zoom),
  };
}

function wideFrame(focus: { x: number; y: number }, viewW: number, viewH: number, zoom: number) {
  const margin = 180 / zoom;
  const worldW = viewW / zoom;
  const worldH = viewH / zoom;
  return {
    x: focus.x - worldW / 2 - margin,
    y: focus.y - worldH / 2 - margin,
    w: worldW + margin * 2,
    h: worldH + margin * 2,
  };
}

function cameraOffset(field: FieldState, viewW: number, viewH: number) {
  if (viewW <= 0 || viewH <= 0) return { x: 0, y: 0 };
  return {
    x: axisCamera(field.player.x, viewW, field.width),
    y: axisCamera(field.player.y, viewH, field.height),
  };
}

function axisCamera(center: number, view: number, world: number) {
  if (view >= world) return (view - world) / 2;
  const raw = center - view / 2;
  return -Math.max(0, Math.min(world - view, raw));
}

/** World-space rectangle currently on screen, plus a margin so props do not pop. */
function worldFrame(camera: { x: number; y: number }, viewW: number, viewH: number) {
  const margin = 180;
  return {
    x: -camera.x - margin,
    y: -camera.y - margin,
    w: viewW + margin * 2,
    h: viewH + margin * 2,
  };
}

function overlapsFrame(rect: Rect, frame: { x: number; y: number; w: number; h: number }): boolean {
  return rect.x < frame.x + frame.w && rect.x + rect.w > frame.x && rect.y < frame.y + frame.h && rect.y + rect.h > frame.y;
}

const styles = StyleSheet.create({
  clip: { flex: 1, overflow: 'hidden' },
  pane: { position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  rect: { position: 'absolute' },
  block: {
    position: 'absolute',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  blockLabel: { color: '#f6f1e7', fontWeight: '700', textAlign: 'center', paddingHorizontal: 6 },
  actorLabel: {
    position: 'absolute',
    width: 92,
    textAlign: 'center',
    color: '#f6f1e7',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
  loot: { position: 'absolute', width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },
  sensor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 14, 12, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(228, 194, 122, 0.7)',
  },
  sensorPlain: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sensorFront: { zIndex: 1000000 },
  sensorLabel: { color: '#f6f1e7', fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
