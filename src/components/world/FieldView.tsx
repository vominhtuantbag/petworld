import { useRef, useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { portalLayout } from '../../world/portals';
import { playerInHazard, portalFade } from '../../world/sim';
import { townMapSource } from '../../world/townAssets';
import { depthAxis } from '../../world/zoneDecor';
import type { FieldState, LootActor, Rect, Sensor } from '../../world/types';
import { FloatingCombatText } from '../battle/FloatingCombatText';
import { ItemIcon } from '../ItemIcon';
import { DepthGradient } from './DepthGradient';
import { DesertProp, desertFootY, isDesertKind } from './DesertProp';
import {
  DESERT_DEPTH_STOPS,
  DesertGateArt,
  desertGateVariant,
  DesertHaze,
  DesertMapLoot,
  DesertMapProp,
  isDesertMapKind,
} from './DesertMapProp';
import { hasWalkPack, isFrameWalkPack, walkSource, type WalkDir, type WalkIdentity } from './characterWalk';
import { DaoChichPuppet, isDaoChichPuppet } from './DaoChichPuppet';
import { stepCardinalFacing, stepHorizontalFacing } from './facing';
import { easeGaitAxis, feelFromAxis, targetPlayerGait, type GaitFeel } from './playerGait';
import { PortalGate } from './PortalGate';
import { advanceStride, createStride, type StridePose } from './stride';
import { MonsterToken } from './MonsterToken';
import {
  FloatingLoot,
  isOceanKind,
  OCEAN_DEPTH_STOPS,
  OceanGateArt,
  oceanGateVariant,
  OceanProp,
  SailboatBack,
  SailboatHull,
  WakeTrail,
} from './OceanProp';
import {
  isMountainKind,
  MOUNTAIN_DEPTH_STOPS,
  MountainGateArt,
  mountainGateVariant,
  MountainLoot,
  MountainProp,
} from './MountainProp';
import {
  BEACH_DEPTH_STOPS,
  BeachGateArt,
  beachGateVariant,
  BeachLoot,
  BeachProp,
  isBeachKind,
} from './BeachProp';
import {
  FOREST_DEPTH_STOPS,
  ForestGateArt,
  forestGateVariant,
  ForestLoot,
  ForestProp,
  isForestKind,
} from './ForestProp';
import {
  FROST_DEPTH_STOPS,
  FrostGateArt,
  frostGateVariant,
  FrostLoot,
  FrostProp,
  FrostSnow,
  isFrostKind,
} from './FrostProp';
import { PlainsProp } from './PlainsProp';
import {
  isPlainsMapKind,
  PlainsDawn,
  PlainsGateArt,
  plainsGateVariant,
  PlainsMapBackdrop,
  PlainsMapLoot,
  PlainsMapProp,
} from './PlainsMapProp';
import {
  isSavannaKind,
  SAVANNAH_DEPTH_STOPS,
  SavannaGateArt,
  savannaGateVariant,
  SavannaHaze,
  SavannaLoot,
  SavannaProp,
} from './SavannaProp';
import {
  isSwampMapKind,
  SWAMP_DEPTH_STOPS,
  SwampGateArt,
  swampGateVariant,
  SwampLoot,
  SwampMapProp,
} from './SwampMapProp';
import { isSwampKind, SwampMist, SwampProp } from './SwampProp';
import { TownHouse } from './TownHouse';
import {
  isVolcanoKind,
  VOLCANO_DEPTH_STOPS,
  VolcanoAsh,
  VolcanoGateArt,
  volcanoGateVariant,
  VolcanoLoot,
  VolcanoProp,
} from './VolcanoProp';

const LOOT_SIZE = 40;
/** Matches `PlayerMark` body box so hazard floats sit just above the head. */
const PLAYER_DRAW_H = 109;
const PLAYER_FEET = 28;

export type FieldHazardFloat = { id: number; amount: number; kind: 'hp' | 'stamina' };

type Props = {
  field: FieldState;
  player: ReactNode;
  /** False when the drawn portrait already looks left, so the mirror faces right. */
  playerFacesRight?: boolean;
  /** When set and a walk pack exists, field uses directional walk frames. */
  walkCharacter?: WalkIdentity | null;
  /**
   * 1 is one world pixel per screen pixel. A smaller value pulls the camera
   * back. Web and native both use the wide camera.
   */
  zoom?: number;
  onSensor: (sensor: Sensor) => void;
  /** Other accounts already positioned in world pixels. */
  remotes?: FieldRemote[];
  /** Hazard drain popups anchored in world space above the player. */
  hazardFloats?: FieldHazardFloat[];
  onHazardFloatDone?: (id: number) => void;
  /** Current stamina — empty stamina also suppresses step dust. */
  stamina?: number;
};

export type FieldRemote = {
  id: string;
  x: number;
  y: number;
  node: ReactNode;
};

/**
 * Top-down camera. The map is larger than the screen; it translates so the
 * player stays near the middle. Building and gate labels are pressable, so
 * a tap works as well as walking into the sensor.
 */
export function FieldView({
  field,
  player,
  playerFacesRight = true,
  walkCharacter = null,
  zoom = 1,
  onSensor,
  remotes,
  hazardFloats,
  onHazardFloatDone,
  stamina,
}: Props) {
  const [view, setView] = useState({ w: 0, h: 0 });
  const lastPlayer = useRef({ x: field.player.x, y: field.player.y });
  const playerFacing = useRef<1 | -1>(1);
  const walkDir = useRef<WalkDir>('down');
  const stride = useRef(createStride());
  const gaitAxis = useRef(1);
  const gaitClock = useRef(Date.now());
  const playerDx = field.player.x - lastPlayer.current.x;
  const playerDy = field.player.y - lastPlayer.current.y;
  playerFacing.current = stepHorizontalFacing(playerFacing.current, playerDx, 0.35, playerDy);
  walkDir.current = stepCardinalFacing(walkDir.current, playerDx, playerDy, 0.35);
  const useWalk = hasWalkPack(walkCharacter);
  const onHazard = playerInHazard(field);
  const inTown = field.zoneId.startsWith('town:');
  const winded = stamina != null && stamina <= 0;
  const moving = Math.hypot(playerDx, playerDy) > 0.35;
  const now = Date.now();
  const gaitDt = Math.min(0.05, Math.max(0, (now - gaitClock.current) / 1000));
  gaitClock.current = now;
  gaitAxis.current = easeGaitAxis(gaitAxis.current, targetPlayerGait(inTown, stamina, moving), gaitDt);
  const gaitFeel = feelFromAxis(gaitAxis.current);
  // Dust = open-map run only. Town walk and empty-SP crawl stay clean.
  const stridePose = advanceStride(
    stride.current,
    moving,
    field.player.x,
    field.player.y,
    playerDx,
    playerDy,
    now,
    !inTown && !onHazard && !winded,
    {
      cadence: gaitFeel.cadence,
      bobScale: gaitFeel.bob / 3.4,
      tiltScale: gaitFeel.tilt / 5.2,
      swayScale: gaitFeel.sway / 2.1,
    },
  );
  lastPlayer.current = { x: field.player.x, y: field.player.y };
  const plains = field.provinceId === 'plains' && field.chunkSize > 0;
  const zoned = (field.zones?.length ?? 0) >= 5;
  const plainsMap = plains && zoned;
  /** Legacy sprite plains (sector / pre-zone) keeps depth-sorted standing props. */
  const scenic = plains && !plainsMap;
  const playH = view.h;
  const scale = zoom > 0 && zoom < 1 ? zoom : 1;
  const focus = scale < 1 && view.w > 0 ? cameraFocus(field, view.w, playH, scale) : null;
  const camera = focus ? wideCamera(focus, view.w, playH, field, scale) : cameraOffset(field, view.w, playH);
  const frame = view.w > 0 ? (focus ? wideFrame(focus, view.w, playH, scale) : worldFrame(camera, view.w, playH)) : null;
  const shown = (rect: Rect) => frame != null && overlapsFrame(rect, frame);
  const desert = field.provinceId === 'desert' && field.chunkSize > 0;
  const swamp = field.provinceId === 'swamp' && field.chunkSize > 0;
  const ocean = field.provinceId === 'ocean' && field.chunkSize > 0;
  const mountains = field.provinceId === 'mountains' && field.chunkSize > 0;
  const forest = field.provinceId === 'forest' && field.chunkSize > 0;
  const beach = field.provinceId === 'beach' && field.chunkSize > 0;
  const frost = field.provinceId === 'tundra' && field.chunkSize > 0;
  const savannah = field.provinceId === 'savannah' && field.chunkSize > 0;
  const volcano = field.provinceId === 'volcano' && field.chunkSize > 0;
  const toScreen = (point: { x: number; y: number }) =>
    focus
      ? { x: view.w / 2 + (point.x - focus.x) * scale, y: playH / 2 + (point.y - focus.y) * scale }
      : { x: point.x + camera.x, y: point.y + camera.y };
  const swampMap = swamp && zoned;
  const mountainMap = mountains && zoned;
  const forestMap = forest && zoned;
  const beachMap = beach && zoned;
  const frostMap = frost && zoned;
  const savannahMap = savannah && zoned;
  const volcanoMap = volcano && zoned;
  const desertMap = desert && zoned;
  /** Legacy sprite desert (sector / pre-zone) keeps depth-sorted standing props. */
  const desertLegacy = desert && !desertMap;
  const depthStops = ocean
    ? OCEAN_DEPTH_STOPS
    : swampMap
      ? SWAMP_DEPTH_STOPS
      : mountainMap
        ? MOUNTAIN_DEPTH_STOPS
        : forestMap
          ? FOREST_DEPTH_STOPS
          : beachMap
            ? BEACH_DEPTH_STOPS
            : frostMap
              ? FROST_DEPTH_STOPS
              : savannahMap
                ? SAVANNAH_DEPTH_STOPS
                : volcanoMap
                  ? VOLCANO_DEPTH_STOPS
                  : desertMap
                    ? DESERT_DEPTH_STOPS
                    : null;
  const axis = depthStops ? depthAxis(field) : null;
  const depthFrom = axis ? toScreen(axis.from) : null;
  const depthTo = axis ? toScreen(axis.to) : null;
  const gateArt = ocean
    ? (sensor: Sensor, w: number, h: number) => <OceanGateArt variant={oceanGateVariant(sensor.id)} width={w} height={h} />
    : swampMap
      ? (sensor: Sensor, w: number, h: number) => <SwampGateArt variant={swampGateVariant(sensor.id)} width={w} height={h} />
      : mountainMap
        ? (sensor: Sensor, w: number, h: number) => <MountainGateArt variant={mountainGateVariant(sensor.id)} width={w} height={h} />
        : forestMap
          ? (sensor: Sensor, w: number, h: number) => <ForestGateArt variant={forestGateVariant(sensor.id)} width={w} height={h} />
          : beachMap
            ? (sensor: Sensor, w: number, h: number) => <BeachGateArt variant={beachGateVariant(sensor.id)} width={w} height={h} />
            : frostMap
              ? (sensor: Sensor, w: number, h: number) => <FrostGateArt variant={frostGateVariant(sensor.id)} width={w} height={h} />
              : savannahMap
                ? (sensor: Sensor, w: number, h: number) => (
                    <SavannaGateArt variant={savannaGateVariant(sensor.id)} width={w} height={h} />
                  )
                : volcanoMap
                  ? (sensor: Sensor, w: number, h: number) => (
                      <VolcanoGateArt variant={volcanoGateVariant(sensor.id)} width={w} height={h} />
                    )
                  : desertMap
                    ? (sensor: Sensor, w: number, h: number) => (
                        <DesertGateArt variant={desertGateVariant(sensor.id)} width={w} height={h} />
                      )
                    : plainsMap
                      ? (sensor: Sensor, w: number, h: number) => (
                          <PlainsGateArt variant={plainsGateVariant(sensor.id)} width={w} height={h} />
                        )
                      : undefined;
  // Rocking on the swell replaces the walking bob while sailing.
  const sailPose: StridePose = ocean
    ? {
        ...stridePose,
        bob: Math.sin(stridePose.now / 380) * 2.4,
        tilt: Math.sin(stridePose.now / 520) * 1.6,
        sway: 0,
        breathX: 1,
        breathY: 1,
      }
    : stridePose;
  const terrain = field.decor.filter((rect) => TERRAIN.has(rect.kind ?? '') && shown(rect));
  const rolling = field.decor.filter((rect) => AMBIENT.has(rect.kind ?? '') && shown(rect));
  const flora = field.decor.filter(
    (rect) => !TERRAIN.has(rect.kind ?? '') && !AMBIENT.has(rect.kind ?? '') && rect.kind !== 'watcheye' && shown(rect),
  );
  const overlay = field.blocks.filter(
    (rect) =>
      COVER.has(rect.kind ?? '') &&
      shown(rect) &&
      !(scenic && PLAINS_STANDING.has(rect.kind ?? '')) &&
      !(desertLegacy && DESERT_STANDING.has(rect.kind ?? '')),
  );
  const structures = field.blocks.filter((rect) => {
    if (!shown(rect) || COVER.has(rect.kind ?? '')) return false;
    // Collision-only rects (Bãi Biển path mask) stay invisible.
    if (!rect.kind && !rect.roof && !rect.fill) return false;
    if (scenic && (rect.kind === 'puddle' || PLAINS_STANDING.has(rect.kind ?? ''))) return false;
    if (desertLegacy && DESERT_STANDING.has(rect.kind ?? '')) return false;
    return true;
  });
  const floorWater = scenic ? field.blocks.filter((rect) => rect.kind === 'puddle' && shown(rect)) : [];
  const standing = scenic
    ? field.blocks.filter((rect) => PLAINS_STANDING.has(rect.kind ?? '') && shownTall(rect, frame))
    : desertLegacy
      ? field.blocks.filter((rect) => DESERT_STANDING.has(rect.kind ?? '') && shownTall(rect, frame))
      : [];
  const depth = scenic || desertLegacy
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
                <MonsterToken monster={monster} zoneId={field.zoneId} />
                <Text style={[styles.actorLabel, { left: monster.x - 46, top: monster.y - monster.r - 28 }]}>
                  {monster.name} · cấp {monster.level}
                </Text>
              </View>
            ),
          })),
        ...field.loot
          .filter((drop) => shown({ x: drop.x - LOOT_SIZE / 2, y: drop.y - LOOT_SIZE / 2, w: LOOT_SIZE, h: LOOT_SIZE }))
          .map((drop) => ({
            key: drop.id,
            y: drop.y,
            node: <FieldLootMark drop={drop} />,
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
                walk={useWalk ? walkCharacter : null}
                walkDir={walkDir.current}
                gaitFeel={gaitFeel}
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
      {depthStops && depthFrom && depthTo ? (
        <DepthGradient
          width={view.w}
          height={view.h}
          x1={snap(depthFrom.x)}
          y1={snap(depthFrom.y)}
          x2={snap(depthTo.x)}
          y2={snap(depthTo.y)}
          stops={depthStops}
        />
      ) : null}
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
              source={townMapSource(field.regionId)}
              resizeMode="stretch"
              style={{ position: 'absolute', left: 0, top: 0, width: field.width, height: field.height }}
            />
          ) : null}
          {plainsMap ? <PlainsMapBackdrop width={field.width} height={field.height} frame={frame} /> : null}
          {terrain.map((rect, index) => drawProp(rect, index, 'terrain', desert, swamp, scenic, field.player))}
          {field.hazards.filter((hazard) => shown(hazard)).map((hazard) => (
            <View
              key={hazard.id}
              pointerEvents="none"
              style={[styles.rect, { left: hazard.x, top: hazard.y, width: hazard.w, height: hazard.h, backgroundColor: hazard.fill ?? 'rgba(180,60,90,0.28)' }]}
            >
              {hazard.label ? <Text style={styles.blockLabel}>{hazard.label}</Text> : null}
            </View>
          ))}
          {flora.map((rect, index) => drawProp(rect, index, 'decor', desert, swamp, scenic, field.player))}
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
                      <MonsterToken monster={monster} zoneId={field.zoneId} />
                      <Text style={[styles.actorLabel, { left: monster.x - 46, top: monster.y - monster.r - 28 }]}>
                        {monster.name} · cấp {monster.level}
                      </Text>
                    </View>
                  </View>
                ))}
                {field.loot
                  .filter((drop) =>
                    shown({ x: drop.x - LOOT_SIZE / 2, y: drop.y - LOOT_SIZE / 2, w: LOOT_SIZE, h: LOOT_SIZE }),
                  )
                  .map((drop) => (
                    <View
                      key={drop.id}
                      pointerEvents="none"
                      style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round(drop.y * 10) }}
                    >
                      {ocean ? (
                        <FloatingLoot drop={drop} />
                      ) : swamp ? (
                        <SwampLoot drop={drop} />
                      ) : mountains ? (
                        <MountainLoot drop={drop} />
                      ) : forest ? (
                        <ForestLoot drop={drop} />
                      ) : beach ? (
                        <BeachLoot drop={drop} />
                      ) : frost ? (
                        <FrostLoot drop={drop} />
                      ) : savannah ? (
                        <SavannaLoot drop={drop} />
                      ) : volcano ? (
                        <VolcanoLoot drop={drop} />
                      ) : desertMap ? (
                        <DesertMapLoot drop={drop} />
                      ) : plainsMap ? (
                        <PlainsMapLoot drop={drop} />
                      ) : (
                        <FieldLootMark drop={drop} />
                      )}
                    </View>
                  ))}
                {gateNodes(field, frame, onSensor, gateArt).map((item) => (
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
                  {ocean ? <WakeTrail pose={stridePose} /> : <StepDust pose={stridePose} />}
                  <PortalSwirl x={field.player.x} y={field.player.y} />
                  {ocean ? (
                    <SailboatBack x={field.player.x} y={field.player.y} facing={playerFacing.current} bob={sailPose.bob} />
                  ) : null}
                  <PlayerMark
                    x={field.player.x}
                    y={field.player.y}
                    facing={playerFacing.current}
                    facesRight={playerFacesRight}
                    pose={sailPose}
                    player={player}
                    walk={useWalk ? walkCharacter : null}
                    walkDir={walkDir.current}
                    gaitFeel={gaitFeel}
                  />
                  {ocean ? (
                    <SailboatHull x={field.player.x} y={field.player.y} facing={playerFacing.current} bob={sailPose.bob} />
                  ) : null}
                </View>
              </>
            )}
          {rolling.map((rect, index) => drawProp(rect, index, 'weed', desert, swamp, scenic, field.player))}
          {overlay.map((rect, index) => drawProp(rect, index, 'cover', desert, swamp, false, field.player))}
          {field.decor
            .filter((rect) => rect.kind === 'watcheye' && shown(rect))
            .map((rect, index) => (
              <ForestProp key={`eye-${index}`} rect={rect} player={field.player} />
            ))}
          {placeRemotes(remotes).map((item) => (
            <View
              key={item.key}
              pointerEvents="box-none"
              collapsable={false}
              style={{ position: 'absolute', left: 0, top: 0, zIndex: 1000000 + Math.round(item.y) }}
            >
              {item.node}
            </View>
          ))}
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
          {(hazardFloats ?? []).map((note) => {
            const stack = (hazardFloats ?? []).filter((entry) => entry.kind === note.kind);
            const slot = stack.findIndex((entry) => entry.id === note.id);
            const side = note.kind === 'stamina' ? 14 : -14;
            // Avatar top is feetY - drawH; sit a few px above the hairline.
            const headX = field.player.x + side + (slot - (stack.length - 1) / 2) * 10;
            const headY = field.player.y + PLAYER_FEET - PLAYER_DRAW_H - 4 + stridePose.bob;
            return (
              <FloatingCombatText
                key={note.id}
                amount={-note.amount}
                kind="damage"
                color={note.kind === 'stamina' ? '#22c55e' : '#ef4444'}
                text={note.kind === 'stamina' ? `-${Math.round(note.amount)} SP` : `-${Math.round(note.amount)} HP`}
                x={headX}
                y={headY}
                onDone={() => onHazardFloatDone?.(note.id)}
              />
            );
          })}
        </View>
      </View>
      {swamp ? <SwampMist /> : null}
      {frost ? <FrostSnow /> : null}
      {savannah ? <SavannaHaze /> : null}
      {volcano ? <VolcanoAsh /> : null}
      {desertMap ? <DesertHaze /> : null}
      {plainsMap ? <PlainsDawn /> : null}
    </View>
  );
}

