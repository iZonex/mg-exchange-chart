// ── Handle ──────────────────────────────────────────────────────────────────
// Draggable handles for editing drawing endpoints.

import type { PixelPoint } from './hit-test';
import { pointDist } from './hit-test';

export const HANDLE_RADIUS = 5;
export const HANDLE_HIT_RADIUS = 10; // larger than visual for easier clicking

/** Render a circular handle at a pixel position */
export function renderHandle(
  ctx: CanvasRenderingContext2D,
  pos: PixelPoint,
  color: string,
  active = false,
): void {
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = active ? '#ffffff' : color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Check if a mouse position hits a handle */
export function hitTestHandle(mouse: PixelPoint, handlePos: PixelPoint): boolean {
  return pointDist(mouse, handlePos) <= HANDLE_HIT_RADIUS;
}
