// ── Drawing Tool Utilities ──────────────────────────────────────────────────

import type { DrawingOptions } from '../../api/types';

/** Apply line style (solid, dashed, dotted) to canvas context */
export function applyLineStyle(ctx: CanvasRenderingContext2D, options: DrawingOptions): void {
  switch (options.lineStyle) {
    case 'dashed':
      ctx.setLineDash([8, 4]);
      break;
    case 'dotted':
      ctx.setLineDash([2, 3]);
      break;
    case 'solid':
    default:
      ctx.setLineDash([]);
      break;
  }
}
