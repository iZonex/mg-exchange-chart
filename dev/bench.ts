// ── WebGL vs Canvas 2D Benchmark ───────────────────────────────────────────
// Isolates SERIES rendering only. Forces ALL bars visible (max zoom-out).
// Measures raw render throughput, not vsync-limited FPS.

import { Chart } from '../src/core/chart';
import type { Bar, Datafeed } from '../src/api/types';

// ── Direct renderer imports for isolated tests ─────────────────────────────
import { renderCandlesticks } from '../src/core/series/candlestick';
import { renderVolume } from '../src/core/series/volume';
import type { PriceScale } from '../src/core/renderer/price-axis';
import type { TimeScale } from '../src/core/renderer/time-axis';
import { CandleRenderer } from '../src/core/renderer/webgl/candle-renderer';
import { WebGLBatchRenderer } from '../src/core/renderer/webgl/batch-renderer';
import { darkTheme } from '../src/themes/dark';

// ── Data Generation ────────────────────────────────────────────────────────
function generateBars(count: number): Bar[] {
  const bars: Bar[] = [];
  const now = Math.floor(Date.now() / 1000);
  let price = 42000 + Math.random() * 5000;

  for (let i = 0; i < count; i++) {
    const t = now - (count - i) * 3600;
    const volatility = price * 0.008;
    const change = (Math.random() - 0.48) * volatility;
    const open = price;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = 50 + Math.random() * 500;
    bars.push({ time: t, open, high, low, close, volume });
    price = close;
  }
  return bars;
}

// ── Isolated Series Benchmark ──────────────────────────────────────────────
// Tests ONLY candlestick + volume rendering. No grid, no axes, no crosshair.
// ALL bars visible — worst case for rendering.

interface BenchResult {
  totalMs: number;
  avgMs: number;
  theoreticalFps: number;
  barsRendered: number;
}

function benchCanvas2D(
  bars: readonly Bar[],
  iterations: number,
  width: number,
  height: number,
): BenchResult {
  // Create offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * 2; // simulate retina
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(2, 0, 0, 2, 0, 0);

  const theme = darkTheme;
  const priceScale: PriceScale = computePriceScale(bars);
  const barSpacing = width / bars.length;
  const timeScale: TimeScale = {
    firstIndex: 0,
    visibleCount: bars.length,
    barSpacing,
    offsetX: 0,
  };

  const maxVol = bars.reduce((m, b) => Math.max(m, b.volume), 0);

  // Warmup
  ctx.clearRect(0, 0, width, height);
  renderVolume(ctx, bars, 0, maxVol, timeScale, theme, width, height);
  renderCandlesticks(ctx, bars, 0, timeScale, priceScale, theme, width, height);

  // Bench
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    ctx.clearRect(0, 0, width, height);
    renderVolume(ctx, bars, 0, maxVol, timeScale, theme, width, height);
    renderCandlesticks(ctx, bars, 0, timeScale, priceScale, theme, width, height);
  }
  const totalMs = performance.now() - start;

  return {
    totalMs,
    avgMs: totalMs / iterations,
    theoreticalFps: 1000 / (totalMs / iterations),
    barsRendered: bars.length,
  };
}

function benchWebGL(
  bars: readonly Bar[],
  iterations: number,
  width: number,
  height: number,
): BenchResult {
  // Create WebGL canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  // Need to add to DOM for WebGL context
  canvas.style.position = 'fixed';
  canvas.style.top = '-9999px';
  document.body.appendChild(canvas);

  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true })!;
  if (!gl) {
    canvas.remove();
    return { totalMs: 0, avgMs: 0, theoreticalFps: 0, barsRendered: 0 };
  }
  gl.viewport(0, 0, canvas.width, canvas.height);

  const renderer = new CandleRenderer(gl);
  const theme = darkTheme;
  const priceScale: PriceScale = computePriceScale(bars);
  const barSpacing = width / bars.length;
  const timeScale: TimeScale = {
    firstIndex: 0,
    visibleCount: bars.length,
    barSpacing,
    offsetX: 0,
  };
  const maxVol = bars.reduce((m, b) => Math.max(m, b.volume), 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Warmup
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  renderer.renderVolume(bars, 0, maxVol, timeScale, theme, width, height, width, height);
  renderer.renderCandles(bars, 0, timeScale, priceScale, theme, width, height, width, height);
  gl.finish(); // force GPU sync

  // Bench
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    renderer.renderVolume(bars, 0, maxVol, timeScale, theme, width, height, width, height);
    renderer.renderCandles(bars, 0, timeScale, priceScale, theme, width, height, width, height);
  }
  gl.finish(); // force GPU sync to measure actual GPU time
  const totalMs = performance.now() - start;

  renderer.destroy();
  canvas.remove();

  return {
    totalMs,
    avgMs: totalMs / iterations,
    theoreticalFps: 1000 / (totalMs / iterations),
    barsRendered: bars.length,
  };
}

