import type { RegionId } from '../types/game';
import { REGION_CATALOG, type RegionDefinition } from '../data/regions';

/**
 * Art direction and ecosystem catalog for all 16 regional towns.
 *
 * Visual language: Minimalist 2D Flat Vector — sharp edges, flat fills,
 * high-clarity silhouettes. Gameplay still branches on `RegionId`; this
 * file owns atmosphere, biome aliases, and hub palettes so maps stay
 * scalable across Web, iOS, and Android.
 *
 * Unlock bands match `atlas.ts` province level floors for expansion lands.
 */

export const ART_STYLE = 'minimalist-2d-flat-vector' as const;

/** Player-facing biome names from the world bible. */
export type BiomeKey =
  | 'plains'
  | 'mountains'
  | 'jungle'
  | 'swamp'
  | 'beach'
  | 'ocean'
  | 'frozen'
  | 'savanna'
  | 'volcanic'
  | 'desert'
  | 'light'
  | 'shadow'
  | 'heaven'
  | 'hell'
  | 'chaos'
  | 'cosmic';

export type FlatVectorPalette = {
  /** Dominant ground fill. */
  primary: string;
  /** Secondary terrain or water. */
  secondary: string;
  /** Highlights / roof / accent props. */
  highlight: string;
  /** Deep shade for silhouette edges. */
  shadow: string;
  /** Path / plaza strokes. */
  road: string;
  /** Readable ink on this biome. */
  ink: string;
};

export type RegionalTownConfig = {
  id: RegionId;
  biome: BiomeKey;
  /** English display alias used in design docs. */
  biomeLabel: string;
  nameVi: string;
  atmosphere: string;
  palette: FlatVectorPalette;
  /** Soft ambient tint for overlays (rgba hex-friendly). */
  ambience: string;
  /** Starter ring towns open at level 1; expansion towns gate on adventure level. */
  unlockLevel: number;
  /** True for the ten walkable starter-ring hubs. */
  ring: boolean;
};

/** Expansion / endgame town ids (indices 10–15 of the bible order). */
export const EXPANSION_TOWN_IDS = ['light', 'dark', 'heaven', 'hell', 'chaos', 'outer-space'] as const satisfies readonly RegionId[];

export type ExpansionTownId = (typeof EXPANSION_TOWN_IDS)[number];

const EXPANSION_UNLOCK: Record<ExpansionTownId, number> = {
  dark: 51,
  chaos: 71,
  light: 86,
  'outer-space': 101,
  heaven: 141,
  hell: 161,
};

/**
 * Road order for the full 16-town ecosystem.
 * Indices 0–9 are the walkable starter ring. Indices 10–15 unlock later.
 */
export const REGIONAL_TOWN_ORDER = [
  'plains',
  'mountains',
  'forest',
  'swamp',
  'beach',
  'ocean',
  'tundra',
  'savannah',
  'volcano',
  'desert',
  'light',
  'dark',
  'heaven',
  'hell',
  'chaos',
  'outer-space',
] as const satisfies readonly RegionId[];

export type RegionalTownId = (typeof REGIONAL_TOWN_ORDER)[number];

