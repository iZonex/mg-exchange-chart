// ── Inside Pitchfork ────────────────────────────────────────────────────────
// Like Andrews' Pitchfork but upper/lower lines are drawn inside the channel
// at 50% of the median-to-prong distance. Creates a tighter channel.
// Three-point tool: p1 (handle), p2 (left prong), p3 (right prong).

import { pointToLineDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';
import { font } from '../../core/font';

export const insidePitchforkTool: InternalDrawingTool = {
  name: 'inside-pitchfork',
  icon: 'M12,2 L12,22 M7,9 L12,2 L17,9',
  pointCount: 3,

  render(ctx, points, options, width, height) {
    if (points.length < 3) return;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];

    // Midpoint of p2-p3
    const mid = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;

    // Median line direction (p1 → mid, extended)
    const dx = mid.x - p1.x;
    const dy = mid.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const scale = Math.max(width, height) * 2 / len;

    // Median line
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p1.x + dx * scale, p1.y + dy * scale);
    ctx.stroke();

    // Inside upper line: at 50% distance from median to p2
    const insideUp = { x: (mid.x + p2.x) / 2, y: (mid.y + p2.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(insideUp.x, insideUp.y);
    ctx.lineTo(insideUp.x + dx * scale, insideUp.y + dy * scale);
    ctx.stroke();

    // Inside lower line: at 50% distance from median to p3
    const insideLow = { x: (mid.x + p3.x) / 2, y: (mid.y + p3.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(insideLow.x, insideLow.y);
    ctx.lineTo(insideLow.x + dx * scale, insideLow.y + dy * scale);
    ctx.stroke();

    // Outer lines (dashed, for reference)
    ctx.globalAlpha = 0.25;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x + dx * scale, p2.y + dy * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p3.x, p3.y);
    ctx.lineTo(p3.x + dx * scale, p3.y + dy * scale);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Dashed connector lines: p1 to p2 and p3
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Fill between inside upper and inside lower
    ctx.fillStyle = options.color + '0A';
    ctx.beginPath();
    ctx.moveTo(insideUp.x, insideUp.y);
    ctx.lineTo(insideUp.x + dx * scale, insideUp.y + dy * scale);
    ctx.lineTo(insideLow.x + dx * scale, insideLow.y + dy * scale);
    ctx.lineTo(insideLow.x, insideLow.y);
    ctx.closePath();
    ctx.fill();

    // Slope angle + channel width label
    const angle = Math.atan2(-(mid.y - p1.y), mid.x - p1.x) * (180 / Math.PI);
    const chWidth = Math.abs((p3.x - p2.x) * (dy / len) - (p3.y - p2.y) * (dx / len));
    const data = (options as any)._channelData as { priceWidth: number; pctWidth: number } | undefined;

    ctx.font = font(10);
    let label: string;
    if (data) {
      label = `${angle.toFixed(1)}\u00B0 | ${data.priceWidth.toFixed(2)} (${data.pctWidth.toFixed(2)}%)`;
    } else {
      label = `${angle.toFixed(1)}\u00B0 | ${chWidth.toFixed(0)}px (50%)`;
    }
    drawDataLabel(ctx, (p1.x + mid.x) / 2, (p1.y + mid.y) / 2 - 14, label, options.color);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 3) return false;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];
    const mid = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

    const dx = mid.x - p1.x;
    const dy = mid.y - p1.y;

    // Test median line
    if (pointToLineDist(mouse, p1, mid) <= threshold) return true;
    // Test inside upper line
    const insideUp = { x: (mid.x + p2.x) / 2, y: (mid.y + p2.y) / 2 };
    if (pointToLineDist(mouse, insideUp, { x: insideUp.x + dx, y: insideUp.y + dy }) <= threshold) return true;
    // Test inside lower line
    const insideLow = { x: (mid.x + p3.x) / 2, y: (mid.y + p3.y) / 2 };
    if (pointToLineDist(mouse, insideLow, { x: insideLow.x + dx, y: insideLow.y + dy }) <= threshold) return true;
    return false;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
