// ── Reference Lines ─────────────────────────────────────────────────────────
// Horizontal reference lines for oscillator panes:
// RSI: 70 (overbought), 30 (oversold) with zone shading
// Stochastic: 80/20
// MACD: zero line
// MFI: 80/20
// ADX: 25 (trend threshold)

import type { Theme } from '../../api/types';

export interface ReferenceLineConfig {
  value: number;
  color?: string;
  lineWidth?: number;
  dashed?: boolean;
  /** Fill zone between this line and a pair value */
  zonePairValue?: number;
  zoneColor?: string;
}

/** Get reference lines for a known indicator */
export function getReferenceLinesForIndicator(indicatorName: string): ReferenceLineConfig[] {
  switch (indicatorName) {
    case 'RSI':
      return [
        { value: 70, dashed: true, zonePairValue: 100, zoneColor: 'rgba(246,70,93,0.05)' },
        { value: 50, dashed: true, color: 'rgba(255,255,255,0.1)' },
        { value: 30, dashed: true, zonePairValue: 0, zoneColor: 'rgba(14,203,129,0.05)' },
      ];
    case 'Stochastic':
      return [
        { value: 80, dashed: true, zonePairValue: 100, zoneColor: 'rgba(246,70,93,0.05)' },
        { value: 50, dashed: true, color: 'rgba(255,255,255,0.1)' },
        { value: 20, dashed: true, zonePairValue: 0, zoneColor: 'rgba(14,203,129,0.05)' },
      ];
    case 'MACD':
      return [
        { value: 0, lineWidth: 1, color: 'rgba(255,255,255,0.2)' },
      ];
    case 'MFI':
      return [
        { value: 80, dashed: true, zonePairValue: 100, zoneColor: 'rgba(246,70,93,0.05)' },
        { value: 20, dashed: true, zonePairValue: 0, zoneColor: 'rgba(14,203,129,0.05)' },
      ];
    case 'ADX':
      return [
        { value: 25, dashed: true, color: 'rgba(255,255,255,0.15)' },
      ];
    case 'Williams %R':
      return [
        { value: -20, dashed: true, zonePairValue: 0, zoneColor: 'rgba(246,70,93,0.05)' },
        { value: -50, dashed: true, color: 'rgba(255,255,255,0.1)' },
        { value: -80, dashed: true, zonePairValue: -100, zoneColor: 'rgba(14,203,129,0.05)' },
      ];
    case 'ROC':
      return [
        { value: 0, lineWidth: 1, color: 'rgba(255,255,255,0.2)' },
      ];
    default:
      return [];
  }
}

/** Render reference lines and zones on an oscillator pane */
export function renderReferenceLines(
  ctx: CanvasRenderingContext2D,
  lines: ReferenceLineConfig[],
  theme: Theme,
  chartWidth: number,
  yOffset: number,
  paneHeight: number,
  scaleMin: number,
  scaleMax: number,
): void {
  const valueToY = (v: number): number => {
    const range = scaleMax - scaleMin;
    if (range === 0) return yOffset + paneHeight / 2;
    return yOffset + paneHeight * (1 - (v - scaleMin) / range);
  };

  for (const line of lines) {
    const y = valueToY(line.value);
    if (y < yOffset || y > yOffset + paneHeight) continue;

    // Zone fill
    if (line.zonePairValue !== undefined && line.zoneColor) {
      const pairY = valueToY(line.zonePairValue);
      const top = Math.max(yOffset, Math.min(y, pairY));
      const bottom = Math.min(yOffset + paneHeight, Math.max(y, pairY));
      ctx.fillStyle = line.zoneColor;
      ctx.fillRect(0, top, chartWidth, bottom - top);
    }

    // Line
    ctx.strokeStyle = line.color ?? theme.textMuted;
    ctx.lineWidth = line.lineWidth ?? 0.5;
    if (line.dashed) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(chartWidth, Math.round(y) + 0.5);
    ctx.stroke();
    if (line.dashed) ctx.setLineDash([]);
  }
}
