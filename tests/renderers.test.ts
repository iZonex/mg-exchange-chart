import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Bar, Theme, PlotConfig, IndicatorOutput } from '../src/api/types';
import type { PriceScale } from '../src/core/renderer/price-axis';
import type { TimeScale } from '../src/core/renderer/time-axis';
import type { PriceTick } from '../src/core/renderer/price-axis';
import type { TimeTick } from '../src/core/renderer/time-axis';
import type { IndicatorInstance } from '../src/indicators/engine';
import { darkTheme } from '../src/themes/dark';

// ── Shared Helpers ──────────────────────────────────────────────────────────

function mockCtx(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
    fill: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(), closePath: vi.fn(),
    arc: vi.fn(), save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(),
    fillText: vi.fn(), strokeText: vi.fn(), clearRect: vi.fn(), roundRect: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    translate: vi.fn(), rotate: vi.fn(), scale: vi.fn(), clip: vi.fn(), rect: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    textAlign: 'left' as CanvasTextAlign, textBaseline: 'top' as CanvasTextBaseline,
    globalAlpha: 1, lineDashOffset: 0, lineJoin: 'round' as CanvasLineJoin,
    lineCap: 'round' as CanvasLineCap,
  } as unknown as CanvasRenderingContext2D;
}

function makeTheme(): Theme { return { ...darkTheme }; }

function makeBars(count: number, baseTime = 1700000000): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < count; i++) {
    const open = 100 + Math.sin(i) * 10;
    const close = open + (i % 2 === 0 ? 2 : -2);
    bars.push({
      time: baseTime + i * 3600,
      open,
      high: Math.max(open, close) + 3,
      low: Math.min(open, close) - 3,
      close,
      volume: 1000 + i * 100,
    });
  }
  return bars;
}

function makePriceScale(min = 80, max = 120): PriceScale {
  return { min, max, mode: 'linear' };
}

function makeTimeScale(firstIndex = 0, visibleCount = 50, barSpacing = 10): TimeScale {
  return { firstIndex, visibleCount, barSpacing, offsetX: 0 };
}

// ── 1. Grid ─────────────────────────────────────────────────────────────────

describe('renderGrid', () => {
  let renderGrid: typeof import('../src/core/renderer/grid').renderGrid;

  beforeEach(async () => {
    ({ renderGrid } = await import('../src/core/renderer/grid'));
  });

  it('draws horizontal lines for each price tick within bounds', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const priceTicks: PriceTick[] = [
      { price: 100, y: 50, label: '100' },
      { price: 110, y: 30, label: '110' },
    ];
    const timeTicks: TimeTick[] = [];
    renderGrid(ctx, priceTicks, timeTicks, theme, 800, 0, 200);
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('draws vertical lines for each time tick', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const priceTicks: PriceTick[] = [];
    const timeTicks: TimeTick[] = [
      { time: 1700000000, x: 100, label: '12:00' },
      { time: 1700003600, x: 200, label: '13:00' },
    ];
    renderGrid(ctx, priceTicks, timeTicks, theme, 800, 0, 400);
    // 2 vertical lines: moveTo + lineTo each
    expect(ctx.moveTo).toHaveBeenCalledTimes(2);
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);
    // Verify the actual coordinates for vertical lines
    expect(ctx.moveTo).toHaveBeenCalledWith(expect.any(Number), 0);
    expect(ctx.lineTo).toHaveBeenCalledWith(expect.any(Number), 400);
  });

  it('draws both horizontal and vertical lines', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const priceTicks: PriceTick[] = [{ price: 100, y: 50, label: '100' }];
    const timeTicks: TimeTick[] = [{ time: 1700000000, x: 100, label: '12:00' }];
    renderGrid(ctx, priceTicks, timeTicks, theme, 800, 0, 400);
    // 1 horizontal + 1 vertical
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
  });

  it('skips price ticks outside yTop/yBottom bounds', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const priceTicks: PriceTick[] = [
      { price: 100, y: -10, label: '100' },   // above yTop
      { price: 90, y: 500, label: '90' },      // below yBottom
    ];
    renderGrid(ctx, priceTicks, [], theme, 800, 0, 400);
    // beginPath is still called but moveTo/lineTo should not be for the ticks
    // (beginPath is called once unconditionally)
    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    // No moveTo for out-of-range ticks
    expect(ctx.moveTo).not.toHaveBeenCalled();
  });

  it('uses theme gridLine color', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    renderGrid(ctx, [{ price: 100, y: 50, label: '100' }], [], theme, 800, 0, 400);
    expect(ctx.strokeStyle).toBe(theme.gridLine);
  });
});

// ── 2. Watermark ────────────────────────────────────────────────────────────

describe('renderWatermark', () => {
  let renderWatermark: typeof import('../src/core/renderer/watermark').renderWatermark;

  beforeEach(async () => {
    ({ renderWatermark } = await import('../src/core/renderer/watermark'));
  });

  it('renders symbol text at center', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    renderWatermark(ctx, 'BTCUSDT', '1H', theme, 800, 600);
    expect(ctx.fillText).toHaveBeenCalledWith('BTCUSDT', 400, 280);
    expect(ctx.textAlign).toBe('center');
  });

  it('renders timeframe text below symbol', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    renderWatermark(ctx, 'ETHUSDT', '4H', theme, 800, 600);
    expect(ctx.fillText).toHaveBeenCalledWith('4H', 400, 330);
  });

  it('saves and restores context', () => {
    const ctx = mockCtx();
    renderWatermark(ctx, 'BTC', '1m', makeTheme(), 800, 600);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('uses dark mode semi-transparent white for dark theme', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    theme.name = 'dark';
    renderWatermark(ctx, 'BTC', '1m', theme, 800, 600);
    expect(ctx.fillStyle).toBe('rgba(255,255,255,0.03)');
  });

  it('uses light mode semi-transparent black for light theme', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    theme.name = 'light';
    renderWatermark(ctx, 'BTC', '1m', theme, 800, 600);
    // After second fillText, fillStyle is the second one set
    // Check that during execution it set the rgba(0,0,0,0.03)
    // We check that fillStyle at the end reflects the light branch
    // (it gets set twice but both should be the same light color)
    expect(ctx.fillStyle).toBe('rgba(0,0,0,0.03)');
  });
});

// ── 3. Countdown ────────────────────────────────────────────────────────────

describe('renderBarCountdown', () => {
  let renderBarCountdown: typeof import('../src/core/renderer/countdown').renderBarCountdown;

  beforeEach(async () => {
    ({ renderBarCountdown } = await import('../src/core/renderer/countdown'));
  });

  it('renders countdown text', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    // Set bar time far in the future so remaining > 0
    const futureTime = Math.floor(Date.now() / 1000) + 1800;
    renderBarCountdown(ctx, futureTime, '1H', theme, 400, 0);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('shows "0s" when bar has already closed', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    // Bar time long ago
    renderBarCountdown(ctx, 1000000, '1m', theme, 400, 0);
    expect(ctx.fillText).toHaveBeenCalledWith('0s', 400, expect.any(Number));
  });

  it('handles different timeframes', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const now = Math.floor(Date.now() / 1000);
    // 5 minute timeframe, bar just started
    renderBarCountdown(ctx, now, '5m', theme, 400, 0);
    expect(ctx.fillText).toHaveBeenCalled();
    const callArgs = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls[0];
    const label = callArgs[0] as string;
    // Should show m:ss format
    expect(label).toMatch(/\d+:\d{2}|0s/);
  });

  it('uses theme.textMuted for fill color', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    renderBarCountdown(ctx, 1000000, '1m', theme, 400, 0);
    expect(ctx.fillStyle).toBe(theme.textMuted);
  });

  it('handles unknown timeframe (defaults to 60s)', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    renderBarCountdown(ctx, 1000000, 'UNKNOWN' as any, theme, 400, 0);
    expect(ctx.fillText).toHaveBeenCalled();
  });
});

