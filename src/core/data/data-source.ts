// ── DataSource ──────────────────────────────────────────────────────────────
// Manages OHLCV bar data: stores, appends (real-time), prepends (scroll-back),
// and provides efficient range lookups by time.

import type { Bar } from '../../api/types';

export class DataSource {
  /** Bars sorted by time ascending */
  private bars: Bar[] = [];
  /** Map timestamp → index for O(1) lookup */
  private timeIndex = new Map<number, number>();

  get length(): number { return this.bars.length; }

  get first(): Bar | undefined { return this.bars[0]; }
  get last(): Bar | undefined { return this.bars[this.bars.length - 1]; }

  /** Replace all data */
  setData(bars: Bar[]): void {
    this.bars = bars.slice().sort((a, b) => a.time - b.time);
    this.rebuildIndex();
  }

  /** Add bars to the beginning (scroll-back / history load) */
  prepend(bars: Bar[]): void {
    if (bars.length === 0) return;
    const sorted = bars.slice().sort((a, b) => a.time - b.time);
    // Filter out bars we already have
    const firstTime = this.bars[0]?.time ?? Infinity;
    const newBars = sorted.filter(b => b.time < firstTime);
    if (newBars.length === 0) return;
    this.bars = [...newBars, ...this.bars];
    this.rebuildIndex();
  }

  /** Add or update the last bar (real-time tick) */
  updateLast(bar: Bar): void {
    if (this.bars.length === 0) {
      this.bars.push(bar);
      this.timeIndex.set(bar.time, 0);
      return;
    }
    const last = this.bars[this.bars.length - 1]!;
    if (bar.time === last.time) {
      // Update existing bar in place
      this.bars[this.bars.length - 1] = bar;
    } else if (bar.time > last.time) {
      // New bar
      this.timeIndex.set(bar.time, this.bars.length);
      this.bars.push(bar);
    }
  }

  /** Get bar at index */
  getBar(index: number): Bar | undefined {
    return this.bars[index];
  }

  /** Get bar by timestamp */
  getBarByTime(time: number): Bar | undefined {
    const idx = this.timeIndex.get(time);
    return idx !== undefined ? this.bars[idx] : undefined;
  }

  /** Get index of bar by timestamp (or -1) */
  indexOfTime(time: number): number {
    return this.timeIndex.get(time) ?? -1;
  }

  /**
   * Find the bar index nearest to a given timestamp.
   * Uses binary search for O(log n).
   */
  nearestIndex(time: number): number {
    if (this.bars.length === 0) return -1;
    let lo = 0;
    let hi = this.bars.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.bars[mid]!.time < time) lo = mid + 1;
      else hi = mid;
    }
    // Check if previous index is closer
    if (lo > 0) {
      const diffLo = Math.abs(this.bars[lo]!.time - time);
      const diffPrev = Math.abs(this.bars[lo - 1]!.time - time);
      if (diffPrev < diffLo) return lo - 1;
    }
    return lo;
  }

  /** Get slice of bars by index range [from, to) */
  getRange(from: number, to: number): Bar[] {
    return this.bars.slice(Math.max(0, from), Math.min(this.bars.length, to));
  }

  /** Get all bars whose time is within [timeFrom, timeTo] */
  getRangeByTime(timeFrom: number, timeTo: number): Bar[] {
    const startIdx = this.nearestIndex(timeFrom);
    if (startIdx === -1) return [];
    const endIdx = this.nearestIndex(timeTo);

    // Expand range to include boundary bars
    const from = this.bars[startIdx]!.time >= timeFrom ? startIdx : startIdx + 1;
    const to = endIdx + 1;
    return this.bars.slice(Math.max(0, from), Math.min(this.bars.length, to));
  }

  /** Get min/max price in an index range [from, to) */
  getPriceRange(from: number, to: number): { min: number; max: number } | null {
    const start = Math.max(0, from);
    const end = Math.min(this.bars.length, to);
    if (start >= end) return null;

    let min = Infinity;
    let max = -Infinity;
    for (let i = start; i < end; i++) {
      const bar = this.bars[i]!;
      if (bar.low < min) min = bar.low;
      if (bar.high > max) max = bar.high;
    }
    return { min, max };
  }

  /** Get max volume in an index range [from, to) */
  getMaxVolume(from: number, to: number): number {
    const start = Math.max(0, from);
    const end = Math.min(this.bars.length, to);
    let maxVol = 0;
    for (let i = start; i < end; i++) {
      if (this.bars[i]!.volume > maxVol) maxVol = this.bars[i]!.volume;
    }
    return maxVol;
  }

  /** Get all bars (readonly view) */
  getAllBars(): readonly Bar[] {
    return this.bars;
  }

  private rebuildIndex(): void {
    this.timeIndex.clear();
    for (let i = 0; i < this.bars.length; i++) {
      this.timeIndex.set(this.bars[i]!.time, i);
    }
  }
}
