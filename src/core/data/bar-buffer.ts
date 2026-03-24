// ── Bar Buffer (TypedArray) ──────────────────────────────────────────────────
// Cache-friendly, GC-free storage for OHLCV data using Float64Array.
// 6 fields per bar: time, open, high, low, close, volume.
// Used internally by DataSource for high-performance access.

import type { Bar } from '../../api/types';

const FIELDS_PER_BAR = 6;
const INITIAL_CAPACITY = 2048;
const GROWTH_FACTOR = 2;

// Field offsets
const T = 0, O = 1, H = 2, L = 3, C = 4, V = 5;

export class BarBuffer {
  private data: Float64Array;
  private _length = 0;

  get length(): number { return this._length; }
  get capacity(): number { return this.data.length / FIELDS_PER_BAR; }

  constructor(capacity = INITIAL_CAPACITY) {
    this.data = new Float64Array(capacity * FIELDS_PER_BAR);
  }

  /** Set from Bar array — replaces all data */
  setFromBars(bars: Bar[]): void {
    this.ensureCapacity(bars.length);
    this._length = bars.length;
    for (let i = 0; i < bars.length; i++) {
      const off = i * FIELDS_PER_BAR;
      const b = bars[i]!;
      this.data[off + T] = b.time;
      this.data[off + O] = b.open;
      this.data[off + H] = b.high;
      this.data[off + L] = b.low;
      this.data[off + C] = b.close;
      this.data[off + V] = b.volume;
    }
  }

  /** Get a Bar object at index (allocates — use field accessors in hot paths) */
  getBar(index: number): Bar | undefined {
    if (index < 0 || index >= this._length) return undefined;
    const off = index * FIELDS_PER_BAR;
    return {
      time: this.data[off + T]!,
      open: this.data[off + O]!,
      high: this.data[off + H]!,
      low: this.data[off + L]!,
      close: this.data[off + C]!,
      volume: this.data[off + V]!,
    };
  }

  // ── Zero-allocation field accessors ───────────────────────────────────────

  time(index: number): number { return this.data[index * FIELDS_PER_BAR + T]!; }
  open(index: number): number { return this.data[index * FIELDS_PER_BAR + O]!; }
  high(index: number): number { return this.data[index * FIELDS_PER_BAR + H]!; }
  low(index: number): number { return this.data[index * FIELDS_PER_BAR + L]!; }
  close(index: number): number { return this.data[index * FIELDS_PER_BAR + C]!; }
  volume(index: number): number { return this.data[index * FIELDS_PER_BAR + V]!; }

  /** Append a bar at the end */
  push(bar: Bar): void {
    this.ensureCapacity(this._length + 1);
    const off = this._length * FIELDS_PER_BAR;
    this.data[off + T] = bar.time;
    this.data[off + O] = bar.open;
    this.data[off + H] = bar.high;
    this.data[off + L] = bar.low;
    this.data[off + C] = bar.close;
    this.data[off + V] = bar.volume;
    this._length++;
  }

  /** Update bar at index in place (zero allocation) */
  updateAt(index: number, bar: Bar): void {
    if (index < 0 || index >= this._length) return;
    const off = index * FIELDS_PER_BAR;
    this.data[off + T] = bar.time;
    this.data[off + O] = bar.open;
    this.data[off + H] = bar.high;
    this.data[off + L] = bar.low;
    this.data[off + C] = bar.close;
    this.data[off + V] = bar.volume;
  }

  /** Get price range (min low, max high) for index range [from, to) */
  getPriceRange(from: number, to: number): { min: number; max: number } | null {
    const start = Math.max(0, from);
    const end = Math.min(this._length, to);
    if (start >= end) return null;

    let min = Infinity;
    let max = -Infinity;
    for (let i = start; i < end; i++) {
      const off = i * FIELDS_PER_BAR;
      const lo = this.data[off + L]!;
      const hi = this.data[off + H]!;
      if (lo < min) min = lo;
      if (hi > max) max = hi;
    }
    return { min, max };
  }

  /** Get max volume in range [from, to) */
  getMaxVolume(from: number, to: number): number {
    const start = Math.max(0, from);
    const end = Math.min(this._length, to);
    let maxVol = 0;
    for (let i = start; i < end; i++) {
      const v = this.data[i * FIELDS_PER_BAR + V]!;
      if (v > maxVol) maxVol = v;
    }
    return maxVol;
  }

  /** Binary search for nearest index to a timestamp */
  nearestIndex(time: number): number {
    if (this._length === 0) return -1;
    let lo = 0;
    let hi = this._length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.data[mid * FIELDS_PER_BAR + T]! < time) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) {
      const diffLo = Math.abs(this.data[lo * FIELDS_PER_BAR + T]! - time);
      const diffPrev = Math.abs(this.data[(lo - 1) * FIELDS_PER_BAR + T]! - time);
      if (diffPrev < diffLo) return lo - 1;
    }
    return lo;
  }

  /** Prepend bars (for scroll-back history loading) */
  prepend(bars: Bar[]): void {
    if (bars.length === 0) return;
    const newLen = this._length + bars.length;
    this.ensureCapacity(newLen);

    // Shift existing data right
    this.data.copyWithin(
      bars.length * FIELDS_PER_BAR,
      0,
      this._length * FIELDS_PER_BAR,
    );

    // Write new bars at the beginning
    for (let i = 0; i < bars.length; i++) {
      const off = i * FIELDS_PER_BAR;
      const b = bars[i]!;
      this.data[off + T] = b.time;
      this.data[off + O] = b.open;
      this.data[off + H] = b.high;
      this.data[off + L] = b.low;
      this.data[off + C] = b.close;
      this.data[off + V] = b.volume;
    }
    this._length = newLen;
  }

  /** Get slice as Bar array */
  getRange(from: number, to: number): Bar[] {
    const start = Math.max(0, from);
    const end = Math.min(this._length, to);
    const result: Bar[] = [];
    for (let i = start; i < end; i++) {
      result.push(this.getBar(i)!);
    }
    return result;
  }

  private ensureCapacity(needed: number): void {
    if (needed <= this.capacity) return;
    let newCap = this.capacity;
    while (newCap < needed) newCap *= GROWTH_FACTOR;
    const newData = new Float64Array(newCap * FIELDS_PER_BAR);
    newData.set(this.data);
    this.data = newData;
  }
}