function placeRemotes(remotes: FieldRemote[] | undefined): { key: string; y: number; node: ReactNode }[] {
  if (!remotes) return [];
  return remotes
    .filter((remote) => Number.isFinite(remote.x) && Number.isFinite(remote.y))
    .map((remote) => ({ key: remote.id, y: remote.y + 28, node: remote.node }));
}

function snap(value: number) {
  return Math.round(value / 4) * 4;
}

function gateNodes(
  field: FieldState,
  frame: { x: number; y: number; w: number; h: number } | null,
  onSensor: (sensor: Sensor) => void,
  art?: (sensor: Sensor, w: number, h: number) => ReactNode,
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
      node: (
        <PortalGate
          pose={pose}
          label={sensor.label}
          onPress={() => onSensor(sensor)}
          art={art?.(sensor, pose.imgW, pose.imgH)}
        />
      ),
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
  walk,
  walkDir,
  gaitFeel,
}: {
  x: number;
  y: number;
  facing: 1 | -1;
  facesRight: boolean;
  pose: StridePose;
  player: ReactNode;
  walk?: WalkIdentity | null;
  walkDir?: WalkDir;
  gaitFeel: GaitFeel;
}) {
  const puppet = walk && walkDir && isDaoChichPuppet(walk.professionId, walk.gender);
  const source =
    walk && walkDir && isFrameWalkPack(walk) ? walkSource(walk, walkDir, pose.walkFrame) : null;
  // Directional sheets / puppets already paint left/right — never mirror them.
  const face = source || puppet ? 1 : facing * (facesRight ? -1 : 1);
  const drawH = PLAYER_DRAW_H;
  const drawW = puppet ? Math.round(drawH * 0.72) : source ? Math.round(drawH * 0.58) : Math.round(drawH / 1.22);
  const fade = portalFade();
  const bob = source || puppet ? pose.bob * 0.35 : pose.bob;
  const sway = source || puppet ? pose.sway * 0.4 : pose.sway;
  const tilt = source || puppet ? pose.tilt * 0.25 : pose.tilt;
  const breathX = source || puppet ? 1 : pose.breathX;
  const breathY = source || puppet ? 1 : pose.breathY;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - drawW / 2,
        top: y + PLAYER_FEET - drawH + bob,
        width: drawW,
        height: drawH,
        alignItems: 'center',
        opacity: 1 - fade,
      }}
    >
      <View
        style={{
          transform: [{ translateX: sway }, { rotate: `${tilt}deg` }, { scaleX: face * breathX }, { scaleY: breathY }],
        }}
      >
        {puppet && walkDir ? (
          <DaoChichPuppet dir={walkDir} pose={pose} feel={gaitFeel} width={drawW} height={drawH} />
        ) : source ? (
          <Image
            source={source}
            resizeMode="contain"
            style={{ width: drawW, height: drawH }}
            accessibilityIgnoresInvertColors
          />
        ) : (
          player
        )}
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

