// ── Arc Tool ────────────────────────────────────────────────────────────────
// 3-point: draws a circular arc passing through all three points.

import { pointDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';

export const arcTool: InternalDrawingTool = {
  name: 'arc',
  icon: 'M4,18 Q12,2 20,18',
  pointCount: 3,

  render(ctx, points, options) {
    if (points.length < 3) return;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;

    // Quadratic bezier: p1 start, p2 control, p3 end
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arc span label
    const span = Math.sqrt((p3.x - p1.x) ** 2 + (p3.y - p1.y) ** 2);
    const data = (options as any)._lineData as { bars: number; deltaPrice: number } | undefined;
    const mid = { x: (p1.x + 2 * p2.x + p3.x) / 4, y: (p1.y + 2 * p2.y + p3.y) / 4 };
    ctx.font = font(10);
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (data) {
      ctx.fillText(`${data.bars} bars | ${Math.abs(data.deltaPrice).toFixed(2)}`, mid.x, mid.y - 10);
    } else {
      ctx.fillText(`${span.toFixed(0)}px`, mid.x, mid.y - 10);
    }
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 3) return false;
    // Approximate: check distance to control points and midpoints
    for (const p of points) {
      if (pointDist(mouse, p) <= threshold * 2) return true;
    }
    const mid = {
      x: (points[0]!.x + 2 * points[1]!.x + points[2]!.x) / 4,
      y: (points[0]!.y + 2 * points[1]!.y + points[2]!.y) / 4,
    };
    return pointDist(mouse, mid) <= threshold * 2;
  },

  getHandles(points) { return points.slice(0, 3); },
};