const THEMES: Record<RegionalTownId, Omit<RegionalTownConfig, 'id' | 'nameVi' | 'unlockLevel' | 'ring'>> = {
  plains: {
    biome: 'plains',
    biomeLabel: 'Plains',
    atmosphere: 'Open grass, soft horizon light, calm breeze.',
    palette: {
      primary: '#6ea24e',
      secondary: '#8eb86a',
      highlight: '#f7f3d8',
      shadow: '#3a5a2e',
      road: '#e8d9a4',
      ink: '#24331c',
    },
    ambience: 'rgba(215, 231, 164, 0.18)',
  },
  mountains: {
    biome: 'mountains',
    biomeLabel: 'Mountains',
    atmosphere: 'Cool stone ridges, thin air, long sightlines.',
    palette: {
      primary: '#5c6b73',
      secondary: '#8aa4c8',
      highlight: '#e4edf5',
      shadow: '#2c3e55',
      road: '#c5d0d8',
      ink: '#f4f7fb',
    },
    ambience: 'rgba(138, 164, 200, 0.16)',
  },
  forest: {
    biome: 'jungle',
    biomeLabel: 'Jungle',
    atmosphere: 'Dense canopy, moss paths, filtered green light.',
    palette: {
      primary: '#2d5a38',
      secondary: '#1e4d3a',
      highlight: '#8fd0a6',
      shadow: '#0e2420',
      road: '#6f8f62',
      ink: '#e7f6ee',
    },
    ambience: 'rgba(45, 90, 56, 0.22)',
  },
  swamp: {
    biome: 'swamp',
    biomeLabel: 'Swamp',
    atmosphere: 'Shallow water, low fog, muted greens.',
    palette: {
      primary: '#2a3a2c',
      secondary: '#3e5340',
      highlight: '#b5cf86',
      shadow: '#1c2820',
      road: '#5a6e4e',
      ink: '#e7f0df',
    },
    ambience: 'rgba(62, 83, 64, 0.2)',
  },
  beach: {
    biome: 'beach',
    biomeLabel: 'Beach',
    atmosphere: 'Warm sand, soft tide, bright midday flats.',
    palette: {
      primary: '#e6d2a8',
      secondary: '#6eadd4',
      highlight: '#fff6e4',
      shadow: '#c49a62',
      road: '#f0e0bc',
      ink: '#3d3428',
    },
    ambience: 'rgba(240, 196, 138, 0.16)',
  },
  ocean: {
    biome: 'ocean',
    biomeLabel: 'Ocean',
    atmosphere: 'Deep teal water, calm swell, distant mist.',
    palette: {
      primary: '#134868',
      secondary: '#1a6a8a',
      highlight: '#9ad7ea',
      shadow: '#0b2e4a',
      road: '#3a7a92',
      ink: '#e7f7fb',
    },
    ambience: 'rgba(26, 106, 138, 0.2)',
  },
  tundra: {
    biome: 'frozen',
    biomeLabel: 'Frozen / Arctic',
    atmosphere: 'Quiet frost, pale sky, crisp ice edges.',
    palette: {
      primary: '#eef5f8',
      secondary: '#7f9bb5',
      highlight: '#ffffff',
      shadow: '#5a7388',
      road: '#d5e6f2',
      ink: '#243746',
    },
    ambience: 'rgba(213, 230, 242, 0.22)',
  },
  savannah: {
    biome: 'savanna',
    biomeLabel: 'Savanna',
    atmosphere: 'Golden grass, sparse trees, long warm wind.',
    palette: {
      primary: '#c6a15a',
      secondary: '#e2b15a',
      highlight: '#f6e7b2',
      shadow: '#8a6a32',
      road: '#ddc28a',
      ink: '#3a2a12',
    },
    ambience: 'rgba(226, 177, 90, 0.16)',
  },
  volcano: {
    biome: 'volcanic',
    biomeLabel: 'Volcanic',
    atmosphere: 'Warm ash stone, ember glow, sharp lava accents.',
    palette: {
      primary: '#3a2420',
      secondary: '#6b2430',
      highlight: '#f08a3c',
      shadow: '#2a1214',
      road: '#6a4540',
      ink: '#fff1e6',
    },
    ambience: 'rgba(240, 138, 60, 0.14)',
  },
  desert: {
    biome: 'desert',
    biomeLabel: 'Desert',
    atmosphere: 'Even heat, short shadows, dune flats.',
    palette: {
      primary: '#e2c48a',
      secondary: '#e7a15a',
      highlight: '#fff4d8',
      shadow: '#c46b3a',
      road: '#f0d8a8',
      ink: '#3f2a16',
    },
    ambience: 'rgba(231, 161, 90, 0.14)',
  },
  light: {
    biome: 'light',
    biomeLabel: 'Light',
    atmosphere: 'Radiant plazas, soft gold haze, clear edges.',
    palette: {
      primary: '#f7e7b8',
      secondary: '#fff6d8',
      highlight: '#fffdf4',
      shadow: '#f0d48a',
      road: '#ffe9b8',
      ink: '#5a4316',
    },
    ambience: 'rgba(255, 246, 216, 0.2)',
  },
  dark: {
    biome: 'shadow',
    biomeLabel: 'Shadow',
    atmosphere: 'Muted violet night, quiet umbra, cool accents.',
    palette: {
      primary: '#14101f',
      secondary: '#1a1430',
      highlight: '#b1a4ff',
      shadow: '#07060e',
      road: '#2a2440',
      ink: '#f3f0ff',
    },
    ambience: 'rgba(177, 164, 255, 0.12)',
  },
  heaven: {
    biome: 'heaven',
    biomeLabel: 'Heaven',
    atmosphere: 'Airy gold cloud decks, serene glow, open courts.',
    palette: {
      primary: '#f6e7b4',
      secondary: '#fff8e8',
      highlight: '#fff6d4',
      shadow: '#f0d78a',
      road: '#ffe9c4',
      ink: '#5a4316',
    },
    ambience: 'rgba(255, 248, 232, 0.18)',
  },
  hell: {
    biome: 'hell',
    biomeLabel: 'Hell',
    atmosphere: 'Crimson pits, heat shimmer, hard black stone.',
    palette: {
      primary: '#3a1214',
      secondary: '#6a1a16',
      highlight: '#ffb089',
      shadow: '#1a0808',
      road: '#5a2a28',
      ink: '#fff1e8',
    },
    ambience: 'rgba(255, 176, 137, 0.12)',
  },
  chaos: {
    biome: 'chaos',
    biomeLabel: 'Chaos',
    atmosphere: 'Warped magenta rifts, unstable flats, bright cracks.',
    palette: {
      primary: '#2a1438',
      secondary: '#5a1d4a',
      highlight: '#ff8fba',
      shadow: '#1a1030',
      road: '#4a2a58',
      ink: '#ffe8f4',
    },
    ambience: 'rgba(255, 143, 186, 0.12)',
  },
  'outer-space': {
    biome: 'cosmic',
    biomeLabel: 'Cosmic',
    atmosphere: 'Starfield voids, cool nebula washes, crisp glyphs.',
    palette: {
      primary: '#16132a',
      secondary: '#120c2e',
      highlight: '#c9d6ff',
      shadow: '#05060f',
      road: '#2a3050',
      ink: '#f5f7ff',
    },
    ambience: 'rgba(201, 214, 255, 0.12)',
  },
};

