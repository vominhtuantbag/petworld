import type { Rect, Vec } from './types';

/** Shared 5000×5000 town collision from the red/green valley grid mask. */
export const TOWN_NAV_VERSION = 1;
export const TOWN_MAP_SIZE = 5000;

/** Solid red blocks in world pixels (5000×5000). Green paths are the complement. */
export const TOWN_GRID_BLOCKS: readonly Rect[] = [
  { x: 125, y: 150, w: 1100, h: 975 },
  { x: 3750, y: 150, w: 1125, h: 975 },
  { x: 2600, y: 150, w: 1025, h: 975 },
  { x: 1350, y: 150, w: 1150, h: 975 },
  { x: 3775, y: 1125, w: 1100, h: 25 },
  { x: 2625, y: 1125, w: 1000, h: 25 },
  { x: 150, y: 1125, w: 1050, h: 25 },
  { x: 1350, y: 1125, w: 1125, h: 25 },
  { x: 2625, y: 1250, w: 1000, h: 25 },
  { x: 2600, y: 1275, w: 1025, h: 675 },
  { x: 2625, y: 1950, w: 1000, h: 25 },
  { x: 1350, y: 1250, w: 1150, h: 725 },
  { x: 1350, y: 1975, w: 650, h: 500 },
  { x: 125, y: 1250, w: 1100, h: 1250 },
  { x: 3750, y: 1250, w: 1125, h: 1250 },
  { x: 1350, y: 2475, w: 625, h: 25 },
  { x: 3125, y: 1975, w: 500, h: 525 },
  { x: 1350, y: 2600, w: 625, h: 25 },
  { x: 3125, y: 2600, w: 500, h: 500 },
  { x: 1350, y: 2625, w: 650, h: 475 },
  { x: 2625, y: 3100, w: 1000, h: 25 },
  { x: 125, y: 2600, w: 1100, h: 1175 },
  { x: 3750, y: 2600, w: 1125, h: 1175 },
  { x: 2600, y: 3125, w: 1025, h: 650 },
  { x: 1350, y: 3100, w: 1150, h: 675 },
  { x: 3775, y: 3775, w: 1100, h: 25 },
  { x: 2625, y: 3775, w: 1000, h: 25 },
  { x: 150, y: 3775, w: 1050, h: 25 },
  { x: 1350, y: 3775, w: 1125, h: 25 },
  { x: 2625, y: 3900, w: 1000, h: 25 },
  { x: 125, y: 3900, w: 1100, h: 950 },
  { x: 3750, y: 3900, w: 1125, h: 950 },
  { x: 2600, y: 3925, w: 1025, h: 925 },
  { x: 1350, y: 3900, w: 1150, h: 950 },
  { x: 3775, y: 4850, w: 1100, h: 25 },
  { x: 2625, y: 4850, w: 1000, h: 25 },
  { x: 150, y: 4850, w: 1050, h: 25 },
  { x: 1350, y: 4850, w: 1125, h: 25 },
];

export function hitsTownGrid(x: number, y: number, radius = 0): boolean {
  for (const block of TOWN_GRID_BLOCKS) {
    if (x + radius > block.x && x - radius < block.x + block.w && y + radius > block.y && y - radius < block.y + block.h) {
      return true;
    }
  }
  return false;
}

export function isTownWalkable(x: number, y: number, radius = 14): boolean {
  if (x < 8 || y < 8 || x > TOWN_MAP_SIZE - 8 || y > TOWN_MAP_SIZE - 8) return false;
  return !hitsTownGrid(x, y, radius);
}

export function snapTownWalk(x: number, y: number, maxRadius = 400): Vec {
  if (isTownWalkable(x, y, 12)) return { x, y };
  for (let radius = 12; radius <= maxRadius; radius += 12) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      const nx = Math.round(x + Math.cos(angle) * radius);
      const ny = Math.round(y + Math.sin(angle) * radius);
      if (isTownWalkable(nx, ny, 12)) return { x: nx, y: ny };
    }
  }
  return { x, y };
}

export function resolveTownWalkTarget(x: number, y: number, maxRadius = 400): Vec | null {
  const snapped = snapTownWalk(x, y, maxRadius);
  if (!isTownWalkable(snapped.x, snapped.y, 12)) return null;
  return snapped;
}

const PATH_CELL = 50;

/** A* along green corridors on the shared town grid. */
export function findTownPath(from: Vec, to: Vec, maxNodes = 2500): Vec[] | null {
  const start = snapTownWalk(from.x, from.y, 200);
  const goal = snapTownWalk(to.x, to.y, 280);
  if (!isTownWalkable(start.x, start.y, 10) || !isTownWalkable(goal.x, goal.y, 10)) return null;
  const key = (x: number, y: number) => `${x}:${y}`;
  const startCell = { x: Math.round(start.x / PATH_CELL) * PATH_CELL, y: Math.round(start.y / PATH_CELL) * PATH_CELL };
  const goalCell = { x: Math.round(goal.x / PATH_CELL) * PATH_CELL, y: Math.round(goal.y / PATH_CELL) * PATH_CELL };
  type Node = { x: number; y: number; g: number; f: number; parent: string | null };
  const open: Node[] = [{ x: startCell.x, y: startCell.y, g: 0, f: Math.hypot(goalCell.x - startCell.x, goalCell.y - startCell.y), parent: null }];
  const best = new Map<string, Node>();
  best.set(key(startCell.x, startCell.y), open[0]);
  const dirs = [
    [PATH_CELL, 0], [-PATH_CELL, 0], [0, PATH_CELL], [0, -PATH_CELL],
    [PATH_CELL, PATH_CELL], [PATH_CELL, -PATH_CELL], [-PATH_CELL, PATH_CELL], [-PATH_CELL, -PATH_CELL],
  ] as const;
  let guard = 0;
  while (open.length > 0 && guard < maxNodes) {
    guard += 1;
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    if (Math.hypot(current.x - goalCell.x, current.y - goalCell.y) <= PATH_CELL) {
      const path: Vec[] = [{ x: goal.x, y: goal.y }];
      let cursor: Node | undefined = current;
      while (cursor) {
        path.push({ x: cursor.x, y: cursor.y });
        cursor = cursor.parent ? best.get(cursor.parent) : undefined;
      }
      path.reverse();
      return path;
    }
    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!isTownWalkable(nx, ny, 12)) continue;
      const step = Math.hypot(dx, dy);
      const g = current.g + step;
      const id = key(nx, ny);
      const prev = best.get(id);
      if (prev && prev.g <= g) continue;
      const node: Node = { x: nx, y: ny, g, f: g + Math.hypot(goalCell.x - nx, goalCell.y - ny), parent: key(current.x, current.y) };
      best.set(id, node);
      open.push(node);
    }
  }
  return null;
}
