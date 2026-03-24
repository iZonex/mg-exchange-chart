// ── Render Context ─────────────────────────────────────────────────────────
// Abstract rendering interface. Mirrors the Canvas 2D API subset used by
// chart renderers. Both Canvas2D and WebGL backends implement this,
// allowing zero-change swap of rendering backend.

export interface RenderContext {
  // ── State ────────────────────────────────────────────────────────────────
  fillStyle: string | CanvasGradient;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  globalAlpha: number;
  lineDashOffset: number;
  lineJoin: CanvasLineJoin;
  lineCap: CanvasLineCap;

  // ── State stack ──────────────────────────────────────────────────────────
  save(): void;
  restore(): void;

  // ── Rectangles ───────────────────────────────────────────────────────────
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;

  // ── Path ─────────────────────────────────────────────────────────────────
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  rect(x: number, y: number, w: number, h: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, ccw?: boolean): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  ellipse(x: number, y: number, rx: number, ry: number, rotation: number, startAngle: number, endAngle: number, ccw?: boolean): void;

  // ── Drawing ──────────────────────────────────────────────────────────────
  fill(): void;
  stroke(): void;
  clip(): void;

  // ── Text ─────────────────────────────────────────────────────────────────
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  strokeText(text: string, x: number, y: number, maxWidth?: number): void;
  measureText(text: string): TextMetrics;

  // ── Transforms ───────────────────────────────────────────────────────────
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(sx: number, sy: number): void;

  // ── Line style ───────────────────────────────────────────────────────────
  setLineDash(segments: number[]): void;
  getLineDash(): number[];

  // ── Gradient ─────────────────────────────────────────────────────────────
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;

  // ── Compositing ──────────────────────────────────────────────────────────
  set globalCompositeOperation(op: GlobalCompositeOperation);
  get globalCompositeOperation(): GlobalCompositeOperation;

  // ── Pixel manipulation ───────────────────────────────────────────────────
  drawImage(image: CanvasImageSource, dx: number, dy: number): void;
  drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;

  // ── Flush (WebGL-specific: submits batched draw calls) ───────────────────
  flush(): void;
}

/** Thin wrapper over CanvasRenderingContext2D — zero overhead, just delegates */
export class Canvas2DRenderContext implements RenderContext {
  constructor(public readonly ctx: CanvasRenderingContext2D) {}

  get fillStyle(): string | CanvasGradient { return this.ctx.fillStyle as string | CanvasGradient; }
  set fillStyle(v: string | CanvasGradient) { this.ctx.fillStyle = v; }

  get strokeStyle(): string { return this.ctx.strokeStyle as string; }
  set strokeStyle(v: string) { this.ctx.strokeStyle = v; }

  get lineWidth(): number { return this.ctx.lineWidth; }
  set lineWidth(v: number) { this.ctx.lineWidth = v; }

  get font(): string { return this.ctx.font; }
  set font(v: string) { this.ctx.font = v; }

  get textAlign(): CanvasTextAlign { return this.ctx.textAlign; }
  set textAlign(v: CanvasTextAlign) { this.ctx.textAlign = v; }

  get textBaseline(): CanvasTextBaseline { return this.ctx.textBaseline; }
  set textBaseline(v: CanvasTextBaseline) { this.ctx.textBaseline = v; }

  get globalAlpha(): number { return this.ctx.globalAlpha; }
  set globalAlpha(v: number) { this.ctx.globalAlpha = v; }

  get lineDashOffset(): number { return this.ctx.lineDashOffset; }
  set lineDashOffset(v: number) { this.ctx.lineDashOffset = v; }

  get lineJoin(): CanvasLineJoin { return this.ctx.lineJoin; }
  set lineJoin(v: CanvasLineJoin) { this.ctx.lineJoin = v; }

  get lineCap(): CanvasLineCap { return this.ctx.lineCap; }
  set lineCap(v: CanvasLineCap) { this.ctx.lineCap = v; }

  get globalCompositeOperation(): GlobalCompositeOperation { return this.ctx.globalCompositeOperation as GlobalCompositeOperation; }
  set globalCompositeOperation(v: GlobalCompositeOperation) { this.ctx.globalCompositeOperation = v; }

  save(): void { this.ctx.save(); }
  restore(): void { this.ctx.restore(); }

  fillRect(x: number, y: number, w: number, h: number): void { this.ctx.fillRect(x, y, w, h); }
  strokeRect(x: number, y: number, w: number, h: number): void { this.ctx.strokeRect(x, y, w, h); }
  clearRect(x: number, y: number, w: number, h: number): void { this.ctx.clearRect(x, y, w, h); }

  beginPath(): void { this.ctx.beginPath(); }
  moveTo(x: number, y: number): void { this.ctx.moveTo(x, y); }
  lineTo(x: number, y: number): void { this.ctx.lineTo(x, y); }
  closePath(): void { this.ctx.closePath(); }
  rect(x: number, y: number, w: number, h: number): void { this.ctx.rect(x, y, w, h); }
  arc(x: number, y: number, r: number, sa: number, ea: number, ccw?: boolean): void { this.ctx.arc(x, y, r, sa, ea, ccw); }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void { this.ctx.quadraticCurveTo(cpx, cpy, x, y); }
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void { this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y); }
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, sa: number, ea: number, ccw?: boolean): void { this.ctx.ellipse(x, y, rx, ry, rot, sa, ea, ccw); }

  fill(): void { this.ctx.fill(); }
  stroke(): void { this.ctx.stroke(); }
  clip(): void { this.ctx.clip(); }

  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    if (maxWidth !== undefined) this.ctx.fillText(text, x, y, maxWidth);
    else this.ctx.fillText(text, x, y);
  }
  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    if (maxWidth !== undefined) this.ctx.strokeText(text, x, y, maxWidth);
    else this.ctx.strokeText(text, x, y);
  }
  measureText(text: string): TextMetrics { return this.ctx.measureText(text); }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void { this.ctx.setTransform(a, b, c, d, e, f); }
  translate(x: number, y: number): void { this.ctx.translate(x, y); }
  rotate(angle: number): void { this.ctx.rotate(angle); }
  scale(sx: number, sy: number): void { this.ctx.scale(sx, sy); }

  setLineDash(segments: number[]): void { this.ctx.setLineDash(segments); }
  getLineDash(): number[] { return this.ctx.getLineDash(); }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient { return this.ctx.createLinearGradient(x0, y0, x1, y1); }

  drawImage(image: CanvasImageSource, dx: number, dy: number, dw?: number, dh?: number): void {
    if (dw !== undefined && dh !== undefined) this.ctx.drawImage(image, dx, dy, dw, dh);
    else this.ctx.drawImage(image, dx, dy);
  }

  /** No-op for Canvas 2D — drawing is immediate */
  flush(): void {}
}
