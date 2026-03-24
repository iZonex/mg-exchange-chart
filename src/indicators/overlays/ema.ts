// ── Exponential Moving Average ──────────────────────────────────────────────
// EMA(period): multiplier = 2/(period+1), EMA[i] = close*k + EMA[i-1]*(1-k)
// First EMA value = SMA of first `period` bars.

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const ema: Indicator = {
  name: 'EMA',
  shortName: 'EMA',
  description: 'Exponential Moving Average',
  overlay: true,
  params: [
    { name: 'period', type: 'number', default: 20, min: 1, max: 500, step: 1 },
    { name: 'color', type: 'color', default: '#FF9800' },
  ],
  plots: [
    { key: 'ema', type: 'line', color: '#FF9800', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    const values = bars.map(b => b.close);
    const emaValues = calcEMA(values, period);

    return bars.map((b, i) => ({
      time: b.time,
      values: { ema: emaValues[i] },
    }));
  },
};

/** Standalone EMA calculation for use by other indicators */
export function calcEMA(values: number[], period: number): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  if (values.length === 0) return result;

  const k = 2 / (period + 1);
  let emaVal: number | undefined;

  // Seed: SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      sum += values[i]!;
      result.push(undefined);
    } else if (i === period - 1) {
      sum += values[i]!;
      emaVal = sum / period;
      result.push(emaVal);
    } else {
      emaVal = values[i]! * k + emaVal! * (1 - k);
      result.push(emaVal);
    }
  }

  return result;
}
