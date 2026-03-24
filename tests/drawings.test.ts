import { describe, it, expect } from 'vitest';
import {
  pointToSegmentDist,
  pointToLineDist,
  pointToHorizontalLineDist,
  pointInRect,
  pointToRectBorderDist,
  pointDist,
} from '../src/drawings/primitives/hit-test';
import { DrawingEngine } from '../src/drawings/engine';
import { horizontalLineTool } from '../src/drawings/tools/horizontal-line';
import { trendLineTool } from '../src/drawings/tools/trend-line';
import { rectangleTool } from '../src/drawings/tools/rectangle';
import { fibRetracementTool } from '../src/drawings/tools/fib-retracement';
import { textAnnotationTool } from '../src/drawings/tools/text-annotation';
import { DEFAULT_FIB_LEVELS } from '../src/drawings/tools/fib-retracement';

// ── Hit Test Geometry ───────────────────────────────────────────────────────

describe('Hit Test - pointToSegmentDist', () => {
  it('should return 0 for point on segment', () => {
    expect(pointToSegmentDist({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 10 })).toBeCloseTo(0, 5);
  });

  it('should return distance to nearest endpoint when beyond segment', () => {
    // Point is beyond p2
    const dist = pointToSegmentDist({ x: 20, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(dist).toBeCloseTo(10, 5);
  });

  it('should return perpendicular distance for point near middle', () => {
    // Horizontal segment, point 5px above
    const dist = pointToSegmentDist({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(dist).toBeCloseTo(5, 5);
  });

  it('should handle zero-length segment', () => {
    const dist = pointToSegmentDist({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(dist).toBeCloseTo(5, 5);
  });
});

describe('Hit Test - pointToHorizontalLineDist', () => {
  it('should return vertical distance', () => {
    expect(pointToHorizontalLineDist({ x: 100, y: 50 }, 40)).toBe(10);
    expect(pointToHorizontalLineDist({ x: 100, y: 40 }, 40)).toBe(0);
  });
});

describe('Hit Test - pointInRect', () => {
  it('should detect point inside rectangle', () => {
    expect(pointInRect({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 10 }, 0)).toBe(true);
  });

  it('should detect point outside rectangle', () => {
    expect(pointInRect({ x: 15, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 10 }, 0)).toBe(false);
  });

  it('should respect threshold', () => {
    // Point is 2px outside, threshold is 3
    expect(pointInRect({ x: 12, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 10 }, 3)).toBe(true);
  });

  it('should handle reversed corners', () => {
    expect(pointInRect({ x: 5, y: 5 }, { x: 10, y: 10 }, { x: 0, y: 0 }, 0)).toBe(true);
  });
});

describe('Hit Test - pointDist', () => {
  it('should compute euclidean distance', () => {
    expect(pointDist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 10);
    expect(pointDist({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
  });
});

// ── Drawing Engine ──────────────────────────────────────────────────────────

describe('DrawingEngine', () => {
  function createEngine(): DrawingEngine {
    const engine = new DrawingEngine();
    engine.registerTool(horizontalLineTool);
    engine.registerTool(trendLineTool);
    engine.registerTool(rectangleTool);
    engine.registerTool(fibRetracementTool);
    engine.registerTool(textAnnotationTool);
    return engine;
  }

  it('should create horizontal line with 1 click', () => {
    const engine = createEngine();
    engine.startCreating('horizontal-line');
    expect(engine.state.mode).toBe('creating');

    const result = engine.addPoint({ price: 42000, time: 1000 });
    expect(result).not.toBeNull();
    expect(result!.toolName).toBe('horizontal-line');
    expect(result!.points).toHaveLength(1);
    expect(engine.state.mode).toBe('idle');
  });

  it('should create trend line with 2 clicks', () => {
    const engine = createEngine();
    engine.startCreating('trend-line');

    const result1 = engine.addPoint({ price: 42000, time: 1000 });
    expect(result1).toBeNull(); // not complete yet

    const result2 = engine.addPoint({ price: 43000, time: 2000 });
    expect(result2).not.toBeNull();
    expect(result2!.points).toHaveLength(2);
  });

  it('should cancel creation', () => {
    const engine = createEngine();
    engine.startCreating('trend-line');
    engine.addPoint({ price: 42000, time: 1000 });
    engine.cancelCreating();
    expect(engine.state.mode).toBe('idle');
    expect(engine.getAll()).toHaveLength(0);
  });

  it('should remove drawing', () => {
    const engine = createEngine();
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint({ price: 42000, time: 1000 })!;

    expect(engine.getAll()).toHaveLength(1);
    engine.remove(drawing.id);
    expect(engine.getAll()).toHaveLength(0);
  });

  it('should update drawing points', () => {
    const engine = createEngine();
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint({ price: 42000, time: 1000 })!;

    engine.updatePoints(drawing.id, [{ price: 43000, time: 1000 }]);
    expect(engine.get(drawing.id)!.points[0]!.price).toBe(43000);
  });

  it('should update drawing options', () => {
    const engine = createEngine();
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint({ price: 42000, time: 1000 })!;

    engine.updateOptions(drawing.id, { color: '#ff0000', lineStyle: 'dashed' });
    expect(engine.get(drawing.id)!.options.color).toBe('#ff0000');
    expect(engine.get(drawing.id)!.options.lineStyle).toBe('dashed');
  });

  it('should toggle lock', () => {
    const engine = createEngine();
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint({ price: 42000, time: 1000 })!;

    expect(drawing.locked).toBe(false);
    engine.toggleLock(drawing.id);
    expect(engine.get(drawing.id)!.locked).toBe(true);
    engine.toggleLock(drawing.id);
    expect(engine.get(drawing.id)!.locked).toBe(false);
  });

  it('should not edit locked drawing', () => {
    const engine = createEngine();
    engine.startCreating('horizontal-line');
    const drawing = engine.addPoint({ price: 42000, time: 1000 })!;

    engine.toggleLock(drawing.id);
    engine.startEditing(drawing.id, 0);
    expect(engine.state.mode).toBe('idle'); // should not start editing
  });
});

// ── Serialization ───────────────────────────────────────────────────────────

describe('Drawing Serialization', () => {
  it('should roundtrip serialize/deserialize', () => {
    const engine = new DrawingEngine();
    engine.registerTool(horizontalLineTool);
    engine.registerTool(trendLineTool);

    // Create a horizontal line
    engine.startCreating('horizontal-line');
    engine.addPoint({ price: 42000, time: 1000 });

    // Create a trend line
    engine.startCreating('trend-line');
    engine.addPoint({ price: 42000, time: 1000 });
    engine.addPoint({ price: 43000, time: 2000 });

    const serialized = engine.serialize();
    expect(serialized).toHaveLength(2);

    // Deserialize into new engine
    const engine2 = new DrawingEngine();
    engine2.registerTool(horizontalLineTool);
    engine2.registerTool(trendLineTool);
    engine2.deserialize(serialized);

    expect(engine2.getAll()).toHaveLength(2);
    const [hline, tline] = engine2.getAll();
    expect(hline!.toolName).toBe('horizontal-line');
    expect(hline!.points[0]!.price).toBe(42000);
    expect(tline!.toolName).toBe('trend-line');
    expect(tline!.points).toHaveLength(2);
  });
});

// ── Tool Hit Tests ──────────────────────────────────────────────────────────

describe('Tool Hit Tests', () => {
  it('horizontal line should hit at same Y', () => {
    expect(horizontalLineTool.hitTest(
      { x: 100, y: 50 },
      [{ x: 0, y: 50 }],
      5,
    )).toBe(true);
  });

  it('horizontal line should miss at different Y', () => {
    expect(horizontalLineTool.hitTest(
      { x: 100, y: 70 },
      [{ x: 0, y: 50 }],
      5,
    )).toBe(false);
  });

  it('trend line should hit near segment', () => {
    expect(trendLineTool.hitTest(
      { x: 5, y: 2 },
      [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      5,
    )).toBe(true);
  });

  it('trend line should miss far from segment', () => {
    expect(trendLineTool.hitTest(
      { x: 5, y: 20 },
      [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      5,
    )).toBe(false);
  });

  it('rectangle should hit inside', () => {
    expect(rectangleTool.hitTest(
      { x: 5, y: 5 },
      [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      5,
    )).toBe(true);
  });

  it('rectangle should miss outside', () => {
    expect(rectangleTool.hitTest(
      { x: 50, y: 50 },
      [{ x: 0, y: 0 }, { x: 10, y: 10 }],
      5,
    )).toBe(false);
  });

  it('text should hit near anchor point', () => {
    expect(textAnnotationTool.hitTest(
      { x: 102, y: 100 },
      [{ x: 100, y: 100 }],
      5,
    )).toBe(true);
  });
});

// ── Fibonacci Levels ────────────────────────────────────────────────────────

describe('Fibonacci Retracement', () => {
  it('should have correct default levels', () => {
    expect(DEFAULT_FIB_LEVELS).toEqual([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
  });

  it('should hit near a fib level line', () => {
    // Points define a range from y=0 to y=100
    const hit = fibRetracementTool.hitTest(
      { x: 50, y: 50 }, // at 50% level
      [{ x: 0, y: 0 }, { x: 0, y: 100 }],
      5,
    );
    expect(hit).toBe(true);
  });

  it('should miss between fib levels', () => {
    // Point at y=15 — not near any standard fib level (0=0, 23.6=23.6)
    const hit = fibRetracementTool.hitTest(
      { x: 50, y: 15 },
      [{ x: 0, y: 0 }, { x: 0, y: 100 }],
      3,
    );
    expect(hit).toBe(false);
  });
});