function isExpansionTown(id: RegionalTownId): id is ExpansionTownId {
  return Object.prototype.hasOwnProperty.call(EXPANSION_UNLOCK, id);
}

function buildTown(id: RegionalTownId): RegionalTownConfig {
  const theme = THEMES[id];
  const catalog = REGION_CATALOG[id];
  const expansion = isExpansionTown(id);
  return {
    id,
    nameVi: catalog.nameVi,
    unlockLevel: expansion ? EXPANSION_UNLOCK[id] : 1,
    ring: !expansion,
    ...theme,
  };
}

export const REGIONAL_TOWNS: readonly RegionalTownConfig[] = REGIONAL_TOWN_ORDER.map(buildTown);

const BY_ID = new Map(REGIONAL_TOWNS.map((town) => [town.id, town]));

export function getRegionalTown(id: string | null | undefined): RegionalTownConfig | null {
  if (!id) return null;
  return BY_ID.get(id as RegionalTownId) ?? null;
}

export function listRingTowns(): RegionalTownConfig[] {
  return REGIONAL_TOWNS.filter((town) => town.ring);
}

export function listExpansionTowns(): RegionalTownConfig[] {
  return REGIONAL_TOWNS.filter((town) => !town.ring);
}

export function listUnlockedTowns(adventureLevel: number): RegionalTownConfig[] {
  return REGIONAL_TOWNS.filter((town) => adventureLevel >= town.unlockLevel);
}

export function townIsOpen(id: string, adventureLevel: number): boolean {
  const town = getRegionalTown(id);
  if (!town) return false;
  return adventureLevel >= town.unlockLevel;
}

/** Setup-screen region records in the 16-town bible order. */
export function listRegionalDefinitions(): RegionDefinition[] {
  return REGIONAL_TOWN_ORDER.map((id) => ({ id, ...REGION_CATALOG[id] }));
}

export function biomeOf(regionId: RegionId): BiomeKey {
  return getRegionalTown(regionId)?.biome ?? 'plains';
}

export function isExpansionTownId(id: string): id is ExpansionTownId {
  return (EXPANSION_TOWN_IDS as readonly string[]).includes(id);
}
