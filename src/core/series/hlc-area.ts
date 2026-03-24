// ── HLC Area Series ─────────────────────────────────────────────────────────
// Shows High-Low as a filled band area, with Close as a line through
// the middle. High-Low band uses volumeBull/volumeBear with alpha.
// Close line uses lineDefault.

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../renderer/render-context';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { priceToY } from '../renderer/price-axis';
import { barIndexToX } from '../renderer/time-axis';

export function renderHlcArea(
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
  const points: { x: number; highY: number; lowY: number; closeY: number; isBull: boolean }[] = [];
  for (let i = 0; i < bars.length; i++) {
    const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);
    if (x < -50 || x > chartWidth + 50) continue;
    const bar = bars[i]!;
    points.push({
      x,
      highY: priceToY(bar.high, priceScale, chartHeight),
      lowY: priceToY(bar.low, priceScale, chartHeight),
      closeY: priceToY(bar.close, priceScale, chartHeight),
      isBull: bar.close >= bar.open,
    });
  }

  if (points.length < 2) return;

  // Draw High-Low band fill
  ctx.beginPath();
  // Top edge (highs, left to right)
  ctx.moveTo(points[0]!.x, points[0]!.highY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.highY);
  }
  // Bottom edge (lows, right to left)
  for (let i = points.length - 1; i >= 0; i--) {
    ctx.lineTo(points[i]!.x, points[i]!.lowY);
  }
  ctx.closePath();

  // Use volumeBull color with alpha for the band
  ctx.fillStyle = theme.volumeBull + '40'; // 25% opacity
  ctx.fill();

  // Draw close line
  ctx.strokeStyle = theme.lineDefault;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.closeY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.closeY);
  }
  ctx.stroke();
}
