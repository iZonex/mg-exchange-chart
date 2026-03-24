// ── Parallel Channel ────────────────────────────────────────────────────────
// Three points: p1-p2 define the first line, p3 defines the channel width.
// Second line is parallel to p1-p2, passing through p3.

import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';

export const parallelChannelTool: InternalDrawingTool = {
  name: 'parallel-channel',
  icon: 'M2,8 L22,4 M2,16 L22,12',
  pointCount: 3,

  render(ctx, points, options, _width, _height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;

    // First line
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    if (points.length >= 3) {
      const p3 = points[2]!;
      // Calculate offset from first line to p3
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        // Normal vector
        const nx = -dy / len;
        const ny = dx / len;
        // Project p3 onto normal
        const dist = (p3.x - p1.x) * nx + (p3.y - p1.y) * ny;
        const offsetX = nx * dist;
        const offsetY = ny * dist;

        // Second parallel line
        ctx.beginPath();
        ctx.moveTo(p1.x + offsetX, p1.y + offsetY);
        ctx.lineTo(p2.x + offsetX, p2.y + offsetY);
        ctx.stroke();

        // Fill between lines
        ctx.fillStyle = options.color + '12'; // 7% opacity
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x + offsetX, p2.y + offsetY);
        ctx.lineTo(p1.x + offsetX, p1.y + offsetY);
        ctx.closePath();
        ctx.fill();

        // Middle line (dashed)
        ctx.setLineDash([4, 4]);
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(p1.x + offsetX / 2, p1.y + offsetY / 2);
        ctx.lineTo(p2.x + offsetX / 2, p2.y + offsetY / 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Channel width label
        const chData = (options as any)._channelData as { priceWidth: number; pctWidth: number; pxDist: number } | undefined;
        if (chData && chData.priceWidth > 0) {
          drawDataLabel(ctx, (p1.x + p2.x) / 2 + offsetX / 2, (p1.y + p2.y) / 2 + offsetY / 2,
            `${chData.priceWidth.toFixed(2)} (${chData.pctWidth.toFixed(2)}%)`, options.color);
        }
      }
    }
    ctx.setLineDash([]);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    if (pointToSegmentDist(mouse, points[0]!, points[1]!) <= threshold) return true;
    if (points.length >= 3) {
      const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const nx = -dy / len, ny = dx / len;
        const dist = (p3.x - p1.x) * nx + (p3.y - p1.y) * ny;
        const l2p1 = { x: p1.x + nx * dist, y: p1.y + ny * dist };
        const l2p2 = { x: p2.x + nx * dist, y: p2.y + ny * dist };
        if (pointToSegmentDist(mouse, l2p1, l2p2) <= threshold) return true;
      }
    }
    return false;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
