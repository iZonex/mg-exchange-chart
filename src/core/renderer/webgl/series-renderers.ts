// ── WebGL Specialized Series Renderers ─────────────────────────────────────
// Direct GPU-buffer renderers for the hot paths: candlesticks, volume, grid,
// indicator lines. These bypass the RenderContext abstraction entirely and
// write pre-computed RGBA floats into the batch renderer's typed arrays.
//
// The key optimization: theme colors are parsed ONCE (not per bar), and all
// coordinate math is inlined to avoid function call overhead.

import type { Bar, Theme } from '../../../api/types';
import type { PriceScale } from '../price-axis';
import type { TimeScale } from '../time-axis';
import type { PriceTick } from '../price-axis';
import type { TimeTick } from '../time-axis';
import type { PlotConfig, IndicatorOutput } from '../../../api/types';
import { WebGLBatchRenderer } from './batch-renderer';
import { parseColor } from './utils';

// ── Candlesticks ───────────────────────────────────────────────────────────
// All candles in 2 batch flushes: one for rects (bodies), one for lines (wicks).

const BODY_WIDTH_RATIO = 0.7;
const MIN_BODY_WIDTH = 1;
const MAX_BODY_WIDTH = 40;

export function renderCandlesticksWebGL(
  batch: WebGLBatchRenderer,
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

  // Parse theme colors ONCE
  const [bullR, bullG, bullB, bullA] = parseColor(theme.bullCandle);
  const [bearR, bearG, bearB, bearA] = parseColor(theme.bearCandle);
  const [bullWR, bullWG, bullWB, bullWA] = parseColor(theme.bullCandleWick);
  const [bearWR, bearWG, bearWB, bearWA] = parseColor(theme.bearCandleWick);

  // Price scale inlined
  const pMin = priceScale.min;
  const pRange = priceScale.max - pMin;
  const isLog = priceScale.mode === 'logarithmic';
  const logMin = isLog ? Math.log(pMin) : 0;
  const logRange = isLog ? Math.log(priceScale.max) - logMin : 0;

  // Time scale inlined
  const firstIdx = timeScale.firstIndex;
  const barSpacing = timeScale.barSpacing;
  const offsetX = timeScale.offsetX;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const relIdx = (firstBarIndex + i) - firstIdx;
    const x = relIdx * barSpacing + offsetX + barSpacing * 0.5;

    if (x + halfBody < 0 || x - halfBody > chartWidth) continue;

    const isBull = bar.close >= bar.open;

    // Price → Y (inlined)
    let openY: number, closeY: number, highY: number, lowY: number;
    if (isLog) {
      openY = chartHeight * (1 - (Math.log(bar.open) - logMin) / logRange);
      closeY = chartHeight * (1 - (Math.log(bar.close) - logMin) / logRange);
      highY = chartHeight * (1 - (Math.log(bar.high) - logMin) / logRange);
      lowY = chartHeight * (1 - (Math.log(bar.low) - logMin) / logRange);
    } else {
      openY = chartHeight * (1 - (bar.open - pMin) / pRange);
      closeY = chartHeight * (1 - (bar.close - pMin) / pRange);
      highY = chartHeight * (1 - (bar.high - pMin) / pRange);
      lowY = chartHeight * (1 - (bar.low - pMin) / pRange);
    }

    const bodyTop = openY < closeY ? openY : closeY;
    const bodyBottom = openY > closeY ? openY : closeY;
    const bodyH = bodyBottom - bodyTop < 1 ? 1 : bodyBottom - bodyTop;

    // Wick as 1px-wide rect (faster than line — avoids triangle-strip expansion)
    const wickX = Math.round(x) + 0.5;
    if (isBull) {
      batch.pushRectRGBA(wickX - 0.5, highY, 1, lowY - highY, bullWR, bullWG, bullWB, bullWA);
    } else {
      batch.pushRectRGBA(wickX - 0.5, highY, 1, lowY - highY, bearWR, bearWG, bearWB, bearWA);
    }

    // Body rect
    const bodyX = Math.round(x - halfBody);
    if (isBull) {
      batch.pushRectRGBA(bodyX, bodyTop, bodyWidth, bodyH, bullR, bullG, bullB, bullA);
    } else {
      batch.pushRectRGBA(bodyX, bodyTop, bodyWidth, bodyH, bearR, bearG, bearB, bearA);
    }
  }
}

// ── Volume ─────────────────────────────────────────────────────────────────

const DEFAULT_VOLUME_HEIGHT_RATIO = 0.15;

