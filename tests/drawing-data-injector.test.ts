import { describe, it, expect } from 'vitest';
import { injectDrawingData, DataInjectorContext } from '../src/core/renderer/drawing-data-injector';
import type { DrawingOptions, Point, Bar } from '../src/api/types';
import type { PixelPoint } from '../src/drawings/primitives/hit-test';

/** Helper to create a minimal Bar */
function mkBar(overrides: Partial<Bar> & { time: number }): Bar {
  return {
    time: overrides.time,
    open: overrides.open ?? 100,
    high: overrides.high ?? 110,
    low: overrides.low ?? 90,
    close: overrides.close ?? 105,
    volume: overrides.volume ?? 1000,
  };
}

/** Default context for tests */
function mkCtx(overrides?: Partial<DataInjectorContext>): DataInjectorContext {
  const bars: Bar[] = [];
  for (let i = 0; i < 100; i++) {
    bars.push(mkBar({ time: 1000 + i * 60, close: 100 + i, open: 99 + i, high: 110 + i, low: 90 + i, volume: 1000 + i * 10 }));
  }
  return {
    nearestIndex: (time: number) => Math.round((time - 1000) / 60),
    getRange: (from: number, to: number) => bars.slice(Math.max(0, from), Math.min(bars.length, to)),
    precision: 2,
    priceScale: { min: 50, max: 200, mode: 'linear' as const },
    mainPaneHeight: 500,
    ...overrides,
  };
}

const defaultOpts: DrawingOptions = { color: '#ff0000', lineWidth: 1, lineStyle: 'solid' };

