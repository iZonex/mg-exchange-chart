// ── React Usage Example ──────────────────────────────────────────────────────
//
// This example shows how to use @exchange/charts with React, including:
//   - Basic chart setup with ChartContainer
//   - Adding/removing indicators
//   - Handling chart events (crosshair, click, range change)
//   - Theme switching (dark/light)
//   - Imperative chart access via ref
//   - Symbol and timeframe switching

import { useState, useRef, useCallback, useMemo } from 'react';
import { ChartContainer } from '../src/react/ChartContainer';
import type { ChartContainerRef } from '../src/react/ChartContainer';
import type { Datafeed, Bar, Indicator, Timeframe, ChartType } from '../src/api/types';
import type { ChartEventMap } from '../src/core/events';

// Import built-in indicators (or use your own custom ones)
import { sma } from '../src/indicators/overlays/sma';
import { ema } from '../src/indicators/overlays/ema';
import { bollingerBands } from '../src/indicators/overlays/bollinger';
import { rsi } from '../src/indicators/oscillators/rsi';
import { macd } from '../src/indicators/oscillators/macd';

// ── Mock Datafeed ───────────────────────────────────────────────────────────
// In production, replace this with your real datafeed implementation.
// See examples/custom-datafeed.ts for a complete REST + WebSocket example.

