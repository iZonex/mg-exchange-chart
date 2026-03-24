// ── Smart Money Concepts (SMC) Indicator ───────────────────────────────────
// Ported from bot-trader-2-0 Rust implementation (TEST 43B validated).
// Detects: Swing Points, Order Blocks, FVGs, BOS/CHoCH, Market Structure.

import type { Bar, Indicator, IndicatorOutput, CustomRenderContext } from '../../api/types';
import { font } from '../../core/font';
import { priceToY, formatPrice } from '../../core/renderer/price-axis';
import { barIndexToX } from '../../core/renderer/time-axis';
import { t } from '../../core/i18n';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SwingPoint {
  idx: number;
  price: number;
  isHigh: boolean;
}

export interface OrderBlock {
  high: number;
  low: number;
  candleIndex: number;
  type: 'bullish' | 'bearish';
  mitigated: boolean;
  mitigatedIndex: number;
  volumePct: number;
}

export interface FairValueGap {
  type: 'bullish' | 'bearish';
  low: number;
  high: number;
  candleIndex: number;
  filled: boolean;
  mitigatedIndex: number;
  gapSizePct: number;
}

export interface BOSEvent {
  type: 'bos' | 'choch';
  direction: 'bullish' | 'bearish';
  level: number;
  candleIndex: number;
}

export type StructureType = 'uptrend' | 'downtrend' | 'ranging' | 'unknown';

export interface SMCData {
  swings: SwingPoint[];
  orderBlocks: OrderBlock[];
  fvgs: FairValueGap[];
  bosEvents: BOSEvent[];
  structure: StructureType;
}

// ── Swing Detection (N-bar pivot + deconfliction) ──────────────────────────

function detectSwings(bars: readonly Bar[], swingN: number): SwingPoint[] {
  const len = bars.length;
  if (len < swingN * 2 + 1) return [];

  const swings: (1 | -1 | null)[] = new Array(len).fill(null);

  for (let i = swingN; i < len - swingN; i++) {
    let isHigh = true;
    let isLow = true;

    for (let d = 1; d <= swingN; d++) {
      if (bars[i]!.high <= bars[i - d]!.high) isHigh = false;
      if (i + d < len && bars[i]!.high <= bars[i + d]!.high) isHigh = false;
      if (bars[i]!.low >= bars[i - d]!.low) isLow = false;
      if (i + d < len && bars[i]!.low >= bars[i + d]!.low) isLow = false;
    }

    if (isHigh && isLow) {
      swings[i] = bars[i]!.close > bars[i]!.open ? 1 : -1;
    } else if (isHigh) {
      swings[i] = 1;
    } else if (isLow) {
      swings[i] = -1;
    }
  }

  // Deconfliction: enforce alternating H-L-H-L
  let changed = true;
  while (changed) {
    changed = false;
    const positions: number[] = [];
    for (let i = 0; i < len; i++) {
      if (swings[i] !== null) positions.push(i);
    }
    for (let j = 0; j + 1 < positions.length; j++) {
      const ci = positions[j]!, ni = positions[j + 1]!;
      if (swings[ci] === null || swings[ni] === null) continue;
      if (swings[ci] === 1 && swings[ni] === 1) {
        if (bars[ci]!.high < bars[ni]!.high) swings[ci] = null;
        else swings[ni] = null;
        changed = true;
      } else if (swings[ci] === -1 && swings[ni] === -1) {
        if (bars[ci]!.low > bars[ni]!.low) swings[ci] = null;
        else swings[ni] = null;
        changed = true;
      }
    }
  }

  const result: SwingPoint[] = [];
  for (let i = 0; i < len; i++) {
    if (swings[i] !== null) {
      result.push({
        idx: i,
        price: swings[i] === 1 ? bars[i]!.high : bars[i]!.low,
        isHigh: swings[i] === 1,
      });
    }
  }
  return result;
}

// ── Order Blocks ───────────────────────────────────────────────────────────

