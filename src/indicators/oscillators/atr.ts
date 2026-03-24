// ── Average True Range ──────────────────────────────────────────────────────
// TR = max(high-low, |high-prevClose|, |low-prevClose|)
// ATR = Wilder's smoothed average of TR over `period` bars.

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const atr: Indicator = {
  name: 'ATR',
  shortName: 'ATR',
  description: 'Average True Range',
  overlay: false,
  params: [
    { name: 'period', type: 'number', default: 14, min: 1, max: 100, step: 1 },
    { name: 'color', type: 'color', default: '#FF5722' },
  ],
  plots: [
    { key: 'atr', type: 'line', color: '#FF5722', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    const outputs: IndicatorOutput[] = [];

    if (bars.length === 0) return outputs;

    // First bar: TR = high - low (no previous close)
    let atrVal = 0;
    outputs.push({ time: bars[0]!.time, values: { atr: undefined } });

    for (let i = 1; i < bars.length; i++) {
      const bar = bars[i]!;
      const prevClose = bars[i - 1]!.close;

      const tr = Math.max(
        bar.high - bar.low,
        Math.abs(bar.high - prevClose),
        Math.abs(bar.low - prevClose),
      );

      if (i <= period) {
        atrVal += tr;
        if (i === period) {
          atrVal /= period;
          outputs.push({ time: bar.time, values: { atr: atrVal } });
        } else {
          outputs.push({ time: bar.time, values: { atr: undefined } });
        }
      } else {
        // Wilder's smoothing
        atrVal = (atrVal * (period - 1) + tr) / period;
        outputs.push({ time: bar.time, values: { atr: atrVal } });
      }
    }

    return outputs;
  },
};
