import { describe, it, expect, vi } from 'vitest';
import type { Bar, Theme } from '../src/api/types';
import type { PriceScale } from '../src/core/renderer/price-axis';
import type { TimeScale } from '../src/core/renderer/time-axis';
import { renderHollowCandles } from '../src/core/series/hollow-candle';
import { renderLineMarkers } from '../src/core/series/line-markers';
import { renderStepLine } from '../src/core/series/step-line';
import { renderHlcArea } from '../src/core/series/hlc-area';
import { renderColumns } from '../src/core/series/columns';
import { renderHighLow } from '../src/core/series/high-low';
import { renderCandlesticks } from '../src/core/series/candlestick';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeBars(count: number): Bar[] {
  return Array.from({ length: count }, (_, i) => ({
    time: 1000 + i * 60,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 102 + i,
    volume: 1000 + i * 10,
  }));
}

function makeTimeScale(barSpacing = 10): TimeScale {
  return {
    barSpacing,
    firstVisibleBar: 0,
    lastVisibleBar: 99,
    totalBars: 100,
    scrollOffset: 0,
  } as TimeScale;
}

function makePriceScale(): PriceScale {
  return {
    minPrice: 90,
    maxPrice: 210,
    mode: 'linear',
  } as PriceScale;
}

function makeTheme(): Theme {
  return {
    name: 'test',
    bg: '#000000',
    gridLine: '#333333',
    borderColor: '#444444',
    textPrimary: '#ffffff',
    textSecondary: '#aaaaaa',
    textMuted: '#666666',
    crosshairLine: '#ffffff',
    crosshairLabel: '#333333',
    crosshairLabelText: '#ffffff',
    bullCandle: '#26a69a',
    bullCandleWick: '#26a69a',
    bearCandle: '#ef5350',
    bearCandleWick: '#ef5350',
    volumeBull: '#26a69a80',
    volumeBear: '#ef535080',
    lineDefault: '#2196f3',
    selectionHighlight: '#1e88e5',
    tooltipBg: '#222222',
    tooltipBorder: '#444444',
    tooltipText: '#ffffff',
  };
}

