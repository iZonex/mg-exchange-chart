// ── Gann Square ─────────────────────────────────────────────────────────────
// 2-point square with diagonal and cross grid at Gann angles.

import { pointInRect } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

export const gannSquareTool: InternalDrawingTool = {
  name: 'gann-square',
  icon: 'M3,3 L21,3 L21,21 L3,21 Z M3,3 L21,21 M21,3 L3,21 M12,3 L12,21 M3,12 L21,12',
  pointCount: 2,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    // Force square: use max of width/height
    const size = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
    const left = p1.x;
    const top = p1.y;
    const right = left + size * Math.sign(p2.x - p1.x || 1);
    const bottom = top + size * Math.sign(p2.y - p1.y || 1);

    const l = Math.min(left, right), r = Math.max(left, right);
    const t = Math.min(top, bottom), b = Math.max(top, bottom);
    const cx = (l + r) / 2, cy = (t + b) / 2;

    // Fill
    ctx.fillStyle = options.color + '06';
    ctx.fillRect(l, t, r - l, b - t);

    // Border
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.strokeRect(l, t, r - l, b - t);

    // Diagonals
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(l, t); ctx.lineTo(r, b);
    ctx.moveTo(r, t); ctx.lineTo(l, b);
    // Cross
    ctx.moveTo(cx, t); ctx.lineTo(cx, b);
    ctx.moveTo(l, cy); ctx.lineTo(r, cy);
    // 45deg sub-diagonals
    ctx.moveTo(cx, t); ctx.lineTo(r, cy);
    ctx.moveTo(r, cy); ctx.lineTo(cx, b);
    ctx.moveTo(cx, b); ctx.lineTo(l, cy);
    ctx.moveTo(l, cy); ctx.lineTo(cx, t);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Angle labels at diagonals
    ctx.font = font(9);
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.6;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1x1', (l + cx) / 2 - 6, (t + cy) / 2 - 6);
    ctx.fillText('2x1', (cx + r) / 2, (t + cy) / 2 - 6);
    ctx.fillText('1x2', (l + cx) / 2 - 6, (cy + b) / 2);

    // Price/time labels at corners
    const data = (options as any)._rectData as { priceRange: number; bars: number } | undefined;
    if (data) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${data.priceRange.toFixed(2)} | ${data.bars} bars`, l + 4, b + 4);
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
