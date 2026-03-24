import { describe, it, expect, beforeEach } from 'vitest';
import { t, setLocale, resetLocale, getLocale } from '../src/core/i18n';

describe('i18n', () => {
  beforeEach(() => {
    resetLocale();
  });

  describe('t() — default English', () => {
    it('returns English OHLCV labels', () => {
      expect(t('open')).toBe('O');
      expect(t('high')).toBe('H');
      expect(t('low')).toBe('L');
      expect(t('close')).toBe('C');
      expect(t('volume')).toBe('Vol');
    });

    it('returns English trading labels', () => {
      expect(t('long')).toBe('LONG');
      expect(t('short')).toBe('SHORT');
      expect(t('tp')).toBe('TP');
      expect(t('sl')).toBe('SL');
      expect(t('pnl')).toBe('P&L');
      expect(t('breakeven')).toBe('Breakeven');
      expect(t('riskReward')).toBe('R:R');
    });

    it('returns English SMC labels', () => {
      expect(t('bos')).toBe('BOS');
      expect(t('choch')).toBe('CHoCH');
      expect(t('bullish')).toBe('BULLISH');
      expect(t('bearish')).toBe('BEARISH');
    });

    it('returns English pattern labels', () => {
      expect(t('gartley')).toBe('Gartley');
      expect(t('butterfly')).toBe('Butterfly');
      expect(t('bat')).toBe('Bat');
      expect(t('crab')).toBe('Crab');
    });

    it('returns English time units', () => {
      expect(t('days')).toBe('d');
      expect(t('hours')).toBe('h');
      expect(t('minutes')).toBe('m');
      expect(t('seconds')).toBe('s');
    });
  });

  describe('setLocale() — custom translations', () => {
    it('overrides specific keys', () => {
      setLocale({ long: 'ЛОНГ', short: 'ШОРТ' });
      expect(t('long')).toBe('ЛОНГ');
      expect(t('short')).toBe('ШОРТ');
      // Other keys remain English
      expect(t('tp')).toBe('TP');
    });

    it('supports full locale override', () => {
      setLocale({
        open: 'О', high: 'В', low: 'Н', close: 'З', volume: 'Объём',
        long: 'ЛОНГ', short: 'ШОРТ', tp: 'ТП', sl: 'СЛ',
        pnl: 'ПиУ', expectedProfit: 'Ожидаемая прибыль', expectedLoss: 'Ожидаемый убыток',
        entry: 'Вход', target: 'Цель', breakeven: 'Безубыток', riskReward: 'Р:Р',
        bullish: 'БЫЧИЙ', bearish: 'МЕДВЕЖИЙ', range: 'ФЛЭТ',
        bars: 'баров', seg: 'сег',
        days: 'д', hours: 'ч', minutes: 'мин', seconds: 'сек',
      });
      expect(t('open')).toBe('О');
      expect(t('volume')).toBe('Объём');
      expect(t('expectedProfit')).toBe('Ожидаемая прибыль');
      expect(t('bullish')).toBe('БЫЧИЙ');
      expect(t('bars')).toBe('баров');
      expect(t('days')).toBe('д');
    });

    it('partial override keeps defaults for unset keys', () => {
      setLocale({ tp: 'ТП' });
      expect(t('tp')).toBe('ТП');
      expect(t('sl')).toBe('SL'); // still English
      expect(t('poc')).toBe('POC'); // still English
    });
  });

  describe('resetLocale()', () => {
    it('reverts to English defaults', () => {
      setLocale({ long: 'ЛОНГ' });
      expect(t('long')).toBe('ЛОНГ');
      resetLocale();
      expect(t('long')).toBe('LONG');
    });
  });

  describe('getLocale()', () => {
    it('returns current locale object', () => {
      const locale = getLocale();
      expect(locale.long).toBe('LONG');
      expect(locale.tp).toBe('TP');
      expect(typeof locale.open).toBe('string');
    });

    it('reflects changes after setLocale', () => {
      setLocale({ long: 'ЛОНГ' });
      expect(getLocale().long).toBe('ЛОНГ');
    });
  });
});
