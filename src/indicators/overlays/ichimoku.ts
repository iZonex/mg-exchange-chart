// ── Ichimoku Cloud ──────────────────────────────────────────────────────────
// 5 lines + kumo (cloud) shading:
//   Tenkan-sen  = (highest high + lowest low) / 2 over tenkan period
//   Kijun-sen   = (highest high + lowest low) / 2 over kijun period
//   Senkou A    = (Tenkan + Kijun) / 2, plotted kijun periods ahead
//   Senkou B    = (highest high + lowest low) / 2 over senkou period, plotted kijun periods ahead
//   Chikou Span = Close plotted kijun periods behind

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

function highLowMid(bars: Bar[], endIdx: number, period: number): number | undefined {
  const start = endIdx - period + 1;
  if (start < 0) return undefined;
  let high = -Infinity;
  let low = Infinity;
  for (let i = start; i <= endIdx; i++) {
    if (bars[i]!.high > high) high = bars[i]!.high;
    if (bars[i]!.low < low) low = bars[i]!.low;
  }
  return (high + low) / 2;
}

export const ichimoku: Indicator = {
  name: 'Ichimoku',
  shortName: 'ICH',
  description: 'Ichimoku Cloud (Tenkan, Kijun, Senkou A/B, Chikou)',
  overlay: true,
  params: [
    { name: 'tenkan', type: 'number', default: 9, min: 1, max: 100, step: 1 },
    { name: 'kijun', type: 'number', default: 26, min: 1, max: 100, step: 1 },
    { name: 'senkou', type: 'number', default: 52, min: 1, max: 200, step: 1 },
  ],
  plots: [
    { key: 'tenkan', type: 'line', color: '#0496ff', lineWidth: 1 },
    { key: 'kijun', type: 'line', color: '#991515', lineWidth: 1 },
    { key: 'senkouA', type: 'line', color: '#4caf50', lineWidth: 1 },
    { key: 'senkouB', type: 'line', color: '#ef5350', lineWidth: 1 },
    { key: 'senkouA', type: 'band', bandPairKey: 'senkouB', color: 'rgba(76,175,80,0.06)' },
    { key: 'chikou', type: 'line', color: '#9c27b0', lineWidth: 1 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const tenkanP = params.tenkan as number;
    const kijunP = params.kijun as number;
    const senkouP = params.senkou as number;
    const displacement = kijunP;

    if (bars.length === 0) return [];

    // Compute base values
    const tenkanVals: (number | undefined)[] = [];
    const kijunVals: (number | undefined)[] = [];
    const senkouBBase: (number | undefined)[] = [];

    for (let i = 0; i < bars.length; i++) {
      tenkanVals.push(highLowMid(bars, i, tenkanP));
      kijunVals.push(highLowMid(bars, i, kijunP));
      senkouBBase.push(highLowMid(bars, i, senkouP));
    }

    // Build outputs — need extra space for displaced Senkou
    const totalLen = bars.length + displacement;
    const outputs: IndicatorOutput[] = [];

    for (let i = 0; i < totalLen; i++) {
      const time = i < bars.length ? bars[i]!.time : bars[bars.length - 1]!.time + (i - bars.length + 1) * 60;
      const values: Record<string, number | undefined> = {};

      // Tenkan & Kijun (current bar)
      values.tenkan = i < bars.length ? tenkanVals[i] : undefined;
      values.kijun = i < bars.length ? kijunVals[i] : undefined;

      // Senkou A & B (displaced forward by kijun periods)
      const srcIdx = i - displacement;
      if (srcIdx >= 0 && srcIdx < bars.length) {
        const t = tenkanVals[srcIdx];
        const k = kijunVals[srcIdx];
        values.senkouA = t !== undefined && k !== undefined ? (t + k) / 2 : undefined;
        values.senkouB = senkouBBase[srcIdx];
      }

      // Chikou (close displaced backward by kijun periods)
      const chikouSrc = i + displacement;
      values.chikou = chikouSrc < bars.length ? bars[chikouSrc]!.close : undefined;

      outputs.push({ time, values });
    }

    return outputs;
  },
};
