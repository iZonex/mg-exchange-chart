// ── Trading Integration Example ─────────────────────────────────────────────
//
// Shows how an exchange integrates the chart's trading features:
// 1. Custom order entry UI (your own popup, not the built-in one)
// 2. Order line management (display orders from your exchange API)
// 3. Position overlays with TP/SL zones
// 4. Draggable order lines (modify orders by dragging)
// 5. Custom context menu
//
// The chart is a visualization layer — your exchange backend handles all order logic.

import { Chart } from '@mg-exchange/charts';
import type {
  OrderLine,
  PositionOverlayData,
  TradeActionData,
} from '@mg-exchange/charts';

// ── 1. Create chart with trade mode ─────────────────────────────────────────

const chart = new Chart({
  container: '#chart',
  symbol: 'BTCUSDT',
  timeframe: '1H',
  datafeed: myDatafeed, // your datafeed implementation

  trading: {
    // Option A: Override the "+" button with your own handler
    onTradeAction: (data: TradeActionData) => {
      showExchangeOrderForm({
        price: data.price,
        side: data.suggestedSide,
        // Position your popup near the click
        x: data.clientX,
        y: data.clientY,
      });
    },

    // Option B: Custom right-click menu items (instead of default Buy/Sell)
    contextMenuItems: (price: number) => [
      { label: `Limit Buy @ ${price.toFixed(2)}`, action: 'limit-buy' },
      { label: `Limit Sell @ ${price.toFixed(2)}`, action: 'limit-sell' },
      { label: `Stop Buy @ ${price.toFixed(2)}`, action: 'stop-buy', separator: true },
      { label: `Stop Sell @ ${price.toFixed(2)}`, action: 'stop-sell' },
      { label: 'OCO Order', action: 'oco', separator: true },
      { label: 'Set Price Alert', action: 'alert' },
    ],

    // Called when user drags an order line to a new price
    onOrderLineDrag: (orderId: string, newPrice: number) => {
      // Send modification to your exchange API
      exchangeAPI.modifyOrder(orderId, { price: newPrice });
    },

    draggableOrderLines: true,
    showPlusButton: true,
    showContextMenu: true,
  },
});

// Enable trade mode
chart.setTradeMode(true);

// ── 2. Listen to trade events ───────────────────────────────────────────────

// User selected a menu item from the custom context menu
chart.on('tradeRequested', ({ side, price, type, action }) => {
  switch (action) {
    case 'limit-buy':
    case 'limit-sell':
      exchangeAPI.placeOrder({ side, price, type: 'limit', qty: defaultQty });
      break;
    case 'stop-buy':
    case 'stop-sell':
      exchangeAPI.placeOrder({ side, price, type: 'stop', qty: defaultQty });
      break;
    case 'oco':
      showOCODialog(price);
      break;
    case 'alert':
      chart.addAlert(price);
      break;
  }
});

// User dragged an order line (also fires alongside onOrderLineDrag callback)
chart.on('orderLineMoved', ({ id, price }) => {
  console.log(`Order ${id} moved to ${price}`);
});

// ── 3. Sync exchange state → chart ──────────────────────────────────────────

// When your exchange API returns orders, display them on chart
function syncOrdersToChart(orders: ExchangeOrder[]) {
  chart.clearOrderLines();

  for (const order of orders) {
    chart.addOrderLine({
      id: order.id,
      price: order.price,
      type: mapOrderType(order.type), // 'limit' | 'stop' | 'tp' | 'sl'
      side: order.side,
      label: `${order.side.toUpperCase()} ${order.type} ${order.qty}`,
      quantity: order.qty,
    });
  }
}

// When your exchange API returns positions, display overlays
function syncPositionsToChart(positions: ExchangePosition[], currentPrice: number) {
  const overlays: PositionOverlayData[] = positions.map(pos => ({
    side: pos.side,
    entryPrice: pos.avgEntry,
    quantity: pos.quantity,
    currentPrice,
    pnl: pos.unrealizedPnl,
    breakeven: pos.breakeven,
    tpLevels: pos.takeProfitOrders.map(tp => ({
      price: tp.price,
      quantity: tp.qty,
    })),
    slLevels: pos.stopLossOrders.map(sl => ({
      price: sl.price,
      quantity: sl.qty,
    })),
  }));

  chart.setPositionOverlays(overlays);
}

// ── 4. Real-time updates ────────────────────────────────────────────────────

// Update position PnL on every price tick
chart.on('barUpdate', (bar) => {
  const currentPrice = bar.close;

  // Update position overlays with new price
  syncPositionsToChart(exchangeState.positions, currentPrice);

  // Update PnL on entry order lines
  for (const pos of exchangeState.positions) {
    const pnl = pos.side === 'long'
      ? (currentPrice - pos.avgEntry) * pos.quantity
      : (pos.avgEntry - currentPrice) * pos.quantity;

    chart.updateOrderLine(pos.id, { pnl });
  }
});

// ── 5. Persistence ──────────────────────────────────────────────────────────

// Save order lines state
function saveChartState() {
  const orderLines = chart.getOrderLines();
  const drawings = chart.getDrawings();
  localStorage.setItem('chart-state', JSON.stringify({ orderLines, drawings }));
}

// Restore
function restoreChartState() {
  const state = JSON.parse(localStorage.getItem('chart-state') || '{}');
  if (state.orderLines) chart.loadOrderLines(state.orderLines);
  if (state.drawings) chart.loadDrawings(state.drawings);
}

// ── 6. Minimal mode (exchange builds 100% custom UI) ────────────────────────

// If you want NO built-in trade UI at all — just events + rendering:
chart.setTradeMode(true, {
  showPlusButton: false,
  showContextMenu: false,
  draggableOrderLines: true,
  onTradeAction: undefined, // no handler needed since button is hidden
});

// Your React/Vue component handles all UI
// Chart only renders order lines and position overlays that you push into it

// ── Type stubs (your exchange types) ────────────────────────────────────────

declare const myDatafeed: import('@mg-exchange/charts').Datafeed;
declare const defaultQty: number;
declare const exchangeAPI: {
  placeOrder(params: { side: string; price: number; type: string; qty: number }): void;
  modifyOrder(id: string, updates: { price: number }): void;
};
declare const exchangeState: { positions: ExchangePosition[] };

interface ExchangeOrder {
  id: string;
  side: 'buy' | 'sell';
  price: number;
  qty: number;
  type: string;
}

interface ExchangePosition {
  id: string;
  side: 'long' | 'short';
  avgEntry: number;
  quantity: number;
  unrealizedPnl: number;
  breakeven: number;
  takeProfitOrders: { price: number; qty: number }[];
  stopLossOrders: { price: number; qty: number }[];
}

declare function showExchangeOrderForm(params: { price: number; side: string; x: number; y: number }): void;
declare function showOCODialog(price: number): void;
declare function mapOrderType(type: string): import('@mg-exchange/charts').OrderLineType;
