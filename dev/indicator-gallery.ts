// ── Indicator Gallery Module ─────────────────────────────────────────────────
// Indicator list, search, favorites, toggle on/off, active count badge.
// Extracted from main.ts for maintainability.

import type { Chart } from '../src/core/chart';
import { sma } from '../src/indicators/overlays/sma';
import { ema } from '../src/indicators/overlays/ema';
import { bollingerBands } from '../src/indicators/overlays/bollinger';
import { vwap } from '../src/indicators/overlays/vwap';
import { ichimoku } from '../src/indicators/overlays/ichimoku';
import { rsi } from '../src/indicators/oscillators/rsi';
import { macd } from '../src/indicators/oscillators/macd';
import { stochastic } from '../src/indicators/oscillators/stochastic';
import { atr } from '../src/indicators/oscillators/atr';
import { obv } from '../src/indicators/oscillators/obv';
import { adx } from '../src/indicators/oscillators/adx';
import { mfi } from '../src/indicators/oscillators/mfi';
import { twap } from '../src/indicators/overlays/twap';
import { supertrend } from '../src/indicators/overlays/supertrend';
import { emaRibbon } from '../src/indicators/overlays/ema-ribbon';
import { williamsR } from '../src/indicators/oscillators/williams-r';
import { roc } from '../src/indicators/oscillators/roc';
import { sar } from '../src/indicators/overlays/sar';
import { envelope } from '../src/indicators/overlays/envelope';
import { cvd } from '../src/indicators/oscillators/cvd';
import { smc } from '../src/indicators/overlays/smc';

const $ = (s: string) => document.querySelector(s)!;
const $$ = (s: string) => document.querySelectorAll(s);

// ── Indicator Config ──────────────────────────────────────────────────────

export const IND: Record<string, { indicator: any; params?: Record<string, any> }> = {
  SMA: { indicator: sma, params: { period: 20 } },
  EMA: { indicator: ema, params: { period: 50 } },
  BB: { indicator: bollingerBands, params: { period: 20, stdDev: 2 } },
  VWAP: { indicator: vwap },
  ICH: { indicator: ichimoku },
  RSI: { indicator: rsi, params: { period: 14 } },
  MACD: { indicator: macd },
  STOCH: { indicator: stochastic },
  ATR: { indicator: atr, params: { period: 14 } },
  OBV: { indicator: obv },
  ADX: { indicator: adx, params: { period: 14 } },
  MFI: { indicator: mfi, params: { period: 14 } },
  TWAP: { indicator: twap },
  ST: { indicator: supertrend, params: { period: 10, multiplier: 3 } },
  RIBBON: { indicator: emaRibbon },
  WR: { indicator: williamsR, params: { period: 14 } },
  ROC: { indicator: roc, params: { period: 12 } },
  SAR: { indicator: sar, params: { step: 0.02, max: 0.2 } },
  ENV: { indicator: envelope, params: { period: 20, percent: 2.5 } },
  CVD: { indicator: cvd },
  SMC: { indicator: smc, params: { swingN: 3, maxOBAge: 96, minFVGPct: 0.2 } },
};

interface IndEntry { key: string; name: string; desc: string; group: string; overlay: boolean; }

