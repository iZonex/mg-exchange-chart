// ── Heikin Ashi ─────────────────────────────────────────────────────────────
// Stateful OHLC transformation that smooths candles:
//   HA_Close = (O+H+L+C)/4
//   HA_Open  = (prevHA_Open + prevHA_Close)/2
//   HA_High  = max(H, HA_Open, HA_Close)
//   HA_Low   = min(L, HA_Open, HA_Close)

import type { Bar, Theme } from '../../api/types';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { renderCandlesticks } from './candlestick';

// HeikinAshiBar has the same shape as Bar, but values are transformed
export type HeikinAshiBar = Bar;

/** Transform regular bars into Heikin Ashi bars */
export function toHeikinAshi(bars: readonly Bar[]): HeikinAshiBar[] {
  if (bars.length === 0) return [];

  const result: HeikinAshiBar[] = [];

  // First bar
  const first = bars[0]!;
  const haClose0 = (first.open + first.high + first.low + first.close) / 4;
  const haOpen0 = (first.open + first.close) / 2;
  result.push({
    time: first.time,
    open: haOpen0,
    close: haClose0,
    high: Math.max(first.high, haOpen0, haClose0),
    low: Math.min(first.low, haOpen0, haClose0),
    volume: first.volume,
  });

  for (let i = 1; i < bars.length; i++) {
    const bar = bars[i]!;
    const prev = result[i - 1]!;

    const haClose = (bar.open + bar.high + bar.low + bar.close) / 4;
    const haOpen = (prev.open + prev.close) / 2;
    const haHigh = Math.max(bar.high, haOpen, haClose);
    const haLow = Math.min(bar.low, haOpen, haClose);

    result.push({
      time: bar.time,
      open: haOpen,
      close: haClose,
      high: haHigh,
      low: haLow,
      volume: bar.volume,
    });
  }

  return result;
}

/** Render Heikin Ashi candles (transforms then delegates to candlestick renderer) */
export function renderHeikinAshi(
  ctx: CanvasRenderingContext2D,
  bars: readonly Bar[],
  firstBarIndex: number,
  timeScale: TimeScale,
  priceScale: PriceScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
): void {
  const haBars = toHeikinAshi(bars);
  renderCandlesticks(ctx, haBars, firstBarIndex, timeScale, priceScale, theme, chartWidth, chartHeight);
}
