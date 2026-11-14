import { useLayout } from '../theme/useLayout';

/** Base command chip size before the bump. */
const BASE_CMD = 52;
const BASE_FONT = 10;
/** 150% of the previous stable button size. */
const CMD_SCALE = 1.5;

/**
 * Dock attack / skill button size — stable letterbox base × 150%.
 */
export function useBattleCommandSize() {
  const { s, font } = useLayout();
  const cmdSize = Math.round(s(BASE_CMD) * CMD_SCALE);
  const cmdFont = Math.max(font(BASE_FONT), Math.round(font(BASE_FONT) * CMD_SCALE));
  return { cmdSize, cmdFont, unitScale: 1 as const };
}
