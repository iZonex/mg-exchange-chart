import { describe, it, expect, vi } from 'vitest';
import type { DrawingOptions } from '../src/api/types';

// Import ALL 64 drawing tools (mirrored from drawing-tools-full.test.ts)
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

/** Create a mock CanvasRenderingContext2D with all methods stubbed */
function mockCtx(): CanvasRenderingContext2D {
  const noop = vi.fn();
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    setLineDash: vi.fn(),
    getLineDash: vi.fn(() => []),
    createLinearGradient: vi.fn(() => ({ addColorStop: noop })),
    createRadialGradient: vi.fn(() => ({ addColorStop: noop })),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    clearRect: vi.fn(),
    roundRect: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
    isPointInPath: vi.fn(() => false),
    isPointInStroke: vi.fn(() => false),
    getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
    createPattern: vi.fn(() => null),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'top' as CanvasTextBaseline,
    globalAlpha: 1,
    lineDashOffset: 0,
    lineJoin: 'round' as CanvasLineJoin,
    lineCap: 'round' as CanvasLineCap,
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
    imageSmoothingEnabled: true,
    miterLimit: 10,
    canvas: {} as HTMLCanvasElement,
  } as unknown as CanvasRenderingContext2D;
}

/** Generate pixel points for a tool based on its pointCount */
function generatePoints(count: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    x: 100 + i * 150,
    y: 200 + (i % 2 === 0 ? -50 : 50),
  }));
}

/** Default DrawingOptions */
function makeOptions(): DrawingOptions {
  return {
    color: '#2196f3',
    lineWidth: 2,
    lineStyle: 'solid' as const,
    text: 'Test label',
    fibLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
    extendLeft: false,
    extendRight: false,
  };
}

/** DrawingOptions with all injected data fields tools may access */
function makeOptionsWithData(): DrawingOptions {
  const opts = makeOptions();
  const data = opts as Record<string, unknown>;

  // Line data (info-line, trend-line, forecast, trend-angle, etc.)
  data._lineData = {
    angle: 45,
    bars: 10,
    deltaPrice: 5.5,
    pctChange: 2.75,
  };

  // Rectangle data (rectangle, ellipse, gann-square, gann-square-fixed, etc.)
  data._rectData = {
    width: 100,
    height: 50,
    area: 5000,
    priceRange: 5.5,
    pctRange: 2.75,
    bars: 10,
    duration: '2h 30m',
  };

  // Triangle data (triangle tool)
  data._triData = { area: 2500 };

  // Chart data points (for price labels)
  data._points = [
    { price: 100, time: 1000 },
    { price: 110, time: 1060 },
    { price: 95, time: 1120 },
    { price: 105, time: 1180 },
    { price: 115, time: 1240 },
    { price: 90, time: 1300 },
    { price: 108, time: 1360 },
  ];

  // Long/short tool data
  data._entryPrice = 100;
  data._targetPrice = 110;
  data._precision = 2;

  // Fib tools: price at each level
  data._fibPrices = [100, 102.36, 103.82, 105, 106.18, 107.86, 110];

  // VP bins for fixed-range-vp
  data._vpBins = [
    { y1: 150, y2: 160, buyW: 40, sellW: 30, isPOC: true, isVA: true },
    { y1: 160, y2: 170, buyW: 20, sellW: 25, isPOC: false, isVA: true },
    { y1: 170, y2: 180, buyW: 10, sellW: 15, isPOC: false, isVA: false },
  ];

  // VWAP data for anchored-vwap
  data._vwapData = [
    { x: 100, y: 200 },
    { x: 150, y: 190 },
    { x: 200, y: 195 },
    { x: 250, y: 185 },
  ];

  // Ghost bars for bars-pattern
  data._ghostBars = [
    { x: 400, open: 160, high: 140, low: 180, close: 155, width: 8 },
    { x: 412, open: 155, high: 135, low: 175, close: 145, width: 8 },
  ];

  // Regression channel data
  data._regressionData = {
    slope: 0.5,
    intercept: 150,
    r2: 0.85,
    stdDev: 10,
  };

  // Head & shoulders target
  data._hsTarget = { targetPrice: 85, pct: -5.25 };

  // XABCD ratios
  data._xabcdRatios = { XAB: 0.618, ABC: 0.786, BCD: 1.272, XAD: 0.786 };

  // ABCD ratios
  data._abcdRatios = { ABC: 0.618, BCD: 1.272 };

  // Three drives ratios
  data._driveRatios = [0.618, 1.272, 0.618, 1.272];

  // Cypher ratios
  data._cypherRatios = { XAB: 0.382, ABC: 1.272, XCD: 0.786 };

  // Locked flag
  data._locked = false;

  return opts;
}

