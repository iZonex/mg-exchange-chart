// ── Relative Strength Index ─────────────────────────────────────────────────
// RSI(period) = 100 - 100 / (1 + avgGain/avgLoss)
// Uses Wilder's smoothing (exponential with alpha = 1/period).

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const rsi: Indicator = {
  name: 'RSI',
  shortName: 'RSI',
  description: 'Relative Strength Index',
  overlay: false,
  params: [
    { name: 'period', type: 'number', default: 14, min: 2, max: 100, step: 1 },
    { name: 'color', type: 'color', default: '#E040FB' },
  ],
  plots: [
    { key: 'rsi', type: 'line', color: '#E040FB', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    return calcRSI(bars, period);
  },
};

export function calcRSI(bars: Bar[], period: number): IndicatorOutput[] {
  const outputs: IndicatorOutput[] = [];
  if (bars.length === 0) return outputs;

  // First bar — no change
  outputs.push({ time: bars[0]!.time, values: { rsi: undefined } });

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < bars.length; i++) {
    const change = bars[i]!.close - bars[i - 1]!.close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      // Accumulate for initial average
      avgGain += gain;
      avgLoss += loss;

      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        outputs.push({ time: bars[i]!.time, values: { rsi: 100 - 100 / (1 + rs) } });
      } else {
        outputs.push({ time: bars[i]!.time, values: { rsi: undefined } });
      }
    } else {
      // Wilder's smoothing
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      outputs.push({ time: bars[i]!.time, values: { rsi: 100 - 100 / (1 + rs) } });
    }
  }

  return outputs;
}
