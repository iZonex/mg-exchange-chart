// ── Custom Indicator Example: Donchian Channel ──────────────────────────────
//
// This example shows how to implement the Indicator interface to create a
// custom technical indicator. We implement the Donchian Channel, which
// plots the highest high and lowest low over the last N bars.
//
// The Indicator interface requires:
//   - name, shortName, description — metadata
//   - overlay: boolean — true = draw on price chart, false = separate pane
//   - params — user-configurable parameters
//   - plots — how to render the output (line, histogram, band, dots, columns)
//   - calculate(bars, params) — the computation logic

import type { Bar, Indicator, IndicatorOutput, IndicatorParam, PlotConfig } from '../src/api/types';

// ── Donchian Channel ────────────────────────────────────────────────────────
//
// The Donchian Channel is an overlay indicator (drawn on the price chart).
// It has 3 lines:
//   - Upper: highest high of the last `period` bars
//   - Lower: lowest low of the last `period` bars
//   - Middle: (upper + lower) / 2
// Plus a filled band between upper and lower.

export const donchianChannel: Indicator = {
  // ── Metadata ──────────────────────────────────────────────────────────

  name: 'Donchian Channel',
  shortName: 'DC',
  description: 'Donchian Channel — highest high and lowest low over N bars',

  // overlay: true means this renders on the main price chart,
  // not in a separate pane like RSI or MACD.
  overlay: true,

  // ── Parameters ────────────────────────────────────────────────────────
  // These show up in the indicator settings panel. Users can change them.

  params: [
    {
      name: 'period',
      type: 'number',
      default: 20,
      min: 1,
      max: 500,
      step: 1,
    },
    {
      name: 'upperColor',
      type: 'color',
      default: '#26a69a',  // green
    },
    {
      name: 'lowerColor',
      type: 'color',
      default: '#ef5350',  // red
    },
    {
      name: 'middleColor',
      type: 'color',
      default: '#787b86',  // gray
    },
    {
      name: 'showMiddle',
      type: 'boolean',
      default: true,
    },
  ] satisfies IndicatorParam[],

  // ── Plot Configuration ────────────────────────────────────────────────
  // Defines how each output key is rendered on the chart.
  //
  // Plot types:
  //   'line'      — continuous line
  //   'histogram' — vertical bars from zero line
  //   'band'      — filled area between two keys (use bandPairKey)
  //   'dots'      — discrete dots
  //   'columns'   — fixed-width columns

  plots: [
    // The band fill between upper and lower (render first so lines draw on top)
    {
      key: 'upper',
      type: 'band',
      color: '#26a69a',
      bandPairKey: 'lower', // fills between 'upper' and 'lower'
    },
    // Upper channel line
    {
      key: 'upper',
      type: 'line',
      color: '#26a69a',
      lineWidth: 1,
    },
    // Lower channel line
    {
      key: 'lower',
      type: 'line',
      color: '#ef5350',
      lineWidth: 1,
    },
    // Middle line (optional, controlled by showMiddle param)
    {
      key: 'middle',
      type: 'line',
      color: '#787b86',
      lineWidth: 1,
    },
  ] satisfies PlotConfig[],

  // ── Calculation ───────────────────────────────────────────────────────
  //
  // This is the core of the indicator. It receives:
  //   - bars: full OHLCV history array, sorted by time ascending
  //   - params: current parameter values (from the settings panel)
  //
  // It must return an array of IndicatorOutput objects, one per bar,
  // where each output.values maps plot keys to numeric values.
  // Use `undefined` for values that don't exist yet (e.g., before
  // enough bars have accumulated for the lookback period).

  calculate(bars: Bar[], params: Record<string, number | string | boolean>): IndicatorOutput[] {
    const period = params.period as number;
    const showMiddle = params.showMiddle as boolean;
    const outputs: IndicatorOutput[] = [];

    for (let i = 0; i < bars.length; i++) {
      // Not enough bars yet for the full lookback period
      if (i < period - 1) {
        outputs.push({
          time: bars[i]!.time,
          values: { upper: undefined, lower: undefined, middle: undefined },
        });
        continue;
      }

      // Find highest high and lowest low in the lookback window
      let highestHigh = -Infinity;
      let lowestLow = Infinity;

      for (let j = i - period + 1; j <= i; j++) {
        const bar = bars[j]!;
        if (bar.high > highestHigh) highestHigh = bar.high;
        if (bar.low < lowestLow) lowestLow = bar.low;
      }

      const middle = showMiddle ? (highestHigh + lowestLow) / 2 : undefined;

      outputs.push({
        time: bars[i]!.time,
        values: {
          upper: highestHigh,
          lower: lowestLow,
          middle,
        },
      });
    }

    return outputs;
  },
};

// ── Another Example: Custom Oscillator (Rate of Change) ─────────────────────
//
// This demonstrates an oscillator (overlay: false) that renders in its own pane.

export const customROC: Indicator = {
  name: 'Custom ROC',
  shortName: 'ROC',
  description: 'Rate of Change — percentage change over N bars',

  // overlay: false means this gets its own pane below the price chart
  overlay: false,

  params: [
    { name: 'period', type: 'number', default: 12, min: 1, max: 200, step: 1 },
    { name: 'color', type: 'color', default: '#2196F3' },
  ],

  plots: [
    { key: 'roc', type: 'line', color: '#2196F3', lineWidth: 1.5 },
    // A zero line for reference (rendered as a thin histogram at 0)
    { key: 'zero', type: 'line', color: '#787b86', lineWidth: 0.5 },
  ],

  calculate(bars: Bar[], params): IndicatorOutput[] {
    const period = params.period as number;
    const outputs: IndicatorOutput[] = [];

    for (let i = 0; i < bars.length; i++) {
      if (i < period) {
        outputs.push({
          time: bars[i]!.time,
          values: { roc: undefined, zero: 0 },
        });
        continue;
      }

      const prevClose = bars[i - period]!.close;
      const roc = prevClose !== 0 ? ((bars[i]!.close - prevClose) / prevClose) * 100 : 0;

      outputs.push({
        time: bars[i]!.time,
        values: { roc, zero: 0 },
      });
    }

    return outputs;
  },
};

// ── Usage Example ───────────────────────────────────────────────────────────
//
// import { Chart } from '@mg-exchange/charts';
// import { donchianChannel, customROC } from './custom-indicator';
//
// const chart = new Chart({ ... });
//
// // Add Donchian Channel as an overlay on the price chart
// const dcId = chart.addIndicator(donchianChannel, { period: 20 });
//
// // Add custom ROC in a separate pane below the price chart
// const rocId = chart.addIndicator(customROC, { period: 14 });
//
// // Later, remove an indicator:
// chart.removeIndicator(dcId);
