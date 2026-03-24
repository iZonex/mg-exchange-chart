import { vi } from 'vitest';
import type { Bar, Theme, DrawingOptions } from '../../src/api/types';
import type { PriceScale } from '../../src/core/renderer/price-axis';
import type { TimeScale } from '../../src/core/renderer/time-axis';

/** Create a mock CanvasRenderingContext2D with all methods as vi.fn() */
export function mockCtx(): CanvasRenderingContext2D {
  return {
    // Drawing methods
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    arc: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    roundRect: vi.fn(),
    drawImage: vi.fn(),
    putImageData: vi.fn(),
    getImageData: vi.fn(),
    clearRect: vi.fn(),

    // Style properties
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    globalAlpha: 1,
    lineDashOffset: 0,
    lineJoin: 'round',
    lineCap: 'round',
    shadowColor: '',
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D;
}

/** Generate an array of test bars */
export function makeBars(count: number): Bar[] {
  return Array.from({ length: count }, (_, i) => ({
    time: 1000 + i * 60,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 102 + i,
    volume: 1000 + i * 10,
  }));
}

/** Create a mock TimeScale */
export function makeTimeScale(barSpacing = 10): TimeScale {
  return {
    barSpacing,
    firstIndex: 0,
    visibleCount: 100,
    offsetX: 0,
  } as TimeScale;
}

/** Create a mock PriceScale */
export function makePriceScale(min = 90, max = 210): PriceScale {
  return {
    min,
    max,
    mode: 'linear',
  } as PriceScale;
}

/** Create a complete test Theme */
export function makeTheme(): Theme {
  return {
    name: 'test',
    bg: '#000',
    gridLine: '#333',
    borderColor: '#444',
    textPrimary: '#fff',
    textSecondary: '#aaa',
    textMuted: '#666',
    crosshairLine: '#fff',
    crosshairLabel: '#333',
    crosshairLabelText: '#fff',
    bullCandle: '#26a69a',
    bullCandleWick: '#26a69a',
    bearCandle: '#ef5350',
    bearCandleWick: '#ef5350',
    volumeBull: '#26a69a80',
    volumeBear: '#ef535080',
    lineDefault: '#2196f3',
    selectionHighlight: '#1e88e5',
    tooltipBg: '#222',
    tooltipBorder: '#444',
    tooltipText: '#fff',
    tpColor: '#26a69a',
    slColor: '#ef5350',
    limitOrderColor: '#2962FF',
    stopOrderColor: '#FF9800',
    entryColor: '#2962FF',
    breakevenColor: '#848e9c',
    liquidationColor: '#ef5350',
    badgeText: '#ffffff',
  };
}

/** Create default DrawingOptions */
export function makeDrawingOptions(): DrawingOptions {
  return {
    color: '#2196f3',
    lineWidth: 1,
    lineStyle: 'solid',
  };
}
