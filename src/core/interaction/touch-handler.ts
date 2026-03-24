// ── Touch Handler ───────────────────────────────────────────────────────────
// Mobile-optimized touch interactions:
// - Single touch: pan with momentum
// - Long press (300ms): activate crosshair
// - Pinch: zoom
// - Double-tap: reset zoom to fit all data

const LONG_PRESS_DELAY = 300;
const DOUBLE_TAP_DELAY = 300;
const LONG_PRESS_THRESHOLD = 8; // max movement in px to still count as long-press

export interface TouchCallbacks {
  onPan: (dx: number) => void;
  onPinch: (scale: number, centerX: number) => void;
  onLongPress: (x: number, y: number) => void;
  onLongPressMove: (x: number, y: number) => void;
  onLongPressEnd: () => void;
  onDoubleTap: () => void;
  onMomentum: (velocity: number) => void;
}

export class TouchHandler {
  private element: HTMLElement;
  private callbacks: TouchCallbacks;

  private longPressTimer: number | null = null;
  private isLongPressing = false;
  private lastTapTime = 0;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private velocity = 0;
  private pinchStartDist = 0;

  constructor(element: HTMLElement, callbacks: TouchCallbacks) {
    this.element = element;
    this.callbacks = callbacks;

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    element.addEventListener('touchstart', this.onTouchStart, { passive: false });
    element.addEventListener('touchmove', this.onTouchMove, { passive: false });
    element.addEventListener('touchend', this.onTouchEnd, { passive: true });

    // Prevent iOS Safari elastic bounce and pinch-to-zoom on the chart
    element.style.touchAction = 'none';
    element.style.webkitUserSelect = 'none';
    (element.style as any).webkitTouchCallout = 'none';
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const touch = e.touches[0]!;
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.lastX = touch.clientX;
      this.velocity = 0;

      // Check double-tap
      const now = Date.now();
      if (now - this.lastTapTime < DOUBLE_TAP_DELAY) {
        this.callbacks.onDoubleTap();
        this.lastTapTime = 0;
        this.cancelLongPress();
        e.preventDefault();
        return;
      }
      this.lastTapTime = now;

      // Start long-press timer
      this.cancelLongPress();
      this.longPressTimer = window.setTimeout(() => {
        this.isLongPressing = true;
        const rect = this.element.getBoundingClientRect();
        this.callbacks.onLongPress(
          touch.clientX - rect.left,
          touch.clientY - rect.top,
        );
      }, LONG_PRESS_DELAY);

    } else if (e.touches.length === 2) {
      e.preventDefault();
      this.cancelLongPress();
      this.isLongPressing = false;
      this.pinchStartDist = this.getTouchDist(e.touches);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1) {
      const touch = e.touches[0]!;
      const dx = touch.clientX - this.lastX;

      // Cancel long-press if moved too far
      if (this.longPressTimer !== null) {
        const totalDx = Math.abs(touch.clientX - this.startX);
        const totalDy = Math.abs(touch.clientY - this.startY);
        if (totalDx > LONG_PRESS_THRESHOLD || totalDy > LONG_PRESS_THRESHOLD) {
          this.cancelLongPress();
        }
      }

      if (this.isLongPressing) {
        // Move crosshair
        e.preventDefault();
        const rect = this.element.getBoundingClientRect();
        this.callbacks.onLongPressMove(
          touch.clientX - rect.left,
          touch.clientY - rect.top,
        );
      } else if (this.longPressTimer === null) {
        // Pan
        e.preventDefault();
        this.velocity = dx;
        this.callbacks.onPan(dx);
      }

      this.lastX = touch.clientX;

    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dist = this.getTouchDist(e.touches);
      const scale = dist / this.pinchStartDist;
      const centerX = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2;
      const rect = this.element.getBoundingClientRect();
      this.callbacks.onPinch(scale, centerX - rect.left);
      this.pinchStartDist = dist;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    this.cancelLongPress();

    if (this.isLongPressing) {
      this.isLongPressing = false;
      this.callbacks.onLongPressEnd();
      return;
    }

    if (e.touches.length === 0 && Math.abs(this.velocity) > 1) {
      this.callbacks.onMomentum(this.velocity);
    }
  }

  private cancelLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private getTouchDist(touches: TouchList): number {
    const dx = touches[0]!.clientX - touches[1]!.clientX;
    const dy = touches[0]!.clientY - touches[1]!.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  destroy(): void {
    this.cancelLongPress();
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchmove', this.onTouchMove);
    this.element.removeEventListener('touchend', this.onTouchEnd);
  }
}
