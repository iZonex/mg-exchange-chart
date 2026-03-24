// ── Internationalization ─────────────────────────────────────────────────────
// Simple i18n system for chart labels. Consumers provide translations via
// Chart.setLocale() or by passing a locale object to ChartOptions.
//
// Usage:
//   import { t } from './i18n';
//   ctx.fillText(t('tp'), x, y);           // "TP" or translated
//   ctx.fillText(t('long'), x, y);          // "LONG" or translated
//   ctx.fillText(t('expectedProfit'), x, y);// "Expected Profit" or translated
//
// Consumer:
//   Chart.setLocale({
//     long: 'ЛОНГ', short: 'ШОРТ', tp: 'ТП', sl: 'СЛ',
//   });

export interface ChartLocale {
  // ── OHLCV ──────────────────────────────────────
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;

  // ── Trading ────────────────────────────────────
  long: string;
  short: string;
  tp: string;
  sl: string;
  entry: string;
  target: string;
  breakeven: string;
  pnl: string;
  expectedProfit: string;
  expectedLoss: string;
  riskReward: string;

  // ── Market Data ────────────────────────────────
  high24h: string;
  low24h: string;

  // ── Smart Money ────────────────────────────────
  fvg: string;
  orderBlock: string;
  bos: string;
  choch: string;
  bullish: string;
  bearish: string;
  range: string;
  hh: string;
  lh: string;
  hl: string;
  ll: string;

  // ── Volume Profile ─────────────────────────────
  volumeProfile: string;
  poc: string;
  vah: string;
  val: string;

  // ── Patterns ───────────────────────────────────
  gartley: string;
  butterfly: string;
  bat: string;
  crab: string;
  deepCrab: string;
  cypher: string;

  // ── Elliott combos ──────────────────────────────
  wLabel: string;
  xLabel: string;
  yLabel: string;
  zLabel: string;

  // ── Cycles / Ghost ──────────────────────────────
  cycle: string;
  ghostBars: string;

  // ── Measurement ────────────────────────────────
  bars: string;
  seg: string;
  avwap: string;

  // ── Time units ─────────────────────────────────
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

const EN: ChartLocale = {
  open: 'O',
  high: 'H',
  low: 'L',
  close: 'C',
  volume: 'Vol',

  long: 'LONG',
  short: 'SHORT',
  tp: 'TP',
  sl: 'SL',
  entry: 'Entry',
  target: 'Target',
  breakeven: 'Breakeven',
  pnl: 'P&L',
  expectedProfit: 'Expected Profit',
  expectedLoss: 'Expected Loss',
  riskReward: 'R:R',

  high24h: '24h H',
  low24h: '24h L',

  fvg: 'FVG',
  orderBlock: 'OB',
  bos: 'BOS',
  choch: 'CHoCH',
  bullish: 'BULLISH',
  bearish: 'BEARISH',
  range: 'RANGE',
  hh: 'HH',
  lh: 'LH',
  hl: 'HL',
  ll: 'LL',

  volumeProfile: 'Volume Profile',
  poc: 'POC',
  vah: 'VAH',
  val: 'VAL',

  gartley: 'Gartley',
  butterfly: 'Butterfly',
  bat: 'Bat',
  crab: 'Crab',
  deepCrab: 'Deep Crab',
  cypher: 'Cypher',

  wLabel: 'W',
  xLabel: 'X',
  yLabel: 'Y',
  zLabel: 'Z',

  cycle: 'Cycle',
  ghostBars: 'Ghost',

  bars: 'bars',
  seg: 'seg',
  avwap: 'AVWAP',

  days: 'd',
  hours: 'h',
  minutes: 'm',
  seconds: 's',
};

let current: ChartLocale = { ...EN };

/** Get translated string by key */
export function t(key: keyof ChartLocale): string {
  return current[key];
}

/** Set locale (partial — only override what you need) */
export function setLocale(locale: Partial<ChartLocale>): void {
  current = { ...EN, ...locale };
}

/** Reset to English defaults */
export function resetLocale(): void {
  current = { ...EN };
}

/** Get current full locale object */
export function getLocale(): Readonly<ChartLocale> {
  return current;
}
