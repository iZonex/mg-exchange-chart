// ── Anchored VWAP ──────────────────────────────────────────────────────────
// Single-click tool that draws VWAP line starting from the clicked bar.
// The chart computes VWAP from the anchor bar forward and injects _vwapData
// as an array of {x, y} pixel points via drawing-data-injector.ts.

import { pointToHorizontalLineDist } from '../primitives/hit-test';
import type { PixelPoint } from '../primitives/hit-test';
import { font } from '../../core/font';
import { t } from '../../core/i18n';
import { drawDataLabel } from '../primitives/label';
import type { DrawingOptions } from '../../api/types';

export const anchoredVwapTool = {
  name: 'anchored-vwap',
  icon: 'M2,16 Q8,4 14,12 Q18,18 22,8',
  pointCount: 1,

  render(
    ctx: CanvasRenderingContext2D,
    points: PixelPoint[],
    options: DrawingOptions,
    _width: number,
    _height: number,
  ): void {
    if (points.length < 1) return;
    const anchor = points[0]!;

    // VWAP data points injected by chart
    const vwapData = (options as any)._vwapData as PixelPoint[] | undefined;

    if (vwapData && vwapData.length >= 2) {
      // Draw the VWAP line through all data points
      ctx.strokeStyle = options.color;
      ctx.lineWidth = options.lineWidth;
      ctx.beginPath();
      ctx.moveTo(vwapData[0]!.x, vwapData[0]!.y);
      for (let i = 1; i < vwapData.length; i++) {
        ctx.lineTo(vwapData[i]!.x, vwapData[i]!.y);
      }
      ctx.stroke();

      // "AVWAP" label at the start of the line
      drawDataLabel(ctx, vwapData[0]!.x + 30, vwapData[0]!.y - 12, t('avwap'), options.color, 10);
    } else {
      // No data yet — draw a marker at anchor point with label
      ctx.fillStyle = options.color;
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = font(10);
      ctx.fillStyle = options.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(t('avwap'), anchor.x + 8, anchor.y - 4);
    }
  },

  hitTest(mouse: PixelPoint, points: PixelPoint[], threshold: number): boolean {
    if (points.length < 1) return false;

    // Check if near the anchor point
    const anchor = points[0]!;
    const dx = mouse.x - anchor.x;
    const dy = mouse.y - anchor.y;
    if (Math.sqrt(dx * dx + dy * dy) <= threshold * 2) return true;

    // If vwap data is not available in hit-test context, just test anchor Y
    return pointToHorizontalLineDist(mouse, anchor.y) <= threshold && mouse.x >= anchor.x - threshold;
  },

  getHandles(points: PixelPoint[]): PixelPoint[] {
    if (points.length < 1) return [];
    return [{ x: points[0]!.x, y: points[0]!.y }];
  },
};
