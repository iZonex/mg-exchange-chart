// ── OHLC Bar Series ─────────────────────────────────────────────────────────
// Traditional OHLC bars: vertical line (high→low) with left tick (open)
// and right tick (close).

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../renderer/render-context';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { priceToY } from '../renderer/price-axis';
import { barIndexToX } from '../renderer/time-axis';

const TICK_WIDTH_RATIO = 0.35;

export function renderBarSeries(
  ctx: RenderContext | CanvasRenderingContext2D,
  bars: readonly Bar[],
  firstBarIndex: number,
  timeScale: TimeScale,
  priceScale: PriceScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
): void {
  const tickW = Math.max(2, Math.round(timeScale.barSpacing * TICK_WIDTH_RATIO));

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);
    if (x < -tickW || x > chartWidth + tickW) continue;

    const isBull = bar.close >= bar.open;
    const color = isBull ? theme.bullCandle : theme.bearCandle;

    const highY = priceToY(bar.high, priceScale, chartHeight);
    const lowY = priceToY(bar.low, priceScale, chartHeight);
    const openY = priceToY(bar.open, priceScale, chartHeight);
    const closeY = priceToY(bar.close, priceScale, chartHeight);

    const cx = Math.round(x) + 0.5;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical line (high to low)
    ctx.moveTo(cx, highY);
    ctx.lineTo(cx, lowY);

    // Left tick (open)
    ctx.moveTo(cx - tickW, openY);
    ctx.lineTo(cx, openY);

    // Right tick (close)
    ctx.moveTo(cx, closeY);
    ctx.lineTo(cx + tickW, closeY);

    ctx.stroke();
  }
}
