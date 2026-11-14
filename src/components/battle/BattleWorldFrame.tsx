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
  /** X stretch: hostW / designW */
  scaleX: number;
  /** Y stretch: hostH / designH */
  scaleY: number;
  /** Uniform proxy (min axis) — useful for sprite chrome that must stay round. */
  scale: number;
  /** Design resolution — use for feetInView / grid math. */
  worldW: number;
  worldH: number;
};

type Props = {
  arenaSource: ImageSourcePropType;
  children: ReactNode;
  testID?: string;
  onMetrics?: (metrics: BattleWorldMetrics) => void;
};

function metricsFor(hostW: number, hostH: number): BattleWorldMetrics {
  const scaleX = hostW > 0 ? hostW / BATTLE_DESIGN_W : 1;
  const scaleY = hostH > 0 ? hostH / BATTLE_DESIGN_H : 1;
  return {
    hostW,
    hostH,
    scaleX,
    scaleY,
    scale: Math.min(scaleX, scaleY),
    worldW: BATTLE_DESIGN_W,
    worldH: BATTLE_DESIGN_H,
  };
}

/**
 * Full-screen battle world — stretch-to-fill.
 *
 * The design canvas (1280×720) is scaled independently on X/Y so it maps
 * exactly onto the viewport: no black bars, nothing cropped. Arena, grid,
 * HUD, and sprites all live inside this one transform, so they zoom together.
 */
export function BattleWorldFrame({ arenaSource, children, testID, onMetrics }: Props) {
  const [host, setHost] = useState({ w: 0, h: 0 });

  const metrics = useMemo(() => metricsFor(host.w, host.h), [host.h, host.w]);

  const onHostLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setHost((current) => (current.w === width && current.h === height ? current : { w: width, h: height }));
    onMetrics?.(metricsFor(width, height));
  };

  const ready = host.w > 0 && host.h > 0;

  return (
    <View style={styles.host} onLayout={onHostLayout} testID={testID}>
      {ready ? (
        <View
          style={[
            styles.world,
            {
              width: BATTLE_DESIGN_W,
              height: BATTLE_DESIGN_H,
              left: (host.w - BATTLE_DESIGN_W) / 2,
              top: (host.h - BATTLE_DESIGN_H) / 2,
              transform: [{ scaleX: metrics.scaleX }, { scaleY: metrics.scaleY }],
            },
          ]}
        >
          <Image source={arenaSource} resizeMode="stretch" pointerEvents="none" style={styles.arena} />
          <View style={styles.content} pointerEvents="box-none">
            {children}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Size helper tied to the battle design canvas. */
export function battleScale(value: number, worldScale = 1) {
  return Math.round(value * worldScale);
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: '#10211c',
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
