import { describe, it, expect } from 'vitest';
import type { Bar, Indicator } from '../src/api/types';

// ── Overlay imports ─────────────────────────────────────────────────────────
import { sma } from '../src/indicators/overlays/sma';
import { ema } from '../src/indicators/overlays/ema';
import { bollingerBands } from '../src/indicators/overlays/bollinger';
import { vwap } from '../src/indicators/overlays/vwap';
import { ichimoku } from '../src/indicators/overlays/ichimoku';
import { twap } from '../src/indicators/overlays/twap';
import { supertrend } from '../src/indicators/overlays/supertrend';
import { emaRibbon } from '../src/indicators/overlays/ema-ribbon';
import { sar } from '../src/indicators/overlays/sar';
import { envelope } from '../src/indicators/overlays/envelope';

// ── Oscillator imports ──────────────────────────────────────────────────────
import { rsi } from '../src/indicators/oscillators/rsi';
import { macd } from '../src/indicators/oscillators/macd';
import { stochastic } from '../src/indicators/oscillators/stochastic';
import { atr } from '../src/indicators/oscillators/atr';
import { obv } from '../src/indicators/oscillators/obv';
import { adx } from '../src/indicators/oscillators/adx';
import { mfi } from '../src/indicators/oscillators/mfi';
import { williamsR } from '../src/indicators/oscillators/williams-r';
import { roc } from '../src/indicators/oscillators/roc';
import { cvd } from '../src/indicators/oscillators/cvd';

// ── Test data generator ─────────────────────────────────────────────────────

function genBars(n: number, seed = 42000): Bar[] {
  const bars: Bar[] = [];
  let p = seed;
  for (let i = 0; i < n; i++) {
    const c = (Math.sin(i * 0.3) + Math.random() - 0.5) * p * 0.01;
    const o = p, cl = o + c;
    bars.push({
      time: 1000000 + i * 3600,
      open: o,
      close: cl,
      high: Math.max(o, cl) * 1.003,
      low: Math.min(o, cl) * 0.997,
      volume: 50 + Math.random() * 500,
    });
    p = cl;
  }
  return bars;
}

const BARS_100 = genBars(100);
const BARS_200 = genBars(200);

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Count non-undefined values for a given key across indicator outputs */
function countDefined(outputs: { values: Record<string, number | undefined> }[], key: string): number {
  return outputs.filter(o => o.values[key] !== undefined).length;
}

/** Check no NaN in defined values for a given key */
function hasNoNaN(outputs: { values: Record<string, number | undefined> }[], key: string): boolean {
  return outputs.every(o => {
    const v = o.values[key];
    return v === undefined || !Number.isNaN(v);
  });
}

/** Standard metadata tests for any indicator */
function testMetadata(indicator: Indicator, expectedOverlay: boolean) {
  it('name is a non-empty string', () => {
    expect(typeof indicator.name).toBe('string');
    expect(indicator.name.length).toBeGreaterThan(0);
  });

  it('shortName is a non-empty string', () => {
    expect(typeof indicator.shortName).toBe('string');
    expect(indicator.shortName.length).toBeGreaterThan(0);
  });

  it(`overlay is ${expectedOverlay}`, () => {
    expect(indicator.overlay).toBe(expectedOverlay);
  });

  it('plots array is non-empty', () => {
    expect(indicator.plots.length).toBeGreaterThan(0);
  });
}

// =============================================================================
// OVERLAYS
// =============================================================================