// ---------------------------------------------------------------------------
// Tool list — exactly mirrors drawing-tools-full.test.ts
// ---------------------------------------------------------------------------

interface RenderToolEntry {
  tool: {
    name: string;
    pointCount: number;
    render(
      ctx: CanvasRenderingContext2D,
      points: { x: number; y: number }[],
      options: DrawingOptions,
      width: number,
      height: number,
    ): void;
  };
}

const tools: RenderToolEntry[] = [
  // 1-point tools
  { tool: horizontalLineTool },
  { tool: verticalLineTool },
  { tool: crossLineTool },
  { tool: textAnnotationTool },
  { tool: flagMarkerTool },
  { tool: calloutTool },
  { tool: noteTool },
  { tool: horizontalRayTool },
  { tool: anchoredVwapTool },

  // 2-point tools
  { tool: trendLineTool },
  { tool: rectangleTool },
  { tool: fibRetracementTool },
  { tool: rayTool },
  { tool: priceRangeTool },
  { tool: arrowTool },
  { tool: brushTool },
  { tool: ellipseTool },
  { tool: extendedLineTool },
  { tool: polylineTool },
  { tool: gannFanTool },
  { tool: gannBoxTool },
  { tool: regressionChannelTool },
  { tool: fibCirclesTool },
  { tool: dateRangeTool },
  { tool: forecastTool },
  { tool: fibTimeZoneTool },
  { tool: fibArcsTool },
  { tool: gannSquareTool },
  { tool: cyclicLinesTool },
  { tool: sineLineTool },
  { tool: infoLineTool },
  { tool: fibSpiralTool },
  { tool: fibSpeedFanTool },
  { tool: fixedRangeVPTool },
  { tool: trendAngleTool },
  { tool: datePriceRangeTool },
  { tool: gannSquareFixedTool },
  { tool: timeCyclesTool },

  // 3-point tools
  { tool: longShortTool },
  { tool: fibExtensionTool },
  { tool: parallelChannelTool },
  { tool: pitchforkTool },
  { tool: triangleTool },
  { tool: fibChannelTool },
  { tool: fibWedgeTool },
  { tool: arcTool },
  { tool: schiffPitchforkTool },
  { tool: flatTopBottomTool },
  { tool: modifiedSchiffPitchforkTool },
  { tool: insidePitchforkTool },
  { tool: trendFibExtensionTool },
  { tool: trendFibTimeTool },
  { tool: barsPatternTool },

  // 4-point tools
  { tool: abcdPatternTool },
  { tool: elliottCorrectionTool },
  { tool: disjointChannelTool },
  { tool: elliottDoubleComboTool },

  // 5-point tools
  { tool: xabcdPatternTool },
  { tool: headShouldersTool },
  { tool: cypherPatternTool },

  // 6-point tools
  { tool: elliottImpulseTool },
  { tool: elliottTriangleTool },
  { tool: elliottTripleComboTool },

  // 7-point tools
  { tool: threeDrivesTool },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Drawing tool render()', () => {
  // Sanity check: all 64 tools present
  it('should have all 64 tools under test', () => {
    expect(tools.length).toBe(64);
  });

  // Verify unique tool names
  it('should have unique tool names', () => {
    const names = tools.map((t) => t.tool.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  for (const { tool } of tools) {
    describe(tool.name, () => {
      it('renders without throwing', () => {
        const ctx = mockCtx();
        const points = generatePoints(tool.pointCount);
        const options = makeOptionsWithData();

        // Must not throw
        expect(() => {
          tool.render(ctx, points, options, 800, 600);
        }).not.toThrow();
      });

      it('calls at least one canvas drawing method', () => {
        const ctx = mockCtx();
        const points = generatePoints(tool.pointCount);
        const options = makeOptionsWithData();

        tool.render(ctx, points, options, 800, 600);

        // Check that at least one canvas drawing operation was called
        const drawingMethods = [
          ctx.beginPath,
          ctx.moveTo,
          ctx.lineTo,
          ctx.stroke,
          ctx.fill,
          ctx.fillRect,
          ctx.fillText,
          ctx.arc,
          ctx.strokeRect,
          ctx.ellipse,
          ctx.quadraticCurveTo,
          ctx.bezierCurveTo,
          ctx.rect,
          ctx.strokeText,
          ctx.drawImage,
        ];

        const anyCall = drawingMethods.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fn) => (fn as any).mock.calls.length > 0,
        );
        expect(anyCall).toBe(true);
      });

      it('renders with minimal points (1 point) without throwing', () => {
        const ctx = mockCtx();
        const singlePoint = [{ x: 100, y: 200 }];
        const options = makeOptionsWithData();

        // Most tools early-return when given fewer points than needed — should not throw
        expect(() => {
          tool.render(ctx, singlePoint, options, 800, 600);
        }).not.toThrow();
      });

      it('renders with empty points array without throwing', () => {
        const ctx = mockCtx();
        const options = makeOptionsWithData();

        expect(() => {
          tool.render(ctx, [], options, 800, 600);
        }).not.toThrow();
      });

      it('renders with dashed line style without throwing', () => {
        const ctx = mockCtx();
        const points = generatePoints(tool.pointCount);
        const options = makeOptionsWithData();
        options.lineStyle = 'dashed';

        expect(() => {
          tool.render(ctx, points, options, 800, 600);
        }).not.toThrow();
      });

      it('renders with dotted line style without throwing', () => {
        const ctx = mockCtx();
        const points = generatePoints(tool.pointCount);
        const options = makeOptionsWithData();
        options.lineStyle = 'dotted';

        expect(() => {
          tool.render(ctx, points, options, 800, 600);
        }).not.toThrow();
      });

      it('renders on a very small canvas without throwing', () => {
        const ctx = mockCtx();
        const points = generatePoints(tool.pointCount);
        const options = makeOptionsWithData();

        expect(() => {
          tool.render(ctx, points, options, 10, 10);
        }).not.toThrow();
      });

      it('renders with coincident points without throwing', () => {
        const ctx = mockCtx();
        // All points at the same location — edge case for angle/distance calculations
        const points = Array.from({ length: tool.pointCount }, () => ({
          x: 200,
          y: 200,
        }));
        const options = makeOptionsWithData();

        expect(() => {
          tool.render(ctx, points, options, 800, 600);
        }).not.toThrow();
      });

      it('renders without injected data (plain options) without throwing', () => {
        const ctx = mockCtx();
        const points = generatePoints(tool.pointCount);
        const options = makeOptions(); // no injected _lineData, _rectData, etc.

        expect(() => {
          tool.render(ctx, points, options, 800, 600);
        }).not.toThrow();
      });
    });
  }
});

