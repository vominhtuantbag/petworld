import type { Rect, Sensor } from './types';

/** On-map character height in FieldView. The portal stands 150px above that. */
export const PLAYER_DRAW_H = 109;
export const PORTAL_H = PLAYER_DRAW_H + 150;
const ART_W = 224;
const ART_H = 260;
export const PORTAL_W = PORTAL_H * (ART_W / ART_H);

const TRIGGER_W = 78;
const TRIGGER_H = 52;

export type PortalLayout = {
  id: string;
  left: number;
  top: number;
  imgW: number;
  imgH: number;
  sortY: number;
  bounds: Rect;
  trigger: Rect;
};

/**
 * Upright gate. The new arch art already faces the path downward, so every
 * transition uses the same box centered on its sensor.
 */
export function portalLayout(sensor: Sensor): PortalLayout {
  const imgW = PORTAL_W;
  const imgH = PORTAL_H;
  const left = sensor.x - imgW / 2;
  const top = sensor.y - imgH;
  return {
    id: sensor.id,
    left,
    top,
    imgW,
    imgH,
    sortY: sensor.y,
    bounds: { x: left, y: top, w: imgW, h: imgH },
    trigger: {
      x: sensor.x - TRIGGER_W / 2,
      y: sensor.y - TRIGGER_H / 2,
      w: TRIGGER_W,
      h: TRIGGER_H,
    },
  };
}

export function playerAtPortal(x: number, y: number, r: number, box: Rect): boolean {
  const nearestX = Math.max(box.x, Math.min(box.x + box.w, x));
  const nearestY = Math.max(box.y, Math.min(box.y + box.h, y));
  return Math.hypot(x - nearestX, y - nearestY) <= r;
}
