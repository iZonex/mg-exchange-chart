// ── Pane Controls ───────────────────────────────────────────────────────────
// Render control buttons in the top-right corner of each oscillator pane:
// [Settings] [Hide] [Close]
// Uses SVG-like canvas drawing for consistent icons.

import type { Theme } from '../../api/types';

const BTN_SIZE = 14;
const BTN_GAP = 4;
const BTN_MARGIN = 6;

export interface PaneControlHit {
  paneId: string;
  action: 'settings' | 'hide' | 'close';
}

/** Render pane control buttons. Returns button positions for hit testing. */
export function renderPaneControls(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  paneId: string,
  chartWidth: number,
  yOffset: number,
): void {
  const y = yOffset + BTN_MARGIN;
  let x = chartWidth - BTN_MARGIN;

  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';

  // Close (X)
  x -= BTN_SIZE;
  ctx.strokeStyle = theme.textMuted;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 3);
  ctx.lineTo(x + BTN_SIZE - 3, y + BTN_SIZE - 3);
  ctx.moveTo(x + BTN_SIZE - 3, y + 3);
  ctx.lineTo(x + 3, y + BTN_SIZE - 3);
  ctx.stroke();

  x -= BTN_GAP + BTN_SIZE;

  // Hide (eye)
  ctx.strokeStyle = theme.textMuted;
  ctx.beginPath();
  const eyeY = y + BTN_SIZE / 2;
  ctx.moveTo(x + 1, eyeY);
  ctx.quadraticCurveTo(x + BTN_SIZE / 2, eyeY - 5, x + BTN_SIZE - 1, eyeY);
  ctx.quadraticCurveTo(x + BTN_SIZE / 2, eyeY + 5, x + 1, eyeY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + BTN_SIZE / 2, eyeY, 2, 0, Math.PI * 2);
  ctx.stroke();

  x -= BTN_GAP + BTN_SIZE;

  // Settings (gear/dots)
  ctx.strokeStyle = theme.textMuted;
  ctx.fillStyle = theme.textMuted;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + BTN_SIZE / 2, y + 3 + i * 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Hit test pane control buttons. Returns action or null. */
export function hitTestPaneControls(
  mouseX: number,
  mouseY: number,
  chartWidth: number,
  yOffset: number,
): 'close' | 'hide' | 'settings' | null {
  const y = yOffset + BTN_MARGIN;
  const my = mouseY;
  if (my < y || my > y + BTN_SIZE) return null;

  let x = chartWidth - BTN_MARGIN;

  // Close
  x -= BTN_SIZE;
  if (mouseX >= x && mouseX <= x + BTN_SIZE) return 'close';

  x -= BTN_GAP + BTN_SIZE;

  // Hide
  if (mouseX >= x && mouseX <= x + BTN_SIZE) return 'hide';

  x -= BTN_GAP + BTN_SIZE;

  // Settings
  if (mouseX >= x && mouseX <= x + BTN_SIZE) return 'settings';

  return null;
}
