// ── useChart Hook ───────────────────────────────────────────────────────────
// Provides imperative access to the Chart instance from a ChartContainer ref.

import { useRef, useCallback } from 'react';
import type { Chart } from '../core/chart';
import type { ChartContainerRef } from './ChartContainer';

export function useChart() {
  const ref = useRef<ChartContainerRef>(null);

  const getChart = useCallback((): Chart | null => {
    return ref.current?.getChart() ?? null;
  }, []);

  return { ref, getChart };
}
