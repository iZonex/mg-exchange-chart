import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PriceScale } from '../src/core/renderer/price-axis';
import type { TimeScale } from '../src/core/renderer/time-axis';
import { smc, _setTestSMCData } from '../src/indicators/overlays/smc';

// ── Mock canvas context ────────────────────────────────────────────────────

function mockCtx(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    font: '',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    setLineDash: vi.fn(),
    quadraticCurveTo: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
  } as unknown as CanvasRenderingContext2D;
}

// ── Shared test fixtures ───────────────────────────────────────────────────

const timeScale: TimeScale = { firstIndex: 0, visibleCount: 100, barSpacing: 8, offsetX: 0 };
const priceScale: PriceScale = { min: 100, max: 200, mode: 'linear' };
const chartWidth = 800;
const chartHeight = 500;
const precision = 2;

// ── No data ────────────────────────────────────────────────────────────────

describe('renderSMC — no data', () => {
  it('should return early when getLastSMCData returns null', () => {
    _setTestSMCData(null);
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });
    // No canvas calls should be made
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

// ── FVG rendering ──────────────────────────────────────────────────────────

describe('renderSMC — FVG zones', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('should render a visible bullish FVG zone', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [{
        type: 'bullish',
        low: 140,
        high: 160,
        candleIndex: 10,
        filled: false,
        mitigatedIndex: -1,
        gapSizePct: 2.5,
      }],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // Should draw fill rect for FVG zone
    expect(ctx.fillRect).toHaveBeenCalled();
    // Should draw dashed borders (two moveTo/lineTo pairs)
    expect(ctx.setLineDash).toHaveBeenCalled();
    // Should render label since zone is tall enough (|y2-y1| for 140-160 on 100-200 range = 100px)
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should skip filled FVGs', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [{
        type: 'bullish',
        low: 140,
        high: 160,
        candleIndex: 10,
        filled: true,
        mitigatedIndex: 5,
        gapSizePct: 2.5,
      }],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // Only the structure badge may call fillRect/fillText, not FVG zone
    // Filled FVGs are skipped entirely
    expect(ctx.setLineDash).not.toHaveBeenCalled();
  });

  it('should skip FVGs far to the left of visible range', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [{
        type: 'bearish',
        low: 140,
        high: 160,
        candleIndex: -100, // way before visStart - 30
        filled: false,
        mitigatedIndex: -1,
        gapSizePct: 1.0,
      }],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    expect(ctx.setLineDash).not.toHaveBeenCalled();
  });

  it('should render bearish FVG with correct colors', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [{
        type: 'bearish',
        low: 130,
        high: 170,
        candleIndex: 20,
        filled: false,
        mitigatedIndex: -1,
        gapSizePct: 3.0,
      }],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('should not render FVG label when zone is too small', () => {
    // FVG with very close high/low -> zone height < 8px
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [{
        type: 'bullish',
        low: 150,
        high: 150.5, // very small gap: 0.5 on range 100 => 0.5/100*500 = 2.5px
        candleIndex: 10,
        filled: false,
        mitigatedIndex: -1,
        gapSizePct: 0.3,
      }],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // fillText should NOT be called for tiny FVG label (only fillRect for zone)
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});

// ── Order Block rendering ──────────────────────────────────────────────────

describe('renderSMC — Order Blocks', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('should render a visible bullish order block', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [{
        type: 'bullish',
        high: 160,
        low: 140,
        candleIndex: 15,
        mitigated: false,
        mitigatedIndex: -1,
        volumePct: 250,
      }],
      fvgs: [],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // Fill zone + pill background + label
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
    // Left accent bar (thick stroke)
    expect(ctx.stroke).toHaveBeenCalled();
    // Pill rounded rect
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it('should skip mitigated order blocks', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [{
        type: 'bearish',
        high: 180,
        low: 160,
        candleIndex: 20,
        mitigated: true,
        mitigatedIndex: 25,
        volumePct: 100,
      }],
      fvgs: [],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // Mitigated OBs are skipped — no quadraticCurveTo calls (pill drawing)
    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled();
  });

  it('should format volume as K for large percentages', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [{
        type: 'bullish',
        high: 160,
        low: 140,
        candleIndex: 15,
        mitigated: false,
        mitigatedIndex: -1,
        volumePct: 2500, // >= 1000, should display as "3K" (2500/1000 = 2.5 -> "3K")
      }],
      fvgs: [],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // The label should contain "K" suffix
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const labelCall = fillTextCalls.find((c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('K'));
    expect(labelCall).toBeDefined();
  });

  it('should skip order blocks far to the left', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [{
        type: 'bearish',
        high: 180,
        low: 160,
        candleIndex: -200, // way before visStart - 60
        mitigated: false,
        mitigatedIndex: -1,
        volumePct: 100,
      }],
      fvgs: [],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled();
  });
});

// ── Swing Points rendering ─────────────────────────────────────────────────

