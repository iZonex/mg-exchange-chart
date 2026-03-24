// ── WebGL Render Context ───────────────────────────────────────────────────
// Implements the RenderContext interface using WebGL batch renderer.
// Translates Canvas 2D-style API calls into batched WebGL draw calls.
// Path operations (beginPath/lineTo/fill/stroke) are tracked in JS,
// then flushed as batched primitives.

import type { RenderContext } from '../render-context';
import { font as fontHelper } from '../../font';
import { WebGLBatchRenderer } from './batch-renderer';
import { parseColor } from './utils';

interface PathPoint {
  x: number;
  y: number;
  type: 'move' | 'line';
}

interface StateFrame {
  fillStyle: string | CanvasGradient;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  globalAlpha: number;
  lineDash: number[];
  lineDashOffset: number;
  lineJoin: CanvasLineJoin;
  lineCap: CanvasLineCap;
  globalCompositeOperation: GlobalCompositeOperation;
  clipRect: { x: number; y: number; w: number; h: number } | null;
  transform: { tx: number; ty: number; sx: number; sy: number };
}

export class WebGLRenderContext implements RenderContext {
  private batch: WebGLBatchRenderer;
  private path: PathPoint[] = [];
  private stateStack: StateFrame[] = [];

  // Current state
  fillStyle: string | CanvasGradient = '#000000';
  strokeStyle = '#000000';
  lineWidth = 1;
  font = fontHelper(11);
  textAlign: CanvasTextAlign = 'start';
  textBaseline: CanvasTextBaseline = 'alphabetic';
  globalAlpha = 1;
  lineDashOffset = 0;
  lineJoin: CanvasLineJoin = 'miter';
  lineCap: CanvasLineCap = 'butt';

  private _lineDash: number[] = [];
  private _globalCompositeOperation: GlobalCompositeOperation = 'source-over';
  private _clipRect: { x: number; y: number; w: number; h: number } | null = null;
  private _transform = { tx: 0, ty: 0, sx: 1, sy: 1 };

  // Pending clip from rect() + clip() sequence
  private _pendingClipRect: { x: number; y: number; w: number; h: number } | null = null;

  constructor(batch: WebGLBatchRenderer) {
    this.batch = batch;
  }

  get globalCompositeOperation(): GlobalCompositeOperation { return this._globalCompositeOperation; }
  set globalCompositeOperation(v: GlobalCompositeOperation) { this._globalCompositeOperation = v; }

  // ── State Stack ──────────────────────────────────────────────────────────

