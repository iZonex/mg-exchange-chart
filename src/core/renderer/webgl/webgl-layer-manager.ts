// ── WebGL Layer Manager ────────────────────────────────────────────────────
// WebGL-accelerated LayerManager that uses WebGL for the 'series'
// layer (the heaviest — candlesticks, volume, indicators) while keeping
// Canvas 2D for text-heavy layers (background axes, crosshair, UI/drawings).
//
// This hybrid approach gives us WebGL performance where it matters most
// while avoiding the complexity of WebGL text rendering and path operations
// for UI elements.

import type { LayerName } from '../canvas-layer';
import type { RenderContext } from '../render-context';
import { Canvas2DRenderContext } from '../render-context';
import { logger } from '../../logger';
import { WebGLBatchRenderer } from './batch-renderer';
import { WebGLRenderContext } from './webgl-render-context';

export type RendererBackend = 'canvas2d' | 'webgl';

const LAYER_ORDER: LayerName[] = ['background', 'series', 'crosshair', 'ui'];

/** Which layers get WebGL acceleration */
const WEBGL_LAYERS: Set<LayerName> = new Set(['series']);

export interface RenderLayer {
  readonly name: LayerName;
  readonly canvas: HTMLCanvasElement;
  readonly rc: RenderContext;
  dirty: boolean;
  /** For legacy code that still needs raw ctx (drawings, etc.) */
  readonly ctx: CanvasRenderingContext2D | null;
}

export class WebGLLayerManager {
  private layers = new Map<LayerName, RenderLayer>();
  private webglBatch: WebGLBatchRenderer | null = null;
  private _width = 0;
  private _height = 0;
  private _dpr = 1;
  private _backend: RendererBackend;

  get width(): number { return this._width; }
  get height(): number { return this._height; }
  get dpr(): number { return this._dpr; }
  get logicalWidth(): number { return this._width; }
  get logicalHeight(): number { return this._height; }
  get backend(): RendererBackend { return this._backend; }

  constructor(private container: HTMLElement, backend: RendererBackend = 'webgl') {
    this._backend = backend;

    // Try WebGL, fall back to Canvas 2D
    if (backend === 'webgl') {
      try {
        this.initWebGL();
      } catch {
        logger.warn('WebGL2 not available, falling back to Canvas 2D');
        this._backend = 'canvas2d';
        this.initCanvas2D();
      }
    } else {
      this.initCanvas2D();
    }

    this.resize();
  }

  private initWebGL(): void {
    for (const name of LAYER_ORDER) {
      const canvas = this.createCanvas(name);

      if (WEBGL_LAYERS.has(name)) {
        // WebGL layer
        const batch = new WebGLBatchRenderer(canvas);
        this.webglBatch = batch;
        const rc = new WebGLRenderContext(batch);
        this.layers.set(name, { name, canvas, rc, dirty: true, ctx: null });
      } else {
        // Canvas 2D layer
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error(`Failed to get 2d context for layer "${name}"`);
        const rc = new Canvas2DRenderContext(ctx);
        this.layers.set(name, { name, canvas, rc, dirty: true, ctx });
      }
    }
  }

  private initCanvas2D(): void {
    for (const name of LAYER_ORDER) {
      const canvas = this.createCanvas(name);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(`Failed to get 2d context for layer "${name}"`);
      const rc = new Canvas2DRenderContext(ctx);
      this.layers.set(name, { name, canvas, rc, dirty: true, ctx });
    }
  }

  private createCanvas(name: LayerName): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = name === 'ui' ? 'auto' : 'none';
    this.container.appendChild(canvas);
    return canvas;
  }

  /** Get a layer by name */
  get(name: LayerName): RenderLayer {
    const layer = this.layers.get(name);
    if (!layer) throw new Error(`Unknown layer: ${name}`);
    return layer;
  }

  /** Get the RenderContext for a layer */
  getRenderContext(name: LayerName): RenderContext {
    return this.get(name).rc;
  }

  /**
   * Get raw CanvasRenderingContext2D for legacy code.
   * For WebGL layers, returns null — caller must use RenderContext.
   */
  getCtx(name: LayerName): CanvasRenderingContext2D | null {
    return this.get(name).ctx;
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

  /** Clear a layer */
  clear(name: LayerName): void {
    const layer = this.get(name);
    if (layer.ctx) {
      layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    } else if (this.webglBatch && WEBGL_LAYERS.has(name)) {
      this.webglBatch.clear();
    }
  }

  /** Resize all canvases to match container */
  resize(): void {
    const rect = this.container.getBoundingClientRect();
    this._dpr = window.devicePixelRatio || 1;
    this._width = Math.round(rect.width);
    this._height = Math.round(rect.height);

    const physW = Math.round(this._width * this._dpr);
    const physH = Math.round(this._height * this._dpr);

    for (const [name, layer] of this.layers) {
      if (WEBGL_LAYERS.has(name) && this.webglBatch) {
        // WebGL canvas — batch renderer handles sizing
        this.webglBatch.resize(this._width, this._height, this._dpr);
      } else if (layer.ctx) {
        // Canvas 2D
        layer.canvas.width = physW;
        layer.canvas.height = physH;
        layer.canvas.style.width = `${this._width}px`;
        layer.canvas.style.height = `${this._height}px`;
        layer.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
      }
      layer.dirty = true;
    }
  }

  /** Iterate dirty layers, call render callback, clear dirty flag */
  renderDirty(renderFn: (layer: RenderLayer) => void): void {
    for (const name of LAYER_ORDER) {
      const layer = this.layers.get(name)!;
      if (layer.dirty) {
        this.clear(name);
        renderFn(layer);
        // Flush WebGL batches after rendering
        if (WEBGL_LAYERS.has(name) && this.webglBatch) {
          layer.rc.flush();
        }
        layer.dirty = false;
      }
    }
  }

  /** Remove all canvases from DOM */
  destroy(): void {
    this.webglBatch?.destroy();
    for (const layer of this.layers.values()) {
      layer.canvas.remove();
    }
    this.layers.clear();
  }
}
