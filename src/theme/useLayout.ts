import { useWindowDimensions } from 'react-native';

const DESIGN_SHORT_SIDE = 390;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Landscape-first scale. Phone height is the short side (~360–430dp).
 * The floor is low enough that a short handset shrinks type and padding
 * instead of pushing the setup screens into a scroll view. Tablets and
 * desktop windows scale up a little, then stop.
 */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const scale = clamp(shortSide / DESIGN_SHORT_SIDE, 0.72, 1.35);

  return {
    width,
    height,
    scale,
    landscape: width > height,
    // Phone landscape starts around 700dp; keep the two-column setup there.
    wide: width >= 700,
    /** Short landscape phones: tighten anything that is not already flexing. */
    compact: shortSide < 430,
    s: (value: number) => Math.round(value * scale),
    font: (value: number) => Math.max(10, Math.round(value * scale)),
  };
}
