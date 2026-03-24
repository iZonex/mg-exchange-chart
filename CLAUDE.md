# Exchange Charts

## What

Professional financial charting library for cryptocurrency exchanges. Standalone TypeScript package — zero framework dependency (works with React, Vue, vanilla JS). Canvas 2D + WebGL rendering, real-time streaming, built-in indicators, interactive drawing tools, trading integration.

**Goal:** Professional-grade open-source charting library. Feature-rich, performant, production-ready — built for crypto exchanges.

## Commands

```bash
npm install
npm run dev          # Dev server with live Binance data
npm run build        # Build library (dist/ — index + react + locales)
npm run build:demo   # Build demo for GitHub Pages
npm run test         # Run all tests (805+)
npm run typecheck    # tsc --noEmit (must be 0 errors)
npm run lint         # ESLint (must be 0 errors, 0 warnings)
```

## Quality Gates — MUST pass before every commit

1. `npx tsc --noEmit` — **0 errors**
2. `npx eslint src/` — **0 errors, 0 warnings**
3. `npx vitest run` — **all tests pass**
4. `npm run build` — **builds successfully**
5. `npm run dev` — **demo loads without console errors**

## Mandatory Code Patterns

### No hardcoded strings — use i18n

```typescript
// WRONG
ctx.fillText('LONG', x, y);
ctx.fillText('Expected Profit', x, y);

// RIGHT
import { t } from '../../core/i18n';
ctx.fillText(t('long'), x, y);
ctx.fillText(t('expectedProfit'), x, y);
```

All user-visible text must go through `t()`. New keys must be added to:
- `src/core/i18n.ts` (ChartLocale interface + English defaults)
- All 15 locale files in `src/locales/`

### No hardcoded fonts — use font()

```typescript
// WRONG
ctx.font = '11px sans-serif';
ctx.font = 'bold 14px sans-serif';

// RIGHT
import { font } from '../../core/font';
ctx.font = font(11);
ctx.font = font(14, 'bold');
```

The `font()` helper uses `theme.fontFamily` so users can customize the typeface.

### No hardcoded colors — use theme

```typescript
// WRONG
ctx.strokeStyle = '#0ecb81';
ctx.fillStyle = '#f6465d';

// RIGHT (in renderers that receive theme)
ctx.strokeStyle = theme.tpColor ?? theme.bullCandle;
ctx.fillStyle = theme.slColor ?? theme.bearCandle;

// RIGHT (in drawing tools that don't receive theme — use options.color)
ctx.strokeStyle = options.color;
```

New colors must be added to the `Theme` interface in `src/api/types.ts` as **optional** fields with fallbacks in dark.ts/light.ts.

### No console.log — use logger

```typescript
// WRONG (in src/ library code)
console.log('loaded bars');
console.warn('fallback');

// RIGHT
import { logger } from './logger';
logger.info('Loaded bars');
logger.warn('WebGL fallback');
```

Only `src/core/logger.ts` may use `console.*`. The `no-console` ESLint rule enforces this. Dev code (`dev/`) is exempt.

### Drawing tools — required structure

Every drawing tool file must:

```typescript
import { font } from '../../core/font';
import { t } from '../../core/i18n';
import { drawDataLabel } from '../primitives/label'; // for measurement labels
```

1. **Show calculations** — every tool must display relevant measurements (angle, bars, price, %, ratios). Use `drawDataLabel()` from `primitives/label.ts`.
2. **Use injected data** — chart injects real prices/bars via `_lineData`, `_rectData`, etc. from `src/core/renderer/drawing-data-injector.ts`. New tools must be added there.
3. **Show real data** — every tool must display relevant measurements (angle, bars, price, %, ratios). Study professional charting platforms for reference.

### Indicators — required structure

```typescript
export const myIndicator: Indicator = {
  name: 'Full Name',
  shortName: 'SHORT',
  description: 'One-line description',
  overlay: true,  // or false for oscillator
  params: [...],
  calculate(bars, params) { ... },
  plots: [...],
};
```

- Formulas must match TA-Lib / Investopedia reference
- Must have tests validating calculation output
- Must be added to `src/index.ts` exports
- Must be added to indicator gallery in `dev/indicator-gallery.ts`

### Types — export everything public

All public types go in `src/api/types.ts`. All exports go through `src/index.ts`. Never expose internal types.

### Tests — required for new code

- New drawing tools: pointCount, getHandles, hitTest tests
- New indicators: formula validation with edge cases
- New public API methods: unit tests
- New features: integration tests

## Architecture

```raw
src/
  api/types.ts               # All public TypeScript types
  core/
    chart.ts                  # Main Chart class (public API orchestrator)
    events.ts                 # Typed event system (ChartEventMap)
    logger.ts                 # Centralized logging (levels, custom handlers)
    font.ts                   # Centralized font() helper (uses theme.fontFamily)
    i18n.ts                   # i18n system (t() function, ChartLocale)
    undo.ts                   # Undo/redo stack for drawings
    data/                     # DataSource, BarBuffer, streaming
    interaction/              # Mouse, touch, keyboard, crosshair, scroll-zoom
    renderer/
      canvas-layer.ts         # Layered canvas system (4 layers: bg, series, crosshair, ui)
      drawing-data-injector.ts # Injects chart data into drawing tools (pure function)
      render-context.ts       # Canvas2D/WebGL abstraction
      order-lines.ts          # Order line rendering (uses theme colors)
      position-overlay.ts     # Position overlay rendering (uses theme colors)
      ...                     # grid, axes, legend, watermark, etc.
    pane/                     # Multi-pane layout manager
  indicators/
    overlays/                 # On-chart indicators (SMA, EMA, BB, etc.)
    oscillators/              # Separate-pane indicators (RSI, MACD, etc.)
    engine.ts                 # Computation engine
    registry.ts               # Custom indicator registry
  drawings/
    engine.ts                 # Drawing tool manager (state machine, z-order)
    tools/                    # All drawing tools (one file each)
    primitives/
      hit-test.ts             # Geometry: point-to-line/rect distance
      label.ts                # Shared drawDataLabel/drawBadge/drawRatioLabel
      handle.ts               # Draggable handles
      snap.ts                 # Snap-to-OHLC
  themes/                     # dark.ts, light.ts (all colors + fontFamily)
  locales/                    # 15 language packs (en, ru, zh, ja, ko, etc.)
  react/                      # React wrapper (optional peer dep)
```