function detectOrderBlocks(bars: readonly Bar[], swings: SwingPoint[], maxAge: number): OrderBlock[] {
  if (bars.length < 10) return [];
  const obs: OrderBlock[] = [];
  const usedCandleIndices = new Set<number>(); // Prevent duplicates at same candle

  // Bullish OBs
  const swingHighs = swings.filter(s => s.isHigh);
  const crossedH = new Set<number>();
  for (let i = 0; i < bars.length; i++) {
    // Find most recent uncrossed swing high before this bar
    let bestSH: SwingPoint | null = null;
    for (let k = swingHighs.length - 1; k >= 0; k--) {
      const sh = swingHighs[k]!;
      if (sh.idx < i && !crossedH.has(sh.idx)) { bestSH = sh; break; }
    }
    if (bestSH && bars[i]!.close > bestSH.price) {
      crossedH.add(bestSH.idx);
      const obIdx = Math.max(0, i - 1);
      if (!usedCandleIndices.has(obIdx)) {
        usedCandleIndices.add(obIdx);
        const ob = bars[obIdx]!;
        const [mitigated, mitIdx] = checkOBMitigation(bars, obIdx, true, ob.high, ob.low);
        obs.push({
          high: ob.high, low: ob.low, candleIndex: obIdx,
          type: 'bullish', mitigated, mitigatedIndex: mitIdx,
          volumePct: calcVolumePct(bars, i),
        });
      }
    }
  }

  // Bearish OBs
  const swingLows = swings.filter(s => !s.isHigh);
  const crossedL = new Set<number>();
  for (let i = 0; i < bars.length; i++) {
    let bestSL: SwingPoint | null = null;
    for (let k = swingLows.length - 1; k >= 0; k--) {
      const sl = swingLows[k]!;
      if (sl.idx < i && !crossedL.has(sl.idx)) { bestSL = sl; break; }
    }
    if (bestSL && bars[i]!.close < bestSL.price) {
      crossedL.add(bestSL.idx);
      const obIdx = Math.max(0, i - 1);
      if (!usedCandleIndices.has(obIdx)) {
        usedCandleIndices.add(obIdx);
        const ob = bars[obIdx]!;
        const [mitigated, mitIdx] = checkOBMitigation(bars, obIdx, false, ob.high, ob.low);
        obs.push({
          high: ob.high, low: ob.low, candleIndex: obIdx,
          type: 'bearish', mitigated, mitigatedIndex: mitIdx,
          volumePct: calcVolumePct(bars, i),
        });
      }
    }
  }

  obs.sort((a, b) => a.candleIndex - b.candleIndex);
  return obs.filter(ob => bars.length - ob.candleIndex <= maxAge);
}

function checkOBMitigation(bars: readonly Bar[], obIdx: number, isBullish: boolean, obHigh: number, obLow: number): [boolean, number] {
  for (let j = obIdx + 1; j < bars.length; j++) {
    if (isBullish && bars[j]!.close < obLow) return [true, j];
    if (!isBullish && bars[j]!.close > obHigh) return [true, j];
  }
  return [false, 0];
}

function calcVolumePct(bars: readonly Bar[], idx: number): number {
  const start = Math.max(0, idx - 2);
  const end = Math.min(idx + 1, bars.length);
  const vols: number[] = [];
  for (let i = start; i < end; i++) vols.push(bars[i]!.volume);
  if (vols.length < 2) return 100;
  const half = Math.floor(vols.length / 2);
  let highVol = 0, lowVol = 0;
  for (let i = 0; i < vols.length; i++) {
    if (i >= half) highVol += vols[i]!; else lowVol += vols[i]!;
  }
  const total = highVol + lowVol;
  return total === 0 ? 100 : (Math.abs(highVol - lowVol) / total) * 100;
}

// ── FVG Detection ──────────────────────────────────────────────────────────

