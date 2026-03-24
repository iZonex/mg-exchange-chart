// ── Scroll & Zoom ───────────────────────────────────────────────────────────
// Mouse drag to pan, wheel to zoom, pinch-to-zoom on touch.
// Modifies TimeScale state and triggers re-render via callback.

import type { TimeScale } from '../renderer/time-axis';

const MIN_BAR_SPACING = 2;
const MAX_BAR_SPACING = 60;
const DEFAULT_BAR_SPACING = 8;
const ZOOM_SENSITIVITY = 0.004;
const MOMENTUM_FRICTION = 0.92;
const MOMENTUM_MIN_VELOCITY = 0.5;

export interface ScrollZoomState {
  timeScale: TimeScale;
  totalBars: number;
}

export type OnScaleChange = (scale: TimeScale) => void;

export class ScrollZoomHandler {
  private isDragging = false;
  private lastMouseX = 0;
  private momentumVelocity = 0;
  private momentumRaf = 0;
  private pinchStartDist = 0;
  private pinchStartSpacing = 0;

  private state: ScrollZoomState;
  private onChange: OnScaleChange;
  private element: HTMLElement;
  enabled = true;

  constructor(element: HTMLElement, state: ScrollZoomState, onChange: OnScaleChange) {
    this.element = element;
    this.state = state;
    this.onChange = onChange;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    element.addEventListener('mousedown', this.onMouseDown);
    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('touchstart', this.onTouchStart, { passive: false });
    element.addEventListener('touchmove', this.onTouchMove, { passive: false });
    element.addEventListener('touchend', this.onTouchEnd);
  }

  updateState(state: ScrollZoomState): void {
    this.state = state;
  }

  destroy(): void {
    this.element.removeEventListener('mousedown', this.onMouseDown);
    this.element.removeEventListener('wheel', this.onWheel);
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchmove', this.onTouchMove);
    this.element.removeEventListener('touchend', this.onTouchEnd);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    cancelAnimationFrame(this.momentumRaf);
  }

  // ── Mouse ─────────────────────────────────────────────────────────────────

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0 || !this.enabled) return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.momentumVelocity = 0;
    cancelAnimationFrame(this.momentumRaf);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    this.momentumVelocity = dx;
    this.lastMouseX = e.clientX;
    this.pan(dx);
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    this.startMomentum();
  }

  // ── Wheel (zoom) ──────────────────────────────────────────────────────────

  private onWheel(e: WheelEvent): void {
    if (!this.enabled) return;
    e.preventDefault();
    const rect = this.element.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    this.zoom(delta, mouseX);
  }

  // ── Touch ─────────────────────────────────────────────────────────────────

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0]!.clientX;
      this.momentumVelocity = 0;
      cancelAnimationFrame(this.momentumRaf);
    } else if (e.touches.length === 2) {
      e.preventDefault();
      this.isDragging = false;
      this.pinchStartDist = this.getTouchDist(e.touches);
      this.pinchStartSpacing = this.state.timeScale.barSpacing;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0]!.clientX - this.lastMouseX;
      this.momentumVelocity = dx;
      this.lastMouseX = e.touches[0]!.clientX;
      this.pan(dx);
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dist = this.getTouchDist(e.touches);
      const ratio = dist / this.pinchStartDist;
      const newSpacing = clamp(this.pinchStartSpacing * ratio, MIN_BAR_SPACING, MAX_BAR_SPACING);
      const center = (e.touches[0]!.clientX + e.touches[1]!.clientX) / 2;
      const rect = this.element.getBoundingClientRect();
      this.zoomTo(newSpacing, center - rect.left);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (e.touches.length === 0) {
      this.isDragging = false;
      this.startMomentum();
    }
  }

  private getTouchDist(touches: TouchList): number {
    const dx = touches[0]!.clientX - touches[1]!.clientX;
    const dy = touches[0]!.clientY - touches[1]!.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Pan & Zoom logic ──────────────────────────────────────────────────────

  private pan(dx: number): void {
    const scale = this.state.timeScale;
    const barShift = dx / scale.barSpacing;
    const newFirst = scale.firstIndex - barShift;
    this.applyScale({
      ...scale,
      firstIndex: this.clampFirstIndex(newFirst, scale.barSpacing),
    });
  }

  private zoom(delta: number, centerX: number): void {
    const scale = this.state.timeScale;
    const newSpacing = clamp(scale.barSpacing * (1 + delta), MIN_BAR_SPACING, MAX_BAR_SPACING);
    this.zoomTo(newSpacing, centerX);
  }

  private zoomTo(newSpacing: number, centerX: number): void {
    const scale = this.state.timeScale;
    // Keep the bar under the cursor stationary
    const barUnderCursor = scale.firstIndex + (centerX - scale.offsetX) / scale.barSpacing;
    const newFirstIndex = barUnderCursor - (centerX - scale.offsetX) / newSpacing;

    this.applyScale({
      ...scale,
      barSpacing: newSpacing,
      firstIndex: this.clampFirstIndex(newFirstIndex, newSpacing),
      visibleCount: Math.ceil(this.element.clientWidth / newSpacing),
    });
  }

  private clampFirstIndex(index: number, barSpacing: number): number {
    const visibleBars = Math.ceil(this.element.clientWidth / barSpacing);
    // Allow some right padding (empty space after last bar)
    const maxFirst = Math.max(0, this.state.totalBars - Math.floor(visibleBars * 0.2));
    // Allow scrolling left beyond first bar for left padding
    const minFirst = -Math.floor(visibleBars * 0.8);
    return clamp(index, minFirst, maxFirst);
  }

  private applyScale(scale: TimeScale): void {
    this.state.timeScale = scale;
    this.onChange(scale);
  }

  // ── Momentum ──────────────────────────────────────────────────────────────

  private startMomentum(): void {
    if (Math.abs(this.momentumVelocity) < MOMENTUM_MIN_VELOCITY) return;

    const tick = () => {
      this.momentumVelocity *= MOMENTUM_FRICTION;
      if (Math.abs(this.momentumVelocity) < MOMENTUM_MIN_VELOCITY) return;
      this.pan(this.momentumVelocity);
      this.momentumRaf = requestAnimationFrame(tick);
    };
    this.momentumRaf = requestAnimationFrame(tick);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createDefaultTimeScale(totalBars: number, chartWidth: number): TimeScale {
  const barSpacing = DEFAULT_BAR_SPACING;
  const visibleCount = Math.ceil(chartWidth / barSpacing);
  return {
    firstIndex: Math.max(0, totalBars - visibleCount),
    visibleCount,
    barSpacing,
    offsetX: 0,
  };
}
