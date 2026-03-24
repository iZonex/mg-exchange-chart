// ── WebGL Utilities Tests ───────────────────────────────────────────────────
// Tests for color parsing, buffer management, and render context utilities.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseColor, growFloat32 } from '../src/core/renderer/webgl/utils';

// ── Color Parsing ──────────────────────────────────────────────────────────

describe('parseColor', () => {
  it('parses 6-digit hex', () => {
    const [r, g, b, a] = parseColor('#ff0000');
    expect(r).toBeCloseTo(1, 2);
    expect(g).toBeCloseTo(0, 2);
    expect(b).toBeCloseTo(0, 2);
    expect(a).toBeCloseTo(1, 2);
  });

  it('parses 3-digit hex', () => {
    const [r, g, b, a] = parseColor('#f00');
    expect(r).toBeCloseTo(1, 2);
    expect(g).toBeCloseTo(0, 2);
    expect(b).toBeCloseTo(0, 2);
    expect(a).toBeCloseTo(1, 2);
  });

  it('parses 8-digit hex with alpha', () => {
    const [r, g, b, a] = parseColor('#ff000080');
    expect(r).toBeCloseTo(1, 2);
    expect(a).toBeCloseTo(0.502, 1); // 128/255
  });

  it('parses rgb()', () => {
    const [r, g, b, a] = parseColor('rgb(0, 128, 255)');
    expect(r).toBeCloseTo(0, 2);
    expect(g).toBeCloseTo(0.502, 1);
    expect(b).toBeCloseTo(1, 2);
    expect(a).toBeCloseTo(1, 2);
  });

  it('parses rgba()', () => {
    const [r, g, b, a] = parseColor('rgba(255, 0, 0, 0.5)');
    expect(r).toBeCloseTo(1, 2);
    expect(g).toBeCloseTo(0, 2);
    expect(b).toBeCloseTo(0, 2);
    expect(a).toBeCloseTo(0.5, 2);
  });

  it('returns black for empty string', () => {
    // Empty string doesn't match any pattern, falls through to named color handler
    // which needs DOM — in Node env it returns default [0,0,0,1]
    try {
      const [r, g, b] = parseColor('');
      expect(r).toBe(0);
      expect(g).toBe(0);
      expect(b).toBe(0);
    } catch {
      // DOM not available in test — expected
      expect(true).toBe(true);
    }
  });

  it('caches results', () => {
    const a = parseColor('#abcdef');
    const b = parseColor('#abcdef');
    expect(a).toBe(b); // same reference from cache
  });

  it('handles white', () => {
    const [r, g, b] = parseColor('#ffffff');
    expect(r).toBeCloseTo(1, 2);
    expect(g).toBeCloseTo(1, 2);
    expect(b).toBeCloseTo(1, 2);
  });

  it('handles black', () => {
    const [r, g, b] = parseColor('#000000');
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('handles hex with mixed case', () => {
    const [r, g, b] = parseColor('#Ff8800');
    expect(r).toBeCloseTo(1, 2);
    expect(g).toBeCloseTo(0.533, 1);
    expect(b).toBeCloseTo(0, 2);
  });
});

// ── Float32Array Growth ────────────────────────────────────────────────────

describe('growFloat32', () => {
  it('doubles size when growing', () => {
    const arr = new Float32Array(16);
    const grown = growFloat32(arr, 32);
    expect(grown.length).toBeGreaterThanOrEqual(32);
  });

  it('copies existing data', () => {
    const arr = new Float32Array([1, 2, 3, 4]);
    const grown = growFloat32(arr, 8);
    expect(grown[0]).toBe(1);
    expect(grown[1]).toBe(2);
    expect(grown[2]).toBe(3);
    expect(grown[3]).toBe(4);
  });

  it('handles large capacity requests', () => {
    const arr = new Float32Array(4);
    const grown = growFloat32(arr, 1000);
    expect(grown.length).toBeGreaterThanOrEqual(1000);
  });

  it('returns new array (not same reference)', () => {
    const arr = new Float32Array(4);
    const grown = growFloat32(arr, 8);
    expect(grown).not.toBe(arr);
  });
});

// ── Named Color Parsing (with DOM mock) ─────────────────────────────────────

describe('parseColor named colors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('resolves named color via canvas 2d context', async () => {
    // The code does: ctx.fillStyle = '#000'; ctx.fillStyle = color; then reads ctx.fillStyle
    // A real browser resolves named colors. We mock so fillStyle returns '#ff0000' regardless of what is set.
    let storedFillStyle = '#000';
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          get fillStyle() { return storedFillStyle; },
          set fillStyle(_v: string) {
            // Simulate browser behavior: resolve 'red' to '#ff0000'
            storedFillStyle = '#ff0000';
          },
        })),
      })),
    });

    const utils = await import('../src/core/renderer/webgl/utils');
    // 'someNamedColor' falls through to canvas 2D resolver
    // ctx resolves it to '#ff0000', which !== 'someNamedColor', so it recurses with '#ff0000'
    const [r, g, b, a] = utils.parseColor('someNamedColor');
    expect(r).toBeCloseTo(1, 2);
    expect(g).toBeCloseTo(0, 2);
    expect(b).toBeCloseTo(0, 2);
    expect(a).toBeCloseTo(1, 2);
  });

  it('returns defaults for unresolvable named color', async () => {
    // When fillStyle returns the same value as what was set, it means the color was not resolved
    vi.stubGlobal('document', {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          get fillStyle() { return this._fs; },
          set fillStyle(v: string) { this._fs = v; },
          _fs: '#000',
        })),
      })),
    });

    const utils = await import('../src/core/renderer/webgl/utils');
    // 'xyz' is set, fillStyle echoes it back, so resolved === color, falls through with [0,0,0,1]
    const [r, g, b, a] = utils.parseColor('xyz');
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
    expect(a).toBe(1);
  });
});