describe('renderSMC — Swing Points', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('should render swing high triangle above candle', () => {
    _setTestSMCData({
      swings: [{ idx: 10, price: 160, isHigh: true }],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // Triangle: moveTo + 2x lineTo + closePath + fill
    expect(ctx.closePath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('should render swing low triangle below candle', () => {
    _setTestSMCData({
      swings: [{ idx: 15, price: 120, isHigh: false }],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    expect(ctx.closePath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('should skip swing points outside visible range', () => {
    _setTestSMCData({
      swings: [{ idx: -50, price: 150, isHigh: true }],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // No triangle drawn
    expect(ctx.closePath).not.toHaveBeenCalled();
  });

  it('should render HH/HL/LH/LL labels on last 8 swings', () => {
    _setTestSMCData({
      swings: [
        { idx: 10, price: 140, isHigh: true },
        { idx: 15, price: 120, isHigh: false },
        { idx: 20, price: 160, isHigh: true },  // HH (160 > 140)
        { idx: 25, price: 130, isHigh: false },  // HL (130 > 120)
      ],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // fillText called for triangles AND labels
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillTextCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('should skip label when no previous swing of same type exists', () => {
    // Only one swing high — no previous high to compare against
    _setTestSMCData({
      swings: [{ idx: 10, price: 150, isHigh: true }],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // fillText should not be called for HH/HL/LH/LL labels (no prev same-type)
    // but may be called for other things — check that the label section didn't produce a call
    // Since there's no prev, the code does `continue` — so no bold font fillText
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    // No HH/LH label rendered (only triangle fill, no fillText for label)
    expect(fillTextCalls.length).toBe(0);
  });
});

// ── BOS / CHoCH rendering ──────────────────────────────────────────────────

describe('renderSMC — BOS / CHoCH', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('should render a BOS dashed line with label', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [{
        type: 'bos',
        direction: 'bullish',
        level: 160,
        candleIndex: 30,
      }],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // Dashed line
    expect(ctx.setLineDash).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    // Label pill
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should render CHoCH with bolder line and different dash pattern', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [{
        type: 'choch',
        direction: 'bearish',
        level: 140,
        candleIndex: 50,
      }],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    expect(ctx.setLineDash).toHaveBeenCalled();
    // CHoCH uses [4,3] dash pattern — check first call
    const dashCalls = (ctx.setLineDash as ReturnType<typeof vi.fn>).mock.calls;
    expect(dashCalls[0]![0]).toEqual([4, 3]);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should skip BOS events outside visible range', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [{
        type: 'bos',
        direction: 'bullish',
        level: 150,
        candleIndex: -100,
      }],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    expect(ctx.setLineDash).not.toHaveBeenCalled();
  });

  it('should position bullish BOS label above the line', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [{
        type: 'bos',
        direction: 'bullish',
        level: 150,
        candleIndex: 20,
      }],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // fillRect for badge: badgeY = y - 14 for bullish
    const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillRectCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Market Structure badge ─────────────────────────────────────────────────

describe('renderSMC — Market Structure Badge', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('should render uptrend badge with bullish color', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [],
      structure: 'uptrend',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should render downtrend badge', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [],
      structure: 'downtrend',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should render ranging badge', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [],
      structure: 'ranging',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should not render badge when structure is unknown', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [],
      fvgs: [],
      bosEvents: [],
      structure: 'unknown',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // No badge rendered for 'unknown'
    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });

  it('should count active (non-mitigated) OBs and unfilled FVGs in badge', () => {
    _setTestSMCData({
      swings: [],
      orderBlocks: [
        { type: 'bullish', high: 160, low: 140, candleIndex: 10, mitigated: false, mitigatedIndex: -1, volumePct: 100 },
        { type: 'bearish', high: 180, low: 160, candleIndex: 20, mitigated: true, mitigatedIndex: 25, volumePct: 100 },
      ],
      fvgs: [
        { type: 'bullish', low: 140, high: 160, candleIndex: 5, filled: false, mitigatedIndex: -1, gapSizePct: 2 },
        { type: 'bearish', low: 130, high: 150, candleIndex: 8, filled: true, mitigatedIndex: 12, gapSizePct: 1.5 },
      ],
      bosEvents: [],
      structure: 'uptrend',
    });
    const ctx = mockCtx();
    smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });

    // Badge text should include OB:1 FVG:1 (only active ones)
    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const badgeCall = fillTextCalls.find((c: unknown[]) =>
      typeof c[0] === 'string' && (c[0] as string).includes('OB:1') && (c[0] as string).includes('FVG:1')
    );
    expect(badgeCall).toBeDefined();
  });
});

// ── Combined rendering ─────────────────────────────────────────────────────

describe('renderSMC — combined data', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('should render all element types together without errors', () => {
    _setTestSMCData({
      swings: [
        { idx: 10, price: 140, isHigh: true },
        { idx: 20, price: 120, isHigh: false },
        { idx: 30, price: 160, isHigh: true },
        { idx: 40, price: 130, isHigh: false },
      ],
      orderBlocks: [{
        type: 'bullish',
        high: 150,
        low: 140,
        candleIndex: 12,
        mitigated: false,
        mitigatedIndex: -1,
        volumePct: 500,
      }],
      fvgs: [{
        type: 'bearish',
        low: 155,
        high: 165,
        candleIndex: 25,
        filled: false,
        mitigatedIndex: -1,
        gapSizePct: 1.5,
      }],
      bosEvents: [{
        type: 'bos',
        direction: 'bullish',
        level: 155,
        candleIndex: 35,
      }],
      structure: 'uptrend',
    });
    const ctx = mockCtx();

    // Should not throw
    expect(() => {
      smc.customRender!({ ctx, outputs: [], params: {}, timeScale, priceScale, chartWidth, chartHeight, precision });
    }).not.toThrow();

    // All element types rendered
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
    expect(ctx.setLineDash).toHaveBeenCalled();
  });
});