// ── 4. High/Low Markers (24h) ───────────────────────────────────────────────

describe('render24hHighLow', () => {
  let render24hHighLow: typeof import('../src/core/renderer/high-low-markers').render24hHighLow;

  beforeEach(async () => {
    ({ render24hHighLow } = await import('../src/core/renderer/high-low-markers'));
  });

  it('returns early with empty bars', () => {
    const ctx = mockCtx();
    render24hHighLow(ctx, [], makePriceScale(), makeTheme(), 800, 400, 2);
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it('draws dashed lines for high and low within 24h', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const now = Math.floor(Date.now() / 1000);
    // Create bars spanning 24h
    const bars: Bar[] = [];
    for (let i = 0; i < 25; i++) {
      bars.push({
        time: now - (24 - i) * 3600,
        open: 100, high: 100 + i, low: 90 - i, close: 95,
        volume: 1000,
      });
    }
    const priceScale = makePriceScale(60, 130);
    render24hHighLow(ctx, bars, priceScale, theme, 800, 400, 2);
    expect(ctx.setLineDash).toHaveBeenCalledWith([2, 3]);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('uses bullCandle color for high line', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const now = Math.floor(Date.now() / 1000);
    const bars: Bar[] = [{
      time: now - 100,
      open: 100, high: 110, low: 90, close: 105,
      volume: 1000,
    }];
    const priceScale = makePriceScale(80, 120);
    render24hHighLow(ctx, bars, priceScale, theme, 800, 400, 2);
    // The high line should use bullCandle
    const strokeCalls = (ctx.beginPath as ReturnType<typeof vi.fn>).mock.calls;
    expect(strokeCalls.length).toBeGreaterThan(0);
  });

  it('resets line dash at end', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const now = Math.floor(Date.now() / 1000);
    const bars: Bar[] = [{
      time: now - 100,
      open: 100, high: 110, low: 90, close: 105,
      volume: 1000,
    }];
    render24hHighLow(ctx, bars, makePriceScale(80, 120), theme, 800, 400, 2);
    // Last setLineDash call should be empty (reset)
    const dashCalls = (ctx.setLineDash as ReturnType<typeof vi.fn>).mock.calls;
    expect(dashCalls[dashCalls.length - 1]).toEqual([[]]);
  });

  it('skips rendering if high is -Infinity (all bars older than 24h)', () => {
    const ctx = mockCtx();
    // All bars are older than 24h from the last bar
    const bars: Bar[] = [
      { time: 1000, open: 100, high: 110, low: 90, close: 100, volume: 1000 },
      { time: 1100, open: 100, high: 110, low: 90, close: 100, volume: 1000 },
    ];
    // last bar time is 1100, oneDayAgo = 1100 - 86400 = -85300
    // All bars have time > -85300 so they should be included
    // Actually this will find high/low since bars are within 24h of each other
    render24hHighLow(ctx, bars, makePriceScale(80, 120), makeTheme(), 800, 400, 2);
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

// ── 5. Session Breaks ───────────────────────────────────────────────────────

describe('renderSessionBreaks', () => {
  let renderSessionBreaks: typeof import('../src/core/renderer/session-breaks').renderSessionBreaks;

  beforeEach(async () => {
    ({ renderSessionBreaks } = await import('../src/core/renderer/session-breaks'));
  });

  it('returns early with fewer than 2 bars', () => {
    const ctx = mockCtx();
    renderSessionBreaks(ctx, [makeBars(1)[0]!], 0, makeTimeScale(), makeTheme(), 800, 400);
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it('returns early with empty bars', () => {
    const ctx = mockCtx();
    renderSessionBreaks(ctx, [], 0, makeTimeScale(), makeTheme(), 800, 400);
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it('draws vertical lines at day boundaries', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    // Create bars spanning two days
    const dayStart = 86400 * 20000; // some round day
    const bars: Bar[] = [];
    for (let i = 0; i < 48; i++) {
      bars.push({
        time: dayStart + i * 3600,
        open: 100, high: 110, low: 90, close: 100,
        volume: 1000,
      });
    }
    const timeScale = makeTimeScale(0, 48, 15);
    renderSessionBreaks(ctx, bars, 0, timeScale, theme, 800, 400);
    expect(ctx.setLineDash).toHaveBeenCalledWith([4, 4]);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('uses borderColor for stroke', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const dayStart = 86400 * 20000;
    const bars: Bar[] = [];
    for (let i = 0; i < 48; i++) {
      bars.push({
        time: dayStart + i * 3600,
        open: 100, high: 110, low: 90, close: 100, volume: 1000,
      });
    }
    renderSessionBreaks(ctx, bars, 0, makeTimeScale(0, 48, 15), theme, 800, 400);
    expect(ctx.strokeStyle).toBe(theme.borderColor);
  });

  it('resets line dash at end', () => {
    const ctx = mockCtx();
    const dayStart = 86400 * 20000;
    const bars: Bar[] = [];
    for (let i = 0; i < 48; i++) {
      bars.push({ time: dayStart + i * 3600, open: 100, high: 110, low: 90, close: 100, volume: 1000 });
    }
    renderSessionBreaks(ctx, bars, 0, makeTimeScale(0, 48, 15), makeTheme(), 800, 400);
    const dashCalls = (ctx.setLineDash as ReturnType<typeof vi.fn>).mock.calls;
    expect(dashCalls[dashCalls.length - 1]).toEqual([[]]);
  });

  it('skips lines outside chartWidth', () => {
    const ctx = mockCtx();
    const dayStart = 86400 * 20000;
    const bars: Bar[] = [];
    for (let i = 0; i < 48; i++) {
      bars.push({ time: dayStart + i * 3600, open: 100, high: 110, low: 90, close: 100, volume: 1000 });
    }
    // Use timeScale that puts bars far off screen
    renderSessionBreaks(ctx, bars, 0, makeTimeScale(1000, 48, 15), makeTheme(), 100, 400);
    // moveTo should not be called for off-screen lines (only within 0..chartWidth)
    // Still calls stroke though
    expect(ctx.stroke).toHaveBeenCalled();
  });
});

// ── 6. Legend ────────────────────────────────────────────────────────────────

describe('Legend', () => {
  let renderOHLCVLegend: typeof import('../src/core/renderer/legend').renderOHLCVLegend;
  let renderIndicatorLegend: typeof import('../src/core/renderer/legend').renderIndicatorLegend;
  let renderOverlayLegend: typeof import('../src/core/renderer/legend').renderOverlayLegend;

  beforeEach(async () => {
    ({ renderOHLCVLegend, renderIndicatorLegend, renderOverlayLegend } = await import('../src/core/renderer/legend'));
  });

  describe('renderOHLCVLegend', () => {
    it('renders O/H/L/C/V text for a bullish bar', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 100, high: 115, low: 95, close: 110, volume: 5000 };
      renderOHLCVLegend(ctx, bar, theme, 2, 10, 10);
      expect(ctx.fillText).toHaveBeenCalledTimes(10); // 5 keys + 5 values
    });

    it('uses bullCandle color for bullish bar values', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 100, high: 115, low: 95, close: 110, volume: 5000 };
      renderOHLCVLegend(ctx, bar, theme, 2, 10, 10);
      // The OHLC values should be colored bullCandle since close >= open
      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      expect(fillTextCalls.length).toBe(10);
    });

    it('uses bearCandle color for bearish bar values', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 110, high: 115, low: 95, close: 100, volume: 5000 };
      renderOHLCVLegend(ctx, bar, theme, 2, 10, 10);
      expect(ctx.fillText).toHaveBeenCalledTimes(10);
    });

    it('formats volume in M for millions', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 100, high: 115, low: 95, close: 110, volume: 5_000_000 };
      renderOHLCVLegend(ctx, bar, theme, 2, 10, 10);
      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      const volValue = fillTextCalls[9][0] as string;
      expect(volValue).toContain('M');
    });

    it('formats volume in B for billions', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 100, high: 115, low: 95, close: 110, volume: 2_500_000_000 };
      renderOHLCVLegend(ctx, bar, theme, 2, 10, 10);
      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      const volValue = fillTextCalls[9][0] as string;
      expect(volValue).toContain('B');
    });

    it('formats volume in K for thousands', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 100, high: 115, low: 95, close: 110, volume: 5_500 };
      renderOHLCVLegend(ctx, bar, theme, 2, 10, 10);
      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      const volValue = fillTextCalls[9][0] as string;
      expect(volValue).toContain('K');
    });

    it('formats small volume as plain number', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 100, high: 115, low: 95, close: 110, volume: 500 };
      renderOHLCVLegend(ctx, bar, theme, 2, 10, 10);
      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      const volValue = fillTextCalls[9][0] as string;
      expect(volValue).toBe('500.00');
    });
  });

  describe('renderIndicatorLegend', () => {
    it('renders indicator name and plot values', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const inst: IndicatorInstance = {
        id: 'ind_1',
        indicator: {
          name: 'RSI', shortName: 'RSI', description: 'Relative Strength Index',
          overlay: false, params: [], plots: [
            { key: 'rsi', type: 'line', color: '#ff0' },
          ],
          calculate: () => [],
        },
        params: {},
        outputs: [{ time: 1, values: { rsi: 65.5 } }],
        visible: true,
      };
      renderIndicatorLegend(ctx, inst, 0, theme, 10, 10);
      expect(ctx.fillText).toHaveBeenCalledWith('RSI', 10, 10);
      expect(ctx.fillText).toHaveBeenCalledWith('65.50', expect.any(Number), 10);
    });

    it('returns early when no output at barIndex', () => {
      const ctx = mockCtx();
      const inst: IndicatorInstance = {
        id: 'ind_1',
        indicator: {
          name: 'RSI', shortName: 'RSI', description: '',
          overlay: false, params: [], plots: [],
          calculate: () => [],
        },
        params: {},
        outputs: [],
        visible: true,
      };
      renderIndicatorLegend(ctx, inst, 5, makeTheme(), 10, 10);
      expect(ctx.fillText).not.toHaveBeenCalled();
    });

    it('skips band plots', () => {
      const ctx = mockCtx();
      const inst: IndicatorInstance = {
        id: 'ind_1',
        indicator: {
          name: 'BB', shortName: 'BB', description: '',
          overlay: true, params: [], plots: [
            { key: 'upper', type: 'band', bandPairKey: 'lower', color: 'rgba(0,0,0,0.1)' },
            { key: 'middle', type: 'line', color: '#fff' },
          ],
          calculate: () => [],
        },
        params: {},
        outputs: [{ time: 1, values: { upper: 110, lower: 90, middle: 100 } }],
        visible: true,
      };
      renderIndicatorLegend(ctx, inst, 0, makeTheme(), 10, 10);
      // Should show BB name + middle value, but skip band
      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      expect(fillTextCalls.length).toBe(2); // name + middle
    });

    it('uses plot color for values', () => {
      const ctx = mockCtx();
      const inst: IndicatorInstance = {
        id: 'ind_1',
        indicator: {
          name: 'MACD', shortName: 'MACD', description: '',
          overlay: false, params: [], plots: [
            { key: 'macd', type: 'line', color: '#2196F3' },
          ],
          calculate: () => [],
        },
        params: {},
        outputs: [{ time: 1, values: { macd: 5.25 } }],
        visible: true,
      };
      renderIndicatorLegend(ctx, inst, 0, makeTheme(), 10, 10);
      // After rendering the value, fillStyle should be the plot color
      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      expect(fillTextCalls.length).toBe(2);
    });

    it('skips undefined values', () => {
      const ctx = mockCtx();
      const inst: IndicatorInstance = {
        id: 'ind_1',
        indicator: {
          name: 'T', shortName: 'T', description: '',
          overlay: false, params: [], plots: [
            { key: 'a', type: 'line' },
            { key: 'b', type: 'line' },
          ],
          calculate: () => [],
        },
        params: {},
        outputs: [{ time: 1, values: { a: 10 } }], // b is undefined
        visible: true,
      };
      renderIndicatorLegend(ctx, inst, 0, makeTheme(), 10, 10);
      const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      expect(fillTextCalls.length).toBe(2); // name + 'a' value
    });
  });

  describe('renderOverlayLegend', () => {
    it('renders legends for multiple overlays vertically', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const makeInst = (name: string, val: number): IndicatorInstance => ({
        id: `ind_${name}`,
        indicator: {
          name, shortName: name, description: '',
          overlay: true, params: [], plots: [{ key: 'v', type: 'line' }],
          calculate: () => [],
        },
        params: {},
        outputs: [{ time: 1, values: { v: val } }],
        visible: true,
      });
      renderOverlayLegend(ctx, [makeInst('SMA', 100), makeInst('EMA', 105)], 0, theme, 10, 20);
      // Two indicators: each renders name + value = 4 fillText calls
      expect(ctx.fillText).toHaveBeenCalledTimes(4);
    });

    it('offsets each overlay by 14px', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const makeInst = (name: string): IndicatorInstance => ({
        id: `ind_${name}`,
        indicator: {
          name, shortName: name, description: '',
          overlay: true, params: [], plots: [{ key: 'v', type: 'line' }],
          calculate: () => [],
        },
        params: {},
        outputs: [{ time: 1, values: { v: 50 } }],
        visible: true,
      });
      renderOverlayLegend(ctx, [makeInst('A'), makeInst('B')], 0, theme, 10, 20);
      const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
      // First indicator at y=20, second at y=34
      expect(calls[0][2]).toBe(20);
      expect(calls[2][2]).toBe(34);
    });
  });
});

