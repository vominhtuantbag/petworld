import { useMemo, useState, type ReactNode } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';

/** Logical battle canvas — grid, arena art, and entities share this space. */
export const BATTLE_DESIGN_W = 1280;
export const BATTLE_DESIGN_H = 720;
export const BATTLE_ASPECT = BATTLE_DESIGN_W / BATTLE_DESIGN_H;

export type BattleWorldMetrics = {
  /** Viewport host size (physical). */
  hostW: number;
  hostH: number;
  /** Uniform scale applied to the design canvas. */
  scale: number;
  /** Always the design resolution — use for feetInView / grid math. */
  worldW: number;
  worldH: number;
};

type Props = {
  arenaSource: ImageSourcePropType;
  children: ReactNode;
  testID?: string;
  onMetrics?: (metrics: BattleWorldMetrics) => void;
};

/**
 * Letterboxed 16:9 battle world.
 * Arena background + children live inside a fixed design canvas that scales
 * uniformly to fit the viewport, so art, grid, and sprites zoom together.
 */
export function BattleWorldFrame({ arenaSource, children, testID, onMetrics }: Props) {
  const [host, setHost] = useState({ w: 0, h: 0 });

  const scale = useMemo(() => {
    if (host.w <= 0 || host.h <= 0) return 1;
    return Math.min(host.w / BATTLE_DESIGN_W, host.h / BATTLE_DESIGN_H);
  }, [host.h, host.w]);

  const onHostLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setHost((current) => (current.w === width && current.h === height ? current : { w: width, h: height }));
    onMetrics?.({
      hostW: width,
      hostH: height,
      scale: width > 0 && height > 0 ? Math.min(width / BATTLE_DESIGN_W, height / BATTLE_DESIGN_H) : 1,
      worldW: BATTLE_DESIGN_W,
      worldH: BATTLE_DESIGN_H,
    });
  };

  const fittedW = BATTLE_DESIGN_W * scale;
  const fittedH = BATTLE_DESIGN_H * scale;

  return (
    <View style={styles.host} onLayout={onHostLayout} testID={testID}>
      <View style={[styles.fit, { width: fittedW, height: fittedH }]}>
        <View
          style={[
            styles.world,
            {
              width: BATTLE_DESIGN_W,
              height: BATTLE_DESIGN_H,
              transform: [{ scale }],
              // Keep transform origin at top-left so layout math matches hits.
              left: (fittedW - BATTLE_DESIGN_W) / 2,
              top: (fittedH - BATTLE_DESIGN_H) / 2,
            },
          ]}
        >
          <Image source={arenaSource} resizeMode="cover" pointerEvents="none" style={styles.arena} />
          <View style={styles.content} pointerEvents="box-none">
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Size helper tied to the battle design canvas (not the phone short-side).
 * Keeps sprites / chrome proportional when the world letterbox scales.
 */
export function battleScale(value: number, worldScale = 1) {
  return Math.round(value * worldScale);
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    backgroundColor: '#0a0908',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fit: {
    overflow: 'hidden',
  },
  world: {
    position: 'absolute',
    overflow: 'hidden',
  },
  arena: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
