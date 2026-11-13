/**
 * Biological locomotion — animation / movement typology for all combat + field modes.
 * Combat skill kits still use the coarser `LocomotionId` groups via `kitIdForLocomotionType`.
 */

export type LocomotionType =
  | 'BIPEDAL'
  | 'QUADRUPEDAL'
  | 'MULTI_LEGGED'
  | 'SLITHERING'
  | 'LEAPING'
  | 'AERIAL'
  | 'SWIMMING'
  | 'PULSATING_FLOAT';

export const LOCOMOTION_TYPES: readonly LocomotionType[] = [
  'BIPEDAL',
  'QUADRUPEDAL',
  'MULTI_LEGGED',
  'SLITHERING',
  'LEAPING',
  'AERIAL',
  'SWIMMING',
  'PULSATING_FLOAT',
] as const;

export const LOCOMOTION_TYPE_TITLE: Record<LocomotionType, string> = {
  BIPEDAL: 'Di chuyển 2 chân',
  QUADRUPEDAL: 'Di chuyển 4 chân',
  MULTI_LEGGED: 'Di chuyển nhiều chân',
  SLITHERING: 'Di chuyển trườn',
  LEAPING: 'Di chuyển nhảy cóc',
  AERIAL: 'Di chuyển bay',
  SWIMMING: 'Di chuyển bơi lội ngang',
  PULSATING_FLOAT: 'Di chuyển bơi lên xuống',
};

/** Explicit kindId overrides (Map-1 roster + known elites). Unlisted → heuristic → QUADRUPEDAL. */
const KIND_LOCOMOTION: Record<string, LocomotionType> = {
  // plains
  'plains-rabbit': 'QUADRUPEDAL',
  'plains-mouse': 'QUADRUPEDAL',
  'plains-tree-frog': 'LEAPING',
  'plains-paddy-toad': 'LEAPING',
  'plains-field-crab': 'MULTI_LEGGED',
  'plains-tortoise': 'QUADRUPEDAL',
  'plains-charcoal-scorpion': 'MULTI_LEGGED',
  'plains-grass-snake': 'SLITHERING',
  'plains-porcupine': 'QUADRUPEDAL',
  'plains-boar': 'QUADRUPEDAL',
  // mountains
  'mountains-rock-rabbit': 'QUADRUPEDAL',
  'mountains-marmot': 'QUADRUPEDAL',
  'mountains-goat': 'QUADRUPEDAL',
  'mountains-chamois': 'QUADRUPEDAL',
  'mountains-falcon': 'AERIAL',
  'mountains-eagle': 'AERIAL',
  'mountains-red-panda': 'QUADRUPEDAL',
  'mountains-mastiff': 'QUADRUPEDAL',
  'mountains-yak': 'QUADRUPEDAL',
  'mountains-snow-leopard': 'QUADRUPEDAL',
  // forest
  'forest-sloth': 'BIPEDAL',
  'forest-capybara': 'QUADRUPEDAL',
  'forest-toucan': 'AERIAL',
  'forest-macaw': 'AERIAL',
  'forest-anteater': 'QUADRUPEDAL',
  'forest-orangutan': 'BIPEDAL',
  'forest-dart-frog': 'LEAPING',
  'forest-anaconda': 'SLITHERING',
  'forest-jaguar': 'QUADRUPEDAL',
  'forest-gorilla': 'BIPEDAL',
  // swamp
  'swamp-mosquito': 'AERIAL',
  'swamp-dragonfly': 'AERIAL',
  'swamp-beetle': 'MULTI_LEGGED',
  'swamp-crayfish': 'MULTI_LEGGED',
  'swamp-muskrat': 'QUADRUPEDAL',
  'swamp-mist-toad': 'LEAPING',
  'swamp-snake': 'SLITHERING',
  'swamp-snapping-turtle': 'QUADRUPEDAL',
  'swamp-heron': 'AERIAL',
  'swamp-alligator': 'SLITHERING',
  // beach
  'beach-snail': 'SLITHERING',
  'beach-oyster': 'PULSATING_FLOAT',
  'beach-starfish': 'PULSATING_FLOAT',
  'beach-sand-dollar': 'PULSATING_FLOAT',
  'beach-baby-turtle': 'QUADRUPEDAL',
  'beach-moray': 'SWIMMING',
  'beach-jellyfish': 'PULSATING_FLOAT',
  'beach-seagull': 'AERIAL',
  'beach-hermit': 'MULTI_LEGGED',
  'beach-ghost-crab': 'MULTI_LEGGED',
  // ocean
  'ocean-clownfish': 'SWIMMING',
  'ocean-tang': 'SWIMMING',
  'ocean-seahorse': 'PULSATING_FLOAT',
  'ocean-jelly': 'PULSATING_FLOAT',
  'ocean-moray': 'SWIMMING',
  'ocean-turtle': 'SWIMMING',
  'ocean-manta': 'SWIMMING',
  'ocean-octopus': 'PULSATING_FLOAT',
  'ocean-shark': 'SWIMMING',
  'ocean-whale': 'SWIMMING',
  // tundra
  'tundra-hare': 'QUADRUPEDAL',
  'tundra-penguin': 'BIPEDAL',
  'tundra-seal': 'SWIMMING',
  'tundra-walrus': 'SWIMMING',
  'tundra-fox': 'QUADRUPEDAL',
  'tundra-reindeer': 'QUADRUPEDAL',
  'tundra-ice-shark': 'SWIMMING',
  'tundra-orca': 'SWIMMING',
  'tundra-snow-leopard': 'QUADRUPEDAL',
  'tundra-polar-bear': 'QUADRUPEDAL',
  // savannah
  'savannah-meerkat': 'BIPEDAL',
  'savannah-mamba': 'SLITHERING',
  'savannah-giraffe': 'QUADRUPEDAL',
  'savannah-zebra': 'QUADRUPEDAL',
  'savannah-ostrich': 'BIPEDAL',
  'savannah-secretary': 'AERIAL',
  'savannah-buffalo': 'QUADRUPEDAL',
  'savannah-elephant': 'QUADRUPEDAL',
  'savannah-leopard': 'QUADRUPEDAL',
  'savannah-lion': 'QUADRUPEDAL',
  // volcano
  'volcano-sulfur-beetle': 'MULTI_LEGGED',
  'volcano-soot-butterfly': 'AERIAL',
  'volcano-pumice-mouse': 'QUADRUPEDAL',
  'volcano-lava-slug': 'SLITHERING',
  'volcano-salamander': 'QUADRUPEDAL',
  'volcano-rock-scorpion': 'MULTI_LEGGED',
  'volcano-ash-owl': 'AERIAL',
  'volcano-lava-lizard': 'QUADRUPEDAL',
  'volcano-golem': 'BIPEDAL',
  'volcano-phoenix': 'AERIAL',
  // desert
  'desert-tarantula': 'MULTI_LEGGED',
  'desert-emperor-scorpion': 'MULTI_LEGGED',
  'desert-sand-tortoise': 'QUADRUPEDAL',
  'desert-suricate': 'BIPEDAL',
  'desert-sand-cat': 'QUADRUPEDAL',
  'desert-fennec': 'QUADRUPEDAL',
  'desert-camel': 'QUADRUPEDAL',
  'desert-ostrich': 'BIPEDAL',
  'desert-rattlesnake': 'SLITHERING',
  'desert-gila': 'QUADRUPEDAL',
  // expansion
  shade: 'PULSATING_FLOAT',
  chaos: 'PULSATING_FLOAT',
};