## Feature Checklist

### Chart Types
- [x] Candlestick
- [x] Heikin Ashi
- [x] OHLC Bars
- [x] Line
- [x] Area
- [x] Baseline
- [ ] Hollow Candles
- [ ] Line with Markers
- [ ] Step Line
- [ ] HLC Area
- [ ] Columns
- [ ] High-Low

### Drawing Tools — Lines
- [x] Trend Line
- [x] Ray
- [x] Info Line
- [x] Extended Line
- [x] Horizontal Line
- [x] Vertical Line
- [x] Cross Line
- [x] Polyline
- [ ] Horizontal Ray
- [ ] Trend Angle

### Drawing Tools — Channels
- [x] Parallel Channel
- [x] Regression Channel (real regression + R²)
- [x] Pitchfork (Andrews')
- [ ] Schiff Pitchfork
- [ ] Modified Schiff Pitchfork
- [ ] Inside Pitchfork
- [ ] Flat Top/Bottom
- [ ] Disjoint Channel

### Drawing Tools — Fibonacci
- [x] Fib Retracement (prices at each level)
- [x] Fib Extension (prices at each level)
- [x] Fib Channel
- [x] Fib Time Zone
- [x] Fib Speed Resistance Fan
- [x] Fib Circles
- [x] Fib Spiral
- [x] Fib Speed Resistance Arcs
- [x] Fib Wedge
- [ ] Trend-Based Fib Extension
- [ ] Trend-Based Fib Time

### Drawing Tools — Gann
- [x] Gann Box
- [x] Gann Square
- [x] Gann Fan
- [ ] Gann Square Fixed

### Drawing Tools — Patterns
- [x] XABCD (with pattern type detection)
- [x] ABCD (with ratio validation)
- [x] Head & Shoulders (with target projection)
- [x] Triangle Pattern
- [x] Three Drives (with ratios)
- [ ] Cypher Pattern

### Drawing Tools — Elliott Waves
- [x] Impulse (12345) with Fib ratios
- [x] Correction (ABC) with Fib ratios
- [x] Triangle (ABCDE) with Fib ratios
- [ ] Double Combo (WXY)
- [ ] Triple Combo (WXYXZ)

### Drawing Tools — Other
- [x] Rectangle, Ellipse, Arc, Arrow, Brush
- [x] Text, Callout, Note, Flag
- [x] Long/Short Position (3 points, independent R:R)
- [x] Forecast (prices at projections)
- [x] Price Range, Date Range
- [x] Fixed Range Volume Profile
- [x] Cyclic Lines, Sine Line
- [ ] Anchored VWAP
- [ ] Date and Price Range (combo)
- [ ] Bars Pattern (Ghost Feed)
- [ ] Projection
- [ ] Time Cycles

### UI Features
- [x] Drawing floating toolbar (color, width, style, lock, visibility, delete)
- [x] Indicator gallery (search, groups, favorites, toggle switches)
- [x] Object list panel (grouped, drag reorder, visibility/lock/delete)
- [x] Right-click context menu
- [x] Magnet mode (snap to OHLC)
- [x] Screenshot export (PNG)
- [x] Compare mode
- [x] Price alerts
- [x] Dark/light themes
- [x] i18n (15 languages)
- [ ] Chart Settings modal (4 tabs: Symbol, Status line, Scales, Canvas)
- [ ] "Stay in Drawing Mode" toggle
- [ ] Weak/Strong magnet modes
- [ ] Lock all / Hide all / Remove all batch buttons
- [ ] Navigation buttons on chart (+/-, arrows, reset)
- [ ] Font size selector in text tool floating toolbar
- [ ] Copy image to clipboard
- [ ] Template save/load

### Trading
- [x] Order lines (all types, draggable, theme colors)
- [x] Position overlays (Bybit-style TP/SL zones)
- [x] Trade mode with customizable actions (onTradeAction, contextMenuItems)
- [x] Order line serialization (getOrderLines/loadOrderLines)
- [x] Trading API for exchanges (TradeOptions)

## What NOT To Do

- Do NOT add React/Vue/Angular as a dependency — core is framework-agnostic
- Do NOT use DOM elements for chart content — Canvas 2D only
- Do NOT use SVG for rendering — Canvas 2D is 10x faster
- Do NOT use `console.*` in library code — use `logger`
- Do NOT hardcode colors — use theme object
- Do NOT hardcode fonts — use `font()` helper
- Do NOT hardcode English text — use `t()` from i18n
- Do NOT hardcode 'sans-serif' — use `font()` which reads theme.fontFamily
- Do NOT skip tests — every new feature needs tests
- Do NOT skip feature comparison — check professional charting platforms for reference
- Do NOT add `any` types to public API — internal `any` is OK for Canvas operations
- Do NOT break backwards compatibility — new Theme/Locale fields must be optional
