import { useWindowDimensions } from 'react-native';

import { BATTLE_DESIGN_H } from '../components/battle/BattleWorldFrame';
import { isMobileWeb } from '../web/mobileWeb';

/**
 * Dock skill / attack button size in *design-canvas* pixels.
 *
 * The battle world stretch-fills the viewport (`scaleY = hostH / 720`), so a
 * fixed `s(52)` chip becomes ~28px on phone landscape. Bump the design size
 * so the *physical* tap target stays comfortable on mobile web / short screens.
 */
export function useBattleCommandSize() {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const scaleY = height > 0 ? height / BATTLE_DESIGN_H : 1;
  const mobile = isMobileWeb() || shortSide < 500;

  /** Minimum on-screen edge length for a command chip. */
  const minPhysical = mobile ? 56 : 44;
  const baseDesign = mobile ? 68 : 52;
  const cmdSize = Math.round(Math.max(baseDesign, minPhysical / Math.max(0.42, scaleY)));
  const cmdFont = Math.max(mobile ? 12 : 10, Math.round(cmdSize * 0.2));

  return { cmdSize, cmdFont, mobileChrome: mobile };
}
