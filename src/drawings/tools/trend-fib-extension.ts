// ── Trend-Based Fibonacci Extension ─────────────────────────────────────────
// 3 points: p1→p2 define the trend move, p3 is the retracement endpoint.
// Unlike regular fib-extension (vertical-only), this projects levels along
// the trend direction from p3. Shows prices at each level.

import { pointToHorizontalLineDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

const TREND_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 1, 1.272, 1.618, 2, 2.618];

export const trendFibExtensionTool: InternalDrawingTool = {
  name: 'trend-fib-extension',
  icon: 'M2,20 L10,4 L8,12 L22,2',
  pointCount: 3,

  render(ctx, points, options, width, _height) {
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

    // Trend direction vector (p1 → p2)
    const trendDx = p2.x - p1.x;
    const trendDy = p2.y - p1.y;
    const trendLen = Math.sqrt(trendDx * trendDx + trendDy * trendDy);
    if (trendLen === 0) return;

    // Extension levels projected from p3 along the trend direction
    const levels = options.fibLevels ?? TREND_FIB_LEVELS;

    // Price data for showing actual prices at each level
    const fibData = (options as any)._fibPrices as { p1: number; p2: number; precision: number } | undefined;
    const priceRange = fibData ? fibData.p2 - fibData.p1 : 0;

    ctx.font = font(11);
    ctx.textBaseline = 'middle';

    for (const level of levels) {
      // Project along trend from p3
      const lx = p3.x + trendDx * level;
      const ly = p3.y + trendDy * level;

      // Draw horizontal level line at this Y
      const alpha = level === 1 || level === 1.618 ? 0.6 : 0.3;
      ctx.strokeStyle = options.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = level === 1 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(ly) + 0.5);
      ctx.lineTo(width, Math.round(ly) + 0.5);
      ctx.stroke();

      // Small dot at the trend-projected point
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label: percentage + price
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.85;
      if (fibData && priceRange !== 0) {
        const p3Price = fibData.p1 + (fibData.p2 - fibData.p1) * ((p1.y - p3.y) / (p1.y - p2.y || 1));
        const extPrice = p3Price + priceRange * level;
        const prec = fibData.precision;
        ctx.textAlign = 'right';
        ctx.fillText(`${(level * 100).toFixed(1)}%  (${extPrice.toFixed(prec)})`, width - 8, ly);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(`${(level * 100).toFixed(1)}%`, width - 8, ly);
      }
    }

    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 3) return false;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];
    const trendDy = p2.y - p1.y;
    const levels = TREND_FIB_LEVELS;

    for (const level of levels) {
      const ly = p3.y + trendDy * level;
      if (pointToHorizontalLineDist(mouse, ly) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
