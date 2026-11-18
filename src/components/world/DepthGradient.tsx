import { memo } from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export type DepthStop = { at: number; color: string };

type Props = {
  width: number;
  height: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: readonly DepthStop[];
};

/**
 * Screen-space ground ramp along one axis (town gate → farthest zone).
 * Drawn at screen size, so a 10× map never needs a map-sized texture.
 * Callers snap the endpoints so small camera moves reuse the last drawing.
 */
export const DepthGradient = memo(function DepthGradient({ width, height, x1, y1, x2, y2, stops }: Props) {
  if (width <= 0 || height <= 0) return null;
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Defs>
        <LinearGradient id="fieldDepth" gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          {stops.map((stop) => (
            <Stop key={stop.at} offset={stop.at} stopColor={stop.color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#fieldDepth)" />
    </Svg>
  );
});
