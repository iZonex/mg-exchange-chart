# Contributing to @exchange/charts

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

```bash
git clone https://github.com/your-org/exchange-charts.git
cd exchange-charts
npm install
npm run dev          # Dev server with live Binance data
npm run test         # Run 785+ tests
npm run typecheck    # TypeScript strict check
npm run build        # Build library
```

## Project Structure

```
src/
  api/types.ts           # All public TypeScript types
  core/
    chart.ts             # Main Chart class (public API + orchestration)
    events.ts            # Typed event system
    undo.ts              # Undo/redo stack
    data/                # DataSource, BarBuffer, streaming
    interaction/         # Mouse, touch, keyboard, crosshair handlers
    renderer/            # Canvas 2D rendering (grid, axes, legends, etc.)
      drawing-data-injector.ts  # Injects chart data into drawing tools
      render-context.ts  # Abstraction over Canvas2D/WebGL
    pane/                # Multi-pane layout manager
  indicators/
    overlays/            # Indicators on price chart (SMA, EMA, BB, etc.)
    oscillators/         # Indicators in separate panes (RSI, MACD, etc.)
    engine.ts            # Indicator computation engine
    registry.ts          # Indicator registry for custom indicators
  drawings/
    engine.ts            # Drawing tool manager (state machine)
    tools/               # All 47 drawing tools (one file each)
    primitives/
      hit-test.ts        # Point-to-shape distance calculations
      label.ts           # Shared label/badge rendering utilities
      handle.ts          # Draggable handle rendering
      snap.ts            # Snap-to-OHLC logic
  themes/                # Dark + light themes
  react/                 # React wrapper (optional)

dev/                     # Demo app (not part of the library)
  main.ts                # Demo UI wiring
  trading-demo.ts        # Mock trading engine
  trading-ui.ts          # Trading UI module (toast, popups, panels)
  indicator-gallery.ts   # Indicator gallery module
  binance-datafeed.ts    # Live Binance data connection
  index.html             # Demo page

tests/                   # Vitest test suite
examples/                # Integration examples
```

## How to Add an Indicator

1. Create `src/indicators/overlays/my-indicator.ts` (overlay) or `src/indicators/oscillators/my-indicator.ts` (oscillator)
2. Implement the `Indicator` interface:

```typescript
import type { Indicator } from '../../api/types';

export const myIndicator: Indicator = {
  name: 'My Indicator',
  shortName: 'MI',
  description: 'What it does',
  overlay: true,  // true = on price chart, false = separate pane
  params: [
    { name: 'period', type: 'number', default: 14, min: 1, max: 500 },
  ],
  calculate(bars, params) {
    return bars.map((bar, i) => {
      // Your calculation here
      return { values: [result] };
    });
  },
  plots: [
    { type: 'line', color: '#2962FF', lineWidth: 2 },
  ],
};
```

3. Export from `src/index.ts`
4. Add tests in `tests/`
5. Add to the demo gallery in `dev/indicator-gallery.ts`

## How to Add a Drawing Tool

1. Create `src/drawings/tools/my-tool.ts`
2. Implement `InternalDrawingTool`:

```typescript
import type { InternalDrawingTool } from '../engine';
import { drawDataLabel } from '../primitives/label';

export const myTool: InternalDrawingTool = {
  name: 'my-tool',
  icon: 'M4,4 L20,20',  // SVG path for toolbar icon
  pointCount: 2,         // clicks needed to create

  render(ctx, points, options, width, height) {
    // Draw your tool using Canvas 2D API
    // Use drawDataLabel() for measurement labels
  },

  hitTest(mouse, points, threshold) {
    // Return true if mouse is near this drawing
    return false;
  },

  getHandles(points) {
    // Return draggable handle positions
    return points.slice(0, 2);
  },
};
```

3. Register in `src/core/chart.ts` constructor
4. Add to toolbar in `dev/index.html`
5. If the tool needs chart data (prices, bars, angles), add injection in `src/core/renderer/drawing-data-injector.ts`

## Code Style

- **TypeScript strict mode** — no `any` in library code (ok in dev/)
- **No runtime dependencies** — the library ships standalone
- **Canvas 2D** for all chart rendering — no DOM elements
- **Shared utilities** — use `src/drawings/primitives/label.ts` for badges/labels
- **Pure functions** where possible — render functions take data in, draw to ctx
- **JSDoc** on all public API methods

## Testing

```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

- All indicators must have formula validation tests
- All drawing tools must have pointCount + hitTest + getHandles tests
- New public API methods need tests
- Target: every PR should not decrease coverage

Test files go in `tests/` with `.test.ts` extension.

## Pull Request Process

1. Fork and create a branch from `main`
2. Make your changes
3. Run `npm run typecheck && npm test && npm run build`
4. Write a clear PR description explaining **what** and **why**
5. One feature per PR — keep it focused

### PR Checklist

- [ ] TypeScript compiles with no errors
- [ ] All tests pass
- [ ] New code has tests
- [ ] No `console.log` in library code
- [ ] Public API methods have JSDoc comments
- [ ] CHANGELOG.md updated (if user-facing change)

## Architecture Principles

1. **Performance first** — Canvas 2D, no DOM in render loop, requestAnimationFrame batching
2. **Framework-agnostic** — core has zero dependency on React/Vue/Angular
3. **Plugin architecture** — indicators and drawing tools are self-contained plugins
4. **Theme-driven** — all colors/fonts come from theme object, never hardcoded
5. **Event-driven** — chart emits typed events, consumers react
6. **Datafeed abstraction** — implement 3 methods to connect any backend

## Reporting Issues

Open an issue with:
- What you expected vs what happened
- Steps to reproduce
- Browser + OS version
- Screenshot if visual bug
