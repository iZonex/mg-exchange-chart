import { describe, it, expect } from 'vitest';
import type { Bar } from '../src/api/types';
import { toHeikinAshi } from '../src/core/series/heikin-ashi';
import { ichimoku } from '../src/indicators/overlays/ichimoku';
import { obv } from '../src/indicators/oscillators/obv';
import { adx } from '../src/indicators/oscillators/adx';
import { mfi } from '../src/indicators/oscillators/mfi';
import { computeVolumeProfile } from '../src/indicators/volume/volume-profile';
import { rayTool } from '../src/drawings/tools/ray';
import { fibExtensionTool } from '../src/drawings/tools/fib-extension';
import { longShortTool } from '../src/drawings/tools/long-short';
import { priceRangeTool } from '../src/drawings/tools/price-range';

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

// ── Heikin Ashi ─────────────────────────────────────────────────────────────

describe('Heikin Ashi', () => {
  it('should transform bars correctly', () => {
    const bars = makeBars([100, 110, 105, 115, 120]);
    const ha = toHeikinAshi(bars);

    expect(ha).toHaveLength(5);

    // First bar: HA_Close = (O+H+L+C)/4 = (99.5+101+99+100)/4 = 99.875
    const first = ha[0]!;
    expect(first.close).toBeCloseTo((99.5 + 101 + 99 + 100) / 4, 5);
    // HA_Open = (O+C)/2 = (99.5+100)/2 = 99.75
    expect(first.open).toBeCloseTo((99.5 + 100) / 2, 5);
  });

  it('should produce smooth candles', () => {
    // Heikin Ashi candles should be smoother — adjacent HA_Open values
    // should be close to each other
    const bars = makeBars([100, 102, 98, 103, 97, 105]);
    const ha = toHeikinAshi(bars);

    for (let i = 1; i < ha.length; i++) {
      // HA_Open[i] = (HA_Open[i-1] + HA_Close[i-1]) / 2
      const expectedOpen = (ha[i - 1]!.open + ha[i - 1]!.close) / 2;
      expect(ha[i]!.open).toBeCloseTo(expectedOpen, 10);
    }
  });

  it('should handle empty data', () => {
    expect(toHeikinAshi([])).toHaveLength(0);
  });

  it('should handle single bar', () => {
    const ha = toHeikinAshi(makeBars([100]));
    expect(ha).toHaveLength(1);
  });
});

// ── Ichimoku ────────────────────────────────────────────────────────────────

describe('Ichimoku', () => {
  it('should compute tenkan-sen as midpoint of 9-period high/low', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    const bars = makeBars(closes, {
      highs: closes.map(c => c + 2),
      lows: closes.map(c => c - 2),
    });
    const result = ichimoku.calculate(bars, { tenkan: 9, kijun: 26, senkou: 52 });

    // At index 8 (9th bar), tenkan should be defined
    const tenkan8 = result[8]!.values.tenkan;
    expect(tenkan8).toBeDefined();
    // Midpoint of highs[0..8] and lows[0..8]
    // Highest high = 110 (close=108, high=110), Lowest low = 99 (close=100, low=98... wait)
    // Actually: closes[0]=100, high=102, low=98; closes[8]=108, high=110, low=106
    // Highest high in 0..8 = 110, lowest low = 98
    expect(tenkan8).toBeCloseTo((110 + 98) / 2, 5);
  });

  it('should produce outputs longer than input (displaced senkou)', () => {
    const bars = makeBars(Array.from({ length: 60 }, (_, i) => 100 + i));
    const result = ichimoku.calculate(bars, { tenkan: 9, kijun: 26, senkou: 52 });
    // Output should be bars.length + kijun = 86
    expect(result.length).toBe(60 + 26);
  });

  it('should handle empty data', () => {
    expect(ichimoku.calculate([], { tenkan: 9, kijun: 26, senkou: 52 })).toHaveLength(0);
  });
});

// ── OBV ─────────────────────────────────────────────────────────────────────

describe('OBV', () => {
  it('should accumulate volume on up closes', () => {
    const bars = makeBars([100, 110, 120], { volumes: [100, 200, 300] });
    const result = obv.calculate(bars);

    expect(result[0]!.values.obv).toBe(0);
    expect(result[1]!.values.obv).toBe(200);   // close up → +200
    expect(result[2]!.values.obv).toBe(500);   // close up → +300
  });

  it('should subtract volume on down closes', () => {
    const bars = makeBars([120, 110, 100], { volumes: [100, 200, 300] });
    const result = obv.calculate(bars);

    expect(result[0]!.values.obv).toBe(0);
    expect(result[1]!.values.obv).toBe(-200);
    expect(result[2]!.values.obv).toBe(-500);
  });

  it('should not change on equal closes', () => {
    const bars = makeBars([100, 100, 100], { volumes: [100, 200, 300] });
    const result = obv.calculate(bars);
    expect(result[2]!.values.obv).toBe(0);
  });
});

// ── ADX ─────────────────────────────────────────────────────────────────────

