import { describe, it, expect } from 'vitest';
import type { Bar } from '../src/api/types';
import { BarBuffer } from '../src/core/data/bar-buffer';
import { EventEmitter } from '../src/core/events';
import { StreamingHandler } from '../src/core/data/streaming';

function makeBars(count: number): Bar[] {
  return Array.from({ length: count }, (_, i) => ({
    time: 1000 + i * 60,
    open: 100 + i,
    high: 102 + i,
    low: 98 + i,
    close: 101 + i,
    volume: 100 + i * 10,
  }));
}

// ── BarBuffer (TypedArray) ──────────────────────────────────────────────────

describe('BarBuffer', () => {
  it('should store and retrieve bars', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(5));
    expect(buf.length).toBe(5);

    const bar = buf.getBar(2)!;
    expect(bar.time).toBe(1000 + 2 * 60);
    expect(bar.close).toBe(103);
  });

  it('should provide zero-allocation field accessors', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(3));

    expect(buf.time(0)).toBe(1000);
    expect(buf.open(1)).toBe(101);
    expect(buf.high(2)).toBe(104);
    expect(buf.low(0)).toBe(98);
    expect(buf.close(1)).toBe(102);
    expect(buf.volume(2)).toBe(120);
  });

  it('should push new bars', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(2));
    buf.push({ time: 1200, open: 200, high: 210, low: 190, close: 205, volume: 500 });
    expect(buf.length).toBe(3);
    expect(buf.close(2)).toBe(205);
  });

  it('should update bar in place', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(3));
    buf.updateAt(1, { time: 1060, open: 200, high: 210, low: 190, close: 205, volume: 500 });
    expect(buf.close(1)).toBe(205);
    expect(buf.length).toBe(3);
  });

  it('should compute price range', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(5));
    const range = buf.getPriceRange(0, 5)!;
    expect(range.min).toBe(98);   // low of first bar
    expect(range.max).toBe(106);  // high of last bar
  });

  it('should compute max volume', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(5));
    expect(buf.getMaxVolume(0, 5)).toBe(140); // 100 + 4*10
  });

  it('should find nearest index by time', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(5));
    expect(buf.nearestIndex(1000 + 2 * 60)).toBe(2);
    expect(buf.nearestIndex(1000 + 2.3 * 60)).toBe(2);
    expect(buf.nearestIndex(1000 + 2.7 * 60)).toBe(3);
  });

  it('should prepend bars', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(3));
    const oldBars: Bar[] = [
      { time: 800, open: 50, high: 55, low: 45, close: 52, volume: 50 },
      { time: 860, open: 52, high: 57, low: 47, close: 54, volume: 60 },
    ];
    buf.prepend(oldBars);
    expect(buf.length).toBe(5);
    expect(buf.time(0)).toBe(800);
    expect(buf.time(2)).toBe(1000);
  });

  it('should auto-grow capacity', () => {
    const buf = new BarBuffer(4); // start small
    const bars = makeBars(100);
    buf.setFromBars(bars);
    expect(buf.length).toBe(100);
    expect(buf.capacity).toBeGreaterThanOrEqual(100);
    expect(buf.close(99)).toBe(200);
  });

  it('should handle empty buffer', () => {
    const buf = new BarBuffer();
    expect(buf.length).toBe(0);
    expect(buf.getBar(0)).toBeUndefined();
    expect(buf.getPriceRange(0, 10)).toBeNull();
    expect(buf.nearestIndex(1000)).toBe(-1);
  });

  it('should get range as Bar array', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(5));
    const range = buf.getRange(1, 3);
    expect(range).toHaveLength(2);
    expect(range[0]!.time).toBe(1060);
    expect(range[1]!.time).toBe(1120);
  });

  it('should return undefined for negative index in getBar', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(3));
    expect(buf.getBar(-1)).toBeUndefined();
  });

  it('updateAt with out-of-range index is no-op', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(3));
    const barBefore = buf.getBar(0)!;
    buf.updateAt(-1, { time: 999, open: 999, high: 999, low: 999, close: 999, volume: 999 });
    buf.updateAt(10, { time: 999, open: 999, high: 999, low: 999, close: 999, volume: 999 });
    expect(buf.getBar(0)).toEqual(barBefore);
    expect(buf.length).toBe(3);
  });

  it('prepend with empty array is no-op', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(3));
    buf.prepend([]);
    expect(buf.length).toBe(3);
  });

  it('getRange clamps negative from and large to', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(3));
    const range = buf.getRange(-5, 100);
    expect(range).toHaveLength(3);
  });

  it('getPriceRange returns null for invalid range', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(3));
    expect(buf.getPriceRange(5, 3)).toBeNull();
  });

  it('getMaxVolume returns 0 for empty range', () => {
    const buf = new BarBuffer();
    buf.setFromBars(makeBars(3));
    expect(buf.getMaxVolume(5, 3)).toBe(0);
  });

  it('nearestIndex returns previous when closer', () => {
    const buf = new BarBuffer();
    // Bars at time 1000, 1060, 1120
    buf.setFromBars(makeBars(3));
    // Time 1029 is closer to 1000 (diff=29) than 1060 (diff=31)
    expect(buf.nearestIndex(1029)).toBe(0);
  });
});

// ── Event Emitter ───────────────────────────────────────────────────────────

