import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DrawingEngine } from '../src/drawings/engine';
import type { DrawingInstance, InternalDrawingTool } from '../src/drawings/engine';
import type { PixelPoint } from '../src/drawings/primitives/hit-test';
import type { Point, DrawingOptions } from '../src/api/types';
import { PaneManager } from '../src/core/pane/pane-manager';
import { OrderLineManager } from '../src/core/renderer/order-lines';
import type { OrderLine } from '../src/core/renderer/order-lines';
import { TradingDemo } from '../dev/trading-demo';
import type { Chart } from '../src/core/chart';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Create a minimal mock drawing tool for testing */
function mockTool(name: string, pointCount: number): InternalDrawingTool {
  return {
    name,
    icon: '<svg/>',
    pointCount,
    render: vi.fn(),
    hitTest: vi.fn().mockReturnValue(false),
    getHandles: (pts: PixelPoint[]) => pts, // handles = points
  };
}

/** Create a mock Chart that records addOrderLine/removeOrderLine/updateOrderLine calls */
function mockChart() {
  return {
    addOrderLine: vi.fn(),
    removeOrderLine: vi.fn(),
    updateOrderLine: vi.fn(),
    setPositionOverlays: vi.fn(),
  } as unknown as Chart;
}

// ═══════════════════════════════════════════════════════════════════════════
// Drawing Engine
// ═══════════════════════════════════════════════════════════════════════════

