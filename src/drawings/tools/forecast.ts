// ── Forecast / Projection ───────────────────────────────────────────────────
// Two-point tool: takes a price move (p1→p2) and projects it forward.
// Shows the projected path as a dashed extension with percentage target.

import { pointToSegmentDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';

export const forecastTool: InternalDrawingTool = {
  name: 'forecast',
  icon: 'M4,16 L12,8 M12,8 L20,4',
  pointCount: 2,

  render(ctx, points, options, _width, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Solid move line
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dashed projection (1:1 extension)
    ctx.setLineDash([6, 4]);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x + dx, p2.y + dy);
    ctx.stroke();

    // 1.618 extension
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(p2.x + dx, p2.y + dy);
    ctx.lineTo(p2.x + dx * 1.618, p2.y + dy * 1.618);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Labels with prices
    const data = (options as any)._lineData as { angle: number; bars: number; deltaPrice: number; pctChange: number } | undefined;
    ctx.font = font(10);
    ctx.fillStyle = options.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';

    if (data) {
      const p1Price = (options as any)._entryPrice ?? 0;
      const targetPrice100 = p1Price + data.deltaPrice * 2;
      const targetPrice161 = p1Price + data.deltaPrice * 2.618;
      ctx.fillText(`100% (${targetPrice100.toFixed(2)})`, p2.x + dx + 4, p2.y + dy - 2);
      ctx.globalAlpha = 0.6;
      ctx.fillText(`161.8% (${targetPrice161.toFixed(2)})`, p2.x + dx * 1.618 + 4, p2.y + dy * 1.618 - 2);
    } else {
      ctx.fillText('100%', p2.x + dx + 4, p2.y + dy - 2);
      ctx.globalAlpha = 0.6;
      ctx.fillText('161.8%', p2.x + dx * 1.618 + 4, p2.y + dy * 1.618 - 2);
    }
    ctx.globalAlpha = 1;

    // Arrowhead at projection end
    const angle = Math.atan2(dy, dx);
    const endX = p2.x + dx;
    const endY = p2.y + dy;
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - 8 * Math.cos(angle - 0.4), endY - 8 * Math.sin(angle - 0.4));
    ctx.lineTo(endX - 8 * Math.cos(angle + 0.4), endY - 8 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const [p1, p2] = [points[0]!, points[1]!];
    if (pointToSegmentDist(mouse, p1, p2) <= threshold) return true;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const ext = { x: p2.x + dx, y: p2.y + dy };
    return pointToSegmentDist(mouse, p2, ext) <= threshold;
  },

  getHandles(points) {
    return points.slice(0, 2);
  },
};
