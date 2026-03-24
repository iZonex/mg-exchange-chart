// ── Volume Profile ──────────────────────────────────────────────────────────
// Horizontal histogram showing volume distribution at each price level.
// Divides the visible price range into N bins and accumulates volume.
// Rendered as a special overlay, not a standard indicator output.

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../../core/renderer/render-context';
import type { PriceScale } from '../../core/renderer/price-axis';
import { priceToY } from '../../core/renderer/price-axis';

const DEFAULT_BINS = 50;
const MAX_WIDTH_RATIO = 0.25; // max 25% of chart width

export interface VolumeProfileBin {
  priceFrom: number;
  priceTo: number;
  volume: number;
  buyVolume: number;  // volume where close > open
  sellVolume: number; // volume where close < open
}

/** Compute volume profile bins from bar data */
export function computeVolumeProfile(
  bars: readonly Bar[],
  priceMin: number,
  priceMax: number,
  numBins: number = DEFAULT_BINS,
): VolumeProfileBin[] {
  const range = priceMax - priceMin;
  if (range <= 0 || bars.length === 0) return [];

  const binSize = range / numBins;
  const bins: VolumeProfileBin[] = [];

  for (let i = 0; i < numBins; i++) {
    bins.push({
      priceFrom: priceMin + i * binSize,
      priceTo: priceMin + (i + 1) * binSize,
      volume: 0,
      buyVolume: 0,
      sellVolume: 0,
    });
  }

  for (const bar of bars) {
    // Distribute volume across the bar's price range
    const barMid = (bar.high + bar.low) / 2;
    const binIdx = Math.floor((barMid - priceMin) / binSize);
    if (binIdx >= 0 && binIdx < numBins) {
      const bin = bins[binIdx]!;
      bin.volume += bar.volume;
      if (bar.close >= bar.open) {
        bin.buyVolume += bar.volume;
      } else {
        bin.sellVolume += bar.volume;
      }
    }
  }

  return bins;
}

/** Render volume profile as horizontal bars on the left side of the chart */
export function renderVolumeProfile(
  ctx: RenderContext | CanvasRenderingContext2D,
  bins: VolumeProfileBin[],
  priceScale: PriceScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
): void {
  if (bins.length === 0) return;

  const maxVol = Math.max(...bins.map(b => b.volume));
  if (maxVol <= 0) return;

  const maxBarWidth = chartWidth * MAX_WIDTH_RATIO;

  for (const bin of bins) {
    if (bin.volume === 0) continue;

    const y1 = priceToY(bin.priceTo, priceScale, chartHeight);
    const y2 = priceToY(bin.priceFrom, priceScale, chartHeight);
    const barHeight = Math.max(1, y2 - y1);
    const totalWidth = (bin.volume / maxVol) * maxBarWidth;

    // Buy volume (green, drawn from left)
    const buyWidth = bin.buyVolume > 0 ? (bin.buyVolume / bin.volume) * totalWidth : 0;
    if (buyWidth > 0) {
      ctx.fillStyle = theme.volumeBull;
      ctx.fillRect(0, y1, buyWidth, barHeight);
    }

    // Sell volume (red, drawn after buy)
    const sellWidth = totalWidth - buyWidth;
    if (sellWidth > 0) {
      ctx.fillStyle = theme.volumeBear;
      ctx.fillRect(buyWidth, y1, sellWidth, barHeight);
    }
  }
}
