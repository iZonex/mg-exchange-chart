import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../src/core/events';

describe('Trading Events', () => {
  describe('tradeRequested', () => {
    it('emits with side, price, type', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();
      emitter.on('tradeRequested', handler);
      emitter.emit('tradeRequested', { side: 'buy', price: 87500, type: 'limit' });
      expect(handler).toHaveBeenCalledWith({ side: 'buy', price: 87500, type: 'limit' });
    });

    it('emits with custom action', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();
      emitter.on('tradeRequested', handler);
      emitter.emit('tradeRequested', { side: 'sell', price: 88000, type: 'market', action: 'custom-sell' });
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ action: 'custom-sell' }));
    });

    it('supports multiple listeners', () => {
      const emitter = new EventEmitter();
      const h1 = vi.fn();
      const h2 = vi.fn();
      emitter.on('tradeRequested', h1);
      emitter.on('tradeRequested', h2);
      emitter.emit('tradeRequested', { side: 'buy', price: 100, type: 'limit' });
      expect(h1).toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });
  });

  describe('orderLineMoved', () => {
    it('emits with id and new price', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();
      emitter.on('orderLineMoved', handler);
      emitter.emit('orderLineMoved', { id: 'order-1', price: 88000 });
      expect(handler).toHaveBeenCalledWith({ id: 'order-1', price: 88000 });
    });
  });

  describe('off', () => {
    it('unsubscribes from trade events', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();
      emitter.on('tradeRequested', handler);
      emitter.off('tradeRequested', handler);
      emitter.emit('tradeRequested', { side: 'buy', price: 100, type: 'limit' });
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('fires once then auto-unsubscribes', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();
      emitter.once('orderLineMoved', handler);
      emitter.emit('orderLineMoved', { id: 'a', price: 100 });
      emitter.emit('orderLineMoved', { id: 'b', price: 200 });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ id: 'a', price: 100 });
    });
  });

  describe('removeAll', () => {
    it('removes all listeners', () => {
      const emitter = new EventEmitter();
      const h1 = vi.fn();
      const h2 = vi.fn();
      emitter.on('tradeRequested', h1);
      emitter.on('orderLineMoved', h2);
      emitter.removeAll();
      emitter.emit('tradeRequested', { side: 'buy', price: 100, type: 'limit' });
      emitter.emit('orderLineMoved', { id: 'a', price: 100 });
      expect(h1).not.toHaveBeenCalled();
      expect(h2).not.toHaveBeenCalled();
    });
  });

  describe('chart event types', () => {
    it('crosshairMove', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();
      emitter.on('crosshairMove', handler);
      emitter.emit('crosshairMove', { time: 1000, price: 87500 });
      expect(handler).toHaveBeenCalledWith({ time: 1000, price: 87500 });
    });

    it('barUpdate', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();
      const bar = { time: 1000, open: 100, high: 110, low: 95, close: 105, volume: 500 };
      emitter.on('barUpdate', handler);
      emitter.emit('barUpdate', bar);
      expect(handler).toHaveBeenCalledWith(bar);
    });

    it('drawingAdded', () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();
      emitter.on('drawingAdded', handler);
      emitter.emit('drawingAdded', { id: 'd1', tool: 'trend-line', points: [{ price: 100, time: 1000 }] });
      expect(handler).toHaveBeenCalled();
    });
  });
});