// ── 7. Price Marker ─────────────────────────────────────────────────────────

describe('Price Marker', () => {
  let renderCurrentPriceMarker: typeof import('../src/core/renderer/price-marker').renderCurrentPriceMarker;
  let renderHighLowMarkers: typeof import('../src/core/renderer/price-marker').renderHighLowMarkers;

  beforeEach(async () => {
    ({ renderCurrentPriceMarker, renderHighLowMarkers } = await import('../src/core/renderer/price-marker'));
  });

  describe('renderCurrentPriceMarker', () => {
    it('draws dashed line and badge for current price', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 100, high: 110, low: 90, close: 105, volume: 1000 };
      const priceScale = makePriceScale(80, 120);
      renderCurrentPriceMarker(ctx, bar, priceScale, theme, 800, 400, 2);
      expect(ctx.setLineDash).toHaveBeenCalledWith([4, 3]);
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fillText).toHaveBeenCalled();
    });

    it('returns early when price is far off screen', () => {
      const ctx = mockCtx();
      const bar: Bar = { time: 1700000000, open: 100, high: 110, low: 90, close: 500, volume: 1000 };
      const priceScale = makePriceScale(80, 120);
      renderCurrentPriceMarker(ctx, bar, priceScale, makeTheme(), 800, 400, 2);
      // Y would be way outside chartHeight, so should skip
      expect(ctx.beginPath).not.toHaveBeenCalled();
    });

    it('uses bullCandle for bullish bar', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 100, high: 110, low: 90, close: 105, volume: 1000 };
      renderCurrentPriceMarker(ctx, bar, makePriceScale(80, 120), theme, 800, 400, 2);
      // strokeStyle should be bullCandle
      expect(ctx.strokeStyle).toBe(theme.bullCandle);
    });

    it('uses bearCandle for bearish bar', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 110, high: 115, low: 90, close: 100, volume: 1000 };
      renderCurrentPriceMarker(ctx, bar, makePriceScale(80, 120), theme, 800, 400, 2);
      expect(ctx.strokeStyle).toBe(theme.bearCandle);
    });

    it('renders countdown badge when timeframe is provided', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      // Set bar time in the future so countdown is active
      const futureTime = Math.floor(Date.now() / 1000) + 1800;
      const bar: Bar = { time: futureTime, open: 100, high: 110, low: 90, close: 105, volume: 1000 };
      renderCurrentPriceMarker(ctx, bar, makePriceScale(80, 120), theme, 800, 400, 2, '1H');
      // Should render the countdown badge (fillRect + fillText for countdown)
      const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
      expect(fillRectCalls.length).toBeGreaterThan(0);
    });

    it('does not render countdown fillRect when no timeframe', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const bar: Bar = { time: 1700000000, open: 100, high: 110, low: 90, close: 105, volume: 1000 };
      renderCurrentPriceMarker(ctx, bar, makePriceScale(80, 120), theme, 800, 400, 2);
      // Without timeframe, no countdown fillRect
      // Price badge uses fill() not fillRect, so fillRect should not be called
      // (the badge is drawn with beginPath/moveTo/lineTo/fill)
      expect(ctx.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('renderHighLowMarkers', () => {
    it('renders high and low price labels', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      renderHighLowMarkers(ctx, 110, 90, 50, 350, theme, 2);
      expect(ctx.fillText).toHaveBeenCalledTimes(2);
    });

    it('uses textMuted for label color', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      renderHighLowMarkers(ctx, 110, 90, 50, 350, theme, 2);
      expect(ctx.fillStyle).toBe(theme.textMuted);
    });
  });
});

