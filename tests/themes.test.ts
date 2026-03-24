import { describe, it, expect } from 'vitest';
import { darkTheme } from '../src/themes/dark';
import { lightTheme } from '../src/themes/light';
import { colorblindDarkTheme } from '../src/themes/colorblind-dark';
import { colorblindLightTheme } from '../src/themes/colorblind-light';
import type { Theme } from '../src/api/types';

const allThemes: Theme[] = [darkTheme, lightTheme, colorblindDarkTheme, colorblindLightTheme];

const requiredFields: (keyof Theme)[] = [
  'name', 'bg', 'gridLine', 'borderColor',
  'textPrimary', 'textSecondary', 'textMuted',
  'crosshairLine', 'crosshairLabel', 'crosshairLabelText',
  'bullCandle', 'bullCandleWick', 'bearCandle', 'bearCandleWick',
  'volumeBull', 'volumeBear', 'lineDefault',
  'tooltipBg', 'tooltipBorder', 'tooltipText', 'selectionHighlight',
];

describe('Theme validation', () => {
  for (const theme of allThemes) {
    describe(theme.name, () => {
      it('has all required fields', () => {
        for (const field of requiredFields) {
          expect(theme[field], `${theme.name} missing ${field}`).toBeDefined();
          expect(typeof theme[field], `${theme.name}.${field} should be string`).toBe('string');
        }
      });

      it('has distinct bull/bear candle colors', () => {
        expect(theme.bullCandle).not.toBe(theme.bearCandle);
      });

      it('has distinct bull/bear volume colors', () => {
        expect(theme.volumeBull).not.toBe(theme.volumeBear);
      });
    });
  }

  it('all theme names are unique', () => {
    const names = allThemes.map(t => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('colorblind themes use blue/orange palette', () => {
    expect(colorblindDarkTheme.bullCandle).toBe('#2962FF');
    expect(colorblindDarkTheme.bearCandle).toBe('#FF6D00');
    expect(colorblindLightTheme.bullCandle).toBe('#2962FF');
    expect(colorblindLightTheme.bearCandle).toBe('#FF6D00');
  });
});
