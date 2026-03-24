// ── Step Line Series ────────────────────────────────────────────────────────
// Connects bars with horizontal-then-vertical steps (no diagonal lines).
// Each bar's close creates a horizontal line to the next bar's time,
// then steps vertically to the next close.

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../renderer/render-context';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { priceToY } from '../renderer/price-axis';
import { barIndexToX } from '../renderer/time-axis';

export function renderStepLine(
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

  ctx.strokeStyle = theme.lineDefault;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  ctx.beginPath();

  let moved = false;
  let prevY = 0;

  for (let i = 0; i < bars.length; i++) {
    const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);
    if (x < -50 || x > chartWidth + 50) {
      if (!moved) continue;
    }

    const y = priceToY(bars[i]!.close, priceScale, chartHeight);

    if (!moved) {
      ctx.moveTo(x, y);
      moved = true;
    } else {
      // Horizontal step to the new x at the previous y level
      ctx.lineTo(x, prevY);
      // Vertical step to the new y
      ctx.lineTo(x, y);
    }

    prevY = y;
  }

  ctx.stroke();
}
