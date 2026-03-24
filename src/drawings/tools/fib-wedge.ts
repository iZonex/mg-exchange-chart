// ── Fib Wedge ───────────────────────────────────────────────────────────────
// 3-point: two rays from apex (p1) through p2 and p3, with Fib subdivision lines.

import { pointToSegmentDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

const FIB_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786];

export const fibWedgeTool: InternalDrawingTool = {
  name: 'fib-wedge',
  icon: 'M12,4 L2,20 M12,4 L22,20',
  pointCount: 3,

  render(ctx, points, options, _w, _h) {
    if (points.length < 3) return;
    const [apex, p2, p3] = [points[0]!, points[1]!, points[2]!];

    // Two main rays
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();

    // Fib subdivision rays between the two edges
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.3;
    ctx.font = font(9);
    ctx.textBaseline = 'middle';

    for (const level of FIB_LEVELS) {
      const mx = p2.x + (p3.x - p2.x) * level;
      const my = p2.y + (p3.y - p2.y) * level;

      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(apex.x, apex.y);
      ctx.lineTo(mx, my);
      ctx.stroke();

      ctx.fillStyle = options.color;
      ctx.textAlign = 'left';
      ctx.fillText(`${(level * 100).toFixed(1)}%`, mx + 4, my);
    }

    // Fill
    ctx.setLineDash([]);
    ctx.fillStyle = options.color + '08';
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 3) return false;
    return pointToSegmentDist(mouse, points[0]!, points[1]!) <= threshold ||
           pointToSegmentDist(mouse, points[0]!, points[2]!) <= threshold;
  },

  getHandles(points) { return points.slice(0, 3); },
};
