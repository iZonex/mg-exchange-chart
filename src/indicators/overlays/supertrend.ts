// ── Supertrend ──────────────────────────────────────────────────────────────
// Supertrend = ATR-based trailing stop that flips direction.
// Upper Band = (H+L)/2 + multiplier * ATR
// Lower Band = (H+L)/2 - multiplier * ATR
// If close > prev Supertrend and was bearish → flip to bullish
// If close < prev Supertrend and was bullish → flip to bearish

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const supertrend: Indicator = {
  name: 'Supertrend',
  shortName: 'ST',
  description: 'Supertrend (ATR-based trend following)',
  overlay: true,
  params: [
    { name: 'period', type: 'number', default: 10, min: 1, max: 100, step: 1 },
    { name: 'multiplier', type: 'number', default: 3, min: 0.5, max: 10, step: 0.5 },
  ],
  plots: [
    { key: 'supertrend', type: 'line', color: '#0ecb81', lineWidth: 2 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    const mult = params.multiplier as number;
    const outputs: IndicatorOutput[] = [];

    if (bars.length < period + 1) {
      for (const b of bars) outputs.push({ time: b.time, values: { supertrend: undefined } });
      return outputs;
    }

    // Compute ATR
    const tr: number[] = [bars[0]!.high - bars[0]!.low];
    for (let i = 1; i < bars.length; i++) {
      const h = bars[i]!.high, l = bars[i]!.low, pc = bars[i - 1]!.close;
      tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }

    let atr = 0;
    for (let i = 0; i < period; i++) atr += tr[i]!;
    atr /= period;

    // Initial
    for (let i = 0; i < period; i++) {
      outputs.push({ time: bars[i]!.time, values: { supertrend: undefined } });
    }

    let upperBand = 0, lowerBand = 0, stValue = 0;
    let trend = 1; // 1 = up, -1 = down

    for (let i = period; i < bars.length; i++) {
      if (i > period) atr = (atr * (period - 1) + tr[i]!) / period;

      const hl2 = (bars[i]!.high + bars[i]!.low) / 2;
      let newUpper = hl2 + mult * atr;
      let newLower = hl2 - mult * atr;

      // Carry forward if tighter
      if (i > period) {
        if (bars[i - 1]!.close <= upperBand) newUpper = Math.min(newUpper, upperBand);
        if (bars[i - 1]!.close >= lowerBand) newLower = Math.max(newLower, lowerBand);
      }

      upperBand = newUpper;
      lowerBand = newLower;

      // Determine trend
      if (bars[i]!.close > upperBand) trend = 1;
      else if (bars[i]!.close < lowerBand) trend = -1;

      stValue = trend === 1 ? lowerBand : upperBand;
      outputs.push({ time: bars[i]!.time, values: { supertrend: stValue } });
    }

    return outputs;
  },
};
