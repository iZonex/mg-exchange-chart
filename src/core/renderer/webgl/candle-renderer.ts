// ── GPU Candlestick Renderer ───────────────────────────────────────────────
// Renders ALL candlesticks + volume bars in 2 draw calls total.
// Raw OHLCV data → GPU buffer → vertex shader does all the math.
// Zero per-bar JS overhead. Zero color parsing. Zero coordinate conversion.

import type { Bar, Theme } from '../../../api/types';
import type { PriceScale } from '../price-axis';
import type { TimeScale } from '../time-axis';
import { CANDLE_VERT, CANDLE_FRAG, VOLUME_VERT, VOLUME_FRAG } from './shaders';
import { createProgram, parseColor } from './utils';

const CANDLE_FLOATS = 5;  // open, high, low, close, barIndex
const VOLUME_FLOATS = 3;  // volume, isBull, barIndex
const BODY_WIDTH_RATIO = 0.7;
const MIN_BODY_WIDTH = 1;
const MAX_BODY_WIDTH = 40;
const DEFAULT_VOLUME_HEIGHT_RATIO = 0.15;

export class CandleRenderer {
  private gl: WebGL2RenderingContext;

  // Candle program
  private candleProg: WebGLProgram;
  private candleVAO: WebGLVertexArrayObject;
  private candleBuf: WebGLBuffer;
  private candleData = new Float32Array(0);
  private candleUniforms: Record<string, WebGLUniformLocation> = {};

  // Volume program
  private volumeProg: WebGLProgram;
  private volumeVAO: WebGLVertexArrayObject;
  private volumeBuf: WebGLBuffer;
  private volumeData = new Float32Array(0);
  private volumeUniforms: Record<string, WebGLUniformLocation> = {};

  // Cached theme colors (parsed once on theme change)
  private bullColor = new Float32Array(4);
  private bearColor = new Float32Array(4);
  private bullWickColor = new Float32Array(4);
  private bearWickColor = new Float32Array(4);
  private volBullColor = new Float32Array(4);
  private volBearColor = new Float32Array(4);
  private lastThemeName = '';

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    // ── Candle program ───────────────────────────────────────────────────
    this.candleProg = createProgram(gl, CANDLE_VERT, CANDLE_FRAG);
    this.candleVAO = gl.createVertexArray()!;
    this.candleBuf = gl.createBuffer()!;

    gl.bindVertexArray(this.candleVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.candleBuf);

