// ── Indicator Registry ──────────────────────────────────────────────────────
// Central registry of available indicator definitions.
// Built-in indicators are auto-registered; custom indicators can be added.

import type { Indicator } from '../api/types';
import { sma } from './overlays/sma';
import { ema } from './overlays/ema';
import { bollingerBands } from './overlays/bollinger';
import { vwap } from './overlays/vwap';
import { rsi } from './oscillators/rsi';
import { macd } from './oscillators/macd';
import { stochastic } from './oscillators/stochastic';
import { atr } from './oscillators/atr';
import { ichimoku } from './overlays/ichimoku';
import { obv } from './oscillators/obv';
import { adx } from './oscillators/adx';
import { mfi } from './oscillators/mfi';
import { twap } from './overlays/twap';
import { supertrend } from './overlays/supertrend';
import { emaRibbon } from './overlays/ema-ribbon';
import { williamsR } from './oscillators/williams-r';
import { roc } from './oscillators/roc';
import { sar } from './overlays/sar';
import { envelope } from './overlays/envelope';
import { cvd } from './oscillators/cvd';
import { smc } from './overlays/smc';

const registry = new Map<string, Indicator>();

/** Register a custom indicator */
export function registerIndicator(indicator: Indicator): void {
  registry.set(indicator.name, indicator);
}

/** Get indicator definition by name */
export function getIndicator(name: string): Indicator | undefined {
  return registry.get(name);
}

/** Get all registered indicators */
export function getAllIndicators(): Indicator[] {
  return Array.from(registry.values());
}

/** Get overlay indicators only */
export function getOverlayIndicators(): Indicator[] {
  return getAllIndicators().filter(i => i.overlay);
}

/** Get oscillator indicators only */
export function getOscillatorIndicators(): Indicator[] {
  return getAllIndicators().filter(i => !i.overlay);
}

// ── Register built-in indicators ────────────────────────────────────────────
const builtIn: Indicator[] = [
  sma, ema, bollingerBands, vwap, ichimoku, twap, supertrend, emaRibbon,
  rsi, macd, stochastic, atr, obv, adx, mfi, williamsR, roc,
  sar, envelope, cvd, smc,
];
for (const ind of builtIn) {
  registry.set(ind.name, ind);
}
