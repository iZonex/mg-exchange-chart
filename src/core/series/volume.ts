// ── Volume Histogram ────────────────────────────────────────────────────────
// Renders volume bars at the bottom of the price pane as an overlay.
// Max volume bar = 25% of pane height. Bull/bear coloring from theme.

import type { Bar, Theme } from '../../api/types';
import type { RenderContext } from '../renderer/render-context';
import type { TimeScale } from '../renderer/time-axis';
import { barIndexToX } from '../renderer/time-axis';

/** Volume occupies bottom portion of chart area (leaves room for price action above) */
const DEFAULT_VOLUME_HEIGHT_RATIO = 0.15;
const BODY_WIDTH_RATIO = 0.7;
const MIN_BODY_WIDTH = 1;
const MAX_BODY_WIDTH = 40;

export function renderVolume(
  ctx: RenderContext | CanvasRenderingContext2D,
  bars: readonly Bar[],
  firstBarIndex: number,
  maxVolume: number,
  timeScale: TimeScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
): void {
  if (maxVolume <= 0) return;

  const volumeZoneHeight = chartHeight * (theme.volumeHeightRatio ?? DEFAULT_VOLUME_HEIGHT_RATIO);
  const bodyWidth = Math.min(MAX_BODY_WIDTH, Math.max(MIN_BODY_WIDTH,
    Math.round(timeScale.barSpacing * BODY_WIDTH_RATIO)));
  const halfBody = bodyWidth / 2;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const dataIndex = firstBarIndex + i;
    const x = barIndexToX(dataIndex, timeScale, chartWidth);

    if (x + halfBody < 0 || x - halfBody > chartWidth) continue;

    const isBull = bar.close >= bar.open;
    ctx.fillStyle = isBull ? theme.volumeBull : theme.volumeBear;

    const barHeight = (bar.volume / maxVolume) * volumeZoneHeight;
    const barX = Math.round(x - halfBody);
    const barY = chartHeight - barHeight;

    ctx.fillRect(barX, barY, bodyWidth, barHeight);
  }
}