export function renderVolumeWebGL(
  batch: WebGLBatchRenderer,
  bars: readonly Bar[],
  firstBarIndex: number,
  maxVolume: number,
  timeScale: TimeScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
): void {
  if (maxVolume <= 0) return;

  const bodyWidth = Math.min(MAX_BODY_WIDTH, Math.max(MIN_BODY_WIDTH,
    Math.round(timeScale.barSpacing * BODY_WIDTH_RATIO)));
  const halfBody = bodyWidth / 2;
  const volumeZoneHeight = chartHeight * (theme.volumeHeightRatio ?? DEFAULT_VOLUME_HEIGHT_RATIO);

  const [bullR, bullG, bullB, bullA] = parseColor(theme.volumeBull);
  const [bearR, bearG, bearB, bearA] = parseColor(theme.volumeBear);

  const firstIdx = timeScale.firstIndex;
  const barSpacing = timeScale.barSpacing;
  const offsetX = timeScale.offsetX;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const relIdx = (firstBarIndex + i) - firstIdx;
    const x = relIdx * barSpacing + offsetX + barSpacing * 0.5;

    if (x + halfBody < 0 || x - halfBody > chartWidth) continue;

    const barHeight = (bar.volume / maxVolume) * volumeZoneHeight;
    const barX = Math.round(x - halfBody);
    const barY = chartHeight - barHeight;
    const isBull = bar.close >= bar.open;

    if (isBull) {
      batch.pushRectRGBA(barX, barY, bodyWidth, barHeight, bullR, bullG, bullB, bullA);
    } else {
      batch.pushRectRGBA(barX, barY, bodyWidth, barHeight, bearR, bearG, bearB, bearA);
    }
  }
}

// ── Grid Lines ─────────────────────────────────────────────────────────────

export function renderGridWebGL(
  batch: WebGLBatchRenderer,
  priceTicks: PriceTick[],
  timeTicks: TimeTick[],
  theme: Theme,
  chartWidth: number,
  yTop: number,
  yBottom: number,
): void {
  const [r, g, b, a] = parseColor(theme.gridLine);

  // Horizontal lines
  for (const tick of priceTicks) {
    const y = Math.round(tick.y) + 0.5;
    if (y < yTop || y > yBottom) continue;
    batch.pushRectRGBA(0, y - 0.5, chartWidth, 1, r, g, b, a);
  }

  // Vertical lines
  for (const tick of timeTicks) {
    const x = Math.round(tick.x) + 0.5;
    batch.pushRectRGBA(x - 0.5, yTop, 1, yBottom - yTop, r, g, b, a);
  }
}

// ── Indicator Lines ────────────────────────────────────────────────────────

export function renderIndicatorLineWebGL(
  batch: WebGLBatchRenderer,
  outputs: IndicatorOutput[],
  plot: PlotConfig,
  firstBarIndex: number,
  timeScale: TimeScale,
  chartWidth: number,
  yOffset: number,
  paneHeight: number,
  scaleMin: number,
  scaleMax: number,
): void {
  const [r, g, b, a] = parseColor(plot.color ?? '#ffffff');
  const lw = plot.lineWidth ?? 1.5;
  const range = scaleMax - scaleMin;

  const firstIdx = timeScale.firstIndex;
  const barSpacing = timeScale.barSpacing;
  const offsetX = timeScale.offsetX;

  let prevX = 0, prevY = 0, hasPrev = false;

  for (let i = 0; i < outputs.length; i++) {
    const val = outputs[i]?.values[plot.key];
    if (val === undefined) { hasPrev = false; continue; }

    const relIdx = (firstBarIndex + i) - firstIdx;
    const x = relIdx * barSpacing + offsetX + barSpacing * 0.5;
    if (x < -50 || x > chartWidth + 50) continue;

    const y = range === 0
      ? yOffset + paneHeight / 2
      : yOffset + paneHeight * (1 - (val - scaleMin) / range);

    if (hasPrev) {
      batch.pushLineRGBA(prevX, prevY, x, y, lw, r, g, b, a);
    }

    prevX = x;
    prevY = y;
    hasPrev = true;
  }
}

// ── Indicator Histogram ────────────────────────────────────────────────────

export function renderIndicatorHistogramWebGL(
  batch: WebGLBatchRenderer,
  outputs: IndicatorOutput[],
  plot: PlotConfig,
  firstBarIndex: number,
  timeScale: TimeScale,
  chartWidth: number,
  yOffset: number,
  paneHeight: number,
  scaleMin: number,
  scaleMax: number,
): void {
  const barWidth = Math.max(1, timeScale.barSpacing * 0.5);
  const range = scaleMax - scaleMin;
  const zeroY = range === 0
    ? yOffset + paneHeight / 2
    : yOffset + paneHeight * (1 - (0 - scaleMin) / range);

  // MACD histogram colors
  const [posR, posG, posB, posA] = parseColor('#26A69A');
  const [negR, negG, negB, negA] = parseColor('#EF5350');

  const firstIdx = timeScale.firstIndex;
  const barSpacing = timeScale.barSpacing;
  const offsetX = timeScale.offsetX;

  for (let i = 0; i < outputs.length; i++) {
    const val = outputs[i]?.values[plot.key];
    if (val === undefined) continue;

    const relIdx = (firstBarIndex + i) - firstIdx;
    const x = relIdx * barSpacing + offsetX + barSpacing * 0.5;
    if (x < -barWidth || x > chartWidth + barWidth) continue;

    const y = range === 0
      ? yOffset + paneHeight / 2
      : yOffset + paneHeight * (1 - (val - scaleMin) / range);

    const barX = Math.round(x - barWidth / 2);
    const barH = Math.abs(y - zeroY);
    const barY = val >= 0 ? y : zeroY;

    if (val >= 0) {
      batch.pushRectRGBA(barX, barY, Math.max(1, barWidth), barH, posR, posG, posB, posA);
    } else {
      batch.pushRectRGBA(barX, barY, Math.max(1, barWidth), barH, negR, negG, negB, negA);
    }
  }
}