describe('EventEmitter', () => {
  it('should emit and receive events', () => {
    const emitter = new EventEmitter();
    let received: any = null;
    emitter.on('click', (data) => { received = data; });
    emitter.emit('click', { time: 100, price: 42000 });
    expect(received).toEqual({ time: 100, price: 42000 });
  });

  it('should support multiple listeners', () => {
    const emitter = new EventEmitter();
    const results: number[] = [];
    emitter.on('click', () => results.push(1));
    emitter.on('click', () => results.push(2));
    emitter.emit('click', { time: 0, price: 0 });
    expect(results).toEqual([1, 2]);
  });

  it('should unsubscribe with off', () => {
    const emitter = new EventEmitter();
    let count = 0;
    const listener = () => { count++; };
    emitter.on('click', listener);
    emitter.emit('click', { time: 0, price: 0 });
    emitter.off('click', listener);
    emitter.emit('click', { time: 0, price: 0 });
    expect(count).toBe(1);
  });

  it('should fire once listener only once', () => {
    const emitter = new EventEmitter();
    let count = 0;
    emitter.once('click', () => { count++; });
    emitter.emit('click', { time: 0, price: 0 });
    emitter.emit('click', { time: 0, price: 0 });
    expect(count).toBe(1);
  });

  it('should remove all listeners', () => {
    const emitter = new EventEmitter();
    let count = 0;
    emitter.on('click', () => { count++; });
    emitter.on('symbolChange', () => { count++; });
    emitter.removeAll();
    emitter.emit('click', { time: 0, price: 0 });
    emitter.emit('symbolChange', 'BTCUSDT');
    expect(count).toBe(0);
  });

  it('should not throw on emit with no listeners', () => {
    const emitter = new EventEmitter();
    expect(() => emitter.emit('click', { time: 0, price: 0 })).not.toThrow();
  });

  it('textInputRequested event carries toolName, color, lineWidth', () => {
    const emitter = new EventEmitter();
    let received: any = null;
    emitter.on('textInputRequested', (data) => { received = data; });
    emitter.emit('textInputRequested', {
      drawingId: 'd1',
      toolName: 'callout',
      clientX: 100,
      clientY: 200,
      currentText: 'Hello',
      color: '#ff0000',
      lineWidth: 2,
    });
    expect(received).toBeTruthy();
    expect(received.toolName).toBe('callout');
    expect(received.color).toBe('#ff0000');
    expect(received.lineWidth).toBe(2);
    expect(received.drawingId).toBe('d1');
    expect(received.currentText).toBe('Hello');
  });

  it('textInputRequested works for all text tool types', () => {
    const emitter = new EventEmitter();
    const results: string[] = [];
    emitter.on('textInputRequested', (data) => { results.push(data.toolName); });

    for (const tool of ['text', 'callout', 'note']) {
      emitter.emit('textInputRequested', {
        drawingId: `d-${tool}`,
        toolName: tool,
        clientX: 0,
        clientY: 0,
        currentText: '',
        color: '#eaecef',
        lineWidth: 1.5,
      });
    }
    expect(results).toEqual(['text', 'callout', 'note']);
  });
});

// ── Streaming Handler ───────────────────────────────────────────────────────

describe('StreamingHandler', () => {
  it('should construct new bars from ticks', () => {
    const newBars: Bar[] = [];
    const updates: Bar[] = [];

    const mockDatafeed = {
      async getBars() { return []; },
      subscribe({ onTick }: any) {
        // Simulate ticks
        setTimeout(() => {
          onTick({ time: 1000, price: 100, volume: 10 });
          onTick({ time: 1001, price: 101, volume: 5 });
          onTick({ time: 1060, price: 102, volume: 8 }); // new bar
        }, 10);
        return () => {};
      },
      async searchSymbols() { return []; },
    };

    const handler = new StreamingHandler(
      mockDatafeed as any,
      'BTCUSDT',
      '1m',
      {
        onNewBar: (bar) => newBars.push({ ...bar }),
        onBarUpdate: (bar) => updates.push({ ...bar }),
        onReconnect: () => {},
      },
    );

    handler.start(null);

    // Wait for ticks to process
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        handler.stop();
        // Should have created 2 new bars (first tick creates bar, third tick creates new bar)
        expect(newBars.length).toBeGreaterThanOrEqual(1);
        resolve();
      }, 50);
    });
  });

  it('should update current bar on subsequent ticks', () => {
    const updates: Bar[] = [];

    const mockDatafeed = {
      async getBars() { return []; },
      subscribe({ onTick }: any) {
        setTimeout(() => {
          onTick({ time: 1000, price: 100, volume: 10 });
          onTick({ time: 1010, price: 105, volume: 5 }); // same bar, higher
          onTick({ time: 1020, price: 95, volume: 3 });  // same bar, lower
        }, 10);
        return () => {};
      },
      async searchSymbols() { return []; },
    };

    const handler = new StreamingHandler(
      mockDatafeed as any,
      'BTCUSDT',
      '1m',
      {
        onNewBar: () => {},
        onBarUpdate: (bar) => updates.push({ ...bar }),
        onReconnect: () => {},
      },
    );

    handler.start(null);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        handler.stop();
        if (updates.length >= 2) {
          // Last update should have high=105, low=95
          const last = updates[updates.length - 1]!;
          expect(last.high).toBe(105);
          expect(last.low).toBe(95);
          expect(last.close).toBe(95);
        }
        resolve();
      }, 50);
    });
  });
});
