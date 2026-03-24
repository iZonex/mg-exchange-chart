// ── Disjoint Channel ────────────────────────────────────────────────────────
// 4 points: two independent lines (p1-p2 and p3-p4) that don't need to be
// equidistant or parallel. Useful for irregular channel structures.

import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';
import { font } from '../../core/font';

export const disjointChannelTool: InternalDrawingTool = {
  name: 'disjoint-channel',
  icon: 'M2,6 L22,10 M2,18 L22,14',
  pointCount: 4,

  render(ctx, points, options, _width, _height) {
    if (points.length < 4) return;
    const [p1, p2, p3, p4] = [points[0]!, points[1]!, points[2]!, points[3]!];

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;

    // Line 1: p1 → p2
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // Line 2: p3 → p4
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.stroke();

    // Fill between the two lines
    ctx.fillStyle = options.color + '0C';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();

    // Dashed middle line
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo((p1.x + p3.x) / 2, (p1.y + p3.y) / 2);
    ctx.lineTo((p2.x + p4.x) / 2, (p2.y + p4.y) / 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Channel width label (average of left and right gaps)
    const chData = (options as any)._channelData as { priceWidth: number; pctWidth: number } | undefined;
    const midX = (p1.x + p2.x + p3.x + p4.x) / 4;
    const midY = (p1.y + p2.y + p3.y + p4.y) / 4;
    ctx.font = font(10);
    if (chData) {
      drawDataLabel(ctx, midX, midY - 14, `${chData.priceWidth.toFixed(2)} (${chData.pctWidth.toFixed(2)}%)`, options.color);
    } else {
      const leftGap = Math.sqrt((p3.x - p1.x) ** 2 + (p3.y - p1.y) ** 2);
      const rightGap = Math.sqrt((p4.x - p2.x) ** 2 + (p4.y - p2.y) ** 2);
      drawDataLabel(ctx, midX, midY - 14, `${((leftGap + rightGap) / 2).toFixed(0)}px`, options.color);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 4) return false;
    const [p1, p2, p3, p4] = [points[0]!, points[1]!, points[2]!, points[3]!];

    if (pointToSegmentDist(mouse, p1, p2) <= threshold) return true;
    if (pointToSegmentDist(mouse, p3, p4) <= threshold) return true;
    return false;
  },

  getHandles(points) {
    return points.slice(0, 4);
  },
};
