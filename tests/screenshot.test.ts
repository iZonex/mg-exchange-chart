// ── Screenshot Export Tests ─────────────────────────────────────────────────
// Tests for exportChartToPNG function.

import { describe, it, expect, vi, afterEach } from 'vitest';

describe('exportChartToPNG', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('composites all canvases and triggers download', async () => {
    const drawImageFn = vi.fn();
    const exportCtx = { drawImage: drawImageFn };
    const clickFn = vi.fn();

    const canvas1 = { width: 800, height: 600 };
    const canvas2 = { width: 800, height: 600 };

    let callIndex = 0;
    const createElement = vi.fn((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(exportCtx),
          toDataURL: vi.fn().mockReturnValue('data:image/png;base64,abc123'),
        };
      }
      if (tag === 'a') {
        return { download: '', href: '', click: clickFn };
      }
      return {};
    });

    vi.stubGlobal('document', { createElement });

    const container = {
      querySelectorAll: vi.fn().mockReturnValue([canvas1, canvas2]),
    } as unknown as HTMLElement;

    const { exportChartToPNG } = await import('../src/core/screenshot');
    exportChartToPNG(container, 'test-chart.png');

    // Should draw both canvases onto the export canvas
    expect(drawImageFn).toHaveBeenCalledTimes(2);
    expect(drawImageFn).toHaveBeenCalledWith(canvas1, 0, 0);
    expect(drawImageFn).toHaveBeenCalledWith(canvas2, 0, 0);

    // Should trigger download
    expect(clickFn).toHaveBeenCalledTimes(1);
  });

  it('uses default filename when not specified', async () => {
    const drawImageFn = vi.fn();
    const exportCtx = { drawImage: drawImageFn };
    let linkObj: Record<string, unknown> = {};

    const createElement = vi.fn((tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(exportCtx),
          toDataURL: vi.fn().mockReturnValue('data:image/png;base64,abc'),
        };
      }
      if (tag === 'a') {
        linkObj = { download: '', href: '', click: vi.fn() };
        return linkObj;
      }
      return {};
    });

    vi.stubGlobal('document', { createElement });

    const container = {
      querySelectorAll: vi.fn().mockReturnValue([{ width: 400, height: 300 }]),
    } as unknown as HTMLElement;

    const { exportChartToPNG } = await import('../src/core/screenshot');
    exportChartToPNG(container);

    expect(linkObj.download).toBe('chart.png');
  });

  it('does nothing when container has no canvases', async () => {
    const createElement = vi.fn();
    vi.stubGlobal('document', { createElement });

    const container = {
      querySelectorAll: vi.fn().mockReturnValue([]),
    } as unknown as HTMLElement;

    const { exportChartToPNG } = await import('../src/core/screenshot');
    exportChartToPNG(container);

    // Should not try to create any element
    expect(createElement).not.toHaveBeenCalled();
  });

  it('uses dimensions from the first canvas', async () => {
    const exportCtx = { drawImage: vi.fn() };
    let canvasObj: Record<string, unknown> = {};

    const createElement = vi.fn((tag: string) => {
      if (tag === 'canvas') {
        canvasObj = {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(exportCtx),
          toDataURL: vi.fn().mockReturnValue('data:image/png;base64,x'),
        };
        return canvasObj;
      }
      if (tag === 'a') {
        return { download: '', href: '', click: vi.fn() };
      }
      return {};
    });

    vi.stubGlobal('document', { createElement });

    const container = {
      querySelectorAll: vi.fn().mockReturnValue([
        { width: 1600, height: 900 },
        { width: 1600, height: 900 },
      ]),
    } as unknown as HTMLElement;

    const { exportChartToPNG } = await import('../src/core/screenshot');
    exportChartToPNG(container);

    // The export canvas should have been sized to match the first canvas
    expect(canvasObj.width).toBe(1600);
    expect(canvasObj.height).toBe(900);
  });
});
