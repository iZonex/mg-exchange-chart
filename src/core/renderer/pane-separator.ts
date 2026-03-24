// ── Pane Separator ──────────────────────────────────────────────────────────
// Renders a horizontal separator line between panes.

import type { Theme } from '../../api/types';

export function renderOscillatorPaneSeparator(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  yOffset: number,
  width: number,
): void {
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, yOffset + 0.5);
  ctx.lineTo(width, yOffset + 0.5);
  ctx.stroke();
}
