import { describe, bench } from 'vitest';
import type { Bar } from '../src/api/types';
import { BarBuffer } from '../src/core/data/bar-buffer';
import { DataSource } from '../src/core/data/data-source';
import { sma } from '../src/indicators/overlays/sma';
import { ema } from '../src/indicators/overlays/ema';
import { rsi } from '../src/indicators/oscillators/rsi';
import { macd } from '../src/indicators/oscillators/macd';
import { bollingerBands } from '../src/indicators/overlays/bollinger';

function generateBars(count: number): Bar[] {
  const bars: Bar[] = [];
  let price = 42000;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 100;
    const open = price;
    const close = price + change;
    bars.push({
      time: 1000 + i * 60,
      open,
      high: Math.max(open, close) + Math.random() * 50,
      low: Math.min(open, close) - Math.random() * 50,
      close,
      volume: 100 + Math.random() * 500,
    });
    price = close;
  }
  return bars;
}

const bars1K = generateBars(1_000);
const bars10K = generateBars(10_000);
const bars100K = generateBars(100_000);

// ── BarBuffer vs DataSource ─────────────────────────────────────────────────

describe('Data Storage', () => {
  bench('BarBuffer: load 100K bars', () => {
    const buf = new BarBuffer();
    buf.setFromBars(bars100K);
  });

  bench('DataSource: load 100K bars', () => {
    const ds = new DataSource();
    ds.setData(bars100K);
  });

  bench('BarBuffer: getPriceRange 100K', () => {
    const buf = new BarBuffer();
    buf.setFromBars(bars100K);
    buf.getPriceRange(0, 100_000);
  });

  bench('DataSource: getPriceRange 100K', () => {
    const ds = new DataSource();
    ds.setData(bars100K);
    ds.getPriceRange(0, 100_000);
  });

  bench('BarBuffer: nearestIndex (binary search)', () => {
    const buf = new BarBuffer();
    buf.setFromBars(bars100K);
    for (let i = 0; i < 1000; i++) {
      buf.nearestIndex(1000 + Math.random() * 100_000 * 60);
    }
  });
});

// ── Indicator Computation ───────────────────────────────────────────────────

describe('Indicator Computation', () => {
  bench('SMA(20) on 10K bars', () => {
    sma.calculate(bars10K, { period: 20 });
  });

  bench('EMA(20) on 10K bars', () => {
    ema.calculate(bars10K, { period: 20 });
  });

  bench('RSI(14) on 10K bars', () => {
    rsi.calculate(bars10K, { period: 14 });
  });

  bench('MACD(12,26,9) on 10K bars', () => {
    macd.calculate(bars10K, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
  });

  bench('Bollinger(20,2) on 10K bars', () => {
    bollingerBands.calculate(bars10K, { period: 20, stdDev: 2 });
  });

  bench('SMA(20) on 100K bars', () => {
    sma.calculate(bars100K, { period: 20 });
  });

  bench('RSI(14) on 100K bars', () => {
    rsi.calculate(bars100K, { period: 14 });
  });
});