    const cStride = CANDLE_FLOATS * 4;
    // a_open (loc 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, cStride, 0);
    gl.vertexAttribDivisor(0, 1);
    // a_high (loc 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, cStride, 4);
    gl.vertexAttribDivisor(1, 1);
    // a_low (loc 2)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, cStride, 8);
    gl.vertexAttribDivisor(2, 1);
    // a_close (loc 3)
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, cStride, 12);
    gl.vertexAttribDivisor(3, 1);
    // a_barIndex (loc 4)
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, cStride, 16);
    gl.vertexAttribDivisor(4, 1);

    gl.bindVertexArray(null);

    // Cache uniform locations
    const cUniNames = [
      'u_resolution', 'u_chartHeight', 'u_priceMin', 'u_priceRange',
      'u_barSpacing', 'u_offsetX', 'u_bodyWidth',
      'u_bullColor', 'u_bearColor', 'u_bullWickColor', 'u_bearWickColor',
    ];
    for (const name of cUniNames) {
      this.candleUniforms[name] = gl.getUniformLocation(this.candleProg, name)!;
    }

    // ── Volume program ───────────────────────────────────────────────────
    this.volumeProg = createProgram(gl, VOLUME_VERT, VOLUME_FRAG);
    this.volumeVAO = gl.createVertexArray()!;
    this.volumeBuf = gl.createBuffer()!;

    gl.bindVertexArray(this.volumeVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.volumeBuf);

    const vStride = VOLUME_FLOATS * 4;
    // a_volume (loc 0)
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, vStride, 0);
    gl.vertexAttribDivisor(0, 1);
    // a_isBull (loc 1)
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, vStride, 4);
    gl.vertexAttribDivisor(1, 1);
    // a_barIndex (loc 2)
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, vStride, 8);
    gl.vertexAttribDivisor(2, 1);

    gl.bindVertexArray(null);

    const vUniNames = [
      'u_resolution', 'u_chartHeight', 'u_maxVolume',
      'u_barSpacing', 'u_offsetX', 'u_bodyWidth', 'u_volumeZoneHeight',
      'u_bullColor', 'u_bearColor',
    ];
    for (const name of vUniNames) {
      this.volumeUniforms[name] = gl.getUniformLocation(this.volumeProg, name)!;
    }
  }

  // ── Theme Color Cache ────────────────────────────────────────────────────

  private updateThemeColors(theme: Theme): void {
    if (theme.name === this.lastThemeName) return;
    this.lastThemeName = theme.name;

    const set = (arr: Float32Array, color: string) => {
      const [r, g, b, a] = parseColor(color);
      arr[0] = r; arr[1] = g; arr[2] = b; arr[3] = a;
    };

    set(this.bullColor, theme.bullCandle);
    set(this.bearColor, theme.bearCandle);
    set(this.bullWickColor, theme.bullCandleWick);
    set(this.bearWickColor, theme.bearCandleWick);
    set(this.volBullColor, theme.volumeBull);
    set(this.volBearColor, theme.volumeBear);
  }

  // ── Render Candlesticks ──────────────────────────────────────────────────

  renderCandles(
    bars: readonly Bar[],
    firstBarIndex: number,
    timeScale: TimeScale,
    priceScale: PriceScale,
    theme: Theme,
    chartWidth: number,
    chartHeight: number,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    if (bars.length === 0) return;

    this.updateThemeColors(theme);
    const gl = this.gl;

    const bodyWidth = Math.min(MAX_BODY_WIDTH, Math.max(MIN_BODY_WIDTH,
      Math.round(timeScale.barSpacing * BODY_WIDTH_RATIO)));
    const halfBody = bodyWidth / 2;

    // Build OHLC buffer — only visible bars
    const needed = bars.length * CANDLE_FLOATS;
    if (this.candleData.length < needed) {
      this.candleData = new Float32Array(needed);
    }

    let count = 0;
    for (let i = 0; i < bars.length; i++) {
      const relIdx = (firstBarIndex + i) - timeScale.firstIndex;
      const x = relIdx * timeScale.barSpacing + timeScale.offsetX + timeScale.barSpacing * 0.5;
      if (x + halfBody < 0 || x - halfBody > chartWidth) continue;

      const off = count * CANDLE_FLOATS;
      const bar = bars[i]!;
      this.candleData[off] = bar.open;
      this.candleData[off + 1] = bar.high;
      this.candleData[off + 2] = bar.low;
      this.candleData[off + 3] = bar.close;
      this.candleData[off + 4] = relIdx;
      count++;
    }

    if (count === 0) return;

    gl.useProgram(this.candleProg);
    const u = this.candleUniforms;

    gl.uniform2f(u['u_resolution']!, viewportWidth, viewportHeight);
    gl.uniform1f(u['u_chartHeight']!, chartHeight);
    gl.uniform1f(u['u_priceMin']!, priceScale.min);
    gl.uniform1f(u['u_priceRange']!, priceScale.max - priceScale.min);
    gl.uniform1f(u['u_barSpacing']!, timeScale.barSpacing);
    gl.uniform1f(u['u_offsetX']!, timeScale.offsetX);
    gl.uniform1f(u['u_bodyWidth']!, bodyWidth);
    gl.uniform4fv(u['u_bullColor']!, this.bullColor);
    gl.uniform4fv(u['u_bearColor']!, this.bearColor);
    gl.uniform4fv(u['u_bullWickColor']!, this.bullWickColor);
    gl.uniform4fv(u['u_bearWickColor']!, this.bearWickColor);

    gl.bindVertexArray(this.candleVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.candleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.candleData.subarray(0, count * CANDLE_FLOATS), gl.DYNAMIC_DRAW);

    // 12 vertices per candle (body quad + wick quad, each 6 verts / 2 triangles)
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 12, count);

    gl.bindVertexArray(null);
  }

  // ── Render Volume ────────────────────────────────────────────────────────

  renderVolume(
    bars: readonly Bar[],
    firstBarIndex: number,
    maxVolume: number,
    timeScale: TimeScale,
    theme: Theme,
    chartWidth: number,
    chartHeight: number,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    if (bars.length === 0 || maxVolume <= 0) return;

    this.updateThemeColors(theme);
    const gl = this.gl;

    const bodyWidth = Math.min(MAX_BODY_WIDTH, Math.max(MIN_BODY_WIDTH,
      Math.round(timeScale.barSpacing * BODY_WIDTH_RATIO)));
    const halfBody = bodyWidth / 2;

    const needed = bars.length * VOLUME_FLOATS;
    if (this.volumeData.length < needed) {
      this.volumeData = new Float32Array(needed);
    }

    let count = 0;
    for (let i = 0; i < bars.length; i++) {
      const relIdx = (firstBarIndex + i) - timeScale.firstIndex;
      const x = relIdx * timeScale.barSpacing + timeScale.offsetX + timeScale.barSpacing * 0.5;
      if (x + halfBody < 0 || x - halfBody > chartWidth) continue;

      const off = count * VOLUME_FLOATS;
      const bar = bars[i]!;
      this.volumeData[off] = bar.volume;
      this.volumeData[off + 1] = bar.close >= bar.open ? 1.0 : 0.0;
      this.volumeData[off + 2] = relIdx;
      count++;
    }

    if (count === 0) return;

    gl.useProgram(this.volumeProg);
    const u = this.volumeUniforms;

    gl.uniform2f(u['u_resolution']!, viewportWidth, viewportHeight);
    gl.uniform1f(u['u_chartHeight']!, chartHeight);
    gl.uniform1f(u['u_maxVolume']!, maxVolume);
    gl.uniform1f(u['u_barSpacing']!, timeScale.barSpacing);
    gl.uniform1f(u['u_offsetX']!, timeScale.offsetX);
    gl.uniform1f(u['u_bodyWidth']!, bodyWidth);
    gl.uniform1f(u['u_volumeZoneHeight']!, chartHeight * (theme.volumeHeightRatio ?? DEFAULT_VOLUME_HEIGHT_RATIO));
    gl.uniform4fv(u['u_bullColor']!, this.volBullColor);
    gl.uniform4fv(u['u_bearColor']!, this.volBearColor);

    gl.bindVertexArray(this.volumeVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.volumeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.volumeData.subarray(0, count * VOLUME_FLOATS), gl.DYNAMIC_DRAW);

    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);

    gl.bindVertexArray(null);
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.candleProg);
    gl.deleteProgram(this.volumeProg);
    gl.deleteBuffer(this.candleBuf);
    gl.deleteBuffer(this.volumeBuf);
    gl.deleteVertexArray(this.candleVAO);
    gl.deleteVertexArray(this.volumeVAO);
  }
}
