// ── Schiff Pitchfork ────────────────────────────────────────────────────────
// Like Andrews' Pitchfork but the handle (p1) is moved to the midpoint
// between p1 and midpoint(p2, p3). Creates a less steep median line.
// Three-point tool: p1 (handle origin), p2 (left prong), p3 (right prong).

import { pointToLineDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';

export const schiffPitchforkTool: InternalDrawingTool = {
  name: 'schiff-pitchfork',
  icon: 'M12,4 L12,20 M6,10 L12,4 L18,10',
  pointCount: 3,

  render(ctx, points, options, width, height) {
    if (points.length < 3) return;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];

    // Schiff modification: handle = midpoint(p1, midpoint(p2, p3))
    const midP2P3 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
    const handle = { x: (p1.x + midP2P3.x) / 2, y: (p1.y + midP2P3.y) / 2 };

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;

    // Direction vector: handle → midpoint(p2, p3)
    const dx = midP2P3.x - handle.x;
    const dy = midP2P3.y - handle.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const scale = Math.max(width, height) * 2 / len;
    const endX = handle.x + dx * scale;
    const endY = handle.y + dy * scale;

    // Median line (handle → extended)
    ctx.beginPath();
    ctx.moveTo(handle.x, handle.y);
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
    const angle = Math.atan2(-(midP2P3.y - handle.y), midP2P3.x - handle.x) * (180 / Math.PI);
    const chWidth = Math.abs((p3.x - p2.x) * (dy / len) - (p3.y - p2.y) * (dx / len));
    const data = (options as any)._channelData as { priceWidth: number; pctWidth: number } | undefined;

    let label: string;
    if (data) {
      label = `${angle.toFixed(1)}\u00B0 | ${data.priceWidth.toFixed(2)} (${data.pctWidth.toFixed(2)}%)`;
    } else {
      label = `${angle.toFixed(1)}\u00B0 | ${chWidth.toFixed(0)}px`;
    }
    drawDataLabel(ctx, (handle.x + midP2P3.x) / 2, (handle.y + midP2P3.y) / 2 - 14, label, options.color);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 3) return false;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];

    // Schiff handle
    const midP2P3 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
    const handle = { x: (p1.x + midP2P3.x) / 2, y: (p1.y + midP2P3.y) / 2 };

    const dx = midP2P3.x - handle.x;
    const dy = midP2P3.y - handle.y;

    // Test median line
    if (pointToLineDist(mouse, handle, midP2P3) <= threshold) return true;
    // Test upper line
    if (pointToLineDist(mouse, p2, { x: p2.x + dx, y: p2.y + dy }) <= threshold) return true;
    // Test lower line
    if (pointToLineDist(mouse, p3, { x: p3.x + dx, y: p3.y + dy }) <= threshold) return true;
    return false;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
