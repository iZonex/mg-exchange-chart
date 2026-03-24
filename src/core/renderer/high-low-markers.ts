// ── 24h High/Low Markers ────────────────────────────────────────────────────
// Dashed horizontal lines at the 24h high and 24h low prices.

import type { Bar, Theme } from '../../api/types';
import { font } from '../font';
import type { PriceScale } from './price-axis';
import { priceToY, formatPrice } from './price-axis';
import { t } from '../i18n';

export function render24hHighLow(
  ctx: CanvasRenderingContext2D,
  bars: readonly Bar[],
  priceScale: PriceScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
  precision: number,
): void {
  if (bars.length === 0) return;

  // Find 24h high/low from the last ~24h of data
  const now = bars[bars.length - 1]!.time;
  const oneDayAgo = now - 86400;

  let high = -Infinity, low = Infinity;
  for (let i = bars.length - 1; i >= 0; i--) {
    if (bars[i]!.time < oneDayAgo) break;
    if (bars[i]!.high > high) high = bars[i]!.high;
    if (bars[i]!.low < low) low = bars[i]!.low;
  }

  if (high === -Infinity) return;

  // Render high line
  const highY = priceToY(high, priceScale, chartHeight);
  if (highY > 0 && highY < chartHeight) {
    ctx.strokeStyle = theme.bullCandle;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(0, Math.round(highY) + 0.5);
    ctx.lineTo(chartWidth, Math.round(highY) + 0.5);
    ctx.stroke();

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = theme.bullCandle;
    ctx.font = font(9);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${t('high24h')}: ${formatPrice(high, precision)}`, chartWidth - 4, highY - 2);
    ctx.globalAlpha = 1;
  }

  // Render low line
  const lowY = priceToY(low, priceScale, chartHeight);
  if (lowY > 0 && lowY < chartHeight) {
    ctx.strokeStyle = theme.bearCandle;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(lowY) + 0.5);
    ctx.lineTo(chartWidth, Math.round(lowY) + 0.5);
    ctx.stroke();

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = theme.bearCandle;
    ctx.font = font(9);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${t('low24h')}: ${formatPrice(low, precision)}`, chartWidth - 4, lowY + 2);
    ctx.globalAlpha = 1;
  }

  ctx.setLineDash([]);
}
