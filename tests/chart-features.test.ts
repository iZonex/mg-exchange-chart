import { describe, it, expect } from 'vitest';
import type { ChartFeatures } from '../src/api/types';

describe('ChartFeatures interface', () => {
  it('accepts all feature fields', () => {
    const features: Partial<ChartFeatures> = {
      crosshair: true,
      tooltip: true,
      drawings: true,
      indicators: true,
      volume: true,
      grid: true,
      bidAskLine: false,
      gridVertical: true,
      gridHorizontal: true,
      countdown: true,
      highLow: false,
      priceLine: true,
      sessionBreaks: false,
      watermark: true,
      ohlcvLegend: true,
      overlayLegend: true,
      indicatorLegend: true,
      barChange: true,
    };
    expect(features.gridVertical).toBe(true);
    expect(features.highLow).toBe(false);
    expect(features.watermark).toBe(true);
    expect(features.countdown).toBe(true);
    expect(features.sessionBreaks).toBe(false);
  });

  it('allows partial feature sets', () => {
    const partial: Partial<ChartFeatures> = { volume: false };
    expect(partial.volume).toBe(false);
    expect(partial.countdown).toBeUndefined();
  });
});