const mockDatafeed: Datafeed = {
  async getBars({ symbol, timeframe, from, to, limit }) {
    // Generate mock OHLCV data for demonstration
    const bars: Bar[] = [];
    const interval = timeframe === '1D' ? 86400 : timeframe === '1H' ? 3600 : 60;
    let time = from;
    let price = 50000;

    while (time < to && bars.length < limit) {
      const change = (Math.random() - 0.48) * price * 0.02;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * price * 0.005;
      const low = Math.min(open, close) - Math.random() * price * 0.005;
      const volume = Math.random() * 100;

      bars.push({ time, open, high, low, close, volume });
      price = close;
      time += interval;
    }
    return bars;
  },

  subscribe({ onTick }) {
    // Simulate real-time ticks every second
    const id = setInterval(() => {
      onTick({
        time: Math.floor(Date.now() / 1000),
        price: 50000 + (Math.random() - 0.5) * 1000,
        volume: Math.random() * 10,
      });
    }, 1000);

    // Return unsubscribe function
    return () => clearInterval(id);
  },

  async searchSymbols(query) {
    // Return mock symbols
    return [
      { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', exchange: 'Demo', type: 'spot', pricePrecision: 2, qtyPrecision: 6, minMove: 0.01 },
      { symbol: 'ETHUSDT', name: 'Ethereum / USDT', exchange: 'Demo', type: 'spot', pricePrecision: 2, qtyPrecision: 4, minMove: 0.01 },
    ].filter(s => s.symbol.includes(query.toUpperCase()));
  },
};

// ── Indicator Presets ───────────────────────────────────────────────────────
// Define indicator configurations you want to toggle on/off.

interface IndicatorPreset {
  id: string;
  label: string;
  indicator: Indicator;
  params?: Record<string, number | string | boolean>;
}

const AVAILABLE_INDICATORS: IndicatorPreset[] = [
  { id: 'sma20', label: 'SMA(20)', indicator: sma, params: { period: 20 } },
  { id: 'sma50', label: 'SMA(50)', indicator: sma, params: { period: 50, color: '#FF9800' } },
  { id: 'ema12', label: 'EMA(12)', indicator: ema, params: { period: 12 } },
  { id: 'bb', label: 'Bollinger Bands', indicator: bollingerBands, params: { period: 20, stdDev: 2 } },
  { id: 'rsi', label: 'RSI(14)', indicator: rsi, params: { period: 14 } },
  { id: 'macd', label: 'MACD', indicator: macd },
];

// ── Main Component ──────────────────────────────────────────────────────────

export function TradingChart() {
  // ── State ─────────────────────────────────────────────────────────────
  const chartRef = useRef<ChartContainerRef>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(new Set(['sma20', 'rsi']));
  const [crosshairData, setCrosshairData] = useState<ChartEventMap['crosshairMove'] | null>(null);

  // ── Compute active indicator configs ──────────────────────────────────
  // useMemo prevents unnecessary re-renders when indicator set hasn't changed.
  const indicators = useMemo(() => {
    return AVAILABLE_INDICATORS
      .filter(preset => activeIndicators.has(preset.id))
      .map(preset => ({
        indicator: preset.indicator,
        params: preset.params,
      }));
  }, [activeIndicators]);

  // ── Event Handlers ────────────────────────────────────────────────────

  const handleCrosshairMove = useCallback((data: ChartEventMap['crosshairMove']) => {
    setCrosshairData(data);
  }, []);

  const handleClick = useCallback((data: ChartEventMap['click']) => {
    console.log('[chart] Clicked at:', data.time, data.price);
  }, []);

  const handleVisibleRangeChange = useCallback((range: ChartEventMap['visibleRangeChange']) => {
    // Useful for syncing multiple charts or tracking visible range
    console.log('[chart] Visible range:', new Date(range.from * 1000), '-', new Date(range.to * 1000));
  }, []);

  // ── Indicator Toggle ──────────────────────────────────────────────────

  const toggleIndicator = (id: string) => {
    setActiveIndicators(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Imperative Chart Access ───────────────────────────────────────────
  // For operations not covered by props (e.g., screenshots, drawing tools).

  const takeScreenshot = () => {
    const chart = chartRef.current?.getChart();
    if (chart) {
      // chart.exportToPNG() — if the method exists
      console.log('[chart] Screenshot requested. Chart instance:', chart);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: theme === 'dark' ? '#1e222d' : '#ffffff' }}>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, padding: 8, flexWrap: 'wrap', borderBottom: '1px solid #363a45' }}>

        {/* Symbol selector */}
        <select value={symbol} onChange={e => setSymbol(e.target.value)}>
          <option value="BTCUSDT">BTCUSDT</option>
          <option value="ETHUSDT">ETHUSDT</option>
          <option value="SOLUSDT">SOLUSDT</option>
        </select>

        {/* Timeframe buttons */}
        {(['1m', '5m', '15m', '1H', '4H', '1D'] as Timeframe[]).map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            style={{
              fontWeight: timeframe === tf ? 'bold' : 'normal',
              background: timeframe === tf ? '#2962ff' : 'transparent',
              color: timeframe === tf ? '#fff' : '#787b86',
              border: 'none',
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            {tf}
          </button>
        ))}

        {/* Chart type */}
        <select value={chartType} onChange={e => setChartType(e.target.value as ChartType)}>
          <option value="candlestick">Candlestick</option>
          <option value="heikin_ashi">Heikin Ashi</option>
          <option value="line">Line</option>
          <option value="area">Area</option>
          <option value="bar">Bar</option>
        </select>

        {/* Theme toggle */}
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? 'Light' : 'Dark'} Theme
        </button>

        {/* Screenshot */}
        <button onClick={takeScreenshot}>Screenshot</button>
      </div>

      {/* ── Indicator toggles ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, padding: '4px 8px', borderBottom: '1px solid #363a45' }}>
        {AVAILABLE_INDICATORS.map(preset => (
          <label key={preset.id} style={{ color: '#787b86', fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={activeIndicators.has(preset.id)}
              onChange={() => toggleIndicator(preset.id)}
            />
            {preset.label}
          </label>
        ))}
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────── */}
      <ChartContainer
        ref={chartRef}
        options={{
          symbol,
          timeframe,
          datafeed: mockDatafeed,
          pricePrecision: 2,
          features: {
            crosshair: true,
            tooltip: true,
            drawings: true,
            indicators: true,
            volume: true,
            grid: true,
            bidAskLine: false,
          },
        }}
        symbol={symbol}
        timeframe={timeframe}
        chartType={chartType}
        theme={theme}
        indicators={indicators}
        onCrosshairMove={handleCrosshairMove}
        onClick={handleClick}
        onVisibleRangeChange={handleVisibleRangeChange}
        style={{ flex: 1 }}
      />

      {/* ── Crosshair Info Panel ───────────────────────────────────────── */}
      {crosshairData?.bar && (
        <div style={{
          display: 'flex', gap: 16, padding: '4px 8px',
          color: '#787b86', fontSize: 12, borderTop: '1px solid #363a45',
        }}>
          <span>O: {crosshairData.bar.open.toFixed(2)}</span>
          <span>H: {crosshairData.bar.high.toFixed(2)}</span>
          <span>L: {crosshairData.bar.low.toFixed(2)}</span>
          <span>C: {crosshairData.bar.close.toFixed(2)}</span>
          <span>V: {crosshairData.bar.volume.toFixed(4)}</span>
        </div>
      )}
    </div>
  );
}

// ── Minimal Mount Example ───────────────────────────────────────────────────
//
// In your app's entry point (e.g., main.tsx):
//
// import { createRoot } from 'react-dom/client';
// import { TradingChart } from './examples/react-usage';
//
// createRoot(document.getElementById('root')!).render(<TradingChart />);
