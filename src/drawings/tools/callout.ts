// ── Callout / Badge Tool ────────────────────────────────────────────────────
// Single-click callout: rounded badge with text and optional pointer arrow.
// "38,2% Fibo lvl" stickers.

import { pointDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

export const calloutTool: InternalDrawingTool = {
  name: 'callout',
  icon: 'M4,4 L20,4 L20,16 L12,16 L8,20 L8,16 L4,16 Z',
  pointCount: 1,

  render(ctx, points, options, _w, _h) {
    if (points.length < 1) return;
    const p = points[0]!;
    const text = options.text || 'Label';
    const fontSize = Math.max(10, (options.lineWidth || 1.5) * 8);

    ctx.font = font(fontSize, 'bold');
    const metrics = ctx.measureText(text);
    const tw = metrics.width;
    const th = fontSize + 4;
    const pad = 8;
    const badgeW = tw + pad * 2;
    const badgeH = th + pad;
    const bx = p.x - badgeW / 2;
    const by = p.y - badgeH - 8; // above the point
    const r = 6; // border radius

    // Rounded rect background
    ctx.fillStyle = options.color;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + badgeW - r, by);
    ctx.quadraticCurveTo(bx + badgeW, by, bx + badgeW, by + r);
    ctx.lineTo(bx + badgeW, by + badgeH - r);
    ctx.quadraticCurveTo(bx + badgeW, by + badgeH, bx + badgeW - r, by + badgeH);
    // Pointer triangle
    ctx.lineTo(p.x + 6, by + badgeH);
    ctx.lineTo(p.x, p.y);
    ctx.lineTo(p.x - 6, by + badgeH);
    ctx.lineTo(bx + r, by + badgeH);
    ctx.quadraticCurveTo(bx, by + badgeH, bx, by + badgeH - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = font(fontSize, 'bold');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, p.x, by + badgeH / 2);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 1) return false;
    return pointDist(mouse, { x: points[0]!.x, y: points[0]!.y - 20 }) <= Math.max(threshold, 30);
  },

  getHandles(points) {
    return points.slice(0, 1);
  },
};
