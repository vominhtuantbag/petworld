import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

import { locomotion, type Gait } from '../../world/gait';
import type { MonsterActor } from '../../world/types';
import { useHorizontalFacing } from './facing';

/**
 * Map drawing for one monster. Position, agro, and the zone leash stay in
 * the sim. Plains species take their pose from the gait step (bob, hop
 * arc, slither, scuttle, burst, swim) so the picture matches the body.
 *
 * Keyed by `MonsterSpecies.id`. A missing png draws a tinted disc.
 * "Đồng" on the plains is the grassland, so the rabbit uses thodong.png.
 */

const THO_DONG = require('../../../assets/monsters/thodong.png');
const CHUOT_DONG = require('../../../assets/monsters/chuotdong.png');
const NHAI_BEN = require('../../../assets/monsters/nhaiben.png');
const COC_DONG = require('../../../assets/monsters/cocdong.png');
const CUA_DONG = require('../../../assets/monsters/cuadong.png');
const RUA_CAN = require('../../../assets/monsters/ruacan.png');
const BO_CAP_THAN = require('../../../assets/monsters/bocapthan.png');
const RAN_CO = require('../../../assets/monsters/ranco.png');
const NHIM_XU = require('../../../assets/monsters/nhimxu.png');
const HEO_RUNG = require('../../../assets/monsters/heorungcon.png');
const TOAD = require('../../../assets/monsters/frost_toad.png');
const SCORPION = require('../../../assets/monsters/scorpion.png');

type SpriteDef = { source: number; size: number };

const PLAINS_ART: Record<string, SpriteDef> = {
  'plains-rabbit': { source: THO_DONG, size: 68 },
  'plains-mouse': { source: CHUOT_DONG, size: 60 },
  'plains-tree-frog': { source: NHAI_BEN, size: 64 },
  'plains-paddy-toad': { source: COC_DONG, size: 66 },
  'plains-field-crab': { source: CUA_DONG, size: 68 },
  'plains-tortoise': { source: RUA_CAN, size: 70 },
  'plains-charcoal-scorpion': { source: BO_CAP_THAN, size: 72 },
  'plains-grass-snake': { source: RAN_CO, size: 78 },
  'plains-porcupine': { source: NHIM_XU, size: 70 },
  'plains-boar': { source: HEO_RUNG, size: 78 },
};

type LegacyMotion = 'hop' | 'scuttle';

const LEGACY: Record<string, { source: number; motion: LegacyMotion; facesRight: boolean }> = {
  'swamp-mist-toad': { source: TOAD, motion: 'hop', facesRight: true },
  'desert-emperor-scorpion': { source: SCORPION, motion: 'scuttle', facesRight: true },
};

/** Still portrait for the battle court. The field token keeps the gait animation. */
export function monsterPortrait(kindId: string): { source: number; facesRight: boolean } | null {
  const plains = PLAINS_ART[kindId];
  if (plains) {
    const motion = locomotion(kindId);
    return { source: plains.source, facesRight: motion.facesRight };
  }
  const legacy = LEGACY[kindId];
  if (!legacy) return null;
  return { source: legacy.source, facesRight: legacy.facesRight };
}

type Props = { monster: MonsterActor };

export function MonsterToken({ monster }: Props) {
  const plains = PLAINS_ART[monster.kindId];
  if (plains) return <PlainsToken monster={monster} art={plains} />;
  const legacy = LEGACY[monster.kindId];
  if (legacy) return <LegacyToken monster={monster} art={legacy} />;
  return <DiscToken monster={monster} />;
}

function PlainsToken({ monster, art }: { monster: MonsterActor; art: SpriteDef }) {
  const motion = locomotion(monster.kindId);
  const gait: Gait = monster.gait ?? motion.gait;
  const face = useHorizontalFacing(monster.x, monster.y);
  const last = useRef({ x: monster.x, y: monster.y });
  const dx = monster.x - last.current.x;
  const dy = monster.y - last.current.y;
  const moving = Math.hypot(dx, dy) > 0.2;
  last.current = { x: monster.x, y: monster.y };

  const phase = monster.phase ?? 0;
  const hopT = monster.hopT ?? 0;
  const pose = poseFor(gait, phase, hopT, moving, monster.gaitTimer ?? 0);
  const size = monster.elite ? 96 : art.size;
  // Art that was painted looking left is mirrored once, then face turns it
  // with the body's horizontal step. Hop squash stays a positive scale.
  const flip = face * (motion.facesRight ? 1 : -1);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: monster.x - size / 2,
        top: monster.y - size * 0.78 + pose.y,
        width: size,
        height: size,
        transform: [{ scaleX: flip }],
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          transform: [
            { translateX: pose.x },
            { rotate: `${pose.tilt}deg` },
            { scaleX: pose.scaleX },
            { scaleY: pose.scaleY },
          ],
        }}
      >
        <Image accessibilityLabel={monster.name} source={art.source} resizeMode="contain" style={{ width: size, height: size }} />
      </View>
    </View>
  );
}

