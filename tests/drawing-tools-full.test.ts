import { describe, it, expect } from 'vitest';

// Import ALL 52 drawing tools
import { horizontalLineTool } from '../src/drawings/tools/horizontal-line';
import { trendLineTool } from '../src/drawings/tools/trend-line';
import { rectangleTool } from '../src/drawings/tools/rectangle';
import { fibRetracementTool } from '../src/drawings/tools/fib-retracement';
import { textAnnotationTool } from '../src/drawings/tools/text-annotation';
import { rayTool } from '../src/drawings/tools/ray';
import { fibExtensionTool } from '../src/drawings/tools/fib-extension';
import { longShortTool } from '../src/drawings/tools/long-short';
import { priceRangeTool } from '../src/drawings/tools/price-range';
import { arrowTool } from '../src/drawings/tools/arrow';
import { calloutTool } from '../src/drawings/tools/callout';
import { parallelChannelTool } from '../src/drawings/tools/parallel-channel';
import { brushTool } from '../src/drawings/tools/brush';
import { ellipseTool } from '../src/drawings/tools/ellipse';
import { verticalLineTool } from '../src/drawings/tools/vertical-line';
import { crossLineTool } from '../src/drawings/tools/cross-line';
import { extendedLineTool } from '../src/drawings/tools/extended-line';
import { polylineTool } from '../src/drawings/tools/polyline';
import { pitchforkTool } from '../src/drawings/tools/pitchfork';
import { gannFanTool } from '../src/drawings/tools/gann-fan';
import { gannBoxTool } from '../src/drawings/tools/gann-box';
import { triangleTool } from '../src/drawings/tools/triangle';
import { xabcdPatternTool } from '../src/drawings/tools/xabcd-pattern';
import { headShouldersTool } from '../src/drawings/tools/head-shoulders';
import { regressionChannelTool } from '../src/drawings/tools/regression-channel';
import { flagMarkerTool } from '../src/drawings/tools/flag-marker';
import { elliottImpulseTool, elliottCorrectionTool, elliottTriangleTool } from '../src/drawings/tools/elliott-wave';
import { fibChannelTool } from '../src/drawings/tools/fib-channel';
import { fibCirclesTool } from '../src/drawings/tools/fib-circles';
import { dateRangeTool } from '../src/drawings/tools/date-range';
import { forecastTool } from '../src/drawings/tools/forecast';
import { fibTimeZoneTool } from '../src/drawings/tools/fib-timezone';
import { fibArcsTool } from '../src/drawings/tools/fib-arcs';
import { fibWedgeTool } from '../src/drawings/tools/fib-wedge';
import { gannSquareTool } from '../src/drawings/tools/gann-square';
import { cyclicLinesTool } from '../src/drawings/tools/cyclic-lines';
import { sineLineTool } from '../src/drawings/tools/sine-line';
import { abcdPatternTool } from '../src/drawings/tools/abcd-pattern';
import { infoLineTool } from '../src/drawings/tools/info-line';
import { fibSpiralTool } from '../src/drawings/tools/fib-spiral';
import { fibSpeedFanTool } from '../src/drawings/tools/fib-speed-fan';
import { threeDrivesTool } from '../src/drawings/tools/three-drives';
import { noteTool } from '../src/drawings/tools/note';
import { arcTool } from '../src/drawings/tools/arc';
import { fixedRangeVPTool } from '../src/drawings/tools/fixed-range-vp';
import { horizontalRayTool } from '../src/drawings/tools/horizontal-ray';
import { trendAngleTool } from '../src/drawings/tools/trend-angle';
import { datePriceRangeTool } from '../src/drawings/tools/date-price-range';
import { schiffPitchforkTool } from '../src/drawings/tools/schiff-pitchfork';
import { anchoredVwapTool } from '../src/drawings/tools/anchored-vwap';
import { flatTopBottomTool } from '../src/drawings/tools/flat-top-bottom';
import { disjointChannelTool } from '../src/drawings/tools/disjoint-channel';
import { modifiedSchiffPitchforkTool } from '../src/drawings/tools/modified-schiff-pitchfork';
import { insidePitchforkTool } from '../src/drawings/tools/inside-pitchfork';
import { trendFibExtensionTool } from '../src/drawings/tools/trend-fib-extension';
import { trendFibTimeTool } from '../src/drawings/tools/trend-fib-time';
import { cypherPatternTool } from '../src/drawings/tools/cypher-pattern';
import { elliottDoubleComboTool } from '../src/drawings/tools/elliott-double-combo';
import { elliottTripleComboTool } from '../src/drawings/tools/elliott-triple-combo';
import { gannSquareFixedTool } from '../src/drawings/tools/gann-square-fixed';
import { timeCyclesTool } from '../src/drawings/tools/time-cycles';
import { barsPatternTool } from '../src/drawings/tools/bars-pattern';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate test points based on pointCount */
function pointsForCount(n: number): { x: number; y: number }[] {
  const pool = [
    { x: 30, y: 150 },
    { x: 80, y: 40 },
    { x: 130, y: 120 },
    { x: 180, y: 30 },
    { x: 230, y: 140 },
    { x: 280, y: 80 },
    { x: 330, y: 160 },
  ];

  if (n === 1) return [{ x: 100, y: 100 }];
  if (n === 2) return [{ x: 50, y: 150 }, { x: 200, y: 50 }];
  if (n === 3) return [{ x: 50, y: 150 }, { x: 200, y: 50 }, { x: 150, y: 200 }];

  return pool.slice(0, n);
}

