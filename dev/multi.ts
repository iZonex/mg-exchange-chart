import { MultiChart } from '../src/core/multi-chart';
import { binanceDatafeed } from './binance-datafeed';
import type { ChartOptions } from '../src/api/types';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'];

// Mock datafeed fallback
const feed = {
  async getBars(p: any) {
    try { return await binanceDatafeed.getBars(p); }
    catch { return []; }
  },
  subscribe(p: any) {
    try { return binanceDatafeed.subscribe(p); }
    catch { return () => {}; }
  },
  async searchSymbols(q: string) { return []; },
};

function makeConfigs(count: number): Omit<ChartOptions, 'container'>[] {
  return SYMBOLS.slice(0, count).map(symbol => ({
    symbol,
    timeframe: '1H' as const,
    theme: 'dark' as const,
    datafeed: feed,
  }));
}

let multi: MultiChart | null = null;

function createGrid(rows: number, cols: number) {
  if (multi) multi.destroy();
  multi = new MultiChart({
    container: '#grid',
    layout: [rows, cols],
    charts: makeConfigs(rows * cols),
    syncCrosshair: true,
  });
}

// Default 2x2
createGrid(2, 2);

// Layout buttons
document.querySelectorAll('[data-layout]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-layout]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const [r, c] = (btn as HTMLElement).dataset.layout!.split('x').map(Number);
    createGrid(r!, c!);
  });
});
