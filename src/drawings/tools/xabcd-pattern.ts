// ── XABCD Harmonic Pattern ──────────────────────────────────────────────────
// 5-point harmonic pattern: X→A→B→C→D with ratio labels between legs.
// Common patterns: Gartley (0.618), Butterfly (0.786), Bat (0.886), Crab (1.618).

import { pointToSegmentDist, pointDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawRatioLabel } from '../primitives/label';
import { t } from '../../core/i18n';

export const xabcdPatternTool: InternalDrawingTool = {
  name: 'xabcd-pattern',
  icon: 'M2,18 L6,4 L12,14 L16,6 L22,16',
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

    // Dashed lines X→B and A→C (retracement references)
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
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    // Point labels and ratio labels
    ctx.font = font(11, 'bold');
    ctx.textAlign = 'center';
    ctx.fillStyle = options.color;

    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      const above = i > 0 && p.y < points[i - 1]!.y;
      ctx.textBaseline = above ? 'bottom' : 'top';
      ctx.fillText(labels[i]!, p.x, p.y + (above ? -8 : 8));
    }

    // Ratio labels between ALL legs
    ctx.font = font(9);
    ctx.textBaseline = 'middle';

    const legDist = (a: number, b: number) => Math.abs(points[b]!.y - points[a]!.y);

    if (points.length >= 3) {
      const xa = legDist(0, 1);
      const ab = legDist(1, 2);
      if (xa > 0) drawRatioLabel(ctx, points[1]!.x, points[1]!.y, points[2]!.x, points[2]!.y, (ab / xa).toFixed(3), options.color);
    }
    if (points.length >= 4) {
      const ab = legDist(1, 2);
      const bc = legDist(2, 3);
      if (ab > 0) drawRatioLabel(ctx, points[2]!.x, points[2]!.y, points[3]!.x, points[3]!.y, (bc / ab).toFixed(3), options.color);
    }
    if (points.length >= 5) {
      const bc = legDist(2, 3);
      const cd = legDist(3, 4);
      const xa = legDist(0, 1);
      const ad = Math.abs(points[4]!.y - points[0]!.y);
      if (bc > 0) drawRatioLabel(ctx, points[3]!.x, points[3]!.y, points[4]!.x, points[4]!.y, (cd / bc).toFixed(3), options.color);

      // Pattern type detection based on XA:AD ratio
      if (xa > 0) {
        const xaAd = ad / xa;
        const abXa = legDist(1, 2) / xa;
        let patternType = '';
        if (abXa >= 0.55 && abXa <= 0.68 && xaAd >= 0.72 && xaAd <= 0.82) patternType = t('gartley');
        else if (abXa >= 0.72 && abXa <= 0.82 && xaAd >= 1.2 && xaAd <= 1.7) patternType = t('butterfly');
        else if (abXa >= 0.35 && abXa <= 0.55 && xaAd >= 0.82 && xaAd <= 0.92) patternType = t('bat');
        else if (abXa >= 0.35 && abXa <= 0.68 && xaAd >= 1.5 && xaAd <= 1.7) patternType = t('crab');
        else if (abXa >= 0.82 && abXa <= 0.92 && xaAd >= 1.1 && xaAd <= 1.35) patternType = t('deepCrab');

        if (patternType) {
          const cx = (points[0]!.x + points[4]!.x) / 2;
          const cy = Math.min(points[0]!.y, points[1]!.y, points[2]!.y, points[3]!.y, points[4]!.y) - 16;
          ctx.font = font(11, 'bold');
          ctx.globalAlpha = 0.9;
          const tw = ctx.measureText(patternType).width + 10;
          ctx.fillStyle = options.color + '30';
          ctx.fillRect(cx - tw / 2, cy - 8, tw, 16);
          ctx.fillStyle = options.color;
          ctx.textAlign = 'center';
          ctx.fillText(patternType, cx, cy);
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
