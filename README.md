# @exchange/charts

Professional financial charting library for cryptocurrency exchanges.

**Zero dependencies. Canvas 2D + WebGL. TypeScript. Works with React, Vue, or vanilla JS.**

**[Live Demo](https://izonex.github.io/mg-exchange-chart/)** | [API Reference](#full-api-reference) | [Trading Integration](#trading-api) | [Examples](./examples/)

---

## Why

- No production-ready OSS charting library covers: indicators + drawings + multi-pane + real-time + trading
- Existing open-source options lack drawing tools, multi-pane layouts, or real-time streaming
- Commercial solutions are expensive and vendor-locked

Exchange Charts fills that gap — free, open-source, production-ready.

## Features

### Rendering
- Canvas 2D with optional **WebGL acceleration** (67x faster at 500K bars)
- Layered canvases: background, series, crosshair, drawings, UI — only dirty layers re-render
- 60fps with 100K visible bars, 1M loaded, 5 indicators, 20 drawings

### Chart Types
Candlestick, Heikin Ashi, OHLC Bars, Line, Area, Baseline

### 21 Built-in Indicators

| Category | Indicators |
|----------|-----------|
| **Trend** | SMA, EMA, Ichimoku Cloud, TWAP, Supertrend, EMA Ribbon, Parabolic SAR, ADX |
| **Momentum** | RSI, MACD, Stochastic, Williams %R, Rate of Change |
| **Volatility** | Bollinger Bands, ATR, Envelope |
| **Volume** | VWAP, OBV, MFI, Cumulative Volume Delta, Volume Profile |
| **Smart Money** | Order Blocks, Fair Value Gaps, BOS/CHoCH, Market Structure |

### 47 Drawing Tools

| Category | Tools |
|----------|-------|
| **Lines** | Trend Line, Ray, Info Line, Extended Line, Horizontal/Vertical/Cross Line, Polyline |
| **Channels** | Parallel Channel, Regression Channel, Pitchfork |
| **Fibonacci** | Retracement, Extension, Channel, Time Zone, Speed Fan, Circles, Spiral, Arcs, Wedge |
| **Gann** | Box, Square, Fan |
| **Patterns** | XABCD, ABCD, Head & Shoulders, Triangle, Three Drives |
| **Elliott** | Impulse (12345), Correction (ABC), Triangle (ABCDE) |
| **Shapes** | Rectangle, Ellipse, Arc, Arrow, Brush |
| **Text** | Text, Callout, Note, Flag |
| **Trading** | Long/Short Position (TP/SL/P&L), Forecast |
| **Measure** | Price Range, Date Range, Fixed Range Volume Profile |

Drawing tools show real calculations: angle, bars, price change, %, channel width, Fibonacci levels, standard deviation.

### Trading Integration
- Order lines (limit, stop, TP, SL, entry, liquidation, breakeven)
- Position overlays with P&L zones (Bybit-style)
- Draggable order lines
- Customizable trade actions — exchange provides its own UI
- Serialization: `getOrderLines()` / `loadOrderLines()`

### More
- **Real-time**: WebSocket streaming with bar construction and tick updates
- **Multi-pane**: Separate panes for oscillators with resize handles
- **Multi-chart**: Grid layouts (2x2, 2x3) with synced crosshair/timeframe
- **Mobile**: Pinch-to-zoom, momentum scroll, long-press crosshair
- **Themes**: Dark/light, fully customizable
- **Persistence**: Serialize/restore drawings, indicators, order lines
- **Price alerts**: Directional alerts with callbacks

---

## Install

```bash
npm install @exchange/charts
```

## Quick Start

```typescript
import { Chart } from '@exchange/charts';
import { sma, rsi, bollingerBands } from '@exchange/charts';

const chart = new Chart({
  container: '#chart',
  symbol: 'BTCUSDT',
  timeframe: '1H',
  datafeed: myDatafeed,
  renderer: 'webgl',
});

// Add indicators
chart.addIndicator(sma, { period: 20 });
chart.addIndicator(rsi, { period: 14 });
chart.addIndicator(bollingerBands, { period: 20, stdDev: 2 });

// Drawing tools
chart.setDrawingTool('fib-retracement');

// Events
chart.on('crosshairMove', ({ price, time, bar }) => { /* ... */ });
chart.on('barUpdate', (bar) => { /* real-time update */ });
```

## Datafeed Interface

Implement 3 methods to connect any data source:

```typescript
import type { Datafeed } from '@exchange/charts';

const myDatafeed: Datafeed = {
  async getBars({ symbol, timeframe, from, to, limit }) {
    const res = await fetch(`/api/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`);
    return res.json();
  },

  subscribe({ symbol, timeframe, onBar, onTick }) {
    const ws = new WebSocket(`wss://stream.example.com/${symbol}`);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      onTick({ time: data.time, price: data.price, volume: data.volume });
    };
    return () => ws.close();
  },

  async searchSymbols(query) {
    return [{ symbol: 'BTCUSDT', name: 'Bitcoin / USDT', exchange: 'Binance' }];
  },
};
```

---

## Trading API

The chart provides primitives for exchanges to build their own trading UI. The chart does **not** place orders — it gives you events and rendering tools.

### Basic: Order Lines + Position Overlays

```typescript
import type { OrderLine, PositionOverlayData } from '@exchange/charts';

