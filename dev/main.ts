import { Chart } from '../src/core/chart';
import type { Bar, Datafeed, Timeframe, ChartType, Theme } from '../src/api/types';
import { darkTheme } from '../src/themes/dark';
import { lightTheme } from '../src/themes/light';
import { binanceDatafeed } from './binance-datafeed';
import { TradingDemo } from './trading-demo';
// Indicator imports (used by IND registry below)
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
// Module extractions ready for future refactor:
// import { showToast, addHistory, ... } from './trading-ui';
// import { IND, INDICATORS, activeInd, ... } from './indicator-gallery';

// ── Helpers ─────────────────────────────────────────────────────────────────
const $ = (s: string) => document.querySelector(s)!;
const $$ = (s: string) => document.querySelectorAll(s);

// ── Indicator registry ──────────────────────────────────────────────────────
const IND: Record<string, { indicator: any; params?: Record<string, any> }> = {
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

// ── Mock datafeed (fallback) ────────────────────────────────────────────────
function genBars(n: number, tf: Timeframe, seed = 42000): Bar[] {
  const bars: Bar[] = [];
  const sec = ({ '1s':1,'5s':5,'1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,'1H':3600,'2H':7200,'4H':14400,'1D':86400,'1W':604800 } as any)[tf] ?? 3600;
  const now = Math.floor(Date.now() / 1000);
  let p = seed + Math.random() * 5000;
  for (let i = 0; i < n; i++) {
    const t = now - (n - i) * sec, v = p * .008, c = (Math.random() - .48) * v, o = p, cl = o + c;
    bars.push({ time: t, open: o, close: cl, high: Math.max(o, cl) + Math.random() * v * .5, low: Math.min(o, cl) - Math.random() * v * .5, volume: 50 + Math.random() * 500 });
    p = cl;
  }
  return bars;
}
const mockFeed: Datafeed = {
  async getBars({ timeframe, limit }) { return genBars(limit, timeframe); },
  subscribe({ onTick }) { const id = setInterval(() => onTick({ time: Date.now() / 1000 | 0, price: 0, volume: 0 }), 5000); return () => clearInterval(id); },
  async searchSymbols() { return []; },
};
const feed: Datafeed = {
  async getBars(p) { try { const b = await binanceDatafeed.getBars(p); console.log(`[feed] ${b.length} bars`); return b; } catch (e) { console.warn('[feed] fallback', e); return mockFeed.getBars(p); } },
  subscribe(p) { try { return binanceDatafeed.subscribe(p); } catch { return mockFeed.subscribe(p); } },
  async searchSymbols(q) { try { return await binanceDatafeed.searchSymbols(q); } catch { return []; } },
};

// ── State ───────────────────────────────────────────────────────────────────
// ── Persisted State ─────────────────────────────────────────────────────────
const STORE_KEY = 'exchange-charts-state';

interface PersistedState {
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  dark: boolean;
  vpOn: boolean;
  indicators: { key: string; params?: Record<string, any> }[];
  drawings: object[];
}

function loadState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveState() {
  const state: PersistedState = {
    symbol: sym,
    timeframe: tf,
    chartType: ctype,
    dark,
    vpOn,
    indicators: [...activeInd.keys()].map(k => ({ key: k, params: IND[k]?.params })),
    drawings: chart.getDrawings(),
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

// Auto-save every 5 seconds + on unload
setInterval(saveState, 5000);
window.addEventListener('beforeunload', saveState);

const saved = loadState();
let sym = saved.symbol || 'BTCUSDT';
let tf: Timeframe = (saved.timeframe as Timeframe) || '1H';
let ctype: ChartType = (saved.chartType as ChartType) || 'candlestick';
let dark = saved.dark ?? true;
const activeInd = new Map<string, string>();
let activeTool: string | null = null;
let vpOn = saved.vpOn ?? false;

// ── Chart ───────────────────────────────────────────────────────────────────
const chart = new Chart({ container: '#chart', symbol: sym, timeframe: tf, chartType: ctype, theme: dark ? 'dark' : 'light', datafeed: feed, renderer: 'webgl' });
(window as any).chart = chart;

// Restore saved state after data loads
setTimeout(() => {
  // Restore indicators
  if (saved.indicators) {
    for (const ind of saved.indicators) {
      const cfg = IND[ind.key];
      if (cfg) {
        const id = chart.addIndicator(cfg.indicator, ind.params ?? cfg.params);
        activeInd.set(ind.key, id);
      }
    }
  }
  // Restore volume profile
  if (vpOn) chart.setVolumeProfile(true);
  // Restore drawings
  if (saved.drawings && saved.drawings.length > 0) {
    chart.loadDrawings(saved.drawings);
  }
  // Restore theme
  if (!dark) document.documentElement.dataset.theme = 'light';
  // Update indicator badge
  updateIndBadge();
}, 1500); // wait for data to load

function status() {
  ($('#status-info') as HTMLElement).textContent = `${sym} · ${tf}`;
  // Update timezone display
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  ($('#status-tz') as HTMLElement).textContent = `${timeStr} ${tz.split('/').pop()?.replace('_', ' ') ?? ''}`;
}
status();
setInterval(status, 1000); // update clock every second

// Restore topbar active states
$$('[data-symbol]').forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.symbol === sym));
$$('[data-tf]').forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.tf === tf));

// ── Dropdowns ───────────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  $$('.dropdown.open').forEach(d => {
    if (!d.contains(e.target as Node)) d.classList.remove('open');
  });
});
$$('.dropdown > .tb').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = btn.parentElement!;
    const wasOpen = dd.classList.contains('open');
    $$('.dropdown.open').forEach(d => d.classList.remove('open'));
    if (!wasOpen) dd.classList.add('open');
  });
});

// ── Symbol Selector ────────────────────────────────────────────────────────
function selectSymbol(newSym: string) {
  sym = newSym;
  ($('#symbol-btn') as HTMLElement).textContent = sym;
  $$('[data-symbol]').forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.symbol === sym));
  chart.setSymbol(sym);
  status();
  $('#symbol-dd')?.classList.remove('open');
}

$$('[data-symbol]').forEach(btn => btn.addEventListener('click', () => {
  selectSymbol((btn as HTMLElement).dataset.symbol!);
}));

// Symbol search filter
$('#symbol-search')?.addEventListener('input', (e) => {
  const q = (e.target as HTMLInputElement).value.toLowerCase();
  $$('#symbol-list .dd-item').forEach(el => {
    const text = el.textContent!.toLowerCase();
    (el as HTMLElement).style.display = text.includes(q) ? '' : 'none';
  });
});

// ── Timeframe ───────────────────────────────────────────────────────────────
$$('[data-tf]').forEach(btn => btn.addEventListener('click', () => {
  tf = (btn as HTMLElement).dataset.tf! as Timeframe;
  $$('[data-tf]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  chart.setTimeframe(tf);
  status();
}));

// ── Chart Type ──────────────────────────────────────────────────────────────
const typeNames: Record<string, string> = {
  candlestick: 'Candles', hollow_candle: 'Hollow', heikin_ashi: 'Heikin Ashi',
  bar: 'OHLC Bars', line: 'Line', line_markers: 'Line+', step_line: 'Step',
  area: 'Area', hlc_area: 'HLC Area', baseline: 'Baseline',
  columns: 'Columns', high_low: 'High-Low',
};
$$('[data-chart-type]').forEach(el => el.addEventListener('click', () => {
  ctype = (el as HTMLElement).dataset.chartType! as ChartType;
  $$('[data-chart-type]').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  chart.setChartType(ctype);
  ($('#type-btn') as HTMLElement).textContent = (typeNames[ctype] ?? ctype) + ' ▾';
  $('#type-dd')!.classList.remove('open');
}));

// ── Indicator Gallery ────────────────────────────────────────────────────────
interface IndEntry { key: string; name: string; desc: string; group: string; overlay: boolean; }
const INDICATORS: IndEntry[] = [
  // Trend (overlays)
  { key: 'SMA', name: 'SMA (20)', desc: 'Average price over N periods', group: 'Trend', overlay: true },
  { key: 'EMA', name: 'EMA (50)', desc: 'Weighted average, recent prices matter more', group: 'Trend', overlay: true },
  { key: 'ICH', name: 'Ichimoku Cloud', desc: 'Multi-line trend & support/resistance system', group: 'Trend', overlay: true },
  { key: 'TWAP', name: 'TWAP', desc: 'Time-weighted average price', group: 'Trend', overlay: true },
  { key: 'ST', name: 'Supertrend', desc: 'ATR-based trend following indicator', group: 'Trend', overlay: true },
  { key: 'RIBBON', name: 'EMA Ribbon', desc: 'Multiple EMAs showing trend strength', group: 'Trend', overlay: true },
  { key: 'SAR', name: 'Parabolic SAR', desc: 'Stop and reverse trailing points', group: 'Trend', overlay: true },
  { key: 'SMC', name: 'Smart Money Concepts', desc: 'Order Blocks, FVG, BOS/CHoCH, Market Structure', group: 'Trend', overlay: true },
  // Trend (oscillators)
  { key: 'ADX', name: 'ADX (14)', desc: 'Trend strength 0-100, not direction', group: 'Trend', overlay: false },
  // Momentum
  { key: 'RSI', name: 'RSI (14)', desc: 'Overbought/oversold momentum (0-100)', group: 'Momentum', overlay: false },
  { key: 'MACD', name: 'MACD', desc: 'Trend momentum via EMA convergence/divergence', group: 'Momentum', overlay: false },
  { key: 'STOCH', name: 'Stochastic', desc: 'Price position within recent range', group: 'Momentum', overlay: false },
  { key: 'WR', name: 'Williams %R', desc: 'Overbought/oversold (-100 to 0)', group: 'Momentum', overlay: false },
  { key: 'ROC', name: 'Rate of Change', desc: 'Rate of price change as percentage', group: 'Momentum', overlay: false },
  // Volatility
  { key: 'BB', name: 'Bollinger Bands', desc: 'Price bands based on standard deviation', group: 'Volatility', overlay: true },
  { key: 'ATR', name: 'ATR (14)', desc: 'Average True Range — volatility measure', group: 'Volatility', overlay: false },
  { key: 'ENV', name: 'Envelope', desc: 'Moving average +/- percentage bands', group: 'Volatility', overlay: true },
  // Volume
  { key: 'VWAP', name: 'VWAP', desc: 'Volume-weighted average price', group: 'Volume', overlay: true },
  { key: 'OBV', name: 'OBV', desc: 'Cumulative volume confirming price trends', group: 'Volume', overlay: false },
  { key: 'MFI', name: 'MFI (14)', desc: 'Money Flow Index — volume-weighted RSI', group: 'Volume', overlay: false },
  { key: 'CVD', name: 'Cumulative Vol Delta', desc: 'Cumulative buy vs sell volume delta', group: 'Volume', overlay: false },
  { key: 'VP', name: 'Volume Profile', desc: 'Horizontal histogram of volume at price levels', group: 'Volume', overlay: true },
];

const GROUPS = ['Trend', 'Momentum', 'Volatility', 'Volume'];
let indFavorites: Set<string> = new Set(JSON.parse(localStorage.getItem('ind-favorites') || '[]'));

function saveFavorites() {
  localStorage.setItem('ind-favorites', JSON.stringify([...indFavorites]));
}

function getActiveCount(): number {
  return activeInd.size + (vpOn ? 1 : 0);
}

function updateIndBadge() {
  const count = getActiveCount();
  const btn = document.getElementById('ind-btn') as HTMLElement;
  btn.textContent = count > 0 ? `Indicators (${count}) \u25BE` : `Indicators \u25BE`;
  btn.style.color = count > 0 ? 'var(--accent)' : '';
}

function renderIndList(filter = '') {
  const list = $('#ind-list') as HTMLElement;
  const q = filter.toLowerCase();
  let html = '';

  // Active indicators section (always shown, not filtered)
  const activeItems = INDICATORS.filter(i => activeInd.has(i.key) || (i.key === 'VP' && vpOn));
  if (activeItems.length > 0 && !q) {
    html += `<div class="ind-group-head" style="color:var(--accent);">Active (${activeItems.length})</div>`;
    for (const ind of activeItems) html += indItemHTML(ind);
  }

  // Favorites
  const favItems = INDICATORS.filter(i => indFavorites.has(i.key) && !activeInd.has(i.key) && !(i.key === 'VP' && vpOn) && (!q || i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)));
  if (favItems.length > 0) {
    html += `<div class="ind-group-head">Favorites</div>`;
    for (const ind of favItems) html += indItemHTML(ind);
  }

  // Groups (exclude already shown active items when not filtering)
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

  // Bind toggle clicks
  list.querySelectorAll('.ind-toggle').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleIndicator((el as HTMLElement).dataset.ind!);
      renderIndList(filter);
      updateIndBadge();
    });
  });
  // Bind item click (also toggles)
  list.querySelectorAll('.ind-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.ind-star') || (e.target as HTMLElement).closest('.ind-toggle')) return;
      toggleIndicator((el as HTMLElement).dataset.ind!);
      renderIndList(filter);
      updateIndBadge();
    });
  });
  list.querySelectorAll('.ind-star').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = (el as HTMLElement).dataset.ind!;
      if (indFavorites.has(key)) indFavorites.delete(key); else indFavorites.add(key);
      saveFavorites();
      renderIndList(filter);
    });
  });

  updateIndBadge();
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

