// ── Fibonacci Channel ───────────────────────────────────────────────────────
// 3-point: p1-p2 define the base line, p3 defines the channel width.
// Draws parallel lines at Fibonacci ratios of the channel width.

import { pointToSegmentDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618];

export const fibChannelTool: InternalDrawingTool = {
  name: 'fib-channel',
  icon: 'M2,20 L22,12 M2,14 L22,6 M2,8 L22,0',
  pointCount: 3,

  render(ctx, points, options, _w, _h) {
    if (points.length < 3) return;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    // Normal vector from base line to p3
    const nx = -dy / len;
    const ny = dx / len;
    const fullDist = (p3.x - p1.x) * nx + (p3.y - p1.y) * ny;

    ctx.font = font(9);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (const level of FIB_LEVELS) {
      const dist = fullDist * level;
      const ox = nx * dist;
      const oy = ny * dist;

      const alpha = level === 0 || level === 1 ? 0.7 : 0.35;
      ctx.strokeStyle = options.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = level === 0 || level === 1 ? 1.5 : 0.8;

      ctx.beginPath();
      ctx.moveTo(p1.x + ox, p1.y + oy);
      ctx.lineTo(p2.x + ox, p2.y + oy);
      ctx.stroke();

      // Label
      ctx.fillStyle = options.color;
      ctx.fillText(`${(level * 100).toFixed(1)}%`, p2.x + ox - 4, p2.y + oy);
    }

    // Fill between 0 and 1
    ctx.fillStyle = options.color + '08';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p2.x + nx * fullDist, p2.y + ny * fullDist);
    ctx.lineTo(p1.x + nx * fullDist, p1.y + ny * fullDist);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    return pointToSegmentDist(mouse, points[0]!, points[1]!) <= threshold + 20;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
