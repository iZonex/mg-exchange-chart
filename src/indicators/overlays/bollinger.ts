// ── Bollinger Bands ─────────────────────────────────────────────────────────
// Middle = SMA(period), Upper = Middle + stdDev*mult, Lower = Middle - stdDev*mult

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const bollingerBands: Indicator = {
  name: 'Bollinger Bands',
  shortName: 'BB',
  description: 'Bollinger Bands (SMA ± standard deviation)',
  overlay: true,
  params: [
    { name: 'period', type: 'number', default: 20, min: 2, max: 500, step: 1 },
    { name: 'stdDev', type: 'number', default: 2, min: 0.5, max: 5, step: 0.5 },
    { name: 'color', type: 'color', default: '#9C27B0' },
  ],
  plots: [
    { key: 'upper', type: 'line', color: '#9C27B0', lineWidth: 1 },
    { key: 'middle', type: 'line', color: '#9C27B0', lineWidth: 1 },
    { key: 'lower', type: 'line', color: '#9C27B0', lineWidth: 1 },
    { key: 'upper', type: 'band', bandPairKey: 'lower', color: 'rgba(156,39,176,0.08)' },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    const mult = params.stdDev as number;
    const closes = bars.map(b => b.close);
    const outputs: IndicatorOutput[] = [];

    for (let i = 0; i < bars.length; i++) {
      if (i < period - 1) {
        outputs.push({ time: bars[i]!.time, values: { upper: undefined, middle: undefined, lower: undefined } });
        continue;
      }

      // SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += closes[j]!;
      const mean = sum / period;

      // Standard deviation
      let sqSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const diff = closes[j]! - mean;
        sqSum += diff * diff;
      }
      const stdDev = Math.sqrt(sqSum / period);

      outputs.push({
        time: bars[i]!.time,
        values: {
          upper: mean + stdDev * mult,
          middle: mean,
          lower: mean - stdDev * mult,
        },
      });
    }

    return outputs;
  },
};
