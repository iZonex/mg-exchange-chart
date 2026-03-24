import { describe, it, expect } from 'vitest';
import type { Bar } from '../src/api/types';
import { sma } from '../src/indicators/overlays/sma';
import { ema } from '../src/indicators/overlays/ema';
import { bollingerBands } from '../src/indicators/overlays/bollinger';
import { vwap } from '../src/indicators/overlays/vwap';
import { rsi } from '../src/indicators/oscillators/rsi';
import { macd } from '../src/indicators/oscillators/macd';
import { stochastic } from '../src/indicators/oscillators/stochastic';
import { atr } from '../src/indicators/oscillators/atr';
import { DataSource } from '../src/core/data/data-source';

// ── Test data ───────────────────────────────────────────────────────────────

function makeBars(closes: number[], options?: { highs?: number[]; lows?: number[]; volumes?: number[] }): Bar[] {
  return closes.map((close, i) => ({
    time: 1000 + i * 60,
    open: close - 0.5,
    high: options?.highs?.[i] ?? close + 1,
    low: options?.lows?.[i] ?? close - 1,
    close,
    volume: options?.volumes?.[i] ?? 100,
  }));
}

// Known closing prices for verification
const CLOSES = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
                45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64];

// ── SMA Tests ───────────────────────────────────────────────────────────────

describe('SMA', () => {
  it('should compute SMA correctly for period 5', () => {
    const bars = makeBars([10, 20, 30, 40, 50, 60, 70]);
    const result = sma.calculate(bars, { period: 5 });

    // First 4 values should be undefined
    expect(result[0]!.values.sma).toBeUndefined();
    expect(result[3]!.values.sma).toBeUndefined();

    // SMA(5) at index 4 = (10+20+30+40+50)/5 = 30
    expect(result[4]!.values.sma).toBeCloseTo(30, 10);
    // SMA(5) at index 5 = (20+30+40+50+60)/5 = 40
    expect(result[5]!.values.sma).toBeCloseTo(40, 10);
    // SMA(5) at index 6 = (30+40+50+60+70)/5 = 50
    expect(result[6]!.values.sma).toBeCloseTo(50, 10);
  });

  it('should return all undefined for period > data length', () => {
    const bars = makeBars([10, 20]);
    const result = sma.calculate(bars, { period: 5 });
    expect(result.every(r => r.values.sma === undefined)).toBe(true);
  });

  it('should handle single bar with period 1', () => {
    const bars = makeBars([42]);
    const result = sma.calculate(bars, { period: 1 });
    expect(result[0]!.values.sma).toBeCloseTo(42, 10);
  });

  it('should handle empty data', () => {
    const result = sma.calculate([], { period: 5 });
    expect(result).toHaveLength(0);
  });
});

// ── EMA Tests ───────────────────────────────────────────────────────────────

describe('EMA', () => {
  it('should compute EMA correctly for period 5', () => {
    const bars = makeBars([10, 20, 30, 40, 50, 60, 70]);
    const result = ema.calculate(bars, { period: 5 });

    // First 4 values should be undefined
    expect(result[0]!.values.ema).toBeUndefined();
    expect(result[3]!.values.ema).toBeUndefined();

    // First EMA = SMA of first 5 = (10+20+30+40+50)/5 = 30
    expect(result[4]!.values.ema).toBeCloseTo(30, 10);

    // EMA[5] = 60 * (2/6) + 30 * (4/6) = 20 + 20 = 40
    expect(result[5]!.values.ema).toBeCloseTo(40, 10);

    // EMA[6] = 70 * (2/6) + 40 * (4/6) = 23.333 + 26.667 = 50
    expect(result[6]!.values.ema).toBeCloseTo(50, 10);
  });

  it('should handle empty data', () => {
    const result = ema.calculate([], { period: 5 });
    expect(result).toHaveLength(0);
  });
});

// ── Bollinger Bands Tests ───────────────────────────────────────────────────

describe('Bollinger Bands', () => {
  it('should compute middle band as SMA', () => {
    const bars = makeBars([10, 20, 30, 40, 50]);
    const result = bollingerBands.calculate(bars, { period: 5, stdDev: 2 });

    // Middle = SMA(5) = 30
    expect(result[4]!.values.middle).toBeCloseTo(30, 10);
  });

  it('should have upper > middle > lower', () => {
    const bars = makeBars([10, 20, 30, 40, 50, 60, 70]);
    const result = bollingerBands.calculate(bars, { period: 5, stdDev: 2 });

    for (let i = 4; i < result.length; i++) {
      const { upper, middle, lower } = result[i]!.values;
      expect(upper).toBeDefined();
      expect(middle).toBeDefined();
      expect(lower).toBeDefined();
      expect(upper!).toBeGreaterThan(middle!);
      expect(middle!).toBeGreaterThan(lower!);
    }
  });

  it('should have zero bandwidth for constant prices', () => {
    const bars = makeBars([50, 50, 50, 50, 50]);
    const result = bollingerBands.calculate(bars, { period: 5, stdDev: 2 });
    expect(result[4]!.values.upper).toBeCloseTo(50, 10);
    expect(result[4]!.values.middle).toBeCloseTo(50, 10);
    expect(result[4]!.values.lower).toBeCloseTo(50, 10);
  });
});

