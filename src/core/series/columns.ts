// ── Columns Series ──────────────────────────────────────────────────────────
// Vertical bars from zero-line to close price. Bull (close >= open) uses
// bullCandle, bear uses bearCandle. Like a histogram but for price.

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../renderer/render-context';
import type { PriceScale } from '../renderer/price-axis';
import type { TimeScale } from '../renderer/time-axis';
import { priceToY } from '../renderer/price-axis';
import { barIndexToX } from '../renderer/time-axis';

const BODY_WIDTH_RATIO = 0.7;
const MIN_BODY_WIDTH = 1;
const MAX_BODY_WIDTH = 40;

export function renderColumns(
  ctx: RenderContext | CanvasRenderingContext2D,
  bars: readonly Bar[],
  firstBarIndex: number,
  timeScale: TimeScale,
  priceScale: PriceScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
): void {
  if (bars.length === 0) return;

  const colWidth = Math.min(MAX_BODY_WIDTH, Math.max(MIN_BODY_WIDTH,
    Math.round(timeScale.barSpacing * BODY_WIDTH_RATIO)));
  const halfCol = colWidth / 2;

  // Zero line Y position
  const zeroY = priceToY(0, priceScale, chartHeight);

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);

    if (x + halfCol < 0 || x - halfCol > chartWidth) continue;

    const isBull = bar.close >= bar.open;
    ctx.fillStyle = isBull ? theme.bullCandle : theme.bearCandle;

    const closeY = priceToY(bar.close, priceScale, chartHeight);
    const colX = Math.round(x - halfCol);

    const top = Math.min(closeY, zeroY);
    const height = Math.max(1, Math.abs(closeY - zeroY));

    ctx.fillRect(colX, top, colWidth, height);
  }
}
