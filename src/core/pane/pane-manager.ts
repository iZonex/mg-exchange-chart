// ── Pane Manager ────────────────────────────────────────────────────────────
// Manages vertical pane stack: main price pane + oscillator panes below.
// Handles layout computation and resize handle hit-testing.

import type { Pane } from './pane';

const MIN_PANE_HEIGHT = 60;
const OSCILLATOR_DEFAULT_RATIO = 0.15; // 15% of total height
const MIN_MAIN_PANE_RATIO = 0.30; // Main pane never goes below 30%

export class PaneManager {
  private panes: Pane[] = [];
  private totalHeight = 0;

  constructor() {
    // Start with main pane only
    this.panes = [{
      id: 'main',
      type: 'main',
      indicatorIds: [],
      heightRatio: 1,
      yOffset: 0,
      height: 0,
      scaleMin: 0,
      scaleMax: 1,
    }];
  }

  /** Add an oscillator pane for an indicator */
  addOscillatorPane(indicatorId: string): string {
    // Check if this indicator already has a pane
    for (const pane of this.panes) {
      if (pane.indicatorIds.includes(indicatorId)) return pane.id;
    }

    const id = `pane_${indicatorId}`;

    // Calculate how much space oscillators can take
    const mainPane = this.panes.find(p => p.type === 'main')!;
    const oscCount = this.panes.filter(p => p.type === 'indicator').length + 1;
    // Each oscillator gets equal share of the non-main space
    const maxOscSpace = 1 - MIN_MAIN_PANE_RATIO;
    const oscRatio = Math.min(OSCILLATOR_DEFAULT_RATIO, maxOscSpace / oscCount);

    // Redistribute: main pane gets what's left
    const totalOscRatio = oscRatio * oscCount;
    mainPane.heightRatio = 1 - totalOscRatio;
    for (const pane of this.panes) {
      if (pane.type === 'indicator') pane.heightRatio = oscRatio;
    }

    this.panes.push({
      id,
      type: 'indicator',
      indicatorIds: [indicatorId],
      heightRatio: oscRatio,
      yOffset: 0,
      height: 0,
      scaleMin: 0,
      scaleMax: 100,
    });

    this.recomputeLayout();
    return id;
  }

  /** Remove an oscillator pane */
  removePane(indicatorId: string): void {
    const idx = this.panes.findIndex(p => p.indicatorIds.includes(indicatorId));
    if (idx === -1) return;

    const pane = this.panes[idx]!;
    // Remove indicator from pane
    pane.indicatorIds = pane.indicatorIds.filter(id => id !== indicatorId);

    // If pane has no more indicators, remove it
    if (pane.indicatorIds.length === 0 && pane.type === 'indicator') {
      const freedRatio = pane.heightRatio;
      this.panes.splice(idx, 1);
      // Redistribute freed space to remaining panes
      const totalRemaining = this.panes.reduce((s, p) => s + p.heightRatio, 0);
      for (const p of this.panes) {
        p.heightRatio = p.heightRatio / totalRemaining * (totalRemaining + freedRatio);
      }
    }

    this.recomputeLayout();
  }

  /** Set total available height and recompute layout */
  setHeight(totalHeight: number): void {
    this.totalHeight = totalHeight;
    this.recomputeLayout();
  }

  /** Get all panes */
  getAll(): readonly Pane[] {
    return this.panes;
  }

  /** Get main pane */
  getMain(): Pane {
    return this.panes.find(p => p.type === 'main')!;
  }

  /** Get pane at a Y coordinate */
  getPaneAtY(y: number): Pane | undefined {
    for (const pane of this.panes) {
      if (y >= pane.yOffset && y < pane.yOffset + pane.height) return pane;
    }
    return undefined;
  }

  /** Get pane by indicator ID */
  getPaneForIndicator(indicatorId: string): Pane | undefined {
    return this.panes.find(p => p.indicatorIds.includes(indicatorId));
  }

  /** Update Y-axis scale for a pane */
  setScale(paneId: string, min: number, max: number): void {
    const pane = this.panes.find(p => p.id === paneId);
    if (pane) {
      pane.scaleMin = min;
      pane.scaleMax = max;
    }
  }

  /** Check if Y is near a resize handle between panes */
  getResizeHandle(y: number, threshold = 4): { index: number; y: number } | null {
    for (let i = 0; i < this.panes.length - 1; i++) {
      const borderY = this.panes[i]!.yOffset + this.panes[i]!.height;
      if (Math.abs(y - borderY) < threshold) {
        return { index: i, y: borderY };
      }
    }
    return null;
  }

  /** Resize panes by dragging the border between pane[index] and pane[index+1] */
  resizeAt(index: number, deltaY: number): void {
    const upper = this.panes[index];
    const lower = this.panes[index + 1];
    if (!upper || !lower) return;

    const deltaRatio = deltaY / this.totalHeight;
    const newUpperRatio = upper.heightRatio + deltaRatio;
    const newLowerRatio = lower.heightRatio - deltaRatio;

    const minRatio = MIN_PANE_HEIGHT / this.totalHeight;
    if (newUpperRatio < minRatio || newLowerRatio < minRatio) return;

    upper.heightRatio = newUpperRatio;
    lower.heightRatio = newLowerRatio;
    this.recomputeLayout();
  }

  private recomputeLayout(): void {
    let yOffset = 0;
    for (const pane of this.panes) {
      pane.height = Math.round(this.totalHeight * pane.heightRatio);
      pane.yOffset = yOffset;
      yOffset += pane.height;
    }
  }
}
