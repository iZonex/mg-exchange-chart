// ── Bar Countdown Timer ─────────────────────────────────────────────────────
// Shows time remaining until the current bar closes, displayed next to
// the last bar on the time axis.

import type { Theme, Timeframe } from '../../api/types';
import { font } from '../font';
import { TIME_AXIS_HEIGHT } from './time-axis';

function timeframeToSeconds(tf: Timeframe): number {
  const m: Record<string, number> = {
    '1s':1,'5s':5,'15s':15,'30s':30,'1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,
    '1H':3600,'2H':7200,'4H':14400,'6H':21600,'8H':28800,'12H':43200,
    '1D':86400,'3D':259200,'1W':604800,'1M':2592000,
  };
  return m[tf] ?? 60;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  if (m > 0) return `${m}:${pad2(s)}`;
  return `${s}s`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function renderBarCountdown(
  ctx: CanvasRenderingContext2D,
  lastBarTime: number,
  timeframe: Timeframe,
  theme: Theme,
  x: number,
  yTop: number,
): void {
  const intervalSec = timeframeToSeconds(timeframe);
  const barEndTime = lastBarTime + intervalSec;
  const now = Math.floor(Date.now() / 1000);
  const remaining = Math.max(0, barEndTime - now);

  const label = formatCountdown(remaining);

  ctx.fillStyle = theme.textMuted;
  ctx.font = font(10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, yTop + TIME_AXIS_HEIGHT / 2 + 1);
}
