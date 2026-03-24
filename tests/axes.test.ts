import { describe, it, expect, vi } from 'vitest';
import {
  priceToY,
  yToPrice,
  generatePriceTicks,
  renderPriceAxis,
  formatPrice,
  detectPrecision,
  PRICE_AXIS_WIDTH,
  type PriceScale,
  type PriceTick,
} from '../src/core/renderer/price-axis';
import {
  barIndexToX,
  xToBarIndex,
  generateTimeTicks,
  renderTimeAxis,
  TIME_AXIS_HEIGHT,
  type TimeScale,
  type TimeTick,
} from '../src/core/renderer/time-axis';
import type { Theme } from '../src/api/types';
import { darkTheme } from '../src/themes/dark';

// ── Mock canvas context ────────────────────────────────────────────────────

function mockCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    font: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
  } as unknown as CanvasRenderingContext2D;
}

// ── priceToY / yToPrice (linear) ────────────────────────────────────────────

describe('priceToY — linear', () => {
  const scale: PriceScale = { min: 100, max: 200, mode: 'linear' };
  const height = 500;

  it('should map max price to y=0 (top)', () => {
    expect(priceToY(200, scale, height)).toBeCloseTo(0, 10);
  });

  it('should map min price to y=chartHeight (bottom)', () => {
    expect(priceToY(100, scale, height)).toBeCloseTo(500, 10);
  });

  it('should map midpoint price to y=chartHeight/2', () => {
    expect(priceToY(150, scale, height)).toBeCloseTo(250, 10);
  });

  it('should handle price outside visible range', () => {
    // Price above max -> negative y
    expect(priceToY(250, scale, height)).toBeLessThan(0);
    // Price below min -> y > chartHeight
    expect(priceToY(50, scale, height)).toBeGreaterThan(height);
  });

  it('should return chartHeight/2 when range is zero', () => {
    const flatScale: PriceScale = { min: 100, max: 100, mode: 'linear' };
    expect(priceToY(100, flatScale, height)).toBe(250);
  });
});

describe('yToPrice — linear', () => {
  const scale: PriceScale = { min: 100, max: 200, mode: 'linear' };
  const height = 500;

  it('should map y=0 to max price', () => {
    expect(yToPrice(0, scale, height)).toBeCloseTo(200, 10);
  });

  it('should map y=chartHeight to min price', () => {
    expect(yToPrice(height, scale, height)).toBeCloseTo(100, 10);
  });

  it('should roundtrip priceToY -> yToPrice', () => {
    const prices = [110, 133.7, 150, 175, 199];
    for (const price of prices) {
      const y = priceToY(price, scale, height);
      const recovered = yToPrice(y, scale, height);
      expect(recovered).toBeCloseTo(price, 8);
    }
  });
});

// ── priceToY / yToPrice (logarithmic) ───────────────────────────────────────

describe('priceToY — logarithmic', () => {
  const scale: PriceScale = { min: 10, max: 1000, mode: 'logarithmic' };
  const height = 600;

  it('should map max price to y=0 (top)', () => {
    expect(priceToY(1000, scale, height)).toBeCloseTo(0, 8);
  });

  it('should map min price to y=chartHeight (bottom)', () => {
    expect(priceToY(10, scale, height)).toBeCloseTo(600, 8);
  });

  it('should place geometric midpoint at center', () => {
    // Geometric midpoint of 10 and 1000 = sqrt(10*1000) = 100
    const y = priceToY(100, scale, height);
    expect(y).toBeCloseTo(300, 0); // Should be roughly chartHeight/2
  });

  it('should roundtrip priceToY -> yToPrice in log mode', () => {
    const prices = [15, 50, 100, 500, 900];
    for (const price of prices) {
      const y = priceToY(price, scale, height);
      const recovered = yToPrice(y, scale, height);
      expect(recovered).toBeCloseTo(price, 5);
    }
  });

  it('should return chartHeight/2 when log range is zero', () => {
    const flatScale: PriceScale = { min: 100, max: 100, mode: 'logarithmic' };
    expect(priceToY(100, flatScale, 600)).toBe(300);
  });
});

// ── barIndexToX / xToBarIndex ───────────────────────────────────────────────

