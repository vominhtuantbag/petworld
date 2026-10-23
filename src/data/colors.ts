/**
 * Hair and outfit palettes.
 *
 * To add a color, append one entry. Characters point at these ids via
 * `defaultHairId` / `defaultOutfitId`, so a typo fails typecheck.
 * The player snapshot stores the hex value, which is what the avatar paints.
 */

export const HAIR_COLORS = [
  { id: 'ink', label: 'Đen', labelEn: 'Ink', hex: '#2a2420' },
  { id: 'brown', label: 'Nâu', labelEn: 'Brown', hex: '#7a4630' },
  { id: 'auburn', label: 'Nâu đỏ', labelEn: 'Auburn', hex: '#a34732' },
  { id: 'blonde', label: 'Vàng', labelEn: 'Blonde', hex: '#e3c56a' },
  { id: 'silver', label: 'Bạc', labelEn: 'Silver', hex: '#d5dde4' },
  { id: 'night', label: 'Xanh đen', labelEn: 'Blue black', hex: '#243056' },
] as const;

export const OUTFIT_COLORS = [
  { id: 'forest', label: 'Rừng', labelEn: 'Forest', hex: '#3e6b4d' },
  { id: 'sand', label: 'Cát', labelEn: 'Sand', hex: '#c6a36a' },
  { id: 'ocean', label: 'Biển', labelEn: 'Ocean', hex: '#3c6f8e' },
  { id: 'crimson', label: 'Đỏ', labelEn: 'Crimson', hex: '#8d3d45' },
  { id: 'ivory', label: 'Ngà', labelEn: 'Ivory', hex: '#e6e0d2' },
  { id: 'dusk', label: 'Chạng vạng', labelEn: 'Dusk', hex: '#32384f' },
] as const;

export type HairColorId = (typeof HAIR_COLORS)[number]['id'];
export type OutfitColorId = (typeof OUTFIT_COLORS)[number]['id'];

type Swatch = { id: string; label: string; labelEn: string; hex: string };

export function findHair(id: string): (typeof HAIR_COLORS)[number] {
  const found = HAIR_COLORS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown hair color "${id}"`);
  }
  return found;
}

export function findOutfit(id: string): (typeof OUTFIT_COLORS)[number] {
  const found = OUTFIT_COLORS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown outfit color "${id}"`);
  }
  return found;
}

/** Relative luminance check so emblems stay visible on ivory or sand cloth. */
export function isLightHex(hex: string): boolean {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 168;
}

export type { Swatch };
