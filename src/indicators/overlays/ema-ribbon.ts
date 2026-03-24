// ── EMA Ribbon ──────────────────────────────────────────────────────────────
// Multiple EMAs with different periods creating a "ribbon" effect.
// Useful for visualizing trend strength and direction.

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';
import { calcEMA } from './ema';

const RIBBON_PERIODS = [8, 13, 21, 34, 55, 89];
const RIBBON_COLORS = ['#2196F3', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#E3F2FD'];

export const emaRibbon: Indicator = {
  name: 'EMA Ribbon',
  shortName: 'RIBBON',
  description: 'EMA Ribbon (8, 13, 21, 34, 55, 89)',
  overlay: true,
  params: [],
  plots: RIBBON_PERIODS.map((p, i) => ({
    key: `ema${p}`,
    type: 'line' as const,
    color: RIBBON_COLORS[i],
    lineWidth: 1,
  })),
  calculate(bars: Bar[]): IndicatorOutput[] {
    const closes = bars.map(b => b.close);
    const emaArrays = RIBBON_PERIODS.map(p => calcEMA(closes, p));

    return bars.map((b, i) => {
      const values: Record<string, number | undefined> = {};
      for (let j = 0; j < RIBBON_PERIODS.length; j++) {
        values[`ema${RIBBON_PERIODS[j]}`] = emaArrays[j]![i];
      }
      return { time: b.time, values };
    });
  },
};
