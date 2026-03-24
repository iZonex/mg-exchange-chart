// ── Area Series ─────────────────────────────────────────────────────────────
// Renders close prices as a line with gradient fill below.

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../renderer/render-context';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { priceToY } from '../renderer/price-axis';
import { barIndexToX } from '../renderer/time-axis';

export function renderAreaSeries(
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
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < bars.length; i++) {
    const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);
    if (x < -50 || x > chartWidth + 50) continue;
    const y = priceToY(bars[i]!.close, priceScale, chartHeight);
    points.push({ x, y });
  }

  if (points.length < 2) return;

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
  gradient.addColorStop(0, theme.lineDefault + '40'); // 25% opacity
  gradient.addColorStop(1, theme.lineDefault + '05'); // ~2% opacity

  ctx.beginPath();
  ctx.moveTo(points[0]!.x, chartHeight); // bottom-left
  for (const p of points) {
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(points[points.length - 1]!.x, chartHeight); // bottom-right
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line on top
  ctx.strokeStyle = theme.lineDefault;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.stroke();
}
