// ── Fibonacci Circles ───────────────────────────────────────────────────────
// 2-point tool: center (p1) and radius point (p2).
// Draws concentric circles at Fibonacci ratios of the radius.

import { pointDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

const FIB_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618];

export const fibCirclesTool: InternalDrawingTool = {
  name: 'fib-circles',
  icon: 'M12,12 m-9,0 a9,9 0 1,1 18,0 a9,9 0 1,1 -18,0',
  pointCount: 2,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const [center, edge] = [points[0]!, points[1]!];
    const baseRadius = pointDist(center, edge);

    ctx.font = font(9);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    for (const ratio of FIB_RATIOS) {
      const r = baseRadius * ratio;
      const alpha = ratio === 1 ? 0.6 : 0.3;

      ctx.strokeStyle = options.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = ratio === 1 ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Label
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.5;
      ctx.fillText(`${(ratio * 100).toFixed(1)}%`, center.x + r + 2, center.y - 2);
    }

    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const center = points[0]!;
    const baseRadius = pointDist(center, points[1]!);
    const dist = pointDist(mouse, center);

    for (const ratio of FIB_RATIOS) {
      if (Math.abs(dist - baseRadius * ratio) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) {
    return points.slice(0, 2);
  },
};