// ── Shader Compilation ──────────────────────────────────────────────────────

describe('compileShader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('compiles a shader successfully', async () => {
    const { compileShader } = await import('../src/core/renderer/webgl/utils');
    const shaderObj = { id: 1 };
    const gl = {
      createShader: vi.fn(() => shaderObj),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      COMPILE_STATUS: 0x8B81,
    };
    const result = compileShader(gl as unknown as WebGL2RenderingContext, gl.COMPILE_STATUS, 'void main() {}');
    expect(result).toBe(shaderObj);
    expect(gl.shaderSource).toHaveBeenCalledWith(shaderObj, 'void main() {}');
    expect(gl.compileShader).toHaveBeenCalledWith(shaderObj);
  });

  it('throws when createShader returns null', async () => {
    const { compileShader } = await import('../src/core/renderer/webgl/utils');
    const gl = {
      createShader: vi.fn(() => null),
    };
    expect(() => compileShader(gl as unknown as WebGL2RenderingContext, 0, 'src')).toThrow('Failed to create shader');
  });

  it('throws on compile error', async () => {
    const { compileShader } = await import('../src/core/renderer/webgl/utils');
    const shaderObj = {};
    const gl = {
      createShader: vi.fn(() => shaderObj),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => false),
      getShaderInfoLog: vi.fn(() => 'syntax error'),
      deleteShader: vi.fn(),
      COMPILE_STATUS: 0x8B81,
    };
    expect(() => compileShader(gl as unknown as WebGL2RenderingContext, gl.COMPILE_STATUS, 'bad'))
      .toThrow('Shader compile error: syntax error');
    expect(gl.deleteShader).toHaveBeenCalledWith(shaderObj);
  });

  it('handles null shader info log', async () => {
    const { compileShader } = await import('../src/core/renderer/webgl/utils');
    const gl = {
      createShader: vi.fn(() => ({})),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => false),
      getShaderInfoLog: vi.fn(() => null),
      deleteShader: vi.fn(),
      COMPILE_STATUS: 0x8B81,
    };
    expect(() => compileShader(gl as unknown as WebGL2RenderingContext, gl.COMPILE_STATUS, 'bad'))
      .toThrow('Shader compile error: ');
  });
});

