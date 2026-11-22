import { Image, type ImageSourcePropType, View } from 'react-native';

import type { WalkDir } from './characterWalk';
import type { GaitFeel } from './playerGait';
import type { StridePose } from './stride';

type ViewKey = 'Front' | 'Back' | 'L View' | 'R View';

const VIEW: Record<WalkDir, ViewKey> = {
  down: 'Front',
  up: 'Back',
  left: 'L View',
  right: 'R View',
};

const PART = {
  body: {
    Front: require('../../../assets/characters/nam/daochich/Body - Front.png'),
    Back: require('../../../assets/characters/nam/daochich/Body - Back.png'),
    'L View': require('../../../assets/characters/nam/daochich/Body - L View.png'),
    'R View': require('../../../assets/characters/nam/daochich/Body - R View.png'),
  },
  head: {
    Front: require('../../../assets/characters/nam/daochich/Head - Front.png'),
    Back: require('../../../assets/characters/nam/daochich/Head - Back.png'),
    'L View': require('../../../assets/characters/nam/daochich/Head - L View.png'),
    'R View': require('../../../assets/characters/nam/daochich/Head - R View.png'),
  },
  face: {
    Front: require('../../../assets/characters/nam/daochich/Face 01 - Front.png'),
    Back: null,
    'L View': require('../../../assets/characters/nam/daochich/Face 01 - L View.png'),
    'R View': require('../../../assets/characters/nam/daochich/Face 01 - R View.png'),
  },
  leftArm: {
    Front: require('../../../assets/characters/nam/daochich/Left Arm - Front.png'),
    Back: require('../../../assets/characters/nam/daochich/Left Arm - Back.png'),
    'L View': require('../../../assets/characters/nam/daochich/Left Arm - L View.png'),
    'R View': require('../../../assets/characters/nam/daochich/Left Arm - R View.png'),
  },
  rightArm: {
    Front: require('../../../assets/characters/nam/daochich/Right Arm - Front.png'),
    Back: require('../../../assets/characters/nam/daochich/Right Arm - Back.png'),
    'L View': require('../../../assets/characters/nam/daochich/Right Arm - L View.png'),
    'R View': require('../../../assets/characters/nam/daochich/Right Arm - R View.png'),
  },
  leftHand: {
    Front: require('../../../assets/characters/nam/daochich/Left Hand - Front.png'),
    Back: require('../../../assets/characters/nam/daochich/Left Hand - Back.png'),
    'L View': require('../../../assets/characters/nam/daochich/Left Hand - L View.png'),
    'R View': require('../../../assets/characters/nam/daochich/Left Hand - R View.png'),
  },
  rightHand: {
    Front: require('../../../assets/characters/nam/daochich/Right Hand - Front.png'),
    Back: require('../../../assets/characters/nam/daochich/Right Hand - Back.png'),
    'L View': require('../../../assets/characters/nam/daochich/Right Hand - L View.png'),
    'R View': require('../../../assets/characters/nam/daochich/Right Hand - R View.png'),
  },
  leftLeg: {
    Front: require('../../../assets/characters/nam/daochich/Left Leg - Front.png'),
    Back: require('../../../assets/characters/nam/daochich/Left Leg - Back.png'),
    'L View': require('../../../assets/characters/nam/daochich/Left Leg - L View.png'),
    'R View': require('../../../assets/characters/nam/daochich/Left Leg - R View.png'),
  },
  rightLeg: {
    Front: require('../../../assets/characters/nam/daochich/Right Leg - Front.png'),
    Back: require('../../../assets/characters/nam/daochich/Right Leg - Back.png'),
    'L View': require('../../../assets/characters/nam/daochich/Right Leg - L View.png'),
    'R View': require('../../../assets/characters/nam/daochich/Right Leg - R View.png'),
  },
} as const satisfies Record<string, Record<ViewKey, ImageSourcePropType | null>>;

type PartId = keyof typeof PART;

type Props = {
  dir: WalkDir;
  pose: StridePose;
  feel: GaitFeel;
  width: number;
  height: number;
};

/**
 * Modular Đạo Chích (rogue) male — parts under `assets/characters/nam/daochich`.
 * Limbs swing from the stride phase; crawl / walk / run reshape via `feel`.
 */
