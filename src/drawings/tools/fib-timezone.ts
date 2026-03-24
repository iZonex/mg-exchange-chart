// ── Fib Time Zone ───────────────────────────────────────────────────────────
// 2-point: vertical lines at Fibonacci time intervals from origin.
// Intervals: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89

import type { InternalDrawingTool } from '../engine';
import { font } from '../../core/font';

const FIB_SEQ = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

export const fibTimeZoneTool: InternalDrawingTool = {
  name: 'fib-timezone',
  icon: 'M4,2 L4,22 M10,2 L10,22 M18,2 L18,22',
  pointCount: 2,

  render(ctx, points, options, _w, height) {
    if (points.length < 2) return;
    const unitW = Math.abs(points[1]!.x - points[0]!.x);
    if (unitW === 0) return;
    const startX = points[0]!.x;

    ctx.font = font(9);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let cumulative = 0;
    for (let i = 0; i < FIB_SEQ.length; i++) {
      cumulative += FIB_SEQ[i]!;
      const x = Math.round(startX + unitW * cumulative) + 0.5;
      if (x < 0 || x > 3000) continue;

      ctx.strokeStyle = options.color;
      ctx.globalAlpha = i < 3 ? 0.6 : 0.3;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = options.color;
      ctx.fillText(`${cumulative}`, x, 4);
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const unitW = Math.abs(points[1]!.x - points[0]!.x);
    let cum = 0;
    for (const n of FIB_SEQ) {
      cum += n;
      if (Math.abs(mouse.x - (points[0]!.x + unitW * cum)) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) { return points.slice(0, 2); },
};
