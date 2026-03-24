// ── Cypher Harmonic Pattern ─────────────────────────────────────────────────
// 5-point harmonic: X→A→B→C→D with Cypher-specific ratios.
// B = 0.382-0.618 of XA, C = 1.272-1.414 of XA, D = 0.786 of XC.
// Shows ratios between legs and "Cypher" label if valid.

import { pointToSegmentDist, pointDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawRatioLabel } from '../primitives/label';
import { t } from '../../core/i18n';

export const cypherPatternTool: InternalDrawingTool = {
  name: 'cypher-pattern',
  icon: 'M2,16 L7,4 L11,12 L16,2 L22,14',
  pointCount: 5, // X, A, B, C, D

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;

    const labels = ['X', 'A', 'B', 'C', 'D'];

    // Draw legs
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Fill pattern area (if 4+ points)
    if (points.length >= 4) {
      ctx.fillStyle = options.color + '0A';
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i]!.x, points[i]!.y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Dashed reference lines X→B and A→C
    if (points.length >= 3) {
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      ctx.lineTo(points[2]!.x, points[2]!.y);
      ctx.stroke();
      if (points.length >= 4) {
        ctx.beginPath();
        ctx.moveTo(points[1]!.x, points[1]!.y);
        ctx.lineTo(points[3]!.x, points[3]!.y);
        ctx.stroke();
      }
      // Dashed X→C for Cypher D calculation
      if (points.length >= 5) {
        ctx.beginPath();
        ctx.moveTo(points[0]!.x, points[0]!.y);
        ctx.lineTo(points[3]!.x, points[3]!.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    // Point labels
    ctx.font = font(11, 'bold');
    ctx.textAlign = 'center';
    ctx.fillStyle = options.color;

    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      const above = i > 0 && p.y < points[i - 1]!.y;
      ctx.textBaseline = above ? 'bottom' : 'top';
      ctx.fillText(labels[i]!, p.x, p.y + (above ? -8 : 8));
    }

    // Ratio labels between legs
    ctx.font = font(9);
    ctx.textBaseline = 'middle';

    const legDist = (a: number, b: number) => Math.abs(points[b]!.y - points[a]!.y);

    if (points.length >= 3) {
      const xa = legDist(0, 1);
      const ab = legDist(1, 2);
      if (xa > 0) drawRatioLabel(ctx, points[1]!.x, points[1]!.y, points[2]!.x, points[2]!.y, (ab / xa).toFixed(3), options.color);
    }
    if (points.length >= 4) {
      const xa = legDist(0, 1);
      const xc = Math.abs(points[3]!.y - points[0]!.y);
      if (xa > 0) drawRatioLabel(ctx, points[2]!.x, points[2]!.y, points[3]!.x, points[3]!.y, (xc / xa).toFixed(3), options.color);
    }
    if (points.length >= 5) {
      const xc = Math.abs(points[3]!.y - points[0]!.y);
      const cd = legDist(3, 4);
      if (xc > 0) drawRatioLabel(ctx, points[3]!.x, points[3]!.y, points[4]!.x, points[4]!.y, (cd / xc).toFixed(3), options.color);

      // Cypher pattern validation
      const xa = legDist(0, 1);
      if (xa > 0) {
        const abXa = legDist(1, 2) / xa;
        const xcXa = Math.abs(points[3]!.y - points[0]!.y) / xa;
        const cdXc = xc > 0 ? cd / xc : 0;

        const isCypher =
          abXa >= 0.382 && abXa <= 0.618 &&
          xcXa >= 1.272 && xcXa <= 1.414 &&
          cdXc >= 0.72 && cdXc <= 0.85;

        if (isCypher) {
          const cx = (points[0]!.x + points[4]!.x) / 2;
          const cy = Math.min(points[0]!.y, points[1]!.y, points[2]!.y, points[3]!.y, points[4]!.y) - 16;
          const label = t('cypher');
          ctx.font = font(11, 'bold');
          ctx.globalAlpha = 0.9;
          const tw = ctx.measureText(label).width + 10;
          ctx.fillStyle = options.color + '30';
          ctx.fillRect(cx - tw / 2, cy - 8, tw, 16);
          ctx.fillStyle = options.color;
          ctx.textAlign = 'center';
          ctx.fillText(label, cx, cy);
          ctx.globalAlpha = 1;
        }
      }
    }
  },

  hitTest(mouse, points, threshold) {
    for (let i = 0; i < points.length - 1; i++) {
      if (pointToSegmentDist(mouse, points[i]!, points[i + 1]!) <= threshold) return true;
    }
    for (const p of points) {
      if (pointDist(mouse, p) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) {
    return [...points];
  },
};
