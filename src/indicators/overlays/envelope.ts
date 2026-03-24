// ── Moving Average Envelope ──────────────────────────────────────────────────
// Upper = SMA + SMA * percent/100
// Lower = SMA - SMA * percent/100

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';
import { calcSMA } from './sma';

export const envelope: Indicator = {
  name: 'Envelope',
  shortName: 'ENV',
  description: 'Moving Average Envelope',
  overlay: true,
  params: [
    { name: 'period', type: 'number', default: 20, min: 1, max: 500, step: 1 },
    { name: 'percent', type: 'number', default: 2.5, min: 0.1, max: 20, step: 0.1 },
    { name: 'color', type: 'color', default: '#42A5F5' },
  ],
  plots: [
    { key: 'upper', type: 'line', color: '#42A5F5', lineWidth: 1 },
    { key: 'middle', type: 'line', color: '#42A5F5', lineWidth: 1 },
    { key: 'lower', type: 'line', color: '#42A5F5', lineWidth: 1 },
    { key: 'upper', type: 'band', bandPairKey: 'lower', color: 'rgba(66,165,245,0.06)' },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    const pct = (params.percent as number) / 100;
    const closes = bars.map(b => b.close);
    const smaVals = calcSMA(closes, period);

    return bars.map((b, i) => {
      const mid = smaVals[i];
      return {
        time: b.time,
        values: {
          upper: mid !== undefined ? mid * (1 + pct) : undefined,
          middle: mid,
          lower: mid !== undefined ? mid * (1 - pct) : undefined,
        },
      };
    });
  },
};
