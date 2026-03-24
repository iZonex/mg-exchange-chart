// ── Canvas Layer Tests ──────────────────────────────────────────────────────
// Tests for the LayerManager canvas layer system.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

// Mock CanvasRenderingContext2D class so instanceof checks pass
class MockCanvasRenderingContext2D {
  fillStyle = '#000';
  strokeStyle = '#000';
  lineWidth = 1;
  font = '11px sans-serif';
  textAlign = 'start';
  textBaseline = 'alphabetic';
  globalAlpha = 1;
  lineDashOffset = 0;
  lineJoin = 'miter';
  lineCap = 'butt';
  globalCompositeOperation = 'source-over';
  save = vi.fn();
  restore = vi.fn();
  fillRect = vi.fn();
  strokeRect = vi.fn();
  clearRect = vi.fn();
  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  closePath = vi.fn();
  rect = vi.fn();
  arc = vi.fn();
  quadraticCurveTo = vi.fn();
  bezierCurveTo = vi.fn();
  ellipse = vi.fn();
  fill = vi.fn();
  stroke = vi.fn();
  clip = vi.fn();
  fillText = vi.fn();
  strokeText = vi.fn();
  measureText = vi.fn(() => ({ width: 10 }));
  setTransform = vi.fn();
  translate = vi.fn();
  rotate = vi.fn();
  scale = vi.fn();
  setLineDash = vi.fn();
  getLineDash = vi.fn(() => [] as number[]);
  createLinearGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
  drawImage = vi.fn();
}

function createMock2DCtx() {
  return new MockCanvasRenderingContext2D();
}