function detectFVGs(bars: readonly Bar[], minGapPct: number): FairValueGap[] {
  if (bars.length < 3) return [];
  const fvgs: FairValueGap[] = [];

  for (let i = 1; i < bars.length - 1; i++) {
    const prev = bars[i - 1]!, curr = bars[i]!, next = bars[i + 1]!;

    if (prev.high < next.low && curr.close > curr.open) {
      const gapPct = (next.low - prev.high) / prev.high;
      if (gapPct >= minGapPct) {
        const [filled, mitIdx] = findFVGMitigation(bars, i, true, next.low);
        fvgs.push({ type: 'bullish', low: prev.high, high: next.low, candleIndex: i, filled, mitigatedIndex: mitIdx, gapSizePct: gapPct * 100 });
      }
    } else if (prev.low > next.high && curr.close < curr.open) {
      const gapPct = (prev.low - next.high) / prev.low;
      if (gapPct >= minGapPct) {
        const [filled, mitIdx] = findFVGMitigation(bars, i, false, next.high);
        fvgs.push({ type: 'bearish', low: next.high, high: prev.low, candleIndex: i, filled, mitigatedIndex: mitIdx, gapSizePct: gapPct * 100 });
      }
    }
  }

  // Merge consecutive same-type FVGs
  if (fvgs.length < 2) return fvgs;
  const merged: FairValueGap[] = [];
  let idx = 0;
  while (idx < fvgs.length) {
    const current = { ...fvgs[idx]! };
    while (idx + 1 < fvgs.length && fvgs[idx + 1]!.type === current.type && fvgs[idx + 1]!.candleIndex === current.candleIndex + 1) {
      const next = fvgs[idx + 1]!;
      current.high = Math.max(current.high, next.high);
      current.low = Math.min(current.low, next.low);
      current.gapSizePct = ((current.high - current.low) / current.low) * 100;
      if (next.filled && !current.filled) { current.filled = true; current.mitigatedIndex = next.mitigatedIndex; }
      idx++;
    }
    merged.push(current);
    idx++;
  }
  return merged;
}

function findFVGMitigation(bars: readonly Bar[], fvgIdx: number, isBullish: boolean, level: number): [boolean, number] {
  for (let j = fvgIdx + 2; j < bars.length; j++) {
    if (isBullish && bars[j]!.low <= level) return [true, j];
    if (!isBullish && bars[j]!.high >= level) return [true, j];
  }
  return [false, 0];
}

// ── BOS / CHoCH ────────────────────────────────────────────────────────────

function detectBOSEvents(bars: readonly Bar[], swings: SwingPoint[]): BOSEvent[] {
  if (swings.length < 4) return [];
  const events: BOSEvent[] = [];

  // Track trend state
  let trend: 'up' | 'down' | 'none' = 'none';
  const recentH = swings.filter(s => s.isHigh).slice(-3);
  const recentL = swings.filter(s => !s.isHigh).slice(-3);
  if (recentH.length >= 2 && recentL.length >= 2) {
    const hh = recentH[recentH.length - 1]!.price > recentH[recentH.length - 2]!.price;
    const hl = recentL[recentL.length - 1]!.price > recentL[recentL.length - 2]!.price;
    const lh = recentH[recentH.length - 1]!.price < recentH[recentH.length - 2]!.price;
    const ll = recentL[recentL.length - 1]!.price < recentL[recentL.length - 2]!.price;
    if (hh && hl) trend = 'up';
    else if (lh && ll) trend = 'down';
  }

  // Only detect BOS/CHoCH at swing break points (not every bar)
  const usedLevels = new Set<string>();

  for (const sp of swings) {
    // Find bars that break this swing level
    for (let i = sp.idx + 1; i < bars.length; i++) {
      if (sp.isHigh && bars[i]!.close > sp.price) {
        const key = `bull_${sp.idx}`;
        if (usedLevels.has(key)) break;
        usedLevels.add(key);
        const isChoch = trend === 'down';
        events.push({ type: isChoch ? 'choch' : 'bos', direction: 'bullish', level: sp.price, candleIndex: i });
        if (isChoch) trend = 'up';
        break; // Only first break per swing
      }
      if (!sp.isHigh && bars[i]!.close < sp.price) {
        const key = `bear_${sp.idx}`;
        if (usedLevels.has(key)) break;
        usedLevels.add(key);
        const isChoch = trend === 'up';
        events.push({ type: isChoch ? 'choch' : 'bos', direction: 'bearish', level: sp.price, candleIndex: i });
        if (isChoch) trend = 'down';
        break;
      }
    }
  }

  // Only keep last N events to avoid clutter
  return events.slice(-12);
}

