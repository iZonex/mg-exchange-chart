// ── Drawing Data Injector ───────────────────────────────────────────────────
// Injects real chart data (prices, bars, angles, ratios) into drawing options
// before rendering. Extracted from chart.ts render loop.

import type { DrawingOptions, Point, Bar } from '../../api/types';
import type { PixelPoint } from '../../drawings/primitives/hit-test';
import type { PriceScale } from './price-axis';
import { priceToY, formatPrice } from './price-axis';
import { computeVolumeProfile } from '../../indicators/volume/volume-profile';
import { t } from '../i18n';

export interface DataInjectorContext {
  nearestIndex: (time: number) => number;
  getRange: (from: number, to: number) => Bar[];
  precision: number;
  priceScale: PriceScale;
  mainPaneHeight: number;
  barIndexToX?: (barIndex: number) => number;
}

function formatDuration(seconds: number): string {
  if (seconds >= 86400) return `${(seconds / 86400).toFixed(1)}${t('days')}`;
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}${t('hours')}`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(0)}${t('minutes')}`;
  return `${seconds}${t('seconds')}`;
}

/**
 * Inject chart data into drawing options for tools that need calculations.
 * Returns modified options (or original if no injection needed).
 */
export function injectDrawingData(
  toolName: string,
  points: Point[],
  pixelPoints: PixelPoint[],
  options: DrawingOptions,
  ctx: DataInjectorContext,
): DrawingOptions {
  let opts = options;

  // Single-point tools
  if (points.length === 1) {
    const p = points[0]!;
    if (toolName === 'vertical-line' || toolName === 'cross-line') {
      const d = new Date(p.time * 1000);
      const timeLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      opts = { ...opts, _timeLabel: timeLabel, _priceLabel: formatPrice(p.price, ctx.precision) } as any;
    }
    if (toolName === 'horizontal-ray') {
      opts = { ...opts, text: formatPrice(p.price, ctx.precision) } as any;
    }
    if (toolName === 'anchored-vwap' && ctx.barIndexToX) {
      // Compute VWAP from anchor bar forward
      const anchorIdx = ctx.nearestIndex(p.time);
      const allBars = ctx.getRange(anchorIdx, anchorIdx + 10000);
      if (allBars.length > 0) {
        let cumVolPrice = 0, cumVol = 0;
        const vwapData: PixelPoint[] = [];
        for (const bar of allBars) {
          const typical = (bar.high + bar.low + bar.close) / 3;
          cumVolPrice += typical * bar.volume;
          cumVol += bar.volume;
          const vwapPrice = cumVol > 0 ? cumVolPrice / cumVol : typical;
          const barIdx = ctx.nearestIndex(bar.time);
          const x = ctx.barIndexToX ? ctx.barIndexToX(barIdx) : barIdx;
          const y = priceToY(vwapPrice, ctx.priceScale, ctx.mainPaneHeight);
          vwapData.push({ x, y });
        }
        opts = { ...opts, _vwapData: vwapData } as any;
      }
    }
    return opts;
  }

  if (points.length < 2) return opts;

  const p1 = points[0]!, p2 = points[1]!;
  const idx1 = ctx.nearestIndex(p1.time);
  const idx2 = ctx.nearestIndex(p2.time);
  const barCount = Math.abs(idx2 - idx1);
  const deltaPrice = p2.price - p1.price;

  // ── Line-type tools (angle + bars + ΔPrice + %) ────────────────────────
  const lineTools = ['trend-line', 'ray', 'extended-line', 'arrow', 'sine-line', 'cyclic-lines', 'info-line', 'trend-angle', 'time-cycles'];
  if (lineTools.includes(toolName)) {
    const pxP1 = pixelPoints[0]!, pxP2 = pixelPoints[1]!;
    const angle = Math.atan2(pxP2.y - pxP1.y, pxP2.x - pxP1.x) * (180 / Math.PI);
    const pctChange = p1.price !== 0 ? ((deltaPrice / p1.price) * 100) : 0;
    return { ...opts, _lineData: { angle, bars: barCount, deltaPrice, pctChange } } as any;
  }

  // ── Forecast ───────────────────────────────────────────────────────────
  if (toolName === 'forecast') {
    const pxP1 = pixelPoints[0]!, pxP2 = pixelPoints[1]!;
    const angle = Math.atan2(pxP2.y - pxP1.y, pxP2.x - pxP1.x) * (180 / Math.PI);
    const pctChange = p1.price !== 0 ? ((deltaPrice / p1.price) * 100) : 0;
    return { ...opts, _lineData: { angle, bars: barCount, deltaPrice, pctChange }, _entryPrice: p1.price } as any;
  }

  // ── Measurement tools ──────────────────────────────────────────────────
  if (toolName === 'price-range') {
    return { ...opts, _priceData: { price1: p1.price, price2: p2.price, bars: barCount } } as any;
  }
  if (toolName === 'date-range') {
    const seconds = Math.abs(p2.time - p1.time);
    return { ...opts, _barCount: barCount, _duration: formatDuration(seconds) } as any;
  }

  // ── Date and Price Range (combo measurement) ─────────────────────────
  if (toolName === 'date-price-range') {
    const pctChange = p1.price !== 0 ? ((deltaPrice / p1.price) * 100) : 0;
    const seconds = Math.abs(p2.time - p1.time);
    return { ...opts, _datePriceData: { deltaPrice, pctChange, bars: barCount, duration: formatDuration(seconds) } } as any;
  }

  // ── Rect-type tools (price range + bars + duration) ────────────────────
  if (toolName === 'rectangle' || toolName === 'ellipse' || toolName === 'gann-square' || toolName === 'gann-square-fixed') {
    const priceRange = Math.abs(deltaPrice);
    const pctRange = p1.price !== 0 ? (priceRange / p1.price * 100) : 0;
    const seconds = Math.abs(p2.time - p1.time);
    return { ...opts, _rectData: { priceRange, pctRange, bars: barCount, duration: formatDuration(seconds) } } as any;
  }

  // ── Triangle ───────────────────────────────────────────────────────────
  if (toolName === 'triangle' && points.length >= 3) {
    const prices = points.map(p => p.price);
    const priceRange = Math.max(...prices) - Math.min(...prices);
    const allIdx = points.map(p => ctx.nearestIndex(p.time));
    const triangleBars = Math.max(...allIdx) - Math.min(...allIdx);
    return { ...opts, _rectData: { priceRange, pctRange: priceRange / p1.price * 100, bars: triangleBars, duration: '' } } as any;
  }

  // ── Head & Shoulders ───────────────────────────────────────────────────
  if (toolName === 'head-shoulders' && points.length >= 5) {
    const headPrice = points[2]!.price;
    const neckAvg = (points[1]!.price + points[3]!.price) / 2;
    const dist = Math.abs(headPrice - neckAvg);
    const isInverted = headPrice < neckAvg;
    const targetPrice = isInverted ? neckAvg + dist : neckAvg - dist;
    const pct = neckAvg !== 0 ? ((targetPrice - neckAvg) / neckAvg * 100) : 0;
    return { ...opts, _hsTarget: { targetPrice, pct } } as any;
  }

  // ── Channel-type tools (width) ─────────────────────────────────────────
  if ((toolName === 'pitchfork' || toolName === 'schiff-pitchfork' || toolName === 'modified-schiff-pitchfork' || toolName === 'inside-pitchfork') && points.length >= 3) {
    const p3 = points[2]!;
    const priceWidth = Math.abs(p3.price - p2.price);
    const pctWidth = p1.price !== 0 ? (priceWidth / p1.price * 100) : 0;
    return { ...opts, _channelData: { priceWidth, pctWidth, pxDist: 0 } } as any;
  }

  if (toolName === 'parallel-channel' && points.length >= 3) {
    const p3 = points[2]!;
    const pxP1 = pixelPoints[0]!, pxP2 = pixelPoints[1]!, pxP3 = pixelPoints[2]!;
    const pxDx = pxP2.x - pxP1.x, pxDy = pxP2.y - pxP1.y;
    const pxLen = Math.sqrt(pxDx * pxDx + pxDy * pxDy);
    const pxDist = pxLen > 0
      ? Math.abs((pxP3.x - pxP1.x) * pxDy - (pxP3.y - pxP1.y) * pxDx) / pxLen
      : 0;
    const priceWidth = Math.abs(p3.price - (p1.price + (p3.time - p1.time) / (p2.time - p1.time) * (p2.price - p1.price)));
    const pctWidth = p1.price !== 0 ? (priceWidth / p1.price * 100) : 0;
    return { ...opts, _channelData: { priceWidth, pctWidth, pxDist } } as any;
  }

  // ── Polyline (path stats) ──────────────────────────────────────────────
  if (toolName === 'polyline' && points.length >= 2) {
    let totalBars = 0, totalPrice = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!, b = points[i + 1]!;
      totalBars += Math.abs(ctx.nearestIndex(b.time) - ctx.nearestIndex(a.time));
      totalPrice += Math.abs(b.price - a.price);
    }
    const totalPct = p1.price !== 0 ? (totalPrice / p1.price * 100) : 0;
    return { ...opts, _polyData: { segments: points.length - 1, totalBars, totalPrice, totalPct } } as any;
  }

  // ── Regression Channel (real least squares) ────────────────────────────
  if (toolName === 'regression-channel') {
    const fromIdx = Math.min(idx1, idx2);
    const toIdx = Math.max(idx1, idx2) + 1;
    const rangeBars = ctx.getRange(fromIdx, toIdx);
    let stddev = 0, regrStartPrice = p1.price, regrEndPrice = p2.price, r2 = 0;
    if (rangeBars.length >= 2) {
      const n = rangeBars.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) {
        const y = rangeBars[i]!.close;
        sumX += i; sumY += y; sumXY += i * y; sumX2 += i * i;
      }
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      regrStartPrice = intercept;
      regrEndPrice = intercept + slope * (n - 1);
      let sumSqDev = 0;
      for (let i = 0; i < n; i++) sumSqDev += (rangeBars[i]!.close - (intercept + slope * i)) ** 2;
      stddev = Math.sqrt(sumSqDev / n);
      const meanY = sumY / n;
      let ssTot = 0, ssRes = 0;
      for (let i = 0; i < n; i++) { ssTot += (rangeBars[i]!.close - meanY) ** 2; ssRes += (rangeBars[i]!.close - (intercept + slope * i)) ** 2; }
      r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    }
    const pctStddev = p1.price !== 0 ? (stddev / p1.price * 100) : 0;
    return { ...opts, _regrData: { stddev, pctStddev, bars: barCount, r2, regrStartPrice, regrEndPrice } } as any;
  }

  // ── Fibonacci tools ────────────────────────────────────────────────────
  if (toolName === 'fib-retracement' || toolName === 'fib-extension' || toolName === 'trend-fib-extension') {
    return { ...opts, _fibPrices: { p1: p1.price, p2: p2.price, precision: ctx.precision } } as any;
  }

  // ── Long/Short position ────────────────────────────────────────────────
  if (toolName === 'long-short') {
    return { ...opts, _entryPrice: p1.price, _targetPrice: p2.price, _precision: ctx.precision } as any;
  }

  // ── Flat Top/Bottom Channel ────────────────────────────────────────────
  if (toolName === 'flat-top-bottom' && points.length >= 3) {
    const p3 = points[2]!;
    const priceWidth = Math.abs(p3.price - p1.price);
    const pctWidth = p1.price !== 0 ? (priceWidth / p1.price * 100) : 0;
    return { ...opts, _channelData: { priceWidth, pctWidth } } as any;
  }

  // ── Disjoint Channel ─────────────────────────────────────────────────
  if (toolName === 'disjoint-channel' && points.length >= 4) {
    const p3 = points[2]!, p4 = points[3]!;
    const leftGap = Math.abs(p3.price - p1.price);
    const rightGap = Math.abs(p4.price - p2.price);
    const priceWidth = (leftGap + rightGap) / 2;
    const pctWidth = p1.price !== 0 ? (priceWidth / p1.price * 100) : 0;
    return { ...opts, _channelData: { priceWidth, pctWidth } } as any;
  }

  // ── Trend Fib Time ───────────────────────────────────────────────────
  if (toolName === 'trend-fib-time') {
    return { ...opts, _lineData: { bars: barCount } } as any;
  }

  // ── Elliott Combos ───────────────────────────────────────────────────
  if (toolName === 'elliott-double-combo' && points.length >= 4) {
    const totalPx = Math.abs(points[3]!.price - p1.price);
    const pct = p1.price !== 0 ? (totalPx / p1.price * 100) : 0;
    return { ...opts, _comboData: { totalPx, pct } } as any;
  }
  if (toolName === 'elliott-triple-combo' && points.length >= 6) {
    const totalPx = Math.abs(points[5]!.price - p1.price);
    const pct = p1.price !== 0 ? (totalPx / p1.price * 100) : 0;
    return { ...opts, _comboData: { totalPx, pct } } as any;
  }

  // ── Bars Pattern (Ghost Feed) ────────────────────────────────────────
  if (toolName === 'bars-pattern' && points.length >= 3 && ctx.barIndexToX) {
    const fromIdx = Math.min(idx1, idx2);
    const toIdx = Math.max(idx1, idx2) + 1;
    const rangeBars = ctx.getRange(fromIdx, toIdx);
    if (rangeBars.length > 0) {
      const p3 = points[2]!;
      const destIdx = ctx.nearestIndex(p3.time);
      const _srcStartIdx = fromIdx;
      const ghostBars: { x: number; open: number; high: number; low: number; close: number; width: number }[] = [];
      // Compute price offset: shift bars so first bar aligns with p3 price
      const priceOffset = p3.price - rangeBars[0]!.close;
      for (let i = 0; i < rangeBars.length; i++) {
        const bar = rangeBars[i]!;
        const barIdx = destIdx + (i - 0);
        const x = ctx.barIndexToX(barIdx);
        const nextX = ctx.barIndexToX(barIdx + 1);
        const barW = Math.max((nextX - x) * 0.7, 2);
        const openY = priceToY(bar.open + priceOffset, ctx.priceScale, ctx.mainPaneHeight);
        const highY = priceToY(bar.high + priceOffset, ctx.priceScale, ctx.mainPaneHeight);
        const lowY = priceToY(bar.low + priceOffset, ctx.priceScale, ctx.mainPaneHeight);
        const closeY = priceToY(bar.close + priceOffset, ctx.priceScale, ctx.mainPaneHeight);
        ghostBars.push({ x: x - barW / 2, open: openY, high: highY, low: lowY, close: closeY, width: barW });
      }
      return { ...opts, _ghostBars: ghostBars } as any;
    }
  }

  // ── Fixed Range Volume Profile ─────────────────────────────────────────
  if (toolName === 'fixed-range-vp') {
    const fromIdx = Math.min(idx1, idx2);
    const toIdx = Math.max(idx1, idx2) + 1;
    const rangeBars = ctx.getRange(fromIdx, toIdx);
    if (rangeBars.length > 0) {
      let prMin = Infinity, prMax = -Infinity;
      for (const b of rangeBars) { if (b.low < prMin) prMin = b.low; if (b.high > prMax) prMax = b.high; }
      const numBins = 40;
      const vpBins = computeVolumeProfile(rangeBars, prMin, prMax, numBins);
      const maxVol = Math.max(...vpBins.map(b => b.volume));
      let pocIdx = 0;
      for (let i = 1; i < vpBins.length; i++) if (vpBins[i]!.volume > vpBins[pocIdx]!.volume) pocIdx = i;
      const totalVol = vpBins.reduce((s, b) => s + b.volume, 0);
      const vaTarget = totalVol * 0.70;
      let vaVol = vpBins[pocIdx]!.volume, vaLow = pocIdx, vaHigh = pocIdx;
      while (vaVol < vaTarget && (vaLow > 0 || vaHigh < vpBins.length - 1)) {
        const belowVol = vaLow > 0 ? vpBins[vaLow - 1]!.volume : 0;
        const aboveVol = vaHigh < vpBins.length - 1 ? vpBins[vaHigh + 1]!.volume : 0;
        if (belowVol >= aboveVol && vaLow > 0) { vaLow--; vaVol += belowVol; }
        else if (vaHigh < vpBins.length - 1) { vaHigh++; vaVol += aboveVol; }
        else break;
      }
      const bins = vpBins.map((bin, i) => {
        const y1 = priceToY(bin.priceTo, ctx.priceScale, ctx.mainPaneHeight);
        const y2 = priceToY(bin.priceFrom, ctx.priceScale, ctx.mainPaneHeight);
        const totalW = maxVol > 0 ? bin.volume / maxVol : 0;
        const buyW = bin.volume > 0 ? (bin.buyVolume / bin.volume) * totalW : 0;
        const sellW = totalW - buyW;
        return { y1, y2, buyW, sellW, isPOC: i === pocIdx, isVA: i >= vaLow && i <= vaHigh };
      });
      return { ...opts, _vpBins: bins } as any;
    }
  }

  return opts;
}
