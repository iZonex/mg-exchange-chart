// ── Legend ───────────────────────────────────────────────────────────────────
// Static OHLCV legend in top-left of main pane.
// Shows latest bar values or crosshair-hovered bar values.
// Also renders indicator value legends in oscillator panes.

import type { Bar, Theme } from '../../api/types';
import { font } from '../font';
import type { IndicatorInstance } from '../../indicators/engine';
import { formatPrice } from './price-axis';
import { t } from '../i18n';

/** Render OHLCV legend in the top-left of the main pane */
export function renderOHLCVLegend(
  ctx: CanvasRenderingContext2D,
  bar: Bar,
  theme: Theme,
  precision: number,
  x: number,
  y: number,
): void {
  const isBull = bar.close >= bar.open;
  ctx.font = font(11);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const items = [
    { key: t('open'), value: formatPrice(bar.open, precision) },
    { key: t('high'), value: formatPrice(bar.high, precision) },
    { key: t('low'), value: formatPrice(bar.low, precision) },
    { key: t('close'), value: formatPrice(bar.close, precision) },
    { key: t('volume'), value: formatVol(bar.volume) },
  ];

  let offsetX = x;
  for (const { key, value } of items) {
    ctx.fillStyle = theme.textMuted;
    ctx.fillText(key, offsetX, y);
    offsetX += ctx.measureText(key).width + 3;

    ctx.fillStyle = key === t('volume') ? theme.textSecondary : (isBull ? theme.bullCandle : theme.bearCandle);
    ctx.fillText(value, offsetX, y);
    offsetX += ctx.measureText(value).width + 10;
  }
}

/** Render indicator value legend in an oscillator pane */
export function renderIndicatorLegend(
  ctx: CanvasRenderingContext2D,
  inst: IndicatorInstance,
  barIndex: number,
  theme: Theme,
  x: number,
  y: number,
): void {
  const output = inst.outputs[barIndex];
  if (!output) return;

  ctx.font = font(10);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Indicator name
  ctx.fillStyle = theme.textMuted;
  ctx.fillText(inst.indicator.shortName, x, y);
  let offsetX = x + ctx.measureText(inst.indicator.shortName).width + 6;

  // Show each plot value
  for (const plot of inst.indicator.plots) {
    if (plot.type === 'band') continue; // skip band fills
    const val = output.values[plot.key];
    if (val === undefined) continue;

    ctx.fillStyle = plot.color ?? theme.textSecondary;
    const text = val.toFixed(2);
    ctx.fillText(text, offsetX, y);
    offsetX += ctx.measureText(text).width + 8;
  }
}

/** Render overlay indicator legends below the OHLCV legend */
export function renderOverlayLegend(
  ctx: CanvasRenderingContext2D,
  overlays: IndicatorInstance[],
  barIndex: number,
  theme: Theme,
  x: number,
  y: number,
): void {
  let offsetY = y;
  for (const inst of overlays) {
    renderIndicatorLegend(ctx, inst, barIndex, theme, x, offsetY);
    offsetY += 14;
  }
}

function formatVol(vol: number): string {
  if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(2) + 'B';
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(2) + 'M';
  if (vol >= 1_000) return (vol / 1_000).toFixed(2) + 'K';
  return vol.toFixed(2);
}
