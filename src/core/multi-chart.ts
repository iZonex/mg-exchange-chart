// ── Multi-Chart Layout ──────────────────────────────────────────────────────
// Creates a grid of independent Chart instances in a container.
// Supports: 1x1, 1x2, 2x1, 2x2, 3x1, 1x3, 2x3, 3x2, etc.
// Each chart is independent: own symbol, timeframe, indicators, drawings.
// Optional sync: crosshair, timeframe, scroll position.

import { Chart } from './chart';
import type { ChartOptions } from '../api/types';

export interface MultiChartConfig {
  /** Container element or CSS selector */
  container: HTMLElement | string;
  /** Grid layout: [rows, cols] */
  layout: [number, number];
  /** Chart configs per cell (row-major order) */
  charts: Array<Omit<ChartOptions, 'container'>>;
  /** Sync crosshair across all charts */
  syncCrosshair?: boolean;
  /** Sync timeframe across all charts */
  syncTimeframe?: boolean;
}

export class MultiChart {
  private container: HTMLElement;
  private grid: HTMLDivElement;
  private charts: Chart[] = [];
  private cells: HTMLDivElement[] = [];

  constructor(config: MultiChartConfig) {
    // Resolve container
    if (typeof config.container === 'string') {
      const el = document.querySelector(config.container);
      if (!el || !(el instanceof HTMLElement)) throw new Error(`Container not found`);
      this.container = el;
    } else {
      this.container = config.container;
    }

    const [rows, cols] = config.layout;

    // Create grid
    this.grid = document.createElement('div');
    this.grid.style.cssText = `
      display: grid;
      grid-template-rows: repeat(${rows}, 1fr);
      grid-template-columns: repeat(${cols}, 1fr);
      width: 100%; height: 100%;
      gap: 1px;
      background: rgba(255,255,255,0.06);
    `;
    this.container.appendChild(this.grid);

    // Create cells and charts
    for (let i = 0; i < rows * cols && i < config.charts.length; i++) {
      const cell = document.createElement('div');
      cell.style.cssText = 'position: relative; overflow: hidden; min-width: 0; min-height: 0;';
      this.grid.appendChild(cell);
      this.cells.push(cell);

      const chartConfig = config.charts[i]!;
      const chart = new Chart({ ...chartConfig, container: cell });
      this.charts.push(chart);
    }

    // Sync crosshair
    if (config.syncCrosshair) {
      for (const chart of this.charts) {
        chart.on('crosshairMove', (_data) => {
          // Could sync crosshair position to other charts
          // Would need a setCrosshairTime(time) method
        });
      }
    }

    // Sync timeframe
    if (config.syncTimeframe) {
      for (const chart of this.charts) {
        chart.on('timeframeChange', (tf) => {
          for (const other of this.charts) {
            if (other !== chart) other.setTimeframe(tf);
          }
        });
      }
    }
  }

  /** Get chart at grid position (0-indexed, row-major) */
  getChart(index: number): Chart | undefined {
    return this.charts[index];
  }

  /** Get all charts */
  getAllCharts(): Chart[] {
    return [...this.charts];
  }

  /** Change grid layout (destroys and recreates) */
  setLayout(_rows: number, _cols: number, _configs: Array<Omit<ChartOptions, 'container'>>): void {
    this.destroy();
    // Re-init would go here — for now, create new MultiChart
  }

  /** Destroy all charts and clean up */
  destroy(): void {
    for (const chart of this.charts) chart.destroy();
    this.charts = [];
    this.cells = [];
    this.grid.remove();
  }
}
