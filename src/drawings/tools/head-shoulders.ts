// ── Head & Shoulders Pattern ────────────────────────────────────────────────
// 7-point tool: left shoulder, neckline, head, neckline, right shoulder,
// neckline extension. Simplified as 5-point: LS, N1, Head, N2, RS.

import { pointToSegmentDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { t } from '../../core/i18n';

export const headShouldersTool: InternalDrawingTool = {
  name: 'head-shoulders',
  icon: 'M2,16 L6,8 L10,14 L12,4 L14,14 L18,8 L22,16',
  pointCount: 5, // LS, N1, Head, N2, RS

  render(ctx, points, options, width, _h) {
    if (points.length < 2) return;
    const labels = ['LS', 'N', 'H', 'N', 'RS'];

    // Pattern line
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

    // Neckline (dashed, extended) — between N1 and N2
    if (points.length >= 4) {
      const n1 = points[1]!, n2 = points[3]!;
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const scale = width / len;
        ctx.strokeStyle = options.color;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(n1.x - dx * scale, n1.y - dy * scale);
        ctx.lineTo(n2.x + dx * scale, n2.y + dy * scale);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Fill pattern
      ctx.fillStyle = options.color + '08';
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
      ctx.closePath();
      ctx.fill();
    }

    // Labels
    ctx.font = font(10, 'bold');
    ctx.textAlign = 'center';
    ctx.fillStyle = options.color;
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      const isTop = i === 0 || i === 2 || i === 4;
      ctx.textBaseline = isTop ? 'bottom' : 'top';
      ctx.fillText(labels[i]!, p.x, p.y + (isTop ? -6 : 6));
    }

    // Target projection: Head-to-Neckline distance projected below neckline break
    if (points.length >= 5) {
      const n1 = points[1]!, head = points[2]!, n2 = points[3]!, rs = points[4]!;
      const neckY = (n1.y + n2.y) / 2; // average neckline Y
      const headToNeck = Math.abs(head.y - neckY);
      const isInverted = head.y > neckY; // inverted H&S
      const targetY = isInverted ? neckY - headToNeck : neckY + headToNeck;

      // Target line
      ctx.strokeStyle = '#0ecb81';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(rs.x, Math.round(targetY) + 0.5);
      ctx.lineTo(rs.x + (rs.x - n1.x), Math.round(targetY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target label
      ctx.globalAlpha = 0.7;
      ctx.font = font(9);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      // Show target with price if available
      const priceData = (options as any)._hsTarget as { targetPrice: number; pct: number } | undefined;
      ctx.fillStyle = '#0ecb81';
      if (priceData) {
        ctx.fillText(`${t('target')} ${priceData.targetPrice.toFixed(2)} (${priceData.pct >= 0 ? '+' : ''}${priceData.pct.toFixed(2)}%)`, rs.x + 4, targetY);
      } else {
        ctx.fillText(t('target'), rs.x + 4, targetY);
      }
      ctx.globalAlpha = 1;
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