// ── Text tools: WYSIWYG editing mode (zero-width space hides canvas text) ──
describe('Text tools render gracefully during inline editing', () => {
  const textTools = [
    { tool: textAnnotationTool, name: 'text' },
    { tool: calloutTool, name: 'callout' },
    { tool: noteTool, name: 'note' },
  ];

  for (const { tool, name } of textTools) {
    it(`${name}: renders with zero-width space (editing mode) without throwing`, () => {
      const ctx = mockCtx();
      const points = [{ x: 100, y: 100 }];
      const options = { ...makeOptions(), text: '\u200B' };
      expect(() => tool.render(ctx, points, options, 800, 600)).not.toThrow();
    });

    it(`${name}: renders with empty string without throwing`, () => {
      const ctx = mockCtx();
      const points = [{ x: 100, y: 100 }];
      const options = { ...makeOptions(), text: '' };
      expect(() => tool.render(ctx, points, options, 800, 600)).not.toThrow();
    });

    it(`${name}: renders with actual text content`, () => {
      const ctx = mockCtx();
      const points = [{ x: 100, y: 100 }];
      const options = { ...makeOptions(), text: 'Hello World' };
      expect(() => tool.render(ctx, points, options, 800, 600)).not.toThrow();
      expect(ctx.fillText).toHaveBeenCalled();
    });

    it(`${name}: renders with multiline text`, () => {
      const ctx = mockCtx();
      const points = [{ x: 100, y: 100 }];
      const options = { ...makeOptions(), text: 'Line 1\nLine 2\nLine 3' };
      expect(() => tool.render(ctx, points, options, 800, 600)).not.toThrow();
    });
  }
});
