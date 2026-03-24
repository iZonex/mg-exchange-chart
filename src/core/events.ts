// ── Event Emitter ───────────────────────────────────────────────────────────
// Typed event system for chart public API.
// Supports on/off/once with type-safe event names and payloads.

import type { Bar, Point, Timeframe } from '../api/types';

export interface ChartEventMap {
  crosshairMove: { time: number; price: number; bar?: Bar };
  click: { time: number; price: number };
  symbolChange: string;
  timeframeChange: Timeframe;
  chartTypeChange: string;
  drawingAdded: { id: string; tool: string; points: Point[] };
  drawingRemoved: string;
  drawingModified: { id: string; points: Point[] };
  visibleRangeChange: { from: number; to: number };
  indicatorAdded: { id: string; name: string };
  indicatorRemoved: string;
  dataLoaded: { symbol: string; bars: number };
  barUpdate: Bar;
  drawingSelected: { id: string; drawing: any; clientX: number; clientY: number };
  drawingDeselected: undefined;
  textInputRequested: { drawingId: string; toolName: string; clientX: number; clientY: number; currentText: string; color: string; lineWidth: number };
  tradeRequested: { side: 'buy' | 'sell'; price: number; type: 'market' | 'limit'; action?: string };
  orderLineMoved: { id: string; price: number };
}

type Listener<T> = (data: T) => void;

export class EventEmitter {
  private listeners = new Map<string, Set<Listener<any>>>();

  /** Subscribe to an event */
  on<K extends keyof ChartEventMap>(event: K, listener: Listener<ChartEventMap[K]>): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
  }

  /** Unsubscribe from an event */
  off<K extends keyof ChartEventMap>(event: K, listener: Listener<ChartEventMap[K]>): void {
    const set = this.listeners.get(event);
    if (set) set.delete(listener);
  }

  /** Subscribe to an event — fires once then auto-unsubscribes */
  once<K extends keyof ChartEventMap>(event: K, listener: Listener<ChartEventMap[K]>): void {
    const wrapper = (data: ChartEventMap[K]) => {
      this.off(event, wrapper);
      listener(data);
    };
    this.on(event, wrapper);
  }

  /** Emit an event to all listeners */
  emit<K extends keyof ChartEventMap>(event: K, data: ChartEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      listener(data);
    }
  }

  /** Remove all listeners */
  removeAll(): void {
    this.listeners.clear();
  }
}
