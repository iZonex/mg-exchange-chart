// ── Crosshair ───────────────────────────────────────────────────────────────
// Crosshair lines following mouse position. Shows OHLCV tooltip and
// price/time labels on the axes at the crosshair position.

import type { Bar, Theme } from '../../api/types';
import { font } from '../font';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { yToPrice, formatPrice } from '../renderer/price-axis';
import { xToBarIndex } from '../renderer/time-axis';
import { PRICE_AXIS_WIDTH } from '../renderer/price-axis';
import { TIME_AXIS_HEIGHT } from '../renderer/time-axis';

export interface CrosshairState {
  /** CSS pixel X (relative to chart area) */
  x: number;
  /** CSS pixel Y (relative to chart area) */
  y: number;
  /** Whether crosshair is visible */
  visible: boolean;
  /** Snapped bar index */
  barIndex: number;
  /** Snapped bar data */
  bar: Bar | null;
}

export function renderCrosshair(
  ctx: CanvasRenderingContext2D,
  state: CrosshairState,
  priceScale: PriceScale,
  timeScale: TimeScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
  precision: number,
  getBarTime: (index: number) => number | undefined,
  tradeMode = false,
): void {
  if (!state.visible) return;

  const { x, y } = state;

  // Dashed crosshair lines
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = theme.crosshairLine;
  ctx.lineWidth = 1;

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(0, y + 0.5);
  ctx.lineTo(chartWidth, y + 0.5);
  ctx.stroke();

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(x + 0.5, 0);
  ctx.lineTo(x + 0.5, chartHeight);
  ctx.stroke();

  ctx.setLineDash([]);

  // ── Price label on right axis ─────────────────────────────────────────────
  const price = yToPrice(y, priceScale, chartHeight);
  const priceLabel = formatPrice(price, precision);
  const labelH = 20;
  const labelY = y - labelH / 2;

  if (tradeMode) {
    // Trade mode: price label with "+" button integrated
    ctx.fillStyle = '#2962FF';
    ctx.fillRect(chartWidth, labelY, PRICE_AXIS_WIDTH, labelH);

    // "+" icon on left
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chartWidth + 4, y);
    ctx.lineTo(chartWidth + 12, y);
    ctx.moveTo(chartWidth + 8, y - 4);
    ctx.lineTo(chartWidth + 8, y + 4);
    ctx.stroke();

    // Price text
    ctx.fillStyle = '#ffffff';
    ctx.font = font(11, 'bold');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceLabel, chartWidth + 16, y);
  } else {
    ctx.fillStyle = theme.crosshairLabel;
    ctx.fillRect(chartWidth, labelY, PRICE_AXIS_WIDTH, labelH);
    ctx.fillStyle = theme.crosshairLabelText;
    ctx.font = font(11);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceLabel, chartWidth + 8, y);
  }

  // ── Time label on bottom axis ─────────────────────────────────────────────
  const barIdx = Math.round(xToBarIndex(x, timeScale));
  const time = getBarTime(barIdx);
  if (time !== undefined) {
    const d = new Date(time * 1000);
    const timeLabel = `${pad2(d.getHours())}:${pad2(d.getMinutes())} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
    const timeLabelW = ctx.measureText(timeLabel).width + 16;
    const timeLabelX = x - timeLabelW / 2;

    ctx.fillStyle = theme.crosshairLabel;
    ctx.fillRect(timeLabelX, chartHeight, timeLabelW, TIME_AXIS_HEIGHT);
    ctx.fillStyle = theme.crosshairLabelText;
    ctx.textAlign = 'center';
    ctx.fillText(timeLabel, x, chartHeight + TIME_AXIS_HEIGHT / 2);
  }

  // OHLCV tooltip moved to legend.ts — rendered in crosshair layer by Chart
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
