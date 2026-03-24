// ── Andrews' Pitchfork ──────────────────────────────────────────────────────
// Three-point tool: p1 (handle), p2 (left prong), p3 (right prong).
// Median line from p1 through midpoint of p2-p3, extended.
// Upper/lower lines parallel to median through p2 and p3.

import { pointToLineDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';

export const pitchforkTool: InternalDrawingTool = {
  name: 'pitchfork',
  icon: 'M12,2 L12,22 M4,8 L12,2 L20,8',
  pointCount: 3,

  render(ctx, points, options, width, height) {
    if (points.length < 3) return;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];

    // Midpoint of p2-p3
    const mid = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;

    // Median line (p1 → mid, extended)
    const dx = mid.x - p1.x;
    const dy = mid.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const scale = Math.max(width, height) * 2 / len;
    const endX = p1.x + dx * scale;
    const endY = p1.y + dy * scale;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Upper line (through p2, parallel to median)
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x + dx * scale, p2.y + dy * scale);
    ctx.stroke();

    // Lower line (through p3, parallel to median)
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p3.x + dx * scale, p3.y + dy * scale);
    ctx.stroke();

    // Connect p1 to p2 and p3
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Fill between upper and lower
    ctx.fillStyle = options.color + '08';
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x + dx * scale, p2.y + dy * scale);
    ctx.lineTo(p3.x + dx * scale, p3.y + dy * scale);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();

    ctx.setLineDash([]);

    // Slope angle + channel width label
    const angle = Math.atan2(-(mid.y - p1.y), mid.x - p1.x) * (180 / Math.PI);
    // Channel width = distance between p2 and p3 perpendicular to median
    const chWidth = Math.abs((p3.x - p2.x) * (dy / len) - (p3.y - p2.y) * (dx / len));
    const data = (options as any)._channelData as { priceWidth: number; pctWidth: number } | undefined;

    let label: string;
    if (data) {
      label = `${angle.toFixed(1)}\u00B0 | ${data.priceWidth.toFixed(2)} (${data.pctWidth.toFixed(2)}%)`;
    } else {
      label = `${angle.toFixed(1)}\u00B0 | ${chWidth.toFixed(0)}px`;
    }
    drawDataLabel(ctx, (p1.x + mid.x) / 2, (p1.y + mid.y) / 2 - 14, label, options.color);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 3) return false;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];
    const mid = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

    if (pointToLineDist(mouse, p1, mid) <= threshold) return true;
    if (pointToLineDist(mouse, p2, { x: p2.x + (mid.x - p1.x), y: p2.y + (mid.y - p1.y) }) <= threshold) return true;
    if (pointToLineDist(mouse, p3, { x: p3.x + (mid.x - p1.x), y: p3.y + (mid.y - p1.y) }) <= threshold) return true;
    return false;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