export function DaoChichPuppet({ dir, pose, feel, width, height }: Props) {
  const view = VIEW[dir];
  const moving = pose.weight;
  const swing = Math.sin(pose.phase) * feel.swing * moving;
  const counter = -swing;
  const crawl = Math.max(0, Math.min(1, (0.94 - feel.squash) / 0.35));
  const lean =
    dir === 'left' || dir === 'right'
      ? feel.lean * (dir === 'right' ? 1 : -1) * moving
      : feel.lean * 0.25 * moving;

  const layers: PartId[] =
    dir === 'up'
      ? ['leftArm', 'rightArm', 'leftHand', 'rightHand', 'leftLeg', 'rightLeg', 'body', 'head']
      : dir === 'left'
        ? ['rightLeg', 'rightArm', 'rightHand', 'body', 'leftLeg', 'leftArm', 'leftHand', 'head', 'face']
        : dir === 'right'
          ? ['leftLeg', 'leftArm', 'leftHand', 'body', 'rightLeg', 'rightArm', 'rightHand', 'head', 'face']
          : ['leftLeg', 'rightLeg', 'leftArm', 'rightArm', 'body', 'leftHand', 'rightHand', 'head', 'face'];

  const sx = width / 220;
  const sy = (height / 300) * feel.squash;

  return (
    <View
      style={{
        width,
        height,
        overflow: 'visible',
        transform: [{ rotate: `${lean}deg` }, { translateY: crawl * height * 0.06 }],
      }}
    >
      {layers.map((part) => {
        const source = PART[part][view];
        if (!source) return null;
        const joint = jointOf(part, dir, swing, counter, crawl);
        const w = joint.w * sx;
        const h = joint.h * sy;
        const left = joint.x * sx;
        const top = joint.y * sy;
        return (
          <Image
            key={part}
            source={source}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            style={{
              position: 'absolute',
              left,
              top,
              width: w,
              height: h,
              transform: [
                { translateX: w / 2 },
                { translateY: joint.pivotY * sy },
                { rotate: `${joint.rot}deg` },
                { translateX: -w / 2 },
                { translateY: -joint.pivotY * sy },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

type Joint = { x: number; y: number; w: number; h: number; rot: number; pivotY: number };

function jointOf(part: PartId, dir: WalkDir, swing: number, counter: number, crawl: number): Joint {
  const side = dir === 'left' || dir === 'right';
  if (part === 'body') {
    return { x: 40, y: 88 + crawl * 12, w: 140, h: side ? 150 : 140, rot: swing * 0.08, pivotY: 40 };
  }
  if (part === 'head') {
    return { x: 35, y: 8 + crawl * 8, w: 150, h: 150, rot: -swing * 0.05, pivotY: 90 };
  }
  if (part === 'face') {
    if (dir === 'down') return { x: 70, y: 78, w: 80, h: 55, rot: 0, pivotY: 20 };
    if (dir === 'left') return { x: 48, y: 88, w: 48, h: 48, rot: 0, pivotY: 20 };
    if (dir === 'right') return { x: 124, y: 88, w: 48, h: 48, rot: 0, pivotY: 20 };
    return { x: 0, y: 0, w: 0, h: 0, rot: 0, pivotY: 0 };
  }
  if (part === 'leftLeg') {
    return {
      x: side ? 78 : 62,
      y: 195 + crawl * 10,
      w: 56,
      h: 72,
      rot: counter * (crawl > 0.4 ? 0.45 : 1),
      pivotY: 8,
    };
  }
  if (part === 'rightLeg') {
    return {
      x: side ? 98 : 102,
      y: 195 + crawl * 10,
      w: 56,
      h: 72,
      rot: swing * (crawl > 0.4 ? 0.45 : 1),
      pivotY: 8,
    };
  }
  if (part === 'leftArm') {
    return {
      x: side && dir === 'right' ? 48 : 28,
      y: 118 + crawl * 16,
      w: 52,
      h: 58,
      rot: swing * (crawl > 0.35 ? 0.7 : 1) + crawl * 28,
      pivotY: 6,
    };
  }
  if (part === 'rightArm') {
    return {
      x: 140,
      y: 118 + crawl * 16,
      w: 52,
      h: 58,
      rot: counter * (crawl > 0.35 ? 0.7 : 1) - crawl * 28,
      pivotY: 6,
    };
  }
  if (part === 'leftHand') {
    return {
      x: side && dir === 'right' ? 36 : 18,
      y: 162 + crawl * 22,
      w: 40,
      h: 36,
      rot: swing * 0.85 + crawl * 32,
      pivotY: 4,
    };
  }
  return {
    x: side && dir === 'left' ? 148 : 162,
    y: 162 + crawl * 22,
    w: 40,
    h: 36,
    rot: counter * 0.85 - crawl * 32,
    pivotY: 4,
  };
}

export function isDaoChichPuppet(professionId: string | undefined, gender: string | undefined): boolean {
  return professionId === 'rogue' && gender === 'male';
}
