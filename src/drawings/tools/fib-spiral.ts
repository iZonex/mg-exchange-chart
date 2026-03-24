// ── Fib Spiral ──────────────────────────────────────────────────────────────
// 2-point: golden spiral from p1 (center) with scale defined by p2.

import { pointDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

const PHI = 1.618033988749895;

export const fibSpiralTool: InternalDrawingTool = {
  name: 'fib-spiral',
  icon: 'M12,12 C12,8 16,4 20,4 C24,4 24,12 20,12',
  pointCount: 2,

  render(ctx, points, options, _w, _h) {
    if (points.length < 2) return;
    const [center, edge] = [points[0]!, points[1]!];
    const baseR = pointDist(center, edge);
    if (baseR < 2) return;

    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();

    const turns = 6;
    const steps = turns * 90;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / 90) * (Math.PI / 2);
      const r = baseR * Math.pow(PHI, i / 90 - 2);
      const x = center.x + Math.cos(angle) * r;
      const y = center.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Label: φ ratio + scale
    ctx.font = font(10);
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`\u03C6 = ${PHI.toFixed(3)} | r = ${baseR.toFixed(0)}px | ${turns} turns`, center.x + 4, center.y - 4);
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, _threshold) {
    if (points.length < 2) return false;
    return pointDist(mouse, points[0]!) <= pointDist(points[0]!, points[1]!) * 3;
  },

  getHandles(points) { return points.slice(0, 2); },
};