export const INDICATORS: IndEntry[] = [
  { key: 'SMA', name: 'SMA (20)', desc: 'Average price over N periods', group: 'Trend', overlay: true },
  { key: 'EMA', name: 'EMA (50)', desc: 'Weighted average, recent prices matter more', group: 'Trend', overlay: true },
  { key: 'ICH', name: 'Ichimoku Cloud', desc: 'Multi-line trend & support/resistance system', group: 'Trend', overlay: true },
  { key: 'TWAP', name: 'TWAP', desc: 'Time-weighted average price', group: 'Trend', overlay: true },
  { key: 'ST', name: 'Supertrend', desc: 'ATR-based trend following indicator', group: 'Trend', overlay: true },
  { key: 'RIBBON', name: 'EMA Ribbon', desc: 'Multiple EMAs showing trend strength', group: 'Trend', overlay: true },
  { key: 'SAR', name: 'Parabolic SAR', desc: 'Stop and reverse trailing points', group: 'Trend', overlay: true },
  { key: 'SMC', name: 'Smart Money Concepts', desc: 'Order Blocks, FVG, BOS/CHoCH, Market Structure', group: 'Trend', overlay: true },
  { key: 'ADX', name: 'ADX (14)', desc: 'Trend strength 0-100, not direction', group: 'Trend', overlay: false },
  { key: 'RSI', name: 'RSI (14)', desc: 'Overbought/oversold momentum (0-100)', group: 'Momentum', overlay: false },
  { key: 'MACD', name: 'MACD', desc: 'Trend momentum via EMA convergence/divergence', group: 'Momentum', overlay: false },
  { key: 'STOCH', name: 'Stochastic', desc: 'Price position within recent range', group: 'Momentum', overlay: false },
  { key: 'WR', name: 'Williams %R', desc: 'Overbought/oversold (-100 to 0)', group: 'Momentum', overlay: false },
  { key: 'ROC', name: 'Rate of Change', desc: 'Rate of price change as percentage', group: 'Momentum', overlay: false },
  { key: 'BB', name: 'Bollinger Bands', desc: 'Price bands based on standard deviation', group: 'Volatility', overlay: true },
  { key: 'ATR', name: 'ATR (14)', desc: 'Average True Range — volatility measure', group: 'Volatility', overlay: false },
  { key: 'ENV', name: 'Envelope', desc: 'Moving average +/- percentage bands', group: 'Volatility', overlay: true },
  { key: 'VWAP', name: 'VWAP', desc: 'Volume-weighted average price', group: 'Volume', overlay: true },
  { key: 'OBV', name: 'OBV', desc: 'Cumulative volume confirming price trends', group: 'Volume', overlay: false },
  { key: 'MFI', name: 'MFI (14)', desc: 'Money Flow Index — volume-weighted RSI', group: 'Volume', overlay: false },
  { key: 'CVD', name: 'Cumulative Vol Delta', desc: 'Cumulative buy vs sell volume delta', group: 'Volume', overlay: false },
  { key: 'VP', name: 'Volume Profile', desc: 'Horizontal histogram of volume at price levels', group: 'Volume', overlay: true },
];

const GROUPS = ['Trend', 'Momentum', 'Volatility', 'Volume'];

// ── State ─────────────────────────────────────────────────────────────────

export const activeInd = new Map<string, string>();
export let vpOn = false;
let indFavorites: Set<string> = new Set(JSON.parse(localStorage.getItem('ind-favorites') || '[]'));

export function setVpOn(v: boolean) { vpOn = v; }

function getActiveCount(): number { return activeInd.size + (vpOn ? 1 : 0); }

function saveFavorites() { localStorage.setItem('ind-favorites', JSON.stringify([...indFavorites])); }

// ── Toggle ────────────────────────────────────────────────────────────────

let _chart: Chart;

export function toggleIndicator(key: string) {
  if (key === 'VP') {
    vpOn = !vpOn;
    _chart.setVolumeProfile(vpOn);
    return;
  }
  const cfg = IND[key];
  if (!cfg) return;
  if (activeInd.has(key)) {
    _chart.removeIndicator(activeInd.get(key)!);
    activeInd.delete(key);
  } else {
    const id = _chart.addIndicator(cfg.indicator, cfg.params);
    activeInd.set(key, id);
  }
}

// ── Render ─────────────────────────────────────────────────────────────────

export function updateIndBadge() {
  const count = getActiveCount();
  const btn = document.getElementById('ind-btn') as HTMLElement;
  if (!btn) return;
  btn.textContent = count > 0 ? `Indicators (${count}) \u25BE` : `Indicators \u25BE`;
  btn.style.color = count > 0 ? 'var(--accent)' : '';
}

