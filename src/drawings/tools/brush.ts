// ── Brush / Freehand Drawing ────────────────────────────────────────────────
// Free-form drawing tool. User holds mouse and draws a path.
// Stored as a series of pixel points (converted to price/time on save).

import type { PixelPoint } from '../primitives/hit-test';
import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';

export const brushTool: InternalDrawingTool = {
  name: 'brush',
  icon: 'M4,20 C8,12 12,16 16,8 C18,4 20,6 20,4',
  // Special: pointCount = 999 means "keep adding points until mouseup"
  // The drawing engine handles this as continuous mode
  pointCount: 2, // We'll use 2 but store path in options._path

  render(ctx, points, options, _w, _h) {
    const path = (options as any)._brushPath as PixelPoint[] | undefined;
    if (!path || path.length < 2) {
      // Fallback: render as line between two points
      if (points.length >= 2) {
        ctx.strokeStyle = options.color;
        ctx.lineWidth = options.lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(points[0]!.x, points[0]!.y);
        ctx.lineTo(points[1]!.x, points[1]!.y);
        ctx.stroke();
      }
      return;
    }

    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0]!.x, path[0]!.y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i]!.x, path[i]!.y);
    }
    ctx.stroke();
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    return pointToSegmentDist(mouse, points[0]!, points[1]!) <= threshold * 2;
  },

  getHandles(points) {
    return points.slice(0, 2);
  },
};
