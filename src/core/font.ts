// ── Font Manager ────────────────────────────────────────────────────────────
// Centralized font family for all chart text rendering.
// Uses theme.fontFamily when set, falls back to system sans-serif.
//
// Usage in renderers:
//   import { font } from './font';
//   ctx.font = font(11);           // '11px Inter, sans-serif'
//   ctx.font = font(11, 'bold');   // 'bold 11px Inter, sans-serif'

const DEFAULT_FONT = 'sans-serif';
let _fontFamily = DEFAULT_FONT;

/** Set the font family (called by Chart when theme changes) */
export function setFontFamily(family: string | undefined): void {
  _fontFamily = family || DEFAULT_FONT;
}

/** Build a CSS font string with the current family */
export function font(size: number, weight: '' | 'bold' = ''): string {
  return weight ? `${weight} ${size}px ${_fontFamily}` : `${size}px ${_fontFamily}`;
}