function indItemHTML(ind: IndEntry): string {
  const isActive = activeInd.has(ind.key) || (ind.key === 'VP' && vpOn);
  const isFav = indFavorites.has(ind.key);
  const typeTag = ind.overlay
    ? '<span style="font-size:9px; color:var(--accent); border:1px solid var(--accent); border-radius:3px; padding:0 3px; margin-left:4px;">overlay</span>'
    : '<span style="font-size:9px; color:var(--text3); border:1px solid var(--border); border-radius:3px; padding:0 3px; margin-left:4px;">panel</span>';
  const toggleIcon = isActive
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="none"><rect x="2" y="6" width="20" height="12" rx="6"/><circle cx="16" cy="12" r="4" fill="#fff"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text3)" stroke="none"><rect x="2" y="6" width="20" height="12" rx="6"/><circle cx="8" cy="12" r="4" fill="#fff"/></svg>';
  return `<div class="ind-item${isActive ? ' active' : ''}" data-ind="${ind.key}">
    <div style="flex:1; min-width:0;">
      <div class="ind-name">${ind.name}${typeTag}</div>
      <div class="ind-desc">${ind.desc}</div>
    </div>
    <span style="display:flex; align-items:center; gap:6px;">
      <span class="ind-toggle" data-ind="${ind.key}" style="cursor:pointer; display:flex;">${toggleIcon}</span>
      <span class="ind-star${isFav ? ' fav' : ''}" data-ind="${ind.key}">${isFav ? '\u2605' : '\u2606'}</span>
    </span>
  </div>`;
}

function renderIndList(filter = '') {
  const list = $('#ind-list') as HTMLElement;
  const q = filter.toLowerCase();
  let html = '';

  const activeItems = INDICATORS.filter(i => activeInd.has(i.key) || (i.key === 'VP' && vpOn));
  if (activeItems.length > 0 && !q) {
    html += `<div class="ind-group-head" style="color:var(--accent);">Active (${activeItems.length})</div>`;
    for (const ind of activeItems) html += indItemHTML(ind);
  }

  const favItems = INDICATORS.filter(i => indFavorites.has(i.key) && !activeInd.has(i.key) && !(i.key === 'VP' && vpOn) && (!q || i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)));
  if (favItems.length > 0) {
    html += `<div class="ind-group-head">Favorites</div>`;
    for (const ind of favItems) html += indItemHTML(ind);
  }

  for (const group of GROUPS) {
    const items = INDICATORS.filter(i => {
      if (q) return i.group === group && (i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
      return i.group === group && !activeInd.has(i.key) && !(i.key === 'VP' && vpOn) && !indFavorites.has(i.key);
    });
    if (items.length === 0) continue;
    html += `<div class="ind-group-head">${group}</div>`;
    for (const ind of items) html += indItemHTML(ind);
  }

  if (!html) html = `<div style="padding:20px; text-align:center; color:var(--text3);">No indicators found</div>`;
  list.innerHTML = html;

  list.querySelectorAll('.ind-toggle').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); toggleIndicator((el as HTMLElement).dataset.ind!); renderIndList(filter); updateIndBadge(); });
  });
  list.querySelectorAll('.ind-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.ind-star') || (e.target as HTMLElement).closest('.ind-toggle')) return;
      toggleIndicator((el as HTMLElement).dataset.ind!); renderIndList(filter); updateIndBadge();
    });
  });
  list.querySelectorAll('.ind-star').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = (el as HTMLElement).dataset.ind!;
      if (indFavorites.has(key)) indFavorites.delete(key); else indFavorites.add(key);
      saveFavorites(); renderIndList(filter);
    });
  });
  updateIndBadge();
}

// ── Init ──────────────────────────────────────────────────────────────────

export function initIndicatorGallery(chart: Chart) {
  _chart = chart;

  function openIndModal() {
    ($('#ind-modal') as HTMLElement).style.display = 'block';
    ($('#ind-modal-bg') as HTMLElement).style.display = 'block';
    ($('#ind-search') as HTMLInputElement).value = '';
    const count = getActiveCount();
    const title = document.querySelector('#ind-modal .ind-modal-title') as HTMLElement;
    if (title) title.textContent = count > 0 ? `Indicators (${count} active)` : 'Indicators';
    renderIndList();
    setTimeout(() => ($('#ind-search') as HTMLInputElement).focus(), 50);
  }

  function closeIndModal() {
    ($('#ind-modal') as HTMLElement).style.display = 'none';
    ($('#ind-modal-bg') as HTMLElement).style.display = 'none';
  }

  $('#ind-btn')?.addEventListener('click', openIndModal);
  $('#ind-modal-close')?.addEventListener('click', closeIndModal);
  $('#ind-modal-bg')?.addEventListener('click', closeIndModal);
  $('#ind-search')?.addEventListener('input', (e) => renderIndList((e.target as HTMLInputElement).value));
}