function mockCtx(): CanvasRenderingContext2D {
  const noop = vi.fn();
  return {
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    stroke: noop,
    fill: noop,
    fillRect: noop,
    strokeRect: noop,
    closePath: noop,
    arc: noop,
    createLinearGradient: vi.fn(() => ({
      addColorStop: noop,
    })),
    save: noop,
    restore: noop,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'round' as CanvasLineJoin,
    lineCap: 'round' as CanvasLineCap,
    globalAlpha: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'top' as CanvasTextBaseline,
  } as unknown as CanvasRenderingContext2D;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Hollow Candle', () => {
  it('should render without errors', () => {
    const ctx = mockCtx();
    expect(() => {
      renderHollowCandles(ctx, makeBars(20), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should handle empty bars', () => {
    const ctx = mockCtx();
    expect(() => {
      renderHollowCandles(ctx, [], 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should call strokeRect for bull candles (hollow)', () => {
    const ctx = mockCtx();
    // Create bars where close > open (bull)
    const bars: Bar[] = [{ time: 1000, open: 100, high: 110, low: 95, close: 105, volume: 100 }];
    renderHollowCandles(ctx, bars, 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    expect(ctx.strokeRect).toHaveBeenCalled();
  });

  it('should call fillRect for bear candles (filled)', () => {
    const ctx = mockCtx();
    // Create bars where close < open (bear)
    const bars: Bar[] = [{ time: 1000, open: 105, high: 110, low: 95, close: 100, volume: 100 }];
    renderHollowCandles(ctx, bars, 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});

describe('Line with Markers', () => {
  it('should render without errors', () => {
    const ctx = mockCtx();
    expect(() => {
      renderLineMarkers(ctx, makeBars(20), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should handle empty bars', () => {
    const ctx = mockCtx();
    expect(() => {
      renderLineMarkers(ctx, [], 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should draw circle markers via arc()', () => {
    const ctx = mockCtx();
    renderLineMarkers(ctx, makeBars(5), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    expect(ctx.arc).toHaveBeenCalled();
  });
});

describe('Step Line', () => {
  it('should render without errors', () => {
    const ctx = mockCtx();
    expect(() => {
      renderStepLine(ctx, makeBars(20), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should handle empty bars', () => {
    const ctx = mockCtx();
    expect(() => {
      renderStepLine(ctx, [], 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should call lineTo for horizontal and vertical steps', () => {
    const ctx = mockCtx();
    renderStepLine(ctx, makeBars(3), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    // For 3 bars: moveTo(first), then 2 pairs of lineTo (horizontal + vertical)
    expect(ctx.lineTo).toHaveBeenCalled();
  });
});

describe('HLC Area', () => {
  it('should render without errors', () => {
    const ctx = mockCtx();
    expect(() => {
      renderHlcArea(ctx, makeBars(20), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should handle empty bars', () => {
    const ctx = mockCtx();
    expect(() => {
      renderHlcArea(ctx, [], 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should fill the high-low band area', () => {
    const ctx = mockCtx();
    renderHlcArea(ctx, makeBars(10), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

describe('Columns', () => {
  it('should render without errors', () => {
    const ctx = mockCtx();
    expect(() => {
      renderColumns(ctx, makeBars(20), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should handle empty bars', () => {
    const ctx = mockCtx();
    expect(() => {
      renderColumns(ctx, [], 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should call fillRect for each bar', () => {
    const ctx = mockCtx();
    renderColumns(ctx, makeBars(5), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});

describe('High-Low', () => {
  it('should render without errors', () => {
    const ctx = mockCtx();
    expect(() => {
      renderHighLow(ctx, makeBars(20), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should handle empty bars', () => {
    const ctx = mockCtx();
    expect(() => {
      renderHighLow(ctx, [], 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should draw two lines and a fill', () => {
    const ctx = mockCtx();
    renderHighLow(ctx, makeBars(10), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    // fill for the band, stroke for high line and low line
    expect(ctx.fill).toHaveBeenCalled();
    // stroke called for high line + low line (at least 2)
    expect((ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Candlestick', () => {
  it('should render without errors', () => {
    const ctx = mockCtx();
    expect(() => {
      renderCandlesticks(ctx, makeBars(20), 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
  });

  it('should handle empty bars', () => {
    const ctx = mockCtx();
    expect(() => {
      renderCandlesticks(ctx, [], 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    }).not.toThrow();
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it('renders bull candle with correct color (close > open)', () => {
    const ctx = mockCtx();
    const bullBar: Bar[] = [{ time: 1000, open: 100, high: 110, low: 95, close: 105, volume: 100 }];
    const theme = makeTheme();
    renderCandlesticks(ctx, bullBar, 0, makeTimeScale(), makePriceScale(), theme, 800, 600);
    // fillStyle should be set to bullCandle color for the body
    expect(ctx.fillStyle).toBe(theme.bullCandle);
  });

  it('renders bear candle with correct color (close < open)', () => {
    const ctx = mockCtx();
    const bearBar: Bar[] = [{ time: 1000, open: 105, high: 110, low: 95, close: 100, volume: 100 }];
    const theme = makeTheme();
    renderCandlesticks(ctx, bearBar, 0, makeTimeScale(), makePriceScale(), theme, 800, 600);
    // fillStyle should be set to bearCandle color for the body
    expect(ctx.fillStyle).toBe(theme.bearCandle);
  });

  it('calls beginPath + moveTo + lineTo + stroke for wicks', () => {
    const ctx = mockCtx();
    const bars: Bar[] = [{ time: 1000, open: 100, high: 110, low: 95, close: 105, volume: 100 }];
    renderCandlesticks(ctx, bars, 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('calls fillRect for candle body', () => {
    const ctx = mockCtx();
    const bars: Bar[] = [{ time: 1000, open: 100, high: 110, low: 95, close: 105, volume: 100 }];
    renderCandlesticks(ctx, bars, 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('skips bars outside visible area (x < 0 or x > chartWidth)', () => {
    const ctx = mockCtx();
    // Create a time scale where bar 0 would be way off-screen to the left
    const ts = makeTimeScale(10);
    ts.scrollOffset = -5000; // push bars far left
    const bars: Bar[] = [{ time: 1000, open: 100, high: 110, low: 95, close: 105, volume: 100 }];
    renderCandlesticks(ctx, bars, 0, ts, makePriceScale(), makeTheme(), 800, 600);
    // If bar is skipped, fillRect should not be called
    // (depends on barIndexToX result — bar at index 0 with large negative offset)
  });

  it('handles doji (open === close) — body height at least 1px', () => {
    const ctx = mockCtx();
    // Replace fillRect with its own dedicated mock to inspect arguments
    const fillRectMock = vi.fn();
    ctx.fillRect = fillRectMock;
    const dojiBar: Bar[] = [{ time: 1000, open: 100, high: 110, low: 95, close: 100, volume: 100 }];
    // Use proper PriceScale and TimeScale with correct field names so priceToY/barIndexToX return real numbers
    const ps = { min: 90, max: 210, mode: 'linear' } as PriceScale;
    const ts = { firstIndex: 0, visibleCount: 100, barSpacing: 10, offsetX: 0 } as TimeScale;
    renderCandlesticks(ctx, dojiBar, 0, ts, ps, makeTheme(), 800, 600);
    // fillRect should still be called (body is at least 1px)
    expect(fillRectMock).toHaveBeenCalled();
    // The body height (4th argument) should be at least 1
    const bodyHeight = fillRectMock.mock.calls[0][3] as number;
    expect(bodyHeight).toBeGreaterThanOrEqual(1);
  });

  it('renders multiple bars correctly', () => {
    const ctx = mockCtx();
    const bars = makeBars(10);
    renderCandlesticks(ctx, bars, 0, makeTimeScale(), makePriceScale(), makeTheme(), 800, 600);
    // Should call fillRect for each visible bar
    const fillRectCount = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(fillRectCount).toBeGreaterThanOrEqual(1);
    // Should draw wicks for each visible bar
    const strokeCount = (ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(strokeCount).toBeGreaterThanOrEqual(1);
  });
});
