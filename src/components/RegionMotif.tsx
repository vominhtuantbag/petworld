import { Circle, Ellipse, Path, Rect, Svg } from 'react-native-svg';

import type { RegionMotifId } from '../types/game';
import { assertNever } from '../types/assertNever';

/**
 * Small biome icon. Add a `RegionMotifId` and a case here when a new
 * region needs its own mark. Existing regions can share a motif.
 */

type Props = {
  motif: RegionMotifId;
  accent: string;
  size: number;
};

export function RegionMotif({ motif, accent, size }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <MotifShape motif={motif} accent={accent} />
    </Svg>
  );
}

function MotifShape({ motif, accent }: { motif: RegionMotifId; accent: string }) {
  const ink = 'rgba(255,255,255,0.88)';

  switch (motif) {
    case 'forest':
      return (
        <>
          <Path fill={accent} d="M10 34 L18 16 L26 34 Z" />
          <Path fill={ink} d="M20 36 L30 12 L40 36 Z" />
          <Rect x={17} y={34} width={3} height={8} fill="#6b4a32" />
          <Rect x={28} y={36} width={3} height={8} fill="#6b4a32" />
        </>
      );
    case 'beach':
      return (
        <>
          <Circle cx={34} cy={14} r={6} fill={accent} />
          <Path
            d="M4 30 Q12 24 20 30 T36 30 T52 30"
            stroke={ink}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M4 38 Q12 32 20 38 T36 38 T52 38"
            stroke={accent}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case 'mountains':
      return (
        <>
          <Path fill={ink} d="M4 40 L18 16 L28 40 Z" />
          <Path fill={accent} d="M18 40 L32 12 L46 40 Z" />
          <Path fill="rgba(255,255,255,0.7)" d="M29 18 L32 12 L35 18 L32 17 Z" />
        </>
      );
    case 'ocean':
      return (
        <>
          <Path d="M4 18 Q12 12 20 18 T36 18 T52 18" stroke={accent} strokeWidth={2.5} fill="none" />
          <Path d="M4 28 Q12 22 20 28 T36 28 T52 28" stroke={ink} strokeWidth={2.5} fill="none" />
          <Path d="M4 38 Q12 32 20 38 T36 38 T52 38" stroke={accent} strokeWidth={2.5} fill="none" />
        </>
      );
    case 'volcano':
      return (
        <>
          <Path fill="#5a4038" d="M8 42 L24 16 L40 42 Z" />
          <Path fill={accent} d="M20 26 L24 16 L28 26 L24 24 Z" />
          <Circle cx={24} cy={12} r={3} fill={accent} />
          <Path d="M18 14 Q16 8 20 6" stroke={ink} strokeWidth={1.5} fill="none" />
        </>
      );
    case 'desert':
      return (
        <>
          <Circle cx={36} cy={12} r={5} fill={accent} />
          <Path fill={ink} d="M2 34 Q14 24 26 34 Q34 40 46 32 L46 44 L2 44 Z" />
          <Path fill={accent} d="M6 40 Q18 32 30 40 L30 46 L6 46 Z" />
        </>
      );
    case 'plains':
      return (
        <>
          <Path d="M4 30 H44" stroke={accent} strokeWidth={2} />
          <Path d="M12 30 Q14 18 16 30" stroke={ink} strokeWidth={2} fill="none" />
          <Path d="M22 30 Q24 14 26 30" stroke={ink} strokeWidth={2} fill="none" />
          <Path d="M32 30 Q34 20 36 30" stroke={accent} strokeWidth={2} fill="none" />
        </>
      );
    case 'tundra':
      return (
        <>
          <Path fill={ink} d="M6 40 L20 18 L34 40 Z" />
          <Path fill={accent} d="M16 22 L20 14 L24 22 Z" />
          <Path fill={accent} d="M34 28 L38 16 L42 28 L38 26 Z" />
        </>
      );
    case 'swamp':
      return (
        <>
          <Ellipse cx={24} cy={34} rx={16} ry={6} fill={accent} />
          <Path d="M16 34 L14 16" stroke={ink} strokeWidth={2} />
          <Path d="M24 32 L26 12" stroke={ink} strokeWidth={2} />
          <Path d="M32 34 L36 18" stroke={ink} strokeWidth={2} />
          <Circle cx={14} cy={15} r={2} fill={accent} />
          <Circle cx={26} cy={11} r={2} fill={accent} />
          <Circle cx={36} cy={17} r={2} fill={accent} />
        </>
      );
    case 'savannah':
      return (
        <>
          <Circle cx={36} cy={12} r={4} fill={accent} />
          <Path d="M6 40 H46" stroke={ink} strokeWidth={2} />
          <Path d="M14 40 L16 26 L18 40" stroke="#6b4a2a" strokeWidth={2} fill="none" />
          <Ellipse cx={16} cy={24} rx={9} ry={4} fill={accent} />
          <Path d="M30 40 L33 22 L36 40" stroke="#6b4a2a" strokeWidth={2} fill="none" />
          <Ellipse cx={33} cy={20} rx={8} ry={3.5} fill={ink} />
        </>
      );
    case 'light':
      return (
        <>
          <Circle cx={24} cy={24} r={7} fill={accent} />
          <Path d="M24 8 V14 M24 34 V40 M8 24 H14 M34 24 H40 M12 12 L16 16 M32 32 L36 36 M36 12 L32 16 M16 32 L12 36" stroke={ink} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case 'dark':
      return (
        <>
          <Circle cx={24} cy={24} r={10} fill={ink} />
          <Circle cx={28} cy={21} r={8} fill="#14101f" />
        </>
      );
    case 'chaos':
      return (
        <>
          <Path fill={accent} d="M24 8 L30 20 L18 20 Z" />
          <Path fill={ink} d="M10 28 L22 26 L16 38 Z" />
          <Path fill={accent} d="M30 26 L42 32 L30 40 Z" />
        </>
      );
    case 'space':
      return (
        <>
          <Circle cx={24} cy={26} r={8} fill={accent} />
          <Ellipse cx={24} cy={26} rx={16} ry={5} stroke={ink} strokeWidth={1.6} fill="none" />
          <Circle cx={10} cy={12} r={1.4} fill={ink} />
          <Circle cx={38} cy={14} r={1.2} fill={ink} />
          <Circle cx={40} cy={36} r={1.5} fill={accent} />
        </>
      );
    case 'heaven':
      return (
        <>
          <Path fill={accent} d="M24 8 L28 18 H38 L30 24 L33 34 L24 28 L15 34 L18 24 L10 18 H20 Z" />
          <Path d="M8 40 H40" stroke={ink} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case 'hell':
      return (
        <>
          <Path fill={accent} d="M16 40 L20 22 L24 32 L28 16 L32 40 Z" />
          <Path fill={ink} d="M12 40 L18 26 L22 40 Z" />
          <Circle cx={30} cy={14} r={2} fill={accent} />
        </>
      );
    default:
      return assertNever(motif);
  }
}
