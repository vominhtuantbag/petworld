import { Platform, useWindowDimensions } from 'react-native';

import { useLayout } from '../theme/useLayout';
import { isMobileWeb } from '../web/mobileWeb';

/** Base command chip size before the bump. */
const BASE_CMD = 52;
const BASE_FONT = 10;

/**
 * Battle chrome scales by surface (stretch full-screen canvas):
 * - Web PC: pets/monsters 125%; battle log 70%; countdown/pause/auto 50%; else 100%
 * - Web mobile: pets/monsters 200%; commands 150%; status 150%; log 150%
 * - Native: 100%
 */
export function useBattleCommandSize() {
  const { s, font } = useLayout();
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);
  const isWeb = Platform.OS === 'web';
  const mobileWeb =
    isWeb && (isMobileWeb() || (shortSide > 0 && shortSide < 520));

  const cmdScale = mobileWeb ? 1.5 : 1;
  const panelScale = mobileWeb ? 1.5 : 1;
  const logScale = mobileWeb ? 1.5 : isWeb ? 0.7 : 1;
  /** Header control cluster: countdown / pause / auto (web PC only). */
  const timeScale = isWeb && !mobileWeb ? 0.5 : 1;
  const unitScale = mobileWeb ? 2 : isWeb ? 1.25 : 1;

  const cmdSize = Math.round(s(BASE_CMD) * cmdScale);
  const cmdFont = Math.max(font(BASE_FONT), Math.round(font(BASE_FONT) * cmdScale));

  return { cmdSize, cmdFont, panelScale, logScale, unitScale, timeScale, mobileWeb };
}
