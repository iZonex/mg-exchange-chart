// ── WebGL Utilities ────────────────────────────────────────────────────────
// Shader compilation, program linking, color parsing.

/** Compile a GLSL shader. Throws on error. */
export function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? '';
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

/** Link vertex + fragment shaders into a program. Throws on error. */
export function linkProgram(gl: WebGL2RenderingContext, vert: WebGLShader, frag: WebGLShader): WebGLProgram {
  const prog = gl.createProgram();
  if (!prog) throw new Error('Failed to create program');
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) ?? '';
    gl.deleteProgram(prog);
    throw new Error(`Program link error: ${log}`);
  }
  return prog;
}

/** Create a shader program from source strings */
export function createProgram(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = linkProgram(gl, vert, frag);
  // Shaders are linked — can detach
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return prog;
}

// ── Color Parsing ──────────────────────────────────────────────────────────
// CSS color → [r, g, b, a] with values 0–1.
// Handles: #rgb, #rrggbb, #rrggbbaa, rgb(), rgba(), named colors.

const COLOR_CACHE = new Map<string, readonly [number, number, number, number]>();
let _scratchCanvas: CanvasRenderingContext2D | null = null;

function getScratchCtx(): CanvasRenderingContext2D {
  if (!_scratchCanvas) {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    _scratchCanvas = c.getContext('2d')!;
  }
  return _scratchCanvas;
}

export function parseColor(color: string): readonly [number, number, number, number] {
  const cached = COLOR_CACHE.get(color);
  if (cached) return cached;

  let r = 0, g = 0, b = 0, a = 1;

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0]! + hex[0]!, 16) / 255;
      g = parseInt(hex[1]! + hex[1]!, 16) / 255;
      b = parseInt(hex[2]! + hex[2]!, 16) / 255;
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16) / 255;
      g = parseInt(hex.slice(2, 4), 16) / 255;
      b = parseInt(hex.slice(4, 6), 16) / 255;
    } else if (hex.length === 8) {
      r = parseInt(hex.slice(0, 2), 16) / 255;
      g = parseInt(hex.slice(2, 4), 16) / 255;
      b = parseInt(hex.slice(4, 6), 16) / 255;
      a = parseInt(hex.slice(6, 8), 16) / 255;
    }
  } else if (color.startsWith('rgba(')) {
    const m = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
    if (m) {
      r = parseInt(m[1]!, 10) / 255;
      g = parseInt(m[2]!, 10) / 255;
      b = parseInt(m[3]!, 10) / 255;
      a = parseFloat(m[4]!);
    }
  } else if (color.startsWith('rgb(')) {
    const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (m) {
      r = parseInt(m[1]!, 10) / 255;
      g = parseInt(m[2]!, 10) / 255;
      b = parseInt(m[3]!, 10) / 255;
    }
  } else {
    // Named color or complex value — use Canvas 2D to resolve
    const ctx = getScratchCtx();
    ctx.fillStyle = '#000';
    ctx.fillStyle = color;
    const resolved = ctx.fillStyle as string;
    if (resolved !== color) {
      const result = parseColor(resolved);
      COLOR_CACHE.set(color, result);
      return result;
    }
  }

  const result = [r, g, b, a] as const;
  COLOR_CACHE.set(color, result);
  return result;
}

/** Grow a Float32Array by 2x, copying existing data */
export function growFloat32(arr: Float32Array, minCapacity: number): Float32Array {
  let newSize = arr.length;
  while (newSize < minCapacity) newSize *= 2;
  const next = new Float32Array(newSize);
  next.set(arr);
  return next;
}
