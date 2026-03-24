# Changelog

## [Unreleased]

### Added
- **Trading API** — customizable hooks for exchange integration
  - `TradeOptions`: `onTradeAction`, `contextMenuItems`, `onOrderLineDrag` callbacks
  - `setTradeMode(enabled, options)` with granular control (showPlusButton, showContextMenu, draggableOrderLines)
  - `getOrderLines()` / `loadOrderLines()` for serialization
  - `orderLineMoved` event for drag price updates
  - New types exported: `TradeOptions`, `TradeActionData`, `TradeContextItem`
- **Order placement popup** — qty, TP/SL fields, quick % buttons, market order confirmation dialog
- **Toast notifications** — order placed/filled, TP/SL hit, position closed
- **Position P&L panel** — live updates, close button per position
- **Order history panel** — timestamped log of all trade events
- **TP/SL preview lines** — appear on chart while typing values in popup
- **Object list panel** — right-side panel showing all drawings + indicators
  - Grouped by type (Lines, Fibonacci, Gann, Shapes, etc.)
  - Collapsible sections, drag-to-reorder z-order
  - Per-item: visibility toggle, lock, delete
- **Drawing z-order API** — `reorderDrawing()`, `bringDrawingToFront()`, `sendDrawingToBack()`
- **Drawing calculations on all 46 tools**:
  - Long/Short: 3 independent points (entry, TP, SL), dynamic R:R
  - Regression Channel: real least-squares regression, R², ±1σ/±2σ
  - XABCD: all 4 ratios + pattern type detection (Gartley/Butterfly/Bat/Crab)
  - ABCD: BC/AB + CD/AB with validation
  - Three Drives: drive + correction ratios
  - Head & Shoulders: target projection with price
  - Elliott Waves: Fibonacci ratios between legs
  - Fib Extension: actual prices at each level
  - Ray, Extended Line, Arrow: angle, bars, price change, %
  - Rectangle, Ellipse, Triangle: price range, bars, duration
  - Vertical Line, Cross Line: date/time + price badges
  - Pitchfork: angle + channel width
  - Parallel Channel: width in price + %
  - Sine Line: wavelength + amplitude
  - Cyclic Lines: interval in bars
  - Gann Square: angle labels + measurements
  - Forecast: prices at 100%/161.8% levels
  - Arc: span in bars + price
  - Fib Spiral: golden ratio, radius, turns
- **Indicator UX improvements**
  - Active count badge on toolbar button
  - "Active" section at top of gallery with toggle switches
  - Overlay/panel labels per indicator
  - FRVP removed from indicator list (it's a drawing tool)
- **785 tests** across 16 files
  - New: undo.test.ts, order-lines.test.ts, data-source.test.ts, drawing-engine.test.ts, trading-events.test.ts
- **GitHub Pages deployment** — live demo with Binance data
- **Trading integration example** — `examples/trading-integration.ts`
- **CONTRIBUTING.md** — contributor guide

### Changed
- README.md rewritten with full API reference, Trading API docs, examples
- `tradeRequested` event now includes optional `action` field for custom menu items

### Fixed
- Info line was reading wrong injected data (`_priceData` instead of `_lineData`)
- Text editing: inline overlay now matches font size/color of canvas text

### Refactored
- Extracted `src/drawings/primitives/label.ts` — shared drawDataLabel/drawBadge/drawRatioLabel across 12+ tools
- Extracted `src/core/renderer/drawing-data-injector.ts` — pure function for chart data injection (-194 lines from chart.ts)
- Decomposed `render()` into 4 layer-specific methods (background, series, crosshair, ui)
- Extracted `dev/trading-ui.ts` and `dev/indicator-gallery.ts` modules
- Removed dead `src/core/layout.ts`
- Cleaned 105 unused imports/variables

## [0.1.0] - 2026-03-24

### Added
- Core canvas rendering engine with layered dirty-flag system
- WebGL rendering engine with dedicated OHLC shaders (67x speedup at 500K bars)
- 6 chart types: Candlestick, Heikin Ashi, OHLC Bars, Line, Area, Baseline
- 21 technical indicators with computation engine
- Smart Money Concepts (SMC) indicator — Order Blocks, FVGs, BOS/CHoCH, Market Structure
- 47 interactive drawing tools with grouped toolbar and flyout menus
- Floating property editor for drawings (color, width, style, lock, delete)
- Fixed Range Volume Profile with POC, VAH, VAL
- Multi-pane layout with resize handles
- Crosshair with OHLCV tooltip and indicator values
- Real-time streaming (WebSocket bar construction)
- Pan, zoom (wheel + pinch), momentum scroll
- Mobile touch support (pinch-to-zoom, long-press crosshair)
- Dark and light themes
- Datafeed interface for any backend
- React wrapper (ChartContainer + useChart hook)
- Indicator gallery with search, groups, descriptions, favorites
- Drawing tools with real calculations (prices, percentages, R:R ratios)
- Trading/Drawing mode toggle
- State persistence to localStorage
- Hover highlight and click-to-unlock for locked drawings
- Inline text editing on canvas
- Snap-to-OHLC (magnet mode)
- Undo/redo for drawings
- Right-click context menu
- Keyboard shortcuts
- Screenshot export to PNG
- Compare mode (overlay multiple symbols)
- Order lines (draggable) and position overlays
- Price alerts
- Multi-chart layout with synced crosshair/timeframe
- WebGL benchmark page
