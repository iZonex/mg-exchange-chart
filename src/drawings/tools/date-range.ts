// ── Date Range ──────────────────────────────────────────────────────────────
// Two-point vertical range highlighting a time period.
// Shows the number of bars and time duration in the zone.
// Chart injects _barCount and _duration via options before rendering.

import type { InternalDrawingTool } from '../engine';
import { font } from '../../core/font';

export const dateRangeTool: InternalDrawingTool = {
  name: 'date-range',
  icon: 'M6,2 L6,22 M18,2 L18,22',
  pointCount: 2,

  render(ctx, points, options, _w, height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];
    const left = Math.min(p1.x, p2.x);
    const right = Math.max(p1.x, p2.x);

    // Shaded zone
    ctx.fillStyle = options.color + '10';
    ctx.fillRect(left, 0, right - left, height);

    // Borders
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(Math.round(left) + 0.5, 0);
    ctx.lineTo(Math.round(left) + 0.5, height);
    ctx.moveTo(Math.round(right) + 0.5, 0);
    ctx.lineTo(Math.round(right) + 0.5, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Data label — bars + time duration (injected by chart renderer)
    const barCount = (options as any)._barCount as number | undefined;
    const duration = (options as any)._duration as string | undefined;

    let label = '';
    if (barCount !== undefined && duration) {
      label = `${barCount} bars | ${duration}`;
    } else if (barCount !== undefined) {
      label = `${barCount} bars`;
    } else {
      // Fallback
      label = `${Math.abs(right - left).toFixed(0)}px`;
    }

    const midX = (left + right) / 2;

    // Label background
    ctx.font = font(11, 'bold');
    const textW = ctx.measureText(label).width + 12;
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(midX - textW / 2, 4, textW, 18);
    ctx.globalAlpha = 1;

    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, midX, 13);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const left = Math.min(points[0]!.x, points[1]!.x);
    const right = Math.max(points[0]!.x, points[1]!.x);
    return mouse.x >= left - threshold && mouse.x <= right + threshold;
  },

  getHandles(points) {
    if (points.length < 2) return [];
    return [
      { x: points[0]!.x, y: 50 },
      { x: points[1]!.x, y: 50 },
    ];
  },
};
