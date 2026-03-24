// ── Time Weighted Average Price ──────────────────────────────────────────────
// TWAP = cumulative(close) / count, resets each session (daily boundary).
// Unlike VWAP, TWAP gives equal weight to each bar regardless of volume.

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const twap: Indicator = {
  name: 'TWAP',
  shortName: 'TWAP',
  description: 'Time Weighted Average Price (resets daily)',
  overlay: true,
  params: [
    { name: 'color', type: 'color', default: '#FF6D00' },
  ],
  plots: [
    { key: 'twap', type: 'line', color: '#FF6D00', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[]): IndicatorOutput[] {
    const outputs: IndicatorOutput[] = [];
    let cumPrice = 0;
    let count = 0;
    let currentDay = -1;

    for (const bar of bars) {
      const day = Math.floor(bar.time / 86400);
      if (day !== currentDay) {
        cumPrice = 0;
        count = 0;
        currentDay = day;
      }
      cumPrice += bar.close;
      count++;
      outputs.push({ time: bar.time, values: { twap: cumPrice / count } });
    }
    return outputs;
  },
};
