// ── Cyclic Lines ────────────────────────────────────────────────────────────
// 2-point: repeating vertical lines at equal intervals.
// The interval is defined by the distance between p1 and p2.

import type { InternalDrawingTool } from '../engine';
import { font } from '../../core/font';

export const cyclicLinesTool: InternalDrawingTool = {
  name: 'cyclic-lines',
  icon: 'M4,2 L4,22 M12,2 L12,22 M20,2 L20,22',
  pointCount: 2,

  render(ctx, points, options, width, height) {
    if (points.length < 2) return;
    const interval = Math.abs(points[1]!.x - points[0]!.x);
    if (interval < 2) return;
    const start = Math.min(points[0]!.x, points[1]!.x);

    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);

    // Render lines in both directions from start
    for (let x = start; x <= width + interval; x += interval) {
      ctx.globalAlpha = x === start ? 0.6 : 0.25;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, height);
      ctx.stroke();
    }
    for (let x = start - interval; x >= -interval; x -= interval) {
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, height);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Interval label
    const data = (options as any)._lineData as { bars: number } | undefined;
    const barLabel = data ? `${data.bars} bars` : `${interval.toFixed(0)}px`;
    ctx.font = font(10);
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`\u21D4 ${barLabel}`, (points[0]!.x + points[1]!.x) / 2, 4);
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const interval = Math.abs(points[1]!.x - points[0]!.x);
    if (interval < 2) return false;
    const start = Math.min(points[0]!.x, points[1]!.x);
    const offset = ((mouse.x - start) % interval + interval) % interval;
    return offset <= threshold || offset >= interval - threshold;
  },

  getHandles(points) { return points.slice(0, 2); },
};