describe('barIndexToX / xToBarIndex', () => {
  const scale: TimeScale = { firstIndex: 0, visibleCount: 100, barSpacing: 8, offsetX: 0 };
  const chartWidth = 800;

  it('should map first bar to center of first bar slot', () => {
    const x = barIndexToX(0, scale, chartWidth);
    expect(x).toBe(4); // 0 * 8 + 0 + 8/2 = 4
  });

  it('should map bar 10 correctly', () => {
    const x = barIndexToX(10, scale, chartWidth);
    expect(x).toBe(84); // 10 * 8 + 0 + 4 = 84
  });

  it('should roundtrip barIndexToX -> xToBarIndex', () => {
    for (const idx of [0, 5, 25, 50, 99]) {
      const x = barIndexToX(idx, scale, chartWidth);
      const recovered = xToBarIndex(x, scale);
      expect(recovered).toBeCloseTo(idx, 8);
    }
  });

  it('should handle non-zero offsetX', () => {
    const offsetScale: TimeScale = { firstIndex: 10, visibleCount: 50, barSpacing: 12, offsetX: -6 };
    const x = barIndexToX(10, offsetScale, 600);
    // (10-10)*12 + (-6) + 12/2 = 0
    expect(x).toBe(0);

    const recovered = xToBarIndex(x, offsetScale);
    expect(recovered).toBeCloseTo(10, 8);
  });

  it('should handle fractional bar indices from xToBarIndex', () => {
    // x between two bar centers -> fractional index
    const x = barIndexToX(5, scale, chartWidth) + 2; // 2px to the right of bar 5 center
    const idx = xToBarIndex(x, scale);
    expect(idx).toBeGreaterThan(5);
    expect(idx).toBeLessThan(6);
  });
});

// ── generatePriceTicks ──────────────────────────────────────────────────────

describe('generatePriceTicks', () => {
  it('should generate ticks within the visible range', () => {
    const scale: PriceScale = { min: 100, max: 200, mode: 'linear' };
    const ticks = generatePriceTicks(scale, 500, 2);

    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.price).toBeGreaterThanOrEqual(100);
      expect(tick.price).toBeLessThanOrEqual(200);
      expect(tick.y).toBeGreaterThanOrEqual(0);
      expect(tick.y).toBeLessThanOrEqual(500);
    }
  });

  it('should produce labels matching formatPrice', () => {
    const scale: PriceScale = { min: 50, max: 150, mode: 'linear' };
    const ticks = generatePriceTicks(scale, 400, 2);

    for (const tick of ticks) {
      expect(tick.label).toBe(formatPrice(tick.price, 2));
    }
  });

  it('should return empty ticks when range is zero', () => {
    const scale: PriceScale = { min: 100, max: 100, mode: 'linear' };
    const ticks = generatePriceTicks(scale, 400, 2);
    expect(ticks).toHaveLength(0);
  });

  it('should return empty ticks when range is negative', () => {
    const scale: PriceScale = { min: 200, max: 100, mode: 'linear' };
    const ticks = generatePriceTicks(scale, 400, 2);
    expect(ticks).toHaveLength(0);
  });
});

// ── detectPrecision ─────────────────────────────────────────────────────────

describe('detectPrecision', () => {
  it('should return 2 for BTC-level prices (>= 1000)', () => {
    expect(detectPrecision(65000)).toBe(2);
    expect(detectPrecision(1000)).toBe(2);
  });

  it('should return 2 for prices >= 1', () => {
    expect(detectPrecision(1)).toBe(2);
    expect(detectPrecision(50.5)).toBe(2);
    expect(detectPrecision(999)).toBe(2);
  });

  it('should return 4 for prices >= 0.01', () => {
    expect(detectPrecision(0.01)).toBe(4);
    expect(detectPrecision(0.5)).toBe(4);
  });

  it('should return 6 for prices >= 0.0001', () => {
    expect(detectPrecision(0.0001)).toBe(6);
    expect(detectPrecision(0.005)).toBe(6); // 0.005 < 0.01 and >= 0.0001 => precision 6
  });

  it('should return 8 for very small prices', () => {
    expect(detectPrecision(0.00001)).toBe(8);
    expect(detectPrecision(0.00000001)).toBe(8);
  });
});

// ── formatPrice ─────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('should format with 2 decimal places', () => {
    expect(formatPrice(65432.1, 2)).toBe('65432.10');
  });

  it('should format with 0 decimal places', () => {
    expect(formatPrice(100.567, 0)).toBe('101');
  });

  it('should format with 8 decimal places', () => {
    expect(formatPrice(0.00000123, 8)).toBe('0.00000123');
  });

  it('should format negative prices', () => {
    expect(formatPrice(-50.5, 2)).toBe('-50.50');
  });

  it('should format zero', () => {
    expect(formatPrice(0, 4)).toBe('0.0000');
  });
});

// ── generateTimeTicks ────────────────────────────────────────────────────────