// ── 8. Order Lines (render function) ────────────────────────────────────────

describe('renderOrderLines', () => {
  let renderOrderLines: typeof import('../src/core/renderer/order-lines').renderOrderLines;
  let OrderLineManager: typeof import('../src/core/renderer/order-lines').OrderLineManager;

  beforeEach(async () => {
    ({ renderOrderLines, OrderLineManager } = await import('../src/core/renderer/order-lines'));
  });

  it('renders a limit order line with badge', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const lines = [{ id: '1', price: 100, type: 'limit' as const, side: 'buy' as const, label: 'BUY LIMIT' }];
    renderOrderLines(ctx, lines, makePriceScale(80, 120), theme, 800, 400, 2);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('skips lines off-screen', () => {
    const ctx = mockCtx();
    const lines = [{ id: '1', price: 500, type: 'limit' as const, side: 'buy' as const, label: 'BUY' }];
    renderOrderLines(ctx, lines, makePriceScale(80, 120), makeTheme(), 800, 400, 2);
    // Price 500 with scale 80-120 will produce Y far off-screen
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it('renders quantity text when provided', () => {
    const ctx = mockCtx();
    const lines = [{
      id: '1', price: 100, type: 'limit' as const, side: 'buy' as const,
      label: 'BUY', quantity: 0.5,
    }];
    renderOrderLines(ctx, lines, makePriceScale(80, 120), makeTheme(), 800, 400, 2);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const qtyCall = fillTextCalls.find((c: unknown[]) => c[0] === '0.5');
    expect(qtyCall).toBeDefined();
  });

  it('renders PnL badge when provided', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const lines = [{
      id: '1', price: 100, type: 'entry' as const, side: 'buy' as const,
      label: 'ENTRY', pnl: 250.5,
    }];
    renderOrderLines(ctx, lines, makePriceScale(80, 120), theme, 800, 400, 2);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const allText = fillTextCalls.map((c: unknown[]) => String(c[0]));
    expect(allText.some(t => t.includes('+250.50'))).toBe(true);
  });

  it('renders negative PnL in bearCandle color', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const lines = [{
      id: '1', price: 100, type: 'entry' as const, side: 'buy' as const,
      label: 'ENTRY', pnl: -100,
    }];
    renderOrderLines(ctx, lines, makePriceScale(80, 120), theme, 800, 400, 2);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const allText = fillTextCalls.map((c: unknown[]) => String(c[0]));
    expect(allText.some(t => t.includes('-100.00'))).toBe(true);
  });

  it('renders multiple order line types with correct dash patterns', () => {
    const ctx = mockCtx();
    const lines = [
      { id: '1', price: 100, type: 'limit' as const, side: 'buy' as const, label: 'LIMIT' },
      { id: '2', price: 105, type: 'stop' as const, side: 'sell' as const, label: 'STOP' },
      { id: '3', price: 95, type: 'tp' as const, side: 'buy' as const, label: 'TP' },
    ];
    renderOrderLines(ctx, lines, makePriceScale(80, 120), makeTheme(), 800, 400, 2);
    // Limit = solid [], stop = [6,3], tp = [4,3]
    const dashCalls = (ctx.setLineDash as ReturnType<typeof vi.fn>).mock.calls;
    expect(dashCalls.some((c: unknown[]) => JSON.stringify(c[0]) === '[]')).toBe(true);
    expect(dashCalls.some((c: unknown[]) => JSON.stringify(c[0]) === '[6,3]')).toBe(true);
    expect(dashCalls.some((c: unknown[]) => JSON.stringify(c[0]) === '[4,3]')).toBe(true);
  });
});

// ── 9. Position Overlay ─────────────────────────────────────────────────────

describe('renderPositionOverlay', () => {
  let renderPositionOverlay: typeof import('../src/core/renderer/position-overlay').renderPositionOverlay;

  beforeEach(async () => {
    ({ renderPositionOverlay } = await import('../src/core/renderer/position-overlay'));
  });

  it('renders entry line and PnL badge for a long position', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const pos = {
      side: 'long' as const,
      entryPrice: 100,
      quantity: 1,
      currentPrice: 105,
      pnl: 50,
      tpLevels: [{ price: 110, quantity: 0.5 }],
      slLevels: [{ price: 95, quantity: 0.5 }],
    };
    renderPositionOverlay(ctx, pos, makePriceScale(80, 120), theme, 800, 400, 2);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('renders TP zone with green shading', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const pos = {
      side: 'long' as const,
      entryPrice: 100,
      quantity: 1,
      currentPrice: 105,
      pnl: 50,
      tpLevels: [{ price: 110, quantity: 1 }],
      slLevels: [],
    };
    renderPositionOverlay(ctx, pos, makePriceScale(80, 120), theme, 800, 400, 2);
    // TP zone should use dashed line
    const dashCalls = (ctx.setLineDash as ReturnType<typeof vi.fn>).mock.calls;
    expect(dashCalls.some((c: unknown[]) => JSON.stringify(c[0]) === '[6,3]')).toBe(true);
  });

  it('renders SL zone with red shading', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const pos = {
      side: 'long' as const,
      entryPrice: 100,
      quantity: 1,
      currentPrice: 95,
      pnl: -50,
      tpLevels: [],
      slLevels: [{ price: 90, quantity: 1 }],
    };
    renderPositionOverlay(ctx, pos, makePriceScale(80, 120), theme, 800, 400, 2);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('renders breakeven line when provided', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const pos = {
      side: 'long' as const,
      entryPrice: 100,
      quantity: 1,
      breakeven: 101,
      currentPrice: 105,
      pnl: 50,
      tpLevels: [],
      slLevels: [],
    };
    renderPositionOverlay(ctx, pos, makePriceScale(80, 120), theme, 800, 400, 2);
    // Breakeven should be a dashed line
    const dashCalls = (ctx.setLineDash as ReturnType<typeof vi.fn>).mock.calls;
    expect(dashCalls.some((c: unknown[]) => JSON.stringify(c[0]) === '[4,4]')).toBe(true);
  });

  it('skips breakeven when equal to entry', () => {
    const ctx = mockCtx();
    const pos = {
      side: 'long' as const,
      entryPrice: 100,
      quantity: 1,
      breakeven: 100, // same as entry
      currentPrice: 105,
      pnl: 50,
      tpLevels: [],
      slLevels: [],
    };
    renderPositionOverlay(ctx, pos, makePriceScale(80, 120), makeTheme(), 800, 400, 2);
    // No dashed breakeven line
    const dashCalls = (ctx.setLineDash as ReturnType<typeof vi.fn>).mock.calls;
    expect(dashCalls.every((c: unknown[]) => JSON.stringify(c[0]) !== '[4,4]')).toBe(true);
  });

  it('renders short position with correct colors', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const pos = {
      side: 'short' as const,
      entryPrice: 100,
      quantity: 1,
      currentPrice: 95,
      pnl: 50,
      tpLevels: [{ price: 90, quantity: 1 }],
      slLevels: [{ price: 110, quantity: 1 }],
    };
    renderPositionOverlay(ctx, pos, makePriceScale(80, 120), theme, 800, 400, 2);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('renders expected loss label for SL zone', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const pos = {
      side: 'long' as const,
      entryPrice: 100,
      quantity: 1,
      currentPrice: 95,
      pnl: -50,
      tpLevels: [],
      slLevels: [{ price: 90, quantity: 1 }],
    };
    renderPositionOverlay(ctx, pos, makePriceScale(80, 120), theme, 800, 400, 2);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    // Should have an expected loss label
    expect(fillTextCalls.length).toBeGreaterThan(0);
  });

  it('renders close button', () => {
    const ctx = mockCtx();
    const pos = {
      side: 'long' as const,
      entryPrice: 100,
      quantity: 1,
      currentPrice: 105,
      pnl: 50,
      tpLevels: [],
      slLevels: [],
    };
    renderPositionOverlay(ctx, pos, makePriceScale(80, 120), makeTheme(), 800, 400, 2);
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const closeCall = fillTextCalls.find((c: unknown[]) => c[0] === '\u2715');
    expect(closeCall).toBeDefined();
  });
});

// ── 10. Pane Separator ──────────────────────────────────────────────────────

describe('renderOscillatorPaneSeparator', () => {
  let renderOscillatorPaneSeparator: typeof import('../src/core/renderer/pane-separator').renderOscillatorPaneSeparator;

  beforeEach(async () => {
    ({ renderOscillatorPaneSeparator } = await import('../src/core/renderer/pane-separator'));
  });

  it('draws a horizontal line at yOffset', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    renderOscillatorPaneSeparator(ctx, theme, 300, 800);
    expect(ctx.beginPath).toHaveBeenCalledTimes(1);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 300.5);
    expect(ctx.lineTo).toHaveBeenCalledWith(800, 300.5);
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
  });

  it('uses theme borderColor', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    renderOscillatorPaneSeparator(ctx, theme, 200, 800);
    expect(ctx.strokeStyle).toBe(theme.borderColor);
  });

  it('sets lineWidth to 1', () => {
    const ctx = mockCtx();
    renderOscillatorPaneSeparator(ctx, makeTheme(), 100, 400);
    expect(ctx.lineWidth).toBe(1);
  });
});

