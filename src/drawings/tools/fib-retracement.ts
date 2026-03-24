// ── Fibonacci Retracement ───────────────────────────────────────────────────
// Two-point drawing: defines a price range, shows horizontal lines at
// standard Fibonacci retracement levels.

import { pointToHorizontalLineDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

const DEFAULT_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export const fibRetracementTool: InternalDrawingTool = {
  name: 'fib-retracement',
  icon: 'M2,4 L22,4 M2,9 L22,9 M2,14 L22,14 M2,20 L22,20',
  pointCount: 2,

  render(ctx, points, options, width, _height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];
    const levels = options.fibLevels ?? DEFAULT_FIB_LEVELS;
    const priceRange = p2.y - p1.y; // in pixels

    ctx.font = font(11);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (const level of levels) {
      const y = p1.y + priceRange * level;
      const alpha = level === 0 || level === 1 ? 0.6 : 0.35;

      // Line
      ctx.strokeStyle = options.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = level === 0 || level === 0.5 || level === 1 ? 1.5 : 1;
      ctx.setLineDash(level === 0.5 ? [4, 4] : []);
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(width, Math.round(y) + 0.5);
      ctx.stroke();

      // Fill between levels
      ctx.globalAlpha = 1;

      // Label: percentage + actual price if available
      const fibPrices = (options as any)._fibPrices as { p1: number; p2: number; precision: number } | undefined;
      let labelText = `${(level * 100).toFixed(1)}%`;
      if (fibPrices) {
        const priceAtLevel = fibPrices.p1 + (fibPrices.p2 - fibPrices.p1) * level;
        labelText += `  (${priceAtLevel.toFixed(fibPrices.precision)})`;
      }
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.8;
      ctx.fillText(labelText, width - 8, y);
      ctx.globalAlpha = 1;
    }

    // Fill zones between levels
    for (let i = 0; i < levels.length - 1; i++) {
      const y1 = p1.y + priceRange * levels[i]!;
      const y2 = p1.y + priceRange * levels[i + 1]!;
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.03 + i * 0.01;
      ctx.fillRect(0, y1, width, y2 - y1);
    }
    ctx.globalAlpha = 1;

    ctx.setLineDash([]);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const [p1, p2] = [points[0]!, points[1]!];
    const levels = DEFAULT_FIB_LEVELS;
    const priceRange = p2.y - p1.y;

    // Hit if near any fib level line
    for (const level of levels) {
      const y = p1.y + priceRange * level;
      if (pointToHorizontalLineDist(mouse, y) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) {
    if (points.length < 2) return [];
    return [points[0]!, points[1]!];
  },
};

export { DEFAULT_FIB_LEVELS };