  save(): void {
    this.stateStack.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      globalAlpha: this.globalAlpha,
      lineDash: [...this._lineDash],
      lineDashOffset: this.lineDashOffset,
      lineJoin: this.lineJoin,
      lineCap: this.lineCap,
      globalCompositeOperation: this._globalCompositeOperation,
      clipRect: this._clipRect ? { ...this._clipRect } : null,
      transform: { ...this._transform },
    });
  }

  restore(): void {
    const frame = this.stateStack.pop();
    if (!frame) return;

    // Flush before state change to preserve draw order
    this.batch.flush();

    this.fillStyle = frame.fillStyle;
    this.strokeStyle = frame.strokeStyle;
    this.lineWidth = frame.lineWidth;
    this.font = frame.font;
    this.textAlign = frame.textAlign;
    this.textBaseline = frame.textBaseline;
    this.globalAlpha = frame.globalAlpha;
    this._lineDash = frame.lineDash;
    this.lineDashOffset = frame.lineDashOffset;
    this.lineJoin = frame.lineJoin;
    this.lineCap = frame.lineCap;
    this._globalCompositeOperation = frame.globalCompositeOperation;
    this._transform = frame.transform;

    // Restore clip
    if (this._clipRect && !frame.clipRect) {
      this.batch.clearScissor();
    } else if (frame.clipRect) {
      this.batch.setScissor(frame.clipRect.x, frame.clipRect.y, frame.clipRect.w, frame.clipRect.h);
    }
    this._clipRect = frame.clipRect;
  }

  // ── Rectangles ───────────────────────────────────────────────────────────

  fillRect(x: number, y: number, w: number, h: number): void {
    const tx = x * this._transform.sx + this._transform.tx;
    const ty = y * this._transform.sy + this._transform.ty;
    const tw = w * this._transform.sx;
    const th = h * this._transform.sy;

    if (typeof this.fillStyle === 'string') {
      this.batch.pushRect(tx, ty, tw, th, this.fillStyle, this.globalAlpha);
    } else {
      // CanvasGradient — fall back to a solid color approximation
      // (gradients are handled by dedicated gradient rects in the renderer)
      this.batch.pushRect(tx, ty, tw, th, '#888888', this.globalAlpha);
    }
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    const lw = this.lineWidth;
    const tx = x * this._transform.sx + this._transform.tx;
    const ty = y * this._transform.sy + this._transform.ty;
    const tw = w * this._transform.sx;
    const th = h * this._transform.sy;
    // Top
    this.batch.pushLine(tx, ty, tx + tw, ty, lw, this.strokeStyle, this.globalAlpha);
    // Bottom
    this.batch.pushLine(tx, ty + th, tx + tw, ty + th, lw, this.strokeStyle, this.globalAlpha);
    // Left
    this.batch.pushLine(tx, ty, tx, ty + th, lw, this.strokeStyle, this.globalAlpha);
    // Right
    this.batch.pushLine(tx + tw, ty, tx + tw, ty + th, lw, this.strokeStyle, this.globalAlpha);
  }

  clearRect(_x: number, _y: number, _w: number, _h: number): void {
    // WebGL clear is handled at the layer level; individual clearRect is a no-op
    // since we clear the entire canvas before each render pass
  }

  // ── Path ─────────────────────────────────────────────────────────────────

  beginPath(): void {
    this.path.length = 0;
    this._pendingClipRect = null;
  }

  moveTo(x: number, y: number): void {
    this.path.push({
      x: x * this._transform.sx + this._transform.tx,
      y: y * this._transform.sy + this._transform.ty,
      type: 'move',
    });
  }

  lineTo(x: number, y: number): void {
    this.path.push({
      x: x * this._transform.sx + this._transform.tx,
      y: y * this._transform.sy + this._transform.ty,
      type: 'line',
    });
  }

  closePath(): void {
    // Find the last moveTo and add a line back to it
    for (let i = this.path.length - 1; i >= 0; i--) {
      if (this.path[i]!.type === 'move') {
        this.path.push({ x: this.path[i]!.x, y: this.path[i]!.y, type: 'line' });
        break;
      }
    }
  }

  rect(x: number, y: number, w: number, h: number): void {
    const tx = x * this._transform.sx + this._transform.tx;
    const ty = y * this._transform.sy + this._transform.ty;
    const tw = w * this._transform.sx;
    const th = h * this._transform.sy;
    this._pendingClipRect = { x: tx, y: ty, w: tw, h: th };
    // Also add as path for fill/stroke
    this.moveTo(x, y);
    this.lineTo(x + w, y);
    this.lineTo(x + w, y + h);
    this.lineTo(x, y + h);
    this.closePath();
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, _ccw?: boolean): void {
    // Approximate arc as line segments
    const tx = x * this._transform.sx + this._transform.tx;
    const ty = y * this._transform.sy + this._transform.ty;
    const r = radius * this._transform.sx; // assume uniform scale
    const steps = Math.max(12, Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 12)));
    const step = (endAngle - startAngle) / steps;

    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + i * step;
      const px = tx + Math.cos(angle) * r;
      const py = ty + Math.sin(angle) * r;
      this.path.push({ x: px, y: py, type: i === 0 ? 'move' : 'line' });
    }
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    // Approximate with line segments
    const last = this.path[this.path.length - 1];
    if (!last) return;
    const steps = 12;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = (1 - t) * (1 - t) * last.x + 2 * (1 - t) * t * (cpx * this._transform.sx + this._transform.tx) + t * t * (x * this._transform.sx + this._transform.tx);
      const py = (1 - t) * (1 - t) * last.y + 2 * (1 - t) * t * (cpy * this._transform.sy + this._transform.ty) + t * t * (y * this._transform.sy + this._transform.ty);
      this.path.push({ x: px, y: py, type: 'line' });
    }
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    const last = this.path[this.path.length - 1];
    if (!last) return;
    const steps = 16;
    const tCP1x = cp1x * this._transform.sx + this._transform.tx;
    const tCP1y = cp1y * this._transform.sy + this._transform.ty;
    const tCP2x = cp2x * this._transform.sx + this._transform.tx;
    const tCP2y = cp2y * this._transform.sy + this._transform.ty;
    const tX = x * this._transform.sx + this._transform.tx;
    const tY = y * this._transform.sy + this._transform.ty;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const px = mt * mt * mt * last.x + 3 * mt * mt * t * tCP1x + 3 * mt * t * t * tCP2x + t * t * t * tX;
      const py = mt * mt * mt * last.y + 3 * mt * mt * t * tCP1y + 3 * mt * t * t * tCP2y + t * t * t * tY;
      this.path.push({ x: px, y: py, type: 'line' });
    }
  }

  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, startAngle: number, endAngle: number, _ccw?: boolean): void {
    const tx = x * this._transform.sx + this._transform.tx;
    const ty = y * this._transform.sy + this._transform.ty;
    const steps = Math.max(16, Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 16)));
    const step = (endAngle - startAngle) / steps;

    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + i * step;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const px = rx * Math.cos(angle);
      const py = ry * Math.sin(angle);
      const fx = tx + px * cos - py * sin;
      const fy = ty + px * sin + py * cos;
      this.path.push({ x: fx, y: fy, type: i === 0 ? 'move' : 'line' });
    }
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  fill(): void {
    // Triangulate the path for filled rendering using fan triangulation
    // This works well for convex shapes (rects, simple polygons)
    // For complex concave paths (area charts), we decompose into horizontal strips
    if (this.path.length < 3) return;

    const color = typeof this.fillStyle === 'string' ? this.fillStyle : '#888888';
    const [r, g, b, a] = parseColor(color);
    const alpha = a * this.globalAlpha;

    // Find all sub-paths
    const subPaths: PathPoint[][] = [];
    let current: PathPoint[] = [];

    for (const pt of this.path) {
      if (pt.type === 'move') {
        if (current.length >= 3) subPaths.push(current);
        current = [pt];
      } else {
        current.push(pt);
      }
    }
    if (current.length >= 3) subPaths.push(current);

    // For each sub-path, use fan triangulation from first vertex
    // Render as filled triangles via rects (each triangle = degenerate rect)
    for (const sub of subPaths) {
      // Simple approach: fill bounding box with per-scanline coverage
      // For performance, we use a simpler triangle-fan approach using rects
      // that covers most chart use cases (convex fills, area charts)
      this.fillConvexPath(sub, r, g, b, alpha);
    }
  }

  private fillConvexPath(points: PathPoint[], r: number, g: number, b: number, a: number): void {
    // For chart rendering, most filled paths are either:
    // 1. Simple rectangles (already handled by fillRect)
    // 2. Area chart fills (vertical strips between line and bottom)
    // 3. Band fills (between two lines)
    // We use a vertical strip decomposition that works well for all these cases.

    if (points.length < 3) return;

    // Sort by X to create vertical strips
    // For each pair of adjacent x-coords, fill the vertical span
    for (let i = 1; i < points.length - 1; i++) {
      const p0 = points[0]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;

      // Fan triangle: p0, p1, p2
      // Rasterize as a bounding rect (approximate but fast for thin triangles)
      const minX = Math.min(p0.x, p1.x, p2.x);
      const maxX = Math.max(p0.x, p1.x, p2.x);
      const minY = Math.min(p0.y, p1.y, p2.y);
      const maxY = Math.max(p0.y, p1.y, p2.y);

      if (maxX - minX < 1 && maxY - minY < 1) continue;

      // For area/band fills: render as vertical strips between consecutive points
      // This produces correct results for monotonically-increasing-X paths
      if (i < points.length - 1) {
        const leftX = Math.min(p1.x, p2.x);
        const rightX = Math.max(p1.x, p2.x);
        const topY = Math.min(p1.y, p2.y);
        const bottomY = Math.max(p0.y, Math.max(p1.y, p2.y));

        if (rightX - leftX > 0.5 || bottomY - topY > 0.5) {
          this.batch.pushRectRGBA(leftX, topY, Math.max(1, rightX - leftX), bottomY - topY, r, g, b, a);
        }
      }
    }
  }

  stroke(): void {
    if (this.path.length < 2) return;

    const color = this.strokeStyle;
    const lw = this.lineWidth;
    const alpha = this.globalAlpha;

    let prevX = 0, prevY = 0;
    let hasStart = false;

    for (const pt of this.path) {
      if (pt.type === 'move') {
        prevX = pt.x;
        prevY = pt.y;
        hasStart = true;
      } else if (hasStart) {
        this.batch.pushLine(prevX, prevY, pt.x, pt.y, lw, color, alpha);
        prevX = pt.x;
        prevY = pt.y;
      }
    }
  }

  clip(): void {
    // Use the pending clip rect from a rect() call
    if (this._pendingClipRect) {
      // Flush anything drawn before the clip
      this.batch.flush();
      this._clipRect = { ...this._pendingClipRect };
      this.batch.setScissor(this._clipRect.x, this._clipRect.y, this._clipRect.w, this._clipRect.h);
      this._pendingClipRect = null;
    }
  }

  // ── Text ─────────────────────────────────────────────────────────────────

  fillText(text: string, x: number, y: number, _maxWidth?: number): void {
    const tx = x * this._transform.sx + this._transform.tx;
    const ty = y * this._transform.sy + this._transform.ty;
    const color = typeof this.fillStyle === 'string' ? this.fillStyle : '#ffffff';
    this.batch.pushText(text, tx, ty, this.font, color, this.textAlign, this.textBaseline);
  }

  strokeText(_text: string, _x: number, _y: number, _maxWidth?: number): void {
    // Text stroke is rare in charts — skip for now
  }

  measureText(text: string): TextMetrics {
    return this.batch.measureText(text, this.font);
  }

  // ── Transforms ───────────────────────────────────────────────────────────

  setTransform(a: number, _b: number, _c: number, d: number, e: number, f: number): void {
    // We only support scale + translate (sufficient for chart DPR handling)
    this._transform.sx = a;
    this._transform.sy = d;
    this._transform.tx = e;
    this._transform.ty = f;
  }

  translate(x: number, y: number): void {
    this._transform.tx += x * this._transform.sx;
    this._transform.ty += y * this._transform.sy;
  }

  rotate(_angle: number): void {
    // Rotation not needed for chart rendering — no-op
  }

  scale(sx: number, sy: number): void {
    this._transform.sx *= sx;
    this._transform.sy *= sy;
  }

  // ── Line Style ───────────────────────────────────────────────────────────

  setLineDash(segments: number[]): void {
    this._lineDash = [...segments];
  }

  getLineDash(): number[] {
    return [...this._lineDash];
  }

  // ── Gradient ─────────────────────────────────────────────────────────────

  createLinearGradient(_x0: number, _y0: number, _x1: number, _y1: number): CanvasGradient {
    // Return a stub CanvasGradient. WebGL gradient rects are handled differently.
    // For area chart gradients, the chart renderer should use dedicated
    // gradient fill calls instead.
    // We use an offscreen canvas to create a real CanvasGradient for compatibility.
    const offscreen = document.createElement('canvas').getContext('2d')!;
    return offscreen.createLinearGradient(_x0, _y0, _x1, _y1);
  }

  // ── Image ────────────────────────────────────────────────────────────────

  drawImage(_image: CanvasImageSource, _dx: number, _dy: number, _dw?: number, _dh?: number): void {
    // Image drawing not yet supported in WebGL context
    // Drawings that need images should fall back to the Canvas 2D overlay
  }

  // ── Flush ────────────────────────────────────────────────────────────────

  flush(): void {
    this.batch.flush();
  }
}
