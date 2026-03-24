// ── MACD ────────────────────────────────────────────────────────────────────
// MACD Line = EMA(fast) - EMA(slow)
// Signal Line = EMA(MACD Line, signal period)
// Histogram = MACD Line - Signal Line

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';
import { calcEMA } from '../overlays/ema';

export const macd: Indicator = {
  name: 'MACD',
  shortName: 'MACD',
  description: 'Moving Average Convergence Divergence',
  overlay: false,
  params: [
    { name: 'fastPeriod', type: 'number', default: 12, min: 2, max: 100, step: 1 },
    { name: 'slowPeriod', type: 'number', default: 26, min: 2, max: 200, step: 1 },
    { name: 'signalPeriod', type: 'number', default: 9, min: 2, max: 50, step: 1 },
  ],
  plots: [
    { key: 'macd', type: 'line', color: '#2196F3', lineWidth: 1.5 },
    { key: 'signal', type: 'line', color: '#FF9800', lineWidth: 1.5 },
    { key: 'histogram', type: 'histogram', color: '#26A69A' },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const fastPeriod = params.fastPeriod as number;
    const slowPeriod = params.slowPeriod as number;
    const signalPeriod = params.signalPeriod as number;

    const closes = bars.map(b => b.close);
    const fastEMA = calcEMA(closes, fastPeriod);
    const slowEMA = calcEMA(closes, slowPeriod);

    // MACD line = fast EMA - slow EMA
    const macdLine: number[] = [];
    const macdDefined: (number | undefined)[] = [];

    for (let i = 0; i < bars.length; i++) {
      if (fastEMA[i] !== undefined && slowEMA[i] !== undefined) {
        const val = fastEMA[i]! - slowEMA[i]!;
        macdLine.push(val);
        macdDefined.push(val);
      } else {
        macdDefined.push(undefined);
      }
    }

    // Signal line = EMA of MACD line
    const signalEMA = calcEMA(macdLine, signalPeriod);

    const outputs: IndicatorOutput[] = [];
    let signalIdx = 0;

    for (let i = 0; i < bars.length; i++) {
      const m = macdDefined[i];
      if (m === undefined) {
        outputs.push({ time: bars[i]!.time, values: { macd: undefined, signal: undefined, histogram: undefined } });
      } else {
        const sig = signalEMA[signalIdx];
        const hist = sig !== undefined ? m - sig : undefined;
        outputs.push({
          time: bars[i]!.time,
          values: { macd: m, signal: sig, histogram: hist },
        });
        signalIdx++;
      }
    }

    return outputs;
  },
};
