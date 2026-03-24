// ── Fib Speed Resistance Fan ────────────────────────────────────────────────
// 2-point: rays from p1 at Fibonacci ratios between horizontal and the p1→p2 line.

import { pointToLineDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

const RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786, 1];

export const fibSpeedFanTool: InternalDrawingTool = {
  name: 'fib-speed-fan',
  icon: 'M4,20 L20,4 M4,20 L20,10 M4,20 L20,16',
  pointCount: 2,

  render(ctx, points, options, width, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    ctx.font = font(9);
    ctx.textBaseline = 'middle';

    for (const ratio of RATIOS) {
      const endX = p1.x + dx * 3;
      const endY = p1.y + dy * ratio * 3;

      ctx.strokeStyle = options.color;
      ctx.globalAlpha = ratio === 1 ? 0.6 : 0.3;
      ctx.lineWidth = ratio === 1 ? 1.5 : 0.8;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.fillStyle = options.color;
      ctx.textAlign = 'left';
      const lx = Math.min(p1.x + dx * 2, width - 40);
      const ly = p1.y + dy * ratio * 2;
      ctx.fillText(`${(ratio * 100).toFixed(1)}%`, lx + 4, ly);
    }
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    for (const ratio of RATIOS) {
      const endX = points[0]!.x + (points[1]!.x - points[0]!.x) * 3;
      const endY = points[0]!.y + (points[1]!.y - points[0]!.y) * ratio * 3;
      if (pointToLineDist(mouse, points[0]!, { x: endX, y: endY }) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) { return points.slice(0, 2); },
};