function toggleIndicator(key: string) {
  if (key === 'VP') {
    vpOn = !vpOn;
    chart.setVolumeProfile(vpOn);
    return;
  }
  const cfg = IND[key];
  if (!cfg) return;
  if (activeInd.has(key)) {
    chart.removeIndicator(activeInd.get(key)!);
    activeInd.delete(key);
  } else {
    const id = chart.addIndicator(cfg.indicator, cfg.params);
    activeInd.set(key, id);
  }
}

function openIndModal() {
  ($('#ind-modal') as HTMLElement).style.display = 'block';
  ($('#ind-modal-bg') as HTMLElement).style.display = 'block';
  ($('#ind-search') as HTMLInputElement).value = '';
  // Update modal title with active count
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
$('#ind-search')?.addEventListener('input', (e) => {
  renderIndList((e.target as HTMLInputElement).value);
});

// ── Compare ─────────────────────────────────────────────────────────────────
const activeCompares = new Set<string>();
$$('[data-compare]').forEach(el => el.addEventListener('click', async () => {
  const sym = (el as HTMLElement).dataset.compare!;
  if (activeCompares.has(sym)) {
    chart.removeCompare(sym);
    activeCompares.delete(sym);
    el.classList.remove('active');
    el.querySelector('.check')!.textContent = '';
  } else {
    await chart.addCompare(sym);
    activeCompares.add(sym);
    el.classList.add('active');
    el.querySelector('.check')!.textContent = '✓';
  }
}));

// ── Drawing Tools ───────────────────────────────────────────────────────────
function activateTool(tool: string, srcEl?: Element) {
  // Clear all active states
  $$('.db, .tool-group-btn, .tool-flyout-item').forEach(b => b.classList.remove('active'));

  if (tool === 'cursor' || tool === activeTool) {
    chart.setDrawingTool(null);
    activeTool = null;
    $('[data-tool="cursor"]')?.classList.add('active');
    hideDrawingToolbar();
  } else {
    chart.setDrawingTool(tool);
    activeTool = tool;
    hideDrawingToolbar();
    // Mark active: the clicked item + parent group button
    if (srcEl) srcEl.classList.add('active');
    // Also mark the group button that contains this tool
    const group = srcEl?.closest('.tool-group');
    if (group) {
      const groupBtn = group.querySelector('.tool-group-btn') as HTMLElement;
      if (groupBtn) {
        groupBtn.classList.add('active');
        // Update group button icon to match selected tool's icon
        const toolIcon = srcEl?.querySelector('svg');
        if (toolIcon && groupBtn.dataset.tool !== tool) {
          groupBtn.innerHTML = toolIcon.outerHTML;
          groupBtn.dataset.tool = tool;
        }
      }
    }
  }
}

// Direct tool buttons (.db)
$$('.db[data-tool]').forEach(btn => btn.addEventListener('click', () => {
  activateTool((btn as HTMLElement).dataset.tool!, btn);
}));

// Close all flyouts
function closeAllFlyouts() {
  $$('.tool-group').forEach(g => g.classList.remove('open'));
}

// Position and open flyout next to its group button
function openFlyout(group: Element) {
  closeAllFlyouts();
  const btn = group.querySelector('.tool-group-btn') as HTMLElement;
  const flyout = group.querySelector('.tool-flyout') as HTMLElement;
  if (!btn || !flyout) return;

  const rect = btn.getBoundingClientRect();
  flyout.style.left = `${rect.right + 4}px`;
  flyout.style.top = `${rect.top - 4}px`;

  // Ensure flyout doesn't go off-screen bottom
  group.classList.add('open');
  const flyRect = flyout.getBoundingClientRect();
  if (flyRect.bottom > window.innerHeight - 10) {
    flyout.style.top = `${window.innerHeight - flyRect.height - 10}px`;
  }
}

// Group buttons — click opens flyout
$$('.tool-group-btn[data-tool]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const group = (btn as HTMLElement).closest('.tool-group')!;
    const isOpen = group.classList.contains('open');
    if (isOpen) {
      closeAllFlyouts();
    } else {
      openFlyout(group);
    }
  });
});

// Flyout items — click activates tool and closes flyout
$$('.tool-flyout-item[data-tool]').forEach(btn => btn.addEventListener('click', (e) => {
  e.stopPropagation();
  activateTool((btn as HTMLElement).dataset.tool!, btn);
  closeAllFlyouts();
}));

// Close flyouts when clicking elsewhere (but not on toolbar)
document.addEventListener('click', (e) => {
  closeAllFlyouts();
  // Hide drawing toolbar if clicking outside it
  const dtbEl = document.getElementById('drawing-toolbar');
  if (dtbEl && dtbDrawingId && !(e.target as HTMLElement).closest('#drawing-toolbar')) {
    // Don't hide — chart will emit drawingDeselected if clicked on empty space
  }
});

// ── Theme ───────────────────────────────────────────────────────────────────
$('#theme-toggle')?.addEventListener('click', () => {
  dark = !dark;
  chart.setTheme(dark ? 'dark' : 'light');
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  ($('#theme-toggle') as HTMLElement).textContent = dark ? '☀' : '🌙';
});

// ── Period Range Buttons ──────────────────────────────────────────────────
const RANGE_SECONDS: Record<string, number> = {
  '1D': 86400, '5D': 86400 * 5, '1M': 86400 * 30, '3M': 86400 * 90,
  '6M': 86400 * 180, '1Y': 86400 * 365,
};
$$('.status-range').forEach(btn => btn.addEventListener('click', () => {
  const range = (btn as HTMLElement).dataset.range!;
  const sec = RANGE_SECONDS[range];
  if (sec) chart.setVisibleRange(sec);
  $$('.status-range').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}));

// ── Scale Mode Buttons ───────────────────────────────────────────────────
$$('.status-scale').forEach(btn => btn.addEventListener('click', () => {
  const scale = (btn as HTMLElement).dataset.scale as 'linear' | 'logarithmic' | 'percentage';
  chart.setPriceScale(scale);
  $$('.status-scale').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}));

// ── Go to Live ──────────────────────────────────────────────────────────────
$('#go-live')?.addEventListener('click', () => chart.goToLive());

// ── Navigation Buttons ────────────────────────────────────────────────────
$('#nav-zoom-in')?.addEventListener('click', () => chart.zoomIn());
$('#nav-zoom-out')?.addEventListener('click', () => chart.zoomOut());
$('#nav-left')?.addEventListener('click', () => chart.scrollLeft());
$('#nav-right')?.addEventListener('click', () => chart.scrollRight());
$('#nav-reset')?.addEventListener('click', () => chart.resetZoom());

