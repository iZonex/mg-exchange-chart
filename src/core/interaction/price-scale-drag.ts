// ── Price Scale Drag ────────────────────────────────────────────────────────
// Drag on the price axis (right side) to zoom the Y-axis.
// Drag up = compress (see more price range), drag down = expand (zoom in on price).
// Double-click = auto-fit to visible data.


export interface PriceScaleDragCallbacks {
  onScale: (factor: number) => void;
  onAutoFit: () => void;
}

export class PriceScaleDragHandler {
  private isDragging = false;
  private lastY = 0;
  private element: HTMLElement;
  private chartWidth: number;
  private callbacks: PriceScaleDragCallbacks;

  constructor(element: HTMLElement, chartWidth: number, callbacks: PriceScaleDragCallbacks) {
    this.element = element;
    this.chartWidth = chartWidth;
    this.callbacks = callbacks;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onDblClick = this.onDblClick.bind(this);

    element.addEventListener('mousedown', this.onMouseDown);
    element.addEventListener('dblclick', this.onDblClick);
  }

  updateChartWidth(w: number): void {
    this.chartWidth = w;
  }

  private isOnPriceAxis(x: number): boolean {
    return x >= this.chartWidth;
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (!this.isOnPriceAxis(x)) return;

    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.lastY = e.clientY;
    this.element.style.cursor = 'ns-resize';

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dy = e.clientY - this.lastY;
    this.lastY = e.clientY;
    // dy > 0 = dragging down = expand price range (zoom out)
    // dy < 0 = dragging up = compress price range (zoom in)
    const factor = 1 + dy * 0.005;
    this.callbacks.onScale(factor);
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.element.style.cursor = '';
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  private onDblClick(e: MouseEvent): void {
    const rect = this.element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (!this.isOnPriceAxis(x)) return;
    this.callbacks.onAutoFit();
  }

  destroy(): void {
    this.element.removeEventListener('mousedown', this.onMouseDown);
    this.element.removeEventListener('dblclick', this.onDblClick);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}
