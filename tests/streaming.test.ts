// ── Streaming Handler Tests ─────────────────────────────────────────────────
// Tests for uncovered lines: onBar callback (59-60) and restart method (76-80).

import { describe, it, expect, vi } from 'vitest';
import { StreamingHandler } from '../src/core/data/streaming';
import type { Bar, Datafeed, Tick, Timeframe } from '../src/api/types';

function makeCallbacks() {
  return {
    onNewBar: vi.fn(),
    onBarUpdate: vi.fn(),
    onReconnect: vi.fn(),
  };
}

describe('StreamingHandler', () => {
  describe('onBar callback (lines 59-60)', () => {
    it('invokes onNewBar when datafeed emits onBar', () => {
      const callbacks = makeCallbacks();
      let capturedOnBar: ((bar: Bar) => void) | null = null;

      const mockDatafeed: Datafeed = {
        async getBars() { return []; },
        subscribe({ onBar }) {
          capturedOnBar = onBar!;
          return () => {};
        },
        async searchSymbols() { return []; },
      };

      const handler = new StreamingHandler(mockDatafeed, 'BTCUSDT', '1m', callbacks);
      handler.start(null);

      // Simulate the datafeed pushing a full bar via onBar
      const bar: Bar = { time: 1000, open: 100, high: 110, low: 90, close: 105, volume: 500 };
      capturedOnBar!(bar);

      expect(callbacks.onNewBar).toHaveBeenCalledWith(bar);
      // After onBar, currentBar should be set so subsequent ticks update it
      handler.stop();
    });

    it('sets currentBar from onBar so ticks update it', () => {
      const callbacks = makeCallbacks();
      let capturedOnBar: ((bar: Bar) => void) | null = null;
      let capturedOnTick: ((tick: Tick) => void) | null = null;

      const mockDatafeed: Datafeed = {
        async getBars() { return []; },
        subscribe({ onBar, onTick }) {
          capturedOnBar = onBar!;
          capturedOnTick = onTick!;
          return () => {};
        },
        async searchSymbols() { return []; },
      };

      const handler = new StreamingHandler(mockDatafeed, 'BTCUSDT', '1m', callbacks);
      handler.start(null);

      // Push a bar via onBar
      const bar: Bar = { time: 960, open: 100, high: 110, low: 90, close: 105, volume: 500 };
      capturedOnBar!(bar);

      // Now send a tick in the same period — should update current bar, not create new
      capturedOnTick!({ time: 1000, price: 108, volume: 10 });
      // The tick at time 1000 aligns to barTime 960 (floor(1000/60)*60=960) which equals currentBar.time
      // So it should call onBarUpdate
      expect(callbacks.onBarUpdate).toHaveBeenCalled();

      handler.stop();
    });
  });

  describe('restart method (lines 76-80)', () => {
    it('stops, updates symbol/timeframe, and starts with new params', () => {
      const callbacks = makeCallbacks();
      let subscribeCount = 0;
      let lastSubscribeParams: { symbol: string; timeframe: Timeframe } | null = null;
      let unsubscribeCalled = false;

      const mockDatafeed: Datafeed = {
        async getBars() { return []; },
        subscribe(params) {
          subscribeCount++;
          lastSubscribeParams = { symbol: params.symbol, timeframe: params.timeframe };
          return () => { unsubscribeCalled = true; };
        },
        async searchSymbols() { return []; },
      };

      const handler = new StreamingHandler(mockDatafeed, 'BTCUSDT', '1m', callbacks);
      handler.start(null);
      expect(subscribeCount).toBe(1);

      // Restart with new symbol and timeframe
      const lastBar: Bar = { time: 2000, open: 200, high: 210, low: 190, close: 205, volume: 100 };
      handler.restart('ETHUSDT', '5m', lastBar);

      // Should have unsubscribed the old one
      expect(unsubscribeCalled).toBe(true);
      // Should have subscribed again
      expect(subscribeCount).toBe(2);
      // New subscribe should use updated symbol/timeframe
      expect(lastSubscribeParams!.symbol).toBe('ETHUSDT');
      expect(lastSubscribeParams!.timeframe).toBe('5m');

      handler.stop();
    });

    it('uses new timeframe interval for tick processing after restart', () => {
      const callbacks = makeCallbacks();
      let capturedOnTick: ((tick: Tick) => void) | null = null;

      const mockDatafeed: Datafeed = {
        async getBars() { return []; },
        subscribe({ onTick }) {
          capturedOnTick = onTick!;
          return () => {};
        },
        async searchSymbols() { return []; },
      };

      const handler = new StreamingHandler(mockDatafeed, 'BTCUSDT', '1m', callbacks);

      // Restart with 5m timeframe (300 seconds)
      const lastBar: Bar = { time: 0, open: 100, high: 110, low: 90, close: 105, volume: 500 };
      handler.restart('ETHUSDT', '5m', lastBar);

      // Send tick at time 300 — should be a new bar for 5m (alignToTimeframe(300, 300)=300 > 0)
      capturedOnTick!({ time: 300, price: 120, volume: 20 });
      expect(callbacks.onNewBar).toHaveBeenCalled();

      handler.stop();
    });
  });

  describe('start with lastBar seeding', () => {
    it('seeds currentBar from lastBar parameter', () => {
      const callbacks = makeCallbacks();
      let capturedOnTick: ((tick: Tick) => void) | null = null;

      const mockDatafeed: Datafeed = {
        async getBars() { return []; },
        subscribe({ onTick }) {
          capturedOnTick = onTick!;
          return () => {};
        },
        async searchSymbols() { return []; },
      };

      const handler = new StreamingHandler(mockDatafeed, 'BTCUSDT', '1m', callbacks);
      const lastBar: Bar = { time: 960, open: 100, high: 110, low: 90, close: 105, volume: 500 };
      handler.start(lastBar);

      // Tick in the same bar period — should update, not create new bar
      capturedOnTick!({ time: 1000, price: 108, volume: 10 });
      expect(callbacks.onBarUpdate).toHaveBeenCalled();
      expect(callbacks.onNewBar).not.toHaveBeenCalled();

      handler.stop();
    });
  });

  describe('stop idempotency', () => {
    it('can call stop multiple times safely', () => {
      const callbacks = makeCallbacks();
      const mockDatafeed: Datafeed = {
        async getBars() { return []; },
        subscribe() { return () => {}; },
        async searchSymbols() { return []; },
      };

      const handler = new StreamingHandler(mockDatafeed, 'BTCUSDT', '1m', callbacks);
      handler.start(null);
      handler.stop();
      // Second stop should not throw
      expect(() => handler.stop()).not.toThrow();
    });
  });

  describe('timeframe edge cases', () => {
    it('defaults to 60s for unknown timeframe', () => {
      const callbacks = makeCallbacks();
      let capturedOnTick: ((tick: Tick) => void) | null = null;

      const mockDatafeed: Datafeed = {
        async getBars() { return []; },
        subscribe({ onTick }) {
          capturedOnTick = onTick!;
          return () => {};
        },
        async searchSymbols() { return []; },
      };

      // Use an unknown timeframe — should default to 60s
      const handler = new StreamingHandler(mockDatafeed, 'BTCUSDT', '99x' as Timeframe, callbacks);
      const lastBar: Bar = { time: 0, open: 100, high: 110, low: 90, close: 105, volume: 500 };
      handler.start(lastBar);

      // Tick at time 60 should be a new bar (60 seconds interval)
      capturedOnTick!({ time: 60, price: 120, volume: 20 });
      expect(callbacks.onNewBar).toHaveBeenCalled();

      handler.stop();
    });
  });
});
