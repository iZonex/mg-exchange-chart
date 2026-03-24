// ── Ellipse Tool ────────────────────────────────────────────────────────────
// Two-point ellipse defined by bounding rectangle corners.

import type { InternalDrawingTool } from '../engine';
import { font } from '../../core/font';
import { applyLineStyle } from './utils';

export const ellipseTool: InternalDrawingTool = {
  name: 'ellipse',
  icon: 'M12,4 A8,8 0 1,1 12,20 A8,8 0 1,1 12,4',
  pointCount: 2,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const rx = Math.abs(p2.x - p1.x) / 2;
    const ry = Math.abs(p2.y - p1.y) / 2;

    // Fill
    ctx.fillStyle = options.color + '15';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stroke
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Dimensions label
    const data = (options as any)._rectData as { priceRange: number; bars: number } | undefined;
    if (data) {
      const label = `${data.priceRange.toFixed(2)} | ${data.bars} bars`;
      ctx.font = font(10);
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.7;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cx, cy);
      ctx.globalAlpha = 1;
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const [p1, p2] = [points[0]!, points[1]!];
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const rx = Math.abs(p2.x - p1.x) / 2 || 1;
    const ry = Math.abs(p2.y - p1.y) / 2 || 1;

    // Normalize to unit circle
    const nx = (mouse.x - cx) / rx;
    const ny = (mouse.y - cy) / ry;
    const d = Math.sqrt(nx * nx + ny * ny);

    // Hit if near the border (d ≈ 1) or inside
    return d <= 1.0 + threshold / Math.min(rx, ry);
  },

  getHandles(points) {
    if (points.length < 2) return [];
    const [p1, p2] = [points[0]!, points[1]!];
    return [
      p1, p2,
      { x: p1.x, y: p2.y },
      { x: p2.x, y: p1.y },
    ];
  },
};
