// ── Triangle Tool ───────────────────────────────────────────────────────────
// Three-point triangle with fill and border.

import type { PixelPoint } from '../primitives/hit-test';
import { font } from '../../core/font';
import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';

export const triangleTool: InternalDrawingTool = {
  name: 'triangle',
  icon: 'M12,3 L3,21 L21,21 Z',
  pointCount: 3,

  render(ctx, points, options, _w, _h) {
    if (points.length < 3) return;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];

    // Fill
    ctx.fillStyle = options.color + '15';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();

    // Border
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Measurements label
    const segLen = (a: PixelPoint, b: PixelPoint) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    const s1 = segLen(p1, p2), s2 = segLen(p2, p3), s3 = segLen(p3, p1);
    // Shoelace area (in px)
    const priceHeight = (options as any)._rectData?.priceRange;
    const bars = (options as any)._rectData?.bars;

    const cx = (p1.x + p2.x + p3.x) / 3;
    const cy = (p1.y + p2.y + p3.y) / 3;
    let label: string;
    if (priceHeight !== undefined && bars !== undefined) {
      label = `${priceHeight.toFixed(2)} | ${bars} bars`;
    } else {
      label = `${(s1 + s2 + s3).toFixed(0)}px`;
    }
    ctx.font = font(10);
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 3) return false;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];
    return pointToSegmentDist(mouse, p1, p2) <= threshold ||
           pointToSegmentDist(mouse, p2, p3) <= threshold ||
           pointToSegmentDist(mouse, p3, p1) <= threshold;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