describe('ADX', () => {
  it('should produce +DI, -DI, and ADX values', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i * 0.5) * 10);
    const bars = makeBars(closes, {
      highs: closes.map(c => c + 2),
      lows: closes.map(c => c - 2),
    });
    const result = adx.calculate(bars, { period: 14 });

    expect(result).toHaveLength(40);

    // ADX should be defined after 2*period-1 bars
    const lastResult = result[result.length - 1]!.values;
    expect(lastResult.adx).toBeDefined();
    expect(lastResult.pdi).toBeDefined();
    expect(lastResult.mdi).toBeDefined();

    // ADX should be between 0 and 100
    expect(lastResult.adx!).toBeGreaterThanOrEqual(0);
    expect(lastResult.adx!).toBeLessThanOrEqual(100);
  });

  it('should handle empty data', () => {
    expect(adx.calculate([], { period: 14 })).toHaveLength(0);
  });
});

// ── MFI ─────────────────────────────────────────────────────────────────────

describe('MFI', () => {
  it('should be between 0 and 100', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i * 0.5);
    const bars = makeBars(closes, { volumes: closes.map(() => 100 + Math.random() * 200) });
    const result = mfi.calculate(bars, { period: 14 });

    for (const output of result) {
      if (output.values.mfi !== undefined) {
        expect(output.values.mfi).toBeGreaterThanOrEqual(-0.01);
        expect(output.values.mfi).toBeLessThanOrEqual(100.01);
      }
    }
  });

  it('should be 100 when all prices go up', () => {
    const bars = makeBars(
      Array.from({ length: 20 }, (_, i) => 100 + i),
      { highs: Array.from({ length: 20 }, (_, i) => 102 + i), lows: Array.from({ length: 20 }, (_, i) => 98 + i), volumes: Array(20).fill(100) },
    );
    const result = mfi.calculate(bars, { period: 14 });
    const lastMfi = result[result.length - 1]!.values.mfi;
    expect(lastMfi).toBeCloseTo(100, 1);
  });

  it('should handle empty data', () => {
    expect(mfi.calculate([], { period: 14 })).toHaveLength(0);
  });
});

// ── Volume Profile ──────────────────────────────────────────────────────────

describe('Volume Profile', () => {
  it('should distribute volume into bins', () => {
    const bars = makeBars([100, 110, 105, 115, 120], {
      highs: [105, 115, 110, 120, 125],
      lows: [95, 105, 100, 110, 115],
      volumes: [100, 200, 150, 300, 250],
    });
    const bins = computeVolumeProfile(bars, 95, 125, 6);

    expect(bins).toHaveLength(6);
    // Total volume should equal sum of bar volumes
    const totalBinVol = bins.reduce((s, b) => s + b.volume, 0);
    const totalBarVol = bars.reduce((s, b) => s + b.volume, 0);
    expect(totalBinVol).toBe(totalBarVol);
  });

  it('should separate buy and sell volume', () => {
    const bars: Bar[] = [
      { time: 1000, open: 100, high: 105, low: 95, close: 103, volume: 200 }, // bull
      { time: 1060, open: 103, high: 108, low: 98, close: 99, volume: 150 },  // bear
    ];
    const bins = computeVolumeProfile(bars, 95, 110, 3);
    const totalBuy = bins.reduce((s, b) => s + b.buyVolume, 0);
    const totalSell = bins.reduce((s, b) => s + b.sellVolume, 0);
    expect(totalBuy).toBe(200);
    expect(totalSell).toBe(150);
  });

  it('should handle empty data', () => {
    expect(computeVolumeProfile([], 0, 100)).toHaveLength(0);
  });
});

// ── New Drawing Tools Hit Tests ─────────────────────────────────────────────

describe('Ray Tool', () => {
  it('should hit near ray segment', () => {
    expect(rayTool.hitTest({ x: 5, y: 5 }, [{ x: 0, y: 0 }, { x: 10, y: 10 }], 5)).toBe(true);
  });

  it('should miss far from ray', () => {
    expect(rayTool.hitTest({ x: 50, y: 0 }, [{ x: 0, y: 0 }, { x: 10, y: 10 }], 5)).toBe(false);
  });
});

describe('Fib Extension Tool', () => {
  it('should have 3 handles', () => {
    const handles = fibExtensionTool.getHandles([{ x: 0, y: 100 }, { x: 50, y: 0 }, { x: 25, y: 50 }]);
    expect(handles).toHaveLength(3);
  });
});

describe('Long/Short Tool', () => {
  it('should hit inside the zone', () => {
    // Entry at y=50, target at y=20 (long), SL at y=80
    expect(longShortTool.hitTest({ x: 100, y: 40 }, [{ x: 0, y: 50 }, { x: 0, y: 20 }], 5)).toBe(true);
  });

  it('should miss outside the zone', () => {
    expect(longShortTool.hitTest({ x: 100, y: 200 }, [{ x: 0, y: 50 }, { x: 0, y: 20 }], 5)).toBe(false);
  });
});

describe('Price Range Tool', () => {
  it('should hit near connecting line', () => {
    expect(priceRangeTool.hitTest({ x: 5, y: 5 }, [{ x: 0, y: 0 }, { x: 10, y: 10 }], 5)).toBe(true);
  });
});
