// ── Cumulative Volume Delta ──────────────────────────────────────────────────
// CVD approximation: buy volume (close > open) - sell volume (close < open).
// Accumulates over time to show buying/selling pressure.

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const cvd: Indicator = {
  name: 'CVD',
  shortName: 'CVD',
  description: 'Cumulative Volume Delta',
  overlay: false,
  params: [],
  plots: [
    { key: 'cvd', type: 'line', color: '#7C4DFF', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[]): IndicatorOutput[] {
    let cum = 0;
    return bars.map(bar => {
      const delta = bar.close >= bar.open ? bar.volume : -bar.volume;
      cum += delta;
      return { time: bar.time, values: { cvd: cum } };
    });
  },
};
