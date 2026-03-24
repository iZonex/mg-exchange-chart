// ── Money Flow Index ────────────────────────────────────────────────────────
// MFI is a volume-weighted RSI:
//   Typical Price = (H+L+C)/3
//   Raw Money Flow = TP * Volume
//   Positive MF = sum of raw MF where TP > prev TP over period
//   Negative MF = sum of raw MF where TP < prev TP over period
//   MFI = 100 - 100 / (1 + Positive MF / Negative MF)

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const mfi: Indicator = {
  name: 'MFI',
  shortName: 'MFI',
  description: 'Money Flow Index (volume-weighted RSI)',
  overlay: false,
  params: [
    { name: 'period', type: 'number', default: 14, min: 2, max: 100, step: 1 },
    { name: 'color', type: 'color', default: '#7B1FA2' },
  ],
  plots: [
    { key: 'mfi', type: 'line', color: '#7B1FA2', lineWidth: 1.5 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    const outputs: IndicatorOutput[] = [];

    if (bars.length === 0) return outputs;

    const tp: number[] = bars.map(b => (b.high + b.low + b.close) / 3);
    const rawMF: number[] = bars.map((b, i) => tp[i]! * b.volume);

    // First bar — no previous TP
    outputs.push({ time: bars[0]!.time, values: { mfi: undefined } });

    // Classify flows and use rolling window
    const posFlows: number[] = [0];
    const negFlows: number[] = [0];

    for (let i = 1; i < bars.length; i++) {
      if (tp[i]! > tp[i - 1]!) {
        posFlows.push(rawMF[i]!);
        negFlows.push(0);
      } else if (tp[i]! < tp[i - 1]!) {
        posFlows.push(0);
        negFlows.push(rawMF[i]!);
      } else {
        posFlows.push(0);
        negFlows.push(0);
      }

      if (i < period) {
        outputs.push({ time: bars[i]!.time, values: { mfi: undefined } });
        continue;
      }

      // Sum over window [i-period+1 .. i]
      let posMF = 0, negMF = 0;
      for (let j = i - period + 1; j <= i; j++) {
        posMF += posFlows[j]!;
        negMF += negFlows[j]!;
      }

      const mfiVal = negMF === 0 ? 100 : 100 - 100 / (1 + posMF / negMF);
      outputs.push({ time: bars[i]!.time, values: { mfi: mfiVal } });
    }

    return outputs;
  },
};