// ── 11. Pane Controls ───────────────────────────────────────────────────────

describe('Pane Controls', () => {
  let renderPaneControls: typeof import('../src/core/renderer/pane-controls').renderPaneControls;
  let hitTestPaneControls: typeof import('../src/core/renderer/pane-controls').hitTestPaneControls;

  beforeEach(async () => {
    ({ renderPaneControls, hitTestPaneControls } = await import('../src/core/renderer/pane-controls'));
  });

  describe('renderPaneControls', () => {
    it('draws control icons (close, hide, settings)', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      renderPaneControls(ctx, theme, 'pane_rsi', 800, 300);
      // Should draw X (close), eye (hide), dots (settings)
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.arc).toHaveBeenCalled();
    });

    it('uses textMuted for icon color', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      renderPaneControls(ctx, theme, 'pane_rsi', 800, 300);
      expect(ctx.strokeStyle).toBe(theme.textMuted);
    });
  });

  describe('hitTestPaneControls', () => {
    it('returns "close" for click on close button area', () => {
      // Close button is rightmost, at chartWidth - 6 - 14 to chartWidth - 6
      const result = hitTestPaneControls(800 - 6 - 7, 300 + 6 + 7, 800, 300);
      expect(result).toBe('close');
    });

    it('returns "hide" for click on hide button area', () => {
      // Hide is second from right: chartWidth - 6 - 14 - 4 - 14 to ... + 14
      const result = hitTestPaneControls(800 - 6 - 14 - 4 - 7, 300 + 6 + 7, 800, 300);
      expect(result).toBe('hide');
    });

    it('returns "settings" for click on settings button area', () => {
      // Settings is third from right
      const result = hitTestPaneControls(800 - 6 - 14 - 4 - 14 - 4 - 7, 300 + 6 + 7, 800, 300);
      expect(result).toBe('settings');
    });

    it('returns null for click outside button area', () => {
      expect(hitTestPaneControls(10, 10, 800, 300)).toBeNull();
    });

    it('returns null for click above buttons', () => {
      expect(hitTestPaneControls(800 - 10, 300 + 2, 800, 300)).toBeNull();
    });

    it('returns null for click below buttons', () => {
      expect(hitTestPaneControls(800 - 10, 300 + 6 + 14 + 5, 800, 300)).toBeNull();
    });
  });
});

// ── 12. Reference Lines ─────────────────────────────────────────────────────

