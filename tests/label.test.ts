import { describe, it, expect } from 'vitest';
import { mockCtx } from './helpers/mock-ctx';
import { drawDataLabel, drawBadge, drawRatioLabel, formatLineLabel } from '../src/drawings/primitives/label';

describe('drawDataLabel', () => {
  it('draws background rect and text', () => {
    const ctx = mockCtx();
    drawDataLabel(ctx, 100, 50, 'test', '#fff');
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith('test', 100, 50);
  });

  it('uses custom font size', () => {
    const ctx = mockCtx();
    drawDataLabel(ctx, 0, 0, 'x', '#000', 14);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('sets text alignment to center', () => {
    const ctx = mockCtx();
    drawDataLabel(ctx, 50, 50, 'hello', '#fff');
    expect(ctx.textAlign).toBe('center');
    expect(ctx.textBaseline).toBe('middle');
  });
});

describe('drawBadge', () => {
  it('draws rounded rect badge with text', () => {
    const ctx = mockCtx();
    drawBadge(ctx, 100, 50, 'TP', '#26a69a');
    expect(ctx.roundRect).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('resets globalAlpha to 1 after drawing', () => {
    const ctx = mockCtx();
    drawBadge(ctx, 100, 50, 'SL', '#ef5350');
    expect(ctx.globalAlpha).toBe(1);
  });

  it('sets text color to white', () => {
    const ctx = mockCtx();
    drawBadge(ctx, 100, 50, 'Entry', '#2962FF');
    // After drawing the badge background, fillStyle is set to white for text
    expect(ctx.fillStyle).toBe('#ffffff');
  });
});

describe('drawRatioLabel', () => {
  it('draws text at midpoint offset', () => {
    const ctx = mockCtx();
    drawRatioLabel(ctx, 0, 0, 100, 100, '0.618', '#fff');
    // midpoint = (0+100)/2 + 10 = 60, (0+100)/2 = 50
    expect(ctx.fillText).toHaveBeenCalledWith('0.618', 60, 50);
  });

  it('resets globalAlpha', () => {
    const ctx = mockCtx();
    drawRatioLabel(ctx, 0, 0, 100, 100, 'test', '#fff');
    expect(ctx.globalAlpha).toBe(1);
  });
});

describe('formatLineLabel', () => {
  it('formats positive delta', () => {
    const result = formatLineLabel({ angle: -45, bars: 10, deltaPrice: 5.5, pctChange: 2.75 });
    expect(result).toContain('45.0\u00B0');
    expect(result).toContain('10 bars');
    expect(result).toContain('+5.50');
    expect(result).toContain('+2.75%');
  });

  it('formats negative delta', () => {
    const result = formatLineLabel({ angle: 30, bars: 5, deltaPrice: -3.2, pctChange: -1.5 });
    expect(result).toContain('-3.20');
    expect(result).toContain('-1.50%');
  });

  it('negates angle for display', () => {
    // angle=-45 should display as 45.0 (negated)
    const result = formatLineLabel({ angle: -45, bars: 1, deltaPrice: 0, pctChange: 0 });
    expect(result).toContain('45.0\u00B0');
  });
});
