import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, G, Polygon } from 'react-native-svg';

import { PLAINS_GRASS, PLAINS_PARALLAX } from '../../world/plainsDecor';

type Props = {
  width: number;
  height: number;
  /** World camera X. Negative as the player walks east. */
  cameraX: number;
};

/**
 * Far plains vista, painted in screen space above the meadow.
 *
 * Drift is `PLAINS_PARALLAX` in plainsDecor.ts. Clouds barely move,
 * the peaks move a little, and the pine line moves most so it feels closer.
 * The walkable forest wall is separate: it lives on the sector edges.
 */
export function PlainsBackdrop({ width, height, cameraX }: Props) {
  if (width <= 0 || height <= 0) return null;
  const band = width + 1040;

  return (
    <View pointerEvents="none" style={[styles.band, { height }]}>
      <LinearGradient
        colors={['#5eb7f2', '#8fd0fb', '#d7f1ff', '#e7f8c8']}
        locations={[0, 0.38, 0.7, 1]}
        style={styles.fill}
      />
      <Svg width={band} height={height} viewBox={`0 0 ${band} ${height}`} style={{ position: 'absolute', top: 0, left: cameraX * PLAINS_PARALLAX.clouds - 520 }}>
        <Cloud cx={band * 0.16} cy={height * 0.2} />
        <Cloud cx={band * 0.38} cy={height * 0.14} />
        <Cloud cx={band * 0.58} cy={height * 0.24} />
        <Cloud cx={band * 0.78} cy={height * 0.16} />
        <Ellipse cx={band * 0.1} cy={height * 0.22} rx={28} ry={28} fill="rgba(255,236,170,0.7)" />
      </Svg>
      <Svg width={band} height={height} viewBox={`0 0 ${band} ${height}`} style={{ position: 'absolute', top: 0, left: cameraX * PLAINS_PARALLAX.mountains - 520 }}>
        <Polygon points={ridge(band, height, 0.58, 0.08, 7)} fill="#c5d4de" />
        <Polygon points={ridge(band, height, 0.66, 0.12, 6)} fill="#8eab9c" />
        <Polygon points={mainPeak(band, height)} fill="#6f847c" />
        <Polygon points={sunFace(band, height)} fill="#e4efe0" />
        <Polygon points={sidePeak(band, height)} fill="#7f92a0" />
        <Polygon points={ridge(band, height, 0.74, 0.07, 8)} fill="#5f8f58" />
      </Svg>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={styles.fill}>
        <G transform={`translate(${cameraX * PLAINS_PARALLAX.forest}, 0)`}>
          {pineLine(width, height)}
        </G>
      </Svg>
      <LinearGradient colors={['rgba(122,212,74,0)', PLAINS_GRASS]} style={styles.blend} />
    </View>
  );
}

function Cloud({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={78} ry={26} fill="rgba(255,252,248,0.96)" />
      <Ellipse cx={cx - 36} cy={cy + 4} rx={40} ry={20} fill="#ffffff" />
      <Ellipse cx={cx + 34} cy={cy - 6} rx={46} ry={22} fill="rgba(255,255,255,0.95)" />
    </G>
  );
}

function ridge(width: number, height: number, base: number, lift: number, hills: number): string {
  const ground = height * 0.96;
  const parts = [`0,${ground}`];
  for (let index = 0; index <= hills; index += 1) {
    const x = (width / hills) * index;
    const crest = height * (base - (index % 2 === 0 ? lift : lift * 0.35));
    parts.push(`${x},${crest}`);
  }
  parts.push(`${width},${ground}`);
  return parts.join(' ');
}

/** One rocky summit, kept narrow so it reads as a peak instead of a wall. */
function mainPeak(width: number, height: number): string {
  const ground = height * 0.84;
  const cx = width * 0.42;
  const half = width * 0.1;
  return `${cx - half},${ground} ${cx - half * 0.45},${height * 0.34} ${cx - half * 0.08},${height * 0.2} ${cx + half * 0.12},${height * 0.28} ${cx + half * 0.55},${height * 0.42} ${cx + half},${ground}`;
}

function sunFace(width: number, height: number): string {
  const cx = width * 0.42;
  const half = width * 0.1;
  return `${cx - half * 0.2},${height * 0.26} ${cx - half * 0.08},${height * 0.2} ${cx + half * 0.12},${height * 0.28} ${cx + half * 0.02},${height * 0.36}`;
}

function sidePeak(width: number, height: number): string {
  const ground = height * 0.82;
  const cx = width * 0.7;
  const half = width * 0.08;
  return `${cx - half},${ground} ${cx - half * 0.2},${height * 0.36} ${cx + half * 0.15},${height * 0.3} ${cx + half},${ground}`;
}

function pineLine(width: number, height: number) {
  const pines = [];
  const ground = height * 0.98;
  const start = -560;
  const end = width + 560;
  let index = 0;
  for (let x = start; x < end; x += 30) {
    const rise = 26 + ((index * 17) % 22);
    const half = 11 + (index % 4);
    const fill = index % 3 === 0 ? '#0e301c' : index % 3 === 1 ? '#184828' : '#226038';
    pines.push(
      <Polygon
        key={`pine-${index}`}
        points={`${x},${ground} ${x + half},${ground - rise} ${x + half * 2},${ground}`}
        fill={fill}
      />,
    );
    index += 1;
  }
  return pines;
}

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  blend: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 },
});
