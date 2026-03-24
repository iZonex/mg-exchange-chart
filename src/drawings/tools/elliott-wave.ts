// ── Elliott Wave Tools ───────────────────────────────────────────────────────
// Impulse Wave (12345): 5-point pattern with auto-numbered labels
// Correction Wave (ABC): 3-point pattern

import type { DrawingOptions } from '../../api/types';
import { font } from '../../core/font';
import type { PixelPoint } from '../primitives/hit-test';
import { pointToSegmentDist } from '../primitives/hit-test';
import type { InternalDrawingTool } from '../engine';
import { applyLineStyle } from './utils';

function renderWave(
  ctx: CanvasRenderingContext2D,
  points: PixelPoint[],
  labels: string[],
  options: DrawingOptions,
): void {
  if (points.length < 2) return;

  // Lines
  applyLineStyle(ctx, options);
  ctx.strokeStyle = options.color;
  ctx.lineWidth = options.lineWidth;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Labels at each point
  ctx.font = font(13, 'bold');
  ctx.textAlign = 'center';
  ctx.fillStyle = options.color;
  for (let i = 0; i < points.length && i < labels.length; i++) {
    const p = points[i]!;
    const isTop = i > 0 ? p.y < points[i - 1]!.y : true;
    ctx.textBaseline = isTop ? 'bottom' : 'top';
    ctx.fillText(labels[i]!, p.x, p.y + (isTop ? -10 : 10));
  }

  // Fibonacci ratios between adjacent legs
  if (points.length >= 3) {
    ctx.font = font(9);
    ctx.textAlign = 'left';
    ctx.fillStyle = options.color;
    for (let i = 1; i < points.length - 1; i++) {
      const prevLeg = Math.abs(points[i]!.y - points[i - 1]!.y);
      const nextLeg = Math.abs(points[i + 1]!.y - points[i]!.y);
      if (prevLeg > 0) {
        const ratio = nextLeg / prevLeg;
        // Show as Fib ratio (0.382, 0.618, 1.0, 1.618, etc.)
        const mx = (points[i]!.x + points[i + 1]!.x) / 2 + 6;
        const my = (points[i]!.y + points[i + 1]!.y) / 2;
        ctx.globalAlpha = 0.6;
        ctx.fillText(ratio.toFixed(3), mx, my);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function hitTestWave(mouse: PixelPoint, points: PixelPoint[], threshold: number): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    if (pointToSegmentDist(mouse, points[i]!, points[i + 1]!) <= threshold) return true;
  }
  return false;
}

export const elliottImpulseTool: InternalDrawingTool = {
  name: 'elliott-impulse',
  icon: 'M2,20 L6,4 L10,12 L14,2 L18,16 L22,6',
  pointCount: 6, // 0(start), 1, 2, 3, 4, 5

  render(ctx, points, options) {
    renderWave(ctx, points, ['0', '1', '2', '3', '4', '5'], options);
  },
  hitTest(mouse, points, threshold) { return hitTestWave(mouse, points, threshold); },
  getHandles(points) { return [...points]; },
};

export const elliottCorrectionTool: InternalDrawingTool = {
  name: 'elliott-correction',
  icon: 'M4,8 L12,18 L16,6 L22,16',
  pointCount: 4, // start, A, B, C

  render(ctx, points, options) {
    renderWave(ctx, points, ['', 'A', 'B', 'C'], options);
  },
  hitTest(mouse, points, threshold) { return hitTestWave(mouse, points, threshold); },
  getHandles(points) { return [...points]; },
};

export const elliottTriangleTool: InternalDrawingTool = {
  name: 'elliott-triangle',
  icon: 'M2,16 L7,6 L12,14 L15,8 L18,12 L22,10',
  pointCount: 6, // start, A, B, C, D, E

  render(ctx, points, options) {
    renderWave(ctx, points, ['', 'A', 'B', 'C', 'D', 'E'], options);
  },
  hitTest(mouse, points, threshold) { return hitTestWave(mouse, points, threshold); },
  getHandles(points) { return [...points]; },
};