// ── Market Structure ───────────────────────────────────────────────────────

function detectStructure(swings: SwingPoint[]): StructureType {
  if (swings.length < 4) return 'unknown';
  const highs = swings.filter(s => s.isHigh).slice(-3).map(s => s.price);
  const lows = swings.filter(s => !s.isHigh).slice(-3).map(s => s.price);
  if (highs.length < 2 || lows.length < 2) return 'unknown';
  const hh = highs[highs.length - 1]! > highs[highs.length - 2]!;
  const hl = lows[lows.length - 1]! > lows[lows.length - 2]!;
  const lh = highs[highs.length - 1]! < highs[highs.length - 2]!;
  const ll = lows[lows.length - 1]! < lows[lows.length - 2]!;
  if (hh && hl) return 'uptrend';
  if (lh && ll) return 'downtrend';
  return 'ranging';
}

// ── Public API ─────────────────────────────────────────────────────────────

let _lastSMCData: SMCData | null = null;
export function getLastSMCData(): SMCData | null { return _lastSMCData; }
/** @internal — for testing only */
export function _setTestSMCData(data: SMCData | null): void { _lastSMCData = data; }

// ── Colors (matching mobile app) ───────────────────────────────────────────
const C = {
  obBull:    { fill: 'rgba(14,203,129,0.08)',  border: 'rgba(14,203,129,0.4)',  accent: 'rgba(14,203,129,0.7)',  text: '#0ECB81' },
  obBear:    { fill: 'rgba(156,39,176,0.08)',  border: 'rgba(156,39,176,0.4)',  accent: 'rgba(156,39,176,0.7)',  text: '#9C27B0' },
  fvgBull:   { fill: 'rgba(38,166,154,0.06)',  border: 'rgba(38,166,154,0.2)',  text: 'rgba(38,166,154,0.5)' },
  fvgBear:   { fill: 'rgba(123,31,162,0.06)',  border: 'rgba(123,31,162,0.2)',  text: 'rgba(123,31,162,0.5)' },
  swingHigh: '#F0B90B',
  swingLow:  '#AB47BC',
  bos:       '#42A5F5',
  choch:     '#FFA726',
};

