/**
 * Sixteen biome / thematic systems. Each one is strong against the next
 * system in the ring and weak against the previous one. Neutral otherwise.
 */

export const BIOMES = [
  'plains',
  'mountain',
  'forest',
  'swamp',
  'beach',
  'ocean',
  'frost',
  'savanna',
  'volcano',
  'desert',
  'darkness',
  'light',
  'heaven',
  'hell',
  'chaos',
  'cosmic',
] as const;

export type BiomeId = (typeof BIOMES)[number];
/** Combat type id. Biomes replaced the old Kim / Mộc / Thủy / Hỏa catalog. */
export type ElementId = BiomeId;
export const ELEMENTS = BIOMES;

const BIOME_LABEL: Record<BiomeId, string> = {
  plains: 'Đồng Bằng',
  mountain: 'Núi Non',
  forest: 'Rừng Rậm',
  swamp: 'Đầm Lầy',
  beach: 'Bãi Biển',
  ocean: 'Đại Dương',
  frost: 'Băng Giá',
  savanna: 'Thảo Nguyên Savan',
  volcano: 'Núi Lửa',
  desert: 'Sa Mạc',
  darkness: 'Bóng Tối',
  light: 'Ánh Sáng',
  heaven: 'Thiên Đường',
  hell: 'Địa Ngục',
  chaos: 'Hỗn Mang',
  cosmic: 'Vũ Trụ',
};

export function biomeLabel(biome: BiomeId): string {
  return BIOME_LABEL[biome];
}

export function elementLabel(element: ElementId): string {
  return BIOME_LABEL[element] ?? element;
}

const INDEX = new Map<BiomeId, number>(BIOMES.map((biome, index) => [biome, index]));

const LEGACY_ELEMENT: Record<string, BiomeId> = {
  fire: 'volcano',
  water: 'ocean',
  earth: 'mountain',
  wind: 'plains',
  ice: 'frost',
  lightning: 'cosmic',
  nature: 'forest',
  poison: 'swamp',
  metal: 'mountain',
  light: 'light',
  dark: 'darkness',
  arcane: 'chaos',
  lava: 'volcano',
  storm: 'ocean',
  sand: 'desert',
  spirit: 'heaven',
};

export function asBiome(id: string | null | undefined): BiomeId {
  if (id && (BIOMES as readonly string[]).includes(id)) return id as BiomeId;
  if (id && LEGACY_ELEMENT[id]) return LEGACY_ELEMENT[id];
  return 'plains';
}

/** 2 advantage, 1 neutral, 0.5 disadvantage. */
export function elementMultiplier(attacker: ElementId, defender: ElementId): 2 | 1 | 0.5 {
  const from = INDEX.get(asBiome(attacker));
  const to = INDEX.get(asBiome(defender));
  if (from === undefined || to === undefined || from === to) return 1;
  const steps = (to - from + BIOMES.length) % BIOMES.length;
  if (steps === 1) return 2;
  if (steps === BIOMES.length - 1) return 0.5;
  return 1;
}

/**
 * Map a world species id onto one of the sixteen biome systems.
 * Prefixes follow the hunting roster; named spirits keep a thematic type.
 */
export function combatElement(kindId: string): BiomeId {
  const id = kindId ?? '';
  if (id === 'shade') return 'darkness';
  if (id === 'chaos') return 'chaos';
  if (id === 'warden') return 'light';
  if (id === 'shard') return 'cosmic';
  if (id === 'void') return 'hell';
  if (id.startsWith('plains-')) return 'plains';
  if (id.startsWith('mountains-')) return 'mountain';
  if (id.startsWith('forest-')) return 'forest';
  if (id.startsWith('swamp-')) return 'swamp';
  if (id.startsWith('beach-')) return 'beach';
  if (id.startsWith('ocean-')) return 'ocean';
  if (id.startsWith('tundra-')) return 'frost';
  if (id.startsWith('savannah-')) return 'savanna';
  if (id.startsWith('volcano-')) return 'volcano';
  if (id.startsWith('desert-')) return 'desert';
  if (/phoenix|golem|salamander/.test(id)) return 'volcano';
  return 'chaos';
}

export function combatBiome(kindId: string): BiomeId {
  return combatElement(kindId);
}
