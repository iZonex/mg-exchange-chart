// ── Volume Weighted Average Price ────────────────────────────────────────────
// VWAP = cumulative(typicalPrice * volume) / cumulative(volume)
// Resets each trading session (daily boundary).

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const vwap: Indicator = {
  name: 'VWAP',
  shortName: 'VWAP',
  description: 'Volume Weighted Average Price (resets daily)',
  overlay: true,
  params: [
    { name: 'color', type: 'color', default: '#00BCD4' },
  ],
  plots: [
    { key: 'vwap', type: 'line', color: '#00BCD4', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[]): IndicatorOutput[] {
    const outputs: IndicatorOutput[] = [];
    let cumTPV = 0; // cumulative (typical price * volume)
    let cumVol = 0; // cumulative volume
    let currentDay = -1;

    for (const bar of bars) {
      const day = Math.floor(bar.time / 86400);

      // Reset on new day
      if (day !== currentDay) {
        cumTPV = 0;
        cumVol = 0;
        currentDay = day;
      }

      const typicalPrice = (bar.high + bar.low + bar.close) / 3;
      cumTPV += typicalPrice * bar.volume;
      cumVol += bar.volume;

      outputs.push({
        time: bar.time,
        values: { vwap: cumVol > 0 ? cumTPV / cumVol : undefined },
      });
    }

    return outputs;
  },
};
