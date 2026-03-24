// ── ABCD Pattern ────────────────────────────────────────────────────────────
// 4-point harmonic pattern: A→B→C→D with ratio labels.

import { pointToSegmentDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';

export const abcdPatternTool: InternalDrawingTool = {
  name: 'abcd-pattern',
  icon: 'M4,16 L10,4 L16,12 L22,2',
  pointCount: 4,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const labels = ['A', 'B', 'C', 'D'];

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dashed A→C line
    if (points.length >= 3) {
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      ctx.lineTo(points[2]!.x, points[2]!.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Fill
    if (points.length >= 4) {
      ctx.fillStyle = options.color + '0A';
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < 4; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
      ctx.closePath();
      ctx.fill();
    }

    // Labels + ratios
    ctx.font = font(12, 'bold');
    ctx.textAlign = 'center';
    ctx.fillStyle = options.color;
    for (let i = 0; i < points.length && i < 4; i++) {
      const p = points[i]!;
      const isTop = i > 0 ? p.y < points[i - 1]!.y : true;
      ctx.textBaseline = isTop ? 'bottom' : 'top';
      ctx.fillText(labels[i]!, p.x, p.y + (isTop ? -8 : 8));
    }

    // Ratios
    ctx.font = font(9);
    ctx.textAlign = 'left';

    if (points.length >= 3) {
      const ab = Math.abs(points[1]!.y - points[0]!.y);
      const bc = Math.abs(points[2]!.y - points[1]!.y);
      if (ab > 0) {
        const ratio = (bc / ab).toFixed(3);
        const mx = (points[1]!.x + points[2]!.x) / 2 + 10;
        const my = (points[1]!.y + points[2]!.y) / 2;
        ctx.fillStyle = options.color;
        ctx.globalAlpha = 0.7;
        ctx.fillText(`BC/AB: ${ratio}`, mx, my);
        ctx.globalAlpha = 1;
      }
    }

    if (points.length >= 4) {
      const ab = Math.abs(points[1]!.y - points[0]!.y);
      const cd = Math.abs(points[3]!.y - points[2]!.y);
      if (ab > 0) {
        const cdAb = cd / ab;
        const ratio = cdAb.toFixed(3);
        const mx = (points[2]!.x + points[3]!.x) / 2 + 10;
        const my = (points[2]!.y + points[3]!.y) / 2;
        // Validate: ideal ABCD is 0.618–1.272
        const valid = cdAb >= 0.618 && cdAb <= 1.272;
        ctx.fillStyle = valid ? '#0ecb81' : '#f6465d';
        ctx.globalAlpha = 0.8;
        ctx.fillText(`CD/AB: ${ratio}${valid ? ' \u2713' : ''}`, mx, my);
        ctx.globalAlpha = 1;
      }
    }
  },

  hitTest(mouse, points, threshold) {
    for (let i = 0; i < points.length - 1; i++) {
      if (pointToSegmentDist(mouse, points[i]!, points[i + 1]!) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) { return [...points]; },
};
