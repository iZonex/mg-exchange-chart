// ── Polyline ────────────────────────────────────────────────────────────────
// Multi-segment line (click to add points, double-click to finish).
// Uses pointCount=2 but supports extension via the drawing engine.

import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';

export const polylineTool: InternalDrawingTool = {
  name: 'polyline',
  icon: 'M4,18 L10,6 L16,14 L20,4',
  pointCount: 2, // Minimum 2, but can add more via extension

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Path length label
    const data = (options as any)._polyData as { segments: number; totalBars: number; totalPrice: number; totalPct: number } | undefined;
    if (data) {
      const last = points[points.length - 1]!;
      drawDataLabel(ctx, last.x + 60, last.y,
        `${data.segments} seg | ${data.totalBars} bars | ${data.totalPrice.toFixed(2)} (${data.totalPct.toFixed(2)}%)`, options.color);
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