// Show a limit order on chart
chart.addOrderLine({
  id: 'order-1',
  price: 87500,
  type: 'limit',
  side: 'buy',
  label: 'BUY LIMIT 0.05',
  quantity: 0.05,
});

// Update when price changes
chart.updateOrderLine('order-1', { price: 87400 });

// Show position with TP/SL zones (Bybit-style)
chart.setPositionOverlays([{
  side: 'long',
  entryPrice: 87500,
  quantity: 0.05,
  currentPrice: 87800,
  pnl: 15.0,
  breakeven: 87587.5,
  tpLevels: [{ price: 89250, quantity: 0.05 }],
  slLevels: [{ price: 86625, quantity: 0.05 }],
}]);

// Serialize/restore
const lines = chart.getOrderLines();
chart.loadOrderLines(lines);
```

### Events

```typescript
// User clicked "+" on price axis or right-click trade menu
chart.on('tradeRequested', ({ side, price, type, action }) => {
  // 'side': 'buy' | 'sell'
  // 'price': clicked price level
  // 'type': 'limit' | 'market'
  // 'action': custom action string (if using custom context menu)
  showMyOrderForm({ side, price, type });
});

// User dragged an order line to a new price
chart.on('orderLineMoved', ({ id, price }) => {
  updateOrderOnServer(id, price);
});
```

### Custom Trade Actions (for exchanges)

Override the default "+" button and right-click menu with your own UI:

```typescript
chart.setTradeMode(true, {
  // Replace default "+" behavior with your handler
  onTradeAction: ({ price, clientX, clientY, suggestedSide }) => {
    showMyOrderPopup({ price, x: clientX, y: clientY, side: suggestedSide });
  },

  // Or customize the right-click menu items
  contextMenuItems: (price) => [
    { label: `Limit Buy @ ${price.toFixed(2)}`, action: 'limit-buy' },
    { label: `Limit Sell @ ${price.toFixed(2)}`, action: 'limit-sell' },
    { label: 'Place OCO Order', action: 'oco', separator: true },
    { label: 'Set Alert', action: 'alert' },
  ],

  // Callback when user drags order lines
  onOrderLineDrag: (id, newPrice) => {
    modifyOrderOnExchange(id, newPrice);
  },

  // Control individual features
  showPlusButton: true,
  showContextMenu: true,
  draggableOrderLines: true,
});
```

### Granular Control

```typescript
// Enable trade mode without any built-in UI
chart.setTradeMode(true, {
  showPlusButton: false,
  showContextMenu: false,
  onTradeAction: myHandler,
});

// Listen to raw click events and build completely custom UX
chart.on('click', ({ price, time }) => {
  if (myState.placingOrder) {
    placeOrderAt(price);
  }
});
```

---

## React Wrapper

```tsx
import { ChartContainer, useChart } from '@exchange/charts/react';

function TradingChart() {
  const chartRef = useChart();

  return (
    <ChartContainer
      ref={chartRef}
      options={{
        symbol: 'BTCUSDT',
        timeframe: '1H',
        datafeed: myDatafeed,
        theme: 'dark',
      }}
      style={{ width: '100%', height: 600 }}
    />
  );
}
```

## Multi-Chart Layout

```typescript
import { MultiChart } from '@exchange/charts';

const multi = new MultiChart({
  container: '#charts',
  layout: '2x2',
  datafeed: myDatafeed,
  syncCrosshair: true,
  syncTimeframe: true,
  charts: [
    { symbol: 'BTCUSDT', timeframe: '1H' },
    { symbol: 'ETHUSDT', timeframe: '1H' },
    { symbol: 'SOLUSDT', timeframe: '1H' },
    { symbol: 'BTCUSDT', timeframe: '1D' },
  ],
});
```

## WebGL Rendering

```typescript
const chart = new Chart({
  // ...
  renderer: 'webgl',
});

