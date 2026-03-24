// ── Fibonacci Extension ─────────────────────────────────────────────────────
// Three-point drawing: defines a move (p1→p2) and a retracement point (p3).
// Extension levels are projected from p3 using the p1→p2 range.

import { pointToHorizontalLineDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

const FIB_EXT_LEVELS = [0, 0.618, 1, 1.272, 1.618, 2, 2.618];

export const fibExtensionTool: InternalDrawingTool = {
  name: 'fib-extension',
  icon: 'M2,20 L12,4 L8,12 L22,2',
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

    // Extension levels: projected from p3
    const range = p2.y - p1.y; // pixel range of the move
    const levels = options.fibLevels ?? FIB_EXT_LEVELS;

    // Price data for showing actual prices at each level
    const fibData = (options as any)._fibPrices as { p1: number; p2: number; precision: number } | undefined;
    const priceRange = fibData ? fibData.p2 - fibData.p1 : 0;

    ctx.font = font(11);
    ctx.textBaseline = 'middle';

    for (const level of levels) {
      const y = p3.y - range * level;
      const alpha = level === 1 || level === 1.618 ? 0.6 : 0.3;

      // Zone fill between adjacent levels
      ctx.strokeStyle = options.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = level === 1 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(width, Math.round(y) + 0.5);
      ctx.stroke();

      // Label: percentage + price
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.85;
      if (fibData && priceRange !== 0) {
        // Extension price = p3_price + move * level
        // p3 price is the retracement point; we need it from injection
        // Since we don't have p3 price directly, compute from p1/p2 pixel mapping
        const p3Price = fibData.p1 + (fibData.p2 - fibData.p1) * ((p1.y - p3.y) / (p1.y - p2.y || 1));
        const extPrice = p3Price + priceRange * level;
        const prec = fibData.precision;
        ctx.textAlign = 'right';
        ctx.fillText(`${(level * 100).toFixed(1)}%  (${extPrice.toFixed(prec)})`, width - 8, y);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText(`${(level * 100).toFixed(1)}%`, width - 8, y);
      }
    }

    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 3) return false;
    const range = points[1]!.y - points[0]!.y;
    const levels = FIB_EXT_LEVELS;

    for (const level of levels) {
      const y = points[2]!.y - range * level;
      if (pointToHorizontalLineDist(mouse, y) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
