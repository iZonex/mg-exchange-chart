// ── WebGL Renderer Tests ─────────────────────────────────────────────────────
// Tests for WebGLBatchRenderer, CandleRenderer, and WebGLRenderContext.
// All WebGL APIs are mocked since Node has no GPU.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockGL() {
  const gl: Record<string, unknown> = {
    // Constants
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88E4,
    DYNAMIC_DRAW: 0x88E8,
    FLOAT: 0x1406,
    UNSIGNED_BYTE: 0x1401,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLES: 0x0004,
    BLEND: 0x0BE2,
    SCISSOR_TEST: 0x0C11,
    COLOR_BUFFER_BIT: 0x4000,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    TEXTURE_2D: 0x0DE1,
    TEXTURE0: 0x84C0,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812F,
    RGBA: 0x1908,

    // Canvas
    canvas: { width: 800, height: 600, style: {} as Record<string, string> },

    // Shader methods
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),

    // Program methods
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),

    // Uniform/attrib methods
    getUniformLocation: vi.fn(() => ({})),
    getAttribLocation: vi.fn(() => 0),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform1i: vi.fn(),
    uniform4fv: vi.fn(),

    // Buffer methods
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    deleteBuffer: vi.fn(),

    // VAO methods
    createVertexArray: vi.fn(() => ({})),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),

    // Vertex attrib methods
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),

    // Draw methods
    drawArrays: vi.fn(),
    drawArraysInstanced: vi.fn(),
    drawElements: vi.fn(),

    // State methods
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    viewport: vi.fn(),
    scissor: vi.fn(),
    clear: vi.fn(),
    clearColor: vi.fn(),

    // Texture methods
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    activeTexture: vi.fn(),
    deleteTexture: vi.fn(),
  };
  return gl;
}

function createMockCanvas(glContext: Record<string, unknown>) {
  return {
    getContext: vi.fn((type: string) => {
      if (type === 'webgl2') return glContext;
      if (type === '2d') return createMock2DCtx();
      return null;
    }),
    width: 800,
    height: 600,
    style: {} as Record<string, string>,
  };
}

function createMock2DCtx() {
  return {
    font: '',
    fillStyle: '',
    textBaseline: 'alphabetic' as string,
    textAlign: 'left' as string,
    measureText: vi.fn(() => ({ width: 50 })),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
  };
}

// ── WebGLBatchRenderer ───────────────────────────────────────────────────────