export const smc: Indicator = {
  name: 'Smart Money Concepts',
  shortName: 'SMC',
  description: 'Order Blocks, FVGs, BOS/CHoCH, Market Structure (ICT methodology)',
  overlay: true,
  params: [
    { name: 'swingN', type: 'number' as const, default: 3, min: 2, max: 10, step: 1 },
    { name: 'maxOBAge', type: 'number' as const, default: 96, min: 20, max: 500, step: 10 },
    { name: 'minFVGPct', type: 'number' as const, default: 0.2, min: 0.05, max: 1, step: 0.05 },
  ],
  plots: [],

  calculate(bars: Bar[], params: Record<string, number>): IndicatorOutput[] {
    const swingN = params.swingN ?? 3;
    const maxAge = params.maxOBAge ?? 96;
    const minFVG = (params.minFVGPct ?? 0.2) / 100;

    const swings = detectSwings(bars, swingN);
    const orderBlocks = detectOrderBlocks(bars, swings, maxAge);
    const fvgs = detectFVGs(bars, minFVG);
    const bosEvents = detectBOSEvents(bars, swings);
    const structure = detectStructure(swings);

    _lastSMCData = { swings, orderBlocks, fvgs, bosEvents, structure };
    return bars.map(b => ({ time: b.time, values: {} }));
  },

  customRender(rc: CustomRenderContext): void {
    const data = getLastSMCData();
    if (!data) return;

    const { ctx, timeScale, priceScale, chartWidth, chartHeight, precision } = rc;
    const toX = (idx: number) => barIndexToX(idx, timeScale, chartWidth);
    const toY = (price: number) => priceToY(price, priceScale, chartHeight);
    const visStart = Math.floor(timeScale.firstIndex) - 5;
    const visEnd = Math.ceil(timeScale.firstIndex + timeScale.visibleCount) + 5;

    // ── 1. FVG zones (behind everything) ───────────────────────────────────
    for (const fvg of data.fvgs) {
      if (fvg.filled) continue;
      if (fvg.candleIndex < visStart - 30) continue;
      const x = toX(fvg.candleIndex);
      const y1 = toY(fvg.high);
      const y2 = toY(fvg.low);
      const h = Math.abs(y2 - y1);
      const isBull = fvg.type === 'bullish';
      const c = isBull ? C.fvgBull : C.fvgBear;
      ctx.fillStyle = c.fill;
      ctx.fillRect(x, Math.min(y1, y2), chartWidth - x, h);
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x, y1); ctx.lineTo(chartWidth, y1);
      ctx.moveTo(x, y2); ctx.lineTo(chartWidth, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      if (h > 8) {
        ctx.fillStyle = c.text;
        ctx.font = font(8);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${t('fvg')} ${fvg.gapSizePct.toFixed(2)}%`, x + 3, (y1 + y2) / 2);
      }
    }

    // ── 2. Order Blocks ────────────────────────────────────────────────────
    for (const ob of data.orderBlocks) {
      if (ob.mitigated) continue;
      if (ob.candleIndex < visStart - 60) continue;
      const x = toX(ob.candleIndex);
      const y1 = toY(ob.high);
      const y2 = toY(ob.low);
      const h = Math.abs(y2 - y1);
      const top = Math.min(y1, y2);
      const isBull = ob.type === 'bullish';
      const c = isBull ? C.obBull : C.obBear;
      ctx.fillStyle = c.fill;
      ctx.fillRect(x, top, chartWidth - x, h);
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y1); ctx.lineTo(chartWidth, y1);
      ctx.moveTo(x, y2); ctx.lineTo(chartWidth, y2);
      ctx.stroke();
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + h);
      ctx.stroke();
      const volK = ob.volumePct >= 1000 ? `${(ob.volumePct / 1000).toFixed(0)}K` : `${ob.volumePct.toFixed(0)}%`;
      const label = `${t('orderBlock')}: ${formatPrice(ob.low, precision)}–${formatPrice(ob.high, precision)} (${volK})`;
      ctx.font = font(8);
      const tw = ctx.measureText(label).width + 8;
      const labelX = Math.min(x + (chartWidth - x) / 2 - tw / 2, chartWidth - tw - 4);
      const labelY = top + h / 2 - 5;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      const r = 3;
      ctx.moveTo(labelX + r, labelY);
      ctx.lineTo(labelX + tw - r, labelY);
      ctx.quadraticCurveTo(labelX + tw, labelY, labelX + tw, labelY + r);
      ctx.lineTo(labelX + tw, labelY + 10 - r);
      ctx.quadraticCurveTo(labelX + tw, labelY + 10, labelX + tw - r, labelY + 10);
      ctx.lineTo(labelX + r, labelY + 10);
      ctx.quadraticCurveTo(labelX, labelY + 10, labelX, labelY + 10 - r);
      ctx.lineTo(labelX, labelY + r);
      ctx.quadraticCurveTo(labelX, labelY, labelX + r, labelY);
      ctx.fill();
      ctx.fillStyle = c.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelX + tw / 2, labelY + 5);
    }

    // ── 3. Swing Points ────────────────────────────────────────────────────
    for (const sp of data.swings) {
      if (sp.idx < visStart || sp.idx > visEnd) continue;
      const x = toX(sp.idx);
      const y = toY(sp.price);
      if (x < -10 || x > chartWidth + 10) continue;
      const color = sp.isHigh ? C.swingHigh : C.swingLow;
      const size = 4;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      if (sp.isHigh) {
        ctx.moveTo(x, y - size - 2);
        ctx.lineTo(x - size, y + size - 4);
        ctx.lineTo(x + size, y + size - 4);
      } else {
        ctx.moveTo(x, y + size + 2);
        ctx.lineTo(x - size, y - size + 4);
        ctx.lineTo(x + size, y - size + 4);
      }
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const labelSwings = data.swings.slice(-8);
    for (const sp of labelSwings) {
      const x = toX(sp.idx);
      const y = toY(sp.price);
      if (x < -10 || x > chartWidth + 10) continue;
      const sameType = data.swings.filter(s => s.isHigh === sp.isHigh && s.idx < sp.idx);
      if (sameType.length === 0) continue;
      const prev = sameType[sameType.length - 1]!;
      const tag = sp.isHigh
        ? (sp.price > prev.price ? t('hh') : t('lh'))
        : (sp.price > prev.price ? t('hl') : t('ll'));
      const color = sp.isHigh ? C.swingHigh : C.swingLow;
      ctx.fillStyle = color;
      ctx.font = font(8, 'bold');
      ctx.textAlign = 'center';
      ctx.textBaseline = sp.isHigh ? 'bottom' : 'top';
      ctx.fillText(tag, x, sp.isHigh ? y - 8 : y + 8);
    }

    // ── 4. BOS / CHoCH ─────────────────────────────────────────────────────
    for (const event of data.bosEvents) {
      if (event.candleIndex < visStart || event.candleIndex > visEnd) continue;
      const x = toX(event.candleIndex);
      const y = toY(event.level);
      const isChoch = event.type === 'choch';
      const color = isChoch ? C.choch : C.bos;
      const isBull = event.direction === 'bullish';
      const lineEnd = Math.min(toX(event.candleIndex + 20), chartWidth);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = isChoch ? 1.0 : 0.75;
      ctx.setLineDash(isChoch ? [4, 3] : [3, 2]);
      ctx.beginPath();
      ctx.moveTo(x, Math.round(y) + 0.5);
      ctx.lineTo(lineEnd, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      const bosLabel = isChoch ? t('choch') : t('bos');
      ctx.font = isChoch ? font(9, 'bold') : font(8);
      const btw = ctx.measureText(bosLabel).width + 6;
      const badgeX = x + 4;
      const badgeY = isBull ? y - 14 : y + 2;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(badgeX, badgeY, btw, 12);
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(bosLabel, badgeX + 3, badgeY + 6);
    }

    // ── 5. Market Structure badge ──────────────────────────────────────────
    const structLabel = data.structure === 'uptrend' ? t('bullish')
      : data.structure === 'downtrend' ? t('bearish')
      : data.structure === 'ranging' ? t('range') : '';
    if (structLabel) {
      const sc = data.structure === 'uptrend' ? '#0ECB81' : data.structure === 'downtrend' ? '#F6465D' : '#FFA726';
      const obCount = data.orderBlocks.filter(ob => !ob.mitigated).length;
      const fvgCount = data.fvgs.filter(f => !f.filled).length;
      const fullLabel = `SMC: ${structLabel}  OB:${obCount}  FVG:${fvgCount}`;
      ctx.font = font(9, 'bold');
      const stw = ctx.measureText(fullLabel).width + 10;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(chartWidth - stw - 8, 22, stw, 14);
      ctx.fillStyle = sc;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(fullLabel, chartWidth - 12, 29);
    }
  },
};
