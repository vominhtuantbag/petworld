/**
 * Landscape viewport grid for the battle arena.
 * 32 columns (1–32, 3.125% each) and 16 rows (A–P, 6.25% each): 1,024 cells.
 * A cell name such as "I4" is the center of that cell.
 * Edit BATTLE_GRID_POSITIONS to move a unit. SHOW_DEBUG_GRID draws A1–P32 on every screen.
 */
export const SHOW_DEBUG_GRID = true;

export const BATTLE_GRID_POSITIONS = {
  /** Lãng khách. */
  player: 'L3',
  /** Pets on the player team. Squad index 0, 1, 2. */
  pet1: 'L15',
  pet2: 'K9',
  pet3: 'G9',
  /** Monsters / Quái on the enemy team. Slots 1–3. */
  enemy1: 'I24',
  enemy2: 'E24',
  enemy3: 'D19',
  /** Six-boar pack on the right half. */
  boar1: 'E19',
  boar2: 'D23',
  boar3: 'E27',
  boar4: 'I19',
  boar5: 'H23',
  boar6: 'I27',
  /** PvP opponent. The field fight does not use this cell. */
  enemyPlayer: 'E30',
} as const;

export type BattleSlot = keyof typeof BATTLE_GRID_POSITIONS;

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
