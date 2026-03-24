// ── Watermark ───────────────────────────────────────────────────────────────
// Large semi-transparent symbol name rendered behind chart data.

import type { Theme, Timeframe } from '../../api/types';
import { font } from '../font';

export function renderWatermark(
  ctx: CanvasRenderingContext2D,
  symbol: string,
  timeframe: Timeframe,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
): void {
  ctx.save();
  ctx.fillStyle = theme.name === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  ctx.font = font(64, 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, chartWidth / 2, chartHeight / 2 - 20);

  ctx.font = font(28, 'bold');
  ctx.fillText(timeframe, chartWidth / 2, chartHeight / 2 + 30);
  ctx.restore();
}