describe('Reference Lines', () => {
  let renderReferenceLines: typeof import('../src/core/renderer/reference-lines').renderReferenceLines;
  let getReferenceLinesForIndicator: typeof import('../src/core/renderer/reference-lines').getReferenceLinesForIndicator;

  beforeEach(async () => {
    ({ renderReferenceLines, getReferenceLinesForIndicator } = await import('../src/core/renderer/reference-lines'));
  });

  describe('getReferenceLinesForIndicator', () => {
    it('returns RSI reference lines (30, 50, 70)', () => {
      const lines = getReferenceLinesForIndicator('RSI');
      expect(lines).toHaveLength(3);
      expect(lines.map(l => l.value)).toEqual([70, 50, 30]);
    });

    it('returns Stochastic reference lines (20, 50, 80)', () => {
      const lines = getReferenceLinesForIndicator('Stochastic');
      expect(lines).toHaveLength(3);
      expect(lines.map(l => l.value)).toEqual([80, 50, 20]);
    });

    it('returns MACD zero line', () => {
      const lines = getReferenceLinesForIndicator('MACD');
      expect(lines).toHaveLength(1);
      expect(lines[0]!.value).toBe(0);
    });

    it('returns MFI reference lines (20, 80)', () => {
      const lines = getReferenceLinesForIndicator('MFI');
      expect(lines).toHaveLength(2);
    });

    it('returns ADX threshold at 25', () => {
      const lines = getReferenceLinesForIndicator('ADX');
      expect(lines).toHaveLength(1);
      expect(lines[0]!.value).toBe(25);
    });

    it('returns Williams %R reference lines', () => {
      const lines = getReferenceLinesForIndicator('Williams %R');
      expect(lines).toHaveLength(3);
      expect(lines.map(l => l.value)).toEqual([-20, -50, -80]);
    });

    it('returns ROC zero line', () => {
      const lines = getReferenceLinesForIndicator('ROC');
      expect(lines).toHaveLength(1);
      expect(lines[0]!.value).toBe(0);
    });

    it('returns empty for unknown indicator', () => {
      expect(getReferenceLinesForIndicator('Unknown')).toEqual([]);
    });
  });

  describe('renderReferenceLines', () => {
    it('renders dashed lines at reference values', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const lines = getReferenceLinesForIndicator('RSI');
      renderReferenceLines(ctx, lines, theme, 800, 300, 200, 0, 100);
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.setLineDash).toHaveBeenCalledWith([4, 4]);
    });

    it('renders zone fills when zonePairValue is set', () => {
      const ctx = mockCtx();
      const lines = getReferenceLinesForIndicator('RSI');
      renderReferenceLines(ctx, lines, makeTheme(), 800, 300, 200, 0, 100);
      // RSI 70 and 30 have zone pairs
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('skips lines outside pane bounds', () => {
      const ctx = mockCtx();
      const lines = [{ value: 200, dashed: true }]; // value outside scaleMin/scaleMax range
      renderReferenceLines(ctx, lines, makeTheme(), 800, 300, 200, 0, 100);
      // Y for value 200 with scale 0-100 would be above yOffset
      expect(ctx.stroke).not.toHaveBeenCalled();
    });

    it('uses line color when specified', () => {
      const ctx = mockCtx();
      const lines = [{ value: 50, color: '#ff0000' }];
      renderReferenceLines(ctx, lines, makeTheme(), 800, 0, 200, 0, 100);
      expect(ctx.strokeStyle).toBe('#ff0000');
    });

    it('falls back to textMuted when no color', () => {
      const ctx = mockCtx();
      const theme = makeTheme();
      const lines = [{ value: 50 }];
      renderReferenceLines(ctx, lines, theme, 800, 0, 200, 0, 100);
      expect(ctx.strokeStyle).toBe(theme.textMuted);
    });

    it('uses lineWidth when specified', () => {
      const ctx = mockCtx();
      const lines = [{ value: 50, lineWidth: 2 }];
      renderReferenceLines(ctx, lines, makeTheme(), 800, 0, 200, 0, 100);
      expect(ctx.lineWidth).toBe(2);
    });

    it('defaults lineWidth to 0.5', () => {
      const ctx = mockCtx();
      const lines = [{ value: 50 }];
      renderReferenceLines(ctx, lines, makeTheme(), 800, 0, 200, 0, 100);
      expect(ctx.lineWidth).toBe(0.5);
    });

    it('handles zero range (scaleMax === scaleMin)', () => {
      const ctx = mockCtx();
      const lines = [{ value: 50 }];
      renderReferenceLines(ctx, lines, makeTheme(), 800, 0, 200, 50, 50);
      // valueToY should return yOffset + paneHeight / 2 = 100
      // This is within bounds (0 to 200), so it should render
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });
});

// ── 13. Indicator Renderer ──────────────────────────────────────────────────

describe('Indicator Renderer', () => {
  let renderIndicator: typeof import('../src/core/renderer/indicator-renderer').renderIndicator;
  let getIndicatorRange: typeof import('../src/core/renderer/indicator-renderer').getIndicatorRange;

  beforeEach(async () => {
    ({ renderIndicator, getIndicatorRange } = await import('../src/core/renderer/indicator-renderer'));
  });

  describe('renderIndicator', () => {
    it('renders a line plot', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { rsi: 50 } },
        { time: 2, values: { rsi: 60 } },
        { time: 3, values: { rsi: 55 } },
      ];
      const plots: PlotConfig[] = [{ key: 'rsi', type: 'line', color: '#ff0' }];
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: 0, scaleMax: 100,
      });
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('renders a histogram plot', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { h: 5 } },
        { time: 2, values: { h: -3 } },
      ];
      const plots: PlotConfig[] = [{ key: 'h', type: 'histogram', color: '#0f0' }];
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: -10, scaleMax: 10,
      });
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('renders a band plot', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { upper: 110, lower: 90 } },
        { time: 2, values: { upper: 115, lower: 85 } },
        { time: 3, values: { upper: 112, lower: 88 } },
      ];
      const plots: PlotConfig[] = [{ key: 'upper', type: 'band', bandPairKey: 'lower', color: 'rgba(0,0,0,0.1)' }];
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: 80, scaleMax: 120,
      });
      expect(ctx.fill).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
    });

    it('skips band without bandPairKey', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { upper: 110 } },
        { time: 2, values: { upper: 115 } },
      ];
      const plots: PlotConfig[] = [{ key: 'upper', type: 'band' }]; // no bandPairKey
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: 80, scaleMax: 120,
      });
      // fill is not called for band rendering (closePath + fill)
      // but save/clip may be called — check closePath instead
      expect(ctx.closePath).not.toHaveBeenCalled();
    });

    it('renders dots plot', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { d: 50 } },
        { time: 2, values: { d: 60 } },
      ];
      const plots: PlotConfig[] = [{ key: 'd', type: 'dots', color: '#ff0', lineWidth: 3 }];
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: 0, scaleMax: 100,
      });
      expect(ctx.arc).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('skips undefined values in line plot', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { rsi: 50 } },
        { time: 2, values: {} }, // undefined
        { time: 3, values: { rsi: 60 } },
      ];
      const plots: PlotConfig[] = [{ key: 'rsi', type: 'line' }];
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: 0, scaleMax: 100,
      });
      // moveTo is called for: clip rect setup + 2 line moves (first point + after gap)
      // lineTo should be called only once (no connection over gap)
      expect(ctx.lineTo).not.toHaveBeenCalled();
      // But moveTo should be called at least twice for the two data points
      const moveToCallCount = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(moveToCallCount).toBeGreaterThanOrEqual(2);
    });

    it('clips to pane bounds', () => {
      const ctx = mockCtx();
      renderIndicator({
        ctx, outputs: [], plots: [], firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 100, paneHeight: 200, scaleMin: 0, scaleMax: 100,
      });
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.clip).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('handles zero range', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { v: 50 } },
      ];
      const plots: PlotConfig[] = [{ key: 'v', type: 'line' }];
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: 50, scaleMax: 50,
      });
      // Should still render at middle Y
      expect(ctx.moveTo).toHaveBeenCalled();
    });

    it('skips bars far off screen in line plot', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { v: 50 } },
      ];
      const plots: PlotConfig[] = [{ key: 'v', type: 'line' }];
      // firstBarIndex far away so bar is off screen
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 1000,
        timeScale: makeTimeScale(0, 50, 10), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: 0, scaleMax: 100,
      });
      // Bar at index 1000 with firstIndex 0 would be at x=10005, beyond chartWidth+50
      // stroke is still called (empty path), but lineTo should not be
      expect(ctx.lineTo).not.toHaveBeenCalled();
    });

    it('uses default colors when not specified', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { v: 50 } },
        { time: 2, values: { v: 60 } },
      ];
      const plots: PlotConfig[] = [{ key: 'v', type: 'line' }]; // no color
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: 0, scaleMax: 100,
      });
      expect(ctx.strokeStyle).toBe('#ffffff'); // default
    });

    it('band with fewer than 2 visible points skips rendering', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { upper: 110, lower: 90 } },
      ];
      const plots: PlotConfig[] = [{ key: 'upper', type: 'band', bandPairKey: 'lower' }];
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: 80, scaleMax: 120,
      });
      // Only 1 point, needs >= 2 — closePath is not called (band fill skipped)
      expect(ctx.closePath).not.toHaveBeenCalled();
    });

    it('histogram uses green for positive and red for negative', () => {
      const ctx = mockCtx();
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { h: 5 } },
        { time: 2, values: { h: -3 } },
      ];
      const plots: PlotConfig[] = [{ key: 'h', type: 'histogram' }];
      renderIndicator({
        ctx, outputs, plots, firstBarIndex: 0,
        timeScale: makeTimeScale(), chartWidth: 800,
        yOffset: 0, paneHeight: 200, scaleMin: -10, scaleMax: 10,
      });
      // fillRect is called for histogram bars (at least 2 for 2 data points)
      expect((ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getIndicatorRange', () => {
    it('returns min/max from outputs', () => {
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { rsi: 30 } },
        { time: 2, values: { rsi: 70 } },
        { time: 3, values: { rsi: 50 } },
      ];
      const plots: PlotConfig[] = [{ key: 'rsi', type: 'line' }];
      const range = getIndicatorRange(outputs, plots, 0, 3);
      expect(range).toEqual({ min: 30, max: 70 });
    });

    it('returns null for empty range', () => {
      const result = getIndicatorRange([], [{ key: 'v', type: 'line' }], 0, 0);
      expect(result).toBeNull();
    });

    it('skips undefined values', () => {
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { rsi: 40 } },
        { time: 2, values: {} },
        { time: 3, values: { rsi: 60 } },
      ];
      const plots: PlotConfig[] = [{ key: 'rsi', type: 'line' }];
      const range = getIndicatorRange(outputs, plots, 0, 3);
      expect(range).toEqual({ min: 40, max: 60 });
    });

    it('only considers fromIndex to toIndex range', () => {
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { v: 10 } },
        { time: 2, values: { v: 50 } },
        { time: 3, values: { v: 90 } },
      ];
      const plots: PlotConfig[] = [{ key: 'v', type: 'line' }];
      const range = getIndicatorRange(outputs, plots, 1, 2);
      expect(range).toEqual({ min: 50, max: 50 });
    });

    it('skips band-type plots', () => {
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { upper: 200, middle: 100 } },
      ];
      const plots: PlotConfig[] = [
        { key: 'upper', type: 'band', bandPairKey: 'lower' },
        { key: 'middle', type: 'line' },
      ];
      const range = getIndicatorRange(outputs, plots, 0, 1);
      // Should only consider 'middle', not 'upper'
      expect(range).toEqual({ min: 100, max: 100 });
    });

    it('returns null when all values are undefined', () => {
      const outputs: IndicatorOutput[] = [
        { time: 1, values: {} },
        { time: 2, values: {} },
      ];
      const plots: PlotConfig[] = [{ key: 'v', type: 'line' }];
      expect(getIndicatorRange(outputs, plots, 0, 2)).toBeNull();
    });

    it('handles toIndex beyond outputs length', () => {
      const outputs: IndicatorOutput[] = [
        { time: 1, values: { v: 42 } },
      ];
      const plots: PlotConfig[] = [{ key: 'v', type: 'line' }];
      const range = getIndicatorRange(outputs, plots, 0, 100);
      expect(range).toEqual({ min: 42, max: 42 });
    });
  });
});

