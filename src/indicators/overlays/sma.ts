// ── Simple Moving Average ───────────────────────────────────────────────────
// SMA(period) = sum(close[i-period+1..i]) / period

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const sma: Indicator = {
  name: 'SMA',
  shortName: 'SMA',
  description: 'Simple Moving Average',
  overlay: true,
  params: [
    { name: 'period', type: 'number', default: 20, min: 1, max: 500, step: 1 },
    { name: 'color', type: 'color', default: '#2196F3' },
  ],
  plots: [
    { key: 'sma', type: 'line', color: '#2196F3', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    const outputs: IndicatorOutput[] = [];

    let sum = 0;
    for (let i = 0; i < bars.length; i++) {
      sum += bars[i]!.close;
      if (i >= period) {
        sum -= bars[i - period]!.close;
      }
      if (i >= period - 1) {
        outputs.push({ time: bars[i]!.time, values: { sma: sum / period } });
      } else {
        outputs.push({ time: bars[i]!.time, values: { sma: undefined } });
      }
    }
    return outputs;
  },
};

/** Standalone SMA calculation for use by other indicators */
export function calcSMA(values: number[], period: number): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    result.push(i >= period - 1 ? sum / period : undefined);
  }
  return result;
}
