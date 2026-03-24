// ── ChartContainer ──────────────────────────────────────────────────────────
// React component that wraps the Chart class. Handles lifecycle,
// resize, theme sync, and cleanup on unmount.

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Chart } from '../core/chart';
import type { ChartOptions, Indicator, ChartType, Theme } from '../api/types';
import type { ChartEventMap } from '../core/events';

export interface ChartContainerProps {
  /** Chart configuration (required on first render, updates ignored) */
  options: Omit<ChartOptions, 'container'>;
  /** Chart width — defaults to 100% */
  width?: string | number;
  /** Chart height — defaults to 100% */
  height?: string | number;
  /** CSS class name */
  className?: string;
  /** CSS inline styles */
  style?: React.CSSProperties;
  /** Symbol override (reactive) */
  symbol?: string;
  /** Timeframe override (reactive) */
  timeframe?: string;
  /** Chart type override */
  chartType?: ChartType;
  /** Theme override */
  theme?: 'dark' | 'light' | Theme;
  /** Indicators to display */
  indicators?: Array<{ indicator: Indicator; params?: Record<string, number | string | boolean> }>;
  /** Event handlers */
  onCrosshairMove?: (data: ChartEventMap['crosshairMove']) => void;
  onClick?: (data: ChartEventMap['click']) => void;
  onVisibleRangeChange?: (data: ChartEventMap['visibleRangeChange']) => void;
}

export interface ChartContainerRef {
  /** Get the underlying Chart instance */
  getChart(): Chart | null;
}

export const ChartContainer = forwardRef<ChartContainerRef, ChartContainerProps>(
  function ChartContainer(props, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const indicatorIdsRef = useRef<string[]>([]);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      getChart: () => chartRef.current,
    }), []);

    // Initialize chart
    useEffect(() => {
      if (!containerRef.current) return;

      const chart = new Chart({
        ...props.options,
        container: containerRef.current,
      });

      chartRef.current = chart;

      return () => {
        chart.destroy();
        chartRef.current = null;
        indicatorIdsRef.current = [];
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only init once

    // Sync symbol
    useEffect(() => {
      if (chartRef.current && props.symbol) {
        chartRef.current.setSymbol(props.symbol);
      }
    }, [props.symbol]);

    // Sync timeframe
    useEffect(() => {
      if (chartRef.current && props.timeframe) {
        chartRef.current.setTimeframe(props.timeframe as any);
      }
    }, [props.timeframe]);

    // Sync chart type
    useEffect(() => {
      if (chartRef.current && props.chartType) {
        chartRef.current.setChartType(props.chartType);
      }
    }, [props.chartType]);

    // Sync theme
    useEffect(() => {
      if (chartRef.current && props.theme) {
        chartRef.current.setTheme(props.theme);
      }
    }, [props.theme]);

    // Sync indicators
    useEffect(() => {
      const chart = chartRef.current;
      if (!chart) return;

      // Remove old indicators
      for (const id of indicatorIdsRef.current) {
        chart.removeIndicator(id);
      }

      // Add new indicators
      const newIds: string[] = [];
      if (props.indicators) {
        for (const { indicator, params } of props.indicators) {
          newIds.push(chart.addIndicator(indicator, params));
        }
      }
      indicatorIdsRef.current = newIds;
    }, [props.indicators]);

    // Sync event handlers
    useEffect(() => {
      const chart = chartRef.current;
      if (!chart) return;

      if (props.onCrosshairMove) chart.on('crosshairMove', props.onCrosshairMove);
      if (props.onClick) chart.on('click', props.onClick);
      if (props.onVisibleRangeChange) chart.on('visibleRangeChange', props.onVisibleRangeChange);

      return () => {
        if (props.onCrosshairMove) chart.off('crosshairMove', props.onCrosshairMove);
        if (props.onClick) chart.off('click', props.onClick);
        if (props.onVisibleRangeChange) chart.off('visibleRangeChange', props.onVisibleRangeChange);
      };
    }, [props.onCrosshairMove, props.onClick, props.onVisibleRangeChange]);

    return (
      <div
        ref={containerRef}
        className={props.className}
        style={{
          width: props.width ?? '100%',
          height: props.height ?? '100%',
          position: 'relative',
          ...props.style,
        }}
      />
    );
  },
);
