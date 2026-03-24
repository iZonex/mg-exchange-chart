// ── Parabolic SAR ───────────────────────────────────────────────────────────
// Trailing stop/reversal indicator.
// AF starts at 0.02, increments by 0.02 on each new extreme, max 0.20.

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const sar: Indicator = {
  name: 'Parabolic SAR',
  shortName: 'SAR',
  description: 'Parabolic Stop and Reverse',
  overlay: true,
  params: [
    { name: 'step', type: 'number', default: 0.02, min: 0.001, max: 0.1, step: 0.002 },
    { name: 'max', type: 'number', default: 0.2, min: 0.05, max: 0.5, step: 0.01 },
  ],
  plots: [
    { key: 'sar', type: 'dots', color: '#FF9800', lineWidth: 2 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const step = params.step as number;
    const maxAF = params.max as number;
    const outputs: IndicatorOutput[] = [];

    if (bars.length < 2) {
      for (const b of bars) outputs.push({ time: b.time, values: { sar: undefined } });
      return outputs;
    }

    let isLong = bars[1]!.close > bars[0]!.close;
    let af = step;
    let ep = isLong ? bars[0]!.high : bars[0]!.low;
    let sarVal = isLong ? bars[0]!.low : bars[0]!.high;

    outputs.push({ time: bars[0]!.time, values: { sar: undefined } });

    for (let i = 1; i < bars.length; i++) {
      const bar = bars[i]!;
      const prevSar = sarVal;

      sarVal = prevSar + af * (ep - prevSar);

      if (isLong) {
        // Ensure SAR is below the prior two lows
        if (i >= 2) sarVal = Math.min(sarVal, bars[i - 1]!.low, bars[i - 2]!.low);
        else sarVal = Math.min(sarVal, bars[i - 1]!.low);

        if (bar.low < sarVal) {
          // Reverse to short
          isLong = false;
          sarVal = ep;
          ep = bar.low;
          af = step;
        } else {
          if (bar.high > ep) {
            ep = bar.high;
            af = Math.min(af + step, maxAF);
          }
        }
      } else {
        if (i >= 2) sarVal = Math.max(sarVal, bars[i - 1]!.high, bars[i - 2]!.high);
        else sarVal = Math.max(sarVal, bars[i - 1]!.high);

        if (bar.high > sarVal) {
          isLong = true;
          sarVal = ep;
          ep = bar.high;
          af = step;
        } else {
          if (bar.low < ep) {
            ep = bar.low;
            af = Math.min(af + step, maxAF);
          }
        }
      }

      outputs.push({ time: bar.time, values: { sar: sarVal } });
    }

    return outputs;
  },
};
