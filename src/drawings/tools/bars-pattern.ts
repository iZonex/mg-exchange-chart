// ── Bars Pattern (Ghost Feed) ───────────────────────────────────────────────
// Copies a range of bars (p1→p2) and overlays them as semi-transparent
// "ghost" candles at a future position (p3). The chart must inject
// _ghostBars data via the drawing-data-injector.
// 3 points: start of source range, end of source range, placement point.

import { pointInRect, pointToSegmentDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import { t } from '../../core/i18n';
import { drawDataLabel } from '../primitives/label';
import type { InternalDrawingTool } from '../engine';

interface GhostBar {
  x: number;
  open: number;
  high: number;
  low: number;
  close: number;
  width: number;
}

export const barsPatternTool: InternalDrawingTool = {
  name: 'bars-pattern',
  icon: 'M4,8 L4,16 M8,6 L8,18 M12,10 L12,14 M18,8 L18,16 M22,6 L22,18',
  pointCount: 3,

  render(ctx, points, options, _width, _height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    // Draw source range highlight
    ctx.fillStyle = options.color + '0C';
    const srcLeft = Math.min(p1.x, p2.x);
    const srcRight = Math.max(p1.x, p2.x);
    const srcTop = Math.min(p1.y, p2.y);
    const srcBottom = Math.max(p1.y, p2.y);
    ctx.fillRect(srcLeft, srcTop, srcRight - srcLeft, srcBottom - srcTop);

    // Source range border
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(srcLeft, srcTop, srcRight - srcLeft, srcBottom - srcTop);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    if (points.length < 3) return;
    const p3 = points[2]!;

    // Draw arrow from source to placement
    ctx.strokeStyle = options.color;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Render ghost bars (injected by drawing-data-injector)
    const ghostBars = (options as any)._ghostBars as GhostBar[] | undefined;
    if (ghostBars && ghostBars.length > 0) {
      ctx.globalAlpha = 0.35;

      for (const bar of ghostBars) {
        const bullish = bar.close >= bar.open;
        const bodyTop = Math.min(bar.open, bar.close);
        const bodyBottom = Math.max(bar.open, bar.close);
        const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

        // Wick
        ctx.strokeStyle = bullish ? '#26a69a' : '#ef5350';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bar.x + bar.width / 2, bar.high);
        ctx.lineTo(bar.x + bar.width / 2, bar.low);
        ctx.stroke();

        // Body
        ctx.fillStyle = bullish ? '#26a69a' : '#ef5350';
        ctx.fillRect(bar.x, bodyTop, bar.width, bodyHeight);
      }

      ctx.globalAlpha = 1;

      // Ghost label
      drawDataLabel(ctx, p3.x, p3.y - 16, `${t('ghostBars')} (${ghostBars.length})`, options.color);
    } else {
      // No ghost data yet — show placeholder label
      ctx.font = font(10);
      drawDataLabel(ctx, p3.x, p3.y - 16, t('ghostBars'), options.color);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const [p1, p2] = [points[0]!, points[1]!];

    // Hit source range rectangle
    if (pointInRect(mouse, p1, p2, threshold)) return true;

    // Hit connection line to p3
    if (points.length >= 3) {
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      if (pointToSegmentDist(mouse, mid, points[2]!) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