describe('WebGLBatchRenderer', () => {
  let gl: Record<string, unknown>;

  beforeEach(() => {
    gl = createMockGL();
    const mock2dCtx = createMock2DCtx();
    const mockCanvas = createMockCanvas(gl);

    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn((type: string) => {
          if (type === '2d') return mock2dCtx;
          if (type === 'webgl2') return gl;
          return null;
        }),
        style: {} as Record<string, string>,
      })),
    });

    // Stub for parseColor's named color fallback
    vi.stubGlobal('window', { devicePixelRatio: 1 });

    // Make canvas.getContext return gl
    (mockCanvas as Record<string, unknown>).getContext = vi.fn(() => gl);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('creates batch renderer from canvas', async () => {
    const canvas = {
      getContext: vi.fn(() => gl),
      width: 800,
      height: 600,
      style: {} as Record<string, string>,
    };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    expect(batch.gl).toBe(gl);
  });

  it('throws when WebGL2 is not available', async () => {
    const canvas = {
      getContext: vi.fn(() => null),
      style: {} as Record<string, string>,
    };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    expect(() => new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement)).toThrow('WebGL2 not supported');
  });

  it('pushRect adds data to buffer', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushRect(10, 20, 100, 50, '#ff0000', 1);
    // Should not throw; internal rectCount incremented
    expect(() => batch.flush()).not.toThrow();
  });

  it('pushRectRGBA adds data to buffer', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushRectRGBA(10, 20, 100, 50, 1, 0, 0, 1);
    expect(() => batch.flush()).not.toThrow();
  });

  it('pushLine adds data to buffer', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushLine(0, 0, 100, 100, 2, '#00ff00', 0.8);
    expect(() => batch.flush()).not.toThrow();
  });

  it('pushLineRGBA adds data to buffer', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushLineRGBA(0, 0, 100, 100, 2, 0, 1, 0, 0.8);
    expect(() => batch.flush()).not.toThrow();
  });

  it('pushText renders text and queues quad', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    const w = batch.pushText('Hello', 10, 20, '11px sans-serif', '#ffffff');
    expect(typeof w).toBe('number');
    expect(w).toBeGreaterThan(0);
  });

  it('pushText caches repeated text', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushText('Test', 10, 20, '11px sans-serif', '#ffffff');
    batch.pushText('Test', 30, 40, '11px sans-serif', '#ffffff');
    // Second call should use cache — no additional rasterization
    expect(() => batch.flush()).not.toThrow();
  });

  it('pushText handles center alignment', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushText('Center', 100, 50, '14px sans-serif', '#fff', 'center', 'middle');
    expect(() => batch.flush()).not.toThrow();
  });

  it('pushText handles right alignment', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushText('Right', 100, 50, '14px sans-serif', '#fff', 'right', 'top');
    expect(() => batch.flush()).not.toThrow();
  });

  it('pushText handles bottom baseline', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushText('Bottom', 100, 50, '14px sans-serif', '#fff', 'left', 'bottom');
    expect(() => batch.flush()).not.toThrow();
  });

  it('flush enables and disables blending', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushRect(0, 0, 10, 10, '#ff0000');
    batch.flush();
    expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
    expect(gl.disable).toHaveBeenCalledWith(gl.BLEND);
  });

  it('flushRects issues instanced draw call', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushRect(0, 0, 10, 10, '#ff0000');
    batch.flush();
    expect(gl.drawArraysInstanced).toHaveBeenCalled();
  });

  it('flushLines issues instanced draw call', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushLine(0, 0, 100, 100, 1, '#ff0000');
    batch.flush();
    expect(gl.drawArraysInstanced).toHaveBeenCalled();
  });

  it('flushText uploads atlas and draws', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.pushText('Flush', 10, 20, '11px sans-serif', '#fff');
    batch.flush();
    expect(gl.texImage2D).toHaveBeenCalled();
    expect(gl.drawArraysInstanced).toHaveBeenCalled();
  });

  it('flush with no data does not draw', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    (gl.drawArraysInstanced as ReturnType<typeof vi.fn>).mockClear();
    batch.flush();
    // drawArraysInstanced should not be called when no data
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('resize updates canvas and viewport', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.resize(1024, 768, 2);
    expect(gl.viewport).toHaveBeenCalled();
  });

  it('clear sets clear color and clears', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.clear(0.1, 0.2, 0.3, 1);
    expect(gl.clearColor).toHaveBeenCalledWith(0.1, 0.2, 0.3, 1);
    expect(gl.clear).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT);
  });

  it('clear with defaults', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.clear();
    expect(gl.clearColor).toHaveBeenCalledWith(0, 0, 0, 0);
  });

  it('setScissor enables scissor test', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.resize(800, 600, 1);
    batch.setScissor(10, 20, 100, 50);
    expect(gl.enable).toHaveBeenCalledWith(gl.SCISSOR_TEST);
    expect(gl.scissor).toHaveBeenCalled();
  });

  it('clearScissor disables scissor test', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.clearScissor();
    expect(gl.disable).toHaveBeenCalledWith(gl.SCISSOR_TEST);
  });

  it('measureText delegates to atlas context', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    const m = batch.measureText('Hello', '14px sans-serif');
    expect(m).toBeDefined();
    expect(typeof m.width).toBe('number');
  });

  it('destroy deletes all GL resources', async () => {
    const canvas = { getContext: vi.fn(() => gl), width: 800, height: 600, style: {} as Record<string, string> };
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const batch = new WebGLBatchRenderer(canvas as unknown as HTMLCanvasElement);
    batch.destroy();
    expect(gl.deleteProgram).toHaveBeenCalledTimes(3);
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(5);
    expect(gl.deleteVertexArray).toHaveBeenCalledTimes(3);
    expect(gl.deleteTexture).toHaveBeenCalledTimes(1);
  });
});