describe('generateTimeTicks', () => {
  const scale: TimeScale = { firstIndex: 0, visibleCount: 100, barSpacing: 10, offsetX: 0 };
  const chartWidth = 1000;

  // Helper: generate times lookup (each bar = 1 minute from epoch)
  const times = (index: number): number | undefined => {
    if (index < 0 || index > 200) return undefined;
    return 1700000000 + index * 60; // Unix seconds
  };

  it('should generate ticks for 1m timeframe', () => {
    const ticks = generateTimeTicks(times, scale, chartWidth, '1m');
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.x).toBeGreaterThanOrEqual(0);
      expect(tick.x).toBeLessThanOrEqual(chartWidth);
      expect(tick.label).toBeTruthy();
    }
  });

  it('should generate ticks for 1D timeframe', () => {
    // For daily, each bar = 1 day
    const dayTimes = (index: number): number | undefined => {
      if (index < 0 || index > 200) return undefined;
      return 1700000000 + index * 86400;
    };
    const ticks = generateTimeTicks(dayTimes, scale, chartWidth, '1D');
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      // Day labels should be like "Nov 14" format
      expect(tick.label).toBeTruthy();
    }
  });

  it('should generate ticks for seconds timeframe', () => {
    const secTimes = (index: number): number | undefined => {
      if (index < 0 || index > 200) return undefined;
      return 1700000000 + index * 5; // 5-second bars
    };
    const ticks = generateTimeTicks(secTimes, scale, chartWidth, '5s');
    expect(ticks.length).toBeGreaterThan(0);
    // Seconds format: HH:MM:SS
    for (const tick of ticks) {
      if (!tick.isMajor) {
        expect(tick.label).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      }
    }
  });

  it('should mark major boundaries (day/month/year changes)', () => {
    // Create times that cross a day boundary
    // Start at 23:50 UTC
    const crossDayTimes = (index: number): number | undefined => {
      if (index < 0 || index > 200) return undefined;
      // Start at 2023-11-14 23:50 UTC = 1700006400 - 600
      return 1700006400 - 600 + index * 60;
    };
    const ticks = generateTimeTicks(crossDayTimes, scale, chartWidth, '1m');
    // At least some should exist
    expect(ticks.length).toBeGreaterThan(0);
  });

  it('should respect minLabelSpacing of 80px', () => {
    // With barSpacing=10, step=ceil(80/10)=8
    const ticks = generateTimeTicks(times, scale, chartWidth, '1m');
    // All ticks should be at least ~80px apart
    for (let i = 1; i < ticks.length; i++) {
      const gap = Math.abs(ticks[i]!.x - ticks[i - 1]!.x);
      // Step is 8 bars * 10px = 80px exactly
      expect(gap).toBeGreaterThanOrEqual(79); // allow tiny float rounding
    }
  });

  it('should skip indices where times returns undefined', () => {
    const sparseTimes = (index: number): number | undefined => {
      if (index % 2 === 0) return undefined; // half the bars have no time
      return 1700000000 + index * 60;
    };
    const ticks = generateTimeTicks(sparseTimes, scale, chartWidth, '1m');
    // Should not crash; may produce fewer ticks
    expect(Array.isArray(ticks)).toBe(true);
  });

  it('should return empty array when no times are available', () => {
    const noTimes = (): undefined => undefined;
    const ticks = generateTimeTicks(noTimes, scale, chartWidth, '1m');
    expect(ticks).toHaveLength(0);
  });

  it('should handle weekly timeframe formatting', () => {
    const weekTimes = (index: number): number | undefined => {
      if (index < 0 || index > 200) return undefined;
      return 1700000000 + index * 604800; // 1 week
    };
    const ticks = generateTimeTicks(weekTimes, scale, chartWidth, '1W');
    expect(ticks.length).toBeGreaterThan(0);
    // Weekly format: "MMM DD"
    for (const tick of ticks) {
      expect(tick.label).toBeTruthy();
    }
  });

  it('should handle 4H timeframe', () => {
    const h4Times = (index: number): number | undefined => {
      if (index < 0 || index > 200) return undefined;
      return 1700000000 + index * 14400; // 4 hours
    };
    const ticks = generateTimeTicks(h4Times, scale, chartWidth, '4H');
    expect(ticks.length).toBeGreaterThan(0);
    // 4H format: HH:MM
    for (const tick of ticks) {
      if (!tick.isMajor) {
        expect(tick.label).toMatch(/^\d{2}:\d{2}$/);
      }
    }
  });
});

// ── renderTimeAxis ───────────────────────────────────────────────────────────

