// ── Info Line ───────────────────────────────────────────────────────────────
// 2-point trend line that shows angle, bar count, price diff, and % change.

import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';

export const infoLineTool: InternalDrawingTool = {
  name: 'info-line',
  icon: 'M4,20 L20,4 M16,4 L20,4 L20,8',
  pointCount: 2,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    // Line
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Compute info
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(-dy, dx) * (180 / Math.PI); // negative because Y is inverted
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Price data from _lineData (injected by chart)
    const data = (options as any)._lineData as { angle: number; bars: number; deltaPrice: number; pctChange: number } | undefined;

    let infoText: string;
    if (data) {
      const sign = data.deltaPrice >= 0 ? '+' : '';
      infoText = `${angle.toFixed(1)}\u00B0 | ${data.bars} bars | ${sign}${data.deltaPrice.toFixed(2)} (${sign}${data.pctChange.toFixed(2)}%)`;
    } else {
      infoText = `${angle.toFixed(1)}\u00B0 | ${distance.toFixed(0)}px`;
    }

    // Label at midpoint
    drawDataLabel(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 10, infoText, options.color);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    return pointToSegmentDist(mouse, points[0]!, points[1]!) <= threshold;
  },

  getHandles(points) { return points.slice(0, 2); },
};
