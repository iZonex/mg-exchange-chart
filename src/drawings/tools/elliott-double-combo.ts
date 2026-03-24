// ── Elliott Double Combination (WXY) ────────────────────────────────────────
// 4 points: W, X, Y labels. Two corrective waves connected by an X wave.
// Point sequence: start → W → X → Y

import { pointToSegmentDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';
import { t } from '../../core/i18n';

export const elliottDoubleComboTool: InternalDrawingTool = {
  name: 'elliott-double-combo',
  icon: 'M4,16 L10,6 L14,14 L20,4',
  pointCount: 4, // start, W, X, Y

  render(ctx, points, options) {
    if (points.length < 2) return;

    const labels = ['\u2022', t('wLabel'), t('xLabel'), t('yLabel')];

    // Lines
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

    // Dashed line from start to Y (overall move)
    if (points.length >= 4) {
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      ctx.lineTo(points[3]!.x, points[3]!.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    // Labels at each point
    ctx.font = font(13, 'bold');
    ctx.textAlign = 'center';
    ctx.fillStyle = options.color;
    for (let i = 0; i < points.length && i < labels.length; i++) {
      const p = points[i]!;
      const isTop = i > 0 ? p.y < points[i - 1]!.y : true;
      ctx.textBaseline = isTop ? 'bottom' : 'top';
      ctx.fillText(labels[i]!, p.x, p.y + (isTop ? -10 : 10));
    }

    // Fibonacci ratios between adjacent legs
    if (points.length >= 3) {
      ctx.font = font(9);
      ctx.textAlign = 'left';
      ctx.fillStyle = options.color;
      for (let i = 1; i < points.length - 1; i++) {
        const prevLeg = Math.abs(points[i]!.y - points[i - 1]!.y);
        const nextLeg = Math.abs(points[i + 1]!.y - points[i]!.y);
        if (prevLeg > 0) {
          const ratio = nextLeg / prevLeg;
          const mx = (points[i]!.x + points[i + 1]!.x) / 2 + 6;
          const my = (points[i]!.y + points[i + 1]!.y) / 2;
          ctx.globalAlpha = 0.6;
          ctx.fillText(ratio.toFixed(3), mx, my);
        }
      }
      ctx.globalAlpha = 1;
    }

    // Overall move data label
    if (points.length >= 4) {
      const data = (options as any)._comboData as { totalPx: number; pct: number } | undefined;
      if (data) {
        const cx = (points[0]!.x + points[3]!.x) / 2;
        const cy = Math.max(points[0]!.y, points[3]!.y) + 20;
        drawDataLabel(ctx, cx, cy, `${data.totalPx.toFixed(2)} (${data.pct.toFixed(2)}%)`, options.color);
      }
    }
  },

  hitTest(mouse, points, threshold) {
    for (let i = 0; i < points.length - 1; i++) {
      if (pointToSegmentDist(mouse, points[i]!, points[i + 1]!) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) {
    return [...points];
  },
};
