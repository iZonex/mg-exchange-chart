// ── Candlestick Series Renderer ─────────────────────────────────────────────
// Renders OHLCV candlesticks on canvas. Handles bar width, bull/bear colors,
// proper wick and body drawing with crisp pixel alignment.

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../renderer/render-context';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { priceToY } from '../renderer/price-axis';
import { barIndexToX } from '../renderer/time-axis';

/** Ratio of candle body width to bar spacing (rest is gap) */
const BODY_WIDTH_RATIO = 0.7;
const MIN_BODY_WIDTH = 1;
const MAX_BODY_WIDTH = 40;

export function renderCandlesticks(
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
  const wickWidth = bodyWidth >= 4 ? 1 : 1;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const dataIndex = firstBarIndex + i;
    const x = barIndexToX(dataIndex, timeScale, chartWidth);

    // Skip bars outside visible area (with some margin)
    if (x + halfBody < 0 || x - halfBody > chartWidth) continue;

    const isBull = bar.close >= bar.open;
    const bodyColor = isBull ? theme.bullCandle : theme.bearCandle;
    const wickColor = isBull ? theme.bullCandleWick : theme.bearCandleWick;

    const openY = priceToY(bar.open, priceScale, chartHeight);
    const closeY = priceToY(bar.close, priceScale, chartHeight);
    const highY = priceToY(bar.high, priceScale, chartHeight);
    const lowY = priceToY(bar.low, priceScale, chartHeight);

    const bodyTop = Math.min(openY, closeY);
    const bodyBottom = Math.max(openY, closeY);
    const bodyHeight = Math.max(1, bodyBottom - bodyTop); // at least 1px body

    // Wick (high to low, thin line through center)
    const wickX = Math.round(x) + 0.5;
    ctx.strokeStyle = wickColor;
    ctx.lineWidth = wickWidth;
    ctx.beginPath();
    ctx.moveTo(wickX, highY);
    ctx.lineTo(wickX, lowY);
    ctx.stroke();

    // Body (filled rectangle)
    ctx.fillStyle = bodyColor;
    const bodyX = Math.round(x - halfBody);
    ctx.fillRect(bodyX, bodyTop, bodyWidth, bodyHeight);

    // If body is wide enough, draw a border for bear candles (hollow style option)
    // For now, all candles are filled — matches Binance/Bybit default
  }
}
