import { Image, View } from 'react-native';

import type { CharacterDefinition } from '../data/characters';
import type { Gender } from '../types/game';

/**
 * Painted class sheet. Each file holds Nam on the left and Nữ on the right.
 * The portrait crops to that half, so hair and cloth stay the art colors.
 * Horizontal facing is applied by the field, not here.
 */

type Frame = { x: number; y: number; w: number; h: number };

type Sheet = {
  source: number;
  w: number;
  h: number;
  male: Frame;
  female: Frame;
};

const SHEETS: Record<string, Sheet> = {
  archer: {
    source: require('../../assets/characters/cungthu.png'),
    w: 376,
    h: 177,
    male: { x: 19, y: 0, w: 144, h: 169 },
    female: { x: 238, y: 3, w: 136, h: 167 },
  },
  rogue: {
    source: require('../../assets/characters/daochich.png'),
    w: 295,
    h: 191,
    male: { x: 7, y: 5, w: 115, h: 174 },
    female: { x: 164, y: 15, w: 112, h: 165 },
  },
  knight: {
    source: require('../../assets/characters/hiepsi.png'),
    w: 327,
    h: 198,
    male: { x: 23, y: 7, w: 111, h: 182 },
    female: { x: 212, y: 16, w: 94, h: 172 },
  },
  guardian: {
    source: require('../../assets/characters/hove.png'),
    w: 302,
    h: 188,
    male: { x: 7, y: 7, w: 134, h: 175 },
    female: { x: 186, y: 16, w: 107, h: 167 },
  },
  wanderer: {
    source: require('../../assets/characters/langkhach.png'),
    w: 344,
    h: 192,
    male: { x: 11, y: 5, w: 144, h: 177 },
    female: { x: 173, y: 12, w: 157, h: 170 },
  },
  mage: {
    source: require('../../assets/characters/phapsu.png'),
    w: 338,
    h: 189,
    male: { x: 23, y: 10, w: 120, h: 167 },
    female: { x: 198, y: 16, w: 119, h: 162 },
  },
  bard: {
    source: require('../../assets/characters/satthu.png'),
    w: 331,
    h: 191,
    male: { x: 13, y: 1, w: 151, h: 186 },
    female: { x: 196, y: 16, w: 125, h: 170 },
  },
  monk: {
    source: require('../../assets/characters/tusi.png'),
    w: 316,
    h: 183,
    male: { x: 6, y: 4, w: 148, h: 168 },
    female: { x: 197, y: 11, w: 107, h: 161 },
  },
  ranger: {
    source: require('../../assets/characters/thosan.png'),
    w: 315,
    h: 157,
    male: { x: 11, y: 0, w: 151, h: 156 },
    female: { x: 184, y: 5, w: 125, h: 149 },
  },
  scout: {
    source: require('../../assets/characters/trinhsat.png'),
    w: 356,
    h: 194,
    male: { x: 28, y: 15, w: 120, h: 172 },
    female: { x: 233, y: 21, w: 101, h: 167 },
  },
  healer: {
    source: require('../../assets/characters/ysu.png'),
    w: 317,
    h: 186,
    male: { x: 31, y: 7, w: 81, h: 169 },
    female: { x: 200, y: 4, w: 90, h: 173 },
  },
};

type Props = {
  character: CharacterDefinition;
  hairColor: string;
  outfitColor: string;
  size: number;
};

export function CharacterAvatar({ character, size }: Props) {
  const sheet = SHEETS[character.professionId];
  if (!sheet) return null;
  return <ClassPortrait sheet={sheet} gender={character.gender} size={size} label={portraitLabel(character)} />;
}

function portraitLabel(character: CharacterDefinition): string {
  return `${character.title} ${character.gender === 'male' ? 'nam' : 'nữ'}`;
}

function ClassPortrait({
  sheet,
  gender,
  size,
  label,
}: {
  sheet: Sheet;
  gender: Gender;
  size: number;
  label: string;
}) {
  const frame = sheet[gender];
  const viewW = size;
  const viewH = Math.round(size * 1.22);
  const scale = Math.min(
    viewW / Math.max(sheet.male.w, sheet.female.w),
    viewH / Math.max(sheet.male.h, sheet.female.h),
  );
  const offsetX = (viewW - frame.w * scale) / 2 - frame.x * scale;
  const offsetY = (viewH - frame.h * scale) / 2 - frame.y * scale;

  return (
    <View
      accessibilityLabel={label}
      style={{ width: viewW, height: viewH, overflow: 'hidden', backgroundColor: 'transparent' }}
    >
      <Image
        source={sheet.source}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
        style={{
          position: 'absolute',
          width: sheet.w * scale,
          height: sheet.h * scale,
          left: offsetX,
          top: offsetY,
        }}
      />
    </View>
  );
}