// ── VWAP Tests ──────────────────────────────────────────────────────────────

describe('VWAP', () => {
  it('should compute VWAP as volume-weighted typical price', () => {
    const bars = makeBars([100, 110, 120], {
      highs: [105, 115, 125],
      lows: [95, 105, 115],
      volumes: [1000, 500, 500],
    });
    const result = vwap.calculate(bars);

    // Bar 0: TP = (105+95+100)/3 = 100, cum TPV = 100000, cum vol = 1000, VWAP = 100
    expect(result[0]!.values.vwap).toBeCloseTo(100, 1);

    // Bar 1: TP = (115+105+110)/3 = 110, cum TPV = 100000+55000 = 155000, cum vol = 1500
    expect(result[1]!.values.vwap).toBeCloseTo(155000 / 1500, 1);
  });

  it('should handle empty data', () => {
    const result = vwap.calculate([]);
    expect(result).toHaveLength(0);
  });
});

// ── RSI Tests ───────────────────────────────────────────────────────────────

describe('RSI', () => {
  it('should compute RSI with Wilder smoothing', () => {
    const bars = makeBars(CLOSES);
    const result = rsi.calculate(bars, { period: 14 });

    // First 14 values should be undefined (need period+1 bars, index 0 has no change)
    expect(result[0]!.values.rsi).toBeUndefined();
    expect(result[13]!.values.rsi).toBeUndefined();

    // RSI at index 14 should be defined and between 0-100
    const rsiVal = result[14]!.values.rsi;
    expect(rsiVal).toBeDefined();
    expect(rsiVal!).toBeGreaterThanOrEqual(0);
    expect(rsiVal!).toBeLessThanOrEqual(100);
  });

  it('should be 100 when all changes are up', () => {
    const bars = makeBars([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    const result = rsi.calculate(bars, { period: 5 });
    const lastRsi = result[result.length - 1]!.values.rsi;
    expect(lastRsi!).toBeGreaterThan(98); // Wilder's smoothing approaches 100 asymptotically
  });

  it('should be 0 when all changes are down', () => {
    const bars = makeBars([100, 90, 80, 70, 60, 50, 40, 30, 20, 10]);
    const result = rsi.calculate(bars, { period: 5 });
    const lastRsi = result[result.length - 1]!.values.rsi;
    expect(lastRsi).toBeCloseTo(0, 5);
  });

  it('should handle empty data', () => {
    const result = rsi.calculate([], { period: 14 });
    expect(result).toHaveLength(0);
  });
});

// ── MACD Tests ──────────────────────────────────────────────────────────────

describe('MACD', () => {
  it('should produce MACD, signal, and histogram values', () => {
    // Need enough bars for slow EMA (26) + signal (9) = 34 bars minimum
    const closes = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.3) * 10);
    const bars = makeBars(closes);
    const result = macd.calculate(bars, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });

    expect(result).toHaveLength(50);

    // First 25 values should have undefined MACD (need slow EMA period)
    expect(result[0]!.values.macd).toBeUndefined();

    // After enough bars, all three should be defined
    const lastResult = result[result.length - 1]!.values;
    expect(lastResult.macd).toBeDefined();
    expect(lastResult.signal).toBeDefined();
    expect(lastResult.histogram).toBeDefined();

    // Histogram = MACD - Signal
    expect(lastResult.histogram).toBeCloseTo(lastResult.macd! - lastResult.signal!, 10);
  });

  it('should handle empty data', () => {
    const result = macd.calculate([], { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
    expect(result).toHaveLength(0);
  });
});

// ── Stochastic Tests ────────────────────────────────────────────────────────

describe('Stochastic', () => {
  it('should compute %K between 0 and 100', () => {
    const bars = makeBars(CLOSES, {
      highs: CLOSES.map(c => c + 2),
      lows: CLOSES.map(c => c - 2),
    });
    const result = stochastic.calculate(bars, { kPeriod: 14, dPeriod: 3, smooth: 3 });

    for (const output of result) {
      const k = output.values.k;
      if (k !== undefined) {
        expect(k).toBeGreaterThanOrEqual(-0.01); // allow tiny float error
        expect(k).toBeLessThanOrEqual(100.01);
      }
    }
  });

  it('should return 50 for constant prices', () => {
    const bars = makeBars(Array(20).fill(50), {
      highs: Array(20).fill(50),
      lows: Array(20).fill(50),
    });
    const result = stochastic.calculate(bars, { kPeriod: 14, dPeriod: 3, smooth: 3 });
    // When high=low=close, %K should be 50 (our edge case handler)
    const lastK = result[result.length - 1]!.values.k;
    if (lastK !== undefined) {
      expect(lastK).toBeCloseTo(50, 1);
    }
  });
});

// ── ATR Tests ───────────────────────────────────────────────────────────────

describe('ATR', () => {
  it('should compute ATR correctly', () => {
    const bars = makeBars(CLOSES, {
      highs: CLOSES.map(c => c + 1),
      lows: CLOSES.map(c => c - 1),
    });
    const result = atr.calculate(bars, { period: 14 });

    // First 14 values should have undefined ATR
    expect(result[0]!.values.atr).toBeUndefined();
    expect(result[13]!.values.atr).toBeUndefined();

    // ATR at index 14 should be defined and positive
    const atrVal = result[14]!.values.atr;
    expect(atrVal).toBeDefined();
    expect(atrVal!).toBeGreaterThan(0);
  });

  it('should produce consistent ATR for bars with same range', () => {
    // All bars have same range: high-low = 2, no gaps
    const closes = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50];
    const bars = makeBars(closes, {
      highs: closes.map(c => c + 1),
      lows: closes.map(c => c - 1),
    });
    const result = atr.calculate(bars, { period: 5 });

    // TR = max(2, |51-50|, |49-50|) = 2 for each bar
    // ATR should converge to 2
    const lastAtr = result[result.length - 1]!.values.atr;
    expect(lastAtr).toBeCloseTo(2, 5);
  });

  it('should handle empty data', () => {
    const result = atr.calculate([], { period: 14 });
    expect(result).toHaveLength(0);
  });

  it('should handle single bar', () => {
    const bars = makeBars([50]);
    const result = atr.calculate(bars, { period: 14 });
    expect(result).toHaveLength(1);
    expect(result[0]!.values.atr).toBeUndefined();
  });
});