describe('DrawingEngine — state machine', () => {
  let engine: DrawingEngine;
  const p1: Point = { price: 100, time: 1000 };
  const p2: Point = { price: 200, time: 2000 };
  const p3: Point = { price: 300, time: 3000 };

  beforeEach(() => {
    engine = new DrawingEngine();
    engine.registerTool(mockTool('horizontal-line', 1));
    engine.registerTool(mockTool('trend-line', 2));
    engine.registerTool(mockTool('fib-retracement', 3));
  });

  // ── Creation flow ────────────────────────────────────────────────────

  it('starts in idle mode', () => {
    expect(engine.state.mode).toBe('idle');
  });

  it('idle -> startCreating transitions to creating mode', () => {
    engine.startCreating('trend-line');
    expect(engine.state.mode).toBe('creating');
    if (engine.state.mode === 'creating') {
      expect(engine.state.toolName).toBe('trend-line');
      expect(engine.state.points).toHaveLength(0);
    }
  });

  it('startCreating with unknown tool throws', () => {
    expect(() => engine.startCreating('nonexistent')).toThrow('Unknown tool: nonexistent');
  });

  it('addPoint during creation accumulates points', () => {
    engine.startCreating('trend-line');
    const result = engine.addPoint(p1);
    expect(result).toBeNull(); // need 2 points for trend-line
    if (engine.state.mode === 'creating') {
      expect(engine.state.points).toHaveLength(1);
    }
  });

  it('addPoint completes drawing when pointCount reached (1-point tool)', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1);
    expect(drawing).not.toBeNull();
    expect(drawing!.toolName).toBe('horizontal-line');
    expect(drawing!.points).toEqual([p1]);
    expect(engine.state.mode).toBe('idle');
  });

  it('addPoint completes drawing when pointCount reached (2-point tool)', () => {
    engine.startCreating('trend-line');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2);
    expect(drawing).not.toBeNull();
    expect(drawing!.toolName).toBe('trend-line');
    expect(drawing!.points).toEqual([p1, p2]);
    expect(engine.state.mode).toBe('idle');
  });

  it('addPoint completes drawing when pointCount reached (3-point tool)', () => {
    engine.startCreating('fib-retracement');
    engine.addPoint(p1);
    engine.addPoint(p2);
    const drawing = engine.addPoint(p3);
    expect(drawing).not.toBeNull();
    expect(drawing!.points).toEqual([p1, p2, p3]);
    expect(engine.state.mode).toBe('idle');
  });

  it('created drawing is stored and retrievable via get()', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    expect(engine.get(drawing.id)).toBe(drawing);
  });

  it('created drawing has default options', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    expect(drawing.options.color).toBe('#2962FF');
    expect(drawing.options.lineWidth).toBe(1.5);
    expect(drawing.options.lineStyle).toBe('solid');
    expect(drawing.locked).toBe(false);
    expect(drawing.visible).toBe(true);
  });

  it('cancelCreating returns to idle', () => {
    engine.startCreating('trend-line');
    engine.addPoint(p1);
    engine.cancelCreating();
    expect(engine.state.mode).toBe('idle');
    // No drawing created
    expect(engine.getAll()).toHaveLength(0);
  });

  it('setPreviewPoint updates preview in creating mode', () => {
    engine.startCreating('trend-line');
    engine.setPreviewPoint(p1);
    if (engine.state.mode === 'creating') {
      expect(engine.state.previewPoint).toEqual(p1);
    }
  });

  it('setPreviewPoint is no-op outside creating mode', () => {
    engine.setPreviewPoint(p1); // idle mode
    expect(engine.state.mode).toBe('idle');
  });

  it('addPoint is no-op outside creating mode', () => {
    const result = engine.addPoint(p1);
    expect(result).toBeNull();
  });

  // ── Editing flow ─────────────────────────────────────────────────────

  it('startEditing transitions to editing mode', () => {
    engine.startCreating('trend-line');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2)!;

    engine.startEditing(drawing.id, 0);
    expect(engine.state.mode).toBe('editing');
    if (engine.state.mode === 'editing') {
      expect(engine.state.drawingId).toBe(drawing.id);
      expect(engine.state.handleIndex).toBe(0);
    }
  });

  it('dragTo in editing mode updates the handle point', () => {
    engine.startCreating('trend-line');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2)!;

    engine.startEditing(drawing.id, 0);
    const newPoint: Point = { price: 150, time: 1500 };
    engine.dragTo(newPoint);
    expect(drawing.points[0]).toEqual(newPoint);
    expect(drawing.points[1]).toEqual(p2); // other point unchanged
  });

  it('endDrag after editing returns to idle', () => {
    engine.startCreating('trend-line');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2)!;

    engine.startEditing(drawing.id, 1);
    engine.dragTo({ price: 250, time: 2500 });
    engine.endDrag();
    expect(engine.state.mode).toBe('idle');
  });

  it('startEditing on locked drawing does not transition', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    engine.toggleLock(drawing.id);

    engine.startEditing(drawing.id, 0);
    expect(engine.state.mode).toBe('idle');
  });

  // ── Moving flow ──────────────────────────────────────────────────────

  it('startMoving transitions to moving mode', () => {
    engine.startCreating('trend-line');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2)!;

    const mouseStart: Point = { price: 150, time: 1500 };
    engine.startMoving(drawing.id, mouseStart);
    expect(engine.state.mode).toBe('moving');
  });

  it('dragTo in moving mode translates all points', () => {
    engine.startCreating('trend-line');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2)!;

    engine.startMoving(drawing.id, { price: 100, time: 1000 });
    engine.dragTo({ price: 110, time: 1100 });

    // dp = +10 price, +100 time
    expect(drawing.points[0]!.price).toBe(110);
    expect(drawing.points[0]!.time).toBe(1100);
    expect(drawing.points[1]!.price).toBe(210);
    expect(drawing.points[1]!.time).toBe(2100);
  });

  it('endDrag after moving returns to idle', () => {
    engine.startCreating('trend-line');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2)!;

    engine.startMoving(drawing.id, { price: 100, time: 1000 });
    engine.dragTo({ price: 110, time: 1100 });
    engine.endDrag();
    expect(engine.state.mode).toBe('idle');
  });

  it('startMoving on locked drawing does not transition', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    engine.toggleLock(drawing.id);

    engine.startMoving(drawing.id, p1);
    expect(engine.state.mode).toBe('idle');
  });

  // ── Lock / Visible toggle ───────────────────────────────────────────

  it('toggleLock flips locked state', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    expect(drawing.locked).toBe(false);
    engine.toggleLock(drawing.id);
    expect(drawing.locked).toBe(true);
    engine.toggleLock(drawing.id);
    expect(drawing.locked).toBe(false);
  });

  it('toggleVisible flips visible state', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    expect(drawing.visible).toBe(true);
    engine.toggleVisible(drawing.id);
    expect(drawing.visible).toBe(false);
    engine.toggleVisible(drawing.id);
    expect(drawing.visible).toBe(true);
  });

  it('invisible drawings excluded from getAll()', () => {
    engine.startCreating('horizontal-line');
    const d1 = engine.addPoint(p1)!;
    engine.startCreating('horizontal-line');
    const d2 = engine.addPoint(p2)!;

    engine.toggleVisible(d1.id);
    const all = engine.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.id).toBe(d2.id);
  });

  // ── Select / Deselect ───────────────────────────────────────────────

  it('select sets selectedId and returns drawing', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;

    const result = engine.select(drawing.id);
    expect(result).toBe(drawing);
    expect(engine.selectedId).toBe(drawing.id);
  });

  it('select with null deselects', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    engine.select(drawing.id);
    engine.select(null);
    expect(engine.selectedId).toBeNull();
  });

  it('select with invalid id returns null', () => {
    const result = engine.select('nonexistent');
    expect(result).toBeNull();
  });

  it('getSelected returns currently selected drawing', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    engine.select(drawing.id);
    expect(engine.getSelected()).toBe(drawing);
  });

  it('getSelected returns null when nothing selected', () => {
    expect(engine.getSelected()).toBeNull();
  });

  it('deselect clears selectedId', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    engine.select(drawing.id);
    engine.deselect();
    expect(engine.selectedId).toBeNull();
    expect(engine.getSelected()).toBeNull();
  });

  // ── Remove / Clear ──────────────────────────────────────────────────

  it('remove deletes a drawing', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    expect(engine.remove(drawing.id)).toBe(true);
    expect(engine.get(drawing.id)).toBeUndefined();
  });

  it('remove returns false for nonexistent drawing', () => {
    expect(engine.remove('nonexistent')).toBe(false);
  });

  it('clear removes all drawings and resets state', () => {
    engine.startCreating('horizontal-line');
    engine.addPoint(p1);
    engine.startCreating('horizontal-line');
    engine.addPoint(p2);

    engine.startCreating('trend-line');
    engine.clear();
    expect(engine.getAll()).toHaveLength(0);
    expect(engine.state.mode).toBe('idle');
  });

  // ── Update options / points ─────────────────────────────────────────

  it('updateOptions merges partial options', () => {
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint(p1)!;
    engine.updateOptions(drawing.id, { color: '#FF0000', lineWidth: 3 });
    expect(drawing.options.color).toBe('#FF0000');
    expect(drawing.options.lineWidth).toBe(3);
    expect(drawing.options.lineStyle).toBe('solid'); // unchanged
  });

  it('updatePoints replaces drawing points', () => {
    engine.startCreating('trend-line');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2)!;
    engine.updatePoints(drawing.id, [p3, p1]);
    expect(drawing.points).toEqual([p3, p1]);
  });

  // ── Serialization ───────────────────────────────────────────────────

  it('serialize/deserialize roundtrip preserves all drawings', () => {
    engine.startCreating('horizontal-line');
    const d1 = engine.addPoint(p1)!;
    engine.startCreating('trend-line');
    engine.addPoint(p2);
    const d2 = engine.addPoint(p3)!;
    engine.toggleLock(d1.id);

    const serialized = engine.serialize();
    expect(serialized).toHaveLength(2);

    const engine2 = new DrawingEngine();
    engine2.deserialize(serialized);

    const all = Array.from(engine2.serialize());
    expect(all).toHaveLength(2);

    // Check structure preservation
    const restored1 = all.find((d: any) => d.id === d1.id) as any;
    expect(restored1).toBeDefined();
    expect(restored1.toolName).toBe('horizontal-line');
    expect(restored1.points).toEqual([p1]);
    expect(restored1.locked).toBe(true);
    expect(restored1.visible).toBe(true);

    const restored2 = all.find((d: any) => d.id === d2.id) as any;
    expect(restored2).toBeDefined();
    expect(restored2.toolName).toBe('trend-line');
    expect(restored2.points).toEqual([p2, p3]);
  });

  it('deserialize replaces existing drawings', () => {
    engine.startCreating('horizontal-line');
    engine.addPoint(p1);
    expect(engine.getAll()).toHaveLength(1);

    engine.deserialize([]);
    // getAll filters by visible, but even the map should be empty
    expect(engine.serialize()).toHaveLength(0);
  });

  // ── Hit Testing ─────────────────────────────────────────────────────

  it('hitTest returns null when no drawings', () => {
    const result = engine.hitTest(
      { x: 50, y: 50 },
      () => ({ x: 0, y: 0 }),
      10,
    );
    expect(result).toBeNull();
  });

  it('hitTest returns drawingId + handleIndex when near a handle', () => {
    engine.startCreating('trend-line');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2)!;

    // Mock pointToPixel so p1 maps to (10,10) and p2 maps to (100,100)
    const pointToPixel = (p: Point): PixelPoint => {
      if (p.price === p1.price && p.time === p1.time) return { x: 10, y: 10 };
      return { x: 100, y: 100 };
    };

    // Click near handle at (10, 10)
    const result = engine.hitTest({ x: 12, y: 12 }, pointToPixel, 10);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('handleIndex', 0);
    expect(result).toHaveProperty('drawingId', drawing.id);
  });

  it('hitTest checks handles before body (handle takes priority)', () => {
    const tool = mockTool('custom', 2);
    (tool.hitTest as ReturnType<typeof vi.fn>).mockReturnValue(true); // body always hit
    engine.registerTool(tool);

    engine.startCreating('custom');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2)!;

    const pointToPixel = (p: Point): PixelPoint => {
      if (p.price === p1.price) return { x: 10, y: 10 };
      return { x: 100, y: 100 };
    };

    const result = engine.hitTest({ x: 11, y: 11 }, pointToPixel, 5);
    // Should get handle result, not just body
    expect(result).toHaveProperty('handleIndex');
  });

  it('hitTest returns drawingId (no handleIndex) when on body but not handle', () => {
    const tool = mockTool('custom', 2);
    (tool.hitTest as ReturnType<typeof vi.fn>).mockReturnValue(true);
    engine.registerTool(tool);

    engine.startCreating('custom');
    engine.addPoint(p1);
    const drawing = engine.addPoint(p2)!;

    const pointToPixel = (p: Point): PixelPoint => {
      if (p.price === p1.price) return { x: 10, y: 10 };
      return { x: 100, y: 100 };
    };

    // Click far from both handles but tool.hitTest returns true
    const result = engine.hitTest({ x: 55, y: 55 }, pointToPixel, 5);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('drawingId', drawing.id);
    expect(result).not.toHaveProperty('handleIndex');
  });

  it('hitTest skips handles on locked drawings', () => {
    const tool = mockTool('custom', 1);
    (tool.hitTest as ReturnType<typeof vi.fn>).mockReturnValue(true);
    engine.registerTool(tool);

    engine.startCreating('custom');
    const drawing = engine.addPoint(p1)!;
    engine.toggleLock(drawing.id);

    const pointToPixel = () => ({ x: 10, y: 10 });
    const result = engine.hitTest({ x: 10, y: 10 }, pointToPixel, 10);
    // Should find the body but not the handle
    expect(result).toHaveProperty('drawingId');
    expect(result).not.toHaveProperty('handleIndex');
  });

  it('hitTest skips invisible drawings', () => {
    const tool = mockTool('custom', 1);
    (tool.hitTest as ReturnType<typeof vi.fn>).mockReturnValue(true);
    engine.registerTool(tool);

    engine.startCreating('custom');
    const drawing = engine.addPoint(p1)!;
    engine.toggleVisible(drawing.id);

    const pointToPixel = () => ({ x: 10, y: 10 });
    const result = engine.hitTest({ x: 10, y: 10 }, pointToPixel, 10);
    expect(result).toBeNull();
  });

  it('hitTest picks topmost (last added) drawing first', () => {
    const tool = mockTool('custom', 1);
    (tool.hitTest as ReturnType<typeof vi.fn>).mockReturnValue(true);
    engine.registerTool(tool);

    engine.startCreating('custom');
    const d1 = engine.addPoint(p1)!;
    engine.startCreating('custom');
    const d2 = engine.addPoint(p2)!;

    const pointToPixel = () => ({ x: 10, y: 10 });
    const result = engine.hitTest({ x: 10, y: 10 }, pointToPixel, 10);
    // d2 added last = topmost = checked first
    expect(result).toHaveProperty('drawingId', d2.id);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Pane Manager
// ═══════════════════════════════════════════════════════════════════════════

describe('PaneManager', () => {
  let pm: PaneManager;

  beforeEach(() => {
    pm = new PaneManager();
    pm.setHeight(1000);
  });

  it('creates with main pane at ratio 1', () => {
    const panes = pm.getAll();
    expect(panes).toHaveLength(1);
    expect(panes[0]!.type).toBe('main');
    expect(panes[0]!.heightRatio).toBe(1);
  });

  it('getMain returns the main pane', () => {
    const main = pm.getMain();
    expect(main.type).toBe('main');
    expect(main.id).toBe('main');
  });

  it('main pane gets full height when alone', () => {
    const main = pm.getMain();
    expect(main.height).toBe(1000);
    expect(main.yOffset).toBe(0);
  });

  it('addOscillatorPane creates a new indicator pane', () => {
    pm.addOscillatorPane('rsi');
    const panes = pm.getAll();
    expect(panes).toHaveLength(2);
    expect(panes[1]!.type).toBe('indicator');
    expect(panes[1]!.indicatorIds).toContain('rsi');
  });

  it('height ratios sum to 1 after adding pane', () => {
    pm.addOscillatorPane('rsi');
    const totalRatio = pm.getAll().reduce((s, p) => s + p.heightRatio, 0);
    expect(totalRatio).toBeCloseTo(1, 10);
  });

  it('adding multiple panes keeps ratios summing to 1', () => {
    pm.addOscillatorPane('rsi');
    pm.addOscillatorPane('macd');
    pm.addOscillatorPane('stochastic');
    const totalRatio = pm.getAll().reduce((s, p) => s + p.heightRatio, 0);
    expect(totalRatio).toBeCloseTo(1, 10);
  });

  it('main pane never drops below 30% ratio', () => {
    pm.addOscillatorPane('rsi');
    pm.addOscillatorPane('macd');
    pm.addOscillatorPane('stochastic');
    pm.addOscillatorPane('cci');
    pm.addOscillatorPane('adx');
    const main = pm.getMain();
    expect(main.heightRatio).toBeGreaterThanOrEqual(0.30);
  });

  it('adding same indicator twice returns existing pane id', () => {
    const id1 = pm.addOscillatorPane('rsi');
    const id2 = pm.addOscillatorPane('rsi');
    expect(id1).toBe(id2);
    expect(pm.getAll()).toHaveLength(2);
  });

  it('removePane removes the indicator pane', () => {
    pm.addOscillatorPane('rsi');
    expect(pm.getAll()).toHaveLength(2);
    pm.removePane('rsi');
    expect(pm.getAll()).toHaveLength(1);
  });

  it('removePane redistributes freed space', () => {
    pm.addOscillatorPane('rsi');
    pm.addOscillatorPane('macd');
    pm.removePane('rsi');
    const totalRatio = pm.getAll().reduce((s, p) => s + p.heightRatio, 0);
    expect(totalRatio).toBeCloseTo(1, 10);
  });

  it('removePane with unknown indicator is no-op', () => {
    pm.addOscillatorPane('rsi');
    pm.removePane('nonexistent');
    expect(pm.getAll()).toHaveLength(2);
  });

  it('getPaneForIndicator returns the correct pane', () => {
    pm.addOscillatorPane('rsi');
    const pane = pm.getPaneForIndicator('rsi');
    expect(pane).toBeDefined();
    expect(pane!.indicatorIds).toContain('rsi');
  });

  it('getPaneForIndicator returns undefined for unknown indicator', () => {
    expect(pm.getPaneForIndicator('unknown')).toBeUndefined();
  });

  it('setHeight recomputes pixel dimensions', () => {
    pm.addOscillatorPane('rsi');
    pm.setHeight(800);
    const panes = pm.getAll();
    const totalPixels = panes.reduce((s, p) => s + p.height, 0);
    expect(totalPixels).toBe(800);
  });

  it('getPaneAtY returns correct pane', () => {
    pm.addOscillatorPane('rsi');
    pm.setHeight(1000);
    const mainPane = pm.getMain();
    // Main pane starts at 0
    expect(pm.getPaneAtY(0)).toBe(mainPane);
    expect(pm.getPaneAtY(mainPane.height - 1)).toBe(mainPane);
    // Oscillator pane
    const oscPane = pm.getAll()[1]!;
    expect(pm.getPaneAtY(oscPane.yOffset + 1)).toBe(oscPane);
  });

  it('getPaneAtY returns undefined for out-of-range Y', () => {
    expect(pm.getPaneAtY(2000)).toBeUndefined();
    expect(pm.getPaneAtY(-1)).toBeUndefined();
  });

  it('getResizeHandle detects border between panes', () => {
    pm.addOscillatorPane('rsi');
    pm.setHeight(1000);
    const mainPane = pm.getMain();
    const borderY = mainPane.yOffset + mainPane.height;
    const handle = pm.getResizeHandle(borderY);
    expect(handle).not.toBeNull();
    expect(handle!.index).toBe(0);
  });

  it('getResizeHandle returns null when far from border', () => {
    pm.addOscillatorPane('rsi');
    pm.setHeight(1000);
    expect(pm.getResizeHandle(10)).toBeNull();
  });

  it('resizeAt adjusts height ratios of adjacent panes', () => {
    pm.addOscillatorPane('rsi');
    pm.setHeight(1000);
    const mainBefore = pm.getMain().heightRatio;
    const oscBefore = pm.getAll()[1]!.heightRatio;

    pm.resizeAt(0, 50); // drag down by 50px
    expect(pm.getMain().heightRatio).toBeGreaterThan(mainBefore);
    expect(pm.getAll()[1]!.heightRatio).toBeLessThan(oscBefore);
    // Still sums to 1
    const totalRatio = pm.getAll().reduce((s, p) => s + p.heightRatio, 0);
    expect(totalRatio).toBeCloseTo(1, 10);
  });

  it('resizeAt refuses to shrink pane below minimum', () => {
    pm.addOscillatorPane('rsi');
    pm.setHeight(1000);
    const oscBefore = pm.getAll()[1]!.heightRatio;

    // Try to drag way down (would make osc pane negative)
    pm.resizeAt(0, 900);
    // Should be unchanged since it violates minimum
    expect(pm.getAll()[1]!.heightRatio).toBe(oscBefore);
  });

  it('setScale updates a pane scale range', () => {
    const paneId = pm.addOscillatorPane('rsi');
    pm.setScale(paneId, 20, 80);
    const pane = pm.getPaneForIndicator('rsi')!;
    expect(pane.scaleMin).toBe(20);
    expect(pane.scaleMax).toBe(80);
  });

  it('setScale with unknown paneId is no-op', () => {
    expect(() => pm.setScale('nonexistent', 0, 100)).not.toThrow();
  });

  it('resizeAt with invalid index is no-op', () => {
    pm.addOscillatorPane('rsi');
    pm.setHeight(1000);
    const mainBefore = pm.getMain().heightRatio;
    // index -1 — upper doesn't exist
    pm.resizeAt(-1, 50);
    expect(pm.getMain().heightRatio).toBe(mainBefore);
    // index beyond bounds — lower doesn't exist
    pm.resizeAt(5, 50);
    expect(pm.getMain().heightRatio).toBe(mainBefore);
  });

  it('getResizeHandle returns null with single pane', () => {
    pm.setHeight(1000);
    expect(pm.getResizeHandle(500)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Order Line Manager
// ═══════════════════════════════════════════════════════════════════════════

describe('OrderLineManager', () => {
  let manager: OrderLineManager;

  const line1: OrderLine = {
    id: 'ol-1',
    price: 50000,
    type: 'limit',
    side: 'buy',
    label: 'BUY LIMIT 0.01',
    quantity: 0.01,
  };

  const line2: OrderLine = {
    id: 'ol-2',
    price: 52000,
    type: 'tp',
    side: 'buy',
    label: 'TP1 52000',
  };

  const line3: OrderLine = {
    id: 'ol-3',
    price: 48000,
    type: 'sl',
    side: 'buy',
    label: 'SL1 48000',
  };

  beforeEach(() => {
    manager = new OrderLineManager();
  });

  it('starts empty', () => {
    expect(manager.getAll()).toHaveLength(0);
  });

  it('add inserts an order line', () => {
    manager.add(line1);
    expect(manager.getAll()).toHaveLength(1);
    expect(manager.getAll()[0]).toBe(line1);
  });

  it('add multiple lines', () => {
    manager.add(line1);
    manager.add(line2);
    manager.add(line3);
    expect(manager.getAll()).toHaveLength(3);
  });

  it('remove deletes by id', () => {
    manager.add(line1);
    manager.add(line2);
    manager.remove('ol-1');
    expect(manager.getAll()).toHaveLength(1);
    expect(manager.getAll()[0]!.id).toBe('ol-2');
  });

  it('remove non-existent id is a no-op', () => {
    manager.add(line1);
    manager.remove('nonexistent');
    expect(manager.getAll()).toHaveLength(1);
  });

  it('update modifies fields on existing line', () => {
    manager.add(line1);
    manager.update('ol-1', { price: 49500, label: 'UPDATED' });
    const updated = manager.getAll()[0]!;
    expect(updated.price).toBe(49500);
    expect(updated.label).toBe('UPDATED');
    expect(updated.side).toBe('buy'); // unchanged
  });

  it('update on non-existent id is a no-op', () => {
    manager.update('nonexistent', { price: 99999 });
    expect(manager.getAll()).toHaveLength(0);
  });

  it('clear removes all lines', () => {
    manager.add(line1);
    manager.add(line2);
    manager.add(line3);
    manager.clear();
    expect(manager.getAll()).toHaveLength(0);
  });

  it('getAll returns all lines including ones with pnl', () => {
    const posLine: OrderLine = {
      id: 'pos-1',
      price: 50000,
      type: 'entry',
      side: 'buy',
      label: 'LONG avg 50000',
      quantity: 0.01,
      pnl: 25.50,
    };
    manager.add(posLine);
    expect(manager.getAll()[0]!.pnl).toBe(25.50);
  });

  it('add with same id overwrites previous', () => {
    manager.add(line1);
    const modified = { ...line1, price: 49000 };
    manager.add(modified);
    expect(manager.getAll()).toHaveLength(1);
    expect(manager.getAll()[0]!.price).toBe(49000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Trading Demo
// ═══════════════════════════════════════════════════════════════════════════

describe('TradingDemo', () => {
  let chart: ReturnType<typeof mockChart>;
  let trading: TradingDemo;
  let onUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    chart = mockChart();
    onUpdate = vi.fn();
    trading = new TradingDemo(chart as unknown as Chart, onUpdate);
  });

  // ── Market Orders & Positions ───────────────────────────────────────

  it('starts with empty orders, positions, and 10000 balance', () => {
    expect(trading.orders).toHaveLength(0);
    expect(trading.positions).toHaveLength(0);
    expect(trading.getBalance()).toBe(10000);
  });

  it('placeMarketOrder creates a long position for buy', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    expect(trading.positions).toHaveLength(1);
    expect(trading.positions[0]!.side).toBe('long');
    expect(trading.positions[0]!.avgEntry).toBe(50000);
    expect(trading.positions[0]!.totalQty).toBe(0.1);
  });

  it('placeMarketOrder creates a short position for sell', () => {
    trading.placeMarketOrder('sell', 50000, 0.1);
    expect(trading.positions).toHaveLength(1);
    expect(trading.positions[0]!.side).toBe('short');
  });

  it('placeMarketOrder calls addOrderLine on chart', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    expect(chart.addOrderLine).toHaveBeenCalled();
  });

  it('placeMarketOrder calls onUpdate', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('multiple market orders DCA into same position', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    trading.placeMarketOrder('buy', 48000, 0.1);
    expect(trading.positions).toHaveLength(1);
    // Avg entry = (50000*0.1 + 48000*0.1) / 0.2 = 49000
    expect(trading.positions[0]!.avgEntry).toBe(49000);
    expect(trading.positions[0]!.totalQty).toBeCloseTo(0.2);
  });

  // ── Limit Orders ───────────────────────────────────────────────────

  it('placeLimitOrder creates a pending order', () => {
    const order = trading.placeLimitOrder('buy', 48000, 0.05);
    expect(order.status).toBe('open');
    expect(order.type).toBe('limit');
    expect(order.side).toBe('buy');
    expect(order.price).toBe(48000);
    expect(order.quantity).toBe(0.05);
    expect(trading.orders).toHaveLength(1);
  });

  it('placeLimitOrder adds order line to chart', () => {
    trading.placeLimitOrder('buy', 48000, 0.05);
    expect(chart.addOrderLine).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'limit', price: 48000 }),
    );
  });

  it('onPriceTick fills buy limit order when price drops to order price', () => {
    trading.placeLimitOrder('buy', 48000, 0.05);
    trading.onPriceTick(48000); // price drops to limit
    expect(trading.orders[0]!.status).toBe('filled');
    expect(trading.positions).toHaveLength(1);
    expect(trading.positions[0]!.side).toBe('long');
    expect(trading.positions[0]!.avgEntry).toBe(48000);
  });

  it('onPriceTick fills sell limit order when price rises to order price', () => {
    trading.placeLimitOrder('sell', 52000, 0.05);
    trading.onPriceTick(52000);
    expect(trading.orders[0]!.status).toBe('filled');
    expect(trading.positions).toHaveLength(1);
    expect(trading.positions[0]!.side).toBe('short');
  });

  it('onPriceTick does not fill buy limit when price above order', () => {
    trading.placeLimitOrder('buy', 48000, 0.05);
    trading.onPriceTick(49000);
    expect(trading.orders[0]!.status).toBe('open');
    expect(trading.positions).toHaveLength(0);
  });

  it('cancelOrder cancels an open order', () => {
    const order = trading.placeLimitOrder('buy', 48000, 0.05);
    trading.cancelOrder(order.id);
    expect(order.status).toBe('cancelled');
    expect(chart.removeOrderLine).toHaveBeenCalledWith(order.id);
  });

  // ── TP/SL Levels ───────────────────────────────────────────────────

  it('addTP creates a take-profit level on position', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addTP(pos.id, 52000, 0.05);
    expect(pos.tpLevels).toHaveLength(1);
    expect(pos.tpLevels[0]!.price).toBe(52000);
    expect(pos.tpLevels[0]!.quantity).toBe(0.05);
    expect(pos.tpLevels[0]!.triggered).toBe(false);
  });

  it('addTP adds chart order line', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addTP(pos.id, 52000, 0.05);
    expect(chart.addOrderLine).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tp', price: 52000 }),
    );
  });

  it('addSL creates a stop-loss level on position', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addSL(pos.id, 48000, 0.05);
    expect(pos.slLevels).toHaveLength(1);
    expect(pos.slLevels[0]!.price).toBe(48000);
    expect(pos.slLevels[0]!.quantity).toBe(0.05);
  });

  it('onPriceTick triggers TP on long position (price >= TP)', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addTP(pos.id, 52000, 0.05);

    const balanceBefore = trading.getBalance();
    trading.onPriceTick(52000);

    expect(pos.tpLevels[0]!.triggered).toBe(true);
    // PnL for partial close: (52000 - 50000) * 0.05 = 100
    expect(trading.getBalance()).toBe(balanceBefore + 100);
    // Remaining qty: 0.1 - 0.05 = 0.05
    expect(pos.totalQty).toBeCloseTo(0.05);
  });

  it('onPriceTick triggers SL on long position (price <= SL)', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addSL(pos.id, 48000, 0.05);

    const balanceBefore = trading.getBalance();
    trading.onPriceTick(48000);

    expect(pos.slLevels[0]!.triggered).toBe(true);
    // PnL for partial close: (48000 - 50000) * 0.05 = -100
    expect(trading.getBalance()).toBe(balanceBefore - 100);
    expect(pos.totalQty).toBeCloseTo(0.05);
  });

  it('onPriceTick triggers TP on short position (price <= TP)', () => {
    trading.placeMarketOrder('sell', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addTP(pos.id, 48000, 0.05);

    const balanceBefore = trading.getBalance();
    trading.onPriceTick(48000);

    expect(pos.tpLevels[0]!.triggered).toBe(true);
    // PnL: (50000 - 48000) * 0.05 = 100
    expect(trading.getBalance()).toBe(balanceBefore + 100);
  });

  it('onPriceTick triggers SL on short position (price >= SL)', () => {
    trading.placeMarketOrder('sell', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addSL(pos.id, 52000, 0.05);

    const balanceBefore = trading.getBalance();
    trading.onPriceTick(52000);

    expect(pos.slLevels[0]!.triggered).toBe(true);
    // PnL: (50000 - 52000) * 0.05 = -100
    expect(trading.getBalance()).toBe(balanceBefore - 100);
  });

  it('TP that closes full position removes position', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addTP(pos.id, 52000, 0.1); // close full qty

    trading.onPriceTick(52000);
    expect(trading.positions).toHaveLength(0);
  });

  // ── PnL Calculation ────────────────────────────────────────────────

  it('long position PnL: price up = profit', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    trading.onPriceTick(51000);
    const pos = trading.positions[0]!;
    // (51000 - 50000) * 0.1 = 100
    expect(pos.pnl).toBe(100);
  });

  it('long position PnL: price down = loss', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    trading.onPriceTick(49000);
    const pos = trading.positions[0]!;
    // (49000 - 50000) * 0.1 = -100
    expect(pos.pnl).toBe(-100);
  });

  it('short position PnL: price down = profit', () => {
    trading.placeMarketOrder('sell', 50000, 0.1);
    trading.onPriceTick(49000);
    const pos = trading.positions[0]!;
    // (50000 - 49000) * 0.1 = 100
    expect(pos.pnl).toBe(100);
  });

  it('short position PnL: price up = loss', () => {
    trading.placeMarketOrder('sell', 50000, 0.1);
    trading.onPriceTick(51000);
    const pos = trading.positions[0]!;
    // (50000 - 51000) * 0.1 = -100
    expect(pos.pnl).toBe(-100);
  });

  it('onPriceTick updates PnL on chart order line', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.onPriceTick(51000);
    expect(chart.updateOrderLine).toHaveBeenCalledWith(pos.id, { pnl: 100 });
  });

  // ── Close Position ─────────────────────────────────────────────────

  it('closePosition adds PnL to balance (profit)', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    const balanceBefore = trading.getBalance();
    trading.closePosition(pos.id, 52000);
    // PnL: (52000 - 50000) * 0.1 = 200
    expect(trading.getBalance()).toBe(balanceBefore + 200);
    expect(trading.positions).toHaveLength(0);
  });

  it('closePosition adds PnL to balance (loss)', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    const balanceBefore = trading.getBalance();
    trading.closePosition(pos.id, 48000);
    // PnL: (48000 - 50000) * 0.1 = -200
    expect(trading.getBalance()).toBe(balanceBefore - 200);
  });

  it('closePosition short: profit when price drops', () => {
    trading.placeMarketOrder('sell', 50000, 0.1);
    const pos = trading.positions[0]!;
    const balanceBefore = trading.getBalance();
    trading.closePosition(pos.id, 48000);
    // PnL: (50000 - 48000) * 0.1 = 200
    expect(trading.getBalance()).toBe(balanceBefore + 200);
  });

  it('closePosition removes all chart lines', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addTP(pos.id, 52000, 0.05);
    trading.addSL(pos.id, 48000, 0.05);

    chart.removeOrderLine.mockClear();
    trading.closePosition(pos.id, 51000);
    // Should remove: position entry, individual entry dots, TP, SL
    expect(chart.removeOrderLine).toHaveBeenCalled();
  });

  it('closePosition calls onUpdate', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    onUpdate.mockClear();
    trading.closePosition(pos.id, 51000);
    expect(onUpdate).toHaveBeenCalled();
  });

  // ── Getters ────────────────────────────────────────────────────────

  it('getOpenOrders returns only open orders', () => {
    const o1 = trading.placeLimitOrder('buy', 48000, 0.05);
    const o2 = trading.placeLimitOrder('sell', 52000, 0.05);
    trading.cancelOrder(o1.id);
    expect(trading.getOpenOrders()).toHaveLength(1);
    expect(trading.getOpenOrders()[0]!.id).toBe(o2.id);
  });

  it('getPositions returns all positions', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    trading.placeMarketOrder('sell', 50000, 0.1);
    // Both long and short positions (hedge mode)
    expect(trading.getPositions()).toHaveLength(2);
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  it('addTP on nonexistent position is a no-op', () => {
    trading.addTP('nonexistent', 52000, 0.1);
    // Should not throw
  });

  it('addSL on nonexistent position is a no-op', () => {
    trading.addSL('nonexistent', 48000, 0.1);
    // Should not throw
  });

  it('TP defaults to full position qty when not specified', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addTP(pos.id, 52000);
    expect(pos.tpLevels[0]!.quantity).toBe(0.1);
  });

  it('already triggered TP is not re-triggered', () => {
    trading.placeMarketOrder('buy', 50000, 0.1);
    const pos = trading.positions[0]!;
    trading.addTP(pos.id, 52000, 0.03);

    trading.onPriceTick(52000); // trigger TP
    const balanceAfterTP = trading.getBalance();
    trading.onPriceTick(53000); // price goes higher
    // Balance unchanged by the already-triggered TP
    expect(trading.getBalance()).toBe(balanceAfterTP);
  });
});
