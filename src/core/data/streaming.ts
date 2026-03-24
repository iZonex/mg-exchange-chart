// ── Streaming Handler ───────────────────────────────────────────────────────
// Manages real-time bar construction from tick data, auto-scroll on new bar,
// and reconnection logic.

import type { Bar, Tick, Timeframe, Datafeed, Unsubscribe } from '../../api/types';

export interface StreamingCallbacks {
  onBarUpdate: (bar: Bar) => void;
  onNewBar: (bar: Bar) => void;
  onReconnect: () => void;
}

/** Parse timeframe to seconds */
function timeframeToSeconds(tf: Timeframe): number {
  const map: Record<string, number> = {
    '1s': 1, '5s': 5, '15s': 15, '30s': 30,
    '1m': 60, '3m': 180, '5m': 300, '15m': 900, '30m': 1800,
    '1H': 3600, '2H': 7200, '4H': 14400, '6H': 21600, '8H': 28800, '12H': 43200,
    '1D': 86400, '3D': 259200, '1W': 604800, '1M': 2592000,
  };
  return map[tf] ?? 60;
}

/** Align timestamp to timeframe boundary */
function alignToTimeframe(time: number, intervalSeconds: number): number {
  return Math.floor(time / intervalSeconds) * intervalSeconds;
}

export class StreamingHandler {
  private unsubscribe: Unsubscribe | null = null;
  private currentBar: Bar | null = null;
  private intervalSeconds: number;
  private callbacks: StreamingCallbacks;
  private datafeed: Datafeed;
  private symbol: string;
  private timeframe: Timeframe;

  constructor(
    datafeed: Datafeed,
    symbol: string,
    timeframe: Timeframe,
    callbacks: StreamingCallbacks,
  ) {
    this.datafeed = datafeed;
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.callbacks = callbacks;
    this.intervalSeconds = timeframeToSeconds(timeframe);
  }

  /** Start streaming. Pass the last known bar to seed. */
  start(lastBar: Bar | null): void {
    this.currentBar = lastBar ? { ...lastBar } : null;

    this.unsubscribe = this.datafeed.subscribe({
      symbol: this.symbol,
      timeframe: this.timeframe,
      onBar: (bar) => {
        this.currentBar = { ...bar };
        this.callbacks.onNewBar(bar);
      },
      onTick: (tick) => {
        this.processTick(tick);
      },
    });
  }

  /** Stop streaming */
  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Restart with new symbol/timeframe */
  restart(symbol: string, timeframe: Timeframe, lastBar: Bar | null): void {
    this.stop();
    this.symbol = symbol;
    this.timeframe = timeframe;
    this.intervalSeconds = timeframeToSeconds(timeframe);
    this.start(lastBar);
  }

  private processTick(tick: Tick): void {
    const barTime = alignToTimeframe(tick.time, this.intervalSeconds);

    if (this.currentBar === null) {
      // First tick — create new bar
      this.currentBar = {
        time: barTime,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume,
      };
      this.callbacks.onNewBar(this.currentBar);
      return;
    }

    if (barTime > this.currentBar.time) {
      // New bar period — emit the completed bar and start a new one
      this.currentBar = {
        time: barTime,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume,
      };
      this.callbacks.onNewBar(this.currentBar);
    } else {
      // Update current bar
      this.currentBar.close = tick.price;
      this.currentBar.high = Math.max(this.currentBar.high, tick.price);
      this.currentBar.low = Math.min(this.currentBar.low, tick.price);
      this.currentBar.volume += tick.volume;
      this.callbacks.onBarUpdate({ ...this.currentBar });
    }
  }
}