/** A point guaranteed to be far from any generated test point */
const FAR_POINT = { x: 9000, y: 9000 };

/**
 * Some tools have non-trivial geometry where the midpoint of the first two
 * input points does not lie on the drawing. This map provides a custom
 * "near point" that is guaranteed to hit the drawing for those tools.
 */
const CUSTOM_NEAR_POINTS: Record<string, { x: number; y: number }> = {
  // gann-fan: rays from origin(50,150). The 1x1 ray goes at ratio=1 toward -y.
  // Point on that ray: origin + (t, -t) => (60, 140).
  'gann-fan': { x: 60, y: 140 },

  // fib-timezone: vertical lines at fib cumulative intervals * unitW from p1.x.
  // unitW = |200-50| = 150. First cumulative = 1 => x = 50 + 150 = 200.
  'fib-timezone': { x: 200, y: 100 },

  // cyclic-lines: vertical lines every interval=150 starting at min(50,200)=50.
  // Line at x=50.
  'cyclic-lines': { x: 50, y: 100 },

  // sine-line: wavelength=300, amplitude=100, centerY=100.
  // At x=50 (p1.x), phase=0, expectedY = 100 + sin(0)*100 = 100.
  'sine-line': { x: 50, y: 100 },

  // fib-extension: horizontal lines projected from p3(150,200).
  // range = p2.y - p1.y = 50-150 = -100. Level 0 => y = 200 - (-100)*0 = 200.
  'fib-extension': { x: 100, y: 200 },

  // pitchfork: median from p1(50,150) through midpoint of p2-p3 = (175,125).
  // p1 itself lies on the median line.
  'pitchfork': { x: 50, y: 150 },

  // arc: quadratic bezier p1(50,150) ctrl p2(200,50) end p3(150,200).
  // Bezier midpoint = (p1 + 2*ctrl + end)/4 = (650/4, 450/4) = (162.5, 112.5).
  'arc': { x: 150, y: 113 },

  // schiff-pitchfork: handle = midpoint(p1(50,150), midpoint(p2(200,50), p3(150,200)))
  // midP2P3 = (175, 125), handle = (112.5, 137.5). Median goes through handle.
  'schiff-pitchfork': { x: 113, y: 138 },

  // horizontal-ray: horizontal line from anchor (100,100) extending right.
  // Any point to the right at same Y should hit.
  'horizontal-ray': { x: 150, y: 100 },

  // anchored-vwap: anchor at (100,100). Hit test checks near anchor Y, to the right.
  'anchored-vwap': { x: 150, y: 100 },

  // flat-top-bottom: flat line at y=150 from x=50 to x=200.
  // Near point on the flat line.
  'flat-top-bottom': { x: 125, y: 150 },

  // modified-schiff-pitchfork: handle = midpoint(p1(50,150), p2(200,50)) = (125, 100).
  // midP2P3 = (175, 125). Median goes through (125,100).
  'modified-schiff-pitchfork': { x: 125, y: 100 },

  // inside-pitchfork: median from p1(50,150) through mid(p2,p3) = (175,125).
  // p1 itself lies on the median.
  'inside-pitchfork': { x: 50, y: 150 },

  // trend-fib-extension: horizontal lines projected from p3(150,200).
  // range = p2.y - p1.y = 50-150 = -100. Level 0 => y = 200 - (-100)*0 = 200.
  'trend-fib-extension': { x: 100, y: 200 },

  // trend-fib-time: vertical lines from p3.x at fib time ratios.
  // timeSpan = p2.x - p1.x = 200-50 = 150. Level 0 => x = 150 + 0 = 150.
  'trend-fib-time': { x: 150, y: 100 },

  // time-cycles: same as cyclic-lines, vertical lines at x=50.
  'time-cycles': { x: 50, y: 100 },

  // bars-pattern: hit test checks source rect (p1-p2).
  // p1(50,150), p2(200,50) — midpoint is (125, 100) which is inside the rect.
  'bars-pattern': { x: 125, y: 100 },
};

