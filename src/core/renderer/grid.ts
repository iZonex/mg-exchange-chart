// ── Grid ────────────────────────────────────────────────────────────────────
// Background grid lines aligned to price and time axis ticks.

import type { Theme } from '../../api/types';
import type { RenderContext } from './render-context';
import type { PriceTick } from './price-axis';
import type { TimeTick } from './time-axis';

export function renderGrid(
  ctx: RenderContext | CanvasRenderingContext2D,
  priceTicks: PriceTick[],
  timeTicks: TimeTick[],
  theme: Theme,
  chartWidth: number,
  yTop: number,
  yBottom: number,
  showHorizontal = true,
  showVertical = true,
): void {
  if (!showHorizontal && !showVertical) return;

  ctx.strokeStyle = theme.gridLine;
  ctx.lineWidth = 1;

  ctx.beginPath();

  // Horizontal lines at each price tick
  if (showHorizontal) {
    for (const tick of priceTicks) {
      const y = Math.round(tick.y) + 0.5;
      if (y < yTop || y > yBottom) continue;
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
    }
  }

  // Vertical lines at each time tick — clipped to pane
  if (showVertical) {
    for (const tick of timeTicks) {
      const x = Math.round(tick.x) + 0.5;
      ctx.moveTo(x, yTop);
      ctx.lineTo(x, yBottom);
    }
  }

  ctx.stroke();
}
