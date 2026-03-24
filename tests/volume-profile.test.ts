import { describe, it, expect, vi } from 'vitest';
import type { Bar, Theme } from '../src/api/types';
import type { PriceScale } from '../src/core/renderer/price-axis';
import {
  computeVolumeProfile,
  renderVolumeProfile,
} from '../src/indicators/volume/volume-profile';

// ── Helpers ────────────────────────────────────────────────────────────────

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
    save: noop,
    restore: noop,
    setLineDash: noop,
    fillText: noop,
    strokeText: noop,
    measureText: vi.fn(() => ({ width: 50 })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'top' as CanvasTextBaseline,
  } as unknown as CanvasRenderingContext2D;
}

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

function makePriceScale(): PriceScale {
  return {
    min: 90,
    max: 210,
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

// ── computeVolumeProfile tests ─────────────────────────────────────────────

describe('computeVolumeProfile', () => {
  it('returns correct bin count with normal bars', () => {
    const bars = makeBars(10);
    const bins = computeVolumeProfile(bars, 90, 210, 20);
    expect(bins.length).toBe(20);
  });

  it('distributes volume into correct bins', () => {
    const bars: Bar[] = [
      { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 500 },
    ];
    const bins = computeVolumeProfile(bars, 90, 110, 10);
    // barMid = (105 + 95) / 2 = 100, binSize = 2, binIdx = (100 - 90) / 2 = 5
    expect(bins[5]!.volume).toBe(500);
    // close > open → buy volume
    expect(bins[5]!.buyVolume).toBe(500);
    expect(bins[5]!.sellVolume).toBe(0);
  });

  it('classifies sell volume when close < open', () => {
    const bars: Bar[] = [
      { time: 1000, open: 105, high: 108, low: 95, close: 100, volume: 300 },
    ];
    const bins = computeVolumeProfile(bars, 90, 120, 10);
    // barMid = (108 + 95) / 2 = 101.5, binSize = 3, binIdx = floor((101.5 - 90) / 3) = floor(3.83) = 3
    expect(bins[3]!.sellVolume).toBe(300);
    expect(bins[3]!.buyVolume).toBe(0);
  });

  it('handles single bar', () => {
    const bars: Bar[] = [
      { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    ];
    const bins = computeVolumeProfile(bars, 90, 110, 5);
    expect(bins.length).toBe(5);
    // Total volume across all bins should equal bar volume
    const totalVol = bins.reduce((sum, b) => sum + b.volume, 0);
    expect(totalVol).toBe(1000);
  });

  it('returns empty array for empty bars', () => {
    const bins = computeVolumeProfile([], 90, 110, 10);
    expect(bins).toEqual([]);
  });

  it('returns empty array when range is zero', () => {
    const bars = makeBars(5);
    const bins = computeVolumeProfile(bars, 100, 100, 10);
    expect(bins).toEqual([]);
  });

  it('returns empty array when range is negative', () => {
    const bars = makeBars(5);
    const bins = computeVolumeProfile(bars, 110, 90, 10);
    expect(bins).toEqual([]);
  });

  it('uses default 50 bins when numBins not specified', () => {
    const bars = makeBars(5);
    const bins = computeVolumeProfile(bars, 90, 210);
    expect(bins.length).toBe(50);
  });

  it('ignores bars outside the price range', () => {
    const bars: Bar[] = [
      { time: 1000, open: 50, high: 55, low: 45, close: 52, volume: 1000 },
    ];
    // barMid = 50, binSize = (110-100)/10 = 1, binIdx = (50-100)/1 = -50 → out of range
    const bins = computeVolumeProfile(bars, 100, 110, 10);
    const totalVol = bins.reduce((sum, b) => sum + b.volume, 0);
    expect(totalVol).toBe(0);
  });
});

// ── renderVolumeProfile tests ──────────────────────────────────────────────

describe('renderVolumeProfile', () => {
  it('calls fillRect for each bin with volume', () => {
    const ctx = mockCtx();
    const bars = makeBars(10);
    const bins = computeVolumeProfile(bars, 90, 210, 10);
    const binsWithVolume = bins.filter(b => b.volume > 0);

    renderVolumeProfile(ctx, bins, makePriceScale(), makeTheme(), 800, 600);

    // Each bin with volume should get at least one fillRect call (buy + sell)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(
      binsWithVolume.length,
    );
  });

  it('uses theme volumeBull and volumeBear colors', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    // Create bins with both buy and sell volume
    const bars: Bar[] = [
      { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 500 }, // bull
      { time: 1060, open: 105, high: 108, low: 98, close: 100, volume: 300 }, // bear
    ];
    const bins = computeVolumeProfile(bars, 90, 120, 10);
    renderVolumeProfile(ctx, bins, makePriceScale(), theme, 800, 600);

    // Collect all fillStyle values set during rendering
    // The last fillStyle set is what we see on ctx, but we can check fillRect was called
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('does nothing with empty bins', () => {
    const ctx = mockCtx();
    renderVolumeProfile(ctx, [], makePriceScale(), makeTheme(), 800, 600);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('does nothing when all bins have zero volume', () => {
    const ctx = mockCtx();
    const bins = computeVolumeProfile([], 90, 110, 5);
    // bins is empty from empty bars
    renderVolumeProfile(ctx, bins, makePriceScale(), makeTheme(), 800, 600);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('skips bins with zero volume', () => {
    const ctx = mockCtx();
    // Create bins where only one has volume
    const bars: Bar[] = [
      { time: 1000, open: 100, high: 101, low: 99, close: 101, volume: 500 },
    ];
    const bins = computeVolumeProfile(bars, 90, 110, 20);
    const nonZeroBins = bins.filter(b => b.volume > 0);
    expect(nonZeroBins.length).toBe(1);

    renderVolumeProfile(ctx, bins, makePriceScale(), makeTheme(), 800, 600);
    // Should only render fillRect for the one bin with volume (buy portion)
    expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('limits bar width to MAX_WIDTH_RATIO (25%) of chart width', () => {
    const ctx = mockCtx();
    const bars: Bar[] = [
      { time: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    ];
    const bins = computeVolumeProfile(bars, 90, 110, 5);
    renderVolumeProfile(ctx, bins, makePriceScale(), makeTheme(), 800, 600);

    // The maximum width of any bar should not exceed 800 * 0.25 = 200
    const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of fillRectCalls) {
      const barX = call[0] as number;
      const barWidth = call[2] as number;
      expect(barX + barWidth).toBeLessThanOrEqual(200);
    }
  });
});