// Show nav buttons when mouse near bottom-center of chart area
const navBtns = document.getElementById('nav-buttons') as HTMLElement;
const chartEl = document.getElementById('chart') as HTMLElement;
chartEl.addEventListener('mousemove', (e) => {
  const rect = chartEl.getBoundingClientRect();
  const bottomZone = e.clientY > rect.bottom - 120 && e.clientY < rect.bottom - 20;
  const centerZone = e.clientX > rect.left + rect.width * 0.3 && e.clientX < rect.right - rect.width * 0.3;
  const show = bottomZone && centerZone;
  navBtns.style.opacity = show ? '1' : '0';
  navBtns.style.pointerEvents = show ? 'auto' : 'none';
});
chartEl.addEventListener('mouseleave', () => {
  if (!navBtns.matches(':hover')) {
    navBtns.style.opacity = '0';
    navBtns.style.pointerEvents = 'none';
  }
});
// Keep buttons visible while hovering directly on them
navBtns.addEventListener('mouseenter', () => {
  navBtns.style.opacity = '1';
  navBtns.style.pointerEvents = 'auto';
});
navBtns.addEventListener('mouseleave', () => {
  navBtns.style.opacity = '0';
  navBtns.style.pointerEvents = 'none';
});

// ── Magnet mode ─────────────────────────────────────────────────────────────
let magnetOn = true;
$('#magnet-toggle')?.addEventListener('click', () => {
  magnetOn = !magnetOn;
  chart.setMagnetMode(magnetOn);
  ($('#magnet-toggle') as HTMLElement).classList.toggle('active', magnetOn);
});

// ── Fullscreen ──────────────────────────────────────────────────────────────
$('#fullscreen-btn')?.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});
document.addEventListener('fullscreenchange', () => {
  const isFs = !!document.fullscreenElement;
  ($('#fullscreen-btn') as HTMLElement).classList.toggle('active', isFs);
  // Trigger chart resize after animation
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
});

// ── Screenshot ──────────────────────────────────────────────────────────────
$('#screenshot-btn')?.addEventListener('click', () => chart.exportPNG(`${sym}_${tf}_${Date.now()}.png`));
$('#copy-btn')?.addEventListener('click', () => chart.copyPNG());

// ── Price Alert ─────────────────────────────────────────────────────────────
$('#alert-btn')?.addEventListener('click', () => {
  const price = prompt('Alert price:');
  if (!price) return;
  chart.addAlert(parseFloat(price));
  showToast('info', 'Alert Set', `@ ${price}`);
});

// ── Clear Drawings ──────────────────────────────────────────────────────────
$('#clear-drawings')?.addEventListener('click', () => chart.clearDrawings());

// ── Stay in Drawing Mode ──────────────────────────────────────────────────
let stayInDrawing = false;
$('#stay-drawing-btn')?.addEventListener('click', () => {
  stayInDrawing = !stayInDrawing;
  chart.setStayInDrawingMode(stayInDrawing);
  ($('#stay-drawing-btn') as HTMLElement).classList.toggle('stay-active', stayInDrawing);
});

// ── Batch Drawing Actions ──────────────────────────────────────────────────
let allLocked = false;
$('#lock-all-btn')?.addEventListener('click', () => {
  allLocked = !allLocked;
  if (allLocked) chart.lockAllDrawings(); else chart.unlockAllDrawings();
  ($('#lock-all-btn') as HTMLElement).classList.toggle('active', allLocked);
});

let allHidden = false;
$('#hide-all-btn')?.addEventListener('click', () => {
  allHidden = !allHidden;
  if (allHidden) chart.hideAllDrawings(); else chart.showAllDrawings();
  ($('#hide-all-btn') as HTMLElement).classList.toggle('active', allHidden);
});

$('#remove-all-btn')?.addEventListener('click', () => {
  if (chart.getDrawingInstances().length === 0) return;
  chart.clearDrawings();
  allLocked = false;
  allHidden = false;
  ($('#lock-all-btn') as HTMLElement).classList.remove('active');
  ($('#hide-all-btn') as HTMLElement).classList.remove('active');
});

// ── Settings Modal ──────────────────────────────────────────────────────────
// Settings state (tracks values that aren't directly readable from chart API)
const settingsState = {
  priceScaleMode: 'linear' as 'linear' | 'logarithmic' | 'percentage',
  showOhlcvLegend: true,
  showIndValues: true,
  showVolume: true,
  showBarChange: true,
  showCountdown: true,
  showHighLow: false,
  showPriceLine: true,
  gridVert: true,
  gridHoriz: true,
  sessionBreaks: false,
  crosshairStyle: 'cross' as string,
  showWatermark: true,
  textSize: 12,
  marginTop: 10,
  marginBot: 10,
  tradePlus: true,
  tradeCtx: true,
  tradeDrag: true,
  stayDrawing: false,
};

function openSettings() {
  const modal = $('#settings-modal') as HTMLElement;
  const bg = $('#settings-bg') as HTMLElement;
  modal.style.display = 'flex';
  bg.style.display = 'block';

  // Pre-fill colors from current theme
  const t = dark ? darkTheme : lightTheme;
  (document.getElementById('s-bull-body') as HTMLInputElement).value = t.bullCandle;
  (document.getElementById('s-bear-body') as HTMLInputElement).value = t.bearCandle;
  (document.getElementById('s-bull-border') as HTMLInputElement).value = t.bullCandle;
  (document.getElementById('s-bear-border') as HTMLInputElement).value = t.bearCandle;
  (document.getElementById('s-bull-wick') as HTMLInputElement).value = t.bullCandleWick;
  (document.getElementById('s-bear-wick') as HTMLInputElement).value = t.bearCandleWick;
  (document.getElementById('s-bg') as HTMLInputElement).value = t.bg;
  // Grid color: strip alpha from rgba if needed, approximate hex
  (document.getElementById('s-grid-color') as HTMLInputElement).value = dark ? '#1a1d23' : '#d0d0d0';

  // Pre-fill checkboxes / selects from settingsState
  (document.getElementById('s-ohlcv-legend') as HTMLInputElement).checked = settingsState.showOhlcvLegend;
  (document.getElementById('s-ind-values') as HTMLInputElement).checked = settingsState.showIndValues;
  (document.getElementById('s-show-volume') as HTMLInputElement).checked = settingsState.showVolume;
  (document.getElementById('s-bar-change') as HTMLInputElement).checked = settingsState.showBarChange;

  // Price scale radio
  (document.querySelectorAll('input[name="s-pscale"]') as NodeListOf<HTMLInputElement>).forEach(r => {
    r.checked = r.value === settingsState.priceScaleMode;
  });
  (document.getElementById('s-countdown') as HTMLInputElement).checked = settingsState.showCountdown;
  (document.getElementById('s-highlow') as HTMLInputElement).checked = settingsState.showHighLow;
  (document.getElementById('s-priceline') as HTMLInputElement).checked = settingsState.showPriceLine;
  (document.getElementById('s-grid-vert') as HTMLInputElement).checked = settingsState.gridVert;
  (document.getElementById('s-grid-horiz') as HTMLInputElement).checked = settingsState.gridHoriz;
  (document.getElementById('s-session-breaks') as HTMLInputElement).checked = settingsState.sessionBreaks;

  (document.getElementById('s-crosshair-style') as HTMLSelectElement).value = settingsState.crosshairStyle;
  (document.getElementById('s-watermark') as HTMLInputElement).checked = settingsState.showWatermark;
  (document.getElementById('s-text-size') as HTMLSelectElement).value = String(settingsState.textSize);
  (document.getElementById('s-margin-top') as HTMLInputElement).value = String(settingsState.marginTop);
  (document.getElementById('s-margin-bot') as HTMLInputElement).value = String(settingsState.marginBot);

  (document.getElementById('s-trade-plus') as HTMLInputElement).checked = settingsState.tradePlus;
  (document.getElementById('s-trade-ctx') as HTMLInputElement).checked = settingsState.tradeCtx;
  (document.getElementById('s-trade-drag') as HTMLInputElement).checked = settingsState.tradeDrag;
  (document.getElementById('s-stay-drawing') as HTMLInputElement).checked = settingsState.stayDrawing;

  // Reset to first tab
  $$('.settings-tab').forEach(t => t.classList.remove('active'));
  $$('.settings-pane').forEach(p => (p as HTMLElement).classList.remove('active'));
  ($$('.settings-tab')[0] as HTMLElement).classList.add('active');
  ($('#sp-symbol') as HTMLElement).classList.add('active');
}

function closeSettings() {
  ($('#settings-modal') as HTMLElement).style.display = 'none';
  ($('#settings-bg') as HTMLElement).style.display = 'none';
}

// Tab switching
document.addEventListener('click', (e) => {
  const tab = (e.target as HTMLElement).closest('.settings-tab') as HTMLElement | null;
  if (!tab) return;
  const paneId = tab.dataset.stab;
  if (!paneId) return;
  $$('.settings-tab').forEach(t => t.classList.remove('active'));
  $$('.settings-pane').forEach(p => (p as HTMLElement).classList.remove('active'));
  tab.classList.add('active');
  ($(`#sp-${paneId}`) as HTMLElement).classList.add('active');
});

$('#settings-toggle')?.addEventListener('click', openSettings);
$('#settings-bg')?.addEventListener('click', closeSettings);
$('#settings-close')?.addEventListener('click', closeSettings);
$('#s-cancel')?.addEventListener('click', closeSettings);

