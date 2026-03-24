// ── Ray ──────────────────────────────────────────────────────────────────────
// Two-point ray: starts at p1, passes through p2, extends to chart edge.

import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel, formatLineLabel } from '../primitives/label';

export const rayTool: InternalDrawingTool = {
  name: 'ray',
  icon: 'M4,20 L20,4 L24,0',
  pointCount: 2,

  render(ctx, points, options, width, height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    // Extend from p1 through p2 to chart edge
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    let endX: number, endY: number;
    if (dx === 0) {
      endX = p1.x;
      endY = dy > 0 ? height : 0;
    } else {
      const slope = dy / dx;
      if (dx > 0) {
        endX = width;
        endY = p1.y + slope * (width - p1.x);
      } else {
        endX = 0;
        endY = p1.y + slope * (0 - p1.x);
      }
    }

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Data label (angle, bars, ΔPrice, %)
    const data = (options as any)._lineData as { angle: number; bars: number; deltaPrice: number; pctChange: number } | undefined;
    if (data) {
      drawDataLabel(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 11, formatLineLabel(data), options.color);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    // Test against the visible segment from p1 to extended endpoint
    return pointToSegmentDist(mouse, points[0]!, points[1]!) <= threshold;
  },

  getHandles(points) {
    return points.slice(0, 2);
  },
};
