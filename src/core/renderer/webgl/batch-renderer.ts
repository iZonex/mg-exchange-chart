// ── WebGL Batch Renderer ───────────────────────────────────────────────────
// Collects draw primitives (rects, lines, text) into typed-array batches,
// then flushes them in minimal draw calls using instanced rendering.
//
// Rect:  instanced quads — 1 draw call per flush regardless of rect count.
// Line:  instanced segments — expanded to screen-space quads in vertex shader.
// Text:  rendered to an offscreen Canvas 2D atlas, blitted as textured quads.

import { RECT_VERT, RECT_FRAG, LINE_VERT, LINE_FRAG, TEXT_VERT, TEXT_FRAG } from './shaders';
import { createProgram, parseColor } from './utils';

// Max instances per batch before auto-flush
const MAX_RECTS = 16384;
const MAX_LINES = 16384;
const MAX_TEXT_QUADS = 4096;

// Floats per instance
const RECT_FLOATS = 8;    // x,y,w,h, r,g,b,a
const LINE_FLOATS = 9;    // x0,y0, x1,y1, width, r,g,b,a

// ── Text Atlas ─────────────────────────────────────────────────────────────
const TEXT_ATLAS_SIZE = 2048;

interface TextEntry {
  u0: number; v0: number;
  u1: number; v1: number;
  w: number; h: number;
}

export class WebGLBatchRenderer {
  readonly gl: WebGL2RenderingContext;

  // Programs
  private rectProg!: WebGLProgram;
  private lineProg!: WebGLProgram;
  private textProg!: WebGLProgram;

  // Unit quad VBO (shared by rect + text)
  private quadVBO!: WebGLBuffer;

  // Rect batch
  private rectVAO!: WebGLVertexArrayObject;
  private rectInstanceBuf!: WebGLBuffer;
  private rectData = new Float32Array(MAX_RECTS * RECT_FLOATS);
  private rectCount = 0;

  // Line batch
  private lineVAO!: WebGLVertexArrayObject;
  private lineInstanceBuf!: WebGLBuffer;
  private lineVertexBuf!: WebGLBuffer;
  private lineData = new Float32Array(MAX_LINES * LINE_FLOATS);
  private lineCount = 0;

  // Text batch
  private textVAO!: WebGLVertexArrayObject;
  private textInstanceBuf!: WebGLBuffer;
  private textData = new Float32Array(MAX_TEXT_QUADS * 8); // rect(4) + uv(4)
  private textCount = 0;
  private textAtlasCanvas: HTMLCanvasElement;
  private textAtlasCtx: CanvasRenderingContext2D;
  private textTexture!: WebGLTexture;
  private textCacheMap = new Map<string, TextEntry>();
  private textAtlasCursorX = 0;
  private textAtlasCursorY = 0;
  private textAtlasRowHeight = 0;
  private textAtlasDirty = false;

  // Viewport
  private _width = 0;
  private _height = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;

    // Text atlas offscreen canvas
    this.textAtlasCanvas = document.createElement('canvas');
    this.textAtlasCanvas.width = TEXT_ATLAS_SIZE;
    this.textAtlasCanvas.height = TEXT_ATLAS_SIZE;
    this.textAtlasCtx = this.textAtlasCanvas.getContext('2d')!;

