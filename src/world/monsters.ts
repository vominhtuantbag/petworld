/**
 * Map 1 fauna for the ten ring towns.
 *
 * Each town's first hunting map is five uneven zones (see `tiers.ts`).
 * Zone 0 is levels 1–2 and zone 4 is levels 9–10. A chunk in that zone
 * spawns the two species listed here, one of each.
 *
 * On Đồng bằng, "đồng" means grassland: field rabbit, field mouse, and the
 * tree frog Nhái bén. The collection screen lists those three by id.
 * It is not the metal copper, and the grassland rabbit must not
 * use the old copper-rabbit sheet.
 *
 * Maps 2–10 of the same town still have no roster of their own. They
 * reuse the pair for the matching sub-zone, at that map's real level.
 * `monsterStats` in catalog.ts scales the body. Drop a later table in
 * beside `MAP1_ROSTER` when those bands get their own species.
 *
 * Art: `MonsterToken` looks up `id`. A missing png draws a disc in `tint`,
 * so a species can ship before its sprite exists.
 */

export const MAP1_ROSTER_VERSION = 1;

export type MonsterSpecies = {
  id: string;
  name: string;
  tint: string;
  /** Body at level 1. `monsterStats` adds the level. */
  hp: number;
  attack: number;
  defense: number;
  agro: number;
  speed: number;
  /** Expansion elites only. Town species use `name`. */
  deepName?: string;
};

type Tune = Partial<Pick<MonsterSpecies, 'hp' | 'attack' | 'defense' | 'agro' | 'speed'>>;

const ZONE_BODY = [
  { hp: 22, attack: 6, defense: 1, agro: 102, speed: 84 },
  { hp: 28, attack: 8, defense: 2, agro: 112, speed: 76 },
  { hp: 34, attack: 10, defense: 3, agro: 120, speed: 70 },
  { hp: 42, attack: 13, defense: 4, agro: 132, speed: 74 },
  { hp: 52, attack: 16, defense: 6, agro: 146, speed: 66 },
] as const;

function mob(id: string, name: string, tint: string, zone: 0 | 1 | 2 | 3 | 4, tune: Tune = {}): MonsterSpecies {
  const body = ZONE_BODY[zone];
  return {
    id,
    name,
    tint,
    hp: body.hp + (tune.hp ?? 0),
    attack: body.attack + (tune.attack ?? 0),
    defense: body.defense + (tune.defense ?? 0),
    agro: body.agro + (tune.agro ?? 0),
    speed: body.speed + (tune.speed ?? 0),
  };
}

type Pair = readonly [MonsterSpecies, MonsterSpecies];

/**
 * Ten towns, five zones, two species. Order inside a pair is the order
 * a chunk places them: index 0, then index 1.
 */