describe('Overlays', () => {
  // ── SMA ─────────────────────────────────────────────────────────────────
  describe('SMA', () => {
    testMetadata(sma, true);

    it('calculate() returns array of correct length', () => {
      const result = sma.calculate(BARS_100, { period: 20 });
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = sma.calculate(BARS_100, { period: 20 });
      expect(hasNoNaN(result, 'sma')).toBe(true);
    });

    it('warmup period produces undefined, then defined values', () => {
      const result = sma.calculate(BARS_100, { period: 20 });
      expect(result[18]!.values.sma).toBeUndefined();
      expect(result[19]!.values.sma).toBeDefined();
      expect(countDefined(result, 'sma')).toBe(81);
    });
  });

  // ── EMA ─────────────────────────────────────────────────────────────────
  describe('EMA', () => {
    testMetadata(ema, true);

    it('calculate() returns array of correct length', () => {
      const result = ema.calculate(BARS_100, { period: 20 });
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = ema.calculate(BARS_100, { period: 20 });
      expect(hasNoNaN(result, 'ema')).toBe(true);
    });

    it('warmup period produces undefined, then defined values', () => {
      const result = ema.calculate(BARS_100, { period: 20 });
      expect(result[18]!.values.ema).toBeUndefined();
      expect(result[19]!.values.ema).toBeDefined();
    });
  });

  // ── Bollinger Bands ─────────────────────────────────────────────────────
  describe('Bollinger Bands', () => {
    testMetadata(bollingerBands, true);

    it('calculate() returns array of correct length', () => {
      const result = bollingerBands.calculate(BARS_100, { period: 20, stdDev: 2 });
      expect(result).toHaveLength(100);
    });

    it('no NaN in upper, middle, lower', () => {
      const result = bollingerBands.calculate(BARS_100, { period: 20, stdDev: 2 });
      expect(hasNoNaN(result, 'upper')).toBe(true);
      expect(hasNoNaN(result, 'middle')).toBe(true);
      expect(hasNoNaN(result, 'lower')).toBe(true);
    });

    it('upper >= middle >= lower for all defined values', () => {
      const result = bollingerBands.calculate(BARS_100, { period: 20, stdDev: 2 });
      for (const o of result) {
        if (o.values.middle !== undefined) {
          expect(o.values.upper!).toBeGreaterThanOrEqual(o.values.middle!);
          expect(o.values.middle!).toBeGreaterThanOrEqual(o.values.lower!);
        }
      }
    });
  });

  // ── VWAP ────────────────────────────────────────────────────────────────
  describe('VWAP', () => {
    testMetadata(vwap, true);

    it('calculate() returns array of correct length', () => {
      const result = vwap.calculate(BARS_100);
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = vwap.calculate(BARS_100);
      expect(hasNoNaN(result, 'vwap')).toBe(true);
    });

    it('all values are defined (no warmup)', () => {
      const result = vwap.calculate(BARS_100);
      expect(countDefined(result, 'vwap')).toBe(100);
    });
  });

  // ── Ichimoku ────────────────────────────────────────────────────────────
  describe('Ichimoku', () => {
    testMetadata(ichimoku, true);

    it('calculate() returns array length >= input length (displaced senkou)', () => {
      const result = ichimoku.calculate(BARS_100, { tenkan: 9, kijun: 26, senkou: 52 });
      // Output is bars.length + kijun displacement
      expect(result.length).toBe(100 + 26);
    });

    it('no NaN in tenkan, kijun, senkouA, senkouB, chikou', () => {
      const result = ichimoku.calculate(BARS_100, { tenkan: 9, kijun: 26, senkou: 52 });
      expect(hasNoNaN(result, 'tenkan')).toBe(true);
      expect(hasNoNaN(result, 'kijun')).toBe(true);
      expect(hasNoNaN(result, 'senkouA')).toBe(true);
      expect(hasNoNaN(result, 'senkouB')).toBe(true);
      expect(hasNoNaN(result, 'chikou')).toBe(true);
    });

    it('tenkan is defined after tenkan period warmup', () => {
      const result = ichimoku.calculate(BARS_100, { tenkan: 9, kijun: 26, senkou: 52 });
      expect(result[7]!.values.tenkan).toBeUndefined();
      expect(result[8]!.values.tenkan).toBeDefined();
    });
  });

  // ── TWAP ────────────────────────────────────────────────────────────────
  describe('TWAP', () => {
    testMetadata(twap, true);

    it('calculate() returns array of correct length', () => {
      const result = twap.calculate(BARS_100);
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = twap.calculate(BARS_100);
      expect(hasNoNaN(result, 'twap')).toBe(true);
    });

    it('all values are defined (no warmup)', () => {
      const result = twap.calculate(BARS_100);
      expect(countDefined(result, 'twap')).toBe(100);
    });
  });

  // ── Supertrend ──────────────────────────────────────────────────────────
  describe('Supertrend', () => {
    testMetadata(supertrend, true);

    it('calculate() returns array of correct length', () => {
      const result = supertrend.calculate(BARS_100, { period: 10, multiplier: 3 });
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = supertrend.calculate(BARS_100, { period: 10, multiplier: 3 });
      expect(hasNoNaN(result, 'supertrend')).toBe(true);
    });

    it('warmup period produces undefined, then defined values', () => {
      const result = supertrend.calculate(BARS_100, { period: 10, multiplier: 3 });
      expect(result[9]!.values.supertrend).toBeUndefined();
      expect(result[10]!.values.supertrend).toBeDefined();
    });
  });

  // ── EMA Ribbon ──────────────────────────────────────────────────────────
  describe('EMA Ribbon', () => {
    testMetadata(emaRibbon, true);

    it('calculate() returns array of correct length', () => {
      const result = emaRibbon.calculate(BARS_100);
      expect(result).toHaveLength(100);
    });

    it('no NaN in any ribbon EMA', () => {
      const result = emaRibbon.calculate(BARS_100);
      for (const period of [8, 13, 21, 34, 55, 89]) {
        expect(hasNoNaN(result, `ema${period}`)).toBe(true);
      }
    });

    it('shorter EMAs converge sooner than longer ones', () => {
      const result = emaRibbon.calculate(BARS_100);
      expect(result[7]!.values.ema8).toBeDefined();
      expect(result[7]!.values.ema89).toBeUndefined();
      expect(result[88]!.values.ema89).toBeDefined();
    });
  });

  // ── Parabolic SAR ──────────────────────────────────────────────────────
  describe('Parabolic SAR', () => {
    testMetadata(sar, true);

    it('calculate() returns array of correct length', () => {
      const result = sar.calculate(BARS_100, { step: 0.02, max: 0.2 });
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = sar.calculate(BARS_100, { step: 0.02, max: 0.2 });
      expect(hasNoNaN(result, 'sar')).toBe(true);
    });

    it('first bar is undefined, rest are defined', () => {
      const result = sar.calculate(BARS_100, { step: 0.02, max: 0.2 });
      expect(result[0]!.values.sar).toBeUndefined();
      expect(countDefined(result, 'sar')).toBe(99);
    });
  });

  // ── Envelope ────────────────────────────────────────────────────────────
  describe('Envelope', () => {
    testMetadata(envelope, true);

    it('calculate() returns array of correct length', () => {
      const result = envelope.calculate(BARS_100, { period: 20, percent: 2.5 });
      expect(result).toHaveLength(100);
    });

    it('no NaN in upper, middle, lower', () => {
      const result = envelope.calculate(BARS_100, { period: 20, percent: 2.5 });
      expect(hasNoNaN(result, 'upper')).toBe(true);
      expect(hasNoNaN(result, 'middle')).toBe(true);
      expect(hasNoNaN(result, 'lower')).toBe(true);
    });

    it('upper > middle > lower for all defined values', () => {
      const result = envelope.calculate(BARS_100, { period: 20, percent: 2.5 });
      for (const o of result) {
        if (o.values.middle !== undefined) {
          expect(o.values.upper!).toBeGreaterThan(o.values.middle!);
          expect(o.values.middle!).toBeGreaterThan(o.values.lower!);
        }
      }
    });
  });
});

