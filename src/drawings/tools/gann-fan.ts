// ── Gann Fan ────────────────────────────────────────────────────────────────
// Two-point tool: origin (p1) and scale point (p2).
// Draws multiple rays from origin at Gann angles: 1x1, 1x2, 2x1, 1x3, 3x1, etc.

import { pointToLineDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';

const GANN_ANGLES = [
  { label: '1x8', ratio: 8 },
  { label: '1x4', ratio: 4 },
  { label: '1x3', ratio: 3 },
  { label: '1x2', ratio: 2 },
  { label: '1x1', ratio: 1 },
  { label: '2x1', ratio: 0.5 },
  { label: '3x1', ratio: 1/3 },
  { label: '4x1', ratio: 0.25 },
  { label: '8x1', ratio: 0.125 },
];

export const gannFanTool: InternalDrawingTool = {
  name: 'gann-fan',
  icon: 'M4,20 L20,4 M4,20 L20,12 M4,20 L20,20',
  pointCount: 2,

  render(ctx, points, options, width, height) {
    if (points.length < 2) return;
    const [origin, scale] = [points[0]!, points[1]!];

    const unitX = scale.x - origin.x;
    const unitY = scale.y - origin.y;
    const isUp = unitY < 0;

    ctx.font = font(9);
    ctx.textBaseline = 'middle';

    for (let i = 0; i < GANN_ANGLES.length; i++) {
      const angle = GANN_ANGLES[i]!;
      const isCentral = angle.ratio === 1;

      const endX = origin.x + unitX * 4;
      const endY = origin.y + (isUp ? -1 : 1) * Math.abs(unitY) * angle.ratio * 4;

      applyLineStyle(ctx, options);
      ctx.strokeStyle = options.color;
      ctx.lineWidth = isCentral ? 2 : 0.8;
      ctx.globalAlpha = isCentral ? 1 : 0.5;

      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Label
      ctx.fillStyle = options.color;
      ctx.globalAlpha = 0.6;
      ctx.textAlign = 'left';
      const labelX = Math.min(endX, width - 30);
      const labelY = origin.y + (isUp ? -1 : 1) * Math.abs(unitY) * angle.ratio * 3.5;
      if (labelY > 0 && labelY < height) {
        ctx.fillText(angle.label, labelX + 4, labelY);
      }
      ctx.globalAlpha = 1;
    }
    ctx.setLineDash([]);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const origin = points[0]!;
    for (const angle of GANN_ANGLES) {
      const endX = origin.x + 1000;
      const endY = origin.y - 1000 * angle.ratio;
      if (pointToLineDist(mouse, origin, { x: endX, y: endY }) <= threshold) return true;
    }
    return false;
  },

  getHandles(points) {
    return points.slice(0, 2);
  },
};