export const MAP1_ROSTER: Record<string, readonly Pair[]> = {
  plains: [
    [mob('plains-rabbit', 'Thỏ đồng', '#c4a574', 0, { speed: 14, hp: -2 }), mob('plains-mouse', 'Chuột đồng', '#8d7356', 0, { speed: 10, hp: -4 })],
    [mob('plains-tree-frog', 'Nhái bén', '#3e9a4a', 1, { speed: 8 }), mob('plains-paddy-toad', 'Cóc ruộng', '#6a8f3a', 1, { hp: 4, speed: -6 })],
    [mob('plains-field-crab', 'Cua đồng', '#c46a45', 2, { defense: 2, speed: -12 }), mob('plains-tortoise', 'Rùa cạn', '#6e8a52', 2, { hp: 8, defense: 2, speed: -16 })],
    [mob('plains-charcoal-scorpion', 'Bò cạp than', '#2c2a28', 3, { attack: 2 }), mob('plains-grass-snake', 'Rắn cỏ', '#4f8f45', 3, { speed: 8, defense: -1 })],
    [mob('plains-porcupine', 'Nhím xù', '#6b5344', 4, { defense: 2 }), mob('plains-boar', 'Heo rừng con', '#8a5a42', 4, { hp: 10, attack: 2, speed: -4 })],
  ],
  mountains: [
    [mob('mountains-rock-rabbit', 'Thỏ đá', '#9aa3a8', 0, { speed: 8 }), mob('mountains-marmot', 'Chuột Marmot', '#a67c52', 0, { hp: 2 })],
    [mob('mountains-goat', 'Dê núi', '#c8c2b4', 1, { hp: 4, defense: 1 }), mob('mountains-chamois', 'Sơn Dương', '#b7a48a', 1, { speed: 6 })],
    [mob('mountains-falcon', 'Cắt lớn', '#5c6b78', 2, { speed: 16, hp: -4 }), mob('mountains-eagle', 'Đại Bàng vàng', '#c9a227', 2, { attack: 2, speed: 10 })],
    [mob('mountains-red-panda', 'Gấu trúc đỏ', '#c45a3a', 3), mob('mountains-mastiff', 'Chó ngao Tây Tạng', '#3d3530', 3, { hp: 8, attack: 2, speed: -6 })],
    [mob('mountains-yak', 'Bò Tây Tạng', '#6e5344', 4, { hp: 12, defense: 2, speed: -10 }), mob('mountains-snow-leopard', 'Báo tuyết', '#d5dde3', 4, { attack: 3, speed: 12 })],
  ],
  forest: [
    [mob('forest-sloth', 'Con lười', '#8a7a62', 0, { hp: 6, speed: -28, agro: -20 }), mob('forest-capybara', 'Chuột lang nước', '#a68458', 0, { hp: 4 })],
    [mob('forest-toucan', 'Chim Toucan', '#e07a2f', 1, { speed: 8, hp: -2 }), mob('forest-macaw', 'Vẹt Macaw', '#2f8f4e', 1, { speed: 10 })],
    [mob('forest-anteater', 'Thú ăn kiến', '#b08968', 2, { hp: 4 }), mob('forest-orangutan', 'Đười ươi', '#c46a32', 2, { hp: 6, attack: 1 })],
    [mob('forest-dart-frog', 'Ếch phi tiêu', '#e23b6a', 3, { attack: 3, hp: -4 }), mob('forest-anaconda', 'Trăn Anaconda xanh', '#2f6b45', 3, { hp: 8, speed: -8 })],
    [mob('forest-jaguar', 'Báo đốm', '#d4a017', 4, { attack: 3, speed: 10 }), mob('forest-gorilla', 'Khỉ đột', '#3a3a3a', 4, { hp: 14, defense: 2, speed: -6 })],
  ],
  swamp: [
    [mob('swamp-mosquito', 'Muỗi', '#6b6a62', 0, { hp: -6, speed: 14, agro: 8 }), mob('swamp-dragonfly', 'Chuồn chuồn', '#3aa0c8', 0, { speed: 16, hp: -4 })],
    [mob('swamp-beetle', 'Bọ cánh cứng', '#3d6b32', 1, { defense: 2, speed: -8 }), mob('swamp-crayfish', 'Tôm hùm đất', '#c45a48', 1, { defense: 1 })],
    [mob('swamp-muskrat', 'Chuột xạ hôi', '#7a6248', 2), mob('swamp-mist-toad', 'Cóc sương', '#7d9a6a', 2, { hp: 4, speed: -8 })],
    [mob('swamp-snake', 'Rắn đầm lầy', '#4a6b48', 3, { speed: 4 }), mob('swamp-snapping-turtle', 'Rùa Snapping', '#5c6b3a', 3, { hp: 8, defense: 3, speed: -14 })],
    [mob('swamp-heron', 'Diệc hắc ám', '#2a2e38', 4, { speed: 6 }), mob('swamp-alligator', 'Cá sấu đầm lầy', '#3e5a3a', 4, { hp: 12, attack: 2, speed: -8 })],
  ],
  beach: [
    [mob('beach-snail', 'Ốc biển', '#d4c4a0', 0, { speed: -20, defense: 1 }), mob('beach-oyster', 'Hàu biển', '#c8c2b4', 0, { speed: -30, defense: 2, agro: -16 })],
    [mob('beach-starfish', 'Sao biển xanh', '#3a7ec8', 1, { speed: -10 }), mob('beach-sand-dollar', 'Đồng tiền cát', '#e6d8b8', 1, { defense: 1, speed: -14 })],
    [mob('beach-baby-turtle', 'Rùa biển con', '#6aaa78', 2, { defense: 1 }), mob('beach-moray', 'Cá Chình Moray', '#6a8a4a', 2, { attack: 2, speed: 4 })],
    [mob('beach-jellyfish', 'Sứa điện', '#c9e26a', 3, { attack: 2, defense: -1 }), mob('beach-seagull', 'Hải Âu', '#f2f2f0', 3, { speed: 14, hp: -4 })],
    [mob('beach-hermit', 'Ốc Hermite', '#d08a5a', 4, { defense: 2 }), mob('beach-ghost-crab', 'Cua ma', '#e8e4dc', 4, { speed: 6, attack: 1 })],
  ],
  ocean: [
    [mob('ocean-clownfish', 'Cá Nemo', '#e85a2a', 0, { speed: 8 }), mob('ocean-tang', 'Cá Dory', '#3a8fd4', 0, { speed: 10 })],
    [mob('ocean-seahorse', 'Cá Ngựa', '#e0a050', 1, { speed: -6 }), mob('ocean-jelly', 'Sứa Độc', '#c45ad4', 1, { attack: 3, defense: -1 })],
    [mob('ocean-moray', 'Cá Chình Moray', '#4a7a62', 2, { attack: 2 }), mob('ocean-turtle', 'Rùa biển xanh', '#2f8a6a', 2, { hp: 8, defense: 2, speed: -10 })],
    [mob('ocean-manta', 'Cá Đuối Manta', '#4a6a8a', 3, { hp: 8, speed: 6 }), mob('ocean-octopus', 'Bạch Tuộc', '#c46a8a', 3, { attack: 2 })],
    [mob('ocean-shark', 'Cá Mập trắng', '#8aa0b0', 4, { attack: 4, speed: 10 }), mob('ocean-whale', 'Cá Voi xanh', '#3a6a9a', 4, { hp: 18, defense: 2, speed: -14, agro: -10 })],
  ],
  tundra: [
    [mob('tundra-hare', 'Thỏ tuyết', '#f4f7fa', 0, { speed: 14 }), mob('tundra-penguin', 'Cánh cụt', '#2a2a2e', 0, { speed: -8 })],
    [mob('tundra-seal', 'Hải Cẩu', '#8a9aa4', 1, { hp: 4 }), mob('tundra-walrus', 'Hải Tượng', '#a09080', 1, { hp: 8, defense: 1, speed: -10 })],
    [mob('tundra-fox', 'Cáo tuyết', '#e8eef2', 2, { speed: 10 }), mob('tundra-reindeer', 'Tuần Lộc', '#8a6a4a', 2, { hp: 6 })],
    [mob('tundra-ice-shark', 'Cá Mập băng', '#b9d4e8', 3, { attack: 3, speed: 6 }), mob('tundra-orca', 'Cá Voi sát thủ', '#1a1a1e', 3, { hp: 10, attack: 2 })],
    [mob('tundra-snow-leopard', 'Báo tuyết', '#dfe7ee', 4, { attack: 3, speed: 12 }), mob('tundra-polar-bear', 'Gấu Bắc Cực', '#f7f7f5', 4, { hp: 14, attack: 2, defense: 1 })],
  ],
  savannah: [
    [mob('savannah-meerkat', 'Chồn đất', '#c4a06a', 0, { speed: 8 }), mob('savannah-mamba', 'Rắn Mamba đen', '#1e1e1c', 0, { attack: 3, hp: -4, speed: 6 })],
    [mob('savannah-giraffe', 'Hươu cao cổ', '#e0b15a', 1, { hp: 6, speed: 4 }), mob('savannah-zebra', 'Ngựa vằn', '#f2f2f0', 1, { speed: 14 })],
    [mob('savannah-ostrich', 'Đà điểu', '#c4b4a0', 2, { speed: 12, hp: 2 }), mob('savannah-secretary', 'Chim thư ký', '#8a9098', 2, { speed: 8, attack: 1 })],
    [mob('savannah-buffalo', 'Trâu rừng Cape', '#3a322c', 3, { hp: 10, defense: 2, speed: -6 }), mob('savannah-elephant', 'Voi hoang dã', '#8a8680', 3, { hp: 14, defense: 1, speed: -10 })],
    [mob('savannah-leopard', 'Báo Hoa', '#d4a84a', 4, { attack: 3, speed: 12 }), mob('savannah-lion', 'Sư tử', '#c4923a', 4, { hp: 8, attack: 3, agro: 10 })],
  ],
  volcano: [
    [mob('volcano-sulfur-beetle', 'Bọ lưu huỳnh', '#d4c43a', 0, { defense: 1, speed: -6 }), mob('volcano-soot-butterfly', 'Bướm muội than', '#3a3532', 0, { speed: 10, hp: -4 })],
    [mob('volcano-pumice-mouse', 'Chuột đá bọt', '#b0a8a0', 1, { speed: 6 }), mob('volcano-lava-slug', 'Sên dung nham', '#e85a28', 1, { speed: -16, defense: 1 })],
    [mob('volcano-salamander', 'Kỳ giông lửa', '#e23a1a', 2, { attack: 2 }), mob('volcano-rock-scorpion', 'Bò cạp đá', '#6a5a4a', 2, { defense: 2, attack: 1 })],
    [mob('volcano-ash-owl', 'Cú tro lửa', '#6a6460', 3, { speed: 8 }), mob('volcano-lava-lizard', 'Thằn lằn dung nham', '#e24a20', 3, { speed: 6, attack: 2 })],
    [mob('volcano-golem', 'Golem dung nham', '#c43a22', 4, { hp: 16, defense: 3, speed: -16 }), mob('volcano-phoenix', 'Phượng hoàng con', '#ff7a28', 4, { attack: 3, speed: 12, hp: -4 })],
  ],
  desert: [
    [mob('desert-tarantula', 'Nhện Tula', '#3a2a28', 0, { speed: 4 }), mob('desert-emperor-scorpion', 'Bò cạp hoàng đế', '#c9a03a', 0, { attack: 2, defense: 1 })],
    [mob('desert-sand-tortoise', 'Rùa cát', '#d4c09a', 1, { hp: 6, defense: 2, speed: -16 }), mob('desert-suricate', 'Cầy vằn', '#c4a878', 1, { speed: 8 })],
    [mob('desert-sand-cat', 'Mèo cát', '#e0c8a0', 2, { speed: 10 }), mob('desert-fennec', 'Cáo Fennec', '#f0d8b0', 2, { speed: 12, hp: -2 })],
    [mob('desert-camel', 'Lạc Đà', '#c4a070', 3, { hp: 10, defense: 1, speed: -8 }), mob('desert-ostrich', 'Đà điểu sa mạc', '#d8c8b0', 3, { speed: 12 })],
    [mob('desert-rattlesnake', 'Rắn đuôi chuông', '#c4a060', 4, { attack: 3, speed: 4 }), mob('desert-gila', 'Quái vật Gila', '#e07a4a', 4, { attack: 2, hp: 4 })],
  ],
};

