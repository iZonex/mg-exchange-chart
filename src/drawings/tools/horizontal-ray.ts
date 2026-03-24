// ── Horizontal Ray ──────────────────────────────────────────────────────────
// Single-click drawing: horizontal line from the anchor point extending RIGHT
// to the chart edge. Used for projected support/resistance levels.

import { pointToHorizontalLineDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';

export const horizontalRayTool: InternalDrawingTool = {
  name: 'horizontal-ray',
  icon: 'M2,12 L22,12 M18,8 L22,12 L18,16',
  pointCount: 1,

  render(ctx, points, options, width, _height) {
    if (points.length < 1) return;
    const p = points[0]!;
    const y = Math.round(p.y) + 0.5;

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(p.x, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label at anchor point
    if (options.text) {
      ctx.fillStyle = options.color;
      ctx.font = font(11);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(options.text, p.x + 6, y - 4);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 1) return false;
    const p = points[0]!;
    // Only hit to the right of the anchor point
    if (mouse.x < p.x - threshold) return false;
    return pointToHorizontalLineDist(mouse, p.y) <= threshold;
  },

  getHandles(points) {
    if (points.length < 1) return [];
    return [{ x: points[0]!.x, y: points[0]!.y }];
  },
};