// ── CandleRenderer ──────────────────────────────────────────────────────────

describe('CandleRenderer', () => {
  let gl: Record<string, unknown>;

  beforeEach(() => {
    gl = createMockGL();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => createMock2DCtx()),
        style: {} as Record<string, string>,
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('constructs with GL context', async () => {
    const { CandleRenderer } = await import('../src/core/renderer/webgl/candle-renderer');
    const renderer = new CandleRenderer(gl as unknown as WebGL2RenderingContext);
    expect(renderer).toBeDefined();
  });

  it('renderCandles with empty bars does nothing', async () => {
    const { CandleRenderer } = await import('../src/core/renderer/webgl/candle-renderer');
    const renderer = new CandleRenderer(gl as unknown as WebGL2RenderingContext);
    (gl.drawArraysInstanced as ReturnType<typeof vi.fn>).mockClear();

    const theme = {
      name: 'dark',
      bullCandle: '#0ecb81',
      bearCandle: '#f6465d',
      bullCandleWick: '#0ecb81',
      bearCandleWick: '#f6465d',
      volumeBull: '#0ecb8133',
      volumeBear: '#f6465d33',
    };
    const timeScale = { barSpacing: 10, offsetX: 0, firstIndex: 0 };
    const priceScale = { min: 100, max: 200 };

    renderer.renderCandles([], 0, timeScale as never, priceScale as never, theme as never, 800, 600, 800, 600);
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('renderCandles draws visible bars', async () => {
    const { CandleRenderer } = await import('../src/core/renderer/webgl/candle-renderer');
    const renderer = new CandleRenderer(gl as unknown as WebGL2RenderingContext);

    const theme = {
      name: 'dark',
      bullCandle: '#0ecb81',
      bearCandle: '#f6465d',
      bullCandleWick: '#0ecb81',
      bearCandleWick: '#f6465d',
      volumeBull: '#0ecb8133',
      volumeBear: '#f6465d33',
    };
    const timeScale = { barSpacing: 10, offsetX: 0, firstIndex: 0 };
    const priceScale = { min: 100, max: 200 };
    const bars = [
      { time: 1000, open: 150, high: 160, low: 140, close: 155, volume: 1000 },
      { time: 2000, open: 155, high: 165, low: 145, close: 148, volume: 800 },
    ];

    renderer.renderCandles(bars, 0, timeScale as never, priceScale as never, theme as never, 800, 600, 800, 600);
    expect(gl.drawArraysInstanced).toHaveBeenCalled();
  });

  it('renderCandles skips off-screen bars', async () => {
    const { CandleRenderer } = await import('../src/core/renderer/webgl/candle-renderer');
    const renderer = new CandleRenderer(gl as unknown as WebGL2RenderingContext);

    const theme = {
      name: 'dark',
      bullCandle: '#0ecb81',
      bearCandle: '#f6465d',
      bullCandleWick: '#0ecb81',
      bearCandleWick: '#f6465d',
      volumeBull: '#0ecb8133',
      volumeBear: '#f6465d33',
    };
    // offsetX far negative so bars are off-screen to the left
    const timeScale = { barSpacing: 10, offsetX: -10000, firstIndex: 0 };
    const priceScale = { min: 100, max: 200 };
    const bars = [
      { time: 1000, open: 150, high: 160, low: 140, close: 155, volume: 1000 },
    ];

    (gl.drawArraysInstanced as ReturnType<typeof vi.fn>).mockClear();
    renderer.renderCandles(bars, 0, timeScale as never, priceScale as never, theme as never, 800, 600, 800, 600);
    // Bars are off-screen, count=0, no draw call
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('renderCandles caches theme colors', async () => {
    const { CandleRenderer } = await import('../src/core/renderer/webgl/candle-renderer');
    const renderer = new CandleRenderer(gl as unknown as WebGL2RenderingContext);

    const theme = {
      name: 'dark',
      bullCandle: '#0ecb81',
      bearCandle: '#f6465d',
      bullCandleWick: '#0ecb81',
      bearCandleWick: '#f6465d',
      volumeBull: '#0ecb8133',
      volumeBear: '#f6465d33',
    };
    const timeScale = { barSpacing: 10, offsetX: 0, firstIndex: 0 };
    const priceScale = { min: 100, max: 200 };
    const bars = [{ time: 1000, open: 150, high: 160, low: 140, close: 155, volume: 1000 }];

    renderer.renderCandles(bars, 0, timeScale as never, priceScale as never, theme as never, 800, 600, 800, 600);
    // Calling again with same theme name should skip parseColor
    renderer.renderCandles(bars, 0, timeScale as never, priceScale as never, theme as never, 800, 600, 800, 600);
    expect(gl.drawArraysInstanced).toHaveBeenCalled();
  });

  it('renderVolume with empty bars does nothing', async () => {
    const { CandleRenderer } = await import('../src/core/renderer/webgl/candle-renderer');
    const renderer = new CandleRenderer(gl as unknown as WebGL2RenderingContext);
    (gl.drawArraysInstanced as ReturnType<typeof vi.fn>).mockClear();

    const theme = {
      name: 'dark',
      bullCandle: '#0ecb81',
      bearCandle: '#f6465d',
      bullCandleWick: '#0ecb81',
      bearCandleWick: '#f6465d',
      volumeBull: '#0ecb8133',
      volumeBear: '#f6465d33',
    };
    const timeScale = { barSpacing: 10, offsetX: 0, firstIndex: 0 };

    renderer.renderVolume([], 0, 0, timeScale as never, theme as never, 800, 600, 800, 600);
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('renderVolume with zero maxVolume does nothing', async () => {
    const { CandleRenderer } = await import('../src/core/renderer/webgl/candle-renderer');
    const renderer = new CandleRenderer(gl as unknown as WebGL2RenderingContext);
    (gl.drawArraysInstanced as ReturnType<typeof vi.fn>).mockClear();

    const theme = {
      name: 'vol-dark',
      bullCandle: '#0ecb81',
      bearCandle: '#f6465d',
      bullCandleWick: '#0ecb81',
      bearCandleWick: '#f6465d',
      volumeBull: '#0ecb8133',
      volumeBear: '#f6465d33',
    };
    const timeScale = { barSpacing: 10, offsetX: 0, firstIndex: 0 };
    const bars = [{ time: 1000, open: 150, high: 160, low: 140, close: 155, volume: 1000 }];

    renderer.renderVolume(bars, 0, 0, timeScale as never, theme as never, 800, 600, 800, 600);
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('renderVolume draws visible volume bars', async () => {
    const { CandleRenderer } = await import('../src/core/renderer/webgl/candle-renderer');
    const renderer = new CandleRenderer(gl as unknown as WebGL2RenderingContext);

    const theme = {
      name: 'vol-dark2',
      bullCandle: '#0ecb81',
      bearCandle: '#f6465d',
      bullCandleWick: '#0ecb81',
      bearCandleWick: '#f6465d',
      volumeBull: '#0ecb8133',
      volumeBear: '#f6465d33',
    };
    const timeScale = { barSpacing: 10, offsetX: 0, firstIndex: 0 };
    const bars = [
      { time: 1000, open: 150, high: 160, low: 140, close: 155, volume: 1000 },
      { time: 2000, open: 155, high: 165, low: 145, close: 148, volume: 800 },
    ];

    renderer.renderVolume(bars, 0, 1500, timeScale as never, theme as never, 800, 600, 800, 600);
    expect(gl.drawArraysInstanced).toHaveBeenCalled();
  });

  it('renderVolume skips off-screen bars', async () => {
    const { CandleRenderer } = await import('../src/core/renderer/webgl/candle-renderer');
    const renderer = new CandleRenderer(gl as unknown as WebGL2RenderingContext);
    (gl.drawArraysInstanced as ReturnType<typeof vi.fn>).mockClear();

    const theme = {
      name: 'vol-dark3',
      bullCandle: '#0ecb81',
      bearCandle: '#f6465d',
      bullCandleWick: '#0ecb81',
      bearCandleWick: '#f6465d',
      volumeBull: '#0ecb8133',
      volumeBear: '#f6465d33',
    };
    const timeScale = { barSpacing: 10, offsetX: -10000, firstIndex: 0 };
    const bars = [{ time: 1000, open: 150, high: 160, low: 140, close: 155, volume: 1000 }];

    renderer.renderVolume(bars, 0, 1500, timeScale as never, theme as never, 800, 600, 800, 600);
    expect(gl.drawArraysInstanced).not.toHaveBeenCalled();
  });

  it('destroy deletes GL resources', async () => {
    const { CandleRenderer } = await import('../src/core/renderer/webgl/candle-renderer');
    const renderer = new CandleRenderer(gl as unknown as WebGL2RenderingContext);
    renderer.destroy();
    expect(gl.deleteProgram).toHaveBeenCalledTimes(2);
    expect(gl.deleteBuffer).toHaveBeenCalledTimes(2);
    expect(gl.deleteVertexArray).toHaveBeenCalledTimes(2);
  });
});

// ── WebGLRenderContext ──────────────────────────────────────────────────────

describe('WebGLRenderContext', () => {
  let mockBatch: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockBatch = {
      pushRect: vi.fn(),
      pushRectRGBA: vi.fn(),
      pushLine: vi.fn(),
      pushText: vi.fn(() => 50),
      measureText: vi.fn(() => ({ width: 42 })),
      flush: vi.fn(),
      setScissor: vi.fn(),
      clearScissor: vi.fn(),
      clear: vi.fn(),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        })),
        style: {} as Record<string, string>,
      })),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('constructs with batch renderer', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    expect(ctx).toBeDefined();
  });

  it('save and restore state', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.fillStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.save();
    ctx.fillStyle = '#00ff00';
    ctx.lineWidth = 5;
    ctx.restore();
    expect(ctx.fillStyle).toBe('#ff0000');
    expect(ctx.lineWidth).toBe(3);
  });

  it('restore with empty stack is a no-op', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    expect(() => ctx.restore()).not.toThrow();
  });

  it('restore clears scissor when clip was set but restored state has no clip', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.save();
    // Set clip via rect + clip
    ctx.beginPath();
    ctx.rect(10, 20, 100, 50);
    ctx.clip();
    ctx.save();
    ctx.restore(); // inner restore — still has clip from frame
    ctx.restore(); // outer restore — no clip in original frame
    expect(mockBatch.clearScissor).toHaveBeenCalled();
  });

  it('restore with clip restores scissor', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    // Set clip, then save, then restore
    ctx.beginPath();
    ctx.rect(10, 20, 100, 50);
    ctx.clip();
    ctx.save();
    ctx.restore();
    expect(mockBatch.setScissor).toHaveBeenCalled();
  });

  it('fillRect with string color', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(10, 20, 100, 50);
    expect(mockBatch.pushRect).toHaveBeenCalled();
  });

  it('fillRect with gradient falls back to gray', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.fillStyle = { addColorStop: vi.fn() } as unknown as CanvasGradient;
    ctx.fillRect(10, 20, 100, 50);
    expect(mockBatch.pushRect).toHaveBeenCalledWith(
      expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number),
      '#888888', expect.any(Number),
    );
  });

  it('strokeRect draws four lines', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.strokeRect(10, 20, 100, 50);
    expect(mockBatch.pushLine).toHaveBeenCalledTimes(4);
  });

  it('clearRect is a no-op', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    expect(() => ctx.clearRect(0, 0, 800, 600)).not.toThrow();
  });

  it('beginPath resets path and pending clip', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.moveTo(10, 20);
    ctx.beginPath();
    // After beginPath, stroke should not draw anything (empty path)
    ctx.stroke();
    expect(mockBatch.pushLine).not.toHaveBeenCalled();
  });

  it('moveTo and lineTo build path', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 100);
    ctx.stroke();
    expect(mockBatch.pushLine).toHaveBeenCalledTimes(1);
  });

  it('closePath adds line back to last moveTo', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.lineTo(100, 100);
    ctx.closePath();
    ctx.stroke();
    // 3 line segments: (0,0)->(100,0), (100,0)->(100,100), (100,100)->(0,0)
    expect(mockBatch.pushLine).toHaveBeenCalledTimes(3);
  });

  it('rect sets pending clip and adds path', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.rect(10, 20, 100, 50);
    ctx.clip();
    expect(mockBatch.flush).toHaveBeenCalled();
    expect(mockBatch.setScissor).toHaveBeenCalled();
  });

  it('clip without pending rect is a no-op', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.clip();
    expect(mockBatch.setScissor).not.toHaveBeenCalled();
  });

  it('arc approximates circle with line segments', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.arc(100, 100, 50, 0, Math.PI * 2);
    ctx.stroke();
    // Many line segments from the arc approximation
    expect(mockBatch.pushLine).toHaveBeenCalled();
  });

  it('quadraticCurveTo approximates curve', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(50, 100, 100, 0);
    ctx.stroke();
    expect(mockBatch.pushLine).toHaveBeenCalled();
  });

  it('quadraticCurveTo with no previous point does nothing', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.quadraticCurveTo(50, 100, 100, 0);
    // No moveTo before, so quadratic returns early
    ctx.stroke();
    expect(mockBatch.pushLine).not.toHaveBeenCalled();
  });

  it('bezierCurveTo approximates curve', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(20, 100, 80, 100, 100, 0);
    ctx.stroke();
    expect(mockBatch.pushLine).toHaveBeenCalled();
  });

  it('bezierCurveTo with no previous point does nothing', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.bezierCurveTo(20, 100, 80, 100, 100, 0);
    ctx.stroke();
    expect(mockBatch.pushLine).not.toHaveBeenCalled();
  });

  it('ellipse approximates with line segments', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.ellipse(100, 100, 80, 40, 0, 0, Math.PI * 2);
    ctx.stroke();
    expect(mockBatch.pushLine).toHaveBeenCalled();
  });

  it('fill with gradient uses fallback color', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.fillStyle = { addColorStop: vi.fn() } as unknown as CanvasGradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.lineTo(50, 100);
    ctx.fill();
    // Should use #888888 as fallback
    expect(mockBatch.pushRectRGBA).toHaveBeenCalled();
  });

  it('fill with fewer than 3 points does nothing', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.fill();
    expect(mockBatch.pushRectRGBA).not.toHaveBeenCalled();
  });

  it('fill with a convex polygon', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(200, 0);
    ctx.lineTo(200, 200);
    ctx.lineTo(0, 200);
    ctx.fill();
    expect(mockBatch.pushRectRGBA).toHaveBeenCalled();
  });

  it('fill skips tiny triangles', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0.1, 0);
    ctx.lineTo(0, 0.1);
    ctx.fill();
    // Triangle too small (<1px), should be skipped
    expect(mockBatch.pushRectRGBA).not.toHaveBeenCalled();
  });

  it('fill with multiple sub-paths', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.fillStyle = '#0000ff';
    ctx.beginPath();
    // First sub-path
    ctx.moveTo(0, 0);
    ctx.lineTo(100, 0);
    ctx.lineTo(100, 100);
    // Second sub-path
    ctx.moveTo(200, 0);
    ctx.lineTo(300, 0);
    ctx.lineTo(300, 100);
    ctx.fill();
    expect(mockBatch.pushRectRGBA).toHaveBeenCalled();
  });

  it('stroke with fewer than 2 points does nothing', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.stroke();
    expect(mockBatch.pushLine).not.toHaveBeenCalled();
  });

  it('stroke skips lineTo without previous moveTo', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.beginPath();
    // lineTo without moveTo
    ctx.lineTo(100, 100);
    ctx.lineTo(200, 200);
    ctx.stroke();
    // hasStart is false, so no lines drawn
    expect(mockBatch.pushLine).not.toHaveBeenCalled();
  });

  it('fillText delegates to batch', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.fillText('Hello', 10, 20);
    expect(mockBatch.pushText).toHaveBeenCalled();
  });

  it('strokeText is a no-op', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    expect(() => ctx.strokeText('Hello', 10, 20)).not.toThrow();
  });

  it('measureText delegates to batch', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    const m = ctx.measureText('Test');
    expect(m.width).toBe(42);
  });

  it('setTransform updates transform', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.setTransform(2, 0, 0, 2, 10, 20);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 50, 50);
    // Should apply transform: x = 0*2 + 10 = 10, y = 0*2 + 20 = 20, w = 50*2 = 100, h = 50*2 = 100
    expect(mockBatch.pushRect).toHaveBeenCalledWith(10, 20, 100, 100, '#ff0000', 1);
  });

  it('translate updates transform offset', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.translate(50, 30);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 10, 10);
    expect(mockBatch.pushRect).toHaveBeenCalledWith(50, 30, 10, 10, '#ff0000', 1);
  });

  it('scale updates transform scale', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.scale(2, 3);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(10, 10, 10, 10);
    expect(mockBatch.pushRect).toHaveBeenCalledWith(20, 30, 20, 30, '#ff0000', 1);
  });

  it('rotate is a no-op', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    expect(() => ctx.rotate(Math.PI)).not.toThrow();
  });

  it('setLineDash and getLineDash', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.setLineDash([5, 3]);
    expect(ctx.getLineDash()).toEqual([5, 3]);
    // Returns a copy
    const dash = ctx.getLineDash();
    dash.push(10);
    expect(ctx.getLineDash()).toEqual([5, 3]);
  });

  it('globalCompositeOperation getter/setter', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.globalCompositeOperation = 'destination-over';
    expect(ctx.globalCompositeOperation).toBe('destination-over');
  });

  it('createLinearGradient returns gradient from offscreen canvas', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    const grad = ctx.createLinearGradient(0, 0, 100, 100);
    expect(grad).toBeDefined();
  });

  it('drawImage is a no-op', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    expect(() => ctx.drawImage({} as CanvasImageSource, 0, 0)).not.toThrow();
  });

  it('flush delegates to batch', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.flush();
    expect(mockBatch.flush).toHaveBeenCalled();
  });

  it('save/restore preserves all state properties', async () => {
    const { WebGLRenderContext } = await import('../src/core/renderer/webgl/webgl-render-context');
    const ctx = new WebGLRenderContext(mockBatch as never);
    ctx.strokeStyle = '#aabbcc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.5;
    ctx.lineDashOffset = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.setLineDash([4, 2]);
    ctx.save();

    ctx.strokeStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 1;
    ctx.lineDashOffset = 0;
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'source-over';
    ctx.setLineDash([]);

    ctx.restore();
    expect(ctx.strokeStyle).toBe('#aabbcc');
    expect(ctx.textAlign).toBe('center');
    expect(ctx.textBaseline).toBe('middle');
    expect(ctx.globalAlpha).toBe(0.5);
    expect(ctx.lineDashOffset).toBe(3);
    expect(ctx.lineJoin).toBe('round');
    expect(ctx.lineCap).toBe('round');
    expect(ctx.globalCompositeOperation).toBe('lighter');
    expect(ctx.getLineDash()).toEqual([4, 2]);
  });
});