/** Bóng tối, hỗn mang, ánh sáng, vũ trụ, hư không. Not part of the ten-town roster. */
const EXPANSION: Record<string, MonsterSpecies> = {
  dark: { id: 'shade', name: 'Bóng ma', deepName: 'Bóng ma già', tint: '#9b8cff', hp: 70, attack: 22, defense: 8, agro: 160, speed: 80 },
  chaos: { id: 'chaos', name: 'Hỗn thú', deepName: 'Hỗn thú lớn', tint: '#ff7aa2', hp: 84, attack: 26, defense: 10, agro: 170, speed: 84 },
  light: { id: 'warden', name: 'Thần hộ', deepName: 'Thần hộ sáng', tint: '#f3e7a1', hp: 96, attack: 30, defense: 12, agro: 180, speed: 76 },
  space: { id: 'shard', name: 'Tinh thể', deepName: 'Tinh thể già', tint: '#c9d6ff', hp: 110, attack: 34, defense: 14, agro: 190, speed: 70 },
  void: { id: 'void', name: 'Hư không', deepName: 'Hư không cổ', tint: '#d7c4ff', hp: 140, attack: 42, defense: 18, agro: 210, speed: 88 },
};

/** The two Map 1 species for this town and sub-zone, or null on expansion maps. */
export function townSpecies(fauna: string, zoneIndex: number): Pair | null {
  const pairs = MAP1_ROSTER[fauna];
  if (!pairs) return null;
  const index = Math.max(0, Math.min(pairs.length - 1, zoneIndex));
  return pairs[index];
}

export function expansionSpecies(fauna: string): MonsterSpecies {
  return EXPANSION[fauna] ?? EXPANSION.dark;
}

export function speciesById(id: string): MonsterSpecies | null {
  for (const pairs of Object.values(MAP1_ROSTER)) {
    for (const pair of pairs) {
      for (const species of pair) {
        if (species.id === id) return species;
      }
    }
  }
  for (const species of Object.values(EXPANSION)) {
    if (species.id === id) return species;
  }
  return null;
}

const species = Object.values(MAP1_ROSTER).flat(2);
const ids = new Set(species.map((entry) => entry.id));
if (species.length !== 100 || ids.size !== 100 || Object.keys(MAP1_ROSTER).length !== 10) {
  throw new Error(`Map 1 roster must be 10 towns × 5 zones × 2 species. Got ${species.length} rows, ${ids.size} ids.`);
}
