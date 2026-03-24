// ── Vertical Line ───────────────────────────────────────────────────────────
// Single-click vertical line at a specific time — marks events, session opens.

import type { InternalDrawingTool } from '../engine';
import { font } from '../../core/font';
import { applyLineStyle } from './utils';

export const verticalLineTool: InternalDrawingTool = {
  name: 'vertical-line',
  icon: 'M12,2 L12,22',
  pointCount: 1,

  render(ctx, points, options, _w, height) {
    if (points.length < 1) return;
    const x = Math.round(points[0]!.x) + 0.5;
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Time label at bottom
    const timeData = (options as any)._timeLabel as string | undefined;
    if (timeData) {
      ctx.font = font(10);
      const tw = ctx.measureText(timeData).width + 8;
      ctx.fillStyle = options.color;
      ctx.fillRect(x - tw / 2, height - 16, tw, 16);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeData, x, height - 8);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 1) return false;
    return Math.abs(mouse.x - points[0]!.x) <= threshold;
  },

  getHandles(points) {
    return points.length >= 1 ? [{ x: points[0]!.x, y: 20 }] : [];
  },
};