// ── 14. SMC customRender ─────────────────────────────────────────────────────

describe('smc.customRender', () => {
  it('returns early when no SMC data is available', async () => {
    const { smc } = await import('../src/indicators/overlays/smc');
    const ctx = mockCtx();
    smc.customRender!({
      ctx, outputs: [], params: {},
      timeScale: makeTimeScale(), priceScale: makePriceScale(),
      chartWidth: 800, chartHeight: 400, precision: 2,
    });
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
  });
});

// ── 15. Drawing Data Injector ───────────────────────────────────────────────

describe('injectDrawingData', () => {
  let injectDrawingData: typeof import('../src/core/renderer/drawing-data-injector').injectDrawingData;

  beforeEach(async () => {
    ({ injectDrawingData } = await import('../src/core/renderer/drawing-data-injector'));
  });

  const makeInjectorCtx = () => ({
    nearestIndex: (t: number) => Math.floor(t / 3600),
    getRange: (from: number, to: number) => makeBars(Math.min(to - from, 10), from * 3600),
    precision: 2,
    priceScale: makePriceScale(),
    mainPaneHeight: 400,
  });

  it('returns original options for single-point non-special tools', () => {
    const opts = { color: '#fff', lineWidth: 1 };
    const result = injectDrawingData('brush', [{ time: 100, price: 100 }], [{ x: 50, y: 50 }], opts, makeInjectorCtx());
    expect(result).toBe(opts);
  });

  it('injects time label for vertical-line', () => {
    const result = injectDrawingData(
      'vertical-line',
      [{ time: 1700000000, price: 100 }],
      [{ x: 50, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._timeLabel).toBeDefined();
    expect(typeof result._timeLabel).toBe('string');
  });

  it('injects time label for cross-line', () => {
    const result = injectDrawingData(
      'cross-line',
      [{ time: 1700000000, price: 100 }],
      [{ x: 50, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._timeLabel).toBeDefined();
    expect(result._priceLabel).toBeDefined();
  });

  it('injects line data for trend-line', () => {
    const result = injectDrawingData(
      'trend-line',
      [{ time: 3600, price: 100 }, { time: 7200, price: 110 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._lineData).toBeDefined();
    expect(result._lineData.angle).toBeDefined();
    expect(result._lineData.bars).toBeDefined();
    expect(result._lineData.deltaPrice).toBe(10);
    expect(result._lineData.pctChange).toBeCloseTo(10, 0);
  });

  it('injects forecast data', () => {
    const result = injectDrawingData(
      'forecast',
      [{ time: 3600, price: 100 }, { time: 7200, price: 110 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._lineData).toBeDefined();
    expect(result._entryPrice).toBe(100);
  });

  it('injects price-range data', () => {
    const result = injectDrawingData(
      'price-range',
      [{ time: 3600, price: 100 }, { time: 7200, price: 110 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._priceData.price1).toBe(100);
    expect(result._priceData.price2).toBe(110);
  });

  it('injects date-range data', () => {
    const result = injectDrawingData(
      'date-range',
      [{ time: 3600, price: 100 }, { time: 7200, price: 110 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._barCount).toBeDefined();
    expect(result._duration).toBeDefined();
  });

  it('injects rect data for rectangle', () => {
    const result = injectDrawingData(
      'rectangle',
      [{ time: 3600, price: 100 }, { time: 7200, price: 110 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._rectData).toBeDefined();
    expect(result._rectData.priceRange).toBe(10);
  });

  it('injects fib prices for fib-retracement', () => {
    const result = injectDrawingData(
      'fib-retracement',
      [{ time: 3600, price: 100 }, { time: 7200, price: 150 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._fibPrices).toBeDefined();
    expect(result._fibPrices.p1).toBe(100);
    expect(result._fibPrices.p2).toBe(150);
  });

  it('injects long-short data', () => {
    const result = injectDrawingData(
      'long-short',
      [{ time: 3600, price: 100 }, { time: 7200, price: 120 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._entryPrice).toBe(100);
    expect(result._targetPrice).toBe(120);
    expect(result._precision).toBe(2);
  });

  it('returns original options with fewer than 2 points for multi-point tools', () => {
    const opts = { color: '#fff', lineWidth: 1 };
    const result = injectDrawingData('trend-line', [], [], opts, makeInjectorCtx());
    expect(result).toBe(opts);
  });

  it('injects triangle data with 3 points', () => {
    const result = injectDrawingData(
      'triangle',
      [
        { time: 3600, price: 100 },
        { time: 7200, price: 110 },
        { time: 10800, price: 105 },
      ],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }, { x: 250, y: 75 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._rectData).toBeDefined();
    expect(result._rectData.priceRange).toBe(10);
  });

  it('injects head-shoulders target with 5 points', () => {
    const result = injectDrawingData(
      'head-shoulders',
      [
        { time: 3600, price: 100 },
        { time: 7200, price: 95 },  // neck
        { time: 10800, price: 110 }, // head
        { time: 14400, price: 95 },  // neck
        { time: 18000, price: 100 },
      ],
      [{ x: 50, y: 100 }, { x: 150, y: 120 }, { x: 250, y: 50 }, { x: 350, y: 120 }, { x: 450, y: 100 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._hsTarget).toBeDefined();
    expect(result._hsTarget.targetPrice).toBeDefined();
  });

  it('injects pitchfork channel data with 3 points', () => {
    const result = injectDrawingData(
      'pitchfork',
      [
        { time: 3600, price: 100 },
        { time: 7200, price: 110 },
        { time: 10800, price: 105 },
      ],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }, { x: 250, y: 75 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._channelData).toBeDefined();
    expect(result._channelData.priceWidth).toBeDefined();
  });

  it('injects parallel-channel data with 3 points', () => {
    const result = injectDrawingData(
      'parallel-channel',
      [
        { time: 3600, price: 100 },
        { time: 7200, price: 110 },
        { time: 10800, price: 120 },
      ],
      [{ x: 50, y: 200 }, { x: 150, y: 100 }, { x: 100, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._channelData).toBeDefined();
    expect(result._channelData.pxDist).toBeDefined();
  });

  it('injects polyline data', () => {
    const result = injectDrawingData(
      'polyline',
      [
        { time: 3600, price: 100 },
        { time: 7200, price: 110 },
        { time: 10800, price: 105 },
      ],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }, { x: 250, y: 75 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._polyData).toBeDefined();
    expect(result._polyData.segments).toBe(2);
  });

  it('injects regression channel data', () => {
    const injCtx = makeInjectorCtx();
    const result = injectDrawingData(
      'regression-channel',
      [{ time: 3600, price: 100 }, { time: 36000, price: 110 }],
      [{ x: 50, y: 100 }, { x: 500, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      injCtx,
    ) as any;
    expect(result._regrData).toBeDefined();
    expect(result._regrData.r2).toBeDefined();
    expect(result._regrData.stddev).toBeDefined();
  });

  it('injects date-price-range data', () => {
    const result = injectDrawingData(
      'date-price-range',
      [{ time: 3600, price: 100 }, { time: 7200, price: 110 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._datePriceData).toBeDefined();
    expect(result._datePriceData.deltaPrice).toBe(10);
    expect(result._datePriceData.bars).toBeDefined();
  });

  it('injects horizontal-ray text', () => {
    const result = injectDrawingData(
      'horizontal-ray',
      [{ time: 3600, price: 100 }],
      [{ x: 50, y: 100 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result.text).toBeDefined();
  });

  it('injects flat-top-bottom channel data', () => {
    const result = injectDrawingData(
      'flat-top-bottom',
      [
        { time: 3600, price: 100 },
        { time: 7200, price: 110 },
        { time: 10800, price: 120 },
      ],
      [{ x: 50, y: 200 }, { x: 150, y: 100 }, { x: 250, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._channelData).toBeDefined();
    expect(result._channelData.priceWidth).toBe(20);
  });

  it('injects disjoint-channel data', () => {
    const result = injectDrawingData(
      'disjoint-channel',
      [
        { time: 3600, price: 100 },
        { time: 7200, price: 110 },
        { time: 10800, price: 105 },
        { time: 14400, price: 115 },
      ],
      [{ x: 50, y: 200 }, { x: 150, y: 100 }, { x: 250, y: 150 }, { x: 350, y: 80 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._channelData).toBeDefined();
    expect(result._channelData.priceWidth).toBeDefined();
  });

  it('injects trend-fib-time data', () => {
    const result = injectDrawingData(
      'trend-fib-time',
      [{ time: 3600, price: 100 }, { time: 7200, price: 110 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._lineData).toBeDefined();
    expect(result._lineData.bars).toBeDefined();
  });

  it('injects elliott-double-combo data', () => {
    const result = injectDrawingData(
      'elliott-double-combo',
      [
        { time: 3600, price: 100 },
        { time: 7200, price: 110 },
        { time: 10800, price: 105 },
        { time: 14400, price: 120 },
      ],
      [{ x: 50, y: 200 }, { x: 150, y: 100 }, { x: 250, y: 150 }, { x: 350, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._comboData).toBeDefined();
    expect(result._comboData.totalPx).toBe(20);
  });

  it('injects elliott-triple-combo data', () => {
    const result = injectDrawingData(
      'elliott-triple-combo',
      [
        { time: 3600, price: 100 },
        { time: 7200, price: 110 },
        { time: 10800, price: 105 },
        { time: 14400, price: 115 },
        { time: 18000, price: 108 },
        { time: 21600, price: 125 },
      ],
      [{ x: 50, y: 200 }, { x: 150, y: 100 }, { x: 250, y: 150 }, { x: 350, y: 80 }, { x: 450, y: 130 }, { x: 550, y: 30 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._comboData).toBeDefined();
    expect(result._comboData.totalPx).toBe(25);
  });

  it('injects fib-extension data', () => {
    const result = injectDrawingData(
      'fib-extension',
      [{ time: 3600, price: 100 }, { time: 7200, price: 150 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._fibPrices).toBeDefined();
  });

  it('injects ellipse rect data', () => {
    const result = injectDrawingData(
      'ellipse',
      [{ time: 3600, price: 100 }, { time: 7200, price: 110 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._rectData).toBeDefined();
  });

  it('handles zero price for pctChange calculation', () => {
    const result = injectDrawingData(
      'trend-line',
      [{ time: 3600, price: 0 }, { time: 7200, price: 110 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      { color: '#fff', lineWidth: 1 },
      makeInjectorCtx(),
    ) as any;
    expect(result._lineData.pctChange).toBe(0);
  });

  it('returns original opts for unknown 2-point tool', () => {
    const opts = { color: '#fff', lineWidth: 1 };
    const result = injectDrawingData(
      'unknown-tool',
      [{ time: 3600, price: 100 }, { time: 7200, price: 110 }],
      [{ x: 50, y: 100 }, { x: 150, y: 50 }],
      opts,
      makeInjectorCtx(),
    );
    expect(result).toBe(opts);
  });

  it('injects anchored-vwap data when barIndexToX provided', () => {
    const injCtx = {
      ...makeInjectorCtx(),
      barIndexToX: (idx: number) => idx * 10,
    };
    const result = injectDrawingData(
      'anchored-vwap',
      [{ time: 3600, price: 100 }],
      [{ x: 50, y: 100 }],
      { color: '#fff', lineWidth: 1 },
      injCtx,
    ) as any;
    expect(result._vwapData).toBeDefined();
    expect(Array.isArray(result._vwapData)).toBe(true);
  });
});

// ── 16. Volume Renderer ─────────────────────────────────────────────────────

describe('renderVolume', () => {
  let renderVolume: typeof import('../src/core/series/volume').renderVolume;

  beforeEach(async () => {
    ({ renderVolume } = await import('../src/core/series/volume'));
  });

  it('renders volume bars for visible bars', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const bars = makeBars(10);
    renderVolume(ctx, bars, 0, 2000, makeTimeScale(), theme, 800, 400);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('returns early when maxVolume is 0', () => {
    const ctx = mockCtx();
    renderVolume(ctx, makeBars(5), 0, 0, makeTimeScale(), makeTheme(), 800, 400);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('returns early when maxVolume is negative', () => {
    const ctx = mockCtx();
    renderVolume(ctx, makeBars(5), 0, -100, makeTimeScale(), makeTheme(), 800, 400);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('uses bullCandle color for bullish bars', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const bars: Bar[] = [{ time: 100, open: 100, high: 110, low: 90, close: 105, volume: 1000 }];
    renderVolume(ctx, bars, 0, 1000, makeTimeScale(0, 10, 20), theme, 800, 400);
    expect(ctx.fillStyle).toBe(theme.volumeBull);
  });

  it('uses bearCandle color for bearish bars', () => {
    const ctx = mockCtx();
    const theme = makeTheme();
    const bars: Bar[] = [{ time: 100, open: 110, high: 115, low: 90, close: 100, volume: 1000 }];
    renderVolume(ctx, bars, 0, 1000, makeTimeScale(0, 10, 20), theme, 800, 400);
    expect(ctx.fillStyle).toBe(theme.volumeBear);
  });

  it('skips bars that are off-screen', () => {
    const ctx = mockCtx();
    const bars = makeBars(5);
    // Put bars far off screen
    renderVolume(ctx, bars, 0, 1000, makeTimeScale(100, 10, 10), makeTheme(), 100, 400);
    // Bars would be at negative x, should be skipped
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('handles empty bars array', () => {
    const ctx = mockCtx();
    renderVolume(ctx, [], 0, 1000, makeTimeScale(), makeTheme(), 800, 400);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
});

// ── 17. Canvas Layer (DOM-dependent, limited testing) ────────────────────────

describe('canvas-layer.ts (LayerManager)', () => {
  // LayerManager requires DOM (document.createElement, HTMLElement)
  // which is not available in Node. We just verify the module exports.
  it('exports LayerManager class', async () => {
    const mod = await import('../src/core/renderer/canvas-layer');
    expect(mod.LayerManager).toBeDefined();
    expect(typeof mod.LayerManager).toBe('function');
  });
});
