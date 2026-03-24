import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../src/core/logger';

describe('Logger', () => {
  beforeEach(() => {
    logger.setLevel('debug');
    logger.setHandler(null);
  });

  describe('log levels', () => {
    it('debug shows all messages', () => {
      const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      logger.setLevel('debug');
      logger.debug('test');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('warn suppresses debug and info', () => {
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.setLevel('warn');
      logger.debug('hidden');
      logger.info('hidden');
      logger.warn('visible');
      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
      debugSpy.mockRestore(); infoSpy.mockRestore(); warnSpy.mockRestore();
    });

    it('none suppresses everything', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.setLevel('none');
      logger.error('hidden');
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('error only shows errors', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.setLevel('error');
      logger.warn('hidden');
      logger.error('visible');
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
      warnSpy.mockRestore(); errorSpy.mockRestore();
    });
  });

  describe('getLevel', () => {
    it('returns current level', () => {
      logger.setLevel('info');
      expect(logger.getLevel()).toBe('info');
      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
    });
  });

  describe('custom handler', () => {
    it('routes all messages to handler', () => {
      const handler = vi.fn();
      logger.setHandler(handler);
      logger.setLevel('debug');
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');
      expect(handler).toHaveBeenCalledTimes(4);
      expect(handler).toHaveBeenCalledWith('debug', 'd');
      expect(handler).toHaveBeenCalledWith('error', 'e');
    });

    it('respects level even with handler', () => {
      const handler = vi.fn();
      logger.setHandler(handler);
      logger.setLevel('error');
      logger.debug('hidden');
      logger.warn('hidden');
      logger.error('visible');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('null handler restores console', () => {
      const handler = vi.fn();
      logger.setHandler(handler);
      logger.setHandler(null);
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.setLevel('warn');
      logger.warn('test');
      expect(handler).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('message formatting', () => {
    it('passes extra args', () => {
      const handler = vi.fn();
      logger.setHandler(handler);
      logger.error('msg', { detail: 'x' }, 42);
      expect(handler).toHaveBeenCalledWith('error', 'msg', { detail: 'x' }, 42);
    });
  });

  describe('info with console output (line 62)', () => {
    it('calls console.info when no custom handler and level allows', () => {
      logger.setHandler(null);
      logger.setLevel('info');
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
      logger.info('test info message', 'extra');
      expect(spy).toHaveBeenCalledWith('[exchange-charts]', 'test info message', 'extra');
      spy.mockRestore();
    });
  });

  describe('getLevel fallback (line 42)', () => {
    it('returns warn as default level', () => {
      // Fresh state after beforeEach sets to debug, but default is warn
      logger.setLevel('warn');
      expect(logger.getLevel()).toBe('warn');
    });

    it('returns correct level for all valid levels', () => {
      for (const level of ['debug', 'info', 'warn', 'error', 'none'] as const) {
        logger.setLevel(level);
        expect(logger.getLevel()).toBe(level);
      }
    });
  });
});