describe('LayerManager', () => {
  let appendedChildren: unknown[];
  let createdCanvases: Array<Record<string, unknown>>;

  beforeEach(() => {
    appendedChildren = [];
    createdCanvases = [];

    // Stub CanvasRenderingContext2D so instanceof checks pass with our mock
    vi.stubGlobal('CanvasRenderingContext2D', MockCanvasRenderingContext2D);
    vi.stubGlobal('window', { devicePixelRatio: 2 });
    vi.stubGlobal('document', {
      createElement: vi.fn(() => {
        const ctx2d = createMock2DCtx();
        const canvas: Record<string, unknown> = {
          width: 0,
          height: 0,
          style: {} as Record<string, string>,
          getContext: vi.fn((type: string) => {
            if (type === '2d') return ctx2d;
            return null;
          }),
          remove: vi.fn(),
        };
        createdCanvases.push(canvas);
        return canvas;
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  function createContainer() {
    return {
      appendChild: vi.fn((child: unknown) => { appendedChildren.push(child); }),
      getBoundingClientRect: vi.fn(() => ({ width: 800, height: 600 })),
    } as unknown as HTMLElement;
  }

  it('creates 4 canvas layers', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);
    expect(container.appendChild).toHaveBeenCalledTimes(4);
    expect(mgr).toBeDefined();
  });

  it('get returns correct layers', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);

    const bg = mgr.get('background');
    expect(bg.name).toBe('background');
    const series = mgr.get('series');
    expect(series.name).toBe('series');
    const crosshair = mgr.get('crosshair');
    expect(crosshair.name).toBe('crosshair');
    const ui = mgr.get('ui');
    expect(ui.name).toBe('ui');
  });

  it('get throws for unknown layer', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);
    expect(() => mgr.get('nonexistent' as never)).toThrow('Unknown layer');
  });

  it('width and height reflect container', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);
    expect(mgr.width).toBe(800);
    expect(mgr.height).toBe(600);
    expect(mgr.logicalWidth).toBe(800);
    expect(mgr.logicalHeight).toBe(600);
  });

  it('dpr from window.devicePixelRatio', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);
    expect(mgr.dpr).toBe(2);
  });

  it('backend defaults to canvas2d', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);
    expect(mgr.backend).toBe('canvas2d');
  });

  it('batchRenderer is null for canvas2d backend', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);
    expect(mgr.batchRenderer).toBeNull();
  });

  it('candleRenderer is null for canvas2d backend', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);
    expect(mgr.candleRenderer).toBeNull();
  });

  it('markDirty sets layer dirty', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);

    const bg = mgr.get('background');
    bg.dirty = false;
    mgr.markDirty('background');
    expect(bg.dirty).toBe(true);
  });

  it('markAllDirty sets all layers dirty', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);

    mgr.get('background').dirty = false;
    mgr.get('series').dirty = false;
    mgr.get('crosshair').dirty = false;
    mgr.get('ui').dirty = false;

    mgr.markAllDirty();

    expect(mgr.get('background').dirty).toBe(true);
    expect(mgr.get('series').dirty).toBe(true);
    expect(mgr.get('crosshair').dirty).toBe(true);
    expect(mgr.get('ui').dirty).toBe(true);
  });

  it('clear calls clearRect on 2D layers', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);

    mgr.clear('background');
    const layer = mgr.get('background');
    expect(layer.ctx.clearRect).toHaveBeenCalled();
  });

  it('resize updates dimensions and marks dirty', async () => {
    const container = {
      appendChild: vi.fn(),
      getBoundingClientRect: vi.fn()
        .mockReturnValueOnce({ width: 800, height: 600 }) // constructor
        .mockReturnValueOnce({ width: 1024, height: 768 }), // resize
    } as unknown as HTMLElement;
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);

    // Reset dirty
    mgr.get('background').dirty = false;
    mgr.resize();

    expect(mgr.width).toBe(1024);
    expect(mgr.height).toBe(768);
    expect(mgr.get('background').dirty).toBe(true);
  });

  it('renderDirty calls renderFn for dirty layers only', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);

    // Mark only background and ui as dirty
    mgr.get('series').dirty = false;
    mgr.get('crosshair').dirty = false;

    const renderFn = vi.fn();
    mgr.renderDirty(renderFn);

    // Should have been called for background and ui
    expect(renderFn).toHaveBeenCalledTimes(2);
    const calledNames = renderFn.mock.calls.map((c: unknown[]) => (c[0] as { name: string }).name);
    expect(calledNames).toContain('background');
    expect(calledNames).toContain('ui');
  });

  it('renderDirty clears dirty flag after render', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);

    mgr.renderDirty(() => {});

    expect(mgr.get('background').dirty).toBe(false);
    expect(mgr.get('series').dirty).toBe(false);
  });

  it('destroy removes canvases from DOM', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    const mgr = new LayerManager(container);

    mgr.destroy();

    for (const canvas of createdCanvases) {
      expect(canvas.remove).toHaveBeenCalled();
    }
  });

  it('throws if 2d context fails', async () => {
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        style: {} as Record<string, string>,
        getContext: vi.fn(() => null),
        remove: vi.fn(),
      })),
    });

    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    expect(() => new LayerManager(container)).toThrow('Failed to get 2d context');
  });

  it('canvas layers have correct pointer events', async () => {
    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    new LayerManager(container);

    // Only the last canvas (ui) should have pointer-events: auto
    // Others should be 'none'
    const uiCanvas = createdCanvases[3] as Record<string, Record<string, string>>;
    expect(uiCanvas.style.pointerEvents).toBe('auto');
    for (let i = 0; i < 3; i++) {
      const canvas = createdCanvases[i] as Record<string, Record<string, string>>;
      expect(canvas.style.pointerEvents).toBe('none');
    }
  });

  it('webgl backend falls back to canvas2d if WebGL2 not available', async () => {
    vi.resetModules();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => {
        const ctx2d = createMock2DCtx();
        const canvas: Record<string, unknown> = {
          width: 0,
          height: 0,
          style: {} as Record<string, string>,
          getContext: vi.fn((type: string) => {
            if (type === '2d') return ctx2d;
            // WebGL2 not available
            return null;
          }),
          remove: vi.fn(),
        };
        createdCanvases.push(canvas);
        return canvas;
      }),
    });

    const container = createContainer();
    const { LayerManager } = await import('../src/core/renderer/canvas-layer');
    // Request webgl but it should fall back since getContext('webgl2') returns null
    // The WebGLBatchRenderer constructor will throw, caught by try/catch
    const mgr = new LayerManager(container, 'webgl');
    expect(mgr.backend).toBe('canvas2d');
    expect(mgr.batchRenderer).toBeNull();
  });
});