export type LocomotionTypeInput = {
  kindId?: string | null;
  /** Explicit override from species config / save data. */
  locomotionType?: LocomotionType | string | null;
};

function normalizeType(value: string | null | undefined): LocomotionType | null {
  if (!value) return null;
  const raw = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return (LOCOMOTION_TYPES as readonly string[]).includes(raw) ? (raw as LocomotionType) : null;
}

/** Infer biological locomotion from a species kindId (and optional config override). */
export function locomotionTypeOf(kindIdOrInput: string | LocomotionTypeInput | null | undefined): LocomotionType {
  if (kindIdOrInput == null) return 'QUADRUPEDAL';
  if (typeof kindIdOrInput === 'string') {
    return resolveLocomotionType(kindIdOrInput, null);
  }
  return resolveLocomotionType(kindIdOrInput.kindId ?? '', kindIdOrInput.locomotionType);
}

function resolveLocomotionType(kindId: string, override: string | null | undefined): LocomotionType {
  const forced = normalizeType(override ?? undefined);
  if (forced) return forced;
  const id = (kindId ?? '').trim().toLowerCase();
  if (!id) return 'QUADRUPEDAL';
  const mapped = KIND_LOCOMOTION[id];
  if (mapped) return mapped;

  if (/frog|toad/.test(id)) return 'LEAPING';
  if (/jelly|ooze|spirit|shade|void|wisp|ghost|oyster|starfish|sand-dollar|octopus|seahorse/.test(id)) {
    return 'PULSATING_FLOAT';
  }
  if (/falcon|eagle|owl|heron|toucan|macaw|seagull|secretary|phoenix|mosquito|dragonfly|butterfly|bat|bird/.test(id)) {
    return 'AERIAL';
  }
  if (/fish|whale|shark|seal|orca|manta|moray|tang|clown|walrus|turtle|swim/.test(id)) return 'SWIMMING';
  if (/snake|slug|snail|alligator|crocodile|anaconda|mamba|eel/.test(id)) return 'SLITHERING';
  if (/crab|scorpion|spider|beetle|crayfish|tarantula|hermit|centipede|insect/.test(id)) return 'MULTI_LEGGED';
  if (/golem|gorilla|orangutan|sloth|penguin|ostrich|meerkat|suricate|human|biped/.test(id)) return 'BIPEDAL';
  if (/shade|chaos|warden|shard/.test(id)) return 'BIPEDAL';
  return 'QUADRUPEDAL';
}

export function locomotionTypeTitle(type: LocomotionType): string {
  return LOCOMOTION_TYPE_TITLE[type];
}

/** Coarser combat-kit bucket used by pet basic attacks. */
export type CombatLocomotionKitId = 'quadruped' | 'biped' | 'leaping' | 'crawling' | 'swimming' | 'flying';

export function kitIdForLocomotionType(type: LocomotionType): CombatLocomotionKitId {
  switch (type) {
    case 'BIPEDAL':
      return 'biped';
    case 'QUADRUPEDAL':
      return 'quadruped';
    case 'MULTI_LEGGED':
    case 'SLITHERING':
      return 'crawling';
    case 'LEAPING':
      return 'leaping';
    case 'AERIAL':
      return 'flying';
    case 'SWIMMING':
    case 'PULSATING_FLOAT':
      return 'swimming';
    default:
      return 'quadruped';
  }
}
