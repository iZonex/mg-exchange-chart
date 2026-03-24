// ── Trend-Based Fibonacci Time Zones ────────────────────────────────────────
// 3 points: p1→p2 define a time move, p3 is the retracement endpoint.
// Draws vertical lines at Fibonacci time ratios projected from p3.

import type { InternalDrawingTool } from '../engine';
import { font } from '../../core/font';
import { t } from '../../core/i18n';
import { drawDataLabel } from '../primitives/label';

const FIB_TIME_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 1, 1.618, 2.618, 4.236];

export const trendFibTimeTool: InternalDrawingTool = {
  name: 'trend-fib-time',
  icon: 'M4,2 L4,22 M12,2 L12,22 M18,2 L18,22',
  pointCount: 3,

  render(ctx, points, options, _width, height) {
    if (points.length < 3) return;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];

    // Draw the move line (p1 → p2) and retracement (p2 → p3)
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Time span of the move (in pixels)
    const timeSpan = p2.x - p1.x;
    if (Math.abs(timeSpan) < 1) return;

    // Draw vertical lines at Fibonacci time ratios from p3
    ctx.font = font(10);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (const ratio of FIB_TIME_RATIOS) {
      const x = p3.x + timeSpan * ratio;
      const alpha = ratio === 1 || ratio === 1.618 ? 0.6 : 0.25;

      ctx.strokeStyle = options.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = ratio === 1 ? 1.5 : 1;
      ctx.setLineDash(ratio === 0 ? [] : [4, 3]);

      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, height);
      ctx.stroke();

      // Label at top
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.7;
      ctx.fillText(`${(ratio * 100).toFixed(1)}%`, x, 4);
    }

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Show time span data label
    const data = (options as any)._lineData as { bars: number } | undefined;
    const spanLabel = data ? `${data.bars} ${t('bars')}` : `${Math.abs(timeSpan).toFixed(0)}px`;
    drawDataLabel(ctx, (p1.x + p2.x) / 2, Math.min(p1.y, p2.y) - 16, spanLabel, options.color);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 3) return false;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];
    const timeSpan = p2.x - p1.x;
    if (Math.abs(timeSpan) < 1) return false;

    for (const ratio of FIB_TIME_RATIOS) {
      const x = p3.x + timeSpan * ratio;
      if (Math.abs(mouse.x - x) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
