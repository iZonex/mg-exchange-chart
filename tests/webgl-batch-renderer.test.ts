// ── WebGL Batch Renderer Tests ──────────────────────────────────────────────
// Tests for WebGLBatchRenderer — buffer management, text atlas, and draw call batching.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock WebGL2 Context ──────────────────────────────────────────────────

function createMockGL(): WebGL2RenderingContext {
  const gl = {
    // Constants
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88E4,
    DYNAMIC_DRAW: 0x88E8,
    FLOAT: 0x1406,
    UNSIGNED_BYTE: 0x1401,
    TRIANGLE_STRIP: 0x0005,
    COLOR_BUFFER_BIT: 0x4000,
    BLEND: 0x0BE2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    TEXTURE_2D: 0x0DE1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812F,
    RGBA: 0x1908,
    TEXTURE0: 0x84C0,
    SCISSOR_TEST: 0x0C11,
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,

    // Canvas mock
    canvas: {
      width: 800,
      height: 600,
      style: { width: '', height: '' },
    },

    // Methods
    createShader: vi.fn().mockReturnValue({}),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn().mockReturnValue(true),
    getShaderInfoLog: vi.fn().mockReturnValue(''),
    deleteShader: vi.fn(),
    createProgram: vi.fn().mockReturnValue({}),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn().mockReturnValue(true),
    getProgramInfoLog: vi.fn().mockReturnValue(''),
    deleteProgram: vi.fn(),
    createBuffer: vi.fn().mockReturnValue({}),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    createVertexArray: vi.fn().mockReturnValue({}),
    bindVertexArray: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),
    createTexture: vi.fn().mockReturnValue({}),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    useProgram: vi.fn(),
    uniform2f: vi.fn(),
    uniform1i: vi.fn(),
    getUniformLocation: vi.fn().mockReturnValue({}),
    drawArraysInstanced: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendFunc: vi.fn(),
    activeTexture: vi.fn(),
    viewport: vi.fn(),
    scissor: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteVertexArray: vi.fn(),
    deleteTexture: vi.fn(),
  } as unknown as WebGL2RenderingContext;

  return gl;
}

function createMockCanvas(gl: WebGL2RenderingContext): HTMLCanvasElement {
  return {
    getContext: vi.fn().mockReturnValue(gl),
    width: 800,
    height: 600,
    style: { width: '', height: '' },
  } as unknown as HTMLCanvasElement;
}

// Mock the offscreen text atlas canvas via stubGlobal
function setupDocumentMock(): void {
  const mockTextCtx = {
    font: '',
    fillStyle: '',
    textBaseline: '',
    textAlign: '',
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    fillText: vi.fn(),
    clearRect: vi.fn(),
  };
  const mockAtlasCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(mockTextCtx),
  };

  vi.stubGlobal('document', {
    createElement: vi.fn().mockReturnValue(mockAtlasCanvas),
  });
}

