import type { RegionCatalog, RegionId, RegionMotifId, RegionStatus } from '../types/game';

/**
 * World catalog — the extension point for new regions.
 *
 * To open a future region (Light, Dark, Chaos, Outer Space, or a new one):
 * 1. Add its id to `RegionId` in `src/types/game.ts`.
 * 2. Add a motif id and a drawing in `RegionMotif` if the icon is new.
 * 3. Append a record here. `satisfies Record<RegionId, ...>` will not compile
 *    until every id has an entry, and it rejects unknown ids.
 * 4. Set `status` to `'available'` when players may start there.
 *    `'locked'` keeps the card visible but unselectable.
 *
 * Branch gameplay on `id`, never on the translated name.
 */

export type RegionConfig = {
  name: string;
  nameVi: string;
  description: string;
  status: RegionStatus;
  catalog: RegionCatalog;
  motif: RegionMotifId;
  sky: readonly [string, string];
  ground: string;
  accent: string;
  /** Readable text color when copy sits directly on this sky. */
  ink: string;
};

export type RegionDefinition = RegionConfig & { id: RegionId };

export const REGION_CATALOG = {
  forest: {
    name: 'Forest',
    nameVi: 'Rừng rậm',
    description: 'Râm mát, nhiều lối mòn.',
    status: 'available',
    catalog: 'starter',
    motif: 'forest',
    sky: ['#1e4d3a', '#0e2420'],
    ground: '#2d5a38',
    accent: '#8fd0a6',
    ink: '#e7f6ee',
  },
  beach: {
    name: 'Beach',
    nameVi: 'Bãi biển',
    description: 'Cát ấm và sóng nhỏ.',
    status: 'available',
    catalog: 'starter',
    motif: 'beach',
    sky: ['#f0c48a', '#6eadd4'],
    ground: '#e6d2a8',
    accent: '#fff6e4',
    ink: '#3d3428',
  },
  mountains: {
    name: 'Mountains',
    nameVi: 'Núi non',
    description: 'Gió cao, tầm nhìn rộng.',
    status: 'available',
    catalog: 'starter',
    motif: 'mountains',
    sky: ['#8aa4c8', '#2c3e55'],
    ground: '#5c6b73',
    accent: '#e4edf5',
    ink: '#f4f7fb',
  },
  ocean: {
    name: 'Ocean',
    nameVi: 'Đại dương',
    description: 'Xanh sâu và êm.',
    status: 'available',
    catalog: 'starter',
    motif: 'ocean',
    sky: ['#1a6a8a', '#0b2e4a'],
    ground: '#134868',
    accent: '#9ad7ea',
    ink: '#e7f7fb',
  },
  volcano: {
    name: 'Volcano',
    nameVi: 'Núi lửa',
    description: 'Đá ấm, ánh lửa xa.',
    status: 'available',
    catalog: 'starter',
    motif: 'volcano',
    sky: ['#6b2430', '#2a1214'],
    ground: '#3a2420',
    accent: '#f08a3c',
    ink: '#fff1e6',
  },
  desert: {
    name: 'Desert',
    nameVi: 'Sa mạc',
    description: 'Nắng đều, bóng ngắn.',
    status: 'available',
    catalog: 'starter',
    motif: 'desert',
    sky: ['#e7a15a', '#c46b3a'],
    ground: '#e2c48a',
    accent: '#fff4d8',
    ink: '#3f2a16',
  },
  plains: {
    name: 'Plains',
    nameVi: 'Đồng bằng',
    description: 'Cỏ mềm đến chân trời.',
    status: 'available',
    catalog: 'starter',
    motif: 'plains',
    sky: ['#8eb86a', '#d7e7a4'],
    ground: '#6ea24e',
    accent: '#f7f3d8',
    ink: '#24331c',
  },
  tundra: {
    name: 'Tundra',
    nameVi: 'Băng giá',
    description: 'Tĩnh, sáng, và lạnh nhẹ.',
    status: 'available',
    catalog: 'starter',
    motif: 'tundra',
    sky: ['#d5e6f2', '#7f9bb5'],
    ground: '#eef5f8',
    accent: '#ffffff',
    ink: '#243746',
  },
  swamp: {
    name: 'Swamp',
    nameVi: 'Đầm lầy',
    description: 'Nước nông, sương thấp.',
    status: 'available',
    catalog: 'starter',
    motif: 'swamp',
    sky: ['#3e5340', '#1c2820'],
    ground: '#2a3a2c',
    accent: '#b5cf86',
    ink: '#e7f0df',
  },
  savannah: {
    name: 'Wild Savannah',
    nameVi: 'Thảo Nguyên',
    description: 'Cỏ vàng, cây thưa, gió dài.',
    status: 'available',
    catalog: 'starter',
    motif: 'savannah',
    sky: ['#e2b15a', '#8fb56a'],
    ground: '#c6a15a',
    accent: '#f6e7b2',
    ink: '#3a2a12',
  },
  light: {
    name: 'Light',
    nameVi: 'Ánh sáng',
    description: 'Một vùng sáng còn đóng.',
    status: 'locked',
    catalog: 'expansion',
    motif: 'light',
    sky: ['#fff6d8', '#f0d48a'],
    ground: '#f7e7b8',
    accent: '#fffdf4',
    ink: '#5a4316',
  },
  dark: {
    name: 'Dark',
    nameVi: 'Bóng tối',
    description: 'Một vùng tối còn đóng.',
    status: 'locked',
    catalog: 'expansion',
    motif: 'dark',
    sky: ['#1a1430', '#07060e'],
    ground: '#14101f',
    accent: '#b1a4ff',
    ink: '#f3f0ff',
  },
  chaos: {
    name: 'Chaos',
    nameVi: 'Hỗn mang',
    description: 'Một vùng hỗn mang còn đóng.',
    status: 'locked',
    catalog: 'expansion',
    motif: 'chaos',
    sky: ['#5a1d4a', '#1a1030'],
    ground: '#2a1438',
    accent: '#ff8fba',
    ink: '#ffe8f4',
  },
  'outer-space': {
    name: 'Outer Space',
    nameVi: 'Vũ trụ',
    description: 'Bầu trời ngoài còn đóng.',
    status: 'locked',
    catalog: 'expansion',
    motif: 'space',
    sky: ['#120c2e', '#05060f'],
    ground: '#16132a',
    accent: '#c9d6ff',
    ink: '#f5f7ff',
  },
  heaven: {
    name: 'Heaven',
    nameVi: 'Thiên đường',
    description: 'Cổng trời còn đóng.',
    status: 'locked',
    catalog: 'expansion',
    motif: 'heaven',
    sky: ['#fff8e8', '#f0d78a'],
    ground: '#f6e7b4',
    accent: '#fff6d4',
    ink: '#5a4316',
  },
  hell: {
    name: 'Hell',
    nameVi: 'Địa ngục',
    description: 'Vực lửa còn đóng.',
    status: 'locked',
    catalog: 'expansion',
    motif: 'hell',
    sky: ['#6a1a16', '#1a0808'],
    ground: '#3a1214',
    accent: '#ffb089',
    ink: '#fff1e8',
  },
} as const satisfies Record<RegionId, RegionConfig>;

const REGION_ORDER = Object.keys(REGION_CATALOG) as RegionId[];

export const REGIONS: readonly RegionDefinition[] = REGION_ORDER.map((id) => ({
  id,
  ...REGION_CATALOG[id],
}));

export function getRegion(id: string | null | undefined): RegionDefinition | null {
  if (!id) return null;
  if (!isRegionId(id)) return null;
  return { id, ...REGION_CATALOG[id] };
}

export function listRegions(catalog: RegionCatalog): RegionDefinition[] {
  return REGIONS.filter((region) => region.catalog === catalog);
}

/** Road order for the ten starter towns. Locked expansions stay off this list. */
const STARTER_ORDER = [
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
] as const satisfies readonly RegionId[];

export function listStarterRegions(): RegionDefinition[] {
  return STARTER_ORDER.map((id) => ({ id, ...REGION_CATALOG[id] }));
}

export function isRegionPlayable(region: RegionDefinition | null): region is RegionDefinition {
  return region?.status === 'available';
}

function isRegionId(id: string): id is RegionId {
  return Object.prototype.hasOwnProperty.call(REGION_CATALOG, id);
}