    this.initShaders();
    this.initBuffers();
    this.initTextTexture();
  }

  // ── Setup ────────────────────────────────────────────────────────────────

  private initShaders(): void {
    const gl = this.gl;
    this.rectProg = createProgram(gl, RECT_VERT, RECT_FRAG);
    this.lineProg = createProgram(gl, LINE_VERT, LINE_FRAG);
    this.textProg = createProgram(gl, TEXT_VERT, TEXT_FRAG);
  }

  private initBuffers(): void {
    const gl = this.gl;

    // Unit quad: two triangles covering [0,0]→[1,1]
    const quadVerts = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
    this.quadVBO = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    // ── Rect VAO ───────────────────────────────────────────────────────────
    this.rectVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.rectVAO);

    // loc 0: unit quad position (per vertex)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // loc 1-2: instance data
    this.rectInstanceBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rectInstanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.rectData.byteLength, gl.DYNAMIC_DRAW);

    // a_rect (loc 1): x, y, w, h
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, RECT_FLOATS * 4, 0);
    gl.vertexAttribDivisor(1, 1);

    // a_color (loc 2): r, g, b, a
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, RECT_FLOATS * 4, 16);
    gl.vertexAttribDivisor(2, 1);

    gl.bindVertexArray(null);

    // ── Line VAO ───────────────────────────────────────────────────────────
    this.lineVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.lineVAO);

    // Vertex index buffer: [0,1,2,3] per quad, instanced
    this.lineVertexBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineVertexBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 2, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(4); // a_vertex
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, 0, 0);

    // Instance data
    this.lineInstanceBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineInstanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.lineData.byteLength, gl.DYNAMIC_DRAW);

    const stride = LINE_FLOATS * 4;
    // a_p0 (loc 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(0, 1);
    // a_p1 (loc 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(1, 1);
    // a_width (loc 2)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(2, 1);
    // a_color (loc 3)
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, 20);
    gl.vertexAttribDivisor(3, 1);

    gl.bindVertexArray(null);

    // ── Text VAO ───────────────────────────────────────────────────────────
    this.textVAO = gl.createVertexArray()!;
    gl.bindVertexArray(this.textVAO);

    // loc 0: unit quad
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Instance data: rect + uv
    this.textInstanceBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textInstanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.textData.byteLength, gl.DYNAMIC_DRAW);

    // a_rect (loc 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribDivisor(1, 1);
    // a_uv (loc 2)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16);
    gl.vertexAttribDivisor(2, 1);

    gl.bindVertexArray(null);
  }

  private initTextTexture(): void {
    const gl = this.gl;
    this.textTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.textTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXT_ATLAS_SIZE, TEXT_ATLAS_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  // ── Viewport ─────────────────────────────────────────────────────────────

  resize(width: number, height: number, dpr: number): void {
    this._width = width;
    this._height = height;
    const gl = this.gl;
    gl.canvas.width = Math.round(width * dpr);
    gl.canvas.height = Math.round(height * dpr);
    (gl.canvas as HTMLCanvasElement).style.width = `${width}px`;
    (gl.canvas as HTMLCanvasElement).style.height = `${height}px`;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  // ── Clear ────────────────────────────────────────────────────────────────

  clear(r = 0, g = 0, b = 0, a = 0): void {
    const gl = this.gl;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  // ── Rect Batching ────────────────────────────────────────────────────────

  pushRect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    if (this.rectCount >= MAX_RECTS) this.flushRects();
    const [r, g, b, a] = parseColor(color);
    const off = this.rectCount * RECT_FLOATS;
    this.rectData[off] = x;
    this.rectData[off + 1] = y;
    this.rectData[off + 2] = w;
    this.rectData[off + 3] = h;
    this.rectData[off + 4] = r;
    this.rectData[off + 5] = g;
    this.rectData[off + 6] = b;
    this.rectData[off + 7] = a * alpha;
    this.rectCount++;
  }

  pushRectRGBA(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void {
    if (this.rectCount >= MAX_RECTS) this.flushRects();
    const off = this.rectCount * RECT_FLOATS;
    this.rectData[off] = x;
    this.rectData[off + 1] = y;
    this.rectData[off + 2] = w;
    this.rectData[off + 3] = h;
    this.rectData[off + 4] = r;
    this.rectData[off + 5] = g;
    this.rectData[off + 6] = b;
    this.rectData[off + 7] = a;
    this.rectCount++;
  }

  flushRects(): void {
    if (this.rectCount === 0) return;
    const gl = this.gl;

    gl.useProgram(this.rectProg);
    gl.uniform2f(gl.getUniformLocation(this.rectProg, 'u_resolution'), this._width, this._height);

    gl.bindVertexArray(this.rectVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rectInstanceBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.rectData.subarray(0, this.rectCount * RECT_FLOATS));

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.rectCount);

    gl.bindVertexArray(null);
    this.rectCount = 0;
  }

  // ── Line Batching ────────────────────────────────────────────────────────

  pushLine(x0: number, y0: number, x1: number, y1: number, width: number, color: string, alpha = 1): void {
    if (this.lineCount >= MAX_LINES) this.flushLines();
    const [r, g, b, a] = parseColor(color);
    const off = this.lineCount * LINE_FLOATS;
    this.lineData[off] = x0;
    this.lineData[off + 1] = y0;
    this.lineData[off + 2] = x1;
    this.lineData[off + 3] = y1;
    this.lineData[off + 4] = width;
    this.lineData[off + 5] = r;
    this.lineData[off + 6] = g;
    this.lineData[off + 7] = b;
    this.lineData[off + 8] = a * alpha;
    this.lineCount++;
  }

  /** Push a line segment with pre-parsed RGBA (avoids color string parsing per call) */
  pushLineRGBA(x0: number, y0: number, x1: number, y1: number, width: number, r: number, g: number, b: number, a: number): void {
    if (this.lineCount >= MAX_LINES) this.flushLines();
    const off = this.lineCount * LINE_FLOATS;
    this.lineData[off] = x0;
    this.lineData[off + 1] = y0;
    this.lineData[off + 2] = x1;
    this.lineData[off + 3] = y1;
    this.lineData[off + 4] = width;
    this.lineData[off + 5] = r;
    this.lineData[off + 6] = g;
    this.lineData[off + 7] = b;
    this.lineData[off + 8] = a;
    this.lineCount++;
  }

  flushLines(): void {
    if (this.lineCount === 0) return;
    const gl = this.gl;

    gl.useProgram(this.lineProg);
    gl.uniform2f(gl.getUniformLocation(this.lineProg, 'u_resolution'), this._width, this._height);

    gl.bindVertexArray(this.lineVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineInstanceBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.lineData.subarray(0, this.lineCount * LINE_FLOATS));

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.lineCount);

    gl.bindVertexArray(null);
    this.lineCount = 0;
  }

  // ── Text Batching ────────────────────────────────────────────────────────

  /**
   * Render text to the atlas (if not cached) and queue a textured quad.
   * Returns the measured width.
   */
  pushText(
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
    align: CanvasTextAlign = 'left',
    baseline: CanvasTextBaseline = 'alphabetic',
  ): number {
    const key = `${font}|${color}|${text}`;
    let entry = this.textCacheMap.get(key);

    if (!entry) {
      entry = this.rasterizeText(text, font, color);
      this.textCacheMap.set(key, entry);
    }

    // Adjust position based on alignment
    let dx = x;
    if (align === 'center') dx -= entry.w / 2;
    else if (align === 'right') dx -= entry.w;

    let dy = y;
    if (baseline === 'middle') dy -= entry.h / 2;
    else if (baseline === 'top') dy -= 0;
    else if (baseline === 'bottom') dy -= entry.h;
    else /* alphabetic */ dy -= entry.h * 0.8; // rough baseline estimate

    if (this.textCount >= MAX_TEXT_QUADS) this.flushText();

    const off = this.textCount * 8;
    // Screen rect
    this.textData[off] = dx;
    this.textData[off + 1] = dy;
    this.textData[off + 2] = entry.w;
    this.textData[off + 3] = entry.h;
    // UV rect
    this.textData[off + 4] = entry.u0;
    this.textData[off + 5] = entry.v0;
    this.textData[off + 6] = entry.u1;
    this.textData[off + 7] = entry.v1;
    this.textCount++;

    return entry.w;
  }

  private rasterizeText(text: string, font: string, color: string): TextEntry {
    const ctx = this.textAtlasCtx;
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const w = Math.ceil(metrics.width) + 2; // +2px padding
    const h = Math.ceil(parseFloat(font) * 1.4) + 2; // rough line height

    // Check if we need a new row
    if (this.textAtlasCursorX + w > TEXT_ATLAS_SIZE) {
      this.textAtlasCursorX = 0;
      this.textAtlasCursorY += this.textAtlasRowHeight + 1;
      this.textAtlasRowHeight = 0;
    }

    // If atlas is full, reset it
    if (this.textAtlasCursorY + h > TEXT_ATLAS_SIZE) {
      this.resetTextAtlas();
    }

    const ax = this.textAtlasCursorX;
    const ay = this.textAtlasCursorY;

    // Draw text into atlas
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(text, ax + 1, ay + 1);

    this.textAtlasCursorX += w + 1;
    this.textAtlasRowHeight = Math.max(this.textAtlasRowHeight, h);
    this.textAtlasDirty = true;

    return {
      u0: ax / TEXT_ATLAS_SIZE,
      v0: ay / TEXT_ATLAS_SIZE,
      u1: (ax + w) / TEXT_ATLAS_SIZE,
      v1: (ay + h) / TEXT_ATLAS_SIZE,
      w,
      h,
    };
  }

  private resetTextAtlas(): void {
    this.textAtlasCtx.clearRect(0, 0, TEXT_ATLAS_SIZE, TEXT_ATLAS_SIZE);
    this.textCacheMap.clear();
    this.textAtlasCursorX = 0;
    this.textAtlasCursorY = 0;
    this.textAtlasRowHeight = 0;
    this.textAtlasDirty = true;
  }

  flushText(): void {
    if (this.textCount === 0) return;
    const gl = this.gl;

    // Upload atlas if dirty
    if (this.textAtlasDirty) {
      gl.bindTexture(gl.TEXTURE_2D, this.textTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.textAtlasCanvas);
      this.textAtlasDirty = false;
    }

    gl.useProgram(this.textProg);
    gl.uniform2f(gl.getUniformLocation(this.textProg, 'u_resolution'), this._width, this._height);
    gl.uniform1i(gl.getUniformLocation(this.textProg, 'u_texture'), 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textTexture);

    gl.bindVertexArray(this.textVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textInstanceBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.textData.subarray(0, this.textCount * 8));

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.textCount);

    gl.bindVertexArray(null);
    this.textCount = 0;
  }

  // ── Flush All ────────────────────────────────────────────────────────────

  flush(): void {
    const gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.flushRects();
    this.flushLines();
    this.flushText();

    gl.disable(gl.BLEND);
  }

  // ── Scissor (for clip regions) ───────────────────────────────────────────

  setScissor(x: number, y: number, w: number, h: number): void {
    const gl = this.gl;
    const dpr = gl.canvas.width / this._width;
    gl.enable(gl.SCISSOR_TEST);
    // GL scissor is bottom-left origin
    gl.scissor(
      Math.round(x * dpr),
      Math.round((this._height - y - h) * dpr),
      Math.round(w * dpr),
      Math.round(h * dpr),
    );
  }

  clearScissor(): void {
    this.gl.disable(this.gl.SCISSOR_TEST);
  }

  // ── Measure text (uses offscreen canvas) ─────────────────────────────────

  measureText(text: string, font: string): TextMetrics {
    this.textAtlasCtx.font = font;
    return this.textAtlasCtx.measureText(text);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.rectProg);
    gl.deleteProgram(this.lineProg);
    gl.deleteProgram(this.textProg);
    gl.deleteBuffer(this.quadVBO);
    gl.deleteBuffer(this.rectInstanceBuf);
    gl.deleteBuffer(this.lineInstanceBuf);
    gl.deleteBuffer(this.lineVertexBuf);
    gl.deleteBuffer(this.textInstanceBuf);
    gl.deleteVertexArray(this.rectVAO);
    gl.deleteVertexArray(this.lineVAO);
    gl.deleteVertexArray(this.textVAO);
    gl.deleteTexture(this.textTexture);
  }
}
