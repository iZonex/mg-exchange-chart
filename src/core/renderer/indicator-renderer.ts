// ── Indicator Renderer ──────────────────────────────────────────────────────
// Renders indicator plots (lines, histograms, bands) on canvas.
// Used for both overlay indicators (on main pane) and oscillator panes.

import type { PlotConfig, IndicatorOutput } from '../../api/types';
import type { RenderContext } from './render-context';
import type { TimeScale } from './time-axis';
import { barIndexToX } from './time-axis';

export interface IndicatorRenderParams {
  ctx: RenderContext | CanvasRenderingContext2D;
  outputs: IndicatorOutput[];
  plots: PlotConfig[];
  firstBarIndex: number;
  timeScale: TimeScale;
  chartWidth: number;
  /** Pane Y offset */
  yOffset: number;
  /** Pane height */
  paneHeight: number;
  /** Y-axis min value */
  scaleMin: number;
  /** Y-axis max value */
  scaleMax: number;
  /** Optional color overrides from params */
  colorOverride?: string;
}

export function renderIndicator(params: IndicatorRenderParams): void {
  const { ctx, outputs, plots, firstBarIndex, timeScale, chartWidth, yOffset, paneHeight, scaleMin, scaleMax } = params;

  const valueToY = (value: number): number => {
    const range = scaleMax - scaleMin;
    if (range === 0) return yOffset + paneHeight / 2;
    return yOffset + paneHeight * (1 - (value - scaleMin) / range);
  };

  ctx.save();

  // Clip to pane bounds
  ctx.beginPath();
  ctx.rect(0, yOffset, chartWidth, paneHeight);
  ctx.clip();

  for (const plot of plots) {
    if (plot.type === 'band') {
      renderBand(ctx, outputs, plot, firstBarIndex, timeScale, chartWidth, valueToY);
    } else if (plot.type === 'histogram') {
      renderHistogram(ctx, outputs, plot, firstBarIndex, timeScale, chartWidth, yOffset, paneHeight, valueToY);
    } else if (plot.type === 'line') {
      renderLine(ctx, outputs, plot, firstBarIndex, timeScale, chartWidth, valueToY);
    } else if (plot.type === 'dots') {
      renderDots(ctx, outputs, plot, firstBarIndex, timeScale, chartWidth, valueToY);
    }
  }

  ctx.restore();
}

function renderLine(
  ctx: RenderContext | CanvasRenderingContext2D,
  outputs: IndicatorOutput[],
  plot: PlotConfig,
  firstBarIndex: number,
  timeScale: TimeScale,
  chartWidth: number,
  valueToY: (v: number) => number,
): void {
  ctx.strokeStyle = plot.color ?? '#ffffff';
  ctx.lineWidth = plot.lineWidth ?? 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();

  let moved = false;
  for (let i = 0; i < outputs.length; i++) {
    const val = outputs[i]?.values[plot.key];
    if (val === undefined) { moved = false; continue; }

    const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);
    if (x < -50 || x > chartWidth + 50) continue;

    const y = valueToY(val);
    if (!moved) {
      ctx.moveTo(x, y);
      moved = true;
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}

function renderHistogram(
  ctx: RenderContext | CanvasRenderingContext2D,
  outputs: IndicatorOutput[],
  plot: PlotConfig,
  firstBarIndex: number,
  timeScale: TimeScale,
  chartWidth: number,
  yOffset: number,
  paneHeight: number,
  valueToY: (v: number) => number,
): void {
  const barWidth = Math.max(1, timeScale.barSpacing * 0.5);
  const zeroY = valueToY(0);

  for (let i = 0; i < outputs.length; i++) {
    const val = outputs[i]?.values[plot.key];
    if (val === undefined) continue;

    const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);
    if (x < -barWidth || x > chartWidth + barWidth) continue;

    const y = valueToY(val);
    // Color: green if positive, red if negative (for MACD histogram)
    ctx.fillStyle = val >= 0 ? '#26A69A' : '#EF5350';

    const barX = Math.round(x - barWidth / 2);
    const barH = Math.abs(y - zeroY);
    const barY = val >= 0 ? y : zeroY;
    ctx.fillRect(barX, barY, Math.max(1, barWidth), barH);
  }
}

function renderBand(
  ctx: RenderContext | CanvasRenderingContext2D,
  outputs: IndicatorOutput[],
  plot: PlotConfig,
  firstBarIndex: number,
  timeScale: TimeScale,
  chartWidth: number,
  valueToY: (v: number) => number,
): void {
  if (!plot.bandPairKey) return;

  const upperKey = plot.key;
  const lowerKey = plot.bandPairKey;

  // Collect points for upper and lower boundaries
  const upperPoints: { x: number; y: number }[] = [];
  const lowerPoints: { x: number; y: number }[] = [];

  for (let i = 0; i < outputs.length; i++) {
    const upper = outputs[i]?.values[upperKey];
    const lower = outputs[i]?.values[lowerKey];
    if (upper === undefined || lower === undefined) continue;

    const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);
    if (x < -50 || x > chartWidth + 50) continue;

    upperPoints.push({ x, y: valueToY(upper) });
    lowerPoints.push({ x, y: valueToY(lower) });
  }

  if (upperPoints.length < 2) return;

  ctx.fillStyle = plot.color ?? 'rgba(255,255,255,0.05)';
  ctx.beginPath();

  // Draw upper boundary forward
  ctx.moveTo(upperPoints[0]!.x, upperPoints[0]!.y);
  for (let i = 1; i < upperPoints.length; i++) {
    ctx.lineTo(upperPoints[i]!.x, upperPoints[i]!.y);
  }
  // Draw lower boundary backward
  for (let i = lowerPoints.length - 1; i >= 0; i--) {
    ctx.lineTo(lowerPoints[i]!.x, lowerPoints[i]!.y);
  }

  ctx.closePath();
  ctx.fill();
}

function renderDots(
  ctx: RenderContext | CanvasRenderingContext2D,
  outputs: IndicatorOutput[],
  plot: PlotConfig,
  firstBarIndex: number,
  timeScale: TimeScale,
  chartWidth: number,
  valueToY: (v: number) => number,
): void {
  ctx.fillStyle = plot.color ?? '#ffffff';
  const radius = (plot.lineWidth ?? 2) * 1.2;

  for (let i = 0; i < outputs.length; i++) {
    const val = outputs[i]?.values[plot.key];
    if (val === undefined) continue;

    const x = barIndexToX(firstBarIndex + i, timeScale, chartWidth);
    if (x < -radius || x > chartWidth + radius) continue;

    const y = valueToY(val);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Compute min/max values from indicator outputs for Y-axis auto-ranging */
export function getIndicatorRange(
  outputs: IndicatorOutput[],
  plots: PlotConfig[],
  fromIndex: number,
  toIndex: number,
): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;

  const keys = plots.filter(p => p.type !== 'band').map(p => p.key);

  for (let i = fromIndex; i < toIndex && i < outputs.length; i++) {
    const values = outputs[i]?.values;
    if (!values) continue;
    for (const key of keys) {
      const val = values[key];
      if (val !== undefined) {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
  }

  return min === Infinity ? null : { min, max };
}