describe('injectDrawingData', () => {

  // ── Single-point tools ──────────────────────────────────────────────

  describe('single-point tools', () => {
    it('returns options unchanged for 0 points', () => {
      const result = injectDrawingData('trend-line', [], [], defaultOpts, mkCtx());
      expect(result).toBe(defaultOpts);
    });

    it('injects time/price labels for vertical-line', () => {
      const p: Point = { time: 1609459200, price: 42000 };
      const px: PixelPoint = { x: 100, y: 200 };
      const result = injectDrawingData('vertical-line', [p], [px], defaultOpts, mkCtx()) as any;
      expect(result._timeLabel).toBeDefined();
      expect(result._priceLabel).toBe('42000.00');
    });

    it('injects time/price labels for cross-line', () => {
      const p: Point = { time: 1609459200, price: 42000 };
      const px: PixelPoint = { x: 100, y: 200 };
      const result = injectDrawingData('cross-line', [p], [px], defaultOpts, mkCtx()) as any;
      expect(result._timeLabel).toBeDefined();
      expect(result._priceLabel).toBe('42000.00');
    });

    it('injects formatted price text for horizontal-ray', () => {
      const p: Point = { time: 1000, price: 123.456 };
      const result = injectDrawingData('horizontal-ray', [p], [{ x: 0, y: 0 }], defaultOpts, mkCtx()) as any;
      expect(result.text).toBe('123.46');
    });

    it('returns unchanged options for unknown single-point tool', () => {
      const p: Point = { time: 1000, price: 100 };
      const result = injectDrawingData('unknown-tool', [p], [{ x: 0, y: 0 }], defaultOpts, mkCtx());
      expect(result.color).toBe('#ff0000');
    });
  });

  // ── Anchored VWAP ─────────────────────────────────────────────────

  describe('anchored-vwap', () => {
    it('computes VWAP data when barIndexToX is provided', () => {
      const p: Point = { time: 1000, price: 100 };
      const ctx = mkCtx({ barIndexToX: (idx: number) => idx * 10 });
      const result = injectDrawingData('anchored-vwap', [p], [{ x: 0, y: 0 }], defaultOpts, ctx) as any;
      expect(result._vwapData).toBeDefined();
      expect(result._vwapData.length).toBeGreaterThan(0);
      // Each point should have x, y
      expect(result._vwapData[0]).toHaveProperty('x');
      expect(result._vwapData[0]).toHaveProperty('y');
    });

    it('skips VWAP when barIndexToX is not provided', () => {
      const p: Point = { time: 1000, price: 100 };
      const ctx = mkCtx(); // no barIndexToX
      const result = injectDrawingData('anchored-vwap', [p], [{ x: 0, y: 0 }], defaultOpts, ctx) as any;
      expect(result._vwapData).toBeUndefined();
    });

    it('skips VWAP when no bars in range', () => {
      const p: Point = { time: 1000, price: 100 };
      const ctx = mkCtx({
        barIndexToX: (idx: number) => idx * 10,
        getRange: () => [],
      });
      const result = injectDrawingData('anchored-vwap', [p], [{ x: 0, y: 0 }], defaultOpts, ctx) as any;
      expect(result._vwapData).toBeUndefined();
    });

    it('handles zero volume bars in VWAP', () => {
      const zeroBars = [mkBar({ time: 1000, volume: 0, close: 100, high: 110, low: 90 })];
      const p: Point = { time: 1000, price: 100 };
      const ctx = mkCtx({
        barIndexToX: (idx: number) => idx * 10,
        getRange: () => zeroBars,
        nearestIndex: () => 0,
      });
      const result = injectDrawingData('anchored-vwap', [p], [{ x: 0, y: 0 }], defaultOpts, ctx) as any;
      expect(result._vwapData).toBeDefined();
      expect(result._vwapData.length).toBe(1);
    });
  });

  // ── Line-type tools ────────────────────────────────────────────────

  describe('line-type tools', () => {
    const lineTools = ['trend-line', 'ray', 'extended-line', 'arrow', 'sine-line', 'cyclic-lines', 'info-line', 'trend-angle', 'time-cycles'];

    for (const tool of lineTools) {
      it(`injects _lineData for ${tool}`, () => {
        const points: Point[] = [
          { time: 1000, price: 100 },
          { time: 1600, price: 110 },
        ];
        const pxPoints: PixelPoint[] = [
          { x: 0, y: 100 },
          { x: 100, y: 50 },
        ];
        const result = injectDrawingData(tool, points, pxPoints, defaultOpts, mkCtx()) as any;
        expect(result._lineData).toBeDefined();
        expect(result._lineData.bars).toBe(10);
        expect(result._lineData.deltaPrice).toBe(10);
        expect(typeof result._lineData.angle).toBe('number');
        expect(typeof result._lineData.pctChange).toBe('number');
      });
    }

    it('handles zero start price (no division by zero)', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 1600, price: 10 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 100 }, { x: 100, y: 50 }];
      const result = injectDrawingData('trend-line', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._lineData.pctChange).toBe(0);
    });
  });

  // ── Forecast ───────────────────────────────────────────────────────

  describe('forecast', () => {
    it('injects _lineData and _entryPrice', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 100 }, { x: 100, y: 50 }];
      const result = injectDrawingData('forecast', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._lineData).toBeDefined();
      expect(result._entryPrice).toBe(100);
      expect(result._lineData.pctChange).toBeCloseTo(20);
    });

    it('handles zero entry price', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 1600, price: 10 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 100 }, { x: 100, y: 50 }];
      const result = injectDrawingData('forecast', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._lineData.pctChange).toBe(0);
    });
  });

  // ── Measurement tools ──────────────────────────────────────────────

  describe('price-range', () => {
    it('injects _priceData', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 150 },
      ];
      const result = injectDrawingData('price-range', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._priceData.price1).toBe(100);
      expect(result._priceData.price2).toBe(150);
      expect(result._priceData.bars).toBe(10);
    });
  });

  describe('date-range', () => {
    it('injects _barCount and _duration in days', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1000 + 86400 * 2, price: 100 },
      ];
      const result = injectDrawingData('date-range', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._barCount).toBeDefined();
      expect(result._duration).toContain('2.0');
    });

    it('formats duration in hours', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1000 + 7200, price: 100 },
      ];
      const result = injectDrawingData('date-range', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._duration).toBeDefined();
    });

    it('formats duration in minutes', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1000 + 300, price: 100 },
      ];
      const result = injectDrawingData('date-range', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._duration).toBeDefined();
    });

    it('formats duration in seconds', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1000 + 30, price: 100 },
      ];
      const result = injectDrawingData('date-range', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._duration).toBeDefined();
    });
  });

  describe('date-price-range', () => {
    it('injects _datePriceData with delta, pct, bars, duration', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1000 + 86400, price: 120 },
      ];
      const result = injectDrawingData('date-price-range', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._datePriceData.deltaPrice).toBe(20);
      expect(result._datePriceData.pctChange).toBeCloseTo(20);
      expect(result._datePriceData.bars).toBeDefined();
      expect(result._datePriceData.duration).toBeDefined();
    });

    it('handles zero price', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 2000, price: 10 },
      ];
      const result = injectDrawingData('date-price-range', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._datePriceData.pctChange).toBe(0);
    });
  });

  // ── Rect-type tools ────────────────────────────────────────────────

  describe('rect-type tools', () => {
    for (const tool of ['rectangle', 'ellipse', 'gann-square', 'gann-square-fixed']) {
      it(`injects _rectData for ${tool}`, () => {
        const points: Point[] = [
          { time: 1000, price: 100 },
          { time: 1600, price: 120 },
        ];
        const result = injectDrawingData(tool, points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
        expect(result._rectData.priceRange).toBe(20);
        expect(result._rectData.pctRange).toBeCloseTo(20);
        expect(result._rectData.bars).toBe(10);
        expect(result._rectData.duration).toBeDefined();
      });
    }

    it('handles zero price', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 1600, price: 20 },
      ];
      const result = injectDrawingData('rectangle', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._rectData.pctRange).toBe(0);
    });
  });

  // ── Triangle ───────────────────────────────────────────────────────

  describe('triangle', () => {
    it('injects _rectData with 3 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
        { time: 2200, price: 90 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
      const result = injectDrawingData('triangle', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._rectData.priceRange).toBe(30); // 120 - 90
      expect(result._rectData.pctRange).toBeCloseTo(30);
    });

    it('falls through with only 2 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
      ];
      const result = injectDrawingData('triangle', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._rectData).toBeUndefined();
    });
  });

  // ── Head & Shoulders ──────────────────────────────────────────────

  describe('head-shoulders', () => {
    it('injects _hsTarget for regular head & shoulders', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },  // left shoulder base
        { time: 1060, price: 110 },  // neckline left
        { time: 1120, price: 130 },  // head
        { time: 1180, price: 112 },  // neckline right
        { time: 1240, price: 100 },  // right shoulder base
      ];
      const pxPoints: PixelPoint[] = points.map((_, i) => ({ x: i * 50, y: i * 10 }));
      const result = injectDrawingData('head-shoulders', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._hsTarget).toBeDefined();
      expect(result._hsTarget.targetPrice).toBeDefined();
      // Head (130) is above neckAvg ((110+112)/2 = 111), so targetPrice = 111 - 19 = 92
      expect(result._hsTarget.targetPrice).toBeCloseTo(92);
    });

    it('injects _hsTarget for inverted head & shoulders', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 90 },   // neckline left
        { time: 1120, price: 70 },   // head (below neckline)
        { time: 1180, price: 88 },   // neckline right
        { time: 1240, price: 100 },
      ];
      const pxPoints: PixelPoint[] = points.map((_, i) => ({ x: i * 50, y: i * 10 }));
      const result = injectDrawingData('head-shoulders', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._hsTarget).toBeDefined();
      // Head (70) < neckAvg ((90+88)/2 = 89), so inverted; target = 89 + 19 = 108
      expect(result._hsTarget.targetPrice).toBeCloseTo(108);
    });

    it('handles zero neckline avg', () => {
      const points: Point[] = [
        { time: 1000, price: 10 },
        { time: 1060, price: 0 },
        { time: 1120, price: -5 },
        { time: 1180, price: 0 },
        { time: 1240, price: 10 },
      ];
      const pxPoints: PixelPoint[] = points.map((_, i) => ({ x: i * 50, y: i * 10 }));
      const result = injectDrawingData('head-shoulders', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._hsTarget.pct).toBe(0);
    });

    it('falls through with less than 5 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 110 },
        { time: 1120, price: 130 },
      ];
      const result = injectDrawingData('head-shoulders', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], defaultOpts, mkCtx()) as any;
      expect(result._hsTarget).toBeUndefined();
    });
  });

  // ── Channel-type tools (pitchfork variants) ────────────────────────

  describe('pitchfork variants', () => {
    for (const tool of ['pitchfork', 'schiff-pitchfork', 'modified-schiff-pitchfork', 'inside-pitchfork']) {
      it(`injects _channelData for ${tool}`, () => {
        const points: Point[] = [
          { time: 1000, price: 100 },
          { time: 1060, price: 120 },
          { time: 1120, price: 110 },
        ];
        const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 25 }];
        const result = injectDrawingData(tool, points, pxPoints, defaultOpts, mkCtx()) as any;
        expect(result._channelData).toBeDefined();
        expect(result._channelData.priceWidth).toBe(10); // |110 - 120|
        expect(result._channelData.pctWidth).toBeCloseTo(10);
        expect(result._channelData.pxDist).toBe(0);
      });
    }

    it('handles zero price in pitchfork', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 1060, price: 10 },
        { time: 1120, price: 5 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 25 }];
      const result = injectDrawingData('pitchfork', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._channelData.pctWidth).toBe(0);
    });

    it('falls through pitchfork with only 2 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 120 },
      ];
      const result = injectDrawingData('pitchfork', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._channelData).toBeUndefined();
    });
  });

  // ── Parallel Channel ──────────────────────────────────────────────

  describe('parallel-channel', () => {
    it('injects _channelData with pxDist', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
        { time: 1300, price: 90 },
      ];
      const pxPoints: PixelPoint[] = [
        { x: 0, y: 100 },
        { x: 200, y: 50 },
        { x: 100, y: 150 },
      ];
      const result = injectDrawingData('parallel-channel', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._channelData).toBeDefined();
      expect(typeof result._channelData.priceWidth).toBe('number');
      expect(typeof result._channelData.pctWidth).toBe('number');
      expect(typeof result._channelData.pxDist).toBe('number');
      expect(result._channelData.pxDist).toBeGreaterThan(0);
    });

    it('handles zero-length baseline (pxLen=0)', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1000, price: 100 }, // same point => zero length
        { time: 1300, price: 90 },
      ];
      const pxPoints: PixelPoint[] = [
        { x: 50, y: 50 },
        { x: 50, y: 50 }, // same pixel => pxLen=0
        { x: 100, y: 100 },
      ];
      const ctx = mkCtx({ nearestIndex: () => 0 });
      const result = injectDrawingData('parallel-channel', points, pxPoints, defaultOpts, ctx) as any;
      expect(result._channelData.pxDist).toBe(0);
    });

    it('handles zero price', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 1600, price: 10 },
        { time: 1300, price: 5 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 25 }];
      const result = injectDrawingData('parallel-channel', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._channelData.pctWidth).toBe(0);
    });

    it('falls through with only 2 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
      ];
      const result = injectDrawingData('parallel-channel', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._channelData).toBeUndefined();
    });
  });

  // ── Polyline ──────────────────────────────────────────────────────

  describe('polyline', () => {
    it('injects _polyData with segment stats', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 110 },
        { time: 1120, price: 105 },
      ];
      const pxPoints: PixelPoint[] = points.map((_, i) => ({ x: i * 50, y: i * 10 }));
      const result = injectDrawingData('polyline', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._polyData.segments).toBe(2);
      expect(result._polyData.totalBars).toBe(2);
      expect(result._polyData.totalPrice).toBe(15); // |10| + |5|
      expect(typeof result._polyData.totalPct).toBe('number');
    });

    it('handles zero price', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 1060, price: 10 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 50, y: 50 }];
      const result = injectDrawingData('polyline', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._polyData.totalPct).toBe(0);
    });
  });

  // ── Regression Channel ────────────────────────────────────────────

  describe('regression-channel', () => {
    it('injects _regrData with regression stats', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 110 },
      ];
      const result = injectDrawingData('regression-channel', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._regrData).toBeDefined();
      expect(typeof result._regrData.stddev).toBe('number');
      expect(typeof result._regrData.r2).toBe('number');
      expect(typeof result._regrData.regrStartPrice).toBe('number');
      expect(typeof result._regrData.regrEndPrice).toBe('number');
      expect(result._regrData.bars).toBe(10);
    });

    it('handles range with < 2 bars', () => {
      const ctx = mkCtx({ getRange: () => [] });
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 110 },
      ];
      const result = injectDrawingData('regression-channel', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, ctx) as any;
      // Falls back to p1/p2 prices
      expect(result._regrData.regrStartPrice).toBe(100);
      expect(result._regrData.regrEndPrice).toBe(110);
      expect(result._regrData.stddev).toBe(0);
    });

    it('handles range with exactly 1 bar', () => {
      const ctx = mkCtx({ getRange: () => [mkBar({ time: 1000, close: 100 })] });
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 110 },
      ];
      const result = injectDrawingData('regression-channel', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, ctx) as any;
      expect(result._regrData.stddev).toBe(0);
    });

    it('handles flat data (ssTot=0 => r2=0)', () => {
      const flatBars = Array.from({ length: 5 }, (_, i) => mkBar({ time: 1000 + i * 60, close: 100 }));
      const ctx = mkCtx({ getRange: () => flatBars });
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1240, price: 100 },
      ];
      const result = injectDrawingData('regression-channel', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, ctx) as any;
      expect(result._regrData.r2).toBe(0);
      expect(result._regrData.stddev).toBe(0);
    });

    it('handles zero price for pctStddev', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 1600, price: 10 },
      ];
      const result = injectDrawingData('regression-channel', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._regrData.pctStddev).toBe(0);
    });
  });

  // ── Fibonacci tools ───────────────────────────────────────────────

  describe('fibonacci tools', () => {
    for (const tool of ['fib-retracement', 'fib-extension', 'trend-fib-extension']) {
      it(`injects _fibPrices for ${tool}`, () => {
        const points: Point[] = [
          { time: 1000, price: 100 },
          { time: 1600, price: 150 },
        ];
        const result = injectDrawingData(tool, points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
        expect(result._fibPrices.p1).toBe(100);
        expect(result._fibPrices.p2).toBe(150);
        expect(result._fibPrices.precision).toBe(2);
      });
    }
  });

  // ── Long/Short position ───────────────────────────────────────────

  describe('long-short', () => {
    it('injects _entryPrice, _targetPrice, _precision', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
      ];
      const result = injectDrawingData('long-short', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._entryPrice).toBe(100);
      expect(result._targetPrice).toBe(120);
      expect(result._precision).toBe(2);
    });
  });

  // ── Flat Top/Bottom ───────────────────────────────────────────────

  describe('flat-top-bottom', () => {
    it('injects _channelData with 3 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
        { time: 1300, price: 115 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 25 }];
      const result = injectDrawingData('flat-top-bottom', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._channelData.priceWidth).toBe(15); // |115 - 100|
      expect(result._channelData.pctWidth).toBeCloseTo(15);
    });

    it('handles zero price', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 1600, price: 10 },
        { time: 1300, price: 5 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 50, y: 25 }];
      const result = injectDrawingData('flat-top-bottom', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._channelData.pctWidth).toBe(0);
    });

    it('falls through with only 2 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
      ];
      const result = injectDrawingData('flat-top-bottom', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._channelData).toBeUndefined();
    });
  });

  // ── Disjoint Channel ──────────────────────────────────────────────

  describe('disjoint-channel', () => {
    it('injects _channelData with 4 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
        { time: 1000, price: 110 },
        { time: 1600, price: 130 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 25 }, { x: 100, y: 75 }];
      const result = injectDrawingData('disjoint-channel', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._channelData.priceWidth).toBe(10); // avg(|110-100|, |130-120|) = 10
      expect(result._channelData.pctWidth).toBeCloseTo(10);
    });

    it('handles zero price', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 1600, price: 10 },
        { time: 1000, price: 5 },
        { time: 1600, price: 15 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
      const result = injectDrawingData('disjoint-channel', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._channelData.pctWidth).toBe(0);
    });

    it('falls through with only 3 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
        { time: 1000, price: 110 },
      ];
      const result = injectDrawingData('disjoint-channel', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], defaultOpts, mkCtx()) as any;
      expect(result._channelData).toBeUndefined();
    });
  });

  // ── Trend Fib Time ────────────────────────────────────────────────

  describe('trend-fib-time', () => {
    it('injects _lineData with bars only', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
      ];
      const result = injectDrawingData('trend-fib-time', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx()) as any;
      expect(result._lineData).toBeDefined();
      expect(result._lineData.bars).toBe(10);
    });
  });

  // ── Elliott Combos ────────────────────────────────────────────────

  describe('elliott-double-combo', () => {
    it('injects _comboData with 4+ points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 110 },
        { time: 1120, price: 105 },
        { time: 1180, price: 130 },
      ];
      const pxPoints: PixelPoint[] = points.map((_, i) => ({ x: i * 50, y: i * 10 }));
      const result = injectDrawingData('elliott-double-combo', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._comboData.totalPx).toBe(30); // |130 - 100|
      expect(result._comboData.pct).toBeCloseTo(30);
    });

    it('handles zero price', () => {
      const points: Point[] = [
        { time: 1000, price: 0 },
        { time: 1060, price: 10 },
        { time: 1120, price: 5 },
        { time: 1180, price: 20 },
      ];
      const pxPoints: PixelPoint[] = points.map((_, i) => ({ x: i * 50, y: i * 10 }));
      const result = injectDrawingData('elliott-double-combo', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._comboData.pct).toBe(0);
    });

    it('falls through with only 3 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 110 },
        { time: 1120, price: 105 },
      ];
      const result = injectDrawingData('elliott-double-combo', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], defaultOpts, mkCtx()) as any;
      expect(result._comboData).toBeUndefined();
    });
  });

  describe('elliott-triple-combo', () => {
    it('injects _comboData with 6+ points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 110 },
        { time: 1120, price: 105 },
        { time: 1180, price: 120 },
        { time: 1240, price: 115 },
        { time: 1300, price: 140 },
      ];
      const pxPoints: PixelPoint[] = points.map((_, i) => ({ x: i * 50, y: i * 10 }));
      const result = injectDrawingData('elliott-triple-combo', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._comboData.totalPx).toBe(40); // |140 - 100|
      expect(result._comboData.pct).toBeCloseTo(40);
    });

    it('handles zero price', () => {
      const points: Point[] = Array.from({ length: 6 }, (_, i) => ({ time: 1000 + i * 60, price: i === 0 ? 0 : i * 10 }));
      const pxPoints: PixelPoint[] = points.map((_, i) => ({ x: i * 50, y: i * 10 }));
      const result = injectDrawingData('elliott-triple-combo', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._comboData.pct).toBe(0);
    });

    it('falls through with only 5 points', () => {
      const points: Point[] = Array.from({ length: 5 }, (_, i) => ({ time: 1000 + i * 60, price: 100 + i * 10 }));
      const pxPoints: PixelPoint[] = points.map((_, i) => ({ x: i * 50, y: i * 10 }));
      const result = injectDrawingData('elliott-triple-combo', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._comboData).toBeUndefined();
    });
  });

  // ── Bars Pattern (Ghost Feed) ─────────────────────────────────────

  describe('bars-pattern', () => {
    it('injects _ghostBars with 3+ points and barIndexToX', () => {
      const bars = Array.from({ length: 10 }, (_, i) =>
        mkBar({ time: 1000 + i * 60, open: 100 + i, high: 110 + i, low: 90 + i, close: 105 + i, volume: 1000 }),
      );
      const points: Point[] = [
        { time: 1000, price: 100 },  // from
        { time: 1300, price: 110 },  // to (idx ~5)
        { time: 1600, price: 105 },  // destination
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 25 }];
      const ctx = mkCtx({
        barIndexToX: (idx: number) => idx * 20,
        getRange: (from: number, to: number) => bars.slice(Math.max(0, from), Math.min(bars.length, to)),
      });
      const result = injectDrawingData('bars-pattern', points, pxPoints, defaultOpts, ctx) as any;
      expect(result._ghostBars).toBeDefined();
      expect(result._ghostBars.length).toBeGreaterThan(0);
      // Each ghost bar should have x, open, high, low, close, width
      const gb = result._ghostBars[0];
      expect(gb).toHaveProperty('x');
      expect(gb).toHaveProperty('open');
      expect(gb).toHaveProperty('high');
      expect(gb).toHaveProperty('low');
      expect(gb).toHaveProperty('close');
      expect(gb).toHaveProperty('width');
    });

    it('skips when barIndexToX is not provided', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1300, price: 110 },
        { time: 1600, price: 105 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 25 }];
      const result = injectDrawingData('bars-pattern', points, pxPoints, defaultOpts, mkCtx()) as any;
      expect(result._ghostBars).toBeUndefined();
    });

    it('skips when range returns empty bars', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1300, price: 110 },
        { time: 1600, price: 105 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 25 }];
      const ctx = mkCtx({
        barIndexToX: (idx: number) => idx * 20,
        getRange: () => [],
      });
      const result = injectDrawingData('bars-pattern', points, pxPoints, defaultOpts, ctx) as any;
      expect(result._ghostBars).toBeUndefined();
    });

    it('falls through with only 2 points', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1300, price: 110 },
      ];
      const ctx = mkCtx({ barIndexToX: (idx: number) => idx * 20 });
      const result = injectDrawingData('bars-pattern', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, ctx) as any;
      expect(result._ghostBars).toBeUndefined();
    });

    it('ensures minimum bar width of 2', () => {
      const bars = [mkBar({ time: 1000, close: 100, open: 99, high: 101, low: 98, volume: 500 })];
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 100 },
        { time: 1120, price: 100 },
      ];
      const pxPoints: PixelPoint[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
      const ctx = mkCtx({
        barIndexToX: (idx: number) => idx * 1, // very small spacing => width < 2
        getRange: () => bars,
        nearestIndex: (time: number) => Math.round((time - 1000) / 60),
      });
      const result = injectDrawingData('bars-pattern', points, pxPoints, defaultOpts, ctx) as any;
      expect(result._ghostBars).toBeDefined();
      expect(result._ghostBars[0].width).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Fixed Range Volume Profile ────────────────────────────────────

  describe('fixed-range-vp', () => {
    it('injects _vpBins with volume profile data', () => {
      const bars = Array.from({ length: 20 }, (_, i) =>
        mkBar({
          time: 1000 + i * 60,
          open: 100 + (i % 3),
          high: 110 + (i % 5),
          low: 90 - (i % 4),
          close: 105 + (i % 2 === 0 ? 2 : -2),
          volume: 1000 + i * 100,
        }),
      );
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 2140, price: 120 },
      ];
      const ctx = mkCtx({
        getRange: (from: number, to: number) => bars.slice(Math.max(0, from), Math.min(bars.length, to)),
      });
      const result = injectDrawingData('fixed-range-vp', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, ctx) as any;
      expect(result._vpBins).toBeDefined();
      expect(result._vpBins.length).toBe(40);
      // Each bin should have y1, y2, buyW, sellW, isPOC, isVA
      const bin = result._vpBins[0];
      expect(bin).toHaveProperty('y1');
      expect(bin).toHaveProperty('y2');
      expect(bin).toHaveProperty('buyW');
      expect(bin).toHaveProperty('sellW');
      expect(bin).toHaveProperty('isPOC');
      expect(bin).toHaveProperty('isVA');
      // Exactly one POC
      const pocCount = result._vpBins.filter((b: any) => b.isPOC).length;
      expect(pocCount).toBe(1);
      // At least some VA bins
      const vaCount = result._vpBins.filter((b: any) => b.isVA).length;
      expect(vaCount).toBeGreaterThan(0);
    });

    it('skips when range returns empty bars', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 2000, price: 120 },
      ];
      const ctx = mkCtx({ getRange: () => [] });
      const result = injectDrawingData('fixed-range-vp', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, ctx) as any;
      expect(result._vpBins).toBeUndefined();
    });

    it('handles single bar range', () => {
      const bars = [mkBar({ time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 1000 })];
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1060, price: 110 },
      ];
      const ctx = mkCtx({ getRange: () => bars });
      const result = injectDrawingData('fixed-range-vp', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, ctx) as any;
      expect(result._vpBins).toBeDefined();
    });

    it('covers vaHigh expansion when POC is at lowest bin', () => {
      // Create bars where most volume is at the low end so POC is at bin 0
      // This forces the else-if branch (line 300) where vaLow=0 and expansion goes upward
      const bars: Bar[] = [];
      for (let i = 0; i < 20; i++) {
        // Bars with close near the low end have high volume, others have low volume
        bars.push(mkBar({
          time: 1000 + i * 60,
          open: 90 + i,
          high: 91 + i,
          low: 89 + i,
          close: 90 + i,
          volume: i < 5 ? 10000 : 10, // heavy volume at lowest bars
        }));
      }
      const points: Point[] = [
        { time: 1000, price: 89 },
        { time: 2140, price: 120 },
      ];
      const ctx = mkCtx({
        getRange: (from: number, to: number) => bars.slice(Math.max(0, from), Math.min(bars.length, to)),
      });
      const result = injectDrawingData('fixed-range-vp', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, ctx) as any;
      expect(result._vpBins).toBeDefined();
      // POC should be at a low index since volume is concentrated at low prices
      const pocBin = result._vpBins.findIndex((b: any) => b.isPOC);
      expect(pocBin).toBeLessThan(result._vpBins.length / 2);
    });

    it('covers value area expanding to full range', () => {
      // Create bars spread across full range with relatively even volume
      // This ensures the while loop runs until vaLow=0 and vaHigh=length-1
      const bars: Bar[] = [];
      for (let i = 0; i < 40; i++) {
        bars.push(mkBar({
          time: 1000 + i * 60,
          open: 90 + i * 0.5,
          high: 91 + i * 0.5,
          low: 89 + i * 0.5,
          close: 90.5 + i * 0.5,
          volume: 100 + i,
        }));
      }
      const points: Point[] = [
        { time: 1000, price: 89 },
        { time: 3400, price: 111 },
      ];
      const ctx = mkCtx({
        getRange: (from: number, to: number) => bars.slice(Math.max(0, from), Math.min(bars.length, to)),
      });
      const result = injectDrawingData('fixed-range-vp', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, ctx) as any;
      expect(result._vpBins).toBeDefined();
      // Value area should include many bins
      const vaCount = result._vpBins.filter((b: any) => b.isVA).length;
      expect(vaCount).toBeGreaterThan(0);
    });

    it('handles zero volume bins correctly', () => {
      // Use bars with a price range but zero volume to test buyW/sellW = 0 branch
      const bars = Array.from({ length: 5 }, (_, i) =>
        mkBar({ time: 1000 + i * 60, open: 100, high: 110, low: 90, close: 105, volume: 0 }),
      );
      const points: Point[] = [
        { time: 1000, price: 90 },
        { time: 1240, price: 110 },
      ];
      const ctx = mkCtx({ getRange: () => bars });
      const result = injectDrawingData('fixed-range-vp', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, ctx) as any;
      expect(result._vpBins).toBeDefined();
      // With zero volume, buyW and sellW should be 0
      for (const bin of result._vpBins) {
        expect(bin.buyW).toBe(0);
        expect(bin.sellW).toBe(0);
      }
    });
  });

  // ── Unknown tool / passthrough ────────────────────────────────────

  describe('passthrough', () => {
    it('returns original options for unknown 2-point tool', () => {
      const points: Point[] = [
        { time: 1000, price: 100 },
        { time: 1600, price: 120 },
      ];
      const result = injectDrawingData('unknown-tool-xyz', points, [{ x: 0, y: 0 }, { x: 1, y: 1 }], defaultOpts, mkCtx());
      expect(result.color).toBe('#ff0000');
    });
  });
});
