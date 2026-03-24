// ── Screenshot Export ────────────────────────────────────────────────────────
// Export chart to PNG image (copies all layers onto one canvas).

import { logger } from './logger';

function compositeCanvas(container: HTMLElement): HTMLCanvasElement | null {
  const canvases = container.querySelectorAll('canvas');
  if (canvases.length === 0) return null;

  const first = canvases[0]!;
  const w = first.width;
  const h = first.height;

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = w;
  exportCanvas.height = h;
  const ctx = exportCanvas.getContext('2d')!;

  for (const canvas of canvases) {
    ctx.drawImage(canvas, 0, 0);
  }
  return exportCanvas;
}

export function exportChartToPNG(
  container: HTMLElement,
  filename = 'chart.png',
): void {
  const canvas = compositeCanvas(container);
  if (!canvas) return;

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export async function copyChartToClipboard(container: HTMLElement): Promise<void> {
  const canvas = compositeCanvas(container);
  if (!canvas) return;

  if (!navigator.clipboard?.write) {
    logger.warn('Clipboard API not available (requires HTTPS)');
    return;
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;

  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ]);
}
