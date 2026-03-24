// ── Rectangle ───────────────────────────────────────────────────────────────
// Two-point rectangle defined by opposite corners.
// Used for consolidation zones, order blocks.

import { pointToRectBorderDist, pointInRect } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';

export const rectangleTool: InternalDrawingTool = {
  name: 'rectangle',
  icon: 'M3,3 L21,3 L21,21 L3,21 Z',
  pointCount: 2,

  render(ctx, points, options, _width, _height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);

    // Fill
    ctx.fillStyle = options.color + '1A'; // 10% opacity fill
    ctx.fillRect(x, y, w, h);

    // Border
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Data label (price range + bars + duration)
    const data = (options as any)._rectData as { priceRange: number; pctRange: number; bars: number; duration: string } | undefined;
    if (data) {
      drawDataLabel(ctx, x + w / 2, y + h + 14,
        `${data.priceRange.toFixed(2)} (${data.pctRange.toFixed(2)}%) | ${data.bars} bars | ${data.duration}`, options.color);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    // Hit if near border OR inside the rectangle
    const borderDist = pointToRectBorderDist(mouse, points[0]!, points[1]!);
    if (borderDist <= threshold) return true;
    return pointInRect(mouse, points[0]!, points[1]!, 0);
  },

  getHandles(points) {
    if (points.length < 2) return [];
    const [p1, p2] = [points[0]!, points[1]!];
    // 4 corners
    return [
      { x: p1.x, y: p1.y },
      { x: p2.x, y: p1.y },
      { x: p2.x, y: p2.y },
      { x: p1.x, y: p2.y },
    ];
  },
};
