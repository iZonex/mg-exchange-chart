// ── Extended Line ───────────────────────────────────────────────────────────
// Two-point line that extends infinitely in both directions.

import { pointToLineDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel, formatLineLabel } from '../primitives/label';

export const extendedLineTool: InternalDrawingTool = {
  name: 'extended-line',
  icon: 'M0,16 L24,8',
  pointCount: 2,

  render(ctx, points, options, width, height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (dx === 0 && dy === 0) return;

    // Extend to chart edges in both directions
    let x1: number, y1: number, x2: number, y2: number;
    if (Math.abs(dx) > Math.abs(dy)) {
      const slope = dy / dx;
      x1 = 0; y1 = p1.y + slope * (0 - p1.x);
      x2 = width; y2 = p1.y + slope * (width - p1.x);
    } else {
      const slope = dx / dy;
      y1 = 0; x1 = p1.x + slope * (0 - p1.y);
      y2 = height; x2 = p1.x + slope * (height - p1.y);
    }

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Data label
    const data = (options as any)._lineData as { angle: number; bars: number; deltaPrice: number; pctChange: number } | undefined;
    if (data) {
      drawDataLabel(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 11, formatLineLabel(data), options.color);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    return pointToLineDist(mouse, points[0]!, points[1]!) <= threshold;
  },

  getHandles(points) {
    return points.slice(0, 2);
  },
};