const TERRAIN = new Set([
  'light',
  'dune',
  'oasis',
  'crack',
  'quicksand',
  'puddle',
  'dry',
  'mud',
  'sandbar',
  'coral',
  'kelp',
  'glowcoral',
  'whirlpool',
  'reef',
  'swamppool',
  'plank',
  'sunkenlog',
  'duckweed',
  'waterlily',
  'bones',
  'bunlay',
  'foothill',
  'gravel',
  'stream',
  'trail',
  'ropebridge',
  'snow',
  'gioloc',
  'dalo',
  'mossgrass',
  'leaflitter',
  'dayleo',
  'buigai',
  'driesand',
  'wetsand',
  'shallow',
  'foam',
  'catnong',
  'vosoc',
  'frostsnow',
  'jadeice',
  'cobaltice',
  'snowdrift',
  'baotruyet',
  'khebang',
  'tempgrass',
  'goldgrass',
  'dryearth',
  'savstream',
  'flatstone',
  'giothaonguyen',
  'datnutthaonguyen',
  'ashsoil',
  'pumice',
  'basalt',
  'heatcrack',
  'magmachannel',
  'hoinong_nuilua',
  'dungnham_nuilua',
  'goldsand',
  'redstone',
  'oasisgreen',
  'oasispool',
  'caravantrail',
  'catlun_samac',
  'datnut_samac',
  'meadow',
  'damppatch',
  'stream',
  'bunlay_dongbang',
  'buigai_dongbang',
]);
/** Drawn above actors. Tall reeds double as light cover; toxic gas hangs over whoever stands in it. */
const AMBIENT = new Set([
  'tumbleweed',
  'firefly',
  'bubble',
  'fog',
  'seamist',
  'seabubble',
  'tallreed',
  'swampfog',
  'dragonfly',
  'gasbubble',
  'khidoc',
  'pine',
  'mtngrass',
  'bamboo',
  'mtcloud',
  'eagle',
  'sunbeam',
  'hangingvine',
  'fern',
  'forestfog',
  'spore',
  'sunray',
  'seagull',
  'umbrella',
  'seaweed',
  'snowflake',
  'frostwind',
  'iceglare',
  'savreed',
  'mound',
  'heatshimmer',
  'sulfurvent',
  'ashdrift',
  'ember',
  'drygrass',
  'scrub',
  'dustwisp',
  'flowerbed',
  'reed',
  'hillock',
  'thicketgrass',
  'dawnglow',
]);
const COVER = new Set([
  'tree',
  'acacia',
  'rock',
  'saguaro',
  'barrel',
  'bunny',
  'cactus',
  'palm',
  'mangrove',
  'log',
  'boulder',
  'cypress',
  'vineruin',
  'cliff',
  'abyss',
  'stonewall',
  'pillar',
  'foresttree',
  'rootwall',
  'rootruin',
  'coastrock',
  'leanpalm',
  'tikihut',
  'glacierock',
  'icepillar',
  'frostcliff',
  'savacacia',
  'savrock',
  'basaltcrag',
  'volrock',
  'desdune',
  'sandridge',
  'oasispalm',
  'descactus',
  'desrock',
  'plmtree',
  'plmrock',
  'plmbush',
]);
/** Trees, single rocks, and rock piles share the actor depth list on the plains. */
const PLAINS_STANDING = new Set(['tree', 'rock', 'pile']);
const DESERT_STANDING = new Set(['dune', 'rock', 'oasis', 'cactus', 'saguaro', 'barrel', 'bunny', 'palm']);

