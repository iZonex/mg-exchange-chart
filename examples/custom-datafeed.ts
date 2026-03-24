// ── Custom Datafeed Example ──────────────────────────────────────────────────
//
// This example shows how to implement the Datafeed interface to connect
// @mg-exchange/charts to a REST + WebSocket backend.
//
// The Datafeed interface has 3 required methods:
//   1. getBars()       — load historical OHLCV bars
//   2. subscribe()     — stream real-time price updates
//   3. searchSymbols() — search for available symbols
//
// And 1 optional method:
//   4. resolveSymbol() — get symbol metadata (precision, min move, etc.)

import type {
  Datafeed,
  Bar,
  Tick,
  Timeframe,
  SymbolInfo,
  Unsubscribe,
} from '../src/api/types';

// ── Configuration ───────────────────────────────────────────────────────────

const REST_BASE = 'https://api.example.com/v1';
const WS_URL = 'wss://ws.example.com/v1/stream';

// ── Timeframe Mapping ───────────────────────────────────────────────────────
// Map our Timeframe type to the interval string your API expects.

const TIMEFRAME_TO_INTERVAL: Record<Timeframe, string> = {
  '1s': '1s', '5s': '5s', '15s': '15s', '30s': '30s',
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1H': '1h', '2H': '2h', '4H': '4h', '6H': '6h', '8H': '8h', '12H': '12h',
  '1D': '1d', '3D': '3d', '1W': '1w', '1M': '1M',
};

// ── Datafeed Implementation ─────────────────────────────────────────────────

export class ExchangeDatafeed implements Datafeed {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, (data: any) => void>();

  // ── 1. getBars: Load historical OHLCV data ────────────────────────────
  //
  // Called on chart initialization and when the user scrolls left
  // (lazy-loading older data). The chart sends `from` and `to` as
  // Unix timestamps in seconds, and `limit` as the max number of bars.
  //
  // Return an array of Bar objects sorted by time ascending.
  // Return an empty array if no data is available for the range.

  async getBars(params: {
    symbol: string;
    timeframe: Timeframe;
    from: number;
    to: number;
    limit: number;
  }): Promise<Bar[]> {
    const interval = TIMEFRAME_TO_INTERVAL[params.timeframe];

    // Build the API URL. Adjust query params to match your backend.
    const url = new URL(`${REST_BASE}/markets/${params.symbol}/klines`);
    url.searchParams.set('interval', interval);
    url.searchParams.set('startTime', String(params.from * 1000)); // API expects ms
    url.searchParams.set('endTime', String(params.to * 1000));
    url.searchParams.set('limit', String(params.limit));

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`[datafeed] getBars failed: ${response.status}`);
      return [];
    }

    // Parse the response. Adjust field names to match your API format.
    // Common formats:
    //   Array of arrays: [[time, open, high, low, close, volume], ...]
    //   Array of objects: [{ t, o, h, l, c, v }, ...]
    const raw: number[][] = await response.json();

    return raw.map((k) => ({
      time: Math.floor(k[0]! / 1000), // Convert ms to seconds
      open: k[1]!,
      high: k[2]!,
      low: k[3]!,
      close: k[4]!,
      volume: k[5]!,
    }));
  }

  // ── 2. subscribe: Stream real-time updates ────────────────────────────
  //
  // Called once after getBars completes. You should:
  //   - Connect to your WebSocket endpoint
  //   - Subscribe to the kline/candlestick topic for the symbol + timeframe
  //   - Call onBar() when a new completed bar arrives
  //   - Call onTick() on every price update within the current bar
  //
  // Return an Unsubscribe function that cleans up the subscription.

  subscribe(params: {
    symbol: string;
    timeframe: Timeframe;
    onBar: (bar: Bar) => void;
    onTick: (tick: Tick) => void;
  }): Unsubscribe {
    const interval = TIMEFRAME_TO_INTERVAL[params.timeframe];
    const topic = `kline.${params.symbol}.${interval}`;

    // Ensure WebSocket connection exists
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connectWebSocket();
    }

    // Register handler for this topic
    this.subscriptions.set(topic, (data: any) => {
      // data.closed indicates a finalized bar vs. an in-progress update.
      // Adjust field names to match your WebSocket message format.
      if (data.closed) {
        // A completed bar — append to chart history
        params.onBar({
          time: Math.floor(data.startTime / 1000),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.volume,
        });
      } else {
        // In-progress tick — update the current (rightmost) bar
        params.onTick({
          time: Math.floor(data.eventTime / 1000),
          price: data.close,
          volume: data.volume,
        });
      }
    });

    // Send subscribe message to WebSocket
    this.wsSend({ op: 'subscribe', topics: [topic] });

    // Return cleanup function
    return () => {
      this.subscriptions.delete(topic);
      this.wsSend({ op: 'unsubscribe', topics: [topic] });
    };
  }

  // ── 3. searchSymbols: Symbol search for the symbol selector ───────────
  //
  // Called when the user types in the symbol search box.
  // Return an array of SymbolInfo objects matching the query.

  async searchSymbols(query: string): Promise<SymbolInfo[]> {
    const response = await fetch(`${REST_BASE}/markets?search=${encodeURIComponent(query)}`);
    if (!response.ok) return [];

    const markets: any[] = await response.json();

    return markets.map((m) => ({
      symbol: m.symbol,           // e.g. "BTCUSDT"
      name: m.name,               // e.g. "Bitcoin / USDT"
      exchange: m.exchange,       // e.g. "MyExchange"
      type: m.type,               // 'spot' | 'perpetual' | 'futures' | 'option'
      pricePrecision: m.pricePrecision,   // e.g. 2
      qtyPrecision: m.qtyPrecision,       // e.g. 6
      minMove: m.minMove,                 // e.g. 0.01
    }));
  }

  // ── 4. resolveSymbol (optional): Get symbol metadata ──────────────────
  //
  // If implemented, the chart calls this once when a symbol is loaded
  // to determine precision, min move, and display name.
  // If not implemented, the chart auto-detects precision from price data.

  async resolveSymbol(symbol: string): Promise<SymbolInfo> {
    const response = await fetch(`${REST_BASE}/markets/${symbol}`);
    const m = await response.json();

    return {
      symbol: m.symbol,
      name: m.name,
      exchange: m.exchange,
      type: m.type,
      pricePrecision: m.pricePrecision,
      qtyPrecision: m.qtyPrecision,
      minMove: m.minMove,
    };
  }

  // ── WebSocket Helpers ─────────────────────────────────────────────────

  private connectWebSocket(): void {
    this.ws = new WebSocket(WS_URL);

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // Route message to the correct subscription handler
        const handler = this.subscriptions.get(msg.topic);
        if (handler) handler(msg.data);
      } catch (e) {
        console.error('[datafeed] WS parse error:', e);
      }
    };

    this.ws.onclose = () => {
      // Reconnect after a delay
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error('[datafeed] WS error:', err);
    };
  }

  private wsSend(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  /** Clean up WebSocket connection */
  destroy(): void {
    this.subscriptions.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ── Usage Example ───────────────────────────────────────────────────────────
//
// import { Chart } from '@mg-exchange/charts';
// import { ExchangeDatafeed } from './custom-datafeed';
//
// const datafeed = new ExchangeDatafeed();
//
// const chart = new Chart({
//   container: document.getElementById('chart')!,
//   symbol: 'BTCUSDT',
//   timeframe: '1H',
//   datafeed,
//   theme: 'dark',
// });
//
// // When done:
// chart.destroy();
// datafeed.destroy();
