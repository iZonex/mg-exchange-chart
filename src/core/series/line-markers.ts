// ── Line with Markers Series ────────────────────────────────────────────────
// Renders close prices as a continuous line with small circle markers
// at each data point.

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../renderer/render-context';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { priceToY } from '../renderer/price-axis';
import { barIndexToX } from '../renderer/time-axis';

const MARKER_RADIUS = 3;

export function renderLineMarkers(
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

  if (points.length === 0) return;

  // Draw line
  ctx.strokeStyle = theme.lineDefault;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.stroke();

  // Draw markers
  ctx.fillStyle = theme.lineDefault;
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}