function computePriceScale(bars: readonly Bar[]): PriceScale {
  let min = Infinity, max = -Infinity;
  for (const b of bars) {
    if (b.low < min) min = b.low;
    if (b.high > max) max = b.high;
  }
  const pad = (max - min) * 0.05;
  return { min: min - pad, max: max + pad, mode: 'linear' };
}

// ── State ──────────────────────────────────────────────────────────────────
let barCount = 100000;
let iterations = 100;

const $ = (s: string) => document.querySelector(s)! as HTMLElement;

// ── Run Benchmark ──────────────────────────────────────────────────────────
function runBenchmark() {
  const bars = generateBars(barCount);
  const width = 1200;
  const height = 600;

  $('#status').textContent = `Generating ${barCount.toLocaleString()} bars, running ${iterations} iterations...`;
  $('#bar-loaded').textContent = barCount.toLocaleString();
  $('#bars-visible').textContent = barCount.toLocaleString();
  $('#btn-run').setAttribute('disabled', '');

  setTimeout(() => {
    // Run Canvas 2D first
    $('#status').textContent = `Running Canvas 2D... (${iterations} iterations, ALL ${barCount.toLocaleString()} bars visible)`;
    setTimeout(() => {
      const c2d = benchCanvas2D(bars, iterations, width, height);

      $('#status').textContent = `Running WebGL... (${iterations} iterations, ALL ${barCount.toLocaleString()} bars visible)`;
      setTimeout(() => {
        const wgl = benchWebGL(bars, iterations, width, height);

        // Display results
        const fpsW = $('#fps-webgl');
        fpsW.textContent = `${Math.round(wgl.theoreticalFps)}`;
        fpsW.className = `value ${wgl.theoreticalFps > c2d.theoreticalFps ? 'good' : 'bad'}`;

        const fpsC = $('#fps-canvas');
        fpsC.textContent = `${Math.round(c2d.theoreticalFps)}`;
        fpsC.className = `value ${c2d.theoreticalFps > wgl.theoreticalFps ? 'good' : 'bad'}`;

        $('#ft-webgl').textContent = `${wgl.avgMs.toFixed(2)}ms`;
        $('#ft-canvas').textContent = `${c2d.avgMs.toFixed(2)}ms`;

        const speedup = c2d.avgMs > 0 ? c2d.avgMs / wgl.avgMs : 0;
        const speedEl = $('#speedup');
        speedEl.textContent = `${speedup.toFixed(2)}x`;
        speedEl.className = `value ${speedup >= 1.2 ? 'good' : speedup >= 0.9 ? 'warn' : 'bad'}`;

        $('#detail-webgl').textContent = `${iterations} renders × ${wgl.barsRendered.toLocaleString()} bars = ${wgl.totalMs.toFixed(0)}ms`;
        $('#detail-canvas').textContent = `${iterations} renders × ${c2d.barsRendered.toLocaleString()} bars = ${c2d.totalMs.toFixed(0)}ms`;

        const winner = speedup >= 1.0 ? 'WebGL' : 'Canvas 2D';
        $('#status').textContent =
          `Done! ${winner} wins. WebGL: ${wgl.avgMs.toFixed(2)}ms/frame (${Math.round(wgl.theoreticalFps)} FPS), ` +
          `Canvas 2D: ${c2d.avgMs.toFixed(2)}ms/frame (${Math.round(c2d.theoreticalFps)} FPS). ` +
          `All ${barCount.toLocaleString()} bars visible, series-only (no grid/axes/crosshair).`;
        $('#btn-run').removeAttribute('disabled');
      }, 50);
    }, 50);
  }, 50);
}

// ── Controls ───────────────────────────────────────────────────────────────
$('#bar-count').addEventListener('change', (e) => {
  barCount = parseInt((e.target as HTMLSelectElement).value, 10);
});

$('#iter-count').addEventListener('change', (e) => {
  iterations = parseInt((e.target as HTMLSelectElement).value, 10);
});

$('#btn-run').addEventListener('click', runBenchmark);

$('#status').textContent = 'Ready. Press "Run Benchmark". Tests series rendering with ALL bars visible.';
