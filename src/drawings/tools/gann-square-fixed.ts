// ── Gann Square (Fixed 1:1 Aspect Ratio) ────────────────────────────────────
// Like gann-square but forces a pixel-perfect 1:1 square regardless of chart
// scale. The diagonal from p1 to p2 determines the size; the square is always
// equal width and height in pixels.

import { pointInRect } from '../primitives/hit-test';
import { font } from '../../core/font';
import { t } from '../../core/i18n';
import { drawDataLabel } from '../primitives/label';
import type { InternalDrawingTool } from '../engine';

export const gannSquareFixedTool: InternalDrawingTool = {
  name: 'gann-square-fixed',
  icon: 'M3,3 L21,3 L21,21 L3,21 Z M3,3 L21,21 M21,3 L3,21',
  pointCount: 2,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    // Force 1:1 pixel square
    const size = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
    const left = p1.x;
    const top = p1.y;
    const right = left + size * Math.sign(p2.x - p1.x || 1);
    const bottom = top + size * Math.sign(p2.y - p1.y || 1);

    const l = Math.min(left, right), r = Math.max(left, right);
    const tt = Math.min(top, bottom), b = Math.max(top, bottom);
    const cx = (l + r) / 2, cy = (tt + b) / 2;

    // Fill
    ctx.fillStyle = options.color + '06';
    ctx.fillRect(l, tt, r - l, b - tt);

    // Border
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.strokeRect(l, tt, r - l, b - tt);

    // Diagonals
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(l, tt); ctx.lineTo(r, b);
    ctx.moveTo(r, tt); ctx.lineTo(l, b);
    // Cross
    ctx.moveTo(cx, tt); ctx.lineTo(cx, b);
    ctx.moveTo(l, cy); ctx.lineTo(r, cy);
    // 45deg sub-diagonals
    ctx.moveTo(cx, tt); ctx.lineTo(r, cy);
    ctx.moveTo(r, cy); ctx.lineTo(cx, b);
    ctx.moveTo(cx, b); ctx.lineTo(l, cy);
    ctx.moveTo(l, cy); ctx.lineTo(cx, tt);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Angle labels
    ctx.font = font(9);
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1x1', (l + cx) / 2 - 6, (tt + cy) / 2 - 6);
    ctx.fillText('2x1', (cx + r) / 2, (tt + cy) / 2 - 6);
    ctx.fillText('1x2', (l + cx) / 2 - 6, (cy + b) / 2);

    // "Fixed 1:1" badge + data
    const data = (options as any)._rectData as { priceRange: number; bars: number } | undefined;
    if (data) {
      drawDataLabel(ctx, cx, b + 14, `${data.priceRange.toFixed(2)} | ${data.bars} ${t('bars')} | 1:1`, options.color);
    } else {
      drawDataLabel(ctx, cx, b + 14, `${size.toFixed(0)}px | 1:1`, options.color);
    }
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    return pointInRect(mouse, points[0]!, points[1]!, threshold);
  },

  getHandles(points) {
    if (points.length < 2) return [];
    return [points[0]!, points[1]!];
  },
};
