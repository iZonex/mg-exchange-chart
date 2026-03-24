// ── Price Marker ────────────────────────────────────────────────────────────
// Renders the current (last) price as:
// 1. A dashed horizontal line across the chart
// 2. A colored badge on the price axis
// Green if close >= open (bull), red if close < open (bear).

import type { Bar, Theme, Timeframe } from '../../api/types';
import { font } from '../font';
import type { RenderContext } from './render-context';
import type { PriceScale } from './price-axis';
import { priceToY, formatPrice, PRICE_AXIS_WIDTH } from './price-axis';

const TF_SECONDS: Record<string, number> = {
  '1s':1,'5s':5,'15s':15,'30s':30,'1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,
  '1H':3600,'2H':7200,'4H':14400,'6H':21600,'8H':28800,'12H':43200,
  '1D':86400,'3D':259200,'1W':604800,'1M':2592000,
};

export function renderCurrentPriceMarker(
  ctx: RenderContext | CanvasRenderingContext2D,
  bar: Bar,
  priceScale: PriceScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
  precision: number,
  timeframe?: Timeframe,
): void {
  const y = priceToY(bar.close, priceScale, chartHeight);
  if (y < -10 || y > chartHeight + 10) return;

  const isBull = bar.close >= bar.open;
  const color = isBull ? theme.bullCandle : theme.bearCandle;
  const priceLabel = formatPrice(bar.close, precision);

  // Build countdown text
  let cdText = '';
  if (timeframe) {
    const intervalSec = TF_SECONDS[timeframe] ?? 3600;
    const barEnd = bar.time + intervalSec;
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, barEnd - now);
    if (remaining > 0) {
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      cdText = h > 0 ? `${h}:${p2(m)}:${p2(s)}` : `${m}:${p2(s)}`;
    }
  }


  // ── Horizontal dashed line across chart ────────────────────────────────
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(0, Math.round(y) + 0.5);
  ctx.lineTo(chartWidth, Math.round(y) + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── Price badge on the axis ───────────────────────────────────────────
  const badgeH = 20;
  const badgeY = Math.round(y) - badgeH / 2;
  const arrowSize = 5;
  const bx = chartWidth;

  // Badge background
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(bx, badgeY + badgeH / 2);
  ctx.lineTo(bx + arrowSize, badgeY);
  ctx.lineTo(bx + PRICE_AXIS_WIDTH, badgeY);
  ctx.lineTo(bx + PRICE_AXIS_WIDTH, badgeY + badgeH);
  ctx.lineTo(bx + arrowSize, badgeY + badgeH);
  ctx.closePath();
  ctx.fill();

  // Badge text — price
  ctx.fillStyle = '#ffffff';
  ctx.font = font(11, 'bold');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(priceLabel, bx + arrowSize + 4, Math.round(y));

  // ── Countdown badge below price badge ─────────────────────────────────
  if (cdText) {
    const cdBadgeY = badgeY + badgeH;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(bx + arrowSize, cdBadgeY, PRICE_AXIS_WIDTH - arrowSize, badgeH);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ffffff';
    ctx.font = font(11, 'bold');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(cdText, bx + arrowSize + 4, cdBadgeY + badgeH / 2);
  }
}

function p2(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

/** Render high/low markers for the visible range */
export function renderHighLowMarkers(
  ctx: CanvasRenderingContext2D,
  highPrice: number,
  lowPrice: number,
  highY: number,
  lowY: number,
  theme: Theme,
  precision: number,
): void {
  ctx.font = font(10);
  ctx.textBaseline = 'middle';

  // High marker
  ctx.fillStyle = theme.textMuted;
  ctx.textAlign = 'right';
  const highLabel = `← ${formatPrice(highPrice, precision)}`;
  // Position near the high point but don't overlap with candle
  ctx.fillText(highLabel, 80, highY - 2);

  // Low marker
  const lowLabel = `← ${formatPrice(lowPrice, precision)}`;
  ctx.fillText(lowLabel, 80, lowY + 2);
}
