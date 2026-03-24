// ── Three Drives Pattern ────────────────────────────────────────────────────
// 7-point pattern: drive1, correction1, drive2, correction2, drive3

import { pointToSegmentDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';

export const threeDrivesTool: InternalDrawingTool = {
  name: 'three-drives',
  icon: 'M2,18 L6,6 L10,14 L14,4 L18,12 L22,2',
  pointCount: 7,

  render(ctx, points, options) {
    if (points.length < 2) return;
    const labels = ['', 'D1', 'C1', 'D2', 'C2', 'D3', ''];

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.font = font(10, 'bold');
    ctx.textAlign = 'center';
    ctx.fillStyle = options.color;
    for (let i = 0; i < points.length && i < labels.length; i++) {
      if (!labels[i]) continue;
      const p = points[i]!;
      const isTop = i > 0 ? p.y < points[i - 1]!.y : true;
      ctx.textBaseline = isTop ? 'bottom' : 'top';
      ctx.fillText(labels[i]!, p.x, p.y + (isTop ? -8 : 8));
    }

    // Dashed lines connecting drives
    if (points.length >= 6) {
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(points[1]!.x, points[1]!.y);
      ctx.lineTo(points[3]!.x, points[3]!.y);
      ctx.lineTo(points[5]!.x, points[5]!.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Ratios between drives and corrections
    ctx.font = font(9);
    ctx.textAlign = 'left';
    ctx.fillStyle = options.color;

    // Drive ratios: D2/D1, D3/D2
    if (points.length >= 4) {
      const d1 = Math.abs(points[1]!.y - points[0]!.y);
      const d2 = Math.abs(points[3]!.y - points[2]!.y);
      if (d1 > 0) {
        ctx.globalAlpha = 0.7;
        const mx = (points[2]!.x + points[3]!.x) / 2 + 10;
        const my = (points[2]!.y + points[3]!.y) / 2;
        ctx.fillText(`D2/D1: ${(d2 / d1).toFixed(3)}`, mx, my);
      }
    }
    if (points.length >= 6) {
      const d2 = Math.abs(points[3]!.y - points[2]!.y);
      const d3 = Math.abs(points[5]!.y - points[4]!.y);
      if (d2 > 0) {
        ctx.globalAlpha = 0.7;
        const mx = (points[4]!.x + points[5]!.x) / 2 + 10;
        const my = (points[4]!.y + points[5]!.y) / 2;
        ctx.fillText(`D3/D2: ${(d3 / d2).toFixed(3)}`, mx, my);
      }
    }
    // Correction ratios: C1/D1, C2/D2
    if (points.length >= 3) {
      const d1 = Math.abs(points[1]!.y - points[0]!.y);
      const c1 = Math.abs(points[2]!.y - points[1]!.y);
      if (d1 > 0) {
        ctx.globalAlpha = 0.5;
        const mx = (points[1]!.x + points[2]!.x) / 2 + 10;
        const my = (points[1]!.y + points[2]!.y) / 2;
        ctx.fillText(`C1/D1: ${(c1 / d1).toFixed(3)}`, mx, my);
      }
    }
    if (points.length >= 5) {
      const d2 = Math.abs(points[3]!.y - points[2]!.y);
      const c2 = Math.abs(points[4]!.y - points[3]!.y);
      if (d2 > 0) {
        ctx.globalAlpha = 0.5;
        const mx = (points[3]!.x + points[4]!.x) / 2 + 10;
        const my = (points[3]!.y + points[4]!.y) / 2;
        ctx.fillText(`C2/D2: ${(c2 / d2).toFixed(3)}`, mx, my);
      }
    }
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    for (let i = 0; i < points.length - 1; i++) {
      if (pointToSegmentDist(mouse, points[i]!, points[i + 1]!) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) { return [...points]; },
};
