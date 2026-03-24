// ── Position Overlay ────────────────────────────────────────────────────────
// Renders a full position visualization on the chart like Bybit/Binance:
// - Entry line with P&L badge
// - TP zone (green shaded) with expected profit label
// - SL zone (red shaded) with expected loss label
// - Breakeven line (dashed)
// - Qty badges on TP/SL

import type { Theme } from '../../api/types';
import { font } from '../font';
import type { RenderContext } from './render-context';
import { t } from '../i18n';
import type { PriceScale } from './price-axis';
import { priceToY, formatPrice, PRICE_AXIS_WIDTH } from './price-axis';

/** Convert a hex color (#rrggbb or #rgb) to an rgba() string */
function hexToRgba(hex: string, alpha: number): string {
  let r: number, g: number, b: number;
  const h = hex.replace('#', '');
  if (h.length === 3) {
    r = parseInt(h.charAt(0) + h.charAt(0), 16);
    g = parseInt(h.charAt(1) + h.charAt(1), 16);
    b = parseInt(h.charAt(2) + h.charAt(2), 16);
  } else {
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface PositionOverlayData {
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  breakeven?: number;
  currentPrice: number;
  pnl: number;
  tpLevels: { price: number; quantity: number }[];
  slLevels: { price: number; quantity: number }[];
}

export function renderPositionOverlay(
  ctx: RenderContext | CanvasRenderingContext2D,
  pos: PositionOverlayData,
  priceScale: PriceScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
  precision: number,
): void {
  const entryY = priceToY(pos.entryPrice, priceScale, chartHeight);
  const isLong = pos.side === 'long';

  // Resolve theme-aware colors
  const tpColor = theme.tpColor ?? theme.bullCandle;
  const slColor = theme.slColor ?? theme.bearCandle;
  const beColor = theme.breakevenColor ?? theme.textMuted;
  const badgeTextColor = theme.badgeText ?? '#ffffff';

  // ── TP Zones (green shaded) ───────────────────────────────────────────
  for (const tp of pos.tpLevels) {
    const tpY = priceToY(tp.price, priceScale, chartHeight);
    const top = Math.min(entryY, tpY);
    const bottom = Math.max(entryY, tpY);

    if (bottom > 0 && top < chartHeight) {
      // Green zone fill
      ctx.fillStyle = hexToRgba(tpColor, 0.08);
      ctx.fillRect(0, top, chartWidth, bottom - top);

      // TP line (dashed green)
      ctx.strokeStyle = tpColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(0, Math.round(tpY) + 0.5);
      ctx.lineTo(chartWidth, Math.round(tpY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // TP badge (left side)
      const tpLabel = `${t('tp')}  ${tp.quantity}`;
      renderBadge(ctx, 0, tpY, tpLabel, tpColor, badgeTextColor);

      // TP price badge (right axis)
      renderAxisBadge(ctx, chartWidth, tpY, formatPrice(tp.price, precision), tpColor, badgeTextColor);

      // Expected profit label in the zone
      const expectedProfit = isLong
        ? (tp.price - pos.entryPrice) * tp.quantity
        : (pos.entryPrice - tp.price) * tp.quantity;
      if (expectedProfit > 0) {
        const profitLabel = `${t('expectedProfit')} +${expectedProfit.toFixed(2)}`;
        ctx.fillStyle = tpColor;
        ctx.font = font(10);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const labelY = (top + bottom) / 2;
        // Background
        const tw = ctx.measureText(profitLabel).width;
        ctx.fillStyle = hexToRgba(tpColor, 0.15);
        ctx.fillRect(8, labelY - 9, tw + 12, 18);
        ctx.fillStyle = tpColor;
        ctx.fillText(profitLabel, 14, labelY);
      }
    }
  }

  // ── SL Zones (red shaded) ─────────────────────────────────────────────
  for (const sl of pos.slLevels) {
    const slY = priceToY(sl.price, priceScale, chartHeight);
    const top = Math.min(entryY, slY);
    const bottom = Math.max(entryY, slY);

    if (bottom > 0 && top < chartHeight) {
      // Red zone fill
      ctx.fillStyle = hexToRgba(slColor, 0.08);
      ctx.fillRect(0, top, chartWidth, bottom - top);

      // SL line (dashed red)
      ctx.strokeStyle = slColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(0, Math.round(slY) + 0.5);
      ctx.lineTo(chartWidth, Math.round(slY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // SL badge
      const slLabel = `${t('sl')}  ${sl.quantity}`;
      renderBadge(ctx, 0, slY, slLabel, slColor, badgeTextColor);

      // SL price badge
      renderAxisBadge(ctx, chartWidth, slY, formatPrice(sl.price, precision), slColor, badgeTextColor);

      // Expected loss label
      const expectedLoss = isLong
        ? (sl.price - pos.entryPrice) * sl.quantity
        : (pos.entryPrice - sl.price) * sl.quantity;
      if (expectedLoss < 0) {
        const lossLabel = `${t('expectedLoss')} ${expectedLoss.toFixed(4)}`;
        ctx.font = font(10);
        const tw = ctx.measureText(lossLabel).width;
        const labelY = (top + bottom) / 2;
        ctx.fillStyle = hexToRgba(slColor, 0.15);
        ctx.fillRect(8, labelY - 9, tw + 12, 18);
        ctx.fillStyle = slColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(lossLabel, 14, labelY);
      }
    }
  }

  // ── Breakeven line ────────────────────────────────────────────────────
  if (pos.breakeven && pos.breakeven !== pos.entryPrice) {
    const beY = priceToY(pos.breakeven, priceScale, chartHeight);
    ctx.strokeStyle = beColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, Math.round(beY) + 0.5);
    ctx.lineTo(chartWidth, Math.round(beY) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    renderBadge(ctx, 0, beY, `${t('breakeven')} ${pos.side === 'long' ? t('long') : t('short')}`, beColor, badgeTextColor);
    renderAxisBadge(ctx, chartWidth, beY, formatPrice(pos.breakeven, precision), beColor, badgeTextColor);
  }

  // ── Entry line (solid, colored) ───────────────────────────────────────
  const entryLineColor = isLong ? tpColor : slColor;

  ctx.strokeStyle = entryLineColor;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, Math.round(entryY) + 0.5);
  ctx.lineTo(chartWidth, Math.round(entryY) + 0.5);
  ctx.stroke();

  // Entry badge with P&L
  const pnlSign = pos.pnl >= 0 ? '+' : '';
  const pnlColor = pos.pnl >= 0 ? tpColor : slColor;
  const entryLabel = `${t('pnl')} ${pnlSign}${pos.pnl.toFixed(2)}`;

  // Badge background
  ctx.font = font(10, 'bold');
  const tw1 = ctx.measureText(entryLabel).width;
  const qtyText = `${pos.quantity}`;
  const tw2 = ctx.measureText(qtyText).width;
  const badgeH = 20;
  const badgeY = Math.round(entryY) - badgeH / 2;

  // PnL badge
  ctx.fillStyle = pnlColor;
  ctx.fillRect(0, badgeY, tw1 + 14, badgeH);
  ctx.fillStyle = badgeTextColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(entryLabel, 4, Math.round(entryY));

  // Qty badge
  ctx.fillStyle = entryLineColor;
  ctx.fillRect(tw1 + 16, badgeY, tw2 + 10, badgeH);
  ctx.fillStyle = badgeTextColor;
  ctx.fillText(qtyText, tw1 + 20, Math.round(entryY));

  // Close button ✕
  const closeX = tw1 + tw2 + 30;
  ctx.fillStyle = hexToRgba(slColor, 0.3);
  ctx.fillRect(closeX, badgeY, 18, badgeH);
  ctx.fillStyle = slColor;
  ctx.font = font(12, 'bold');
  ctx.textAlign = 'center';
  ctx.fillText('✕', closeX + 9, Math.round(entryY));

  // Entry price on right axis
  renderAxisBadge(ctx, chartWidth, entryY, formatPrice(pos.entryPrice, precision), entryLineColor, badgeTextColor);
}

// ── Helper: small colored badge ─────────────────────────────────────────────

function renderBadge(ctx: RenderContext | CanvasRenderingContext2D, x: number, y: number, text: string, color: string, textColor = '#ffffff'): void {
  ctx.font = font(10, 'bold');
  const tw = ctx.measureText(text).width;
  const h = 16, bx = x, by = Math.round(y) - h / 2;
  ctx.fillStyle = color;
  ctx.fillRect(bx, by, tw + 10, h);
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + 5, Math.round(y));
}

function renderAxisBadge(ctx: RenderContext | CanvasRenderingContext2D, chartWidth: number, y: number, text: string, color: string, textColor = '#ffffff'): void {
  const h = 16, by = Math.round(y) - h / 2;
  ctx.fillStyle = color;
  ctx.fillRect(chartWidth, by, PRICE_AXIS_WIDTH, h);
  ctx.fillStyle = textColor;
  ctx.font = font(10);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, chartWidth + 4, Math.round(y));
}
