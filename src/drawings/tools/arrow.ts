// ── Arrow Tool ──────────────────────────────────────────────────────────────
// Two-point arrow from p1 to p2 with arrowhead.

import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';

const ARROW_SIZE = 10;

export const arrowTool: InternalDrawingTool = {
  name: 'arrow',
  icon: 'M4,20 L20,4',
  pointCount: 2,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;

    // Line
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead at p2
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    ctx.fillStyle = options.color;
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(
      p2.x - ARROW_SIZE * Math.cos(angle - Math.PI / 6),
      p2.y - ARROW_SIZE * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      p2.x - ARROW_SIZE * Math.cos(angle + Math.PI / 6),
      p2.y - ARROW_SIZE * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();

    // Data label
    const data = (options as any)._lineData as { angle: number; bars: number; deltaPrice: number; pctChange: number } | undefined;
    if (data) {
      const sign = data.deltaPrice >= 0 ? '+' : '';
      drawDataLabel(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 11,
        `${data.bars} bars | ${sign}${data.deltaPrice.toFixed(2)} (${sign}${data.pctChange.toFixed(2)}%)`, options.color);
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
