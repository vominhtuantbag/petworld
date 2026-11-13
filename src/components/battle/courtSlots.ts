/**
 * Landscape viewport grid for the battle arena.
 * 32 columns (1–32, 3.125% each) and 16 rows (A–P, 6.25% each): 1,024 cells.
 * A cell name such as "I4" is the center of that cell.
 * Edit BATTLE_GRID_POSITIONS to move a unit. SHOW_DEBUG_GRID draws A1–P32 on every screen.
 *
 * Default spawns are shared by PvE, PvP, Arena, and Raid.
 */
export const SHOW_DEBUG_GRID = true;

/**
 * Canonical spawn map (NV / P / Q).
 * NV1 = player hero, NV2 = opponent hero, P1–P5 = ally pets, Q1–Q5 = enemy units.
 */
export const BATTLE_GRID_POSITIONS = {
  /** NV1 — main player hero. */
  player: 'L3',
  /** NV2 — opponent / enemy hero (PvP, Arena). */
  enemyPlayer: 'L30',
  /** P1–P5 — player ally pets / summons (squad index 0–4). */
  pet1: 'N13',
  pet2: 'K13',
  pet3: 'G13',
  pet4: 'I10',
  pet5: 'M9',
  /** Q1–Q5 — enemy monsters / foe pets. */
  enemy1: 'N20',
  enemy2: 'K20',
  enemy3: 'G20',
  enemy4: 'I24',
  enemy5: 'M25',
} as const;

export type BattleSlot = keyof typeof BATTLE_GRID_POSITIONS;

/** Ally pet/summon cells in squad order (P1→P5). */
export const PLAYER_PET_CELLS = [
  BATTLE_GRID_POSITIONS.pet1,
  BATTLE_GRID_POSITIONS.pet2,
  BATTLE_GRID_POSITIONS.pet3,
  BATTLE_GRID_POSITIONS.pet4,
  BATTLE_GRID_POSITIONS.pet5,
] as const;

/** Enemy monster / foe-pet cells in slot order (Q1→Q5). */
export const ENEMY_UNIT_CELLS = [
  BATTLE_GRID_POSITIONS.enemy1,
  BATTLE_GRID_POSITIONS.enemy2,
  BATTLE_GRID_POSITIONS.enemy3,
  BATTLE_GRID_POSITIONS.enemy4,
  BATTLE_GRID_POSITIONS.enemy5,
] as const;

/** Raid party: first arriver at NV1, remaining heroes on P1–P4. */
export const RAID_PARTY_SPAWN_CELLS = [
  BATTLE_GRID_POSITIONS.player,
  BATTLE_GRID_POSITIONS.pet1,
  BATTLE_GRID_POSITIONS.pet2,
  BATTLE_GRID_POSITIONS.pet3,
  BATTLE_GRID_POSITIONS.pet4,
] as const;

/** Raid adds on Q1–Q2; boss anchors on Q5. */
export const RAID_ADD_SPAWN_CELLS = [BATTLE_GRID_POSITIONS.enemy1, BATTLE_GRID_POSITIONS.enemy2] as const;
export const RAID_BOSS_SPAWN_CELL = BATTLE_GRID_POSITIONS.enemy5;

export const GRID_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'] as const;
export const GRID_COLS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
] as const;

export type GridRow = (typeof GRID_ROWS)[number];
export type GridCol = (typeof GRID_COLS)[number];

/** Center of a cell, as a percentage of the landscape viewport. */
export function GET_CELL_POSITION(row: GridRow, col: GridCol): { left: number; top: number } {
  return {
    left: ((col - 0.5) / GRID_COLS.length) * 100,
    top: ((GRID_ROWS.indexOf(row) + 0.5) / GRID_ROWS.length) * 100,
  };
}

export function cellCenter(name: string): { left: number; top: number } {
  const match = /^([A-Pa-p])(3[0-2]|[12][0-9]|[1-9])$/.exec(name.trim());
  if (!match) {
    throw new Error(`Unknown battle cell "${name}". Use a name like I4.`);
  }
  return GET_CELL_POSITION(match[1].toUpperCase() as GridRow, Number(match[2]) as GridCol);
}

/**
 * Pixels to lower an overhead HUD so its top stays inside the stage.
 * `footY` and `body` are stage-local. Zero when the stack already fits.
 */
export function overheadDrop(footY: number, body: number, chrome = 44): number {
  const room = footY - body;
  if (room >= chrome + 2) return 0;
  return chrome + 2 - room;
}

/** Feet inside a stage, from a cell name. origin is the stage's top-left in viewport pixels. */
export function feetInView(cell: string, viewW: number, viewH: number, originX: number, originY: number) {
  const { left, top } = cellCenter(cell);
  return {
    x: (viewW * left) / 100 - originX,
    y: (viewH * top) / 100 - originY,
  };
}

/** Resolve a P-team cell by squad index (0-based). */
export function allySpawnCell(index: number): string {
  const safe = Math.max(0, Math.min(PLAYER_PET_CELLS.length - 1, index));
  return PLAYER_PET_CELLS[safe]!;
}

/** Resolve a Q-team cell by enemy slot index (0-based). */
export function enemySpawnCell(index: number): string {
  const safe = Math.max(0, Math.min(ENEMY_UNIT_CELLS.length - 1, index));
  return ENEMY_UNIT_CELLS[safe]!;
}