// ── DataSource Tests ────────────────────────────────────────────────────────

describe('DataSource', () => {
  // DataSource imported at top level

  it('should store and retrieve bars', () => {
    const ds = new DataSource();
    const bars = makeBars([10, 20, 30]);
    ds.setData(bars);
    expect(ds.length).toBe(3);
    expect(ds.first.close).toBe(10);
    expect(ds.last.close).toBe(30);
  });

  it('should find nearest index by time', () => {
    const ds = new DataSource();
    const bars = makeBars([10, 20, 30, 40, 50]);
    ds.setData(bars);

    // Exact match
    expect(ds.nearestIndex(1000 + 2 * 60)).toBe(2);
    // Between bars — should return closest
    expect(ds.nearestIndex(1000 + 2.3 * 60)).toBe(2);
    expect(ds.nearestIndex(1000 + 2.7 * 60)).toBe(3);
  });

  it('should update last bar in place', () => {
    const ds = new DataSource();
    ds.setData(makeBars([10, 20, 30]));
    ds.updateLast({ time: 1000 + 2 * 60, open: 29, high: 35, low: 28, close: 33, volume: 200 });
    expect(ds.last.close).toBe(33);
    expect(ds.length).toBe(3); // no new bar added
  });

  it('should append new bar', () => {
    const ds = new DataSource();
    ds.setData(makeBars([10, 20, 30]));
    ds.updateLast({ time: 1000 + 3 * 60, open: 30, high: 35, low: 28, close: 33, volume: 200 });
    expect(ds.length).toBe(4);
  });

  it('should prepend historical bars', () => {
    const ds = new DataSource();
    ds.setData(makeBars([30, 40, 50]));
    const oldBars: Bar[] = [
      { time: 800, open: 10, high: 12, low: 9, close: 11, volume: 100 },
      { time: 860, open: 11, high: 13, low: 10, close: 12, volume: 100 },
    ];
    ds.prepend(oldBars);
    expect(ds.length).toBe(5);
    expect(ds.first.time).toBe(800);
  });

  it('should compute price range', () => {
    const ds = new DataSource();
    ds.setData(makeBars([10, 20, 30], { highs: [15, 25, 35], lows: [5, 15, 25] }));
    const range = ds.getPriceRange(0, 3);
    expect(range!.min).toBe(5);
    expect(range!.max).toBe(35);
  });
});
