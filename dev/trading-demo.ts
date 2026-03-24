// ── Trading Demo ────────────────────────────────────────────────────────────
// Mock trading engine supporting:
// - Multiple entry points (DCA / grid) → averaged into one position
// - Multiple TP levels (partial close at each)
// - Multiple SL levels (partial close at each)
// - Limit orders with auto-fill
// - Live PnL tracking

import type { Chart } from '../src/core/chart';

export interface DemoOrder {
  id: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  type: 'limit' | 'market';
  status: 'open' | 'filled' | 'cancelled';
}

export interface TPSLLevel {
  id: string;
  type: 'tp' | 'sl';
  price: number;
  /** Quantity to close at this level (partial) */
  quantity: number;
  triggered: boolean;
}

export interface EntryFill {
  price: number;
  quantity: number;
  time: number;
}

export interface DemoPosition {
  id: string;
  side: 'long' | 'short';
  entries: EntryFill[];
  /** Computed: weighted average entry price */
  avgEntry: number;
  /** Computed: total open quantity */
  totalQty: number;
  tpLevels: TPSLLevel[];
  slLevels: TPSLLevel[];
  pnl: number;
}

let nextId = 1;
function uid(prefix: string) { return `${prefix}_${nextId++}`; }

export type TradeEvent =
  | { type: 'orderFilled'; order: DemoOrder }
  | { type: 'tpHit'; posId: string; level: number; price: number; pnl: number; qty: number }
  | { type: 'slHit'; posId: string; level: number; price: number; pnl: number; qty: number }
  | { type: 'positionClosed'; side: string; pnl: number };

export class TradingDemo {
  private chart: Chart;
  orders: DemoOrder[] = [];
  positions: DemoPosition[] = [];
  balance = 10000;
  private onUpdate: () => void;
  onTradeEvent?: (event: TradeEvent) => void;