// OK — apply all settings
$('#s-ok')?.addEventListener('click', () => {
  const v = (id: string) => (document.getElementById(id) as HTMLInputElement).value;
  const chk = (id: string) => (document.getElementById(id) as HTMLInputElement).checked;

  // ── Tab 1: Symbol (candle colors) ──
  const base = dark ? { ...darkTheme } : { ...lightTheme };
  const bullBody = v('s-bull-body');
  const bearBody = v('s-bear-body');
  chart.setTheme({
    ...base,
    name: 'custom',
    bullCandle: bullBody,
    bearCandle: bearBody,
    bullCandleWick: v('s-bull-wick'),
    bearCandleWick: v('s-bear-wick'),
    bg: v('s-bg'),
    gridLine: v('s-grid-color') + '30',
    volumeBull: bullBody + '33',
    volumeBear: bearBody + '33',
    lineDefault: bullBody,
  });

  // ── Tab 2: Status Line ──
  settingsState.showOhlcvLegend = chk('s-ohlcv-legend');
  settingsState.showIndValues = chk('s-ind-values');
  settingsState.showVolume = chk('s-show-volume');
  settingsState.showBarChange = chk('s-bar-change');

  // ── Tab 3: Scales & Lines ──
  const scaleRadio = document.querySelector('input[name="s-pscale"]:checked') as HTMLInputElement;
  if (scaleRadio) {
    const mode = scaleRadio.value as 'linear' | 'logarithmic' | 'percentage';
    settingsState.priceScaleMode = mode;
    chart.setPriceScale(mode);
  }
  settingsState.showCountdown = chk('s-countdown');
  settingsState.showHighLow = chk('s-highlow');
  settingsState.showPriceLine = chk('s-priceline');
  settingsState.gridVert = chk('s-grid-vert');
  settingsState.gridHoriz = chk('s-grid-horiz');
  settingsState.sessionBreaks = chk('s-session-breaks');

  // ── Tab 4: Canvas ──
  settingsState.crosshairStyle = v('s-crosshair-style');
  settingsState.showWatermark = chk('s-watermark');
  settingsState.textSize = parseInt(v('s-text-size'), 10);
  settingsState.marginTop = parseInt((document.getElementById('s-margin-top') as HTMLInputElement).value, 10) || 10;
  settingsState.marginBot = parseInt((document.getElementById('s-margin-bot') as HTMLInputElement).value, 10) || 10;

  // ── Apply colorblind theme ──
  const colorScheme = v('s-color-scheme');
  if (colorScheme === 'colorblind') {
    chart.setTheme(dark ? 'colorblind-dark' : 'colorblind-light');
  }

  // ── Apply feature flags ──
  chart.setFeatures({
    ohlcvLegend: settingsState.showOhlcvLegend,
    overlayLegend: settingsState.showIndValues,
    volume: settingsState.showVolume,
    barChange: settingsState.showBarChange,
    countdown: settingsState.showCountdown,
    highLow: settingsState.showHighLow,
    priceLine: settingsState.showPriceLine,
    gridVertical: settingsState.gridVert,
    gridHorizontal: settingsState.gridHoriz,
    sessionBreaks: settingsState.sessionBreaks,
    watermark: settingsState.showWatermark,
  });

  // ── Tab 5: Trading ──
  settingsState.tradePlus = chk('s-trade-plus');
  settingsState.tradeCtx = chk('s-trade-ctx');
  settingsState.tradeDrag = chk('s-trade-drag');
  settingsState.stayDrawing = chk('s-stay-drawing');
  chart.setTradeOptions({
    showPlusButton: settingsState.tradePlus,
    showContextMenu: settingsState.tradeCtx,
    draggableOrderLines: settingsState.tradeDrag,
  });
  chart.setStayInDrawingMode(settingsState.stayDrawing);

  closeSettings();
});

// Reset to defaults
$('#s-reset')?.addEventListener('click', () => {
  chart.setTheme(dark ? 'dark' : 'light');
  chart.setPriceScale('linear');
  settingsState.priceScaleMode = 'linear';
  settingsState.showOhlcvLegend = true;
  settingsState.showIndValues = true;
  settingsState.showVolume = true;
  settingsState.showBarChange = true;
  settingsState.showCountdown = true;
  settingsState.showHighLow = false;
  settingsState.showPriceLine = true;
  settingsState.gridVert = true;
  settingsState.gridHoriz = true;
  settingsState.sessionBreaks = false;
  settingsState.crosshairStyle = 'cross';
  settingsState.showWatermark = true;
  settingsState.textSize = 12;
  settingsState.marginTop = 10;
  settingsState.marginBot = 10;
  settingsState.tradePlus = true;
  settingsState.tradeCtx = true;
  settingsState.tradeDrag = true;
  settingsState.stayDrawing = false;
  chart.setTradeOptions({ showPlusButton: true, showContextMenu: true, draggableOrderLines: true });
  chart.setStayInDrawingMode(false);
  chart.setFeatures({
    ohlcvLegend: true, overlayLegend: true, volume: true, barChange: true,
    countdown: true, highLow: false, priceLine: true,
    gridVertical: true, gridHorizontal: true, sessionBreaks: false, watermark: true,
  });
  closeSettings();
});

// ── Keyboard ────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeTool) {
    chart.setDrawingTool(null);
    activeTool = null;
    $$('.db').forEach(b => b.classList.remove('active'));
    ($$('[data-tool="cursor"]')[0] as HTMLElement)?.classList.add('active');
  }
});

// ── Drawing Floating Toolbar ─────────────────────────────────────────────────
const dtb = $('#drawing-toolbar') as HTMLElement;
let dtbDrawingId: string | null = null;

function showDrawingToolbar(id: string, cx: number, cy: number) {
  const drawing = chart.getSelectedDrawing();
  if (!drawing) return;
  dtbDrawingId = id;

  // Update controls to match drawing state
  (document.getElementById('dtb-color') as HTMLInputElement).value = drawing.options.color;
  ($('#dtb-color-bar') as HTMLElement).style.background = drawing.options.color;
  ($('#dtb-width-label') as HTMLElement).textContent = String(drawing.options.lineWidth);
  ($('#dtb-lock') as HTMLElement).style.color = drawing.locked ? 'var(--accent)' : 'var(--text2)';

  // Position above the drawing
  dtb.style.display = 'block';
  const tbW = dtb.offsetWidth;
  let left = cx - tbW / 2;
  let top = cy - 50;
  // Clamp to viewport
  if (left < 4) left = 4;
  if (left + tbW > window.innerWidth - 4) left = window.innerWidth - tbW - 4;
  if (top < 4) top = cy + 20; // flip below if too high
  dtb.style.left = `${left}px`;
  dtb.style.top = `${top}px`;
}

function hideDrawingToolbar() {
  dtb.style.display = 'none';
  dtbDrawingId = null;
}

chart.on('drawingSelected', (data) => {
  showDrawingToolbar(data.id, data.clientX, data.clientY);
});

chart.on('drawingDeselected', () => {
  hideDrawingToolbar();
});

// Color picker
document.getElementById('dtb-color')!.addEventListener('input', (e) => {
  if (!dtbDrawingId) return;
  const color = (e.target as HTMLInputElement).value;
  chart.updateDrawing(dtbDrawingId, { color });
  ($('#dtb-color-bar') as HTMLElement).style.background = color;
});

// Width dropdown — toggle + items
$('#dtb-width-dd > button')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const dd = $('#dtb-width-dd') as HTMLElement;
  const wasOpen = dd.classList.contains('open');
  // Close all dtb dropdowns
  $$('#drawing-toolbar .dropdown').forEach(d => d.classList.remove('open'));
  if (!wasOpen) dd.classList.add('open');
});
$$('#dtb-width-dd [data-width]').forEach(item => item.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!dtbDrawingId) return;
  const w = parseFloat((item as HTMLElement).dataset.width!);
  chart.updateDrawing(dtbDrawingId, { lineWidth: w });
  ($('#dtb-width-label') as HTMLElement).textContent = String(w);
  $$('#dtb-width-dd .dd-item').forEach(i => i.classList.remove('active'));
  (item as HTMLElement).classList.add('active');
  ($('#dtb-width-dd') as HTMLElement).classList.remove('open');
}));

// Style dropdown — toggle + items
$('#dtb-style-dd > button')?.addEventListener('click', (e) => {
  e.stopPropagation();
  const dd = $('#dtb-style-dd') as HTMLElement;
  const wasOpen = dd.classList.contains('open');
  $$('#drawing-toolbar .dropdown').forEach(d => d.classList.remove('open'));
  if (!wasOpen) dd.classList.add('open');
});
$$('#dtb-style-dd [data-style]').forEach(item => item.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!dtbDrawingId) return;
  const style = (item as HTMLElement).dataset.style as 'solid' | 'dashed' | 'dotted';
  chart.updateDrawing(dtbDrawingId, { lineStyle: style });
  // Update icon
  const dasharray = style === 'dashed' ? '4,3' : style === 'dotted' ? '1,3' : 'none';
  const icon = $('#dtb-style-icon line') as SVGLineElement | null;
  if (icon) icon.setAttribute('stroke-dasharray', dasharray === 'none' ? '' : dasharray);
  ($('#dtb-style-dd') as HTMLElement).classList.remove('open');
}));

// Visibility
$('#dtb-visible')?.addEventListener('click', () => {
  if (!dtbDrawingId) return;
  chart.toggleDrawingVisible(dtbDrawingId);
  hideDrawingToolbar();
});

// Lock
$('#dtb-lock')?.addEventListener('click', () => {
  if (!dtbDrawingId) return;
  chart.toggleDrawingLock(dtbDrawingId);
  const drawing = chart.getSelectedDrawing();
  if (drawing) {
    ($('#dtb-lock') as HTMLElement).style.color = drawing.locked ? 'var(--accent)' : 'var(--text2)';
  }
});

// Delete
$('#dtb-delete')?.addEventListener('click', () => {
  if (!dtbDrawingId) return;
  chart.removeDrawing(dtbDrawingId);
  hideDrawingToolbar();
});

// ── Mode Toggle (Draw / Trade) ───────────────────────────────────────────────
let mode: 'draw' | 'trade' = 'draw';

$('#mode-draw')?.addEventListener('click', () => {
  mode = 'draw';
  ($('#mode-draw') as HTMLElement).classList.add('active');
  ($('#mode-trade') as HTMLElement).classList.remove('active');
  ($('#draw-bar') as HTMLElement).style.display = 'flex';
  chart.setDrawingInteraction(true);
  chart.setTradeMode(false);
});

