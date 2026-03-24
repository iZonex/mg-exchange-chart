// ── Flag / Marker Tool ──────────────────────────────────────────────────────
// Single-click flag/pin marker at a price point.
// Useful for marking entries, exits, signals.

import { pointDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

export const flagMarkerTool: InternalDrawingTool = {
  name: 'flag-marker',
  icon: 'M4,2 L4,22 M4,2 L16,8 L4,14',
  pointCount: 1,

  render(ctx, points, options, _w, _h) {
    if (points.length < 1) return;
    const p = points[0]!;

    // Pole
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y + 40);
    ctx.stroke();

    // Flag
    ctx.fillStyle = options.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 18, p.y + 7);
    ctx.lineTo(p.x, p.y + 14);
    ctx.closePath();
    ctx.fill();

    // Label
    if (options.text) {
      ctx.fillStyle = '#ffffff';
      ctx.font = font(9);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.text, p.x + 4, p.y + 7);
    }

    // Pin dot
    ctx.fillStyle = options.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y + 40, 3, 0, Math.PI * 2);
    ctx.fill();
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 1) return false;
    const p = points[0]!;
    return pointDist(mouse, { x: p.x, y: p.y + 20 }) <= Math.max(threshold, 25);
  },

  getHandles(points) {
    return points.slice(0, 1);
  },
};
