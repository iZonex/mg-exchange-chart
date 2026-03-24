// ── Horizontal Line ─────────────────────────────────────────────────────────
// Single-click drawing: horizontal price level across the full chart width.
// Used for support/resistance levels.

import { pointToHorizontalLineDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';

export const horizontalLineTool: InternalDrawingTool = {
  name: 'horizontal-line',
  icon: 'M2,12 L22,12',
  pointCount: 1,

  render(ctx, points, options, width, _height) {
    if (points.length < 1) return;
    const y = points[0]!.y;

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(width, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label on right side
    if (options.text) {
      ctx.fillStyle = options.color;
      ctx.font = font(11);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.text, width - 8, y);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 1) return false;
    return pointToHorizontalLineDist(mouse, points[0]!.y) <= threshold;
  },

  getHandles(points) {
    if (points.length < 1) return [];
    // Single handle in the middle
    return [{ x: 50, y: points[0]!.y }];
  },
};
