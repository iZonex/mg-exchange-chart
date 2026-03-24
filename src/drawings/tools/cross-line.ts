// ── Cross Line ──────────────────────────────────────────────────────────────
// Single-click: horizontal + vertical line intersecting at the point.
// Shows exact price and time at the crossing.

import type { InternalDrawingTool } from '../engine';
import { font } from '../../core/font';
import { applyLineStyle } from './utils';

export const crossLineTool: InternalDrawingTool = {
  name: 'cross-line',
  icon: 'M12,2 L12,22 M2,12 L22,12',
  pointCount: 1,

  render(ctx, points, options, width, height) {
    if (points.length < 1) return;
    const p = points[0]!;
    const x = Math.round(p.x) + 0.5;
    const y = Math.round(p.y) + 0.5;

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price badge on right edge
    const priceLabel = (options as any)._priceLabel as string | undefined;
    if (priceLabel) {
      ctx.font = font(10);
      const tw = ctx.measureText(priceLabel).width + 8;
      ctx.fillStyle = options.color;
      ctx.fillRect(width - tw, y - 8, tw, 16);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceLabel, width - tw + 4, y);
    }

    // Time badge at bottom
    const timeLabel = (options as any)._timeLabel as string | undefined;
    if (timeLabel) {
      ctx.font = font(10);
      const tw = ctx.measureText(timeLabel).width + 8;
      ctx.fillStyle = options.color;
      ctx.fillRect(x - tw / 2, height - 16, tw, 16);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeLabel, x, height - 8);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 1) return false;
    const p = points[0]!;
    return Math.abs(mouse.x - p.x) <= threshold || Math.abs(mouse.y - p.y) <= threshold;
  },

  getHandles(points) {
    return points.slice(0, 1);
  },
};