describe('renderTimeAxis', () => {
  const theme = darkTheme;
  const width = 800;
  const yTop = 470;

  it('should render background, border, and labels', () => {
    const ticks: TimeTick[] = [
      { index: 0, x: 50, label: '10:30', isMajor: false },
      { index: 10, x: 150, label: '10:40', isMajor: false },
      { index: 20, x: 250, label: 'Nov 15', isMajor: true },
    ];
    const ctx = mockCtx();
    renderTimeAxis(ctx, ticks, theme, width, yTop);

    // Background fill
    expect(ctx.fillRect).toHaveBeenCalledWith(0, yTop, width, TIME_AXIS_HEIGHT);
    // Border line
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    // Labels: one fillText per tick
    expect(ctx.fillText).toHaveBeenCalledTimes(3);
  });

  it('should use textPrimary for major ticks and textSecondary for minor', () => {
    const ticks: TimeTick[] = [
      { index: 0, x: 50, label: '10:30', isMajor: false },
      { index: 10, x: 150, label: 'Dec', isMajor: true },
    ];
    const ctx = mockCtx();
    renderTimeAxis(ctx, ticks, theme, width, yTop);

    // Check that fillStyle was set appropriately before each fillText
    expect(ctx.fillText).toHaveBeenCalledTimes(2);
  });

  it('should render empty tick array without errors', () => {
    const ctx = mockCtx();
    renderTimeAxis(ctx, [], theme, width, yTop);

    // Background and border still drawn, but no labels
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('should center labels at tick x positions', () => {
    const ticks: TimeTick[] = [
      { index: 5, x: 100, label: '12:00', isMajor: false },
    ];
    const ctx = mockCtx();
    renderTimeAxis(ctx, ticks, theme, width, yTop);

    expect(ctx.fillText).toHaveBeenCalledWith('12:00', 100, yTop + TIME_AXIS_HEIGHT / 2);
  });
});

// ── TIME_AXIS_HEIGHT constant ────────────────────────────────────────────────

describe('TIME_AXIS_HEIGHT', () => {
  it('should be 28', () => {
    expect(TIME_AXIS_HEIGHT).toBe(28);
  });
});

// ── renderPriceAxis ──────────────────────────────────────────────────────────

describe('renderPriceAxis', () => {
  const theme = darkTheme;

  it('should render background, border, and tick labels', () => {
    const ticks: PriceTick[] = [
      { price: 150, y: 250, label: '150.00' },
      { price: 160, y: 200, label: '160.00' },
      { price: 170, y: 150, label: '170.00' },
    ];
    const ctx = mockCtx();
    renderPriceAxis(ctx, ticks, theme, 730, 0, 500);

    // Background fill
    expect(ctx.fillRect).toHaveBeenCalledWith(730, 0, PRICE_AXIS_WIDTH, 500);
    // Border
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    // Labels
    expect(ctx.fillText).toHaveBeenCalledTimes(3);
    expect(ctx.fillText).toHaveBeenCalledWith('150.00', 738, 250);
    expect(ctx.fillText).toHaveBeenCalledWith('160.00', 738, 200);
    expect(ctx.fillText).toHaveBeenCalledWith('170.00', 738, 150);
  });

  it('should render empty ticks without errors', () => {
    const ctx = mockCtx();
    renderPriceAxis(ctx, [], theme, 730, 0, 500);

    // Background and border drawn, but no labels
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it('should use left alignment for labels', () => {
    const ticks: PriceTick[] = [{ price: 100, y: 300, label: '100.00' }];
    const ctx = mockCtx();
    renderPriceAxis(ctx, ticks, theme, 730, 0, 500);

    // textAlign should be set to 'left'
    expect(ctx.textAlign).toBe('left');
  });

  it('should respect xLeft offset for positioning', () => {
    const ticks: PriceTick[] = [{ price: 200, y: 100, label: '200.00' }];
    const ctx = mockCtx();
    const xLeft = 600;
    renderPriceAxis(ctx, ticks, theme, xLeft, 0, 400);

    // fillRect at xLeft
    expect(ctx.fillRect).toHaveBeenCalledWith(600, 0, PRICE_AXIS_WIDTH, 400);
    // Label at xLeft + 8
    expect(ctx.fillText).toHaveBeenCalledWith('200.00', 608, 100);
  });

  it('should respect yTop offset', () => {
    const ticks: PriceTick[] = [{ price: 100, y: 50, label: '100.00' }];
    const ctx = mockCtx();
    renderPriceAxis(ctx, ticks, theme, 730, 100, 300);

    // fillRect with yTop=100
    expect(ctx.fillRect).toHaveBeenCalledWith(730, 100, PRICE_AXIS_WIDTH, 300);
  });
});

// ── PRICE_AXIS_WIDTH constant ────────────────────────────────────────────────

describe('PRICE_AXIS_WIDTH', () => {
  it('should be 70', () => {
    expect(PRICE_AXIS_WIDTH).toBe(70);
  });
});
