// ── Note Tool ───────────────────────────────────────────────────────────────
// Single-click note: multi-line text box with background and border.

import { pointDist } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';

export const noteTool: InternalDrawingTool = {
  name: 'note',
  icon: 'M4,4 L20,4 L20,20 L4,20 Z M8,9 L16,9 M8,13 L14,13',
  pointCount: 1,

  render(ctx, points, options, _w, _h) {
    if (points.length < 1) return;
    const p = points[0]!;
    const text = options.text || 'Note';
    const lines = text.split('\n');
    const fontSize = 11;
    const lineH = fontSize + 4;
    const pad = 8;

    ctx.font = font(fontSize);
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
    const boxW = maxW + pad * 2;
    const boxH = lines.length * lineH + pad * 2;

    // Background
    ctx.fillStyle = options.color + '20';
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1;
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(p.x + r, p.y);
    ctx.lineTo(p.x + boxW - r, p.y);
    ctx.quadraticCurveTo(p.x + boxW, p.y, p.x + boxW, p.y + r);
    ctx.lineTo(p.x + boxW, p.y + boxH - r);
    ctx.quadraticCurveTo(p.x + boxW, p.y + boxH, p.x + boxW - r, p.y + boxH);
    ctx.lineTo(p.x + r, p.y + boxH);
    ctx.quadraticCurveTo(p.x, p.y + boxH, p.x, p.y + boxH - r);
    ctx.lineTo(p.x, p.y + r);
    ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = options.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i]!, p.x + pad, p.y + pad + i * lineH);
    }
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 1) return false;
    return pointDist(mouse, { x: points[0]!.x + 40, y: points[0]!.y + 20 }) <= Math.max(threshold, 50);
  },

  getHandles(points) { return points.slice(0, 1); },
};