function poseFor(gait: Gait, phase: number, hopT: number, moving: boolean, gaitTimer: number): { x: number; y: number; tilt: number; scaleX: number; scaleY: number } {
  if (gait === 'hop') {
    if (hopT <= 0) return { x: 0, y: Math.sin(phase) * 1.2, tilt: 0, scaleX: 1, scaleY: 1 };
    const apex = Math.sin(Math.min(1, hopT) * Math.PI);
    return { x: 0, y: -apex * 28, tilt: 0, scaleX: 1 + (0.5 - apex) * 0.2, scaleY: 1 - (0.5 - apex) * 0.18 };
  }
  if (gait === 'slither') {
    return { x: Math.sin(phase) * 8, y: 0, tilt: Math.sin(phase) * 10, scaleX: 1, scaleY: 1 };
  }
  if (gait === 'scuttle') {
    const micro = Math.sin(phase * 46) * 4;
    return { x: micro, y: 0, tilt: micro * 0.35, scaleX: 1, scaleY: 1 };
  }
  if (gait === 'burst') {
    const rushing = gaitTimer <= 0;
    return { x: 0, y: rushing ? Math.sin(phase) * 2 : 0, tilt: rushing ? 7 : 0, scaleX: 1, scaleY: 1 };
  }
  if (gait === 'swim') {
    return { x: Math.sin(phase) * 5, y: Math.sin(phase * 1.3) * 7, tilt: Math.sin(phase) * 8, scaleX: 1, scaleY: 1 };
  }
  if (!moving) return { x: 0, y: 0, tilt: 0, scaleX: 1, scaleY: 1 };
  return { x: 0, y: Math.sin(phase * 2) * 3.2, tilt: Math.sin(phase) * 4, scaleX: 1, scaleY: 1 };
}

function LegacyToken({
  monster,
  art,
}: {
  monster: MonsterActor;
  art: { source: number; motion: LegacyMotion; facesRight: boolean };
}) {
  const phase = useRef(new Animated.Value(0)).current;
  const face = useHorizontalFacing(monster.x, monster.y);
  const last = useRef({ x: monster.x, y: monster.y });
  const movingRef = useRef(false);
  movingRef.current = Math.hypot(monster.x - last.current.x, monster.y - last.current.y) > 0.35;
  last.current = { x: monster.x, y: monster.y };

  useEffect(() => {
    let alive = true;
    const step = () => {
      if (!alive) return;
      const moving = movingRef.current;
      const duration = moving ? (art.motion === 'scuttle' ? 140 : 170) : 700;
      const peak = moving ? 1 : 0.22;
      Animated.sequence([
        Animated.timing(phase, { toValue: peak, duration, useNativeDriver: true }),
        Animated.timing(phase, { toValue: 0, duration: duration + 50, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) step();
      });
    };
    step();
    return () => {
      alive = false;
      phase.stopAnimation();
    };
  }, [art.motion, phase]);

  const size = monster.elite ? 96 : art.motion === 'scuttle' ? 80 : 64;
  const flip = face * (art.facesRight ? 1 : -1);
  const lift = phase.interpolate({ inputRange: [0, 1], outputRange: [0, art.motion === 'hop' ? -10 : -2] });
  const sway = phase.interpolate({ inputRange: [0, 1], outputRange: [art.motion === 'scuttle' ? -7 : 0, art.motion === 'scuttle' ? 7 : 0] });
  const scaleX = phase.interpolate({ inputRange: [0, 1], outputRange: art.motion === 'hop' ? [1.05, 0.94] : [1.04, 0.96] });
  const scaleY = phase.interpolate({ inputRange: [0, 1], outputRange: art.motion === 'hop' ? [0.9, 1.08] : [0.96, 1.02] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: monster.x - size / 2,
        top: monster.y - size * 0.78,
        width: size,
        height: size,
        transform: [{ translateX: sway }, { translateY: lift }, { scaleX: flip }, { scaleX }, { scaleY }],
      }}
    >
      <Image accessibilityLabel={monster.name} source={art.source} resizeMode="contain" style={{ width: size, height: size }} />
    </Animated.View>
  );
}

function DiscToken({ monster }: { monster: MonsterActor }) {
  const face = useHorizontalFacing(monster.x, monster.y);
  const size = monster.r * 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: monster.x - monster.r,
        top: monster.y - monster.r,
        width: size,
        height: size,
        transform: [{ scaleX: face }],
      }}
    >
      <View
        style={[
          styles.disc,
          {
            width: size,
            height: size,
            borderRadius: monster.r,
            backgroundColor: monster.tint,
          },
        ]}
      />
      <View
        style={{
          position: 'absolute',
          right: size * 0.12,
          top: size * 0.34,
          width: Math.max(4, size * 0.22),
          height: Math.max(4, size * 0.22),
          borderRadius: size,
          backgroundColor: 'rgba(255,255,255,0.62)',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
  },
});
