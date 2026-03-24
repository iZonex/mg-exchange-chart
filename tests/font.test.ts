import { describe, it, expect } from 'vitest';
import { font, setFontFamily } from '../src/core/font';

describe('font', () => {
  it('returns font string with default family', () => {
    setFontFamily(undefined);
    expect(font(11)).toBe('11px sans-serif');
  });

  it('returns bold font string', () => {
    setFontFamily(undefined);
    expect(font(14, 'bold')).toBe('bold 14px sans-serif');
  });

  it('uses custom font family', () => {
    setFontFamily('Inter');
    expect(font(11)).toBe('11px Inter');
    setFontFamily(undefined); // reset
  });

  it('resets to default when undefined', () => {
    setFontFamily('Roboto');
    setFontFamily(undefined);
    expect(font(11)).toBe('11px sans-serif');
  });
});
