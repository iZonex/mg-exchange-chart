// ── Rate of Change ──────────────────────────────────────────────────────────
// ROC = ((Close - Close[n]) / Close[n]) * 100

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const roc: Indicator = {
  name: 'ROC',
  shortName: 'ROC',
  description: 'Rate of Change (momentum)',
  overlay: false,
  params: [
    { name: 'period', type: 'number', default: 12, min: 1, max: 200, step: 1 },
    { name: 'color', type: 'color', default: '#26C6DA' },
  ],
  plots: [
    { key: 'roc', type: 'line', color: '#26C6DA', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    return bars.map((bar, i) => {
      if (i < period) return { time: bar.time, values: { roc: undefined } };
      const prev = bars[i - period]!.close;
      const roc = prev === 0 ? 0 : ((bar.close - prev) / prev) * 100;
      return { time: bar.time, values: { roc } };
    });
  },
};
