// ── Stochastic Oscillator ───────────────────────────────────────────────────
// %K = 100 * (close - lowest low) / (highest high - lowest low) over K period
// %D = SMA(%K, D period)

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';
import { calcSMA } from '../overlays/sma';

export const stochastic: Indicator = {
  name: 'Stochastic',
  shortName: 'STOCH',
  description: 'Stochastic Oscillator (%K / %D)',
  overlay: false,
  params: [
    { name: 'kPeriod', type: 'number', default: 14, min: 1, max: 100, step: 1 },
    { name: 'dPeriod', type: 'number', default: 3, min: 1, max: 50, step: 1 },
    { name: 'smooth', type: 'number', default: 3, min: 1, max: 50, step: 1 },
  ],
  plots: [
    { key: 'k', type: 'line', color: '#2196F3', lineWidth: 1.5 },
    { key: 'd', type: 'line', color: '#FF9800', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const kPeriod = params.kPeriod as number;
    const dPeriod = params.dPeriod as number;
    const smooth = params.smooth as number;

    // Step 1: Raw %K
    const rawK: number[] = [];
    for (let i = 0; i < bars.length; i++) {
      if (i < kPeriod - 1) {
        rawK.push(0); // placeholder, won't be used
        continue;
      }
      let lowestLow = Infinity;
      let highestHigh = -Infinity;
      for (let j = i - kPeriod + 1; j <= i; j++) {
        if (bars[j]!.low < lowestLow) lowestLow = bars[j]!.low;
        if (bars[j]!.high > highestHigh) highestHigh = bars[j]!.high;
      }
      const range = highestHigh - lowestLow;
      rawK.push(range === 0 ? 50 : 100 * (bars[i]!.close - lowestLow) / range);
    }

    // Step 2: Smooth %K (SMA of raw %K)
    const smoothedK = calcSMA(rawK, smooth);

    // Step 3: %D = SMA of smoothed %K
    const definedK: number[] = [];
    for (let i = 0; i < smoothedK.length; i++) {
      if (i >= kPeriod - 1 && smoothedK[i] !== undefined) {
        definedK.push(smoothedK[i]!);
      }
    }
    const dValues = calcSMA(definedK, dPeriod);

    // Map back
    const outputs: IndicatorOutput[] = [];
    let kIdx = 0;
    for (let i = 0; i < bars.length; i++) {
      if (i < kPeriod - 1 || smoothedK[i] === undefined) {
        outputs.push({ time: bars[i]!.time, values: { k: undefined, d: undefined } });
      } else {
        outputs.push({
          time: bars[i]!.time,
          values: { k: smoothedK[i], d: dValues[kIdx] },
        });
        kIdx++;
      }
    }

    return outputs;
  },
};
