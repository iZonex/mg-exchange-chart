import { describe, it, expect } from 'vitest';
import { EventEmitter } from '../src/core/events';

describe('EventEmitter — on / emit', () => {
  it('should call listener when event is emitted', () => {
    const emitter = new EventEmitter();
    let received: { time: number; price: number } | null = null;
    emitter.on('click', (data) => { received = data; });
    emitter.emit('click', { time: 1000, price: 50 });
    expect(received).toEqual({ time: 1000, price: 50 });
  });

  it('should call listener multiple times on multiple emits', () => {
    const emitter = new EventEmitter();
    let count = 0;
    emitter.on('click', () => { count++; });
    emitter.emit('click', { time: 1, price: 1 });
    emitter.emit('click', { time: 2, price: 2 });
    emitter.emit('click', { time: 3, price: 3 });
    expect(count).toBe(3);
  });

  it('should support multiple listeners on the same event', () => {
    const emitter = new EventEmitter();
    const results: string[] = [];
    emitter.on('symbolChange', (s) => { results.push('A:' + s); });
    emitter.on('symbolChange', (s) => { results.push('B:' + s); });
    emitter.emit('symbolChange', 'BTCUSDT');
    expect(results).toEqual(['A:BTCUSDT', 'B:BTCUSDT']);
  });

  it('should pass correct data types for different events', () => {
    const emitter = new EventEmitter();
    let timeframe: string | null = null;
    emitter.on('timeframeChange', (tf) => { timeframe = tf; });
    emitter.emit('timeframeChange', '1H');
    expect(timeframe).toBe('1H');
  });
});

describe('EventEmitter — off', () => {
  it('should unsubscribe a specific listener', () => {
    const emitter = new EventEmitter();
    let count = 0;
    const listener = () => { count++; };
    emitter.on('click', listener);
    emitter.emit('click', { time: 1, price: 1 });
    expect(count).toBe(1);

    emitter.off('click', listener);
    emitter.emit('click', { time: 2, price: 2 });
    expect(count).toBe(1); // not incremented
  });

  it('should only remove the specified listener, keeping others', () => {
    const emitter = new EventEmitter();
    const results: string[] = [];
    const listenerA = () => { results.push('A'); };
    const listenerB = () => { results.push('B'); };
    emitter.on('click', listenerA);
    emitter.on('click', listenerB);

    emitter.off('click', listenerA);
    emitter.emit('click', { time: 1, price: 1 });
    expect(results).toEqual(['B']);
  });

  it('should not crash when removing a listener that was never added', () => {
    const emitter = new EventEmitter();
    const listener = () => {};
    // Should not throw
    expect(() => emitter.off('click', listener)).not.toThrow();
  });

  it('should not crash when removing from an event with no listeners', () => {
    const emitter = new EventEmitter();
    expect(() => emitter.off('symbolChange', () => {})).not.toThrow();
  });
});

describe('EventEmitter — once', () => {
  it('should fire listener only once then auto-unsubscribe', () => {
    const emitter = new EventEmitter();
    let count = 0;
    emitter.once('click', () => { count++; });
    emitter.emit('click', { time: 1, price: 1 });
    emitter.emit('click', { time: 2, price: 2 });
    emitter.emit('click', { time: 3, price: 3 });
    expect(count).toBe(1);
  });

  it('should pass event data to once listener', () => {
    const emitter = new EventEmitter();
    let received: string | null = null;
    emitter.once('symbolChange', (s) => { received = s; });
    emitter.emit('symbolChange', 'ETHUSDT');
    expect(received).toBe('ETHUSDT');
  });

  it('should not interfere with regular on listeners', () => {
    const emitter = new EventEmitter();
    const results: string[] = [];
    emitter.on('click', () => { results.push('on'); });
    emitter.once('click', () => { results.push('once'); });

    emitter.emit('click', { time: 1, price: 1 });
    emitter.emit('click', { time: 2, price: 2 });

    // 'on' fires both times, 'once' only the first
    expect(results).toEqual(['on', 'once', 'on']);
  });
});

describe('EventEmitter — emit with no listeners', () => {
  it('should not crash when emitting an event with no subscribers', () => {
    const emitter = new EventEmitter();
    expect(() => emitter.emit('click', { time: 1, price: 1 })).not.toThrow();
  });

  it('should not crash when emitting after all listeners removed', () => {
    const emitter = new EventEmitter();
    const listener = () => {};
    emitter.on('click', listener);
    emitter.off('click', listener);
    expect(() => emitter.emit('click', { time: 1, price: 1 })).not.toThrow();
  });
});

describe('EventEmitter — removeAll', () => {
  it('should remove all listeners for all events', () => {
    const emitter = new EventEmitter();
    let clickCount = 0;
    let symbolCount = 0;
    emitter.on('click', () => { clickCount++; });
    emitter.on('symbolChange', () => { symbolCount++; });

    emitter.removeAll();

    emitter.emit('click', { time: 1, price: 1 });
    emitter.emit('symbolChange', 'BTC');
    expect(clickCount).toBe(0);
    expect(symbolCount).toBe(0);
  });

  it('should allow re-subscribing after removeAll', () => {
    const emitter = new EventEmitter();
    let count = 0;
    emitter.on('click', () => { count++; });
    emitter.removeAll();

    emitter.on('click', () => { count += 10; });
    emitter.emit('click', { time: 1, price: 1 });
    expect(count).toBe(10);
  });
});

describe('EventEmitter — edge cases', () => {
  it('should handle adding the same listener twice', () => {
    const emitter = new EventEmitter();
    let count = 0;
    const listener = () => { count++; };
    emitter.on('click', listener);
    emitter.on('click', listener); // Set-based: should deduplicate
    emitter.emit('click', { time: 1, price: 1 });
    expect(count).toBe(1); // Set deduplicates
  });

  it('should handle complex event data', () => {
    const emitter = new EventEmitter();
    let received: any = null;
    emitter.on('drawingAdded', (data) => { received = data; });
    const payload = { id: 'abc-123', tool: 'trend-line', points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] };
    emitter.emit('drawingAdded', payload);
    expect(received).toEqual(payload);
  });
});
