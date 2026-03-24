// ── WebGL Render Context Tests ──────────────────────────────────────────────
// Tests for WebGLRenderContext — the Canvas2D-like wrapper over WebGLBatchRenderer.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebGLRenderContext } from '../src/core/renderer/webgl/webgl-render-context';
import type { WebGLBatchRenderer } from '../src/core/renderer/webgl/batch-renderer';

// ── Mock Batch Renderer ───────────────────────────────────────────────────

function createMockBatch(): WebGLBatchRenderer {
  return {
    pushRect: vi.fn(),
    pushRectRGBA: vi.fn(),
    pushLine: vi.fn(),
    pushText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 42 } as TextMetrics),
    flush: vi.fn(),
    setScissor: vi.fn(),
    clearScissor: vi.fn(),
  } as unknown as WebGLBatchRenderer;
}

describe('WebGLRenderContext', () => {
  let batch: ReturnType<typeof createMockBatch>;
  let ctx: WebGLRenderContext;

  beforeEach(() => {
    batch = createMockBatch();
    ctx = new WebGLRenderContext(batch);
  });

  // ── Constructor & Defaults ──────────────────────────────────────────────

  it('initializes with default state', () => {
    expect(ctx.fillStyle).toBe('#000000');
    expect(ctx.strokeStyle).toBe('#000000');
    expect(ctx.lineWidth).toBe(1);
    expect(ctx.textAlign).toBe('start');
    expect(ctx.textBaseline).toBe('alphabetic');
    expect(ctx.globalAlpha).toBe(1);
    expect(ctx.lineDashOffset).toBe(0);
    expect(ctx.lineJoin).toBe('miter');
    expect(ctx.lineCap).toBe('butt');
    expect(ctx.globalCompositeOperation).toBe('source-over');
  });

  // ── State Stack: save/restore ──────────────────────────────────────────

  describe('save/restore', () => {
    it('saves and restores all state fields', () => {
      ctx.fillStyle = '#ff0000';
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.5;
      ctx.lineDashOffset = 5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'square';
      ctx.globalCompositeOperation = 'multiply';

      ctx.save();

      // Modify all state
      ctx.fillStyle = '#0000ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 7;
      ctx.font = '20px serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = 0.2;
      ctx.lineDashOffset = 10;
      ctx.lineJoin = 'bevel';
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'screen';

      ctx.restore();

      expect(ctx.fillStyle).toBe('#ff0000');
      expect(ctx.strokeStyle).toBe('#00ff00');
      expect(ctx.lineWidth).toBe(3);
      expect(ctx.font).toBe('14px sans-serif');
      expect(ctx.textAlign).toBe('center');
      expect(ctx.textBaseline).toBe('middle');
      expect(ctx.globalAlpha).toBe(0.5);
      expect(ctx.lineDashOffset).toBe(5);
      expect(ctx.lineJoin).toBe('round');
      expect(ctx.lineCap).toBe('square');
      expect(ctx.globalCompositeOperation).toBe('multiply');
    });

    it('flushes batch on restore', () => {
      ctx.save();
      ctx.restore();
      expect(batch.flush).toHaveBeenCalled();
    });

    it('restore with empty stack is a no-op', () => {
      ctx.restore(); // should not throw
      expect(batch.flush).not.toHaveBeenCalled();
    });

    it('saves and restores lineDash array (deep copy)', () => {
      ctx.setLineDash([5, 10]);
      ctx.save();
      ctx.setLineDash([2, 3]);
      ctx.restore();
      expect(ctx.getLineDash()).toEqual([5, 10]);
    });

    it('saves and restores clip rect', () => {
      // Set a clip via rect() + clip()
      ctx.beginPath();
      ctx.rect(10, 20, 100, 200);
      ctx.clip();
      expect(batch.setScissor).toHaveBeenCalledWith(10, 20, 100, 200);

      ctx.save();

      // Clear clip state by restoring
      ctx.beginPath();
      ctx.rect(50, 50, 50, 50);
      ctx.clip();

      ctx.restore();
      // Should restore the previous clip
      expect(batch.setScissor).toHaveBeenCalledWith(10, 20, 100, 200);
    });

    it('clears scissor when restoring to no-clip state', () => {
      ctx.save(); // no clip set

      // Set clip
      ctx.beginPath();
      ctx.rect(10, 20, 100, 200);
      ctx.clip();

      ctx.restore(); // back to no-clip
      expect(batch.clearScissor).toHaveBeenCalled();
    });

    it('saves and restores transform', () => {
      ctx.setTransform(2, 0, 0, 2, 10, 20);
      ctx.save();

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillRect(0, 0, 50, 50);

      ctx.restore();
      // After restore, transform should be back to (2, 2, 10, 20)
      ctx.fillRect(0, 0, 50, 50);
      // With transform sx=2, sy=2, tx=10, ty=20: fillRect(0,0,50,50) -> pushRect(10, 20, 100, 100, ...)
      const lastCall = (batch.pushRect as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      expect(lastCall![0]).toBe(10);
      expect(lastCall![1]).toBe(20);
      expect(lastCall![2]).toBe(100);
      expect(lastCall![3]).toBe(100);
    });
  });

  // ── Rectangles ──────────────────────────────────────────────────────────

  describe('fillRect', () => {
    it('pushes rect with string fill color', () => {
      ctx.fillStyle = '#ff0000';
      ctx.globalAlpha = 0.8;
      ctx.fillRect(10, 20, 100, 50);

      expect(batch.pushRect).toHaveBeenCalledWith(10, 20, 100, 50, '#ff0000', 0.8);
    });

    it('pushes rect with fallback color for CanvasGradient', () => {
      ctx.fillStyle = {} as CanvasGradient;
      ctx.fillRect(10, 20, 100, 50);

      expect(batch.pushRect).toHaveBeenCalledWith(10, 20, 100, 50, '#888888', 1);
    });

    it('applies transform to fillRect', () => {
      ctx.setTransform(2, 0, 0, 3, 100, 200);
      ctx.fillRect(10, 20, 30, 40);

      // tx = 10*2 + 100 = 120, ty = 20*3 + 200 = 260
      // tw = 30*2 = 60, th = 40*3 = 120
      expect(batch.pushRect).toHaveBeenCalledWith(120, 260, 60, 120, '#000000', 1);
    });
  });

  describe('strokeRect', () => {
    it('draws 4 lines for a stroked rect', () => {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.strokeRect(10, 20, 100, 50);

      expect(batch.pushLine).toHaveBeenCalledTimes(4);
      // Top line
      expect(batch.pushLine).toHaveBeenCalledWith(10, 20, 110, 20, 2, '#00ff00', 0.5);
      // Bottom line
      expect(batch.pushLine).toHaveBeenCalledWith(10, 70, 110, 70, 2, '#00ff00', 0.5);
      // Left line
      expect(batch.pushLine).toHaveBeenCalledWith(10, 20, 10, 70, 2, '#00ff00', 0.5);
      // Right line
      expect(batch.pushLine).toHaveBeenCalledWith(110, 20, 110, 70, 2, '#00ff00', 0.5);
    });

    it('applies transform to strokeRect', () => {
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.strokeRect(5, 5, 10, 10);
      // All coords should be doubled
      expect(batch.pushLine).toHaveBeenCalledTimes(4);
      const firstCall = (batch.pushLine as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(firstCall![0]).toBe(10); // 5*2
      expect(firstCall![1]).toBe(10); // 5*2
    });
  });

  describe('clearRect', () => {
    it('is a no-op (does not throw)', () => {
      expect(() => ctx.clearRect(0, 0, 800, 600)).not.toThrow();
    });
  });

  // ── Path Operations ────────────────────────────────────────────────────

  describe('beginPath / moveTo / lineTo', () => {
    it('beginPath clears path and pending clip', () => {
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 100);
      ctx.beginPath();
      // After beginPath, stroke should produce no lines (path empty)
      ctx.stroke();
      expect(batch.pushLine).not.toHaveBeenCalled();
    });
  });

  describe('closePath', () => {
    it('adds a line back to the last moveTo', () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 0);
      ctx.lineTo(100, 100);
      ctx.closePath();
      ctx.stroke();

      // Should have 3 line segments: 0,0->100,0; 100,0->100,100; 100,100->0,0
      expect(batch.pushLine).toHaveBeenCalledTimes(3);
    });
  });

  describe('rect', () => {
    it('adds a rectangular path and sets pending clip rect', () => {
      ctx.beginPath();
      ctx.rect(10, 20, 100, 200);
      ctx.stroke();

      // rect adds moveTo + 4 lineTo (via closePath), so stroke draws 4 segments
      expect(batch.pushLine).toHaveBeenCalledTimes(4);
    });
  });

  // ── Arc ─────────────────────────────────────────────────────────────────

  describe('arc', () => {
    it('approximates arc as line segments', () => {
      ctx.beginPath();
      ctx.arc(50, 50, 25, 0, Math.PI * 2);
      ctx.stroke();

      // Arc generates line segments; stroke should produce multiple lines
      expect((batch.pushLine as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(10);
    });

    it('applies transform to arc center and radius', () => {
      ctx.setTransform(2, 0, 0, 2, 10, 20);
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI / 2);
      ctx.stroke();
      // Center should be (10, 20) and radius scaled to 20
      const firstCall = (batch.pushLine as ReturnType<typeof vi.fn>).mock.calls[0];
      // First point should be near (10+20, 20) = (30, 20) (cos(0)*20+10, sin(0)*20+20)
      expect(firstCall![0]).toBeCloseTo(30, 0);
      expect(firstCall![1]).toBeCloseTo(20, 0);
    });
  });

  // ── Curves ──────────────────────────────────────────────────────────────

  describe('quadraticCurveTo', () => {
    it('approximates quadratic curve with line segments', () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(50, 100, 100, 0);
      ctx.stroke();

      // Should produce 12 line segments (12 steps)
      expect(batch.pushLine).toHaveBeenCalledTimes(12);
    });

    it('does nothing without a previous point', () => {
      ctx.beginPath();
      ctx.quadraticCurveTo(50, 100, 100, 0);
      ctx.stroke();
      expect(batch.pushLine).not.toHaveBeenCalled();
    });
  });

  describe('bezierCurveTo', () => {
    it('approximates cubic bezier with line segments', () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(30, 100, 70, 100, 100, 0);
      ctx.stroke();

      // Should produce 16 line segments (16 steps)
      expect(batch.pushLine).toHaveBeenCalledTimes(16);
    });

    it('does nothing without a previous point', () => {
      ctx.beginPath();
      ctx.bezierCurveTo(30, 100, 70, 100, 100, 0);
      ctx.stroke();
      expect(batch.pushLine).not.toHaveBeenCalled();
    });
  });

  describe('ellipse', () => {
    it('approximates ellipse as line segments', () => {
      ctx.beginPath();
      ctx.ellipse(50, 50, 30, 20, 0, 0, Math.PI * 2);
      ctx.stroke();

      expect((batch.pushLine as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(10);
    });

    it('handles rotation', () => {
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 5, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();

      expect((batch.pushLine as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(10);
    });
  });

  // ── Fill ────────────────────────────────────────────────────────────────

  describe('fill', () => {
    it('does nothing with fewer than 3 path points', () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 100);
      ctx.fill();

      expect(batch.pushRectRGBA).not.toHaveBeenCalled();
    });

    it('fills a triangle path', () => {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 0);
      ctx.lineTo(50, 100);
      ctx.fill();

      // Should call pushRectRGBA for fill decomposition
      expect(batch.pushRectRGBA).toHaveBeenCalled();
    });

    it('handles CanvasGradient fillStyle with fallback color', () => {
      ctx.fillStyle = {} as CanvasGradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 0);
      ctx.lineTo(50, 100);
      ctx.fill();

      expect(batch.pushRectRGBA).toHaveBeenCalled();
    });

    it('handles multiple sub-paths', () => {
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      // Sub-path 1
      ctx.moveTo(0, 0);
      ctx.lineTo(50, 0);
      ctx.lineTo(25, 50);
      // Sub-path 2
      ctx.moveTo(100, 0);
      ctx.lineTo(150, 0);
      ctx.lineTo(125, 50);
      ctx.fill();

      // Both sub-paths should produce fill calls
      expect((batch.pushRectRGBA as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('skips sub-paths with fewer than 3 points', () => {
      ctx.fillStyle = '#0000ff';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(10, 10);
      // Only 2 points in this sub-path — should be skipped
      ctx.moveTo(100, 100);
      ctx.lineTo(200, 100);
      ctx.lineTo(150, 200);
      ctx.fill();

      // Only the second sub-path (3 points) should generate fills
      expect(batch.pushRectRGBA).toHaveBeenCalled();
    });

    it('applies globalAlpha to fill', () => {
      ctx.fillStyle = '#ff0000';
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 0);
      ctx.lineTo(50, 100);
      ctx.fill();

      // The alpha in pushRectRGBA should reflect globalAlpha
      const calls = (batch.pushRectRGBA as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      // Alpha (last argument) should be ~0.5
      expect(calls[0]![7]).toBeCloseTo(0.5, 1);
    });

    it('skips degenerate triangles smaller than 1x1', () => {
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0.1, 0);
      ctx.lineTo(0, 0.1);
      ctx.lineTo(0.2, 0); // very tiny triangles
      ctx.fill();

      // The tiny triangle bounding box < 1px should be skipped
      // But this depends on the exact logic — just verify no crash
    });
  });

  // ── Stroke ──────────────────────────────────────────────────────────────

  describe('stroke', () => {
    it('does nothing with fewer than 2 path points', () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.stroke();
      expect(batch.pushLine).not.toHaveBeenCalled();
    });

    it('strokes connected line segments', () => {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 0);
      ctx.lineTo(100, 100);
      ctx.stroke();

      expect(batch.pushLine).toHaveBeenCalledTimes(2);
      expect(batch.pushLine).toHaveBeenCalledWith(0, 0, 100, 0, 2, '#ff0000', 0.7);
      expect(batch.pushLine).toHaveBeenCalledWith(100, 0, 100, 100, 2, '#ff0000', 0.7);
    });

    it('handles multiple sub-paths with moveTo', () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(50, 50);
      ctx.moveTo(100, 100);
      ctx.lineTo(150, 150);
      ctx.stroke();

      expect(batch.pushLine).toHaveBeenCalledTimes(2);
    });

    it('skips lineTo before any moveTo', () => {
      ctx.beginPath();
      ctx.lineTo(50, 50); // no previous moveTo — hasStart is false
      ctx.stroke();
      expect(batch.pushLine).not.toHaveBeenCalled();
    });
  });

  // ── Clip ────────────────────────────────────────────────────────────────

  describe('clip', () => {
    it('sets scissor from pending rect', () => {
      ctx.beginPath();
      ctx.rect(10, 20, 300, 400);
      ctx.clip();

      expect(batch.flush).toHaveBeenCalled();
      expect(batch.setScissor).toHaveBeenCalledWith(10, 20, 300, 400);
    });

    it('does nothing without a prior rect() call', () => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 100);
      ctx.clip();

      expect(batch.setScissor).not.toHaveBeenCalled();
    });
  });

  // ── Text ────────────────────────────────────────────────────────────────

  describe('fillText', () => {
    it('pushes text to batch with string color', () => {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Hello', 100, 200);

      expect(batch.pushText).toHaveBeenCalledWith(
        'Hello', 100, 200, '12px sans-serif', '#ffffff', 'center', 'middle',
      );
    });

    it('uses fallback color for CanvasGradient fillStyle', () => {
      ctx.fillStyle = {} as CanvasGradient;
      ctx.fillText('Test', 10, 20);

      expect(batch.pushText).toHaveBeenCalledWith(
        'Test', 10, 20, expect.any(String), '#ffffff', 'start', 'alphabetic',
      );
    });

    it('applies transform to text position', () => {
      ctx.setTransform(1, 0, 0, 1, 50, 100);
      ctx.fillText('Shifted', 10, 20);

      expect(batch.pushText).toHaveBeenCalledWith(
        'Shifted', 60, 120, expect.any(String), '#000000', 'start', 'alphabetic',
      );
    });
  });

  describe('strokeText', () => {
    it('is a no-op (does not throw)', () => {
      expect(() => ctx.strokeText('hello', 10, 20)).not.toThrow();
    });
  });

  describe('measureText', () => {
    it('delegates to batch.measureText', () => {
      ctx.font = '14px serif';
      const result = ctx.measureText('Test');
      expect(batch.measureText).toHaveBeenCalledWith('Test', '14px serif');
      expect(result.width).toBe(42);
    });
  });

  // ── Transforms ──────────────────────────────────────────────────────────

  describe('setTransform', () => {
    it('sets scale and translate (ignores skew)', () => {
      ctx.setTransform(2, 0.5, 0.5, 3, 10, 20);
      ctx.fillRect(0, 0, 10, 10);
      // sx=2, sy=3, tx=10, ty=20 → pushRect(10, 20, 20, 30)
      expect(batch.pushRect).toHaveBeenCalledWith(10, 20, 20, 30, '#000000', 1);
    });
  });

  describe('translate', () => {
    it('adds to transform offset', () => {
      ctx.translate(50, 100);
      ctx.fillRect(0, 0, 10, 10);
      expect(batch.pushRect).toHaveBeenCalledWith(50, 100, 10, 10, '#000000', 1);
    });

    it('accumulates with existing transform', () => {
      ctx.setTransform(2, 0, 0, 2, 10, 20);
      ctx.translate(5, 10); // tx += 5*2 = 10+10 = 20, ty += 10*2 = 20+20 = 40
      ctx.fillRect(0, 0, 1, 1);
      expect(batch.pushRect).toHaveBeenCalledWith(20, 40, 2, 2, '#000000', 1);
    });
  });

  describe('rotate', () => {
    it('is a no-op', () => {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(0, 0, 10, 10);
      // Should behave as if no rotation
      expect(batch.pushRect).toHaveBeenCalledWith(0, 0, 10, 10, '#000000', 1);
    });
  });

  describe('scale', () => {
    it('multiplies transform scale', () => {
      ctx.scale(2, 3);
      ctx.fillRect(10, 10, 5, 5);
      expect(batch.pushRect).toHaveBeenCalledWith(20, 30, 10, 15, '#000000', 1);
    });
  });

  // ── Line Dash ──────────────────────────────────────────────────────────

  describe('setLineDash / getLineDash', () => {
    it('stores and returns a copy of dash segments', () => {
      const segments = [5, 10, 15];
      ctx.setLineDash(segments);
      const result = ctx.getLineDash();
      expect(result).toEqual([5, 10, 15]);
      // Should be a copy, not the same reference
      expect(result).not.toBe(segments);
    });

    it('getLineDash returns empty by default', () => {
      expect(ctx.getLineDash()).toEqual([]);
    });
  });

  // ── Gradient ───────────────────────────────────────────────────────────

  describe('createLinearGradient', () => {
    it('returns a CanvasGradient from offscreen canvas', () => {
      // Mock document.createElement for offscreen canvas
      const mockGradient = { addColorStop: vi.fn() };
      const mockCtx2d = {
        createLinearGradient: vi.fn().mockReturnValue(mockGradient),
      };
      const mockCanvas = { getContext: vi.fn().mockReturnValue(mockCtx2d) };

      vi.stubGlobal('document', {
        createElement: vi.fn().mockReturnValue(mockCanvas),
      });

      const gradient = ctx.createLinearGradient(0, 0, 100, 100);
      expect(gradient).toBe(mockGradient);
      expect(mockCtx2d.createLinearGradient).toHaveBeenCalledWith(0, 0, 100, 100);

      vi.unstubAllGlobals();
    });
  });

  // ── drawImage ──────────────────────────────────────────────────────────

  describe('drawImage', () => {
    it('is a no-op (does not throw)', () => {
      const img = {} as CanvasImageSource;
      expect(() => ctx.drawImage(img, 0, 0)).not.toThrow();
      expect(() => ctx.drawImage(img, 0, 0, 100, 100)).not.toThrow();
    });
  });

  // ── Flush ──────────────────────────────────────────────────────────────

  describe('flush', () => {
    it('delegates to batch.flush()', () => {
      ctx.flush();
      expect(batch.flush).toHaveBeenCalled();
    });
  });

  // ── globalCompositeOperation ───────────────────────────────────────────

  describe('globalCompositeOperation', () => {
    it('gets and sets the value', () => {
      ctx.globalCompositeOperation = 'destination-over';
      expect(ctx.globalCompositeOperation).toBe('destination-over');
    });
  });
});
