// ── Session Breaks ──────────────────────────────────────────────────────────
// Vertical dashed lines at day boundaries (00:00 UTC).

import type { Bar, Theme } from '../../api/types';
import type { TimeScale } from './time-axis';
import { barIndexToX } from './time-axis';

export function renderSessionBreaks(
  ctx: CanvasRenderingContext2D,
  bars: readonly Bar[],
  firstBarIndex: number,
  timeScale: TimeScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
): void {
  if (bars.length < 2) return;

  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();

  let prevDay = -1;
  for (let i = 0; i < bars.length; i++) {
    const day = Math.floor(bars[i]!.time / 86400);
    if (prevDay !== -1 && day !== prevDay) {
      const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);
      if (x > 0 && x < chartWidth) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, chartHeight);
      }
    }
    prevDay = day;
  }

  ctx.stroke();
  ctx.setLineDash([]);
}
