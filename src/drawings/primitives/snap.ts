// ── Snap ────────────────────────────────────────────────────────────────────
// Snap-to-OHLC logic. When user creates/edits a drawing near a bar's
// OHLC values, snap the point to the nearest OHLC level.

import type { Bar } from '../../api/types';

export interface SnapResult {
  price: number;
  time: number;
  snapped: boolean;
  snapType?: 'open' | 'high' | 'low' | 'close';
}

const SNAP_THRESHOLD_PX = 10;

/**
 * Snap a price to the nearest OHLC value of a bar, if within threshold.
 * @param price - The price to snap
 * @param bar - The bar to snap to
 * @param priceToY - Function to convert price to Y pixel
 * @param mouseY - Current mouse Y pixel
 */
export function snapToOHLC(
  price: number,
  bar: Bar,
  priceToY: (p: number) => number,
  mouseY: number,
): SnapResult {
  const levels: { price: number; type: 'open' | 'high' | 'low' | 'close' }[] = [
    { price: bar.open, type: 'open' },
    { price: bar.high, type: 'high' },
    { price: bar.low, type: 'low' },
    { price: bar.close, type: 'close' },
  ];

  let best: typeof levels[0] | null = null;
  let bestDist = Infinity;

  for (const level of levels) {
    const levelY = priceToY(level.price);
    const dist = Math.abs(levelY - mouseY);
    if (dist < bestDist) {
      bestDist = dist;
      best = level;
    }
  }

  if (best && bestDist <= SNAP_THRESHOLD_PX) {
    return { price: best.price, time: bar.time, snapped: true, snapType: best.type };
  }

  return { price, time: bar.time, snapped: false };
}
