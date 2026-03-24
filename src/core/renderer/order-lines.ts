// ── Order & Position Lines ──────────────────────────────────────────────────
// Horizontal lines showing exchange orders, positions, TP/SL, break-even.
// These are NOT drawings — they come from the exchange API and are rendered
// as non-interactive overlays on the series layer.

import type { Theme } from '../../api/types';
import { font } from '../font';
import type { RenderContext } from './render-context';
import type { PriceScale } from './price-axis';
import { priceToY, formatPrice, PRICE_AXIS_WIDTH } from './price-axis';

export type OrderLineSide = 'buy' | 'sell';
export type OrderLineType = 'limit' | 'stop' | 'tp' | 'sl' | 'entry' | 'liquidation' | 'breakeven';

export interface OrderLine {
  id: string;
  price: number;
  type: OrderLineType;
  side: OrderLineSide;
  label: string;
  quantity?: number;
  /** Optional PnL for position lines */
  pnl?: number;
}

function resolveTypeColors(theme: Theme): Record<OrderLineType, string> {
  return {
    limit: theme.limitOrderColor ?? '#2962FF',
    stop: theme.stopOrderColor ?? '#FF9800',
    tp: theme.tpColor ?? theme.bullCandle,
    sl: theme.slColor ?? theme.bearCandle,
    entry: theme.entryColor ?? '#2962FF',
    liquidation: theme.liquidationColor ?? theme.bearCandle,
    breakeven: theme.breakevenColor ?? '#848e9c',
  };
}

const TYPE_STYLES: Record<OrderLineType, number[]> = {
  limit: [],          // solid
  stop: [6, 3],       // dashed
  tp: [4, 3],         // dashed
  sl: [4, 3],         // dashed
  entry: [],          // solid
  liquidation: [2, 2],// dotted
  breakeven: [6, 3],  // dashed
};

export class OrderLineManager {
  private lines = new Map<string, OrderLine>();

  add(line: OrderLine): void {
    this.lines.set(line.id, line);
  }

  remove(id: string): void {
    this.lines.delete(id);
  }

  update(id: string, updates: Partial<OrderLine>): void {
    const line = this.lines.get(id);
    if (line) Object.assign(line, updates);
  }

  getAll(): OrderLine[] {
    return Array.from(this.lines.values());
  }

  clear(): void {
    this.lines.clear();
  }

  /** Hit-test: find order line near a Y pixel position */
  hitTest(y: number, priceScale: PriceScale, chartHeight: number, threshold = 6): OrderLine | null {
    for (const line of this.lines.values()) {
      const lineY = priceToY(line.price, priceScale, chartHeight);
      if (Math.abs(y - lineY) <= threshold) return line;
    }
    return null;
  }
}

export function renderOrderLines(
  ctx: RenderContext | CanvasRenderingContext2D,
  lines: OrderLine[],
  priceScale: PriceScale,
  theme: Theme,
  chartWidth: number,
  chartHeight: number,
  precision: number,
): void {
  const typeColors = resolveTypeColors(theme);
  const badgeTextColor = theme.badgeText ?? '#ffffff';

  for (const line of lines) {
    const y = priceToY(line.price, priceScale, chartHeight);
    if (y < -20 || y > chartHeight + 20) continue;

    const color = typeColors[line.type] ?? '#848e9c';
    const dash = TYPE_STYLES[line.type] ?? [];

    // Line
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(chartWidth, Math.round(y) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // Left label badge
    const labelText = line.label;
    ctx.font = font(10);
    const tw = ctx.measureText(labelText).width;
    const badgeW = tw + 12;
    const badgeH = 16;
    const badgeY = Math.round(y) - badgeH / 2;

    ctx.fillStyle = color;
    ctx.fillRect(0, badgeY, badgeW, badgeH);
    ctx.fillStyle = badgeTextColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, 6, Math.round(y));

    // Right price badge (on axis)
    const priceLabel = formatPrice(line.price, precision);

    ctx.fillStyle = color;
    ctx.fillRect(chartWidth, badgeY, PRICE_AXIS_WIDTH, badgeH);
    ctx.fillStyle = badgeTextColor;
    ctx.textAlign = 'left';
    ctx.fillText(priceLabel, chartWidth + 6, Math.round(y));

    // Quantity text (if present)
    if (line.quantity !== undefined) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.textAlign = 'left';
      ctx.fillText(`${line.quantity}`, badgeW + 6, Math.round(y));
      ctx.globalAlpha = 1;
    }

    // PnL badge (for positions)
    if (line.pnl !== undefined) {
      const pnlText = (line.pnl >= 0 ? '+' : '') + line.pnl.toFixed(2);
      const pnlColor = line.pnl >= 0 ? theme.bullCandle : theme.bearCandle;
      ctx.fillStyle = pnlColor;
      ctx.textAlign = 'right';
      ctx.fillText(pnlText, chartWidth - 8, Math.round(y));
    }
  }
}
