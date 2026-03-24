// ── Price Axis ──────────────────────────────────────────────────────────────
// Right-side price scale: converts price↔pixel, generates ticks, renders labels.

import type { Theme, PriceScaleMode } from '../../api/types';
import { font } from '../font';
import type { RenderContext } from './render-context';

export const PRICE_AXIS_WIDTH = 70;

export interface PriceScale {
  /** Visible price range min (bottom of chart) */
  min: number;
  /** Visible price range max (top of chart) */
  max: number;
  /** Scale mode */
  mode: PriceScaleMode;
}

/** Convert price to Y pixel (top of chart area = max price, bottom = min price) */
export function priceToY(price: number, scale: PriceScale, chartHeight: number): number {
  if (scale.mode === 'logarithmic') {
    const logMin = Math.log(scale.min);
    const logMax = Math.log(scale.max);
    if (logMax === logMin) return chartHeight / 2;
    return chartHeight * (1 - (Math.log(price) - logMin) / (logMax - logMin));
  }
  // Linear
  const range = scale.max - scale.min;
  if (range === 0) return chartHeight / 2;
  return chartHeight * (1 - (price - scale.min) / range);
}

/** Convert Y pixel to price */
export function yToPrice(y: number, scale: PriceScale, chartHeight: number): number {
  const ratio = 1 - y / chartHeight;
  if (scale.mode === 'logarithmic') {
    const logMin = Math.log(scale.min);
    const logMax = Math.log(scale.max);
    return Math.exp(logMin + ratio * (logMax - logMin));
  }
  return scale.min + ratio * (scale.max - scale.min);
}

export interface PriceTick {
  price: number;
  y: number;
  label: string;
}

/** Generate nice price ticks for the visible range */
export function generatePriceTicks(
  scale: PriceScale,
  chartHeight: number,
  precision: number,
): PriceTick[] {
  const minTickSpacing = 40; // minimum pixels between ticks
  const range = scale.max - scale.min;
  if (range <= 0) return [];

  // Calculate tick step: find a "nice" number
  const rawStep = range / (chartHeight / minTickSpacing);
  const step = niceStep(rawStep);

  const ticks: PriceTick[] = [];
  const first = Math.ceil(scale.min / step) * step;

  for (let price = first; price <= scale.max; price += step) {
    const y = priceToY(price, scale, chartHeight);
    if (y < 0 || y > chartHeight) continue;
    ticks.push({
      price,
      y,
      label: formatPrice(price, precision),
    });
  }

  return ticks;
}

/** Render the price axis column on the right */
export function renderPriceAxis(
  ctx: RenderContext | CanvasRenderingContext2D,
  ticks: PriceTick[],
  theme: Theme,
  xLeft: number,
  yTop: number,
  height: number,
): void {
  // Background
  ctx.fillStyle = theme.bg;
  ctx.fillRect(xLeft, yTop, PRICE_AXIS_WIDTH, height);

  // Left border
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(xLeft + 0.5, yTop);
  ctx.lineTo(xLeft + 0.5, yTop + height);
  ctx.stroke();

  // Labels
  ctx.fillStyle = theme.textSecondary;
  ctx.font = font(11);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (const tick of ticks) {
    ctx.fillText(tick.label, xLeft + 8, tick.y);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Round to a "nice" step size (1, 2, 5 × 10^n) */
function niceStep(raw: number): number {
  const exp = Math.floor(Math.log10(raw));
  const fraction = raw / Math.pow(10, exp);
  let nice: number;
  if (fraction <= 1.5) nice = 1;
  else if (fraction <= 3.5) nice = 2;
  else if (fraction <= 7.5) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}

/** Format price with given decimal precision */
export function formatPrice(price: number, precision: number): string {
  return price.toFixed(precision);
}

/** Auto-detect precision from a price value */
export function detectPrecision(price: number): number {
  if (price >= 1000) return 2;
  if (price >= 1) return 2;
  if (price >= 0.01) return 4;
  if (price >= 0.0001) return 6;
  return 8;
}
