// ── Gann Box ────────────────────────────────────────────────────────────────
// Two-point box divided into Gann grid: horizontal at price levels,
// vertical at time divisions, diagonal at 1x1 angle.

import { pointInRect } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

const DIVISIONS = [0, 0.25, 0.333, 0.5, 0.667, 0.75, 1];

export const gannBoxTool: InternalDrawingTool = {
  name: 'gann-box',
  icon: 'M3,3 L21,3 L21,21 L3,21 Z M3,12 L21,12 M12,3 L12,21 M3,21 L21,3',
  pointCount: 2,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    const left = Math.min(p1.x, p2.x);
    const right = Math.max(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const bottom = Math.max(p1.y, p2.y);
    const w = right - left;
    const h = bottom - top;

    // Box fill
    ctx.fillStyle = options.color + '08';
    ctx.fillRect(left, top, w, h);

    // Box border
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.strokeRect(left, top, w, h);

    // Horizontal divisions
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    for (const d of DIVISIONS) {
      if (d === 0 || d === 1) continue;
      const y = top + h * d;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();

      ctx.fillStyle = options.color;
      ctx.font = font(9);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${(d * 100).toFixed(1)}%`, right - 2, y);
    }

    // Vertical divisions
    for (const d of DIVISIONS) {
      if (d === 0 || d === 1) continue;
      const x = left + w * d;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    // Diagonals
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(right, top);
    ctx.moveTo(left, top);
    ctx.lineTo(right, bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    return pointInRect(mouse, points[0]!, points[1]!, threshold);
  },

  getHandles(points) {
    if (points.length < 2) return [];
    const [p1, p2] = [points[0]!, points[1]!];
    return [p1, { x: p2.x, y: p1.y }, p2, { x: p1.x, y: p2.y }];
  },
};
