// ── Trading UI Module ───────────────────────────────────────────────────────
// Order popup, toast notifications, position panel, order history, confirm dialog.
// Extracted from main.ts for maintainability.

import type { Chart } from '../src/core/chart';
import type { TradingDemo, TradeEvent } from './trading-demo';

const $ = (s: string) => document.querySelector(s)!;
const $$ = (s: string) => document.querySelectorAll(s);

// ── Toast ─────────────────────────────────────────────────────────────────

export function showToast(type: 'success' | 'error' | 'info' | 'warn', title: string, msg?: string, duration = 3000) {
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

// ── Order History ─────────────────────────────────────────────────────────

interface HistoryEntry {
  time: Date;
  type: 'placed' | 'filled' | 'cancelled' | 'tp' | 'sl';
  side: string;
  detail: string;
  pnl?: number;
}

const orderHistory: HistoryEntry[] = [];

export function addHistory(entry: HistoryEntry) {
  orderHistory.unshift(entry);
  if (orderHistory.length > 100) orderHistory.pop();
  renderOrderHistory();
}

function renderOrderHistory() {
  const list = document.getElementById('oh-list')!;
  if (!list.offsetParent) return;
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

export function initOrderHistory() {
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
}

// ── Confirm Dialog ────────────────────────────────────────────────────────

const cdDialog = document.getElementById('confirm-dialog') as HTMLElement;
const cdBg = document.getElementById('confirm-bg') as HTMLElement;
let cdCallback: (() => void) | null = null;

export function showConfirm(title: string, body: string, btnClass: string, onConfirm: () => void) {
  (document.getElementById('cd-title') as HTMLElement).textContent = title;
  (document.getElementById('cd-body') as HTMLElement).textContent = body;
  const btn = document.getElementById('cd-confirm') as HTMLButtonElement;
  btn.className = 'cd-confirm ' + btnClass;
  btn.textContent = 'Confirm';
  cdCallback = onConfirm;
  cdDialog.style.display = 'block';
  cdBg.style.display = 'block';
}

export function hideConfirm() {
  cdDialog.style.display = 'none';
  cdBg.style.display = 'none';
  cdCallback = null;
}

export function initConfirmDialog() {
  document.getElementById('cd-confirm')!.addEventListener('click', () => { cdCallback?.(); hideConfirm(); });
  document.getElementById('cd-cancel')!.addEventListener('click', hideConfirm);
  document.getElementById('confirm-bg')!.addEventListener('click', hideConfirm);
}

// ── Position Panel ────────────────────────────────────────────────────────

export function updatePositionPanel(trading: TradingDemo, lastPrice: number) {
  const posPanel = document.getElementById('position-panel') as HTMLElement;
  const ppBody = document.getElementById('pp-body') as HTMLElement;
  const ppTotalPnl = document.getElementById('pp-total-pnl') as HTMLElement;

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
        showToast(pnl >= 0 ? 'success' : 'error', 'Position Closed',
          `${side.toUpperCase()} ${qty} — PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`);
        addHistory({ time: new Date(), type: pnl >= 0 ? 'tp' : 'sl', side, detail: `Closed ${side} ${qty}`, pnl });
      }
      updatePositionPanel(trading, lastPrice);
    });
  });
}

// ── Wire Trade Events to Toasts ───────────────────────────────────────────

export function initTradeEventHandler(trading: TradingDemo, pendingTPSL: Map<string, { tp: number; sl: number; qty: number }>, getLastPrice: () => number) {
  trading.onTradeEvent = (event: TradeEvent) => {
    switch (event.type) {
      case 'orderFilled': {
        showToast('success', 'Order Filled', `${event.order.side.toUpperCase()} ${event.order.quantity} @ ${event.order.price.toFixed(2)}`);
        addHistory({ time: new Date(), type: 'filled', side: event.order.side, detail: `Limit filled ${event.order.quantity} @ ${event.order.price.toFixed(2)}` });
        const pending = pendingTPSL.get(event.order.id);
        if (pending) {
          pendingTPSL.delete(event.order.id);
          const positions = trading.getPositions();
          const pos = positions[positions.length - 1];
          if (pos) {
            if (pending.tp > 0) { trading.addTP(pos.id, pending.tp, pending.qty); showToast('info', 'TP Set', `@ ${pending.tp.toFixed(2)}`); }
            if (pending.sl > 0) { trading.addSL(pos.id, pending.sl, pending.qty); showToast('warn', 'SL Set', `@ ${pending.sl.toFixed(2)}`); }
            trading.syncOverlays(getLastPrice());
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
}

// ── Order Line Drag Handler ───────────────────────────────────────────────

export function initOrderLineDrag(chart: Chart, trading: TradingDemo, getLastPrice: () => number) {
  chart.on('orderLineMoved', (data) => {
    const order = trading.orders.find(o => o.id === data.id && o.status === 'open');
    if (order) {
      order.price = data.price;
      chart.updateOrderLine(data.id, { label: `${order.side.toUpperCase()} LIMIT ${order.quantity}`, price: data.price });
      showToast('info', 'Order Moved', `${order.side.toUpperCase()} Limit → ${data.price.toFixed(2)}`);
      return;
    }
    for (const pos of trading.getPositions()) {
      const tp = pos.tpLevels.find(l => l.id === data.id);
      if (tp) {
        tp.price = data.price;
        chart.updateOrderLine(data.id, { label: `TP ${data.price.toFixed(2)} (${tp.quantity})`, price: data.price });
        showToast('info', 'TP Moved', `→ ${data.price.toFixed(2)}`);
        trading.syncOverlays(getLastPrice());
        return;
      }
      const sl = pos.slLevels.find(l => l.id === data.id);
      if (sl) {
        sl.price = data.price;
        chart.updateOrderLine(data.id, { label: `SL ${data.price.toFixed(2)} (${sl.quantity})`, price: data.price });
        showToast('warn', 'SL Moved', `→ ${data.price.toFixed(2)}`);
        trading.syncOverlays(getLastPrice());
        return;
      }
    }
  });
}
