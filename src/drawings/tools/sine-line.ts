// ── Sine Line ───────────────────────────────────────────────────────────────
// 2-point: sine wave with wavelength = distance between points.

import type { InternalDrawingTool } from '../engine';
import { font } from '../../core/font';

export const sineLineTool: InternalDrawingTool = {
  name: 'sine-line',
  icon: 'M2,12 C6,2 10,22 14,12 C18,2 22,22 26,12',
  pointCount: 2,

  render(ctx, points, options, width, _h) {
    if (points.length < 2) return;
    const [p1, p2] = [points[0]!, points[1]!];
    const wavelength = Math.abs(p2.x - p1.x) * 2;
    const amplitude = Math.abs(p2.y - p1.y);
    const centerY = (p1.y + p2.y) / 2;
    if (wavelength < 4) return;

    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.beginPath();

    for (let x = 0; x <= width; x += 2) {
      const phase = ((x - p1.x) / wavelength) * Math.PI * 2;
      const y = centerY + Math.sin(phase) * amplitude;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Labels: wavelength + amplitude
    const data = (options as any)._lineData as { bars: number; deltaPrice: number } | undefined;
    ctx.font = font(10);
    ctx.fillStyle = options.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.globalAlpha = 0.7;
    if (data) {
      ctx.fillText(`\u03BB ${data.bars * 2} bars | A ${Math.abs(data.deltaPrice).toFixed(2)}`, p1.x + 4, p1.y - 4);
    } else {
      ctx.fillText(`\u03BB ${(wavelength / 10).toFixed(0)}px | A ${amplitude.toFixed(0)}px`, p1.x + 4, p1.y - 4);
    }
    ctx.globalAlpha = 1;
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const wavelength = Math.abs(points[1]!.x - points[0]!.x) * 2;
    const amplitude = Math.abs(points[1]!.y - points[0]!.y);
    const centerY = (points[0]!.y + points[1]!.y) / 2;
    if (wavelength < 4) return false;

    const phase = ((mouse.x - points[0]!.x) / wavelength) * Math.PI * 2;
    const expectedY = centerY + Math.sin(phase) * amplitude;
    return Math.abs(mouse.y - expectedY) <= threshold;
  },

  getHandles(points) { return points.slice(0, 2); },
};
