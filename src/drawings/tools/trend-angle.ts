// ── Trend Angle ─────────────────────────────────────────────────────────────
// Two-point line that prominently displays the angle, price change, bar count,
// and percentage change. Similar to trend-line but with a large angle readout.

import { pointToSegmentDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';
import { t } from '../../core/i18n';

export const trendAngleTool: InternalDrawingTool = {
  name: 'trend-angle',
  icon: 'M4,20 L20,4 M4,20 L20,20 M8,17 A 4 4 0 0 1 7,20',
  pointCount: 2,

  render(ctx, points, options, _width, _height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    // Main line
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Horizontal baseline from p1 (to show the angle reference)
    ctx.strokeStyle = options.color;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p1.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Angle arc at p1
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(-dy, dx); // Negative because canvas Y is inverted
    const angleDeg = angle * (180 / Math.PI);
    const arcRadius = Math.min(30, Math.sqrt(dx * dx + dy * dy) * 0.3);

    if (arcRadius > 5) {
      ctx.strokeStyle = options.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (angle >= 0) {
        ctx.arc(p1.x, p1.y, arcRadius, 0, -angle, true);
      } else {
        ctx.arc(p1.x, p1.y, arcRadius, 0, -angle, false);
      }
      ctx.stroke();
    }

    // Data from injection
    const data = (options as any)._lineData as { angle: number; bars: number; deltaPrice: number; pctChange: number } | undefined;

    // Large angle label at midpoint
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    // Primary: large angle display
    ctx.font = font(14, 'bold');
    const angleText = `${angleDeg.toFixed(1)}\u00B0`;
    const aw = ctx.measureText(angleText).width;
    const pad = 5;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(midX - aw / 2 - pad, midY - 22, aw + pad * 2, 20);
    ctx.fillStyle = options.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(angleText, midX, midY - 12);

    // Secondary: price change, %, bars
    if (data) {
      const sign = data.deltaPrice >= 0 ? '+' : '';
      const detail = `${sign}${data.deltaPrice.toFixed(2)} (${sign}${data.pctChange.toFixed(2)}%) | ${data.bars} ${t('bars')}`;
      drawDataLabel(ctx, midX, midY + 8, detail, options.color);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    return pointToSegmentDist(mouse, points[0]!, points[1]!) <= threshold;
  },

  getHandles(points) {
    return points.slice(0, 2);
  },
};
