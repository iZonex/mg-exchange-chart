// ── Trend Line ──────────────────────────────────────────────────────────────
// Two-point line segment. Optionally extends to chart edges.

import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel, formatLineLabel } from '../primitives/label';

export const trendLineTool: InternalDrawingTool = {
  name: 'trend-line',
  icon: 'M4,20 L20,4',
  pointCount: 2,

  render(ctx, points, options, width, _height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;

    if (options.extendLeft || options.extendRight) {
      // Extend line to chart edges
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      let startX = p1.x, startY = p1.y;
      let endX = p2.x, endY = p2.y;

      if (dx !== 0) {
        const slope = dy / dx;
        if (options.extendLeft) {
          startX = 0;
          startY = p1.y + slope * (0 - p1.x);
        }
        if (options.extendRight) {
          endX = width;
          endY = p1.y + slope * (width - p1.x);
        }
      }

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Show data label if injected (angle, bars, ΔPrice, %)
    const data = (options as any)._lineData as { angle: number; bars: number; deltaPrice: number; pctChange: number } | undefined;
    if (data) {
      drawDataLabel(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 11, formatLineLabel(data), options.color);
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
