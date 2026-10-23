/**
 * World coordinates.
 *
 * A hunting map is a grid of chunks. The sim only ticks chunks near the
 * player; the rest stay saved and frozen. Rendering uses the same idea:
 * the camera pans, and only props inside the viewport are mounted.
 *
 * The ten town maps are `MAP_SCALE` times a reference landscape viewport
 * on each axis, then snapped up to a whole number of chunks. That is the
 * long grind: about ten screens across and ten screens tall.
 *
 * Locked expansion provinces still use `SECTOR_COLS` / `SECTOR_ROWS` in
 * `atlas.ts`. Raising those adds sectors without a new screen.
 */

import { Platform } from 'react-native';

export const CHUNK_SIZE = 512;
export const SECTOR_CHUNKS = 4;
export const SECTOR_SIZE = CHUNK_SIZE * SECTOR_CHUNKS;

/** Logical landscape view the hunting maps are measured against. */
export const REFERENCE_VIEW_W = 844;
export const REFERENCE_VIEW_H = 390;
/** Each axis of a town hunting map, in viewports. */
export const MAP_SCALE = 10;

function snapToChunk(px: number): number {
  return Math.ceil(px / CHUNK_SIZE) * CHUNK_SIZE;
}

export const TIER_MAP_W = snapToChunk(REFERENCE_VIEW_W * MAP_SCALE);
export const TIER_MAP_H = snapToChunk(REFERENCE_VIEW_H * MAP_SCALE);
/** Chunks kept awake around the player. 1 => a 3×3 block. */
export const CHUNK_RADIUS = 1;

export type ChunkCoord = { cx: number; cy: number };

export function chunkCoord(x: number, y: number, chunkSize = CHUNK_SIZE): ChunkCoord {
  return { cx: Math.floor(x / chunkSize), cy: Math.floor(y / chunkSize) };
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx}:${cy}`;
}

export function chunksNear(x: number, y: number, width: number, height: number, chunkSize = CHUNK_SIZE): ChunkCoord[] {
  const center = chunkCoord(x, y, chunkSize);
  const maxCx = Math.ceil(width / chunkSize) - 1;
  const maxCy = Math.ceil(height / chunkSize) - 1;
  // Phones draw a wider hunting view, so one extra ring stays awake.
  // Web keeps the original 3×3 block.
  const radius = Platform.OS === 'web' ? CHUNK_RADIUS : CHUNK_RADIUS + 1;
  const found: ChunkCoord[] = [];
  for (let cy = center.cy - radius; cy <= center.cy + radius; cy += 1) {
    for (let cx = center.cx - radius; cx <= center.cx + radius; cx += 1) {
      if (cx < 0 || cy < 0 || cx > maxCx || cy > maxCy) continue;
      found.push({ cx, cy });
    }
  }
  return found;
}

/** Stable 0..1 stream so a chunk generates the same monsters until someone visits it. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
