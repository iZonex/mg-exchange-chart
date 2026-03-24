// ── Fixed Range Volume Profile ─────────────────────────────────────────────
// Drawing tool: user selects a bar range (2 clicks), chart computes VP
// and injects _vpBins with POC/VA flags into options before render.

import type { DrawingOptions } from '../../api/types';
import { font } from '../../core/font';
import type { PixelPoint } from '../primitives/hit-test';
import { t } from '../../core/i18n';

interface VPBin {
  y1: number; y2: number;
  buyW: number; sellW: number;
  isPOC: boolean; isVA: boolean;
}

export const fixedRangeVPTool = {
  name: 'fixed-range-vp',
  icon: '<line x1="2" y1="4" x2="2" y2="20"/>',
  pointCount: 2,

  render(
    ctx: CanvasRenderingContext2D,
    points: PixelPoint[],
    options: DrawingOptions,
    width: number,
    height: number,
  ): void {
    if (points.length < 2) return;

    const x1 = Math.min(points[0]!.x, points[1]!.x);
    const x2 = Math.max(points[0]!.x, points[1]!.x);
    const regionWidth = x2 - x1;
    if (regionWidth < 2) return;

    // Selection region background + boundary lines (only when not locked)
    const isLocked = (options as any)._locked as boolean | undefined;
    if (!isLocked) {
      ctx.fillStyle = options.color + '08';
      ctx.fillRect(x1, 0, regionWidth, height);

      ctx.strokeStyle = options.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(Math.round(x1) + 0.5, 0);
      ctx.lineTo(Math.round(x1) + 0.5, height);
      ctx.moveTo(Math.round(x2) + 0.5, 0);
      ctx.lineTo(Math.round(x2) + 0.5, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // VP bins from chart injection
    const bins = (options as any)._vpBins as VPBin[] | undefined;
    if (!bins || bins.length === 0) {
      ctx.fillStyle = options.color;
      ctx.font = font(11);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('volumeProfile'), (x1 + x2) / 2, height / 2);
      return;
    }

    const maxBarWidth = regionWidth * 0.85;
    let pocY = 0;

    for (const bin of bins) {
      const barHeight = Math.max(1, bin.y2 - bin.y1 - 0.5);
      const totalW = (bin.buyW + bin.sellW) * maxBarWidth;

      if (totalW < 0.5) continue;

      // Opacity: POC = bright, VA = medium, outside = faded
      const alpha = bin.isPOC ? 1.0 : bin.isVA ? 0.6 : 0.25;

      // Buy volume (teal/green)
      const buyWidth = bin.buyW * maxBarWidth;
      if (buyWidth > 0) {
        ctx.fillStyle = bin.isPOC ? '#26a69a' : '#26a69a';
        ctx.globalAlpha = alpha;
        ctx.fillRect(x1 + 2, bin.y1, buyWidth, barHeight);
      }

      // Sell volume (red)
      const sellWidth = bin.sellW * maxBarWidth;
      if (sellWidth > 0) {
        ctx.fillStyle = bin.isPOC ? '#ef5350' : '#ef5350';
        ctx.globalAlpha = alpha;
        ctx.fillRect(x1 + 2 + buyWidth, bin.y1, sellWidth, barHeight);
      }

      ctx.globalAlpha = 1;

      // Track POC Y for label
      if (bin.isPOC) {
        pocY = (bin.y1 + bin.y2) / 2;
      }
    }

    // ── POC line ────────────────────────────────────────────────────
    if (pocY > 0) {
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, Math.round(pocY) + 0.5);
      ctx.lineTo(x2, Math.round(pocY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // POC label
      ctx.font = font(10, 'bold');
      ctx.fillStyle = '#ffeb3b';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('poc'), x2 - 4, pocY);
    }

    // ── VAH / VAL lines ─────────────────────────────────────────────
    // Bins go from low price (index 0, high Y) to high price (last index, low Y)
    // VAL = low price boundary of VA, VAH = high price boundary of VA
    let vahY = -1, valY = -1;
    for (let i = 0; i < bins.length; i++) {
      if (bins[i]!.isVA && (i === 0 || !bins[i - 1]!.isVA)) {
        valY = bins[i]!.y2; // lowest price in VA → VAL (high Y = bottom)
      }
      if (bins[i]!.isVA && (i === bins.length - 1 || !bins[i + 1]!.isVA)) {
        vahY = bins[i]!.y1; // highest price in VA → VAH (low Y = top)
      }
    }

    if (vahY >= 0) {
      ctx.strokeStyle = '#90caf9';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, Math.round(vahY) + 0.5);
      ctx.lineTo(x2, Math.round(vahY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = font(9);
      ctx.fillStyle = '#90caf9';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(t('vah'), x2 - 4, vahY - 1);
    }

    if (valY >= 0) {
      ctx.strokeStyle = '#90caf9';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, Math.round(valY) + 0.5);
      ctx.lineTo(x2, Math.round(valY) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = font(9);
      ctx.fillStyle = '#90caf9';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(t('val'), x2 - 4, valY + 1);
    }
  },

  hitTest(mouse: PixelPoint, points: PixelPoint[], threshold: number): boolean {
    if (points.length < 2) return false;
    const x1 = Math.min(points[0]!.x, points[1]!.x);
    const x2 = Math.max(points[0]!.x, points[1]!.x);
    // Hit anywhere inside the region (not just edges)
    return mouse.x >= x1 - threshold && mouse.x <= x2 + threshold;
  },

  getHandles(points: PixelPoint[]): PixelPoint[] {
    if (points.length < 2) return points;
    return [
      { x: points[0]!.x, y: 50 },
      { x: points[1]!.x, y: 50 },
    ];
  },
};
