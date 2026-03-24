// ── Williams %R ─────────────────────────────────────────────────────────────
// Williams %R = (Highest High - Close) / (Highest High - Lowest Low) * -100
// Range: -100 to 0. Overbought < -20, Oversold > -80.

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const williamsR: Indicator = {
  name: 'Williams %R',
  shortName: '%R',
  description: 'Williams Percent Range',
  overlay: false,
  params: [
    { name: 'period', type: 'number', default: 14, min: 1, max: 100, step: 1 },
    { name: 'color', type: 'color', default: '#AB47BC' },
  ],
  plots: [
    { key: 'wr', type: 'line', color: '#AB47BC', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    const outputs: IndicatorOutput[] = [];

    for (let i = 0; i < bars.length; i++) {
      if (i < period - 1) {
        outputs.push({ time: bars[i]!.time, values: { wr: undefined } });
        continue;
      }

      let hh = -Infinity, ll = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (bars[j]!.high > hh) hh = bars[j]!.high;
        if (bars[j]!.low < ll) ll = bars[j]!.low;
      }

      const range = hh - ll;
      const wr = range === 0 ? -50 : ((hh - bars[i]!.close) / range) * -100;
      outputs.push({ time: bars[i]!.time, values: { wr } });
    }

    return outputs;
  },
};
