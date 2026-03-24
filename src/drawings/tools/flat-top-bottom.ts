// ── Flat Top/Bottom Channel ─────────────────────────────────────────────────
// 3 points: p1-p2 define a flat horizontal line (share Y), p3 defines a
// sloped line endpoint. Creates a rising/falling wedge with one flat edge.

import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';
import { drawDataLabel } from '../primitives/label';
import { font } from '../../core/font';

export const flatTopBottomTool: InternalDrawingTool = {
  name: 'flat-top-bottom',
  icon: 'M2,8 L22,8 M2,16 L22,10',
  pointCount: 3,

  render(ctx, points, options, _width, _height) {
    if (points.length < 3) return;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];

    // Flat line: horizontal at p1.y from p1.x to p2.x
    const flatY = p1.y;

    applyLineStyle(ctx, options);
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;

    // Flat horizontal line
    ctx.beginPath();
    ctx.moveTo(p1.x, flatY);
    ctx.lineTo(p2.x, flatY);
    ctx.stroke();

    // Sloped line from p1.x to p3
    // The sloped line starts at (p1.x, p3.y projected) and goes to p3,
    // but more naturally: sloped line from (p1.x, slopeStartY) to (p2.x, slopeEndY)
    // where the slope is defined by p3's position relative to p1.
    // p3 gives the Y at its X position. We extrapolate the sloped line across p1.x..p2.x range.
    const _slopeStartY = p3.y - (p3.x - p1.x) / (p2.x - p1.x || 1) * (p3.y - p3.y);
    // Simpler: sloped line goes from (p1.x, y_at_p1x) to (p2.x, y_at_p2x)
    // p3 is an arbitrary point on the sloped line. The slope is (p3.y - flatY) / (p3.x - p1.x)
    // But the sloped line is independent — it goes through p3 with same time span as flat line.
    // Let's define: sloped line from (p1.x, sY1) to (p2.x, sY2) passing through p3.
    const t_param = (p2.x - p1.x) !== 0 ? (p3.x - p1.x) / (p2.x - p1.x) : 0;
    // p3.y = sY1 + t_param * (sY2 - sY1)
    // We need another constraint. Simplest: sloped line starts at p1.x with p3 defining the slope.
    // sY1 = p3.y - slope * (p3.x - p1.x), slope from vertical offset
    // Actually: the sloped line simply connects (p1.x, p3_projected_y_at_p1x) to (p2.x, p3_projected_y_at_p2x)
    // Let's just use p3 as the third vertex: flat line p1→p2 at flatY, sloped line from (p1.x, p3.y) to p2.x
    // with the slope determined by the p3 offset.
    // Cleanest interpretation: sloped bottom from (p1.x, p1.y + (p3.y - p1.y)) to (p2.x, ...)
    // Actually simplest: draw from p1 horizontal, and the slope line goes from directly below/above p1 at p3's Y-extrapolation.

    // Simplest correct interpretation:
    // Flat edge: y = flatY from x=p1.x to x=p2.x
    // Sloped edge: line through p3, parallel-ish, from x=p1.x to x=p2.x
    const dx = p2.x - p1.x;
    if (Math.abs(dx) < 1) return;
    const slope = t_param !== 0 ? (p3.y - p1.y) / (p3.x - p1.x) : 0;
    const sY1 = p3.y - slope * (p3.x - p1.x); // y at p1.x
    const sY2 = sY1 + slope * dx;              // y at p2.x

    ctx.beginPath();
    ctx.moveTo(p1.x, sY1);
    ctx.lineTo(p2.x, sY2);
    ctx.stroke();

    // Fill between flat and sloped
    ctx.fillStyle = options.color + '10';
    ctx.beginPath();
    ctx.moveTo(p1.x, flatY);
    ctx.lineTo(p2.x, flatY);
    ctx.lineTo(p2.x, sY2);
    ctx.lineTo(p1.x, sY1);
    ctx.closePath();
    ctx.fill();

    // Dashed middle line
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(p1.x, (flatY + sY1) / 2);
    ctx.lineTo(p2.x, (flatY + sY2) / 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    // Channel width label
    const chData = (options as any)._channelData as { priceWidth: number; pctWidth: number } | undefined;
    const midX = (p1.x + p2.x) / 2;
    const midY = (flatY + (sY1 + sY2) / 2) / 2;
    ctx.font = font(10);
    if (chData) {
      drawDataLabel(ctx, midX, midY - 14, `${chData.priceWidth.toFixed(2)} (${chData.pctWidth.toFixed(2)}%)`, options.color);
    } else {
      const pxWidth = Math.abs(flatY - (sY1 + sY2) / 2);
      drawDataLabel(ctx, midX, midY - 14, `${pxWidth.toFixed(0)}px`, options.color);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 3) return false;
    const [p1, p2, p3] = [points[0]!, points[1]!, points[2]!];
    const flatY = p1.y;

    // Flat line hit
    if (pointToSegmentDist(mouse, { x: p1.x, y: flatY }, { x: p2.x, y: flatY }) <= threshold) return true;

    // Sloped line hit
    const dx = p2.x - p1.x;
    if (Math.abs(dx) < 1) return false;
    const slope = (p3.y - p1.y) / (p3.x - p1.x || 1);
    const sY1 = p3.y - slope * (p3.x - p1.x);
    const sY2 = sY1 + slope * dx;
    if (pointToSegmentDist(mouse, { x: p1.x, y: sY1 }, { x: p2.x, y: sY2 }) <= threshold) return true;

    return false;
  },

  getHandles(points) {
    return points.slice(0, 3);
  },
};
