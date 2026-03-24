// ── Average Directional Index ───────────────────────────────────────────────
// ADX measures trend strength (not direction).
//   +DM = high - prevHigh (if positive and > -DM, else 0)
//   -DM = prevLow - low (if positive and > +DM, else 0)
//   TR  = max(high-low, |high-prevClose|, |low-prevClose|)
//   +DI = 100 * smoothed(+DM) / smoothed(TR)
//   -DI = 100 * smoothed(-DM) / smoothed(TR)
//   DX  = 100 * |+DI - -DI| / (+DI + -DI)
//   ADX = smoothed(DX)

import type { Bar, Indicator, IndicatorOutput } from '../../api/types';

export const adx: Indicator = {
  name: 'ADX',
  shortName: 'ADX',
  description: 'Average Directional Index',
  overlay: false,
  params: [
    { name: 'period', type: 'number', default: 14, min: 2, max: 100, step: 1 },
  ],
  plots: [
    { key: 'adx', type: 'line', color: '#FF9800', lineWidth: 1.5 },
    { key: 'pdi', type: 'line', color: '#4CAF50', lineWidth: 1 },
    { key: 'mdi', type: 'line', color: '#EF5350', lineWidth: 1 },
  ],
  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    const outputs: IndicatorOutput[] = [];

    if (bars.length < 2) {
      for (const bar of bars) outputs.push({ time: bar.time, values: { adx: undefined, pdi: undefined, mdi: undefined } });
      return outputs;
    }

    // Step 1: compute raw +DM, -DM, TR
    const plusDM: number[] = [0];
    const minusDM: number[] = [0];
    const tr: number[] = [bars[0]!.high - bars[0]!.low];

    for (let i = 1; i < bars.length; i++) {
      const high = bars[i]!.high, low = bars[i]!.low;
      const prevHigh = bars[i - 1]!.high, prevLow = bars[i - 1]!.low, prevClose = bars[i - 1]!.close;

      const upMove = high - prevHigh;
      const downMove = prevLow - low;

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
      tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
    }

    // Step 2: Wilder smooth
    let smoothPDM = 0, smoothMDM = 0, smoothTR = 0;
    let adxSum = 0, adxVal = 0;
    let adxReady = false;

    for (let i = 0; i < bars.length; i++) {
      if (i < period) {
        smoothPDM += plusDM[i]!;
        smoothMDM += minusDM[i]!;
        smoothTR += tr[i]!;

        if (i === period - 1) {
          // Initial smoothed values
        } else {
          outputs.push({ time: bars[i]!.time, values: { adx: undefined, pdi: undefined, mdi: undefined } });
          continue;
        }
      } else {
        smoothPDM = smoothPDM - smoothPDM / period + plusDM[i]!;
        smoothMDM = smoothMDM - smoothMDM / period + minusDM[i]!;
        smoothTR = smoothTR - smoothTR / period + tr[i]!;
      }

      const pdi = smoothTR > 0 ? 100 * smoothPDM / smoothTR : 0;
      const mdi = smoothTR > 0 ? 100 * smoothMDM / smoothTR : 0;
      const diSum = pdi + mdi;
      const dx = diSum > 0 ? 100 * Math.abs(pdi - mdi) / diSum : 0;

      if (!adxReady) {
        adxSum += dx;
        if (i === 2 * period - 2) {
          adxVal = adxSum / period;
          adxReady = true;
          outputs.push({ time: bars[i]!.time, values: { adx: adxVal, pdi, mdi } });
        } else {
          outputs.push({ time: bars[i]!.time, values: { adx: undefined, pdi, mdi } });
        }
      } else {
        adxVal = (adxVal * (period - 1) + dx) / period;
        outputs.push({ time: bars[i]!.time, values: { adx: adxVal, pdi, mdi } });
      }
    }

    return outputs;
  },
};
