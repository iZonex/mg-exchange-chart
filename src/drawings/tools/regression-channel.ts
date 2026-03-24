// ── Regression Channel ──────────────────────────────────────────────────────
// Two-point tool. The chart computes real linear regression from bar close prices
// in the selected range. Channel width = ±1 standard deviation of residuals.
// Shows: regression line, ±1σ channels, R², stddev.

import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';

interface RegrData {
  stddev: number;
  pctStddev: number;
  bars: number;
  r2: number;
  regrStartPrice: number;
  regrEndPrice: number;
}

export const regressionChannelTool: InternalDrawingTool = {
  name: 'regression-channel',
  icon: 'M2,18 L22,6 M2,14 L22,2 M2,22 L22,10',
  pointCount: 2,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];
    const regrData = (options as any)._regrData as RegrData | undefined;

    // If we have real regression data, use it to compute the line in pixel space.
    // The user's p1/p2 define the X range; the Y comes from regression.
    // Since the chart maps regrStartPrice/regrEndPrice to p1.y/p2.y respectively,
    // the pixel line is still p1→p2 but adjusted by the regression.

    // Main regression line
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const nx = -dy / len;
    const ny = dx / len;

    // Compute channel distance from stddev
    // stddev is in price units; we need to convert to pixels perpendicular to the line
    let channelDist = 30; // fallback
    if (regrData && regrData.stddev > 0 && regrData.regrStartPrice !== regrData.regrEndPrice) {
      // Price range of regression line in pixels = |p2.y - p1.y|
      const priceRange = Math.abs(regrData.regrEndPrice - regrData.regrStartPrice);
      const pxPerPrice = priceRange > 0 ? Math.abs(p2.y - p1.y) / priceRange : 1;
      channelDist = Math.max(8, regrData.stddev * pxPerPrice);
    } else if (regrData && regrData.stddev > 0) {
      // Flat regression — estimate from chart height
      channelDist = Math.max(8, Math.min(60, regrData.stddev * 2));
    }

    // ±1σ channels
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(p1.x + nx * channelDist, p1.y + ny * channelDist);
    ctx.lineTo(p2.x + nx * channelDist, p2.y + ny * channelDist);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p1.x - nx * channelDist, p1.y - ny * channelDist);
    ctx.lineTo(p2.x - nx * channelDist, p2.y - ny * channelDist);
    ctx.stroke();

    // ±2σ channels (lighter)
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(p1.x + nx * channelDist * 2, p1.y + ny * channelDist * 2);
    ctx.lineTo(p2.x + nx * channelDist * 2, p2.y + ny * channelDist * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p1.x - nx * channelDist * 2, p1.y - ny * channelDist * 2);
    ctx.lineTo(p2.x - nx * channelDist * 2, p2.y - ny * channelDist * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Fill ±1σ zone
    ctx.fillStyle = options.color + '0D';
    ctx.beginPath();
    ctx.moveTo(p1.x + nx * channelDist, p1.y + ny * channelDist);
    ctx.lineTo(p2.x + nx * channelDist, p2.y + ny * channelDist);
    ctx.lineTo(p2.x - nx * channelDist, p2.y - ny * channelDist);
    ctx.lineTo(p1.x - nx * channelDist, p1.y - ny * channelDist);
    ctx.closePath();
    ctx.fill();

    // Stats label
    if (regrData) {
      drawDataLabel(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - channelDist - 12,
        `R\u00B2=${regrData.r2.toFixed(3)} | \u03C3=${regrData.stddev.toFixed(2)} (${regrData.pctStddev.toFixed(2)}%) | ${regrData.bars} bars`, options.color);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    return pointToSegmentDist(mouse, points[0]!, points[1]!) <= threshold + 40;
  },

  getHandles(points) {
    return points.slice(0, 2);
  },
};
