// ── Shared Label & Badge Rendering ──────────────────────────────────────────
// Reusable functions for drawing data labels on canvas.
// Used by all drawing tools that show calculations (angle, bars, price, %).

import { font } from '../../core/font';

/**
 * Draw a data label with dark semi-transparent background.
 * Centered at (x, y). Text color = `color`.
 */
export function drawDataLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  fontSize = 10,
): void {
  ctx.font = font(fontSize);
  const tw = ctx.measureText(text).width;
  const pad = 4;
  const h = fontSize + 4;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(x - tw / 2 - pad, y - h / 2, tw + pad * 2, h);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/**
 * Draw a colored badge (solid background + white text).
 * Left-aligned at (x, y). Used for entry/TP/SL/labels.
 */
export function drawBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  fontSize = 11,
): void {
  ctx.font = font(fontSize, 'bold');
  const tw = ctx.measureText(text).width + 10;
  const h = fontSize + 7;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.roundRect(x, y - h / 2, tw, h, 3);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 5, y);
}

/**
 * Draw a ratio label between two points (for harmonics, Elliott).
 * Offset to the right of the midpoint.
 */
export function drawRatioLabel(
  ctx: CanvasRenderingContext2D,
  ax: number, ay: number,
  bx: number, by: number,
  text: string,
  color: string,
): void {
  ctx.font = font(9);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, (ax + bx) / 2 + 10, (ay + by) / 2);
  ctx.globalAlpha = 1;
}

/**
 * Format a line data label: "angle° | N bars | +ΔPrice (+%)"
 */
export function formatLineLabel(data: { angle: number; bars: number; deltaPrice: number; pctChange: number }): string {
  const sign = data.deltaPrice >= 0 ? '+' : '';
  const angleDeg = -data.angle;
  return `${angleDeg.toFixed(1)}\u00B0 | ${data.bars} bars | ${sign}${data.deltaPrice.toFixed(2)} (${sign}${data.pctChange.toFixed(2)}%)`;
}
