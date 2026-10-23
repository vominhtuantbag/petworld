/**
 * Sixteen elements. Each one is strong against the next element in the
 * ring and weak against the previous one. Every other matchup is neutral.
 */

export const ELEMENTS = [
  'fire',
  'water',
  'earth',
  'wind',
  'ice',
  'lightning',
  'nature',
  'poison',
  'metal',
  'light',
  'dark',
  'arcane',
  'lava',
  'storm',
  'sand',
  'spirit',
] as const;

export type ElementId = (typeof ELEMENTS)[number];

const ELEMENT_LABEL: Record<ElementId, string> = {
  fire: 'Hỏa',
  water: 'Thủy',
  earth: 'Thổ',
  wind: 'Phong',
  ice: 'Băng',
  lightning: 'Lôi',
  nature: 'Mộc',
  poison: 'Độc',
  metal: 'Kim',
  light: 'Quang',
  dark: 'Ám',
  arcane: 'Phép',
  lava: 'Nham',
  storm: 'Bão',
  sand: 'Cát',
  spirit: 'Linh',
};

export function elementLabel(element: ElementId): string {
  return ELEMENT_LABEL[element];
}

const INDEX = new Map<ElementId, number>(ELEMENTS.map((element, index) => [element, index]));

/** 2 advantage, 1 neutral, 0.5 disadvantage. */
export function elementMultiplier(attacker: ElementId, defender: ElementId): 2 | 1 | 0.5 {
  const from = INDEX.get(attacker);
  const to = INDEX.get(defender);
  if (from === undefined || to === undefined || from === to) return 1;
  const steps = (to - from + ELEMENTS.length) % ELEMENTS.length;
  if (steps === 1) return 2;
  if (steps === ELEMENTS.length - 1) return 0.5;
  return 1;
}

/**
 * Map a world species id onto one of the sixteen elements.
 * The hunting roster stays as it is; this only picks the combat type.
 */
export function combatElement(kindId: string): ElementId {
  if (kindId === 'shade') return 'dark';
  if (kindId === 'chaos') return 'arcane';
  if (kindId === 'warden') return 'light';
  if (kindId === 'shard') return 'storm';
  if (kindId === 'void') return 'spirit';
  if (/lava|salamander|golem|phoenix/.test(kindId)) return 'lava';
  if (kindId === 'beach-jellyfish') return 'lightning';
  if (/dart-frog|mamba|tarantula|scorpion|snake|gila|rattlesnake|spider|jelly/.test(kindId)) return 'poison';
  if (/falcon|eagle/.test(kindId)) return 'storm';
  if (/alligator|heron/.test(kindId)) return 'dark';
  if (/owl|toucan|macaw|seagull|ostrich|secretary|penguin/.test(kindId)) return 'wind';
  if (kindId.startsWith('tundra-')) return 'ice';
  if (kindId.startsWith('desert-')) return 'sand';
  if (kindId.startsWith('volcano-')) return 'fire';
  if (kindId.startsWith('ocean-') || kindId.startsWith('beach-')) return 'water';
  if (kindId.startsWith('forest-') || kindId.startsWith('plains-')) return 'nature';
  if (kindId.startsWith('mountains-')) return 'metal';
  if (kindId.startsWith('savannah-')) return 'earth';
  if (kindId.startsWith('swamp-')) return 'poison';
  return 'spirit';
}