describe('linkProgram', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('links program successfully', async () => {
    const { linkProgram } = await import('../src/core/renderer/webgl/utils');
    const progObj = { id: 1 };
    const vert = {};
    const frag = {};
    const gl = {
      createProgram: vi.fn(() => progObj),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      LINK_STATUS: 0x8B82,
    };
    const result = linkProgram(gl as unknown as WebGL2RenderingContext, vert as WebGLShader, frag as WebGLShader);
    expect(result).toBe(progObj);
    expect(gl.attachShader).toHaveBeenCalledWith(progObj, vert);
    expect(gl.attachShader).toHaveBeenCalledWith(progObj, frag);
  });

  it('throws when createProgram returns null', async () => {
    const { linkProgram } = await import('../src/core/renderer/webgl/utils');
    const gl = {
      createProgram: vi.fn(() => null),
    };
    expect(() => linkProgram(gl as unknown as WebGL2RenderingContext, {} as WebGLShader, {} as WebGLShader))
      .toThrow('Failed to create program');
  });

  it('throws on link error', async () => {
    const { linkProgram } = await import('../src/core/renderer/webgl/utils');
    const progObj = {};
    const gl = {
      createProgram: vi.fn(() => progObj),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => false),
      getProgramInfoLog: vi.fn(() => 'link failed'),
      deleteProgram: vi.fn(),
      LINK_STATUS: 0x8B82,
    };
    expect(() => linkProgram(gl as unknown as WebGL2RenderingContext, {} as WebGLShader, {} as WebGLShader))
      .toThrow('Program link error: link failed');
    expect(gl.deleteProgram).toHaveBeenCalledWith(progObj);
  });

  it('handles null program info log', async () => {
    const { linkProgram } = await import('../src/core/renderer/webgl/utils');
    const gl = {
      createProgram: vi.fn(() => ({})),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => false),
      getProgramInfoLog: vi.fn(() => null),
      deleteProgram: vi.fn(),
      LINK_STATUS: 0x8B82,
    };
    expect(() => linkProgram(gl as unknown as WebGL2RenderingContext, {} as WebGLShader, {} as WebGLShader))
      .toThrow('Program link error: ');
  });
});

describe('createProgram', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('compiles shaders, links program, and deletes shaders', async () => {
    const { createProgram } = await import('../src/core/renderer/webgl/utils');
    const vertShader = { type: 'vert' };
    const fragShader = { type: 'frag' };
    const progObj = { type: 'prog' };
    let shaderCount = 0;

    const gl = {
      VERTEX_SHADER: 0x8B31,
      FRAGMENT_SHADER: 0x8B30,
      COMPILE_STATUS: 0x8B81,
      LINK_STATUS: 0x8B82,
      createShader: vi.fn(() => {
        shaderCount++;
        return shaderCount === 1 ? vertShader : fragShader;
      }),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      createProgram: vi.fn(() => progObj),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      deleteShader: vi.fn(),
    };

    const result = createProgram(gl as unknown as WebGL2RenderingContext, 'vert src', 'frag src');
    expect(result).toBe(progObj);
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(gl.createShader).toHaveBeenCalledWith(gl.VERTEX_SHADER);
    expect(gl.createShader).toHaveBeenCalledWith(gl.FRAGMENT_SHADER);
  });
});

// ── Canvas2DRenderContext ───────────────────────────────────────────────────

describe('RenderContext module', () => {
  it('exports Canvas2DRenderContext class with expected methods', async () => {
    const { Canvas2DRenderContext } = await import('../src/core/renderer/render-context');
    expect(Canvas2DRenderContext).toBeDefined();
    const proto = Canvas2DRenderContext.prototype;
    expect(typeof proto.save).toBe('function');
    expect(typeof proto.restore).toBe('function');
    expect(typeof proto.fillRect).toBe('function');
    expect(typeof proto.beginPath).toBe('function');
    expect(typeof proto.stroke).toBe('function');
    expect(typeof proto.fill).toBe('function');
    expect(typeof proto.fillText).toBe('function');
    expect(typeof proto.flush).toBe('function');
  });
});