$('#mode-trade')?.addEventListener('click', () => {
  mode = 'trade';
  ($('#mode-trade') as HTMLElement).classList.add('active');
  ($('#mode-draw') as HTMLElement).classList.remove('active');
  ($('#draw-bar') as HTMLElement).style.display = 'none';
  chart.setDrawingTool(null);
  chart.setDrawingInteraction(false);
  chart.setTradeMode(true);
  activeTool = null;
  hideDrawingToolbar();
  // Auto-show position panel if positions exist
  updatePositionPanel();
});

// ── Toast Notification System ──────────────────────────────────────────────
function showToast(type: 'success' | 'error' | 'info' | 'warn', title: string, msg?: string, duration = 3000) {
  const container = document.getElementById('toast-container')!;
  const el = document.createElement('div');
  el.className = 'toast';
  const iconChar = type === 'success' ? '\u2713' : type === 'error' ? '\u2717' : type === 'warn' ? '!' : 'i';
  el.innerHTML = `
    <div class="toast-icon ${type}">${iconChar}</div>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

// ── Order Placement Popup ─────────────────────────────────────────────────
const opPopup = document.getElementById('order-popup') as HTMLElement;
const opPrice = document.getElementById('op-price') as HTMLInputElement;
const opQty = document.getElementById('op-qty') as HTMLInputElement;
const opTP = document.getElementById('op-tp') as HTMLInputElement;
const opSL = document.getElementById('op-sl') as HTMLInputElement;
const opSubmit = document.getElementById('op-submit') as HTMLButtonElement;
const opBalance = document.getElementById('op-balance') as HTMLElement;
const opCost = document.getElementById('op-cost') as HTMLElement;

let opSide: 'buy' | 'sell' = 'buy';
let opType: 'limit' | 'market' = 'limit';

function openOrderPopup(price: number, side: 'buy' | 'sell', type: 'limit' | 'market', anchorX: number, anchorY: number) {
  opSide = side;
  opType = type;
  opPrice.value = price.toFixed(2);
  opTP.value = '';
  opSL.value = '';
  opBalance.textContent = '$' + trading.getBalance().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Show current position info
  const positions = trading.getPositions();
  const posInfo = document.getElementById('op-position') as HTMLElement;
  if (positions.length > 0) {
    const pos = positions[0]!;
    const pnlSign = pos.pnl >= 0 ? '+' : '';
    const pnlColor = pos.pnl >= 0 ? 'var(--bull)' : 'var(--bear)';
    posInfo.style.display = 'block';
    (document.getElementById('op-pos-label') as HTMLElement).innerHTML =
      `<span style="color:${pos.side === 'long' ? 'var(--bull)' : 'var(--bear)'}">${pos.side.toUpperCase()}</span> ${pos.totalQty}`;
    const pnlEl = document.getElementById('op-pos-pnl') as HTMLElement;
    pnlEl.textContent = `${pnlSign}${pos.pnl.toFixed(2)}`;
    pnlEl.style.color = pnlColor;
    (document.getElementById('op-pos-detail') as HTMLElement).textContent =
      `Entry: ${pos.avgEntry.toFixed(2)} | TP: ${pos.tpLevels.filter(l => !l.triggered).length} | SL: ${pos.slLevels.filter(l => !l.triggered).length}`;
  } else {
    posInfo.style.display = 'none';
  }

  updateOrderPopupUI();

  // Position popup near the click
  opPopup.style.display = 'block';
  const pw = opPopup.offsetWidth;
  const ph = opPopup.offsetHeight;
  let left = anchorX - pw - 12;
  let top = anchorY - ph / 2;
  if (left < 8) left = anchorX + 12;
  if (top < 8) top = 8;
  if (top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8;
  opPopup.style.left = `${left}px`;
  opPopup.style.top = `${top}px`;

  setTimeout(() => opQty.focus(), 50);
}

function closeOrderPopup() {
  opPopup.style.display = 'none';
  // Remove TP/SL preview lines
  chart.removeOrderLine('_preview_tp');
  chart.removeOrderLine('_preview_sl');
}

function updateOrderPopupUI() {
  // Side buttons
  $$('#order-popup .op-side').forEach(b => {
    b.classList.toggle('active', (b as HTMLElement).dataset.side === opSide);
  });

  // Type buttons
  $$('#order-popup .op-type').forEach(b => {
    b.classList.toggle('active', (b as HTMLElement).dataset.otype === opType);
  });

  // Price field disabled for market
  opPrice.disabled = opType === 'market';
  if (opType === 'market') opPrice.value = 'Market';

  // Submit button
  const label = opSide === 'buy'
    ? (opType === 'limit' ? 'Buy Limit' : 'Buy Market')
    : (opType === 'limit' ? 'Sell Limit' : 'Sell Market');
  opSubmit.textContent = label;
  opSubmit.className = 'op-submit ' + (opSide === 'buy' ? 'buy-btn' : 'sell-btn');

  // Cost estimate
  const price = opType === 'market' ? lastPrice : parseFloat(opPrice.value) || 0;
  const qty = parseFloat(opQty.value) || 0;
  opCost.textContent = price && qty ? `Cost: ~$${(price * qty).toFixed(2)}` : '';
}

// Side toggles
$$('#order-popup .op-side').forEach(btn => btn.addEventListener('click', () => {
  opSide = (btn as HTMLElement).dataset.side as 'buy' | 'sell';
  updateOrderPopupUI();
}));

// Type toggles
$$('#order-popup .op-type').forEach(btn => btn.addEventListener('click', () => {
  opType = (btn as HTMLElement).dataset.otype as 'limit' | 'market';
  updateOrderPopupUI();
}));

// Input changes update cost + preview
opPrice.addEventListener('input', updateOrderPopupUI);
opQty.addEventListener('input', updateOrderPopupUI);

// TP/SL preview lines on chart while typing
function updateTPSLPreview() {
  const tp = parseFloat(opTP.value);
  const sl = parseFloat(opSL.value);

  if (tp > 0) {
    chart.removeOrderLine('_preview_tp');
    chart.addOrderLine({ id: '_preview_tp', price: tp, type: 'tp', side: opSide, label: `TP ${tp.toFixed(2)}` });
  } else {
    chart.removeOrderLine('_preview_tp');
  }

  if (sl > 0) {
    chart.removeOrderLine('_preview_sl');
    chart.addOrderLine({ id: '_preview_sl', price: sl, type: 'sl', side: opSide, label: `SL ${sl.toFixed(2)}` });
  } else {
    chart.removeOrderLine('_preview_sl');
  }
}
opTP.addEventListener('input', updateTPSLPreview);
opSL.addEventListener('input', updateTPSLPreview);

// Quick TP/SL percentage buttons
$$('.op-pct-btns button').forEach(btn => btn.addEventListener('click', (e) => {
  e.preventDefault();
  const pct = parseFloat((btn as HTMLElement).dataset.pct!) / 100;
  const target = (btn as HTMLElement).closest('.op-pct-btns')!.getAttribute('data-target');
  const basePrice = opType === 'market' ? lastPrice : (parseFloat(opPrice.value) || lastPrice);
  if (!basePrice) return;

  if (target === 'tp') {
    const tpPrice = opSide === 'buy' ? basePrice * (1 + pct) : basePrice * (1 - pct);
    opTP.value = tpPrice.toFixed(2);
  } else {
    const slPrice = opSide === 'buy' ? basePrice * (1 - pct) : basePrice * (1 + pct);
    opSL.value = slPrice.toFixed(2);
  }
  updateTPSLPreview();
}));

// Close
document.getElementById('op-close')!.addEventListener('click', closeOrderPopup);

// ── Order History ─────────────────────────────────────────────────────────
interface HistoryEntry {
  time: Date;
  type: 'placed' | 'filled' | 'cancelled' | 'tp' | 'sl';
  side: string;
  detail: string;
  pnl?: number;
}
const orderHistory: HistoryEntry[] = [];

function addHistory(entry: HistoryEntry) {
  orderHistory.unshift(entry);
  if (orderHistory.length > 100) orderHistory.pop();
  renderOrderHistory();
}

function renderOrderHistory() {
  const list = document.getElementById('oh-list')!;
  if (!list.offsetParent) return; // not visible
  if (orderHistory.length === 0) {
    list.innerHTML = '<div class="oh-empty">No orders yet</div>';
    return;
  }
  list.innerHTML = orderHistory.map(e => {
    const time = e.time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const pnlHtml = e.pnl !== undefined
      ? `<span class="oh-pnl ${e.pnl >= 0 ? 'profit' : 'loss'}">${e.pnl >= 0 ? '+' : ''}${e.pnl.toFixed(2)}</span>`
      : '';
    return `<div class="oh-row">
      <span class="oh-time">${time}</span>
      <span class="oh-type ${e.type}">${e.type.toUpperCase()}</span>
      <span class="oh-detail">${e.detail}</span>
      ${pnlHtml}
    </div>`;
  }).join('');
}

let historyOpen = false;
$('#history-toggle')?.addEventListener('click', () => {
  historyOpen = !historyOpen;
  (document.getElementById('order-history') as HTMLElement).style.display = historyOpen ? 'block' : 'none';
  ($('#history-toggle') as HTMLElement).classList.toggle('active', historyOpen);
  if (historyOpen) renderOrderHistory();
});
$('#oh-close')?.addEventListener('click', () => {
  historyOpen = false;
  (document.getElementById('order-history') as HTMLElement).style.display = 'none';
  ($('#history-toggle') as HTMLElement).classList.remove('active');
});

// ── Confirmation Dialog ──────────────────────────────────────────────────
const cdDialog = document.getElementById('confirm-dialog') as HTMLElement;
const cdBg = document.getElementById('confirm-bg') as HTMLElement;
let cdCallback: (() => void) | null = null;

function showConfirm(title: string, body: string, btnClass: string, onConfirm: () => void) {
  (document.getElementById('cd-title') as HTMLElement).textContent = title;
  (document.getElementById('cd-body') as HTMLElement).textContent = body;
  const btn = document.getElementById('cd-confirm') as HTMLButtonElement;
  btn.className = 'cd-confirm ' + btnClass;
  btn.textContent = 'Confirm';
  cdCallback = onConfirm;
  cdDialog.style.display = 'block';
  cdBg.style.display = 'block';
}

function hideConfirm() {
  cdDialog.style.display = 'none';
  cdBg.style.display = 'none';
  cdCallback = null;
}

document.getElementById('cd-confirm')!.addEventListener('click', () => {
  cdCallback?.();
  hideConfirm();
});
document.getElementById('cd-cancel')!.addEventListener('click', hideConfirm);
document.getElementById('confirm-bg')!.addEventListener('click', hideConfirm);

// ── Submit Order (with confirmation for market) ──────────────────────────
/** Pending TP/SL to attach when a limit order fills */
const pendingTPSL = new Map<string, { tp: number; sl: number; qty: number }>();

function submitOrder(side: 'buy' | 'sell', type: 'limit' | 'market', price: number, qty: number, tp: number, sl: number) {
  if (type === 'market') {
    trading.placeMarketOrder(side, price, qty);
    showToast('success', `${side.toUpperCase()} Market Filled`, `${qty} @ ${price.toFixed(2)}`);
    addHistory({ time: new Date(), type: 'filled', side, detail: `Market ${qty} @ ${price.toFixed(2)}` });

    // Attach TP/SL immediately — position exists after market fill
    const positions = trading.getPositions();
    const pos = positions[positions.length - 1];
    if (pos) {
      if (tp > 0) { trading.addTP(pos.id, tp, qty); showToast('info', 'TP Set', `@ ${tp.toFixed(2)}`); }
      if (sl > 0) { trading.addSL(pos.id, sl, qty); showToast('warn', 'SL Set', `@ ${sl.toFixed(2)}`); }
    }
  } else {
    const order = trading.placeLimitOrder(side, price, qty);
    showToast('info', `${side.toUpperCase()} Limit Placed`, `${qty} @ ${price.toFixed(2)}`);
    addHistory({ time: new Date(), type: 'placed', side, detail: `Limit ${qty} @ ${price.toFixed(2)}` });

    // Store TP/SL to attach when the limit order fills
    if (tp > 0 || sl > 0) {
      pendingTPSL.set(order.id, { tp, sl, qty });
    }
  }

  trading.syncOverlays(lastPrice || price);
  updatePositionPanel();

  // Remove preview lines and close popup
  chart.removeOrderLine('_preview_tp');
  chart.removeOrderLine('_preview_sl');
  closeOrderPopup();
}

opSubmit.addEventListener('click', () => {
  const qty = parseFloat(opQty.value);
  if (!qty || qty <= 0) { showToast('error', 'Invalid quantity'); return; }
  const price = opType === 'market' ? lastPrice : parseFloat(opPrice.value);
  if (!price || price <= 0) { showToast('error', 'Invalid price'); return; }
  const tp = parseFloat(opTP.value) || 0;
  const sl = parseFloat(opSL.value) || 0;
  const side = opSide;
  const type = opType;

  // Market orders require confirmation
  if (type === 'market') {
    closeOrderPopup();
    showConfirm(
      `${side.toUpperCase()} Market`,
      `Execute ${side} ${qty} @ ~${price.toFixed(2)} ($${(price * qty).toFixed(2)})?`,
      side === 'buy' ? 'buy' : 'sell',
      () => submitOrder(side, type, lastPrice, qty, tp, sl),
    );
    return;
  }

  submitOrder(side, type, price, qty, tp, sl);
});

// ── Keyboard shortcuts for order popup ───────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Escape closes popup or confirm dialog
  if (e.key === 'Escape') {
    if (cdDialog.style.display === 'block') { hideConfirm(); return; }
    if (opPopup.style.display === 'block') { closeOrderPopup(); return; }
  }
  // Enter submits order popup (when focused inside it)
  if (e.key === 'Enter' && opPopup.style.display === 'block') {
    const active = document.activeElement;
    if (active && opPopup.contains(active)) {
      e.preventDefault();
      opSubmit.click();
    }
  }
  // Enter confirms dialog
  if (e.key === 'Enter' && cdDialog.style.display === 'block') {
    e.preventDefault();
    document.getElementById('cd-confirm')!.click();
  }
});

// ── Trade Execution (from chart events) ──────────────────────────────────
chart.on('tradeRequested', (data) => {
  const rect = document.getElementById('chart')!.getBoundingClientRect();
  openOrderPopup(data.price, data.side, data.type, rect.right - 80, rect.top + rect.height / 2);
});

// ── Inline Text Editor (WYSIWYG) ────────────────────────────────────────────
const inlineInput = document.getElementById('inline-text-input') as HTMLTextAreaElement;
let inlineEditDrawingId: string | null = null;
let _inlineOriginalText = '';
let _inlineToolName = '';

function getTextFontSize(lw: number): number {
  const sizeMap: Record<number, number> = { 1: 12, 2: 16, 3: 24, 4: 32, 5: 48 };
  return sizeMap[Math.round(lw)] ?? Math.max(12, lw * 8);
}

chart.on('textInputRequested', (data) => {
  inlineEditDrawingId = data.drawingId;
  _inlineOriginalText = data.currentText;
  _inlineToolName = data.toolName;
  inlineInput.value = data.currentText || '';

  const lw = data.lineWidth;
  const color = data.color;

  // Hide canvas text while editing — textarea IS the text
  chart.updateDrawing(data.drawingId, { text: '\u200B' });

  // Common styles
  inlineInput.style.display = 'block';
  inlineInput.style.outline = 'none';
  inlineInput.style.resize = 'none';
  inlineInput.style.fontFamily = 'inherit';

  if (data.toolName === 'callout') {
    // Callout: colored badge, white bold text, centered
    const fontSize = Math.max(10, (lw || 1.5) * 8);
    inlineInput.style.fontSize = `${fontSize}px`;
    inlineInput.style.fontWeight = 'bold';
    inlineInput.style.color = '#ffffff';
    inlineInput.style.background = color;
    inlineInput.style.border = 'none';
    inlineInput.style.borderRadius = '6px';
    inlineInput.style.textAlign = 'center';
    inlineInput.style.padding = '6px 12px';
    // Position above the click point (callout badge is above anchor)
    const badgeH = fontSize + 4 + 8;
    inlineInput.style.left = `${data.clientX - 100}px`;
    inlineInput.style.top = `${data.clientY - badgeH - 12}px`;
    inlineInput.style.width = '200px';
    inlineInput.style.height = `${fontSize + 20}px`;
  } else if (data.toolName === 'note') {
    // Note: bordered box with light colored bg, colored text
    const fontSize = 11;
    inlineInput.style.fontSize = `${fontSize}px`;
    inlineInput.style.fontWeight = 'normal';
    inlineInput.style.color = color;
    inlineInput.style.background = color + '20';
    inlineInput.style.border = `1px solid ${color}`;
    inlineInput.style.borderRadius = '4px';
    inlineInput.style.textAlign = 'left';
    inlineInput.style.padding = '8px';
    inlineInput.style.left = `${data.clientX}px`;
    inlineInput.style.top = `${data.clientY}px`;
    inlineInput.style.width = '200px';
    inlineInput.style.height = '60px';
  } else {
    // Text annotation: dark semi-transparent bg, colored text
    const fontSize = getTextFontSize(lw);
    inlineInput.style.fontSize = `${fontSize}px`;
    inlineInput.style.fontWeight = lw >= 2 ? 'bold' : 'normal';
    inlineInput.style.color = color;
    inlineInput.style.background = 'rgba(0,0,0,0.35)';
    inlineInput.style.border = 'none';
    inlineInput.style.borderRadius = '0';
    inlineInput.style.textAlign = 'left';
    inlineInput.style.padding = '3px 6px';
    inlineInput.style.left = `${data.clientX - 4}px`;
    inlineInput.style.top = `${data.clientY - 4}px`;
    inlineInput.style.width = `${Math.max(200, (data.currentText || '').length * fontSize * 0.6 + 60)}px`;
    inlineInput.style.height = `${fontSize * 1.5 + 16}px`;
  }

  inlineInput.placeholder = data.toolName === 'callout' ? 'Label' : data.toolName === 'note' ? 'Note' : 'Text';

  hideDrawingToolbar();
  setTimeout(() => { inlineInput.focus(); inlineInput.select(); }, 10);
});

// Live resize on input (no canvas update during editing — textarea IS the visible text)
inlineInput.addEventListener('input', () => {
  if (!inlineEditDrawingId) return;
  // Auto-resize for text annotation
  if (_inlineToolName === 'text') {
    const drawing = chart.getDrawingInstances().find(d => d.id === inlineEditDrawingId);
    const lw = drawing?.options?.lineWidth ?? 1.5;
    const fontSize = getTextFontSize(lw);
    inlineInput.style.width = `${Math.max(200, inlineInput.value.length * fontSize * 0.6 + 60)}px`;
  }
  // Auto-grow height for note (multiline)
  if (_inlineToolName === 'note') {
    inlineInput.style.height = 'auto';
    inlineInput.style.height = `${Math.max(60, inlineInput.scrollHeight)}px`;
  }
});

function commitInlineText() {
  if (!inlineEditDrawingId) return;
  const text = inlineInput.value.trim();
  if (text) {
    chart.updateDrawing(inlineEditDrawingId, { text });
  } else {
    chart.removeDrawing(inlineEditDrawingId);
  }
  inlineInput.style.display = 'none';
  inlineEditDrawingId = null;
  _inlineToolName = '';
}

function cancelInlineText() {
  if (!inlineEditDrawingId) return;
  if (_inlineOriginalText) {
    chart.updateDrawing(inlineEditDrawingId, { text: _inlineOriginalText });
  } else {
    chart.removeDrawing(inlineEditDrawingId);
  }
  inlineInput.style.display = 'none';
  inlineEditDrawingId = null;
  _inlineToolName = '';
}

inlineInput.addEventListener('keydown', (e) => {
  // Note supports multiline with Enter; commit with Ctrl+Enter
  if (_inlineToolName === 'note') {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commitInlineText(); }
  } else {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitInlineText(); }
  }
  if (e.key === 'Escape') { cancelInlineText(); }
  e.stopPropagation();
});
inlineInput.addEventListener('blur', () => { commitInlineText(); });

// ── Trading Demo (chart overlay — no side panel) ────────────────────────────
let lastPrice = 0;
const trading = new TradingDemo(chart, () => { updatePositionPanel(); });
(window as any)._trading = trading;

trading.onTradeEvent = (event) => {
  switch (event.type) {
    case 'orderFilled': {
      showToast('success', 'Order Filled', `${event.order.side.toUpperCase()} ${event.order.quantity} @ ${event.order.price.toFixed(2)}`);
      addHistory({ time: new Date(), type: 'filled', side: event.order.side, detail: `Limit filled ${event.order.quantity} @ ${event.order.price.toFixed(2)}` });
      // Attach pending TP/SL
      const pending = pendingTPSL.get(event.order.id);
      if (pending) {
        pendingTPSL.delete(event.order.id);
        const positions = trading.getPositions();
        const pos = positions[positions.length - 1];
        if (pos) {
          if (pending.tp > 0) { trading.addTP(pos.id, pending.tp, pending.qty); showToast('info', 'TP Set', `@ ${pending.tp.toFixed(2)}`); }
          if (pending.sl > 0) { trading.addSL(pos.id, pending.sl, pending.qty); showToast('warn', 'SL Set', `@ ${pending.sl.toFixed(2)}`); }
          trading.syncOverlays(lastPrice);
        }
      }
      break;
    }
    case 'tpHit':
      showToast('success', `TP${event.level} Hit`, `Closed ${event.qty} @ ${event.price.toFixed(2)} — PnL: +${event.pnl.toFixed(2)}`);
      addHistory({ time: new Date(), type: 'tp', side: '', detail: `TP${event.level} @ ${event.price.toFixed(2)}`, pnl: event.pnl });
      break;
    case 'slHit':
      showToast('error', `SL${event.level} Hit`, `Closed ${event.qty} @ ${event.price.toFixed(2)} — PnL: ${event.pnl.toFixed(2)}`);
      addHistory({ time: new Date(), type: 'sl', side: '', detail: `SL${event.level} @ ${event.price.toFixed(2)}`, pnl: event.pnl });
      break;
  }
};

chart.on('crosshairMove', (data) => { if (data.bar) lastPrice = data.bar.close; });
chart.on('barUpdate', (bar) => {
  lastPrice = bar.close;
  trading.onPriceTick(lastPrice);
  trading.syncOverlays(lastPrice);
  updatePositionPanel();
});

// ── Demo Trade Button ─────────────────────────────────────────────────────
$('#demo-trade-btn')?.addEventListener('click', () => {
  // Switch to trade mode if not already
  if (mode !== 'trade') {
    ($('#mode-trade') as HTMLElement).click();
  }

  const price = lastPrice;
  if (!price || price <= 0) {
    showToast('error', 'No price data', 'Wait for chart to load');
    return;
  }

  // If already have a position, close it first
  for (const pos of [...trading.getPositions()]) {
    trading.closePosition(pos.id, price);
  }
  trading.syncOverlays(price);

  // Open a long position at current price
  const qty = 0.05;
  const side: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
  const positionSide = side === 'buy' ? 'long' : 'short';
  trading.placeMarketOrder(side, price, qty);

  const positions = trading.getPositions();
  const pos = positions[positions.length - 1];
  if (!pos) return;

  // Add TP at +2% and SL at -1%
  const tpPrice = side === 'buy' ? price * 1.02 : price * 0.98;
  const slPrice = side === 'buy' ? price * 0.99 : price * 1.01;
  trading.addTP(pos.id, tpPrice, qty);
  trading.addSL(pos.id, slPrice, qty);

  trading.syncOverlays(price);
  updatePositionPanel();

  showToast('success', `Demo: ${positionSide.toUpperCase()} Opened`,
    `${qty} @ ${price.toFixed(2)} | TP: ${tpPrice.toFixed(2)} | SL: ${slPrice.toFixed(2)}`);
  addHistory({ time: new Date(), type: 'filled', side, detail: `Demo ${positionSide} ${qty} @ ${price.toFixed(2)}` });
});

// ── Position Panel ────────────────────────────────────────────────────────
const posPanel = document.getElementById('position-panel') as HTMLElement;
const ppBody = document.getElementById('pp-body') as HTMLElement;
const ppTotalPnl = document.getElementById('pp-total-pnl') as HTMLElement;

function updatePositionPanel() {
  const positions = trading.getPositions();
  if (positions.length === 0) {
    posPanel.style.display = 'none';
    return;
  }
  posPanel.style.display = 'block';

  let totalPnl = 0;
  let html = '';
  for (const pos of positions) {
    totalPnl += pos.pnl;
    const pnlPct = pos.avgEntry > 0 ? ((pos.pnl / (pos.avgEntry * pos.totalQty)) * 100) : 0;
    const pnlClass = pos.pnl >= 0 ? 'profit' : 'loss';
    const pnlStr = (pos.pnl >= 0 ? '+' : '') + pos.pnl.toFixed(2);
    const pctStr = (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(2) + '%';
    html += `<div class="pp-row" data-pos-id="${pos.id}">
      <span class="pp-side ${pos.side}">${pos.side.toUpperCase()}</span>
      <span class="pp-entry">${pos.avgEntry.toFixed(2)}</span>
      <span class="pp-qty">${pos.totalQty}</span>
      <span class="pp-pnl ${pnlClass}">${pnlStr} (${pctStr})</span>
      <button class="pp-close-btn" data-close-pos="${pos.id}">Close</button>
    </div>`;
  }
  ppBody.innerHTML = html;

  const totalClass = totalPnl >= 0 ? 'profit' : 'loss';
  ppTotalPnl.className = 'pp-pnl ' + totalClass;
  ppTotalPnl.textContent = (totalPnl >= 0 ? '+' : '') + totalPnl.toFixed(2);

  // Close position buttons
  ppBody.querySelectorAll('[data-close-pos]').forEach(btn => {
    btn.addEventListener('click', () => {
      const posId = (btn as HTMLElement).dataset.closePos!;
      const pos = trading.getPositions().find(p => p.id === posId);
      const pnl = pos?.pnl ?? 0;
      const side = pos?.side ?? '';
      const qty = pos?.totalQty ?? 0;
      trading.closePosition(posId, lastPrice);
      trading.syncOverlays(lastPrice);
      if (pos) {
        showToast(
          pnl >= 0 ? 'success' : 'error',
          'Position Closed',
          `${side.toUpperCase()} ${qty} — PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`
        );
        addHistory({ time: new Date(), type: pnl >= 0 ? 'tp' : 'sl', side, detail: `Closed ${side} ${qty}`, pnl });
      }
      updatePositionPanel();
    });
  });
}

// ── Order Line Drag → Update Trading State ────────────────────────────────
chart.on('orderLineMoved', (data) => {
  // Find what this order line represents and update
  const order = trading.orders.find(o => o.id === data.id && o.status === 'open');
  if (order) {
    order.price = data.price;
    chart.updateOrderLine(data.id, {
      label: `${order.side.toUpperCase()} LIMIT ${order.quantity}`,
      price: data.price,
    });
    showToast('info', 'Order Moved', `${order.side.toUpperCase()} Limit → ${data.price.toFixed(2)}`);
    return;
  }

  // Check TP/SL levels
  for (const pos of trading.getPositions()) {
    const tp = pos.tpLevels.find(l => l.id === data.id);
    if (tp) {
      tp.price = data.price;
      chart.updateOrderLine(data.id, {
        label: `TP ${data.price.toFixed(2)} (${tp.quantity})`,
        price: data.price,
      });
      showToast('info', 'TP Moved', `→ ${data.price.toFixed(2)}`);
      trading.syncOverlays(lastPrice);
      return;
    }
    const sl = pos.slLevels.find(l => l.id === data.id);
    if (sl) {
      sl.price = data.price;
      chart.updateOrderLine(data.id, {
        label: `SL ${data.price.toFixed(2)} (${sl.quantity})`,
        price: data.price,
      });
      showToast('warn', 'SL Moved', `→ ${data.price.toFixed(2)}`);
      trading.syncOverlays(lastPrice);
      return;
    }
  }
});

// ── Object List Panel ─────────────────────────────────────────────────────
const objPanel = document.getElementById('objects-panel') as HTMLElement;
const objList = document.getElementById('obj-list') as HTMLElement;
let objPanelOpen = false;

const TOOL_LABELS: Record<string, string> = {
  'trend-line': 'Trend Line', 'ray': 'Ray', 'info-line': 'Info Line',
  'extended-line': 'Extended Line', 'horizontal-line': 'Horizontal Line',
  'vertical-line': 'Vertical Line', 'cross-line': 'Cross Line', 'polyline': 'Polyline',
  'parallel-channel': 'Parallel Channel', 'regression-channel': 'Regression Channel',
  'pitchfork': 'Pitchfork', 'fib-retracement': 'Fib Retracement',
  'fib-extension': 'Fib Extension', 'fib-channel': 'Fib Channel',
  'fib-timezone': 'Fib Time Zone', 'fib-speed-fan': 'Fib Speed Fan',
  'fib-circles': 'Fib Circles', 'fib-spiral': 'Fib Spiral', 'fib-arcs': 'Fib Arcs',
  'fib-wedge': 'Fib Wedge', 'gann-box': 'Gann Box', 'gann-square': 'Gann Square',
  'gann-fan': 'Gann Fan', 'xabcd-pattern': 'XABCD', 'abcd-pattern': 'ABCD',
  'head-shoulders': 'Head & Shoulders', 'triangle': 'Triangle',
  'three-drives': 'Three Drives', 'elliott-impulse': 'Elliott Impulse',
  'elliott-correction': 'Elliott ABC', 'elliott-triangle': 'Elliott ABCDE',
  'cyclic-lines': 'Cyclic Lines', 'sine-line': 'Sine Line',
  'rectangle': 'Rectangle', 'ellipse': 'Ellipse', 'arc': 'Arc',
  'arrow': 'Arrow', 'brush': 'Brush', 'text': 'Text', 'callout': 'Callout',
  'note': 'Note', 'flag-marker': 'Flag', 'long-short': 'Long / Short',
  'forecast': 'Forecast', 'price-range': 'Price Range', 'date-range': 'Date Range',
  'fixed-range-vp': 'Fixed Range VP',
};

const TOOL_GROUPS: Record<string, string> = {
  'trend-line': 'Lines', 'ray': 'Lines', 'info-line': 'Lines', 'extended-line': 'Lines',
  'horizontal-line': 'Lines', 'vertical-line': 'Lines', 'cross-line': 'Lines', 'polyline': 'Lines',
  'parallel-channel': 'Channels', 'regression-channel': 'Channels', 'pitchfork': 'Channels',
  'fib-retracement': 'Fibonacci', 'fib-extension': 'Fibonacci', 'fib-channel': 'Fibonacci',
  'fib-timezone': 'Fibonacci', 'fib-speed-fan': 'Fibonacci', 'fib-circles': 'Fibonacci',
  'fib-spiral': 'Fibonacci', 'fib-arcs': 'Fibonacci', 'fib-wedge': 'Fibonacci',
  'gann-box': 'Gann', 'gann-square': 'Gann', 'gann-fan': 'Gann',
  'xabcd-pattern': 'Patterns', 'abcd-pattern': 'Patterns', 'head-shoulders': 'Patterns',
  'triangle': 'Patterns', 'three-drives': 'Patterns',
  'elliott-impulse': 'Elliott', 'elliott-correction': 'Elliott', 'elliott-triangle': 'Elliott',
  'cyclic-lines': 'Cycles', 'sine-line': 'Cycles',
  'rectangle': 'Shapes', 'ellipse': 'Shapes', 'arc': 'Shapes', 'arrow': 'Shapes', 'brush': 'Shapes',
  'text': 'Text', 'callout': 'Text', 'note': 'Text', 'flag-marker': 'Text',
  'long-short': 'Measure', 'forecast': 'Measure', 'price-range': 'Measure',
  'date-range': 'Measure', 'fixed-range-vp': 'Measure',
};

const GROUP_ORDER = ['Lines', 'Channels', 'Fibonacci', 'Gann', 'Patterns', 'Elliott', 'Cycles', 'Shapes', 'Text', 'Measure'];
const collapsedGroups = new Set<string>();

function toggleObjectPanel() {
  objPanelOpen = !objPanelOpen;
  objPanel.style.display = objPanelOpen ? 'block' : 'none';
  ($('#objects-toggle') as HTMLElement).classList.toggle('active', objPanelOpen);
  if (objPanelOpen) renderObjectList();
}

function drawingItemHTML(d: { id: string; toolName: string; options: any; locked: boolean; visible: boolean }, drawingIndex: number) {
  const name = TOOL_LABELS[d.toolName] ?? d.toolName;
  const color = d.options?.color ?? '#2962FF';
  const hiddenClass = d.visible ? '' : ' hidden';
  const lockActive = d.locked ? ' active' : '';
  return `<div class="obj-item${hiddenClass}" data-obj-id="${d.id}" data-draw-idx="${drawingIndex}" draggable="true">
    <div class="obj-drag" style="cursor:grab; color:var(--text3); display:flex; align-items:center; padding-right:4px;">
      <svg width="6" height="10" viewBox="0 0 6 10"><circle cx="1.5" cy="1.5" r="1" fill="currentColor"/><circle cx="4.5" cy="1.5" r="1" fill="currentColor"/><circle cx="1.5" cy="5" r="1" fill="currentColor"/><circle cx="4.5" cy="5" r="1" fill="currentColor"/><circle cx="1.5" cy="8.5" r="1" fill="currentColor"/><circle cx="4.5" cy="8.5" r="1" fill="currentColor"/></svg>
    </div>
    <div class="obj-color" style="background: ${color};"></div>
    <span class="obj-name">${name}${d.options?.text ? ': ' + d.options.text.slice(0, 20) : ''}</span>
    <div class="obj-actions">
      <button class="obj-btn" data-obj-vis="${d.id}" title="Visibility">
        <svg viewBox="0 0 24 24">${d.visible
          ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
          : '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>'
        }</svg>
      </button>
      <button class="obj-btn${lockActive}" data-obj-lock="${d.id}" title="Lock">
        <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      </button>
      <button class="obj-btn" data-obj-del="${d.id}" title="Delete">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
      </button>
    </div>
  </div>`;
}

function renderObjectList() {
  if (!objPanelOpen) return;

  const drawings = chart.getDrawingInstances();
  const indEntries = [...activeInd.entries()];

  let html = '';

  // Indicators section
  if (indEntries.length > 0 || vpOn) {
    const indCount = indEntries.length + (vpOn ? 1 : 0);
    const indCollapsed = collapsedGroups.has('_indicators');
    html += `<div class="obj-group-head" data-obj-group="_indicators" style="cursor:pointer; user-select:none;">
      <span style="font-size:8px; margin-right:4px;">${indCollapsed ? '\u25B6' : '\u25BC'}</span>Indicators (${indCount})</div>`;
    if (!indCollapsed) {
      for (const [key] of indEntries) {
        const ind = INDICATORS.find(i => i.key === key);
        const name = ind?.name ?? key;
        html += `<div class="obj-item" data-ind-key="${key}">
          <div class="obj-color" style="background: var(--accent);"></div>
          <span class="obj-name">${name}</span>
          <div class="obj-actions">
            <button class="obj-btn" data-obj-remove-ind="${key}" title="Remove">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>`;
      }
      if (vpOn) {
        html += `<div class="obj-item">
          <div class="obj-color" style="background: #5c6bc0;"></div>
          <span class="obj-name">Volume Profile</span>
          <div class="obj-actions">
            <button class="obj-btn" id="obj-remove-vp" title="Remove">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>`;
      }
    }
  }

  // Group drawings by type
  if (drawings.length > 0) {
    const grouped = new Map<string, { d: typeof drawings[0]; idx: number }[]>();
    drawings.forEach((d, idx) => {
      const group = TOOL_GROUPS[d.toolName] ?? 'Other';
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push({ d, idx });
    });

    for (const groupName of GROUP_ORDER) {
      const items = grouped.get(groupName);
      if (!items || items.length === 0) continue;
      const collapsed = collapsedGroups.has(groupName);
      html += `<div class="obj-group-head" data-obj-group="${groupName}" style="cursor:pointer; user-select:none;">
        <span style="font-size:8px; margin-right:4px;">${collapsed ? '\u25B6' : '\u25BC'}</span>${groupName} (${items.length})</div>`;
      if (!collapsed) {
        for (const { d, idx } of items) html += drawingItemHTML(d, idx);
      }
    }
    // "Other" group for unknown tools
    const other = grouped.get('Other');
    if (other && other.length > 0) {
      const collapsed = collapsedGroups.has('Other');
      html += `<div class="obj-group-head" data-obj-group="Other" style="cursor:pointer; user-select:none;">
        <span style="font-size:8px; margin-right:4px;">${collapsed ? '\u25B6' : '\u25BC'}</span>Other (${other.length})</div>`;
      if (!collapsed) {
        for (const { d, idx } of other) html += drawingItemHTML(d, idx);
      }
    }
  }

  if (!html) html = `<div class="obj-empty">No objects on chart</div>`;
  objList.innerHTML = html;

  // ── Bind events ────
  // Group collapse toggle
  objList.querySelectorAll('[data-obj-group]').forEach(el => el.addEventListener('click', () => {
    const g = (el as HTMLElement).dataset.objGroup!;
    if (collapsedGroups.has(g)) collapsedGroups.delete(g); else collapsedGroups.add(g);
    renderObjectList();
  }));

  // Visibility / Lock / Delete
  objList.querySelectorAll('[data-obj-vis]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    chart.toggleDrawingVisible((btn as HTMLElement).dataset.objVis!);
    renderObjectList();
  }));
  objList.querySelectorAll('[data-obj-lock]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    chart.toggleDrawingLock((btn as HTMLElement).dataset.objLock!);
    renderObjectList();
  }));
  objList.querySelectorAll('[data-obj-del]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    chart.removeDrawing((btn as HTMLElement).dataset.objDel!);
    renderObjectList();
  }));
  objList.querySelectorAll('[data-obj-remove-ind]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleIndicator((btn as HTMLElement).dataset.objRemoveInd!);
    renderObjectList();
  }));
  document.getElementById('obj-remove-vp')?.addEventListener('click', (e) => {
    e.stopPropagation();
    vpOn = false;
    chart.setVolumeProfile(false);
    renderObjectList();
  });

  // ── Drag-to-reorder ────
  let dragId: string | null = null;
  objList.querySelectorAll('[data-obj-id][draggable]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      dragId = (el as HTMLElement).dataset.objId!;
      (el as HTMLElement).style.opacity = '0.4';
      (e as DragEvent).dataTransfer!.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      (el as HTMLElement).style.opacity = '';
      dragId = null;
      objList.querySelectorAll('.obj-item').forEach(i => (i as HTMLElement).style.borderTop = '');
    });
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      (e as DragEvent).dataTransfer!.dropEffect = 'move';
      const target = (el as HTMLElement);
      // Show drop indicator
      objList.querySelectorAll('.obj-item').forEach(i => (i as HTMLElement).style.borderTop = '');
      target.style.borderTop = '2px solid var(--accent)';
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const targetId = (el as HTMLElement).dataset.objId!;
      if (!dragId || dragId === targetId) return;
      // Get target index in all drawings
      const allDrawings = chart.getDrawingInstances();
      const targetIdx = allDrawings.findIndex(d => d.id === targetId);
      if (targetIdx >= 0) {
        chart.reorderDrawing(dragId, targetIdx);
        renderObjectList();
      }
    });
  });
}

$('#objects-toggle')?.addEventListener('click', toggleObjectPanel);
$('#obj-close')?.addEventListener('click', toggleObjectPanel);

// Refresh object list when drawings change
chart.on('drawingAdded', () => renderObjectList());
chart.on('drawingRemoved', () => renderObjectList());
