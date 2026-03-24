// ── Hollow Candle Series Renderer ───────────────────────────────────────────
// Like candlestick but bull candles have transparent body (just border),
// bear candles are filled solid.

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../renderer/render-context';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { priceToY } from '../renderer/price-axis';
import { barIndexToX } from '../renderer/time-axis';

const BODY_WIDTH_RATIO = 0.7;
const MIN_BODY_WIDTH = 1;
const MAX_BODY_WIDTH = 40;

export function renderHollowCandles(
  ctx: RenderContext | CanvasRenderingContext2D,
  bars: readonly Bar[],
  firstBarIndex: number,
  timeScale: TimeScale,
  priceScale: PriceScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
): void {
  const bodyWidth = Math.min(MAX_BODY_WIDTH, Math.max(MIN_BODY_WIDTH,
    Math.round(timeScale.barSpacing * BODY_WIDTH_RATIO)));
  const halfBody = bodyWidth / 2;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const dataIndex = firstBarIndex + i;
    const x = barIndexToX(dataIndex, timeScale, chartWidth);

    if (x + halfBody < 0 || x - halfBody > chartWidth) continue;

    const isBull = bar.close >= bar.open;
    const color = isBull ? theme.bullCandle : theme.bearCandle;
    const wickColor = isBull ? theme.bullCandleWick : theme.bearCandleWick;

    const openY = priceToY(bar.open, priceScale, chartHeight);
    const closeY = priceToY(bar.close, priceScale, chartHeight);
    const highY = priceToY(bar.high, priceScale, chartHeight);
    const lowY = priceToY(bar.low, priceScale, chartHeight);

    const bodyTop = Math.min(openY, closeY);
    const bodyBottom = Math.max(openY, closeY);
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

    // Wick
    const wickX = Math.round(x) + 0.5;
    ctx.strokeStyle = wickColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(wickX, highY);
    ctx.lineTo(wickX, lowY);
    ctx.stroke();

    const bodyX = Math.round(x - halfBody);

    if (isBull) {
      // Bull: hollow (just border)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(bodyX + 0.5, bodyTop + 0.5, bodyWidth - 1, bodyHeight - 1);
    } else {
      // Bear: filled solid
      ctx.fillStyle = color;
      ctx.fillRect(bodyX, bodyTop, bodyWidth, bodyHeight);
    }
  }
}