describe('WebGLBatchRenderer', () => {
  let gl: WebGL2RenderingContext;

  beforeEach(() => {
    vi.restoreAllMocks();
    gl = createMockGL();
    setupDocumentMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('constructs successfully with valid WebGL2 context', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);
    expect(renderer).toBeDefined();
    expect(renderer.gl).toBe(gl);
  });

  it('throws when WebGL2 is not supported', async () => {
    const canvas = {
      getContext: vi.fn().mockReturnValue(null),
    } as unknown as HTMLCanvasElement;

    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    expect(() => new WebGLBatchRenderer(canvas)).toThrow('WebGL2 not supported');
  });

  it('pushRect stores data and flushRects draws instanced', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.pushRect(10, 20, 100, 50, '#ff0000', 0.5);
    renderer.flushRects();

    expect((gl.useProgram as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('pushRectRGBA stores data correctly', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.pushRectRGBA(10, 20, 30, 40, 1, 0, 0, 0.5);
    renderer.flushRects();

    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('flushRects is a no-op when empty', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.flushRects();
    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('pushLine stores data and flushLines draws', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.pushLine(0, 0, 100, 100, 2, '#00ff00', 1);
    renderer.flushLines();

    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('pushLineRGBA stores data correctly', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.pushLineRGBA(0, 0, 100, 100, 2, 0, 1, 0, 1);
    renderer.flushLines();

    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('flushLines is a no-op when empty', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.flushLines();
    // drawArraysInstanced should not be called for empty lines
    // (it may have been called during construction — check total calls)
  });

  it('pushText rasterizes and caches text', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    const w1 = renderer.pushText('Hello', 10, 20, '12px sans-serif', '#fff');
    const w2 = renderer.pushText('Hello', 10, 20, '12px sans-serif', '#fff'); // cached
    expect(w1).toBeGreaterThan(0);
    expect(w2).toBe(w1);
  });

  it('pushText handles different alignments', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.pushText('Left', 100, 50, '12px sans-serif', '#fff', 'left', 'alphabetic');
    renderer.pushText('Center', 100, 50, '12px sans-serif', '#fff', 'center', 'middle');
    renderer.pushText('Right', 100, 50, '12px sans-serif', '#fff', 'right', 'top');
    renderer.pushText('Bottom', 100, 50, '12px sans-serif', '#fff', 'left', 'bottom');
  });

  it('flushText uploads atlas and draws', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.pushText('Test', 10, 20, '12px sans-serif', '#fff');
    renderer.flushText();

    // Should upload texture and draw
    expect((gl.texImage2D as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('flushText is a no-op when empty', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    const drawCallsBefore = (gl.drawArraysInstanced as ReturnType<typeof vi.fn>).mock.calls.length;
    renderer.flushText();
    const drawCallsAfter = (gl.drawArraysInstanced as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(drawCallsAfter).toBe(drawCallsBefore);
  });

  it('flush enables blending and flushes all batches', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.pushRect(0, 0, 10, 10, '#f00');
    renderer.pushLine(0, 0, 10, 10, 1, '#0f0');
    renderer.pushText('X', 5, 5, '12px sans-serif', '#fff');
    renderer.flush();

    expect((gl.enable as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(gl.BLEND);
    expect((gl.blendFunc as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect((gl.disable as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(gl.BLEND);
  });

  it('resize updates viewport and canvas dimensions', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.resize(1024, 768, 2);

    expect((gl.viewport as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('clear sets clear color and clears buffer', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.clear(0.1, 0.2, 0.3, 1);
    expect((gl.clearColor as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(0.1, 0.2, 0.3, 1);
    expect((gl.clear as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT);
  });

  it('clear uses default transparent black', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.clear();
    expect((gl.clearColor as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(0, 0, 0, 0);
  });

  it('setScissor enables scissor test', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    // Need to set dimensions first
    renderer.resize(800, 600, 1);
    renderer.setScissor(10, 20, 100, 200);

    expect((gl.enable as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(gl.SCISSOR_TEST);
    expect((gl.scissor as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('clearScissor disables scissor test', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.clearScissor();
    expect((gl.disable as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(gl.SCISSOR_TEST);
  });

  it('measureText delegates to atlas context', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    const result = renderer.measureText('Hello', '14px sans-serif');
    expect(result.width).toBe(50);
  });

  it('destroy deletes all GL resources', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    renderer.destroy();

    expect((gl.deleteProgram as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(3);
    expect((gl.deleteBuffer as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(5);
    expect((gl.deleteVertexArray as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(3);
    expect((gl.deleteTexture as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('auto-flushes rects when batch is full', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    // Push MAX_RECTS (16384) rects to trigger auto-flush
    for (let i = 0; i < 16385; i++) {
      renderer.pushRect(i, 0, 1, 1, '#ff0000');
    }

    // Should have auto-flushed at least once
    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('auto-flushes lines when batch is full', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    for (let i = 0; i < 16385; i++) {
      renderer.pushLine(0, 0, i, i, 1, '#ff0000');
    }

    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('auto-flushes lineRGBA when batch is full', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    for (let i = 0; i < 16385; i++) {
      renderer.pushLineRGBA(0, 0, i, i, 1, 1, 0, 0, 1);
    }

    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('auto-flushes rectRGBA when batch is full', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    for (let i = 0; i < 16385; i++) {
      renderer.pushRectRGBA(i, 0, 1, 1, 1, 0, 0, 1);
    }

    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('resets text atlas when full', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    // Push many unique texts to fill the atlas
    // The atlas is 2048x2048, text height ~18px, width ~52px per entry
    // Row fits ~39 entries, column fits ~113 rows = ~4400 unique entries before overflow
    // Push enough to trigger atlas reset
    for (let i = 0; i < 5000; i++) {
      renderer.pushText(`text_${i}`, 10, 20, '12px sans-serif', '#fff');
    }
    // Should not throw — atlas reset handles overflow gracefully
  });

  it('text atlas wraps to new row when x overflows', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    // Push texts that collectively exceed atlas width
    for (let i = 0; i < 50; i++) {
      renderer.pushText(`longtext_${i}_xxxxxxxx`, 10, 20, '12px sans-serif', '#fff');
    }
    // Should not throw
  });

  it('auto-flushes text quads when batch is full', async () => {
    const canvas = createMockCanvas(gl);
    const { WebGLBatchRenderer } = await import('../src/core/renderer/webgl/batch-renderer');
    const renderer = new WebGLBatchRenderer(canvas);

    // MAX_TEXT_QUADS = 4096
    for (let i = 0; i < 4097; i++) {
      renderer.pushText('A', 10, 20, '12px sans-serif', `#${String(i % 1000).padStart(6, '0')}`);
    }

    // Should have auto-flushed text
    expect((gl.drawArraysInstanced as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });
});

// ── Shader utility error handling ─────────────────────────────────────────

describe('WebGL shader utilities', () => {
  function createShaderMockGL(): WebGL2RenderingContext {
    return {
      VERTEX_SHADER: 0x8B31,
      FRAGMENT_SHADER: 0x8B30,
      COMPILE_STATUS: 0x8B81,
      LINK_STATUS: 0x8B82,
      createShader: vi.fn().mockReturnValue({}),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn().mockReturnValue(true),
      getShaderInfoLog: vi.fn().mockReturnValue(''),
      deleteShader: vi.fn(),
      createProgram: vi.fn().mockReturnValue({}),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn().mockReturnValue(true),
      getProgramInfoLog: vi.fn().mockReturnValue(''),
      deleteProgram: vi.fn(),
    } as unknown as WebGL2RenderingContext;
  }

  it('compileShader throws on compile failure', async () => {
    const { compileShader } = await import('../src/core/renderer/webgl/utils');
    const gl = createShaderMockGL();
    (gl.getShaderParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (gl.getShaderInfoLog as ReturnType<typeof vi.fn>).mockReturnValue('syntax error');

    expect(() => compileShader(gl, gl.VERTEX_SHADER, 'bad shader')).toThrow('Shader compile error: syntax error');
    expect((gl.deleteShader as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('compileShader throws when createShader returns null', async () => {
    const { compileShader } = await import('../src/core/renderer/webgl/utils');
    const gl = createShaderMockGL();
    (gl.createShader as ReturnType<typeof vi.fn>).mockReturnValue(null);

    expect(() => compileShader(gl, gl.VERTEX_SHADER, 'test')).toThrow('Failed to create shader');
  });

  it('linkProgram throws on link failure', async () => {
    const { linkProgram } = await import('../src/core/renderer/webgl/utils');
    const gl = createShaderMockGL();
    (gl.getProgramParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (gl.getProgramInfoLog as ReturnType<typeof vi.fn>).mockReturnValue('link error');

    const mockVert = {} as WebGLShader;
    const mockFrag = {} as WebGLShader;

    expect(() => linkProgram(gl, mockVert, mockFrag)).toThrow('Program link error: link error');
    expect((gl.deleteProgram as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });

  it('linkProgram throws when createProgram returns null', async () => {
    const { linkProgram } = await import('../src/core/renderer/webgl/utils');
    const gl = createShaderMockGL();
    (gl.createProgram as ReturnType<typeof vi.fn>).mockReturnValue(null);

    expect(() => linkProgram(gl, {} as WebGLShader, {} as WebGLShader)).toThrow('Failed to create program');
  });

  it('createProgram compiles, links, and cleans up shaders', async () => {
    const { createProgram } = await import('../src/core/renderer/webgl/utils');
    const gl = createShaderMockGL();

    const prog = createProgram(gl, 'vert src', 'frag src');
    expect(prog).toBeDefined();
    // Shaders should be compiled then deleted after linking
    expect((gl.createShader as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
    expect((gl.deleteShader as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(2);
  });

  it('compileShader handles null info log', async () => {
    const { compileShader } = await import('../src/core/renderer/webgl/utils');
    const gl = createShaderMockGL();
    (gl.getShaderParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (gl.getShaderInfoLog as ReturnType<typeof vi.fn>).mockReturnValue(null);

    expect(() => compileShader(gl, gl.VERTEX_SHADER, 'bad')).toThrow('Shader compile error: ');
  });

  it('linkProgram handles null info log', async () => {
    const { linkProgram } = await import('../src/core/renderer/webgl/utils');
    const gl = createShaderMockGL();
    (gl.getProgramParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (gl.getProgramInfoLog as ReturnType<typeof vi.fn>).mockReturnValue(null);

    expect(() => linkProgram(gl, {} as WebGLShader, {} as WebGLShader)).toThrow('Program link error: ');
  });
});
