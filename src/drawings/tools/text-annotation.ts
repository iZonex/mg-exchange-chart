// ── Text Annotation ─────────────────────────────────────────────────────────
// Freely placed text with customizable size, color, bold/italic.
// Supports: different font sizes via lineWidth param, color via color param.

import { pointDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

export const textAnnotationTool: InternalDrawingTool = {
  name: 'text',
  icon: 'T',
  pointCount: 1,

  render(ctx, points, options, _w, _h) {
    if (points.length < 1) return;
    const p = points[0]!;
    const text = options.text || 'Text';

    // lineWidth controls font size: 1=12px, 2=16px, 3=24px, 4=32px, 5=48px
    const sizeMap: Record<number, number> = { 1: 12, 2: 16, 3: 24, 4: 32, 5: 48 };
    const fontSize = sizeMap[Math.round(options.lineWidth)] ?? Math.max(12, options.lineWidth * 8);
    const bold = options.lineWidth >= 2 ? 'bold ' : '';

    ctx.font = font(fontSize, bold ? 'bold' : '');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Semi-transparent background for readability
    const metrics = ctx.measureText(text);
    const pad = 3;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(p.x - pad, p.y - pad, metrics.width + pad * 2, fontSize + pad * 2);

    // Text
    ctx.fillStyle = options.color;
    ctx.fillText(text, p.x, p.y);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 1) return false;
    return pointDist(mouse, points[0]!) <= Math.max(threshold, 35);
  },

  getHandles(points) {
    return points.slice(0, 1);
  },
};
