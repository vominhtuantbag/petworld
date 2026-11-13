import { useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { locomotion, type Gait } from '../../world/gait';
import type { MonsterActor } from '../../world/types';
import { useHorizontalFacing } from './facing';
import { monsterInitials, resolveMonsterArt, type MonsterArtContext } from './monsterArt';

/**
 * Map drawing for one monster. Packed art from
 * `assets/monsters/{env}/{map}/{slug}.png` is resolved via `monsterArt`;
 * a missing png draws a tinted initials disc.
 */

const FIELD_SIZE: Record<string, number> = {
  'plains-rabbit': 68,
  'plains-mouse': 60,
  'plains-tree-frog': 64,
  'plains-paddy-toad': 66,
  'plains-field-crab': 68,
  'plains-tortoise': 70,
  'plains-charcoal-scorpion': 72,
  'plains-grass-snake': 78,
  'plains-porcupine': 70,
  'plains-boar': 78,
  'swamp-mosquito': 58,
  'swamp-dragonfly': 64,
  'swamp-beetle': 66,
  'swamp-crayfish': 68,
  'swamp-muskrat': 66,
  'swamp-mist-toad': 64,
  'swamp-snake': 78,
  'swamp-snapping-turtle': 72,
  'swamp-alligator': 84,
  'desert-emperor-scorpion': 80,
  'beach-ghost-crab': 68,
};

/** Still portrait for the battle court / collection / inventory. */
export function monsterPortrait(
  kindId: string,
  context?: MonsterArtContext | null,
): { source: number; facesRight: boolean } | null {
  const art = resolveMonsterArt(kindId, context);
  if (!art) return null;
  return { source: art.source, facesRight: art.facesRight };
}

type Props = { monster: MonsterActor; zoneId?: string | null };

export function MonsterToken({ monster, zoneId }: Props) {
  const art = resolveMonsterArt(monster.kindId, zoneId ? { zoneId } : null);
  if (art) return <SpriteToken monster={monster} source={art.source} facesRight={art.facesRight} />;
  return <DiscToken monster={monster} />;
}

function SpriteToken({
  monster,
  source,
  facesRight,
}: {
  monster: MonsterActor;
  source: number;
  facesRight: boolean;
}) {
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
  const base = FIELD_SIZE[monster.kindId] ?? 68;
  const size = monster.elite ? 96 : base;
  const flip = face * (facesRight ? 1 : -1);

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
        <Image accessibilityLabel={monster.name} source={source} resizeMode="contain" style={{ width: size, height: size }} />
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
  if (gait === 'fly') {
    return {
      x: Math.sin(phase * 0.8) * 3,
      y: Math.sin(phase) * 10 - 6,
      tilt: Math.sin(phase * 0.6) * 6,
      scaleX: 1,
      scaleY: 1 + Math.sin(phase * 2) * 0.04,
    };
  }
  if (gait === 'pulse') {
    const swell = 1 + Math.sin(phase) * 0.12;
    return { x: Math.sin(phase * 0.5) * 3, y: Math.sin(phase) * 8, tilt: 0, scaleX: swell, scaleY: swell };
  }
  if (gait === 'stride') {
    if (!moving) return { x: 0, y: Math.sin(phase) * 1.2, tilt: 0, scaleX: 1, scaleY: 1 + Math.sin(phase) * 0.02 };
    return { x: 0, y: Math.sin(phase * 2.2) * 4.2, tilt: Math.sin(phase) * 3, scaleX: 1, scaleY: 1 };
  }
  if (!moving) return { x: 0, y: 0, tilt: 0, scaleX: 1, scaleY: 1 };
  return { x: 0, y: Math.sin(phase * 2) * 3.2, tilt: Math.sin(phase) * 4, scaleX: 1, scaleY: 1 };
}

function DiscToken({ monster }: { monster: MonsterActor }) {
  const face = useHorizontalFacing(monster.x, monster.y);
  const size = monster.r * 2;
  const initials = monsterInitials(monster.name);
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
      >
        <Text style={[styles.initials, { fontSize: Math.max(10, size * 0.34) }]} numberOfLines={1}>
          {initials}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '800',
    textAlign: 'center',
  },
});