// ---------------------------------------------------------------------------
// Tool definitions — one entry per registered tool
// ---------------------------------------------------------------------------

interface ToolEntry {
  tool: {
    name: string;
    pointCount: number;
    hitTest: (mouse: { x: number; y: number }, points: { x: number; y: number }[], threshold: number) => boolean;
    getHandles: (points: { x: number; y: number }[]) => { x: number; y: number }[];
  };
  expectedPointCount: number;
}

const tools: ToolEntry[] = [
  // 1-point tools
  { tool: horizontalLineTool, expectedPointCount: 1 },
  { tool: verticalLineTool, expectedPointCount: 1 },
  { tool: crossLineTool, expectedPointCount: 1 },
  { tool: textAnnotationTool, expectedPointCount: 1 },
  { tool: flagMarkerTool, expectedPointCount: 1 },
  { tool: calloutTool, expectedPointCount: 1 },
  { tool: noteTool, expectedPointCount: 1 },
  { tool: horizontalRayTool, expectedPointCount: 1 },
  { tool: anchoredVwapTool, expectedPointCount: 1 },

  // 2-point tools
  { tool: trendLineTool, expectedPointCount: 2 },
  { tool: rectangleTool, expectedPointCount: 2 },
  { tool: fibRetracementTool, expectedPointCount: 2 },
  { tool: rayTool, expectedPointCount: 2 },
  { tool: longShortTool, expectedPointCount: 3 },
  { tool: priceRangeTool, expectedPointCount: 2 },
  { tool: arrowTool, expectedPointCount: 2 },
  { tool: brushTool, expectedPointCount: 2 },
  { tool: ellipseTool, expectedPointCount: 2 },
  { tool: extendedLineTool, expectedPointCount: 2 },
  { tool: polylineTool, expectedPointCount: 2 },
  { tool: gannFanTool, expectedPointCount: 2 },
  { tool: gannBoxTool, expectedPointCount: 2 },
  { tool: regressionChannelTool, expectedPointCount: 2 },
  { tool: fibCirclesTool, expectedPointCount: 2 },
  { tool: dateRangeTool, expectedPointCount: 2 },
  { tool: forecastTool, expectedPointCount: 2 },
  { tool: fibTimeZoneTool, expectedPointCount: 2 },
  { tool: fibArcsTool, expectedPointCount: 2 },
  { tool: gannSquareTool, expectedPointCount: 2 },
  { tool: cyclicLinesTool, expectedPointCount: 2 },
  { tool: sineLineTool, expectedPointCount: 2 },
  { tool: infoLineTool, expectedPointCount: 2 },
  { tool: fibSpiralTool, expectedPointCount: 2 },
  { tool: fibSpeedFanTool, expectedPointCount: 2 },
  { tool: fixedRangeVPTool, expectedPointCount: 2 },
  { tool: trendAngleTool, expectedPointCount: 2 },
  { tool: datePriceRangeTool, expectedPointCount: 2 },

  // 3-point tools
  { tool: fibExtensionTool, expectedPointCount: 3 },
  { tool: parallelChannelTool, expectedPointCount: 3 },
  { tool: pitchforkTool, expectedPointCount: 3 },
  { tool: triangleTool, expectedPointCount: 3 },
  { tool: fibChannelTool, expectedPointCount: 3 },
  { tool: fibWedgeTool, expectedPointCount: 3 },
  { tool: arcTool, expectedPointCount: 3 },
  { tool: schiffPitchforkTool, expectedPointCount: 3 },

  // 4-point tools
  { tool: abcdPatternTool, expectedPointCount: 4 },
  { tool: elliottCorrectionTool, expectedPointCount: 4 },

  // 5-point tools
  { tool: xabcdPatternTool, expectedPointCount: 5 },
  { tool: headShouldersTool, expectedPointCount: 5 },

  // 6-point tools
  { tool: elliottImpulseTool, expectedPointCount: 6 },
  { tool: elliottTriangleTool, expectedPointCount: 6 },

  // 7-point tools
  { tool: threeDrivesTool, expectedPointCount: 7 },

  // ── New tools (batch 2) ──────────────────────────────────────────────
  // 3-point tools
  { tool: flatTopBottomTool, expectedPointCount: 3 },
  { tool: modifiedSchiffPitchforkTool, expectedPointCount: 3 },
  { tool: insidePitchforkTool, expectedPointCount: 3 },
  { tool: trendFibExtensionTool, expectedPointCount: 3 },
  { tool: trendFibTimeTool, expectedPointCount: 3 },
  { tool: barsPatternTool, expectedPointCount: 3 },

  // 4-point tools
  { tool: disjointChannelTool, expectedPointCount: 4 },
  { tool: elliottDoubleComboTool, expectedPointCount: 4 },

  // 5-point tools
  { tool: cypherPatternTool, expectedPointCount: 5 },

  // 6-point tools
  { tool: elliottTripleComboTool, expectedPointCount: 6 },

  // 2-point tools
  { tool: gannSquareFixedTool, expectedPointCount: 2 },
  { tool: timeCyclesTool, expectedPointCount: 2 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Drawing Tools — Full Coverage', () => {
  // Sanity check: make sure we have all 64 tools
  it('should have all 64 registered tools under test', () => {
    expect(tools.length).toBe(64);
  });

  // Verify every tool name is unique
  it('should have unique tool names', () => {
    const names = tools.map((t) => t.tool.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  // Per-tool test suites
  for (const { tool, expectedPointCount } of tools) {
    describe(tool.name, () => {
      const points = pointsForCount(expectedPointCount);

      it(`pointCount should be ${expectedPointCount}`, () => {
        expect(tool.pointCount).toBe(expectedPointCount);
        expect(tool.pointCount).toBeGreaterThan(0);
      });

      it('getHandles returns a non-empty array of points', () => {
        const handles = tool.getHandles(points);
        expect(Array.isArray(handles)).toBe(true);
        expect(handles.length).toBeGreaterThan(0);
        for (const h of handles) {
          expect(typeof h.x).toBe('number');
          expect(typeof h.y).toBe('number');
          expect(Number.isFinite(h.x)).toBe(true);
          expect(Number.isFinite(h.y)).toBe(true);
        }
      });

      it('hitTest returns true when mouse is near the drawing', () => {
        // Use a point that lies on/near the drawing geometry.
        // Some tools have complex geometry where the simple midpoint doesn't
        // land on the drawing, so we use tool-specific overrides.
        let nearPoint: { x: number; y: number };
        if (CUSTOM_NEAR_POINTS[tool.name]) {
          nearPoint = CUSTOM_NEAR_POINTS[tool.name];
        } else if (points.length === 1) {
          nearPoint = { x: points[0].x + 2, y: points[0].y + 2 };
        } else {
          nearPoint = {
            x: (points[0].x + points[1].x) / 2,
            y: (points[0].y + points[1].y) / 2,
          };
        }

        const threshold = 10;
        const result = tool.hitTest(nearPoint, points, threshold);
        expect(result).toBe(true);
      });

      it('hitTest returns false when mouse is far away', () => {
        const threshold = 10;
        const result = tool.hitTest(FAR_POINT, points, threshold);
        expect(result).toBe(false);
      });
    });
  }
});
