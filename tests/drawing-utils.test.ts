import { describe, it, expect } from 'vitest';
import { mockCtx } from './helpers/mock-ctx';
import { applyLineStyle } from '../src/drawings/tools/utils';
import type { DrawingOptions } from '../src/api/types';

describe('applyLineStyle', () => {
  it('sets solid line (empty dash)', () => {
    const ctx = mockCtx();
    applyLineStyle(ctx, { lineStyle: 'solid' } as DrawingOptions);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
  });

  it('sets dashed line', () => {
    const ctx = mockCtx();
    applyLineStyle(ctx, { lineStyle: 'dashed' } as DrawingOptions);
    expect(ctx.setLineDash).toHaveBeenCalledWith([8, 4]);
  });

  it('sets dotted line', () => {
    const ctx = mockCtx();
    applyLineStyle(ctx, { lineStyle: 'dotted' } as DrawingOptions);
    expect(ctx.setLineDash).toHaveBeenCalledWith([2, 3]);
  });

  it('defaults to solid for undefined lineStyle', () => {
    const ctx = mockCtx();
    applyLineStyle(ctx, {} as DrawingOptions);
    expect(ctx.setLineDash).toHaveBeenCalledWith([]);
  });
});
