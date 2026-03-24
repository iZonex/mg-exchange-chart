// ── Long/Short Position Tool ────────────────────────────────────────────────
// Three-point drawing: entry (p1), take-profit (p2), stop-loss (p3).
// Each point is independently draggable. Shows R:R ratio, P&L, percentages.
// "Long Position" / "Short Position" tool.

import { pointInRect } from '../primitives/hit-test';
import { font } from '../../core/font';
import type { InternalDrawingTool } from '../engine';
import { t } from '../../core/i18n';
import { drawBadge } from '../primitives/label';

export const longShortTool: InternalDrawingTool = {
  name: 'long-short',
  icon: 'M12,2 L12,22 M8,6 L12,2 L16,6',
  pointCount: 3,

  render(ctx, points, options, width, _height) {
    if (points.length < 2) return;
    const entry = points[0]!;
    const tp = points[1]!;

    // If only 2 points placed, mirror SL from TP (1:1 R:R preview)
    const sl = points.length >= 3 ? points[2]! : { x: entry.x, y: entry.y + (entry.y - tp.y) };

    const isLong = tp.y < entry.y; // TP above entry = long

    // Price data from chart injection
    const data = options as any;
    const entryPrice = data._entryPrice as number | undefined;
    const tpPrice = data._targetPrice as number | undefined;
    const precision = (data._precision as number) ?? 2;

    // Compute SL price from pixel ratio
    let slPrice: number | undefined;
    if (entryPrice !== undefined && tpPrice !== undefined && points.length >= 3) {
      const pxRange = entry.y - tp.y; // positive if long
      const slPxRange = sl.y - entry.y; // positive if SL below entry
      if (pxRange !== 0) {
        const pricePerPx = (tpPrice - entryPrice) / pxRange;
        slPrice = entryPrice - slPxRange * pricePerPx;
      }
    } else if (entryPrice !== undefined && tpPrice !== undefined) {
      slPrice = entryPrice - (tpPrice - entryPrice); // 1:1 mirror
    }

    const tpDist = Math.abs(tp.y - entry.y);
    const slDist = Math.abs(sl.y - entry.y);
    const rr = slDist > 0 ? (tpDist / slDist).toFixed(2) : '--';

    // ── TP zone (green) ─────────────────────────────────────────────
    const tpTop = Math.min(entry.y, tp.y);
    const tpBottom = Math.max(entry.y, tp.y);
    ctx.fillStyle = 'rgba(14,203,129,0.10)';
    ctx.fillRect(0, tpTop, width, tpBottom - tpTop);

    // ── SL zone (red) ───────────────────────────────────────────────
    const slTop = Math.min(entry.y, sl.y);
    const slBottom = Math.max(entry.y, sl.y);
    ctx.fillStyle = 'rgba(246,70,93,0.10)';
    ctx.fillRect(0, slTop, width, slBottom - slTop);

    // ── Entry line (solid) ──────────────────────────────────────────
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, Math.round(entry.y) + 0.5);
    ctx.lineTo(width, Math.round(entry.y) + 0.5);
    ctx.stroke();

    // ── TP line (dashed green) ──────────────────────────────────────
    ctx.strokeStyle = '#0ecb81';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(0, Math.round(tp.y) + 0.5);
    ctx.lineTo(width, Math.round(tp.y) + 0.5);
    ctx.stroke();

    // ── SL line (dashed red) ────────────────────────────────────────
    ctx.strokeStyle = '#f6465d';
    ctx.beginPath();
    ctx.moveTo(0, Math.round(sl.y) + 0.5);
    ctx.lineTo(width, Math.round(sl.y) + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Labels ──────────────────────────────────────────────────────
    ctx.textBaseline = 'middle';

    // Entry label
    let entryLabel = isLong ? t('long') : t('short');
    if (entryPrice !== undefined) entryLabel += `  ${entryPrice.toFixed(precision)}`;
    drawBadge(ctx, 8, entry.y, entryLabel, options.color);

    // TP label
    let tpLabel = t('tp');
    if (entryPrice !== undefined && tpPrice !== undefined) {
      const profit = Math.abs(tpPrice - entryPrice);
      const pct = (profit / entryPrice * 100);
      tpLabel += `  ${tpPrice.toFixed(precision)}  +${pct.toFixed(2)}%`;
    }
    drawBadge(ctx, 8, tp.y, tpLabel, '#0ecb81');

    // SL label
    let slLabel = t('sl');
    if (slPrice !== undefined && entryPrice !== undefined) {
      const loss = Math.abs(slPrice - entryPrice);
      const pct = (loss / entryPrice * 100);
      slLabel += `  ${slPrice.toFixed(precision)}  -${pct.toFixed(2)}%`;
    }
    drawBadge(ctx, 8, sl.y, slLabel, '#f6465d');

    // R:R badge (right side)
    const rrLabel = `${t('riskReward')}  1:${rr}`;
    ctx.font = font(11, 'bold');
    const rrW = ctx.measureText(rrLabel).width + 10;
    drawBadge(ctx, width - rrW - 8, entry.y, rrLabel, options.color);
  },

  hitTest(mouse, points, threshold) {
    if (points.length < 2) return false;
    const entry = points[0]!;
    const tp = points[1]!;
    const sl = points.length >= 3 ? points[2]! : { x: entry.x, y: entry.y + (entry.y - tp.y) };

    const top = Math.min(tp.y, entry.y, sl.y);
    const bottom = Math.max(tp.y, entry.y, sl.y);

    return pointInRect(mouse, { x: 0, y: top }, { x: 9999, y: bottom }, threshold);
  },

  getHandles(points) {
    if (points.length < 3) return points.slice();
    return [points[0]!, points[1]!, points[2]!];
  },
};
