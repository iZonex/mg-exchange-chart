// ── Canvas Layer System ─────────────────────────────────────────────────────
// Multiple stacked <canvas> elements. Each layer re-renders independently
// via a dirty flag, so e.g. crosshair movement doesn't repaint series data.
//
// When renderer='webgl', the 'series' layer uses a WebGL canvas with a
// RenderContext adapter. All other layers remain Canvas 2D.

import type { RenderContext } from './render-context';
import { Canvas2DRenderContext } from './render-context';
import { WebGLBatchRenderer } from './webgl/batch-renderer';
import { logger } from '../logger';
import { WebGLRenderContext } from './webgl/webgl-render-context';
import { CandleRenderer } from './webgl/candle-renderer';

export type LayerName = 'background' | 'series' | 'crosshair' | 'ui';
export type RendererBackend = 'canvas2d' | 'webgl';

const LAYER_ORDER: LayerName[] = ['background', 'series', 'crosshair', 'ui'];

export interface CanvasLayer {
  readonly name: LayerName;
  readonly canvas: HTMLCanvasElement;
  /** Canvas 2D context. Null for WebGL-backed layers. */
  readonly ctx: CanvasRenderingContext2D;
  /** Render context — works for both Canvas 2D and WebGL backends. */
  readonly rc: RenderContext;
  dirty: boolean;
}

export class LayerManager {
  private layers = new Map<LayerName, CanvasLayer>();
  private _width = 0;
  private _height = 0;
  private _dpr = 1;
  private _backend: RendererBackend;
  private webglBatch: WebGLBatchRenderer | null = null;
  private _candleRenderer: CandleRenderer | null = null;

  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get dpr(): number { return this._dpr; }
  get backend(): RendererBackend { return this._backend; }

  /** Get the WebGL batch renderer (null if Canvas 2D backend) */
  get batchRenderer(): WebGLBatchRenderer | null { return this.webglBatch; }

  /** Get the GPU candlestick/volume renderer (null if Canvas 2D backend) */
  get candleRenderer(): CandleRenderer | null { return this._candleRenderer; }

  /** Logical pixel dimensions (CSS pixels, not device pixels) */
  get logicalWidth(): number { return this._width; }
  get logicalHeight(): number { return this._height; }

  constructor(private container: HTMLElement, backend: RendererBackend = 'canvas2d') {
    this._backend = backend;

    for (const name of LAYER_ORDER) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      // Crosshair and UI layers receive pointer events; others are transparent
      canvas.style.pointerEvents = name === 'ui' ? 'auto' : 'none';

      this.container.appendChild(canvas);

      // Try WebGL for the series layer
      if (name === 'series' && backend === 'webgl') {
        try {
          const batch = new WebGLBatchRenderer(canvas);
          this.webglBatch = batch;
          this._candleRenderer = new CandleRenderer(batch.gl);
          const rc = new WebGLRenderContext(batch);

          // Create a proxy ctx that delegates to rc for type compatibility.
          // Code using `layer.ctx` on the series layer will work via RenderContext.
          // Code should prefer `layer.rc` for new code.
          this.layers.set(name, {
            name,
            canvas,
            ctx: rc as unknown as CanvasRenderingContext2D,
            rc,
            dirty: true,
          });
          continue;
        } catch {
          logger.warn('WebGL2 not available for series layer, using Canvas 2D');
          this._backend = 'canvas2d';
        }
      }

      // Canvas 2D (default)
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(`Failed to get 2d context for layer "${name}"`);
      const rc = new Canvas2DRenderContext(ctx);
      this.layers.set(name, { name, canvas, ctx, rc, dirty: true });
    }

    this.resize();
  }

  /** Get a layer by name */
  get(name: LayerName): CanvasLayer {
    const layer = this.layers.get(name);
    if (!layer) throw new Error(`Unknown layer: ${name}`);
    return layer;
  }

  /** Mark a layer as needing repaint */
  markDirty(name: LayerName): void {
    this.get(name).dirty = true;
  }

  /** Mark all layers dirty */
  markAllDirty(): void {
    for (const layer of this.layers.values()) {
      layer.dirty = true;
    }
  }

  /** Clear a layer's canvas */
  clear(name: LayerName): void {
    const layer = this.get(name);
    if (name === 'series' && this.webglBatch) {
      this.webglBatch.clear();
    } else if (layer.ctx instanceof CanvasRenderingContext2D) {
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    }
  }

  /** Resize all canvases to match container. Call on window resize / container resize. */
  resize(): void {
    const rect = this.container.getBoundingClientRect();
    this._dpr = window.devicePixelRatio || 1;
    this._width = Math.round(rect.width);
    this._height = Math.round(rect.height);

    const physW = Math.round(this._width * this._dpr);
    const physH = Math.round(this._height * this._dpr);

    for (const [name, layer] of this.layers) {
      if (name === 'series' && this.webglBatch) {
        // WebGL canvas — batch renderer handles sizing
        this.webglBatch.resize(this._width, this._height, this._dpr);
      } else {
        layer.canvas.width = physW;
        layer.canvas.height = physH;
        layer.canvas.style.width = `${this._width}px`;
        layer.canvas.style.height = `${this._height}px`;
        // Scale context so drawing code uses CSS pixels
        if (layer.ctx instanceof CanvasRenderingContext2D) {
          layer.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        }
      }
      layer.dirty = true;
    }
  }

  /** Iterate dirty layers, call render callback, clear dirty flag */
  renderDirty(renderFn: (layer: CanvasLayer) => void): void {
    for (const name of LAYER_ORDER) {
      const layer = this.layers.get(name)!;
      if (layer.dirty) {
        this.clear(name);
        renderFn(layer);
        // Flush WebGL batches after rendering the series layer
        if (name === 'series' && this.webglBatch) {
          layer.rc.flush();
        }
        layer.dirty = false;
      }
    }
  }

  /** Remove all canvases from DOM */
  destroy(): void {
    this._candleRenderer?.destroy();
    this.webglBatch?.destroy();
    for (const layer of this.layers.values()) {
      layer.canvas.remove();
    }
    this.layers.clear();
  }
}
