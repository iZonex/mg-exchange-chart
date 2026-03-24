// ── Price Range Measurement ──────────────────────────────────────────────────
// Two-point drawing that shows the price difference, percentage change,
// and number of bars between two points.

import { pointToSegmentDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';

export const priceRangeTool: InternalDrawingTool = {
  name: 'price-range',
  icon: 'M4,8 L4,16 M4,12 L20,12 M20,8 L20,16',
  pointCount: 2,

  render(ctx, points, options, _width, _height) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];

    // Connecting line
    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Horizontal and vertical dashed lines showing the components
    ctx.strokeStyle = options.color;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Info label at midpoint — use data attributes for real values
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    // Extract real price/time from _data property if available
    const data = (options as any)._priceData as { price1: number; price2: number; bars: number } | undefined;
    let label: string;
    if (data) {
      const priceDiff = data.price2 - data.price1;
      const pctDiff = data.price1 !== 0 ? ((data.price2 / data.price1) - 1) * 100 : 0;
      const arrow = priceDiff > 0 ? '↑' : '↓';
      label = `${arrow} ${Math.abs(priceDiff).toFixed(2)} (${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(2)}%) | ${data.bars} bars`;
    } else {
      const dy = Math.abs(p2.y - p1.y);
      const arrow = p2.y < p1.y ? '↑' : '↓';
      label = `${arrow} ${dy.toFixed(0)}px`;
    }

    ctx.font = font(11, 'bold');
    const metrics = ctx.measureText(label);
    const padding = 4;
    const labelW = metrics.width + padding * 2;
    const labelH = 16 + padding * 2;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(midX - labelW / 2, midY - labelH / 2, labelW, labelH);

    // Text
    ctx.fillStyle = p2.y < p1.y ? '#4CAF50' : '#EF5350';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, midX, midY);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    return pointToSegmentDist(mouse, points[0]!, points[1]!) <= threshold;
  },

  getHandles(points) {
    return points.slice(0, 2);
  },
};
