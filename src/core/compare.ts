// ── Compare Mode ────────────────────────────────────────────────────────────
// Overlay additional symbols as line charts on the main price pane.
// Uses percentage-based normalization: both symbols show % change from
// their first visible bar, mapped to the same Y-axis pixel range.

import type { Bar, Datafeed, Timeframe } from '../api/types';
import { font } from './font';
import { logger } from './logger';
import type { RenderContext } from './renderer/render-context';
import type { TimeScale } from './renderer/time-axis';
import { barIndexToX } from './renderer/time-axis';

const COMPARE_COLORS = ['#FF9800', '#2196F3', '#E040FB', '#00BCD4', '#CDDC39', '#FF5722'];

export interface CompareSymbol {
  symbol: string;
  bars: Bar[];
  color: string;
  visible: boolean;
}

export class CompareManager {
  private symbols: CompareSymbol[] = [];
  private datafeed: Datafeed | null = null;
  private timeframe: Timeframe = '1H';
  private colorIndex = 0;

  setDatafeed(datafeed: Datafeed, timeframe: Timeframe): void {
    this.datafeed = datafeed;
    this.timeframe = timeframe;
  }

  async add(symbol: string): Promise<CompareSymbol> {
    const existing = this.symbols.find(s => s.symbol === symbol);
    if (existing) return existing;

    const color = COMPARE_COLORS[this.colorIndex % COMPARE_COLORS.length]!;
    this.colorIndex++;

    const entry: CompareSymbol = { symbol, bars: [], color, visible: true };
    this.symbols.push(entry);

    if (this.datafeed) {
      try {
        const now = Math.floor(Date.now() / 1000);
        entry.bars = await this.datafeed.getBars({
          symbol, timeframe: this.timeframe, from: 0, to: now, limit: 1000,
        });
      } catch (err) {
        logger.warn(`Failed to load compare symbol ${symbol}:`, err);
      }
    }

    return entry;
  }

  remove(symbol: string): void {
    this.symbols = this.symbols.filter(s => s.symbol !== symbol);
  }

  getAll(): CompareSymbol[] {
    return this.symbols.filter(s => s.visible);
  }

  has(symbol: string): boolean {
    return this.symbols.some(s => s.symbol === symbol);
  }

  clear(): void {
    this.symbols = [];
    this.colorIndex = 0;
  }
}

/**
 * Render compare overlays.
 * Strategy: normalize both main and compare to % change from first visible bar,
 * then map compare's % change to the same pixel Y range as main chart.
 */
export function renderCompareOverlays(
  ctx: RenderContext | CanvasRenderingContext2D,
  compareSymbols: CompareSymbol[],
  mainBars: readonly Bar[],
  mainFirstIndex: number,
  timeScale: TimeScale,
  chartWidth: number,
  chartHeight: number,
  mainPriceMin: number,
  mainPriceMax: number,
): void {
  if (compareSymbols.length === 0 || mainBars.length === 0) return;

  // Main symbol: map absolute price → Y pixel (same as candles)
  const priceRange = mainPriceMax - mainPriceMin;
  if (priceRange <= 0) return;

  const mainRefPrice = mainBars[0]!.close;
  if (mainRefPrice <= 0) return;

  // Main's % range on screen
  const mainPctTop = ((mainPriceMax / mainRefPrice) - 1) * 100;
  const mainPctBottom = ((mainPriceMin / mainRefPrice) - 1) * 100;
  const pctRange = mainPctTop - mainPctBottom;
  if (pctRange === 0) return;

  // pct → Y pixel
  const pctToY = (pct: number): number => {
    return chartHeight * (1 - (pct - mainPctBottom) / pctRange);
  };

  for (const comp of compareSymbols) {
    if (comp.bars.length === 0) continue;

    // Build time→close map
    const timeMap = new Map<number, number>();
    for (const bar of comp.bars) timeMap.set(bar.time, bar.close);

    // Reference price = compare close at the same time as mainBars[0]
    const firstMainTime = mainBars[0]!.time;
    const compRefPrice = timeMap.get(firstMainTime) ?? comp.bars[0]!.close;
    if (compRefPrice <= 0) continue;

    // Draw line
    ctx.strokeStyle = comp.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);
    ctx.beginPath();

    let moved = false;
    for (let i = 0; i < mainBars.length; i++) {
      const mainTime = mainBars[i]!.time;
      const compClose = timeMap.get(mainTime);
      if (compClose === undefined) continue;

      const x = barIndexToX(mainFirstIndex + i, timeScale, chartWidth);
      if (x < -50 || x > chartWidth + 50) continue;

      const pct = ((compClose / compRefPrice) - 1) * 100;
      const y = pctToY(pct);

      if (!moved) { ctx.moveTo(x, y); moved = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Legend label (top-right area)
    const lastCompBar = comp.bars[comp.bars.length - 1];
    const lastPct = lastCompBar ? (((lastCompBar.close / compRefPrice) - 1) * 100) : 0;
    const sign = lastPct >= 0 ? '+' : '';

    ctx.fillStyle = comp.color;
    ctx.font = font(11, 'bold');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`${comp.symbol} ${sign}${lastPct.toFixed(2)}%`, chartWidth - 8, 4 + compareSymbols.indexOf(comp) * 16);
  }
}
