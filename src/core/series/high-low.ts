// ── High-Low Series ─────────────────────────────────────────────────────────
// Shows only High and Low as two lines with fill between them.
// No open/close shown. Upper line uses bullCandle, lower line uses bearCandle,
// fill area uses volumeBull with alpha.

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../renderer/render-context';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { priceToY } from '../renderer/price-axis';
import { barIndexToX } from '../renderer/time-axis';

export function renderHighLow(
  ctx: RenderContext | CanvasRenderingContext2D,
  bars: readonly Bar[],
  firstBarIndex: number,
  timeScale: TimeScale,
  priceScale: PriceScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
): void {
  if (bars.length === 0) return;

  // Collect visible points
  const points: { x: number; highY: number; lowY: number }[] = [];
  for (let i = 0; i < bars.length; i++) {
    const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);
    if (x < -50 || x > chartWidth + 50) continue;
    const bar = bars[i]!;
    points.push({
      x,
      highY: priceToY(bar.high, priceScale, chartHeight),
      lowY: priceToY(bar.low, priceScale, chartHeight),
    });
  }

  if (points.length < 2) return;

  // Fill between high and low
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.highY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.highY);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    ctx.lineTo(points[i]!.x, points[i]!.lowY);
  }
  ctx.closePath();
  ctx.fillStyle = theme.volumeBull + '30'; // ~19% opacity
  ctx.fill();

  // High line
  ctx.strokeStyle = theme.bullCandle;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.highY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.highY);
  }
  ctx.stroke();

  // Low line
  ctx.strokeStyle = theme.bearCandle;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.lowY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.lowY);
  }
  ctx.stroke();
}