function shownTall(rect: Rect, frame: { x: number; y: number; w: number; h: number } | null): boolean {
  if (!frame) return false;
  return overlapsFrame({ x: rect.x - 70, y: rect.y - 170, w: rect.w + 140, h: rect.h + 170 }, frame);
}

function drawProp(
  rect: Rect,
  index: number,
  prefix: string,
  desert: boolean,
  swamp: boolean,
  sprites = false,
  player?: { x: number; y: number },
) {
  if (isOceanKind(rect.kind)) return <OceanProp key={`${prefix}-${index}`} rect={rect} />;
  if (isSwampMapKind(rect.kind)) return <SwampMapProp key={`${prefix}-${index}`} rect={rect} />;
  if (isMountainKind(rect.kind)) return <MountainProp key={`${prefix}-${index}`} rect={rect} />;
  if (isForestKind(rect.kind) || (rect.kind === 'log' && !swamp)) {
    return <ForestProp key={`${prefix}-${index}`} rect={rect} player={player} />;
  }
  if (isBeachKind(rect.kind)) return <BeachProp key={`${prefix}-${index}`} rect={rect} />;
  if (isFrostKind(rect.kind)) return <FrostProp key={`${prefix}-${index}`} rect={rect} />;
  if (isSavannaKind(rect.kind)) return <SavannaProp key={`${prefix}-${index}`} rect={rect} />;
  if (isVolcanoKind(rect.kind)) return <VolcanoProp key={`${prefix}-${index}`} rect={rect} />;
  if (isDesertMapKind(rect.kind)) return <DesertMapProp key={`${prefix}-${index}`} rect={rect} />;
  if (isPlainsMapKind(rect.kind)) return <PlainsMapProp key={`${prefix}-${index}`} rect={rect} />;
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
  if (isOceanKind(rect.kind)) return <OceanProp key={`block-${index}`} rect={rect} />;
  if (isSwampMapKind(rect.kind)) return <SwampMapProp key={`block-${index}`} rect={rect} />;
  if (isMountainKind(rect.kind)) return <MountainProp key={`block-${index}`} rect={rect} />;
  if (isForestKind(rect.kind)) return <ForestProp key={`block-${index}`} rect={rect} />;
  if (isBeachKind(rect.kind)) return <BeachProp key={`block-${index}`} rect={rect} />;
  if (isFrostKind(rect.kind)) return <FrostProp key={`block-${index}`} rect={rect} />;
  if (isSavannaKind(rect.kind)) return <SavannaProp key={`block-${index}`} rect={rect} />;
  if (isVolcanoKind(rect.kind)) return <VolcanoProp key={`block-${index}`} rect={rect} />;
  if (isDesertMapKind(rect.kind)) return <DesertMapProp key={`block-${index}`} rect={rect} />;
  if (isPlainsMapKind(rect.kind)) return <PlainsMapProp key={`block-${index}`} rect={rect} />;
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

function FieldLootMark({ drop }: { drop: LootActor }) {
  const half = LOOT_SIZE / 2;
  return (
    <View pointerEvents="none" style={[styles.loot, { left: drop.x - half, top: drop.y - half }]}>
      <ItemIcon itemId={drop.itemId} tint={drop.tint} size={LOOT_SIZE} bare />
    </View>
  );
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
  loot: {
    position: 'absolute',
    width: LOOT_SIZE,
    height: LOOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
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