// =============================================================================
// OSCILLATORS
// =============================================================================

describe('Oscillators', () => {
  // ── RSI ─────────────────────────────────────────────────────────────────
  describe('RSI', () => {
    testMetadata(rsi, false);

    it('calculate() returns array of correct length', () => {
      const result = rsi.calculate(BARS_100, { period: 14 });
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = rsi.calculate(BARS_100, { period: 14 });
      expect(hasNoNaN(result, 'rsi')).toBe(true);
    });

    it('all defined RSI values are in range 0-100', () => {
      const result = rsi.calculate(BARS_100, { period: 14 });
      for (const o of result) {
        const v = o.values.rsi;
        if (v !== undefined) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
    });

    it('warmup period produces undefined, then defined values', () => {
      const result = rsi.calculate(BARS_100, { period: 14 });
      expect(result[13]!.values.rsi).toBeUndefined();
      expect(result[14]!.values.rsi).toBeDefined();
    });
  });

  // ── MACD ────────────────────────────────────────────────────────────────
  describe('MACD', () => {
    testMetadata(macd, false);

    it('calculate() returns array of correct length', () => {
      const result = macd.calculate(BARS_100, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
      expect(result).toHaveLength(100);
    });

    it('no NaN in macd, signal, histogram', () => {
      const result = macd.calculate(BARS_100, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
      expect(hasNoNaN(result, 'macd')).toBe(true);
      expect(hasNoNaN(result, 'signal')).toBe(true);
      expect(hasNoNaN(result, 'histogram')).toBe(true);
    });

    it('histogram equals macd minus signal where all are defined', () => {
      const result = macd.calculate(BARS_100, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
      for (const o of result) {
        if (o.values.macd !== undefined && o.values.signal !== undefined && o.values.histogram !== undefined) {
          expect(o.values.histogram).toBeCloseTo(o.values.macd - o.values.signal, 10);
        }
      }
    });
  });

  // ── Stochastic ──────────────────────────────────────────────────────────
  describe('Stochastic', () => {
    testMetadata(stochastic, false);

    it('calculate() returns array of correct length', () => {
      const result = stochastic.calculate(BARS_100, { kPeriod: 14, dPeriod: 3, smooth: 3 });
      expect(result).toHaveLength(100);
    });

    it('no NaN in k, d', () => {
      const result = stochastic.calculate(BARS_100, { kPeriod: 14, dPeriod: 3, smooth: 3 });
      expect(hasNoNaN(result, 'k')).toBe(true);
      expect(hasNoNaN(result, 'd')).toBe(true);
    });

    it('all defined %K values are in range 0-100', () => {
      const result = stochastic.calculate(BARS_100, { kPeriod: 14, dPeriod: 3, smooth: 3 });
      for (const o of result) {
        const v = o.values.k;
        if (v !== undefined) {
          expect(v).toBeGreaterThanOrEqual(-0.01);
          expect(v).toBeLessThanOrEqual(100.01);
        }
      }
    });

    it('all defined %D values are in range 0-100', () => {
      const result = stochastic.calculate(BARS_100, { kPeriod: 14, dPeriod: 3, smooth: 3 });
      for (const o of result) {
        const v = o.values.d;
        if (v !== undefined) {
          expect(v).toBeGreaterThanOrEqual(-0.01);
          expect(v).toBeLessThanOrEqual(100.01);
        }
      }
    });
  });

  // ── ATR ─────────────────────────────────────────────────────────────────
  describe('ATR', () => {
    testMetadata(atr, false);

    it('calculate() returns array of correct length', () => {
      const result = atr.calculate(BARS_100, { period: 14 });
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = atr.calculate(BARS_100, { period: 14 });
      expect(hasNoNaN(result, 'atr')).toBe(true);
    });

    it('all defined ATR values are positive', () => {
      const result = atr.calculate(BARS_100, { period: 14 });
      for (const o of result) {
        const v = o.values.atr;
        if (v !== undefined) {
          expect(v).toBeGreaterThan(0);
        }
      }
    });

    it('warmup period produces undefined, then defined values', () => {
      const result = atr.calculate(BARS_100, { period: 14 });
      expect(result[13]!.values.atr).toBeUndefined();
      expect(result[14]!.values.atr).toBeDefined();
    });
  });

  // ── OBV ─────────────────────────────────────────────────────────────────
  describe('OBV', () => {
    testMetadata(obv, false);

    it('calculate() returns array of correct length', () => {
      const result = obv.calculate(BARS_100);
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = obv.calculate(BARS_100);
      expect(hasNoNaN(result, 'obv')).toBe(true);
    });

    it('all values are defined (no warmup)', () => {
      const result = obv.calculate(BARS_100);
      expect(countDefined(result, 'obv')).toBe(100);
    });

    it('first bar OBV is 0', () => {
      const result = obv.calculate(BARS_100);
      expect(result[0]!.values.obv).toBe(0);
    });
  });

  // ── ADX ─────────────────────────────────────────────────────────────────
  describe('ADX', () => {
    testMetadata(adx, false);

    it('calculate() returns array of correct length', () => {
      const result = adx.calculate(BARS_100, { period: 14 });
      expect(result).toHaveLength(100);
    });

    it('no NaN in adx, pdi, mdi', () => {
      const result = adx.calculate(BARS_100, { period: 14 });
      expect(hasNoNaN(result, 'adx')).toBe(true);
      expect(hasNoNaN(result, 'pdi')).toBe(true);
      expect(hasNoNaN(result, 'mdi')).toBe(true);
    });

    it('all defined ADX values are in range 0-100', () => {
      const result = adx.calculate(BARS_200, { period: 14 });
      for (const o of result) {
        const v = o.values.adx;
        if (v !== undefined) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
    });

    it('ADX warmup is 2*period-2 bars', () => {
      const result = adx.calculate(BARS_100, { period: 14 });
      // ADX should be undefined before index 2*14-2 = 26
      expect(result[25]!.values.adx).toBeUndefined();
      expect(result[26]!.values.adx).toBeDefined();
    });
  });

  // ── MFI ─────────────────────────────────────────────────────────────────
  describe('MFI', () => {
    testMetadata(mfi, false);

    it('calculate() returns array of correct length', () => {
      const result = mfi.calculate(BARS_100, { period: 14 });
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = mfi.calculate(BARS_100, { period: 14 });
      expect(hasNoNaN(result, 'mfi')).toBe(true);
    });

    it('all defined MFI values are in range 0-100', () => {
      const result = mfi.calculate(BARS_100, { period: 14 });
      for (const o of result) {
        const v = o.values.mfi;
        if (v !== undefined) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
    });

    it('warmup period produces undefined, then defined values', () => {
      const result = mfi.calculate(BARS_100, { period: 14 });
      expect(result[13]!.values.mfi).toBeUndefined();
      expect(result[14]!.values.mfi).toBeDefined();
    });
  });

  // ── Williams %R ─────────────────────────────────────────────────────────
  describe('Williams %R', () => {
    testMetadata(williamsR, false);

    it('calculate() returns array of correct length', () => {
      const result = williamsR.calculate(BARS_100, { period: 14 });
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = williamsR.calculate(BARS_100, { period: 14 });
      expect(hasNoNaN(result, 'wr')).toBe(true);
    });

    it('all defined %R values are in range -100 to 0', () => {
      const result = williamsR.calculate(BARS_100, { period: 14 });
      for (const o of result) {
        const v = o.values.wr;
        if (v !== undefined) {
          expect(v).toBeGreaterThanOrEqual(-100);
          expect(v).toBeLessThanOrEqual(0);
        }
      }
    });

    it('warmup period produces undefined, then defined values', () => {
      const result = williamsR.calculate(BARS_100, { period: 14 });
      expect(result[12]!.values.wr).toBeUndefined();
      expect(result[13]!.values.wr).toBeDefined();
    });
  });

  // ── ROC ─────────────────────────────────────────────────────────────────
  describe('ROC', () => {
    testMetadata(roc, false);

    it('calculate() returns array of correct length', () => {
      const result = roc.calculate(BARS_100, { period: 12 });
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = roc.calculate(BARS_100, { period: 12 });
      expect(hasNoNaN(result, 'roc')).toBe(true);
    });

    it('warmup period produces undefined, then defined values', () => {
      const result = roc.calculate(BARS_100, { period: 12 });
      expect(result[11]!.values.roc).toBeUndefined();
      expect(result[12]!.values.roc).toBeDefined();
      expect(countDefined(result, 'roc')).toBe(88);
    });
  });

  // ── CVD ─────────────────────────────────────────────────────────────────
  describe('CVD', () => {
    testMetadata(cvd, false);

    it('calculate() returns array of correct length', () => {
      const result = cvd.calculate(BARS_100);
      expect(result).toHaveLength(100);
    });

    it('no NaN values in output', () => {
      const result = cvd.calculate(BARS_100);
      expect(hasNoNaN(result, 'cvd')).toBe(true);
    });

    it('all values are defined (no warmup)', () => {
      const result = cvd.calculate(BARS_100);
      expect(countDefined(result, 'cvd')).toBe(100);
    });

    it('CVD is cumulative — monotonically changes with bullish/bearish bars', () => {
      const result = cvd.calculate(BARS_100);
      // CVD at bar 0 should equal +/- volume of first bar
      const bar0 = BARS_100[0]!;
      const expectedSign = bar0.close >= bar0.open ? 1 : -1;
      expect(Math.sign(result[0]!.values.cvd!)).toBe(expectedSign);
    });
  });
});

// =============================================================================
// EDGE CASES (cross-cutting)
// =============================================================================

describe('Edge cases', () => {
  const allIndicators: { name: string; indicator: Indicator; params: Record<string, number> }[] = [
    { name: 'SMA', indicator: sma, params: { period: 20 } },
    { name: 'EMA', indicator: ema, params: { period: 20 } },
    { name: 'Bollinger', indicator: bollingerBands, params: { period: 20, stdDev: 2 } },
    { name: 'VWAP', indicator: vwap, params: {} },
    { name: 'TWAP', indicator: twap, params: {} },
    { name: 'Supertrend', indicator: supertrend, params: { period: 10, multiplier: 3 } },
    { name: 'EMA Ribbon', indicator: emaRibbon, params: {} },
    { name: 'SAR', indicator: sar, params: { step: 0.02, max: 0.2 } },
    { name: 'Envelope', indicator: envelope, params: { period: 20, percent: 2.5 } },
    { name: 'Ichimoku', indicator: ichimoku, params: { tenkan: 9, kijun: 26, senkou: 52 } },
    { name: 'RSI', indicator: rsi, params: { period: 14 } },
    { name: 'MACD', indicator: macd, params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } },
    { name: 'Stochastic', indicator: stochastic, params: { kPeriod: 14, dPeriod: 3, smooth: 3 } },
    { name: 'ATR', indicator: atr, params: { period: 14 } },
    { name: 'OBV', indicator: obv, params: {} },
    { name: 'ADX', indicator: adx, params: { period: 14 } },
    { name: 'MFI', indicator: mfi, params: { period: 14 } },
    { name: 'Williams %R', indicator: williamsR, params: { period: 14 } },
    { name: 'ROC', indicator: roc, params: { period: 12 } },
    { name: 'CVD', indicator: cvd, params: {} },
  ];

  for (const { name, indicator, params } of allIndicators) {
    it(`${name}: empty bars returns empty array`, () => {
      const result = indicator.calculate([], params);
      expect(result).toHaveLength(0);
    });
  }

  for (const { name, indicator, params } of allIndicators) {
    it(`${name}: single bar does not throw`, () => {
      const bars = genBars(1);
      expect(() => indicator.calculate(bars, params)).not.toThrow();
    });
  }

  for (const { name, indicator, params } of allIndicators) {
    it(`${name}: 200 bars does not throw`, () => {
      expect(() => indicator.calculate(BARS_200, params)).not.toThrow();
    });
  }
});
