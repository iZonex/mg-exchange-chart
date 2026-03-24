// ── Time Axis ───────────────────────────────────────────────────────────────
// Bottom time scale: converts between time↔pixel, generates smart tick labels.

import type { Theme, Timeframe } from '../../api/types';
import { font } from '../font';

export const TIME_AXIS_HEIGHT = 28;

export interface TimeScale {
  /** First visible bar index */
  firstIndex: number;
  /** Number of visible bars */
  visibleCount: number;
  /** Pixels per bar (includes gap) */
  barSpacing: number;
  /** Offset in pixels for smooth scrolling */
  offsetX: number;
}

/** Converts a bar index to pixel X coordinate (center of the bar) */
export function barIndexToX(index: number, scale: TimeScale, _chartWidth: number): number {
  const relativeIndex = index - scale.firstIndex;
  return relativeIndex * scale.barSpacing + scale.offsetX + scale.barSpacing / 2;
}

/** Converts pixel X to fractional bar index */
export function xToBarIndex(x: number, scale: TimeScale): number {
  return (x - scale.offsetX) / scale.barSpacing + scale.firstIndex - 0.5;
}

/** Determine appropriate label format based on timeframe */
function getLabelFormatter(timeframe: Timeframe): (date: Date) => string {
  const tf = timeframe;
  if (tf.endsWith('s')) {
    // Seconds — show HH:MM:SS
    return (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }
  if (tf.endsWith('m') || tf === '1H' || tf === '2H' || tf === '4H' || tf === '6H' || tf === '8H' || tf === '12H') {
    // Minutes/hours — show HH:MM, with date on day boundary
    return (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  if (tf === '1D' || tf === '3D') {
    // Days — show MMM DD
    return (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
  // Weeks, months — show MMM DD or YYYY
  return (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Check if a label represents a "major" boundary (day change, month change, year change) */
function isMajorBoundary(time: number, prevTime: number | null): 'year' | 'month' | 'day' | null {
  if (prevTime === null) return null;
  const d = new Date(time * 1000);
  const pd = new Date(prevTime * 1000);
  if (d.getFullYear() !== pd.getFullYear()) return 'year';
  if (d.getMonth() !== pd.getMonth()) return 'month';
  if (d.getDate() !== pd.getDate()) return 'day';
  return null;
}

function formatMajor(time: number, boundary: 'year' | 'month' | 'day'): string {
  const d = new Date(time * 1000);
  switch (boundary) {
    case 'year': return `${d.getFullYear()}`;
    case 'month': return MONTHS[d.getMonth()]!;
    case 'day': return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  }
}

export interface TimeTick {
  index: number;
  x: number;
  label: string;
  isMajor: boolean;
}

/** Generate time axis ticks for the visible range */
export function generateTimeTicks(
  times: (index: number) => number | undefined,
  scale: TimeScale,
  chartWidth: number,
  timeframe: Timeframe,
): TimeTick[] {
  const ticks: TimeTick[] = [];
  const formatter = getLabelFormatter(timeframe);
  const minLabelSpacing = 80; // minimum pixels between labels
  const step = Math.max(1, Math.ceil(minLabelSpacing / scale.barSpacing));

  let prevTime: number | null = null;

  // Start from a step-aligned index
  const startIdx = Math.floor(scale.firstIndex / step) * step;
  const endIdx = scale.firstIndex + scale.visibleCount + 1;

  for (let i = startIdx; i <= endIdx; i += step) {
    const time = times(i);
    if (time === undefined) continue;

    const x = barIndexToX(i, scale, chartWidth);
    if (x < 0 || x > chartWidth) { prevTime = time; continue; }

    const major = isMajorBoundary(time, prevTime);
    const label = major ? formatMajor(time, major) : formatter(new Date(time * 1000));

    ticks.push({ index: i, x, label, isMajor: !!major });
    prevTime = time;
  }

  return ticks;
}

/** Render the time axis bar at the bottom */
export function renderTimeAxis(
  ctx: CanvasRenderingContext2D,
  ticks: TimeTick[],
  theme: Theme,
  width: number,
  yTop: number,
): void {
  // Background
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, yTop, width, TIME_AXIS_HEIGHT);

  // Top border
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, yTop + 0.5);
  ctx.lineTo(width, yTop + 0.5);
  ctx.stroke();

  // Labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const tick of ticks) {
    ctx.fillStyle = tick.isMajor ? theme.textPrimary : theme.textSecondary;
    ctx.font = font(11, tick.isMajor ? 'bold' : '');
    ctx.fillText(tick.label, tick.x, yTop + TIME_AXIS_HEIGHT / 2);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
