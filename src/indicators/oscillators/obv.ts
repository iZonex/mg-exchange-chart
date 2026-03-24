// ── On-Balance Volume ───────────────────────────────────────────────────────
// OBV: cumulative volume, added when close > prev close, subtracted when close < prev close.

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const obv: Indicator = {
  name: 'OBV',
  shortName: 'OBV',
  description: 'On-Balance Volume',
  overlay: false,
  params: [
    { name: 'color', type: 'color', default: '#26A69A' },
  ],
  plots: [
    { key: 'obv', type: 'line', color: '#26A69A', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[]): IndicatorOutput[] {
    const outputs: IndicatorOutput[] = [];
    if (bars.length === 0) return outputs;

    let obvVal = 0;
    outputs.push({ time: bars[0]!.time, values: { obv: obvVal } });

    for (let i = 1; i < bars.length; i++) {
      if (bars[i]!.close > bars[i - 1]!.close) {
        obvVal += bars[i]!.volume;
      } else if (bars[i]!.close < bars[i - 1]!.close) {
        obvVal -= bars[i]!.volume;
      }
      outputs.push({ time: bars[i]!.time, values: { obv: obvVal } });
    }

    return outputs;
  },
};