  constructor(chart: Chart, onUpdate: () => void) {
    this.chart = chart;
    this.onUpdate = onUpdate;
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  placeLimitOrder(side: 'buy' | 'sell', price: number, qty = 0.01): DemoOrder {
    const order: DemoOrder = { id: uid('ord'), side, price, quantity: qty, type: 'limit', status: 'open' };
    this.orders.push(order);
    this.chart.addOrderLine({
      id: order.id, price, type: 'limit', side,
      label: `${side.toUpperCase()} LIMIT ${qty}`,
      quantity: qty,
    });
    this.onUpdate();
    return order;
  }

  placeMarketOrder(side: 'buy' | 'sell', currentPrice: number, qty = 0.01): void {
    this.addEntry(side === 'buy' ? 'long' : 'short', currentPrice, qty);
    this.onUpdate();
  }

  cancelOrder(orderId: string): void {
    const o = this.orders.find(o => o.id === orderId);
    if (!o || o.status !== 'open') return;
    o.status = 'cancelled';
    this.chart.removeOrderLine(orderId);
    this.onUpdate();
  }

  // ── Entries (multiple) ────────────────────────────────────────────────────

  /** Add entry to existing position or create new. In hedge mode, both long+short can coexist. */
  addEntry(side: 'long' | 'short', price: number, qty: number, positionId?: string): void {
    // If positionId given, add to that position (DCA)
    let pos = positionId ? this.positions.find(p => p.id === positionId) : undefined;

    // Otherwise find latest open position of same side (DCA into it)
    if (!pos) pos = this.positions.find(p => p.side === side);

    // Or create new (allows hedge: long + short simultaneously)
    if (!pos) {
      pos = { id: uid('pos'), side, entries: [], avgEntry: 0, totalQty: 0, tpLevels: [], slLevels: [], pnl: 0 };
      this.positions.push(pos);
    }

    pos.entries.push({ price, quantity: qty, time: Date.now() });
    this.recalcPosition(pos);

    // Update entry line on chart
    this.chart.removeOrderLine(pos.id);
    this.chart.addOrderLine({
      id: pos.id, price: pos.avgEntry, type: 'entry',
      side: side === 'long' ? 'buy' : 'sell',
      label: `${side.toUpperCase()} avg ${pos.avgEntry.toFixed(2)} × ${pos.totalQty}`,
      quantity: pos.totalQty, pnl: pos.pnl,
    });

    // Show individual entry dots
    for (const entry of pos.entries) {
      const eid = `${pos.id}_e_${entry.time}`;
      this.chart.removeOrderLine(eid);
      this.chart.addOrderLine({
        id: eid, price: entry.price, type: 'entry',
        side: side === 'long' ? 'buy' : 'sell',
        label: `${entry.quantity} @ ${entry.price.toFixed(2)}`,
      });
    }
  }

  private recalcPosition(pos: DemoPosition): void {
    let totalCost = 0, totalQty = 0;
    for (const e of pos.entries) {
      totalCost += e.price * e.quantity;
      totalQty += e.quantity;
    }
    pos.avgEntry = totalQty > 0 ? totalCost / totalQty : 0;
    pos.totalQty = totalQty;
  }

  // ── TP / SL (multiple) ────────────────────────────────────────────────────

  addTP(positionId: string, price: number, qty?: number): void {
    const pos = this.positions.find(p => p.id === positionId);
    if (!pos) return;
    const level: TPSLLevel = { id: uid('tp'), type: 'tp', price, quantity: qty ?? pos.totalQty, triggered: false };
    pos.tpLevels.push(level);
    this.chart.addOrderLine({
      id: level.id, price, type: 'tp',
      side: pos.side === 'long' ? 'buy' : 'sell',
      label: `TP${pos.tpLevels.length} ${price.toFixed(2)} (${level.quantity})`,
    });
    this.onUpdate();
  }

  addSL(positionId: string, price: number, qty?: number): void {
    const pos = this.positions.find(p => p.id === positionId);
    if (!pos) return;
    const level: TPSLLevel = { id: uid('sl'), type: 'sl', price, quantity: qty ?? pos.totalQty, triggered: false };
    pos.slLevels.push(level);
    this.chart.addOrderLine({
      id: level.id, price, type: 'sl',
      side: pos.side === 'long' ? 'buy' : 'sell',
      label: `SL${pos.slLevels.length} ${price.toFixed(2)} (${level.quantity})`,
    });
    this.onUpdate();
  }

  removeTPSL(levelId: string): void {
    for (const pos of this.positions) {
      pos.tpLevels = pos.tpLevels.filter(l => { if (l.id === levelId) { this.chart.removeOrderLine(levelId); return false; } return true; });
      pos.slLevels = pos.slLevels.filter(l => { if (l.id === levelId) { this.chart.removeOrderLine(levelId); return false; } return true; });
    }
    this.onUpdate();
  }

  // ── Close ─────────────────────────────────────────────────────────────────

  closePosition(positionId: string, currentPrice: number): void {
    const pos = this.positions.find(p => p.id === positionId);
    if (!pos) return;

    const pnl = pos.side === 'long'
      ? (currentPrice - pos.avgEntry) * pos.totalQty
      : (pos.avgEntry - currentPrice) * pos.totalQty;
    this.balance += pnl;

    // Remove all chart lines
    this.chart.removeOrderLine(positionId);
    for (const e of pos.entries) this.chart.removeOrderLine(`${positionId}_e_${e.time}`);
    for (const l of pos.tpLevels) this.chart.removeOrderLine(l.id);
    for (const l of pos.slLevels) this.chart.removeOrderLine(l.id);

    this.positions = this.positions.filter(p => p.id !== positionId);
    console.log(`[trade] Closed ${pos.side}. PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`);
    this.onUpdate();
  }

  // ── Price tick ────────────────────────────────────────────────────────────

  onPriceTick(price: number): void {
    // Check limit orders
    for (const o of this.orders) {
      if (o.status !== 'open') continue;
      if ((o.side === 'buy' && price <= o.price) || (o.side === 'sell' && price >= o.price)) {
        o.status = 'filled';
        this.chart.removeOrderLine(o.id);
        this.addEntry(o.side === 'buy' ? 'long' : 'short', o.price, o.quantity);
        this.onTradeEvent?.({ type: 'orderFilled', order: o });
        console.log(`[trade] Limit filled: ${o.side} @ ${o.price}`);
      }
    }

    // Update PnL + check TP/SL
    for (const pos of [...this.positions]) {
      pos.pnl = pos.side === 'long'
        ? (price - pos.avgEntry) * pos.totalQty
        : (pos.avgEntry - price) * pos.totalQty;
      this.chart.updateOrderLine(pos.id, { pnl: pos.pnl });

      // Check TP levels (partial close)
      for (const tp of pos.tpLevels) {
        if (tp.triggered) continue;
        const hit = pos.side === 'long' ? price >= tp.price : price <= tp.price;
        if (hit) {
          tp.triggered = true;
          const closePnl = pos.side === 'long'
            ? (tp.price - pos.avgEntry) * tp.quantity
            : (pos.avgEntry - tp.price) * tp.quantity;
          this.balance += closePnl;
          pos.totalQty = Math.max(0, pos.totalQty - tp.quantity);
          this.chart.removeOrderLine(tp.id);
          this.onTradeEvent?.({ type: 'tpHit', posId: pos.id, level: pos.tpLevels.indexOf(tp) + 1, price: tp.price, pnl: closePnl, qty: tp.quantity });
          console.log(`[trade] TP${pos.tpLevels.indexOf(tp) + 1} hit @ ${tp.price}. Closed ${tp.quantity}, PnL: +${closePnl.toFixed(2)}`);

          if (pos.totalQty <= 0) {
            this.closePosition(pos.id, tp.price);
            return;
          }
        }
      }

      // Check SL levels (partial close)
      for (const sl of pos.slLevels) {
        if (sl.triggered) continue;
        const hit = pos.side === 'long' ? price <= sl.price : price >= sl.price;
        if (hit) {
          sl.triggered = true;
          const closePnl = pos.side === 'long'
            ? (sl.price - pos.avgEntry) * sl.quantity
            : (pos.avgEntry - sl.price) * sl.quantity;
          this.balance += closePnl;
          pos.totalQty = Math.max(0, pos.totalQty - sl.quantity);
          this.chart.removeOrderLine(sl.id);
          this.onTradeEvent?.({ type: 'slHit', posId: pos.id, level: pos.slLevels.indexOf(sl) + 1, price: sl.price, pnl: closePnl, qty: sl.quantity });
          console.log(`[trade] SL hit @ ${sl.price}. Closed ${sl.quantity}, PnL: ${closePnl.toFixed(2)}`);

          if (pos.totalQty <= 0) {
            this.closePosition(pos.id, sl.price);
            return;
          }
        }
      }
    }

    this.onUpdate();
  }

  /** Push position overlays to chart for Bybit-style rendering */
  syncOverlays(currentPrice: number): void {
    const overlays = this.positions.map(pos => ({
      side: pos.side,
      entryPrice: pos.avgEntry,
      quantity: pos.totalQty,
      currentPrice,
      pnl: pos.pnl,
      breakeven: pos.avgEntry * (1 + 0.001), // simulate ~0.1% fee breakeven
      tpLevels: pos.tpLevels.filter(l => !l.triggered).map(l => ({ price: l.price, quantity: l.quantity })),
      slLevels: pos.slLevels.filter(l => !l.triggered).map(l => ({ price: l.price, quantity: l.quantity })),
    }));
    this.chart.setPositionOverlays(overlays as any);
  }

  getOpenOrders(): DemoOrder[] { return this.orders.filter(o => o.status === 'open'); }
  getPositions(): DemoPosition[] { return this.positions; }
  getBalance(): number { return this.balance; }
}
