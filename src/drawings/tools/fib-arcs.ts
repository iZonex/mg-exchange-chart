// ── Fib Speed Resistance Arcs ───────────────────────────────────────────────
// 2-point: arcs at Fibonacci ratios centered on p1 with radius to p2.

import { pointDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

const RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786, 1];

export const fibArcsTool: InternalDrawingTool = {
  name: 'fib-arcs',
  icon: 'M4,20 A16,16 0 0,1 20,4',
  pointCount: 2,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];
    const baseR = pointDist(p1, p2);
    const startAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    ctx.font = font(9);
    ctx.textAlign = 'left';

    for (const ratio of RATIOS) {
      const r = baseR * ratio;
      ctx.strokeStyle = options.color;
      ctx.globalAlpha = ratio === 1 ? 0.6 : 0.3;
      ctx.lineWidth = ratio === 1 ? 1.5 : 0.8;

      ctx.beginPath();
      ctx.arc(p1.x, p1.y, r, startAngle - Math.PI / 2, startAngle + Math.PI / 2);
      ctx.stroke();

      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.5;
      ctx.textBaseline = 'middle';
      ctx.fillText(`${(ratio * 100).toFixed(1)}%`, p1.x + r + 2, p1.y);
    }
    ctx.globalAlpha = 1;

    // Base line
    ctx.strokeStyle = options.color;
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const baseR = pointDist(points[0]!, points[1]!);
    const dist = pointDist(mouse, points[0]!);
    for (const ratio of RATIOS) {
      if (Math.abs(dist - baseR * ratio) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) { return points.slice(0, 2); },
};
