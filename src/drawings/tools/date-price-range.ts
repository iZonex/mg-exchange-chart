// ── Date and Price Range ────────────────────────────────────────────────────
// Two-point drawing showing a shaded rectangle with both price AND time
// measurements. Combines price-range and date-range into a single tool.
// Shows: price diff, %, bar count, and time duration.

import { pointToRectBorderDist, pointInRect } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';
import { t } from '../../core/i18n';

export const datePriceRangeTool: InternalDrawingTool = {
  name: 'date-price-range',
  icon: 'M3,3 L21,3 L21,21 L3,21 Z M3,12 L21,12 M12,3 L12,21',
  pointCount: 2,

  render(ctx, points, options, _width, _height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    const left = Math.min(p1.x, p2.x);
    const right = Math.max(p1.x, p2.x);
    const top = Math.min(p1.y, p2.y);
    const bottom = Math.max(p1.y, p2.y);
    const w = right - left;
    const h = bottom - top;

    // Shaded rectangle
    ctx.fillStyle = options.color + '15';
    ctx.fillRect(left, top, w, h);

    // Border
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.strokeRect(left, top, w, h);
    ctx.setLineDash([]);

    // Horizontal measurement line (price)
    ctx.strokeStyle = options.color;
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    // Vertical line on the right side (price measurement)
    const midX = left + w / 2;
    ctx.moveTo(right + 4, top);
    ctx.lineTo(right + 4, bottom);
    // Horizontal line on the bottom (time measurement)
    ctx.moveTo(left, bottom + 4);
    ctx.lineTo(right, bottom + 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Arrow caps on measurement lines
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.4;
    // Vertical arrows
    ctx.beginPath();
    ctx.moveTo(right + 4, top); ctx.lineTo(right + 1, top + 5); ctx.lineTo(right + 7, top + 5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(right + 4, bottom); ctx.lineTo(right + 1, bottom - 5); ctx.lineTo(right + 7, bottom - 5);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Data from injection
    const data = (options as any)._datePriceData as {
      deltaPrice: number; pctChange: number; bars: number; duration: string;
    } | undefined;

    if (data) {
      const sign = data.deltaPrice >= 0 ? '+' : '';
      const arrow = data.deltaPrice >= 0 ? '\u2191' : '\u2193';
      const label = `${arrow} ${Math.abs(data.deltaPrice).toFixed(2)} (${sign}${data.pctChange.toFixed(2)}%) | ${data.bars} ${t('bars')} | ${data.duration}`;
      drawDataLabel(ctx, midX, top - 12, label, options.color, 11);
    } else {
      // Fallback: pixel-based measurements
      const pxLabel = `${h.toFixed(0)}px \u00D7 ${w.toFixed(0)}px`;
      drawDataLabel(ctx, midX, top - 12, pxLabel, options.color);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const borderDist = pointToRectBorderDist(mouse, points[0]!, points[1]!);
    if (borderDist <= threshold) return true;
    return pointInRect(mouse, points[0]!, points[1]!, 0);
  },

  getHandles(points) {
    if (points.length < 2) return [];
    const [p1, p2] = [points[0]!, points[1]!];
    return [
      { x: p1.x, y: p1.y },
      { x: p2.x, y: p1.y },
      { x: p2.x, y: p2.y },
      { x: p1.x, y: p2.y },
    ];
  },
};
