// ── Hit Test ────────────────────────────────────────────────────────────────
// Geometric utilities for detecting clicks on drawing elements.
// All inputs/outputs in pixel coordinates.

export interface PixelPoint {
  x: number;
  y: number;
}

/** Distance from point to a line segment (p1→p2) */
export function pointToSegmentDist(p: PixelPoint, p1: PixelPoint, p2: PixelPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return pointDist(p, p1);

  // Project point onto line, clamp to segment
  let t = ((p.x - p1.x) * dx + (p.y - p1.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const proj = { x: p1.x + t * dx, y: p1.y + t * dy };
  return pointDist(p, proj);
}

/** Distance from point to an infinite line through p1 and p2 */
export function pointToLineDist(p: PixelPoint, p1: PixelPoint, p2: PixelPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return pointDist(p, p1);

  const dist = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / Math.sqrt(lenSq);
  return dist;
}

/** Distance from point to a horizontal line at yLevel */
export function pointToHorizontalLineDist(p: PixelPoint, yLevel: number): number {
  return Math.abs(p.y - yLevel);
}

/** Check if point is inside a rectangle defined by two corners */
export function pointInRect(p: PixelPoint, corner1: PixelPoint, corner2: PixelPoint, threshold: number): boolean {
  const minX = Math.min(corner1.x, corner2.x) - threshold;
  const maxX = Math.max(corner1.x, corner2.x) + threshold;
  const minY = Math.min(corner1.y, corner2.y) - threshold;
  const maxY = Math.max(corner1.y, corner2.y) + threshold;
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

/** Distance from point to a rectangle's border */
export function pointToRectBorderDist(p: PixelPoint, corner1: PixelPoint, corner2: PixelPoint): number {
  const left = Math.min(corner1.x, corner2.x);
  const right = Math.max(corner1.x, corner2.x);
  const top = Math.min(corner1.y, corner2.y);
  const bottom = Math.max(corner1.y, corner2.y);

  // Distance to each edge
  const dTop = pointToSegmentDist(p, { x: left, y: top }, { x: right, y: top });
  const dBottom = pointToSegmentDist(p, { x: left, y: bottom }, { x: right, y: bottom });
  const dLeft = pointToSegmentDist(p, { x: left, y: top }, { x: left, y: bottom });
  const dRight = pointToSegmentDist(p, { x: right, y: top }, { x: right, y: bottom });

  return Math.min(dTop, dBottom, dLeft, dRight);
}

/** Euclidean distance between two points */
export function pointDist(a: PixelPoint, b: PixelPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