// Falls back to Canvas 2D automatically if WebGL2 unavailable
console.log(chart.getRendererBackend()); // 'webgl' or 'canvas2d'
```

WebGL uses dedicated OHLC shaders — raw price data uploaded to GPU, coordinate math in vertex shader. 67x improvement at 500K bars.

## Chart Options

```typescript
interface ChartOptions {
  container: HTMLElement | string;
  symbol: string;
  timeframe: Timeframe;
  datafeed: Datafeed;
  chartType?: ChartType;
  priceScale?: PriceScaleMode;
  theme?: 'dark' | 'light' | Theme;
  renderer?: 'canvas2d' | 'webgl';
  pricePrecision?: number;
  trading?: Partial<TradeOptions>;
  features?: Partial<ChartFeatures>;
}
```

## Full API Reference

```typescript
// ── Chart Control ──────────────────────────────────────
chart.setSymbol('ETHUSDT');
chart.setTimeframe('4H');
chart.setChartType('heikin_ashi');
chart.setTheme('light');
chart.goToLive();
chart.exportPNG('chart.png');
chart.destroy();

// ── Indicators ─────────────────────────────────────────
const id = chart.addIndicator(indicator, params);
chart.removeIndicator(id);
chart.setVolumeProfile(true);

// ── Drawings ───────────────────────────────────────────
chart.setDrawingTool('trend-line');
chart.setDrawingTool(null);
chart.clearDrawings();
chart.removeDrawing(id);
chart.updateDrawing(id, { color: '#ff0000' });
chart.toggleDrawingVisible(id);
chart.toggleDrawingLock(id);
chart.reorderDrawing(id, newIndex);
chart.bringDrawingToFront(id);
chart.sendDrawingToBack(id);
const drawings = chart.getDrawings();
chart.loadDrawings(drawings);
chart.getDrawingInstances();
chart.setMagnetMode(true);

// ── Trading ────────────────────────────────────────────
chart.setTradeMode(true, options);
chart.setTradeOptions(options);
chart.addOrderLine(line);
chart.updateOrderLine(id, updates);
chart.removeOrderLine(id);
chart.clearOrderLines();
chart.getOrderLines();
chart.loadOrderLines(lines);
chart.setPositionOverlays(positions);

// ── Alerts ─────────────────────────────────────────────
chart.addAlert(price);
chart.removeAlert(id);

// ── Compare ────────────────────────────────────────────
chart.addCompare('ETHUSDT');
chart.removeCompare('ETHUSDT');

// ── Events ─────────────────────────────────────────────
chart.on('crosshairMove', cb);
chart.on('barUpdate', cb);
chart.on('click', cb);
chart.on('drawingAdded', cb);
chart.on('drawingRemoved', cb);
chart.on('drawingModified', cb);
chart.on('drawingSelected', cb);
chart.on('drawingDeselected', cb);
chart.on('tradeRequested', cb);
chart.on('orderLineMoved', cb);
chart.on('symbolChange', cb);
chart.on('timeframeChange', cb);
chart.on('visibleRangeChange', cb);
chart.on('dataLoaded', cb);
chart.off(event, cb);
```

## Theming

```typescript
import type { Theme } from '@exchange/charts';

const customTheme: Theme = {
  name: 'midnight',
  bg: '#0a0a0a',
  gridLine: '#1a1a1a',
  bullCandle: '#00ff88',
  bearCandle: '#ff4444',
  bullCandleWick: '#00ff88',
  bearCandleWick: '#ff4444',
  text: '#e0e0e0',
  textSecondary: '#808080',
  crosshairLine: '#555555',
  crosshairLabel: '#333333',
  // ... see Theme interface for all 30+ properties
};

chart.setTheme(customTheme);
```

## Custom Indicators

```typescript
import type { Indicator } from '@exchange/charts';
import { registerIndicator } from '@exchange/charts';

const myIndicator: Indicator = {
  name: 'My VWMA',
  shortName: 'VWMA',
  description: 'Volume Weighted Moving Average',
  overlay: true,
  params: [{ name: 'period', type: 'number', default: 20, min: 1, max: 500 }],

  calculate(bars, params) {
    const { period } = params;
    return bars.map((_, i) => {
      if (i < period - 1) return { values: [NaN] };
      let sumPV = 0, sumV = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumPV += bars[j].close * bars[j].volume;
        sumV += bars[j].volume;
      }
      return { values: [sumPV / sumV] };
    });
  },

  plots: [{ type: 'line', color: '#FF6D00', lineWidth: 2 }],
};

registerIndicator(myIndicator);
chart.addIndicator(myIndicator, { period: 20 });
```

## Development

```bash
git clone https://github.com/iZonex/mg-exchange-chart.git
cd mg-exchange-chart
npm install
npm run dev          # Dev server with live Binance data
npm run build        # Build library (dist/)
npm run test         # Run all tests
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
```

## Examples

See the [`examples/`](./examples/) directory:

- **[Custom Datafeed](./examples/custom-datafeed.ts)** — Connect your own REST + WebSocket backend
- **[Custom Indicator](./examples/custom-indicator.ts)** — Build and register a custom indicator
- **[React Integration](./examples/react-chart.tsx)** — React component with hooks
- **[Trading Integration](./examples/trading-integration.ts)** — Exchange trading UI with custom order flow

## License

[Apache 2.0](./LICENSE)
