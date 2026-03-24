// ── Binance Public Datafeed ──────────────────────────────────────────────────
// Connects to Binance public REST + WebSocket for real kline data.
// No API key needed — public endpoints only.

import type { Bar, Tick, Datafeed, Timeframe, SymbolInfo, Unsubscribe } from '../src/api/types';

const REST_BASE = 'https://api.binance.com';
const WS_BASE = 'wss://stream.binance.com:9443/ws';

/** Map our timeframe IDs to Binance interval strings */
function toBinanceInterval(tf: Timeframe): string {
  const map: Record<string, string> = {
    '1s': '1s', '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1H': '1h', '2H': '2h', '4H': '4h', '6H': '6h', '8H': '8h', '12H': '12h',
    '1D': '1d', '3D': '3d', '1W': '1w', '1M': '1M',
  };
  return map[tf] ?? '1h';
}

export const binanceDatafeed: Datafeed = {
  async getBars({ symbol, timeframe, limit }) {
    const interval = toBinanceInterval(timeframe);
    const url = `${REST_BASE}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Binance API error: ${response.status}`);

    const data: any[][] = await response.json();

    return data.map((k): Bar => ({
      time: Math.floor(k[0] as number / 1000), // ms → seconds
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[5] as string),
    }));
  },

  subscribe({ symbol, timeframe, onTick }) {
    const interval = toBinanceInterval(timeframe);
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(`${WS_BASE}/${stream}`);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.e !== 'kline') return;

      const k = msg.k;
      const tick: Tick = {
        time: Math.floor(k.T / 1000), // close time ms → seconds
        price: parseFloat(k.c),       // close price
        volume: parseFloat(k.v),      // volume
      };
      onTick(tick);
    };

    ws.onerror = (err) => {
      console.warn('[binance-ws] error:', err);
    };

    ws.onclose = () => {
      console.log('[binance-ws] closed');
    };

    ws.onopen = () => {
      console.log(`[binance-ws] connected: ${stream}`);
    };

    return () => {
      ws.close();
    };
  },

  async searchSymbols(query) {
    const url = `${REST_BASE}/api/v3/exchangeInfo`;
    const response = await fetch(url);
    const data = await response.json();

    const q = query.toLowerCase();
    return (data.symbols as any[])
      .filter((s: any) => s.status === 'TRADING' && s.symbol.toLowerCase().includes(q))
      .slice(0, 20)
      .map((s: any): SymbolInfo => ({
        symbol: s.symbol,
        name: `${s.baseAsset}/${s.quoteAsset}`,
        exchange: 'Binance',
        type: 'spot',
        pricePrecision: s.quotePrecision,
        qtyPrecision: s.baseAssetPrecision,
        minMove: Math.pow(10, -s.quotePrecision),
      }));
  },
};
