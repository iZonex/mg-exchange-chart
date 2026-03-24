import { describe, it, expect } from 'vitest';
import type { ChartState, ChartStateIndicator, ChartFeatures } from '../src/api/types';

describe('ChartState type', () => {
  it('accepts a full state object', () => {
    const state: ChartState = {
      chartType: 'candlestick',
      theme: 'dark',
      priceScaleMode: 'linear',
      features: {
        volume: true,
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
      },
      magnetMode: true,
      stayInDrawingMode: false,
      volumeProfile: false,
      indicators: [
        { name: 'SMA', params: { period: 20 } },
        { name: 'RSI', params: { period: 14 } },
      ],
      drawings: [],
      compareSymbols: [],
    };
    expect(state.chartType).toBe('candlestick');
    expect(state.indicators).toHaveLength(2);
  });

  it('accepts custom theme object', () => {
    const state: Partial<ChartState> = {
      theme: {
        name: 'custom',
        bg: '#111',
        gridLine: '#222',
        borderColor: '#333',
        textPrimary: '#fff',
        textSecondary: '#aaa',
        textMuted: '#666',
        crosshairLine: '#fff',
        crosshairLabel: '#333',
        crosshairLabelText: '#fff',
        bullCandle: '#0f0',
        bullCandleWick: '#0f0',
        bearCandle: '#f00',
        bearCandleWick: '#f00',
        volumeBull: '#0f08',
        volumeBear: '#f008',
        lineDefault: '#0ff',
        selectionHighlight: '#00f',
        tooltipBg: '#222',
        tooltipBorder: '#333',
        tooltipText: '#fff',
      },
    };
    expect(typeof state.theme).toBe('object');
  });

  it('accepts partial state', () => {
    const partial: Partial<ChartState> = {
      magnetMode: false,
    };
    expect(partial.magnetMode).toBe(false);
    expect(partial.chartType).toBeUndefined();
  });

  it('serializes to JSON and back', () => {
    const state: ChartState = {
      chartType: 'heikin_ashi',
      theme: 'colorblind-dark',
      priceScaleMode: 'logarithmic',
      features: { volume: false, watermark: false },
      magnetMode: false,
      stayInDrawingMode: true,
      volumeProfile: true,
      indicators: [
        { name: 'Bollinger Bands', params: { period: 20, stdDev: 2 } },
      ],
      drawings: [{ tool: 'trend-line', points: [{ price: 100, time: 1000 }] }],
      compareSymbols: ['ETHUSDT'],
    };
    const json = JSON.stringify(state);
    const restored = JSON.parse(json) as ChartState;
    expect(restored.chartType).toBe('heikin_ashi');
    expect(restored.theme).toBe('colorblind-dark');
    expect(restored.indicators[0]!.name).toBe('Bollinger Bands');
    expect(restored.compareSymbols).toEqual(['ETHUSDT']);
  });
});

describe('ChartStateIndicator type', () => {
  it('accepts indicator with params', () => {
    const ind: ChartStateIndicator = {
      name: 'MACD',
      params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    };
    expect(ind.name).toBe('MACD');
    expect(ind.params.fastPeriod).toBe(12);
  });
});
