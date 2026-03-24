// ── Chart ───────────────────────────────────────────────────────────────────
// Main Chart class — public API entry point. Wires together:
// layers, axes, grid, series renderers, crosshair, scroll/zoom, datafeed,
// indicators, multi-pane layout, and drawing tools.

import type { Bar, ChartOptions, ChartState, ChartType, Datafeed, Indicator, Point, Theme, Timeframe, Unsubscribe } from '../api/types';
import { getIndicator } from '../indicators/registry';
import { darkTheme } from '../themes/dark';
import { lightTheme } from '../themes/light';
import { colorblindDarkTheme } from '../themes/colorblind-dark';
import { colorblindLightTheme } from '../themes/colorblind-light';
import { logger } from './logger';
import { setLocale, resetLocale } from './i18n';
import type { ChartLocale } from './i18n';
import { setFontFamily, font } from './font';
import { LayerManager } from './renderer/canvas-layer';
import type { PriceScale } from './renderer/price-axis';
import { PRICE_AXIS_WIDTH, priceToY, yToPrice, generatePriceTicks, renderPriceAxis, detectPrecision, formatPrice } from './renderer/price-axis';
import type { TimeScale } from './renderer/time-axis';
import { TIME_AXIS_HEIGHT, barIndexToX, xToBarIndex, generateTimeTicks, renderTimeAxis } from './renderer/time-axis';
import { renderGrid } from './renderer/grid';
import { renderCandlesticks } from './series/candlestick';
import { renderVolume } from './series/volume';
import { renderHeikinAshi } from './series/heikin-ashi';
import { renderLineSeries } from './series/line';
import { renderAreaSeries } from './series/area';
import { renderBarSeries } from './series/bar';
import { renderHollowCandles } from './series/hollow-candle';
import { renderLineMarkers } from './series/line-markers';
import { renderStepLine } from './series/step-line';
import { renderHlcArea } from './series/hlc-area';
import { renderColumns } from './series/columns';
import { renderHighLow } from './series/high-low';
import { DataSource } from './data/data-source';
import { ScrollZoomHandler, createDefaultTimeScale } from './interaction/scroll-zoom';
import type { CrosshairState } from './interaction/crosshair';
import { renderCrosshair } from './interaction/crosshair';
import { IndicatorEngine } from '../indicators/engine';
import { PaneManager } from './pane/pane-manager';
import { renderIndicator, getIndicatorRange } from './renderer/indicator-renderer';
import { renderOscillatorPaneSeparator } from './renderer/pane-separator';
import { renderCurrentPriceMarker } from './renderer/price-marker';
import { getReferenceLinesForIndicator, renderReferenceLines } from './renderer/reference-lines';
import { renderWatermark } from './renderer/watermark';
import { computeVolumeProfile, renderVolumeProfile } from '../indicators/volume/volume-profile';
import { injectDrawingData } from './renderer/drawing-data-injector';
import { CompareManager, renderCompareOverlays } from './compare';
import { OrderLineManager, renderOrderLines } from './renderer/order-lines';
import { renderPositionOverlay } from './renderer/position-overlay';
import type { PositionOverlayData } from './renderer/position-overlay';
import type { OrderLine } from './renderer/order-lines';
import { renderBarCountdown } from './renderer/countdown';
import { renderSessionBreaks } from './renderer/session-breaks';
import { render24hHighLow } from './renderer/high-low-markers';
import { renderOHLCVLegend, renderOverlayLegend, renderIndicatorLegend } from './renderer/legend';
import { DrawingEngine } from '../drawings/engine';
import { horizontalLineTool } from '../drawings/tools/horizontal-line';
import { trendLineTool } from '../drawings/tools/trend-line';
import { rectangleTool } from '../drawings/tools/rectangle';
import { fibRetracementTool } from '../drawings/tools/fib-retracement';
import { textAnnotationTool } from '../drawings/tools/text-annotation';
import { rayTool } from '../drawings/tools/ray';
import { fibExtensionTool } from '../drawings/tools/fib-extension';
import { longShortTool } from '../drawings/tools/long-short';
import { priceRangeTool } from '../drawings/tools/price-range';
import { arrowTool } from '../drawings/tools/arrow';
import { calloutTool } from '../drawings/tools/callout';
import { parallelChannelTool } from '../drawings/tools/parallel-channel';
import { brushTool } from '../drawings/tools/brush';
import { ellipseTool } from '../drawings/tools/ellipse';
import { verticalLineTool } from '../drawings/tools/vertical-line';
import { crossLineTool } from '../drawings/tools/cross-line';
import { extendedLineTool } from '../drawings/tools/extended-line';
import { polylineTool } from '../drawings/tools/polyline';
import { pitchforkTool } from '../drawings/tools/pitchfork';
import { gannFanTool } from '../drawings/tools/gann-fan';
import { gannBoxTool } from '../drawings/tools/gann-box';
import { triangleTool } from '../drawings/tools/triangle';
import { renderPaneControls, hitTestPaneControls } from './renderer/pane-controls';
import { xabcdPatternTool } from '../drawings/tools/xabcd-pattern';
import { headShouldersTool } from '../drawings/tools/head-shoulders';
import { regressionChannelTool } from '../drawings/tools/regression-channel';
import { flagMarkerTool } from '../drawings/tools/flag-marker';
import { elliottImpulseTool, elliottCorrectionTool, elliottTriangleTool } from '../drawings/tools/elliott-wave';
import { fibChannelTool } from '../drawings/tools/fib-channel';
import { fibCirclesTool } from '../drawings/tools/fib-circles';
import { dateRangeTool } from '../drawings/tools/date-range';
import { forecastTool } from '../drawings/tools/forecast';
import { fibTimeZoneTool } from '../drawings/tools/fib-timezone';
import { fibArcsTool } from '../drawings/tools/fib-arcs';
import { fibWedgeTool } from '../drawings/tools/fib-wedge';
import { gannSquareTool } from '../drawings/tools/gann-square';
import { cyclicLinesTool } from '../drawings/tools/cyclic-lines';
import { sineLineTool } from '../drawings/tools/sine-line';
import { abcdPatternTool } from '../drawings/tools/abcd-pattern';
import { infoLineTool } from '../drawings/tools/info-line';
import { fibSpiralTool } from '../drawings/tools/fib-spiral';
import { fibSpeedFanTool } from '../drawings/tools/fib-speed-fan';
import { threeDrivesTool } from '../drawings/tools/three-drives';
import { noteTool } from '../drawings/tools/note';
import { arcTool } from '../drawings/tools/arc';
import { fixedRangeVPTool } from '../drawings/tools/fixed-range-vp';
import { horizontalRayTool } from '../drawings/tools/horizontal-ray';
import { trendAngleTool } from '../drawings/tools/trend-angle';
import { datePriceRangeTool } from '../drawings/tools/date-price-range';
import { schiffPitchforkTool } from '../drawings/tools/schiff-pitchfork';
import { anchoredVwapTool } from '../drawings/tools/anchored-vwap';
import { flatTopBottomTool } from '../drawings/tools/flat-top-bottom';
import { disjointChannelTool } from '../drawings/tools/disjoint-channel';
import { modifiedSchiffPitchforkTool } from '../drawings/tools/modified-schiff-pitchfork';
import { insidePitchforkTool } from '../drawings/tools/inside-pitchfork';
import { trendFibExtensionTool } from '../drawings/tools/trend-fib-extension';
import { trendFibTimeTool } from '../drawings/tools/trend-fib-time';
import { cypherPatternTool } from '../drawings/tools/cypher-pattern';
import { elliottDoubleComboTool } from '../drawings/tools/elliott-double-combo';
import { elliottTripleComboTool } from '../drawings/tools/elliott-triple-combo';
import { gannSquareFixedTool } from '../drawings/tools/gann-square-fixed';
import { timeCyclesTool } from '../drawings/tools/time-cycles';
import { barsPatternTool } from '../drawings/tools/bars-pattern';
import { renderHandle } from '../drawings/primitives/handle';
import { snapToOHLC } from '../drawings/primitives/snap';
import { KeyboardHandler } from './interaction/keyboard';
import { PriceScaleDragHandler } from './interaction/price-scale-drag';
import { TouchHandler } from './interaction/touch-handler';
import { ContextMenu, getDrawingContextMenuItems } from './interaction/context-menu';
import { IndicatorSettingsPopup } from './interaction/indicator-settings';
import { exportChartToPNG, copyChartToClipboard } from './screenshot';
import { AlertManager } from './alerts';
import { UndoStack } from './undo';
import { EventEmitter } from './events';
import type { ChartEventMap } from './events';

export class Chart {
  /** Set library-wide log level: 'debug' | 'info' | 'warn' | 'error' | 'none' */
  static setLogLevel(level: import('./logger').LogLevel): void { logger.setLevel(level); }
  /** Set custom log handler (e.g. for Sentry, DataDog) */
  static setLogHandler(handler: ((level: string, message: string, ...args: any[]) => void) | null): void { logger.setHandler(handler as any); }
  /** Set chart locale (partial — override only the keys you need) */
  static setLocale(locale: Partial<ChartLocale>): void { setLocale(locale); }
  /** Reset locale to English defaults */
  static resetLocale(): void { resetLocale(); }

  private container: HTMLElement;
  private layers: LayerManager;
  private dataSource = new DataSource();
  private theme: Theme;
  private timeframe: Timeframe;
  private symbol: string;
  private datafeed: Datafeed;
  private precision: number;
  private chartType: ChartType;

  private priceScale: PriceScale = { min: 0, max: 1, mode: 'linear' };
  private timeScale: TimeScale = { firstIndex: 0, visibleCount: 100, barSpacing: 8, offsetX: 0 };

  private scrollZoom: ScrollZoomHandler;
  private crosshair: CrosshairState = { x: 0, y: 0, visible: false, barIndex: -1, bar: null };

  private indicatorEngine = new IndicatorEngine();
  private paneManager = new PaneManager();
  private drawingEngine = new DrawingEngine();
  private compareManager = new CompareManager();
  private orderLineManager = new OrderLineManager();
  private alertManager: AlertManager;
  private _lastAlertPrice = 0;
  private undoStack = new UndoStack();
  private keyboard: KeyboardHandler;
  private priceScaleDrag: PriceScaleDragHandler;
  private touchHandler: TouchHandler;
  private manualPriceScale = false;
  private events = new EventEmitter();

  private rafId = 0;
  private needsRender = false;
  private autoScroll = true;
  private _loadingHistory = false;
  private _showVolumeProfile = false;
  private _showCountdown = true;
  private _showHighLow = false;
  private _showPriceLine = true;
  private _showGridVert = true;
  private _showGridHoriz = true;
  private _showSessionBreaks = false;
  private _showWatermark = true;
  private _showOhlcvLegend = true;
  private _showOverlayLegend = true;
  private _showIndicatorLegend = true;
  private _showBarChange = true;
  private _showVolume = true;
  private _magnetMode = true; // snap to OHLC by default
  private _stayInDrawingMode = false;
  private _activeToolName: string | null = null;
  private countdownTimer = 0;
  private _goLiveBtn: { x: number; y: number; w: number; h: number } | null = null;
  private _draggingOrderLine: { id: string; startY: number } | null = null;
  private _hoveredDrawingId: string | null = null;
  private _drawingInteraction = true;
  private _tradeMode = false;
  private _tradeOptions: import('../api/types').TradeOptions = {
    showPlusButton: true,
    showContextMenu: true,
    draggableOrderLines: true,
  };
  private _tradeHoverY: number | null = null;
  private _pendingTradePrice: number | null = null;
  private _resizingPane: { index: number; startY: number } | null = null;
  private contextMenu: ContextMenu;
  private indicatorSettings: IndicatorSettingsPopup;
  private _positionOverlays: PositionOverlayData[] = [];
  private _priceMarkers: { price: number; label: string; color: string }[] = [];
  private _barMarkers: { time: number; label: string; color: string; position: 'above' | 'below' }[] = [];
  private unsubscribeStream: Unsubscribe | null = null;
  private resizeObserver: ResizeObserver;

  // ── Chart area dimensions (excluding axes) ────────────────────────────────
  private get chartWidth(): number { return this.layers.width - PRICE_AXIS_WIDTH; }
  private get chartHeight(): number { return this.layers.height - TIME_AXIS_HEIGHT; }

  constructor(options: ChartOptions) {
    // Resolve container
    if (typeof options.container === 'string') {
      const el = document.querySelector(options.container);
      if (!el || !(el instanceof HTMLElement)) throw new Error(`Container not found: ${options.container}`);
      this.container = el;
    } else {
      this.container = options.container;
    }

    // Ensure container is positioned for absolute children
    const pos = getComputedStyle(this.container).position;
    if (pos === 'static') this.container.style.position = 'relative';

    // Config
    this.symbol = options.symbol;
    this.timeframe = options.timeframe;
    this.datafeed = options.datafeed;
    this.precision = options.pricePrecision ?? 2;
    this.chartType = options.chartType ?? 'candlestick';
    this.theme = resolveTheme(options.theme);
    setFontFamily(this.theme.fontFamily);

    // Apply initial feature flags
    if (options.features) {
      const f = options.features;
      if (f.volume !== undefined) this._showVolume = f.volume;
      if (f.gridVertical !== undefined) this._showGridVert = f.gridVertical;
      if (f.gridHorizontal !== undefined) this._showGridHoriz = f.gridHorizontal;
      if (f.countdown !== undefined) this._showCountdown = f.countdown;
      if (f.highLow !== undefined) this._showHighLow = f.highLow;
      if (f.priceLine !== undefined) this._showPriceLine = f.priceLine;
      if (f.sessionBreaks !== undefined) this._showSessionBreaks = f.sessionBreaks;
      if (f.watermark !== undefined) this._showWatermark = f.watermark;
      if (f.ohlcvLegend !== undefined) this._showOhlcvLegend = f.ohlcvLegend;
      if (f.overlayLegend !== undefined) this._showOverlayLegend = f.overlayLegend;
      if (f.indicatorLegend !== undefined) this._showIndicatorLegend = f.indicatorLegend;
      if (f.barChange !== undefined) this._showBarChange = f.barChange;
    }

    // Alerts
    this.alertManager = new AlertManager((alert) => {
      logger.info(`Alert triggered: ${alert.label}`);
      // Remove the visual line
      this.removeOrderLine(alert.id);
    });

    // Compare manager
    this.compareManager.setDatafeed(this.datafeed, this.timeframe);

    // Register built-in drawing tools
    this.drawingEngine.registerTool(horizontalLineTool);
    this.drawingEngine.registerTool(trendLineTool);
    this.drawingEngine.registerTool(rectangleTool);
    this.drawingEngine.registerTool(fibRetracementTool);
    this.drawingEngine.registerTool(textAnnotationTool);
    this.drawingEngine.registerTool(rayTool);
    this.drawingEngine.registerTool(fibExtensionTool);
    this.drawingEngine.registerTool(longShortTool);
    this.drawingEngine.registerTool(priceRangeTool);
    this.drawingEngine.registerTool(arrowTool);
    this.drawingEngine.registerTool(calloutTool);
    this.drawingEngine.registerTool(parallelChannelTool);
    this.drawingEngine.registerTool(brushTool);
    this.drawingEngine.registerTool(ellipseTool);
    this.drawingEngine.registerTool(verticalLineTool);
    this.drawingEngine.registerTool(crossLineTool);
    this.drawingEngine.registerTool(extendedLineTool);
    this.drawingEngine.registerTool(polylineTool);
    this.drawingEngine.registerTool(pitchforkTool);
    this.drawingEngine.registerTool(gannFanTool);
    this.drawingEngine.registerTool(gannBoxTool);
    this.drawingEngine.registerTool(triangleTool);
    this.drawingEngine.registerTool(xabcdPatternTool);
    this.drawingEngine.registerTool(headShouldersTool);
    this.drawingEngine.registerTool(regressionChannelTool);
    this.drawingEngine.registerTool(flagMarkerTool);
    this.drawingEngine.registerTool(elliottImpulseTool);
    this.drawingEngine.registerTool(elliottCorrectionTool);
    this.drawingEngine.registerTool(elliottTriangleTool);
    this.drawingEngine.registerTool(fibChannelTool);
    this.drawingEngine.registerTool(fibCirclesTool);
    this.drawingEngine.registerTool(dateRangeTool);
    this.drawingEngine.registerTool(forecastTool);
    this.drawingEngine.registerTool(fibTimeZoneTool);
    this.drawingEngine.registerTool(fibArcsTool);
    this.drawingEngine.registerTool(fibWedgeTool);
    this.drawingEngine.registerTool(gannSquareTool);
    this.drawingEngine.registerTool(cyclicLinesTool);
    this.drawingEngine.registerTool(sineLineTool);
    this.drawingEngine.registerTool(abcdPatternTool);
    this.drawingEngine.registerTool(infoLineTool);
    this.drawingEngine.registerTool(fibSpiralTool);
    this.drawingEngine.registerTool(fibSpeedFanTool);
    this.drawingEngine.registerTool(threeDrivesTool);
    this.drawingEngine.registerTool(noteTool);
    this.drawingEngine.registerTool(arcTool);
    this.drawingEngine.registerTool(fixedRangeVPTool);
    this.drawingEngine.registerTool(horizontalRayTool);
    this.drawingEngine.registerTool(trendAngleTool);
    this.drawingEngine.registerTool(datePriceRangeTool);
    this.drawingEngine.registerTool(schiffPitchforkTool);
    this.drawingEngine.registerTool(anchoredVwapTool);
    this.drawingEngine.registerTool(flatTopBottomTool);
    this.drawingEngine.registerTool(disjointChannelTool);
    this.drawingEngine.registerTool(modifiedSchiffPitchforkTool);
    this.drawingEngine.registerTool(insidePitchforkTool);
    this.drawingEngine.registerTool(trendFibExtensionTool);
    this.drawingEngine.registerTool(trendFibTimeTool);
    this.drawingEngine.registerTool(cypherPatternTool);
    this.drawingEngine.registerTool(elliottDoubleComboTool);
    this.drawingEngine.registerTool(elliottTripleComboTool);
    this.drawingEngine.registerTool(gannSquareFixedTool);
    this.drawingEngine.registerTool(timeCyclesTool);
    this.drawingEngine.registerTool(barsPatternTool);

    // Layers (with optional WebGL backend for the series layer)
    this.layers = new LayerManager(this.container, options.renderer ?? 'canvas2d');

    // Time scale default
    this.timeScale = createDefaultTimeScale(0, this.chartWidth);

    const uiCanvas = this.layers.get('ui').canvas;

    // IMPORTANT: Drawing mousedown must be registered BEFORE ScrollZoomHandler
    // so hit-testing drawings can disable scroll before scrollZoom captures the event
    uiCanvas.addEventListener('mousedown', this.onDrawingMouseDown);

    // Scroll/zoom
    this.scrollZoom = new ScrollZoomHandler(
      uiCanvas,
      { timeScale: this.timeScale, totalBars: 0 },
      (scale) => {
        this.timeScale = scale;
        const rightEdge = this.dataSource.length - scale.visibleCount;
        this.autoScroll = scale.firstIndex >= rightEdge - 2;
        // Scroll-back: load more history when near the left edge
        if (scale.firstIndex <= 10 && !this._loadingHistory) {
          this.loadMoreHistory();
        }
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
      },
    );

    // Mouse events
    uiCanvas.addEventListener('mousemove', this.onMouseMove);
    uiCanvas.addEventListener('mouseleave', this.onMouseLeave);
    uiCanvas.addEventListener('mouseup', this.onDrawingMouseUp);
    uiCanvas.addEventListener('click', this.onDrawingClick);
    uiCanvas.addEventListener('dblclick', this.onDoubleClick);
    uiCanvas.addEventListener('contextmenu', this.onContextMenu);

    // Context menu
    this.contextMenu = new ContextMenu(this.container, (action, drawingId) => {
      this.handleContextMenuAction(action, drawingId);
    });

    // Indicator settings popup
    this.indicatorSettings = new IndicatorSettingsPopup(
      this.container,
      (id, params) => { this.updateIndicatorParams(id, params); },
      (id) => { this.removeIndicator(id); },
    );

    // Keyboard shortcuts
    this.keyboard = new KeyboardHandler(this.container, (action) => this.onKeyAction(action));

    // Price axis drag to scale Y
    this.priceScaleDrag = new PriceScaleDragHandler(uiCanvas, this.chartWidth, {
      onScale: (factor) => {
        this.manualPriceScale = true;
        const mid = (this.priceScale.max + this.priceScale.min) / 2;
        const halfRange = (this.priceScale.max - this.priceScale.min) / 2 * factor;
        this.priceScale = { ...this.priceScale, min: mid - halfRange, max: mid + halfRange };
        this.layers.markAllDirty();
        this.scheduleRender();
      },
      onAutoFit: () => {
        this.manualPriceScale = false;
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
      },
    });

    // Touch handler (mobile: long-press crosshair, double-tap reset, pinch zoom)
    this.touchHandler = new TouchHandler(uiCanvas, {
      onPan: (dx) => {
        const scale = this.timeScale;
        const barShift = dx / scale.barSpacing;
        scale.firstIndex -= barShift;
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
      },
      onPinch: (scale, _centerX) => {
        const ts = this.timeScale;
        const newSpacing = Math.max(2, Math.min(60, ts.barSpacing * scale));
        ts.barSpacing = newSpacing;
        ts.visibleCount = Math.ceil(this.chartWidth / newSpacing);
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
      },
      onLongPress: (x, y) => {
        this.crosshair = { x, y, visible: true, barIndex: Math.round(xToBarIndex(x, this.timeScale)), bar: this.dataSource.getBar(Math.round(xToBarIndex(x, this.timeScale))) ?? null };
        this.layers.markDirty('crosshair');
        this.scheduleRender();
      },
      onLongPressMove: (x, y) => {
        const barIdx = Math.round(xToBarIndex(x, this.timeScale));
        this.crosshair = { x, y, visible: true, barIndex: barIdx, bar: this.dataSource.getBar(barIdx) ?? null };
        this.layers.markDirty('crosshair');
        this.scheduleRender();
      },
      onLongPressEnd: () => {
        this.crosshair.visible = false;
        this.layers.markDirty('crosshair');
        this.scheduleRender();
      },
      onDoubleTap: () => {
        this.manualPriceScale = false;
        this.fitToData();
      },
      onMomentum: (_velocity) => {
        // Momentum is already handled by ScrollZoomHandler
      },
    });

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.layers.resize();
      this.timeScale.visibleCount = Math.ceil(this.chartWidth / this.timeScale.barSpacing);
      this.paneManager.setHeight(this.chartHeight);
      this.recalcPriceRange();
      this.layers.markAllDirty();
      this.scheduleRender();
    });
    this.resizeObserver.observe(this.container);

    // Countdown timer — refresh every second
    this.countdownTimer = window.setInterval(() => {
      this.layers.markDirty('background');
      this.scheduleRender();
    }, 1000);

    // Load data
    this.loadInitialData();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Set chart data directly (alternative to datafeed) */
  setData(bars: Bar[]): void {
    this.dataSource.setData(bars);
    if (bars.length > 0 && this.precision === 2) {
      this.precision = detectPrecision(bars[0]!.close);
    }
    this.recomputeIndicators();
    this.fitToData();
  }

  /** Update the last bar or add a new bar (real-time) */
  updateBar(bar: Bar): void {
    const prevLen = this.dataSource.length;
    this.dataSource.updateLast(bar);

    // Auto-scroll if pinned to right edge and a new bar was added
    if (this.autoScroll && this.dataSource.length > prevLen) {
      this.timeScale.firstIndex = Math.max(0, this.dataSource.length - this.timeScale.visibleCount);
      this.scrollZoom.updateState({ timeScale: this.timeScale, totalBars: this.dataSource.length });
    }

    this.recomputeIndicators();
    this.recalcPriceRange();
    this.layers.markDirty('series');
    this.layers.markDirty('crosshair');
    this.layers.markDirty('background');
    this.scheduleRender();
    this.events.emit('barUpdate', bar);

    // Check price alerts
    this.alertManager.check(this._lastAlertPrice, bar.close);
    this._lastAlertPrice = bar.close;
  }

  /** Add an indicator to the chart. Returns instance ID for later removal. */
  addIndicator(indicator: Indicator, params?: Record<string, number | string | boolean>): string {
    const id = this.indicatorEngine.add(indicator, params);
    if (!indicator.overlay) {
      this.paneManager.addOscillatorPane(id);
      this.paneManager.setHeight(this.chartHeight);
    }
    this.recomputeIndicators();
    this.layers.markAllDirty();
    this.scheduleRender();
    this.events.emit('indicatorAdded', { id, name: indicator.name });
    return id;
  }

  /** Remove an indicator by its instance ID */
  removeIndicator(id: string): void {
    const inst = this.indicatorEngine.get(id);
    if (!inst) return;
    if (!inst.indicator.overlay) {
      this.paneManager.removePane(id);
      this.paneManager.setHeight(this.chartHeight);
    }
    this.indicatorEngine.remove(id);
    this.layers.markAllDirty();
    this.scheduleRender();
    this.events.emit('indicatorRemoved', id);
  }

  /** Update indicator parameters */
  updateIndicatorParams(id: string, params: Record<string, number | string | boolean>): void {
    this.indicatorEngine.updateParams(id, params);
    this.recomputeIndicators();
    this.layers.markAllDirty();
    this.scheduleRender();
  }

  /** Subscribe to chart events */
  on<K extends keyof ChartEventMap>(event: K, listener: (data: ChartEventMap[K]) => void): void {
    this.events.on(event, listener);
  }

  /** Unsubscribe from chart events */
  off<K extends keyof ChartEventMap>(event: K, listener: (data: ChartEventMap[K]) => void): void {
    this.events.off(event, listener);
  }

  /** Jump to the latest bar and re-enable auto-scroll */
  goToLive(): void {
    this.autoScroll = true;
    this.timeScale.firstIndex = Math.max(0, this.dataSource.length - this.timeScale.visibleCount);
    this.scrollZoom.updateState({ timeScale: this.timeScale, totalBars: this.dataSource.length });
    this.recalcPriceRange();
    this.layers.markAllDirty();
    this.scheduleRender();
  }

  /** Zoom in (show fewer bars, more detail) */
  zoomIn(factor = 0.8): void {
    const newCount = Math.max(10, Math.floor(this.timeScale.visibleCount * factor));
    const center = this.timeScale.firstIndex + this.timeScale.visibleCount / 2;
    this.timeScale.visibleCount = newCount;
    this.timeScale.firstIndex = Math.max(0, center - newCount / 2);
    this.scrollZoom.updateState({ timeScale: this.timeScale, totalBars: this.dataSource.length });
    this.recalcPriceRange();
    this.layers.markAllDirty();
    this.scheduleRender();
  }

  /** Zoom out (show more bars, less detail) */
  zoomOut(factor = 1.25): void {
    this.zoomIn(factor);
  }

  /** Scroll chart left by N bars */
  scrollLeft(bars = 20): void {
    this.autoScroll = false;
    this.timeScale.firstIndex = Math.max(0, this.timeScale.firstIndex - bars);
    this.scrollZoom.updateState({ timeScale: this.timeScale, totalBars: this.dataSource.length });
    this.recalcPriceRange();
    this.layers.markAllDirty();
    this.scheduleRender();
  }

  /** Scroll chart right by N bars */
  scrollRight(bars = 20): void {
    const maxFirst = Math.max(0, this.dataSource.length - this.timeScale.visibleCount / 2);
    this.timeScale.firstIndex = Math.min(maxFirst, this.timeScale.firstIndex + bars);
    if (this.timeScale.firstIndex >= this.dataSource.length - this.timeScale.visibleCount) {
      this.autoScroll = true;
    }
    this.scrollZoom.updateState({ timeScale: this.timeScale, totalBars: this.dataSource.length });
    this.recalcPriceRange();
    this.layers.markAllDirty();
    this.scheduleRender();
  }

  /** Reset zoom to show default bar count and go to live */
  resetZoom(): void {
    this.timeScale.visibleCount = 200;
    this.goToLive();
  }

  /** Show data for the last N seconds (e.g., 86400 for 1 day, 2592000 for 30 days) */
  setVisibleRange(seconds: number): void {
    const now = Math.floor(Date.now() / 1000);
    const fromTime = now - seconds;
    const fromIdx = this.dataSource.nearestIndex(fromTime);
    const toIdx = this.dataSource.length;
    if (fromIdx >= 0) {
      this.timeScale.firstIndex = Math.max(0, fromIdx);
      this.timeScale.visibleCount = toIdx - fromIdx;
      this.autoScroll = true;
      this.scrollZoom.updateState({ timeScale: this.timeScale, totalBars: this.dataSource.length });
      this.recalcPriceRange();
      this.layers.markAllDirty();
      this.scheduleRender();
    }
  }

  /**
   * Add price level markers on the price axis (bid, ask, mark, index, etc.)
   * These are separate from order lines — they're informational labels.
   */
  setPriceMarkers(markers: { price: number; label: string; color: string }[]): void {
    this._priceMarkers = markers;
    this.layers.markDirty('crosshair');
    this.scheduleRender();
  }

  /**
   * Add annotation markers on specific bars (Buy/Sell signals, events).
   * Each marker appears above or below the bar.
   */
  setBarMarkers(markers: { time: number; label: string; color: string; position: 'above' | 'below' }[]): void {
    this._barMarkers = markers;
    this.layers.markDirty('series');
    this.scheduleRender();
  }

  /** Add a compare symbol overlay */
  async addCompare(symbol: string): Promise<void> {
    await this.compareManager.add(symbol);
    this.layers.markDirty('series');
    this.scheduleRender();
  }

  /** Remove a compare symbol */
  removeCompare(symbol: string): void {
    this.compareManager.remove(symbol);
    this.layers.markDirty('series');
    this.scheduleRender();
  }

  /** Add an order/position line */
  addOrderLine(line: OrderLine): void {
    this.orderLineManager.add(line);
    this.layers.markDirty('series');
    this.scheduleRender();
  }

  /** Remove an order line */
  removeOrderLine(id: string): void {
    this.orderLineManager.remove(id);
    this.layers.markDirty('series');
    this.scheduleRender();
  }

  /** Update an order line */
  updateOrderLine(id: string, updates: Partial<OrderLine>): void {
    this.orderLineManager.update(id, updates);
    this.layers.markDirty('series');
    this.scheduleRender();
  }

  /** Set position overlays (Bybit-style zones with TP/SL shading + PnL) */
  setPositionOverlays(positions: PositionOverlayData[]): void {
    this._positionOverlays = positions;
    this.layers.markDirty('series');
    this.scheduleRender();
  }

  /** Clear all order lines */
  clearOrderLines(): void {
    this.orderLineManager.clear();
    this.layers.markDirty('series');
    this.scheduleRender();
  }

  /** Get all order lines (for serialization) */
  getOrderLines(): OrderLine[] {
    return this.orderLineManager.getAll();
  }

  /** Load order lines from serialized data */
  loadOrderLines(lines: OrderLine[]): void {
    this.orderLineManager.clear();
    for (const line of lines) this.orderLineManager.add(line);
    this.layers.markDirty('series');
    this.scheduleRender();
  }

  /** Toggle magnet mode (snap drawings to OHLC) */
  /** Set price scale mode: linear, logarithmic, or percentage */
  setPriceScale(mode: 'linear' | 'logarithmic' | 'percentage'): void {
    this.priceScale = { ...this.priceScale, mode };
    this.manualPriceScale = false;
    this.recalcPriceRange();
    this.layers.markAllDirty();
    this.scheduleRender();
  }

  setMagnetMode(enabled: boolean): void {
    this._magnetMode = enabled;
  }

  /** When enabled, drawing tool stays active after completing a drawing */
  setStayInDrawingMode(enabled: boolean): void {
    this._stayInDrawingMode = enabled;
  }

  /** Lock all drawings */
  lockAllDrawings(): void {
    for (const d of this.drawingEngine.getAllInstances()) {
      if (!d.locked) this.drawingEngine.toggleLock(d.id);
    }
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Unlock all drawings */
  unlockAllDrawings(): void {
    for (const d of this.drawingEngine.getAllInstances()) {
      if (d.locked) this.drawingEngine.toggleLock(d.id);
    }
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Hide all drawings */
  hideAllDrawings(): void {
    for (const d of this.drawingEngine.getAllInstances()) {
      if (d.visible) this.drawingEngine.toggleVisible(d.id);
    }
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Show all drawings */
  showAllDrawings(): void {
    for (const d of this.drawingEngine.getAllInstances()) {
      if (!d.visible) this.drawingEngine.toggleVisible(d.id);
    }
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Enable/disable drawing interactions (selection, editing, creation) */
  setDrawingInteraction(enabled: boolean): void {
    this._drawingInteraction = enabled;
    if (!enabled) {
      // Deselect and cancel any active drawing
      this.drawingEngine.cancelCreating();
      this.drawingEngine.deselect();
      this.events.emit('drawingDeselected', undefined);
      this.layers.markDirty('ui');
      this.scheduleRender();
    }
  }

  /** Calculate price tick step for trade hover snapping */
  private _tradeTickStep(): number {
    const range = this.priceScale.max - this.priceScale.min;
    if (range <= 0) return 1;
    // Use same nice step as price axis ticks
    const mainH = this.paneManager.getMain().height || this.chartHeight;
    const rawStep = range / (mainH / 40);
    const exp = Math.floor(Math.log10(rawStep));
    const frac = rawStep / Math.pow(10, exp);
    let nice: number;
    if (frac <= 1.5) nice = 1;
    else if (frac <= 3.5) nice = 2;
    else if (frac <= 7.5) nice = 5;
    else nice = 10;
    return nice * Math.pow(10, exp);
  }

  /** Enable/disable trade mode (price axis +, right-click trade menu) */
  setTradeMode(enabled: boolean, options?: Partial<import('../api/types').TradeOptions>): void {
    this._tradeMode = enabled;
    if (options) Object.assign(this._tradeOptions, options);
    this._tradeHoverY = null;
    this.layers.markDirty('crosshair');
    this.scheduleRender();
  }

  /** Update trade options without toggling mode */
  setTradeOptions(options: Partial<import('../api/types').TradeOptions>): void {
    Object.assign(this._tradeOptions, options);
  }

  /** Update chart feature flags */
  setFeatures(features: Partial<import('../api/types').ChartFeatures>): void {
    if (features.volume !== undefined) this._showVolume = features.volume;
    if (features.gridVertical !== undefined) this._showGridVert = features.gridVertical;
    if (features.gridHorizontal !== undefined) this._showGridHoriz = features.gridHorizontal;
    if (features.countdown !== undefined) this._showCountdown = features.countdown;
    if (features.highLow !== undefined) this._showHighLow = features.highLow;
    if (features.priceLine !== undefined) this._showPriceLine = features.priceLine;
    if (features.sessionBreaks !== undefined) this._showSessionBreaks = features.sessionBreaks;
    if (features.watermark !== undefined) this._showWatermark = features.watermark;
    if (features.ohlcvLegend !== undefined) this._showOhlcvLegend = features.ohlcvLegend;
    if (features.overlayLegend !== undefined) this._showOverlayLegend = features.overlayLegend;
    if (features.indicatorLegend !== undefined) this._showIndicatorLegend = features.indicatorLegend;
    if (features.barChange !== undefined) this._showBarChange = features.barChange;
    this.layers.markDirty('background');
    this.layers.markDirty('series');
    this.layers.markDirty('crosshair');
    this.scheduleRender();
  }

  /** Toggle Volume Profile overlay */
  setVolumeProfile(enabled: boolean): void {
    this._showVolumeProfile = enabled;
    this.layers.markDirty('series');
    this.scheduleRender();
  }

  /** Change chart type */
  setChartType(type: ChartType): void {
    this.chartType = type;
    this.layers.markDirty('series');
    this.scheduleRender();
    this.events.emit('chartTypeChange', type);
  }

  // ── Drawing Public API ──────────────────────────────────────────────────

  /** Activate a drawing tool by name. Pass null to deactivate. */
  setDrawingTool(toolName: string | null): void {
    this._activeToolName = toolName;
    if (toolName === null) {
      this.drawingEngine.cancelCreating();
      this.scrollZoom.enabled = true;
    } else {
      this.drawingEngine.startCreating(toolName);
      this.scrollZoom.enabled = false;
    }
    const uiCanvas = this.layers.get('ui').canvas;
    uiCanvas.style.cursor = toolName ? 'crosshair' : 'default';
  }

  /** Get all drawings as serializable objects */
  getDrawings(): object[] {
    return this.drawingEngine.serialize();
  }

  /** Get all drawing instances (including hidden) for object list */
  getDrawingInstances(): { id: string; toolName: string; locked: boolean; visible: boolean; options: any }[] {
    return this.drawingEngine.getAllInstances();
  }

  /** Load drawings from serialized data */
  loadDrawings(data: object[]): void {
    this.drawingEngine.deserialize(data);
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Remove a specific drawing */
  removeDrawing(id: string): void {
    this.drawingEngine.remove(id);
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Clear all drawings */
  clearDrawings(): void {
    this.drawingEngine.clear();
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Update selected drawing properties */
  updateDrawing(id: string, opts: { color?: string; lineWidth?: number; lineStyle?: 'solid' | 'dashed' | 'dotted'; text?: string }): void {
    this.drawingEngine.updateOptions(id, opts);
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Toggle drawing lock */
  toggleDrawingLock(id: string): void {
    this.drawingEngine.toggleLock(id);
    // Deselect after locking — hides handles
    const d = this.drawingEngine.get(id);
    if (d?.locked) {
      this.drawingEngine.deselect();
      this.events.emit('drawingDeselected', undefined);
    }
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Toggle drawing visibility */
  toggleDrawingVisible(id: string): void {
    this.drawingEngine.toggleVisible(id);
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Get selected drawing */
  getSelectedDrawing(): { id: string; toolName: string; options: any; locked: boolean; visible: boolean } | null {
    return this.drawingEngine.getSelected();
  }

  /** Reorder drawing z-index */
  reorderDrawing(id: string, toIndex: number): void {
    this.drawingEngine.reorder(id, toIndex);
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Bring drawing to front */
  bringDrawingToFront(id: string): void {
    this.drawingEngine.bringToFront(id);
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Send drawing to back */
  sendDrawingToBack(id: string): void {
    this.drawingEngine.sendToBack(id);
    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  /** Change symbol */
  async setSymbol(symbol: string): Promise<void> {
    this.symbol = symbol;
    this.unsubscribeStream?.();
    await this.loadInitialData();
  }

  /** Change timeframe */
  async setTimeframe(timeframe: Timeframe): Promise<void> {
    this.timeframe = timeframe;
    this.unsubscribeStream?.();
    await this.loadInitialData();
  }

  /** Add a price alert */
  addAlert(price: number, direction?: 'crossing' | 'above' | 'below', label?: string): string {
    const id = this.alertManager.add(price, direction, label);
    // Show as order line
    this.addOrderLine({ id, price, type: 'limit', side: 'buy', label: label ?? `Alert @ ${price.toFixed(2)}` });
    return id;
  }

  /** Remove a price alert */
  removeAlert(id: string): void {
    this.alertManager.remove(id);
    this.removeOrderLine(id);
  }

  /** Export chart as PNG */
  exportPNG(filename?: string): void {
    exportChartToPNG(this.container, filename);
  }

  /** Copy chart image to clipboard */
  async copyPNG(): Promise<void> {
    await copyChartToClipboard(this.container);
  }

  /** Change theme */
  setTheme(theme: ThemeName | Theme): void {
    this.theme = resolveTheme(theme);
    setFontFamily(this.theme.fontFamily);
    this.layers.markAllDirty();
    this.scheduleRender();
  }

  // ── State Getters ────────────────────────────────────────────────────────

  /** Get current chart type */
  getChartType(): ChartType { return this.chartType; }

  /** Get current theme object */
  getTheme(): Theme { return this.theme; }

  /** Get current price scale mode */
  getPriceScaleMode(): import('../api/types').PriceScaleMode { return this.priceScale.mode; }

  /** Get current feature flags */
  getFeatures(): Partial<import('../api/types').ChartFeatures> {
    return {
      volume: this._showVolume,
      gridVertical: this._showGridVert,
      gridHorizontal: this._showGridHoriz,
      countdown: this._showCountdown,
      highLow: this._showHighLow,
      priceLine: this._showPriceLine,
      sessionBreaks: this._showSessionBreaks,
      watermark: this._showWatermark,
      ohlcvLegend: this._showOhlcvLegend,
      overlayLegend: this._showOverlayLegend,
      indicatorLegend: this._showIndicatorLegend,
      barChange: this._showBarChange,
    };
  }

  /** Get magnet mode state */
  getMagnetMode(): boolean { return this._magnetMode; }

  /** Get stay-in-drawing-mode state */
  getStayInDrawingMode(): boolean { return this._stayInDrawingMode; }

  /** Get volume profile state */
  getVolumeProfile(): boolean { return this._showVolumeProfile; }

  /** Get active indicators with params */
  getIndicators(): { name: string; params: Record<string, number | string | boolean> }[] {
    return this.indicatorEngine.getAll().map(inst => ({
      name: inst.indicator.name,
      params: { ...inst.params },
    }));
  }

  /** Get active compare symbols */
  getCompareSymbols(): string[] {
    return this.compareManager.getAll().map(s => s.symbol);
  }

  // ── State Export / Import ──────────────────────────────────────────────────

  /** Export full chart state as a JSON-serializable object */
  exportState(): ChartState {
    return {
      chartType: this.chartType,
      theme: this.theme.name === 'custom' ? this.theme : this.theme.name,
      priceScaleMode: this.priceScale.mode,
      features: this.getFeatures(),
      magnetMode: this._magnetMode,
      stayInDrawingMode: this._stayInDrawingMode,
      volumeProfile: this._showVolumeProfile,
      indicators: this.getIndicators(),
      drawings: this.getDrawings(),
      compareSymbols: this.getCompareSymbols(),
    };
  }

  /** Import chart state (restores everything). Partial — only provided fields are applied. */
  async importState(state: Partial<ChartState>): Promise<void> {
    if (state.theme !== undefined) {
      this.setTheme(state.theme as ThemeName | Theme);
    }
    if (state.chartType) this.setChartType(state.chartType);
    if (state.priceScaleMode) this.setPriceScale(state.priceScaleMode);
    if (state.features) this.setFeatures(state.features);
    if (state.magnetMode !== undefined) this.setMagnetMode(state.magnetMode);
    if (state.stayInDrawingMode !== undefined) this.setStayInDrawingMode(state.stayInDrawingMode);
    if (state.volumeProfile !== undefined) this.setVolumeProfile(state.volumeProfile);
    if (state.indicators) {
      // Remove all existing indicators
      for (const inst of [...this.indicatorEngine.getAll()]) {
        this.removeIndicator(inst.id);
      }
      // Add from state (resolve name → Indicator via registry)
      for (const ind of state.indicators) {
        const indicator = getIndicator(ind.name);
        if (indicator) this.addIndicator(indicator, ind.params);
      }
    }
    if (state.drawings) this.loadDrawings(state.drawings);
    if (state.compareSymbols) {
      // Remove existing compare overlays
      for (const sym of this.getCompareSymbols()) {
        this.removeCompare(sym);
      }
      for (const sym of state.compareSymbols) {
        await this.addCompare(sym);
      }
    }
  }

  /** Get the active rendering backend ('canvas2d' or 'webgl') */
  getRendererBackend(): string {
    return this.layers.backend;
  }

  /** Destroy chart and clean up */
  destroy(): void {
    this.unsubscribeStream?.();
    cancelAnimationFrame(this.rafId);
    clearInterval(this.countdownTimer);
    this.scrollZoom.destroy();
    this.keyboard.destroy();
    this.priceScaleDrag.destroy();
    this.touchHandler.destroy();
    this.events.removeAll();
    this.resizeObserver.disconnect();
    const uiCanvas = this.layers.get('ui').canvas;
    uiCanvas.removeEventListener('mousemove', this.onMouseMove);
    uiCanvas.removeEventListener('mouseleave', this.onMouseLeave);
    uiCanvas.removeEventListener('mousedown', this.onDrawingMouseDown);
    uiCanvas.removeEventListener('mouseup', this.onDrawingMouseUp);
    uiCanvas.removeEventListener('click', this.onDrawingClick);
    uiCanvas.removeEventListener('dblclick', this.onDoubleClick);
    uiCanvas.removeEventListener('contextmenu', this.onContextMenu);
    this.contextMenu.destroy();
    this.indicatorSettings.destroy();
    this.layers.destroy();
  }

  // ── Data Loading ──────────────────────────────────────────────────────────

  private async loadInitialData(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    let bars: Bar[];
    try {
      bars = await this.datafeed.getBars({
        symbol: this.symbol,
        timeframe: this.timeframe,
        from: 0,
        to: now,
        limit: 1000,
      });
    } catch (err) {
      logger.error('Failed to load bars:', err);
      bars = [];
    }

    this.dataSource.setData(bars);
    if (bars.length > 0) {
      this.precision = detectPrecision(bars[0]!.close);
    }
    this.recomputeIndicators();
    this.fitToData();

    this.unsubscribeStream = this.datafeed.subscribe({
      symbol: this.symbol,
      timeframe: this.timeframe,
      onBar: (bar) => this.updateBar(bar),
      onTick: (tick) => {
        const last = this.dataSource.last;
        if (last) {
          this.updateBar({
            ...last,
            close: tick.price,
            high: Math.max(last.high, tick.price),
            low: Math.min(last.low, tick.price),
            volume: last.volume + tick.volume,
          });
        }
      },
    });
  }

  // ── Indicators ────────────────────────────────────────────────────────────

  private async loadMoreHistory(): Promise<void> {
    if (this._loadingHistory) return;
    this._loadingHistory = true;
    try {
      const firstBar = this.dataSource.first;
      if (!firstBar) return;
      const bars = await this.datafeed.getBars({
        symbol: this.symbol,
        timeframe: this.timeframe,
        from: 0,
        to: firstBar.time - 1,
        limit: 500,
      });
      if (bars.length > 0) {
        const prevLen = this.dataSource.length;
        this.dataSource.prepend(bars);
        // Shift firstIndex so the view stays in the same place
        this.timeScale.firstIndex += this.dataSource.length - prevLen;
        this.scrollZoom.updateState({ timeScale: this.timeScale, totalBars: this.dataSource.length });
        this.recomputeIndicators();
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
      }
    } catch (err) {
      logger.warn('Failed to load history:', err);
    } finally {
      this._loadingHistory = false;
    }
  }

  private recomputeIndicators(): void {
    this.indicatorEngine.compute(this.dataSource.getAllBars());
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  private fitToData(): void {
    this.timeScale = createDefaultTimeScale(this.dataSource.length, this.chartWidth);
    this.scrollZoom.updateState({ timeScale: this.timeScale, totalBars: this.dataSource.length });
    this.paneManager.setHeight(this.chartHeight);
    this.recalcPriceRange();
    this.layers.markAllDirty();
    this.scheduleRender();
  }

  private recalcPriceRange(): void {
    const from = Math.max(0, Math.floor(this.timeScale.firstIndex));
    const to = from + this.timeScale.visibleCount + 2;

    // Skip auto-fit if user manually scaled the price axis
    if (this.manualPriceScale) {
      // Still update oscillator panes
      this.recalcOscillatorScales(from, to);
      return;
    }

    const range = this.dataSource.getPriceRange(from, to);
    if (range) {
      const spread = range.max - range.min || range.max * 0.01;
      // Top padding: 5% for breathing room
      // Bottom padding: 20% to reserve space for volume bars
      const topPad = spread * 0.05;
      const bottomPad = spread * 0.20;
      this.priceScale = { ...this.priceScale, min: range.min - bottomPad, max: range.max + topPad };
    }

    this.recalcOscillatorScales(from, to);
  }

  private recalcOscillatorScales(from: number, to: number): void {
    for (const inst of this.indicatorEngine.getOscillators()) {
      const pane = this.paneManager.getPaneForIndicator(inst.id);
      if (!pane) continue;
      const indRange = getIndicatorRange(inst.outputs, inst.indicator.plots, from, to);
      if (indRange) {
        const pad = (indRange.max - indRange.min) * 0.1 || 1;
        this.paneManager.setScale(pane.id, indRange.min - pad, indRange.max + pad);
      }
    }
  }

  // ── Coordinate Helpers ────────────────────────────────────────────────────

  private pixelToPoint(x: number, y: number): Point {
    const mainPane = this.paneManager.getMain();
    const mainH = mainPane.height || this.chartHeight;
    const price = yToPrice(y, this.priceScale, mainH);
    const barIdx = xToBarIndex(x, this.timeScale);
    const bar = this.dataSource.getBar(Math.round(barIdx));
    const time = bar?.time ?? 0;
    return { price, time };
  }

  private pointToPixel(p: Point): { x: number; y: number } {
    const mainPane = this.paneManager.getMain();
    const mainH = mainPane.height || this.chartHeight;
    const idx = this.dataSource.nearestIndex(p.time);
    const x = barIndexToX(idx >= 0 ? idx : 0, this.timeScale, this.chartWidth);
    const y = priceToY(p.price, this.priceScale, mainH);
    return { x, y };
  }

  // ── Keyboard Actions ───────────────────────────────────────────────────────

  private onKeyAction(action: string): void {
    switch (action) {
      case 'cancel':
        this.drawingEngine.cancelCreating();
        this.scrollZoom.enabled = true;
        this.layers.get('ui').canvas.style.cursor = 'default';
        this.layers.markDirty('ui');
        this.scheduleRender();
        break;
      case 'zoom-in':
        this.timeScale.barSpacing = Math.min(60, this.timeScale.barSpacing * 1.15);
        this.timeScale.visibleCount = Math.ceil(this.chartWidth / this.timeScale.barSpacing);
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
        break;
      case 'zoom-out':
        this.timeScale.barSpacing = Math.max(2, this.timeScale.barSpacing / 1.15);
        this.timeScale.visibleCount = Math.ceil(this.chartWidth / this.timeScale.barSpacing);
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
        break;
      case 'scroll-left':
        this.timeScale.firstIndex = Math.max(0, this.timeScale.firstIndex - 5);
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
        break;
      case 'scroll-right':
        this.timeScale.firstIndex = Math.min(
          this.dataSource.length - 1,
          this.timeScale.firstIndex + 5,
        );
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
        break;
      case 'scroll-start':
        this.timeScale.firstIndex = 0;
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
        break;
      case 'scroll-end':
        this.timeScale.firstIndex = Math.max(0, this.dataSource.length - this.timeScale.visibleCount);
        this.recalcPriceRange();
        this.layers.markAllDirty();
        this.scheduleRender();
        break;
      case 'undo': {
        const action = this.undoStack.undo();
        if (action?.type === 'add') {
          this.drawingEngine.remove(action.drawingId);
          this.layers.markDirty('ui');
          this.scheduleRender();
        }
        break;
      }
    }
  }

  // ── Context Menu (right-click on drawings) ─────────────────────────────

  private onContextMenu = (e: MouseEvent): void => {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = this._drawingInteraction
      ? this.drawingEngine.hitTest({ x, y }, (p) => this.pointToPixel(p), 8)
      : null;

    // Trade mode: right-click on chart or price axis → trade menu
    if (!hit && this._tradeMode && y < this.chartHeight) {
      e.preventDefault();
      const mainH = this.paneManager.getMain().height || this.chartHeight;
      const price = yToPrice(y, this.priceScale, mainH);

      // Custom handler overrides everything
      if (this._tradeOptions.onTradeAction) {
        const lastBar = this.dataSource.getBar(this.dataSource.length - 1);
        this._tradeOptions.onTradeAction({
          price,
          clientX: e.clientX,
          clientY: e.clientY,
          suggestedSide: lastBar ? (price < lastBar.close ? 'buy' : 'sell') : 'buy',
        });
        return;
      }

      if (!this._tradeOptions.showContextMenu) return;

      const priceLabel = formatPrice(price, this.precision);
      let tradeItems: import('./interaction/context-menu').ContextMenuItem[];
      if (this._tradeOptions.contextMenuItems) {
        tradeItems = this._tradeOptions.contextMenuItems(price).map(i => ({
          label: i.label, action: i.action, separator: i.separator,
        }));
      } else {
        tradeItems = [
          { label: `Buy Limit @ ${priceLabel}`, action: 'buy-limit', icon: '\u25B2' },
          { label: `Sell Limit @ ${priceLabel}`, action: 'sell-limit', icon: '\u25BC' },
          { label: 'Buy Market', action: 'buy-market', icon: '\u25B6' },
          { label: 'Sell Market', action: 'sell-market', icon: '\u25C0' },
        ];
      }
      this.contextMenu.show(x, y, `trade_${price}`, tradeItems);
      this._pendingTradePrice = price;
      return;
    }

    if (!hit) return;

    e.preventDefault();
    const drawingId = 'drawingId' in hit ? hit.drawingId : undefined;
    if (!drawingId) return;

    const drawing = this.drawingEngine.get(drawingId);
    if (!drawing) return;

    const items = getDrawingContextMenuItems(drawing.locked);
    this.contextMenu.show(x, y, drawingId, items);
  };

  private handleContextMenuAction(action: string, drawingId: string): void {
    // Handle trade context menu actions
    if (action.startsWith('buy-') || action.startsWith('sell-')) {
      const price = this._pendingTradePrice ?? 0;
      this._pendingTradePrice = null;
      if (action === 'buy-limit') this.events.emit('tradeRequested', { side: 'buy', price, type: 'limit', action });
      else if (action === 'sell-limit') this.events.emit('tradeRequested', { side: 'sell', price, type: 'limit', action });
      else if (action === 'buy-market') this.events.emit('tradeRequested', { side: 'buy', price, type: 'market', action });
      else if (action === 'sell-market') this.events.emit('tradeRequested', { side: 'sell', price, type: 'market', action });
      return;
    }
    // Custom trade context menu action
    if (this._pendingTradePrice !== null) {
      const price = this._pendingTradePrice;
      this._pendingTradePrice = null;
      const side = action.includes('buy') ? 'buy' as const : 'sell' as const;
      const type = action.includes('market') ? 'market' as const : 'limit' as const;
      this.events.emit('tradeRequested', { side, price, type, action });
      return;
    }

    const drawing = this.drawingEngine.get(drawingId);
    if (!drawing) return;

    switch (action) {
      case 'delete':
        this.drawingEngine.remove(drawingId);
        this.events.emit('drawingRemoved', drawingId);
        break;
      case 'lock':
        this.drawingEngine.toggleLock(drawingId);
        break;
      case 'clone': {
        // Create new drawing with same tool, points offset slightly
        const toolName = drawing.toolName;
        this.drawingEngine.cancelCreating();
        this.drawingEngine.startCreating(toolName);
        for (const pt of drawing.points) {
          this.drawingEngine.addPoint({ price: pt.price * 1.002, time: pt.time });
        }
        break;
      }
      case 'color': {
        // Color is now handled by the floating toolbar color picker
        this.drawingEngine.select(drawingId);
        this.emitSelectionEvent(drawingId, 0, 0);
        break;
      }
      case 'edit': {
        if (drawing.toolName === 'text' || drawing.toolName === 'callout' || drawing.toolName === 'note') {
          const rect = this.container.getBoundingClientRect();
          const pixels = drawing.points.map(p => this.pointToPixel(p));
          this.events.emit('textInputRequested', {
            drawingId,
            toolName: drawing.toolName,
            clientX: pixels[0]!.x + rect.left,
            clientY: pixels[0]!.y + rect.top,
            currentText: drawing.options.text ?? '',
            color: drawing.options.color,
            lineWidth: drawing.options.lineWidth,
          });
        }
        break;
      }
    }

    this.layers.markDirty('ui');
    this.scheduleRender();
  }

  // ── Double-click to edit text drawings ──────────────────────────────────

  private onDoubleClick = (e: MouseEvent): void => {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = this.drawingEngine.hitTest({ x, y }, (p) => this.pointToPixel(p), 8);
    if (!hit) return;

    const drawingId = 'drawingId' in hit ? hit.drawingId : undefined;
    if (!drawingId) return;

    const drawing = this.drawingEngine.get(drawingId);
    const textTools = ['text', 'callout', 'note'];
    if (!drawing || !textTools.includes(drawing.toolName)) return;

    // Emit inline text edit event instead of prompt()
    const pixels = drawing.points.map(p => this.pointToPixel(p));
    const cx = pixels[0]!.x + rect.left;
    const cy = pixels[0]!.y + rect.top;
    this.events.emit('textInputRequested', {
      drawingId,
      toolName: drawing.toolName,
      clientX: cx,
      clientY: cy,
      currentText: drawing.options.text ?? '',
      color: drawing.options.color,
      lineWidth: drawing.options.lineWidth,
    });
  };

  // ── Drawing Interaction ───────────────────────────────────────────────────

  private onDrawingClick = (e: MouseEvent): void => {
    // Trade mode: click on price axis → custom handler or default context menu
    if (this._tradeMode) {
      const rect = this.container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      if (clickX >= this.chartWidth && clickY < this.chartHeight) {
        e.stopPropagation();
        const mainH = this.paneManager.getMain().height || this.chartHeight;
        const price = yToPrice(clickY, this.priceScale, mainH);
        const lastBar = this.dataSource.getBar(this.dataSource.length - 1);
        const suggestedSide: 'buy' | 'sell' = lastBar ? (price < lastBar.close ? 'buy' : 'sell') : 'buy';

        // Lock crosshair at clicked price so the line stays visible
        this.crosshair.y = clickY;
        this.crosshair.visible = true;
        this._pendingTradePrice = price;
        this.layers.markDirty('crosshair');
        this.scheduleRender();

        // Custom handler takes priority
        if (this._tradeOptions.onTradeAction) {
          this._tradeOptions.onTradeAction({
            price,
            clientX: e.clientX,
            clientY: e.clientY,
            suggestedSide,
          });
          return;
        }

        // Default: show built-in context menu
        if (this._tradeOptions.showContextMenu) {
          const priceStr = formatPrice(price, this.precision);

          // Custom menu items or default
          let items: import('./interaction/context-menu').ContextMenuItem[];
          if (this._tradeOptions.contextMenuItems) {
            items = this._tradeOptions.contextMenuItems(price).map(i => ({
              label: i.label,
              action: i.action,
              separator: i.separator,
            }));
          } else {
            items = [
              { label: `Buy Limit @ ${priceStr}`, action: 'buy-limit' },
              { label: `Sell Limit @ ${priceStr}`, action: 'sell-limit' },
            ];
          }
          this.contextMenu.show(clickX, clickY, `trade_${price}`, items);
          this._pendingTradePrice = price;
        }
        return;
      }
    }

    // Check "go to live" button
    if (this._goLiveBtn) {
      const rect = this.container.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const b = this._goLiveBtn;
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        this.goToLive();
        return;
      }
    }

    const rect2 = this.container.getBoundingClientRect();
    const clickX = e.clientX - rect2.left;
    const clickY = e.clientY - rect2.top;

    // Check pane control buttons (top-right of oscillator panes)
    for (const pane of this.paneManager.getAll()) {
      if (pane.type !== 'indicator') continue;
      const action = hitTestPaneControls(clickX, clickY, this.chartWidth, pane.yOffset);
      if (action) {
        const indId = pane.indicatorIds[0];
        if (!indId) break;
        if (action === 'close') this.removeIndicator(indId);
        else if (action === 'hide') {
          this.indicatorEngine.setVisible(indId, false);
          this.layers.markAllDirty();
          this.scheduleRender();
        }
        else if (action === 'settings') {
          const inst = this.indicatorEngine.get(indId);
          if (inst) this.indicatorSettings.show(clickX, clickY + 20, inst);
        }
        return;
      }
    }

    // Check if clicking on an indicator legend (top-left area of panes)
    if (clickX < 150) {
      // Check oscillator pane legends
      for (const inst of this.indicatorEngine.getOscillators()) {
        const pane = this.paneManager.getPaneForIndicator(inst.id);
        if (!pane) continue;
        if (clickY >= pane.yOffset && clickY <= pane.yOffset + 16) {
          this.indicatorSettings.show(clickX, clickY + 20, inst);
          return;
        }
      }
      // Check overlay legends (below OHLCV at y=20+)
      const overlays = this.indicatorEngine.getOverlays();
      for (let i = 0; i < overlays.length; i++) {
        const legendY = 20 + i * 14;
        if (clickY >= legendY && clickY <= legendY + 14) {
          this.indicatorSettings.show(clickX, clickY + 20, overlays[i]!);
          return;
        }
      }
    }

    const state = this.drawingEngine.state;
    if (state.mode !== 'creating') return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x > this.chartWidth || y > this.chartHeight) return;

    // Snap to OHLC if near a bar
    let point = this.pixelToPoint(x, y);
    const barIdx = Math.round(xToBarIndex(x, this.timeScale));
    const bar = this.dataSource.getBar(barIdx);
    if (bar) {
      const mainH = this.paneManager.getMain().height || this.chartHeight;
      if (this._magnetMode) {
        const snap = snapToOHLC(point.price, bar, (p) => priceToY(p, this.priceScale, mainH), y);
        if (snap.snapped) point = { price: snap.price, time: snap.time };
      }
    }

    // For text tool, create drawing first with placeholder, then emit textInput event
    const creatingState = this.drawingEngine.state;
    const needsText = creatingState.mode === 'creating' &&
      (creatingState.toolName === 'text' || creatingState.toolName === 'callout' || creatingState.toolName === 'note');

    const result = this.drawingEngine.addPoint(point);
    if (result) {
      if (needsText) {
        // Set placeholder and emit event for inline editing
        this.drawingEngine.updateOptions(result.id, { text: '' });
        const drawing = this.drawingEngine.get(result.id);
        this.events.emit('textInputRequested', {
          drawingId: result.id,
          toolName: result.toolName,
          clientX: e.clientX,
          clientY: e.clientY,
          currentText: '',
          color: drawing?.options.color ?? '#eaecef',
          lineWidth: drawing?.options.lineWidth ?? 1.5,
        });
      }
      this.events.emit('drawingAdded', { id: result.id, tool: result.toolName, points: result.points });
      this.undoStack.push({ type: 'add', drawingId: result.id, data: null });

      // Return to idle or restart tool (Stay in Drawing Mode)
      this.drawingEngine.select(result.id);
      if (this._stayInDrawingMode && this._activeToolName && !needsText) {
        // Restart the same tool for next drawing
        this.drawingEngine.startCreating(this._activeToolName);
      } else {
        this.scrollZoom.enabled = true;
        const uiCanvas = this.layers.get('ui').canvas;
        uiCanvas.style.cursor = 'default';
        if (!needsText) {
          this.emitSelectionEvent(result.id, e.clientX, e.clientY);
        }
      }
    }

    this.layers.markDirty('ui');
    this.scheduleRender();
  };

  private onDrawingMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    if (!this._drawingInteraction) return;
    const state = this.drawingEngine.state;
    if (state.mode === 'creating') return;

    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x > this.chartWidth || y > this.chartHeight) return;

    // Check pane resize handles
    const resizeHandle = this.paneManager.getResizeHandle(y);
    if (resizeHandle) {
      e.stopPropagation();
      this._resizingPane = { index: resizeHandle.index, startY: y };
      this.scrollZoom.enabled = false;
      this.layers.get('ui').canvas.style.cursor = 'row-resize';
      return;
    }

    // Check order lines first (draggable)
    const mainH = this.paneManager.getMain().height || this.chartHeight;
    const hitOrder = this.orderLineManager.hitTest(y, this.priceScale, mainH);
    if (hitOrder && this._tradeOptions.draggableOrderLines) {
      e.stopPropagation();
      this._draggingOrderLine = { id: hitOrder.id, startY: y };
      this.scrollZoom.enabled = false;
      this.layers.get('ui').canvas.style.cursor = 'ns-resize';
      return;
    }

    const hit = this.drawingEngine.hitTest(
      { x, y },
      (p) => this.pointToPixel(p),
      8,
    );

    if (hit) {
      e.stopPropagation();
      e.preventDefault();
      const hitDrawing = this.drawingEngine.get(hit.drawingId);

      // Click on locked drawing → unlock it
      if (hitDrawing?.locked) {
        this.drawingEngine.toggleLock(hit.drawingId);
        this.drawingEngine.select(hit.drawingId);
        this.emitSelectionEvent(hit.drawingId, e.clientX, e.clientY);
        this.layers.markDirty('ui');
        this.scheduleRender();
        return;
      }

      this.scrollZoom.enabled = false;
      this.drawingEngine.select(hit.drawingId);
      if ('handleIndex' in hit) {
        this.drawingEngine.startEditing(hit.drawingId, hit.handleIndex);
        this.layers.get('ui').canvas.style.cursor = 'grab';
      } else {
        this.drawingEngine.startMoving(hit.drawingId, this.pixelToPoint(x, y));
        this.layers.get('ui').canvas.style.cursor = 'move';
      }
      this.emitSelectionEvent(hit.drawingId, e.clientX, e.clientY);
      this.layers.markDirty('ui');
      this.scheduleRender();
    } else {
      // Clicked on empty space — deselect
      if (this.drawingEngine.selectedId) {
        this.drawingEngine.deselect();
        this.events.emit('drawingDeselected', undefined);
        this.layers.markDirty('ui');
        this.scheduleRender();
      }
    }
  };

  private emitSelectionEvent(drawingId: string, _clientX: number, _clientY: number): void {
    const drawing = this.drawingEngine.get(drawingId);
    if (!drawing) return;
    // Compute bounding box center in client coordinates for toolbar positioning
    const pixels = drawing.points.map(p => this.pointToPixel(p));
    const minY = Math.min(...pixels.map(p => p.y));
    const rect = this.container.getBoundingClientRect();
    const centerX = pixels.reduce((s, p) => s + p.x, 0) / pixels.length + rect.left;
    const topY = minY + rect.top;
    this.events.emit('drawingSelected', {
      id: drawingId,
      drawing,
      clientX: centerX,
      clientY: topY,
    });
  }

  private onDrawingMouseUp = (_e: MouseEvent): void => {
    // End pane resize
    if (this._resizingPane) {
      this._resizingPane = null;
      this.scrollZoom.enabled = true;
      this.layers.get('ui').canvas.style.cursor = '';
      return;
    }

    // End order line drag
    if (this._draggingOrderLine) {
      const line = this.orderLineManager.getAll().find(l => l.id === this._draggingOrderLine!.id);
      if (line) {
        this.events.emit('orderLineMoved', { id: line.id, price: line.price });
        this._tradeOptions.onOrderLineDrag?.(line.id, line.price);
      }
      this._draggingOrderLine = null;
      this.scrollZoom.enabled = true;
      this.layers.get('ui').canvas.style.cursor = '';
      return;
    }

    const state = this.drawingEngine.state;
    if (state.mode === 'editing' || state.mode === 'moving') {
      const drawingId = state.drawingId;
      this.drawingEngine.endDrag();
      this.scrollZoom.enabled = true;
      this.layers.get('ui').canvas.style.cursor = 'default';
      // Re-emit selection event to reposition toolbar after drag
      if (drawingId) {
        const rect = this.container.getBoundingClientRect();
        const drawing = this.drawingEngine.get(drawingId);
        if (drawing) {
          const pixels = drawing.points.map(p => this.pointToPixel(p));
          const cx = pixels.reduce((s, p) => s + p.x, 0) / pixels.length + rect.left;
          const minY = Math.min(...pixels.map(p => p.y)) + rect.top;
          this.events.emit('drawingSelected', { id: drawingId, drawing, clientX: cx, clientY: minY });
        }
      }
      this.layers.markDirty('ui');
      this.scheduleRender();
    }
  };

  // ── Crosshair + Drawing preview ───────────────────────────────────────────

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Trade mode: always track Y for "+" button on price axis (anywhere on chart)
    if (this._tradeMode && this._tradeOptions.showPlusButton && y < this.chartHeight) {
      const mainH = this.paneManager.getMain().height || this.chartHeight;
      const rawPrice = yToPrice(y, this.priceScale, mainH);
      const step = this._tradeTickStep();
      const snappedPrice = Math.round(rawPrice / step) * step;
      const snappedY = priceToY(snappedPrice, this.priceScale, mainH);

      if (this._tradeHoverY !== snappedY) {
        this._tradeHoverY = snappedY;
        this.layers.markDirty('crosshair');
      }
    }

    if (x > this.chartWidth || y > this.chartHeight) {
      // Trade mode: keep crosshair visible on price axis (for "+" button)
      if (this._tradeMode && x > this.chartWidth && y < this.chartHeight) {
        // Keep crosshair Y updated but don't hide
        this.crosshair.y = y;
        this.crosshair.visible = true;
        this.layers.markDirty('crosshair');
        this.scheduleRender();
        return;
      }
      if (this._tradeMode && this._tradeHoverY !== null && y >= this.chartHeight) {
        this._tradeHoverY = null;
        this.layers.markDirty('crosshair');
      }
      if (this.crosshair.visible) {
        this.crosshair.visible = false;
        this.layers.markDirty('crosshair');
        this.scheduleRender();
      }
      return;
    }

    // Pane resize drag
    if (this._resizingPane) {
      const dy = y - this._resizingPane.startY;
      this.paneManager.resizeAt(this._resizingPane.index, dy);
      this._resizingPane.startY = y;
      this.layers.markAllDirty();
      this.scheduleRender();
      return;
    }

    // Order line drag
    if (this._draggingOrderLine) {
      const mainH = this.paneManager.getMain().height || this.chartHeight;
      const newPrice = yToPrice(y, this.priceScale, mainH);
      this.orderLineManager.update(this._draggingOrderLine.id, { price: newPrice });
      this.events.emit('orderLineMoved', { id: this._draggingOrderLine.id, price: newPrice });
      this.layers.markDirty('series');
      this.scheduleRender();
      return;
    }

    // Drawing drag
    const drawState = this.drawingEngine.state;
    if (drawState.mode === 'editing' || drawState.mode === 'moving') {
      this.drawingEngine.dragTo(this.pixelToPoint(x, y));
      this.layers.markDirty('ui');
      this.scheduleRender();
      return;
    }

    // Drawing preview point
    if (drawState.mode === 'creating' && drawState.points.length > 0) {
      this.drawingEngine.setPreviewPoint(this.pixelToPoint(x, y));
      this.layers.markDirty('ui');
    }

    // Cursor style for pane resize / order line / drawing hover
    if (drawState.mode === 'idle' && !this._draggingOrderLine && !this._resizingPane) {
      const uiCanvas = this.layers.get('ui').canvas;

      // Pane resize handle
      const resizeH = this.paneManager.getResizeHandle(y);
      if (resizeH) {
        uiCanvas.style.cursor = 'row-resize';
      } else {

      // "Go to live" button cursor
      if (this._goLiveBtn) {
        const b = this._goLiveBtn;
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          uiCanvas.style.cursor = 'pointer';
          return;
        }
      }

      // Pane control buttons (settings, hide, close)
      let foundCursor = false;
      for (const pane of this.paneManager.getAll()) {
        if (pane.type !== 'indicator') continue;
        const action = hitTestPaneControls(x, y, this.chartWidth, pane.yOffset);
        if (action) {
          uiCanvas.style.cursor = 'pointer';
          foundCursor = true;
          break;
        }
      }
      // Indicator legends (clickable text in top-left)
      if (!foundCursor && x < 150) {
        for (const pane of this.paneManager.getAll()) {
          if (pane.type !== 'indicator') continue;
          if (y >= pane.yOffset && y <= pane.yOffset + 16) {
            uiCanvas.style.cursor = 'pointer';
            foundCursor = true;
            break;
          }
        }
        // Overlay legends
        if (!foundCursor) {
          const overlays = this.indicatorEngine.getOverlays();
          for (let i = 0; i < overlays.length; i++) {
            const legendY = 20 + i * 14;
            if (y >= legendY && y <= legendY + 14) {
              uiCanvas.style.cursor = 'pointer';
              foundCursor = true;
              break;
            }
          }
        }
      }
      if (!foundCursor) {
        const mainH = this.paneManager.getMain().height || this.chartHeight;
        const hitOrd = this.orderLineManager.hitTest(y, this.priceScale, mainH);
        if (hitOrd) {
          uiCanvas.style.cursor = 'ns-resize';
        } else {
          const hit = this._drawingInteraction
            ? this.drawingEngine.hitTest({ x, y }, (p) => this.pointToPixel(p), 8)
            : null;
          const newHover = hit ? ('drawingId' in hit ? hit.drawingId : null) : null;
          if (newHover !== this._hoveredDrawingId) {
            this._hoveredDrawingId = newHover;
            this.layers.markDirty('ui');
            this.scheduleRender();
          }
          if (hit && 'handleIndex' in hit) {
            uiCanvas.style.cursor = 'grab';
          } else if (hit) {
            uiCanvas.style.cursor = 'pointer';
          } else {
            uiCanvas.style.cursor = 'default';
          }
        }
      }
      } // close pane resize else
    }

    // Crosshair
    const barIdx = Math.round(xToBarIndex(x, this.timeScale));
    const bar = this.dataSource.getBar(barIdx) ?? null;
    const snappedX = bar ? barIndexToX(barIdx, this.timeScale, this.chartWidth) : x;

    this.crosshair = { x: snappedX, y, visible: true, barIndex: barIdx, bar };
    this.layers.markDirty('crosshair');
    this.scheduleRender();
  };

  private onMouseLeave = (): void => {
    // Don't hide crosshair if a trade price is pending (user clicked "+")
    if (this._pendingTradePrice !== null) return;
    this.crosshair.visible = false;
    this.layers.markDirty('crosshair');
    this.scheduleRender();
  };

  // ── Render Loop ───────────────────────────────────────────────────────────

  private scheduleRender(): void {
    if (this.needsRender) return;
    this.needsRender = true;
    this.rafId = requestAnimationFrame(() => {
      this.needsRender = false;
      this.render();
    });
  }

  private render(): void {
    const cw = this.chartWidth;
    const ch = this.chartHeight;
    const w = this.layers.width;
    const h = this.layers.height;

    const mainPane = this.paneManager.getMain();
    const mainPaneHeight = mainPane.height || ch;

    const from = Math.max(0, Math.floor(this.timeScale.firstIndex));
    const to = Math.min(this.dataSource.length, from + this.timeScale.visibleCount + 2);
    const visibleBars = this.dataSource.getRange(from, to);

    const lastBar = this.dataSource.last;
    const priceTicks = generatePriceTicks(this.priceScale, mainPaneHeight, this.precision);
    const timeTicks = generateTimeTicks(
      (i) => this.dataSource.getBar(i)?.time,
      this.timeScale, cw, this.timeframe,
    );

    this.layers.renderDirty((layer) => {
      const { ctx } = layer;
      switch (layer.name) {
        case 'background':
          this.renderBackground(ctx, w, h, cw, ch, mainPaneHeight, visibleBars, from, lastBar, priceTicks, timeTicks);
          break;
        case 'series':
          this.renderSeriesLayer(ctx, cw, mainPaneHeight, visibleBars, from, to);
          break;
        case 'crosshair':
          this.renderCrosshairLayer(ctx, cw, mainPaneHeight, lastBar);
          break;
        case 'ui':
          this.renderUILayer(ctx, cw, ch, mainPaneHeight);
          break;
      }
    });
  }

  // ── Background Layer ──────────────────────────────────────────────────────

  private renderBackground(
    ctx: CanvasRenderingContext2D, w: number, h: number,
    cw: number, ch: number, mainPaneHeight: number,
    visibleBars: readonly Bar[], from: number,
    lastBar: Bar | undefined,
    priceTicks: any[], timeTicks: any[],
  ): void {
          ctx.fillStyle = this.theme.bg;
          ctx.fillRect(0, 0, w, h);
          // Watermark behind everything
          if (this._showWatermark) {
            renderWatermark(ctx, this.symbol, this.timeframe, this.theme, cw, mainPaneHeight);
          }
          renderGrid(ctx, priceTicks, timeTicks, this.theme, cw, 0, mainPaneHeight, this._showGridHoriz, this._showGridVert);
          renderPriceAxis(ctx, priceTicks, this.theme, cw, 0, mainPaneHeight);

          // Session breaks (vertical lines at day boundaries)
          if (this._showSessionBreaks) {
            renderSessionBreaks(ctx, visibleBars, from, this.timeScale, this.theme, cw, mainPaneHeight);
          }

          // 24h High/Low markers
          if (this._showHighLow) {
            const allBars = this.dataSource.getAllBars();
            render24hHighLow(ctx, allBars, this.priceScale, this.theme, cw, mainPaneHeight, this.precision);
          }

          renderTimeAxis(ctx, timeTicks, this.theme, w, ch);

          // Bar countdown timer
          if (this._showCountdown && lastBar) {
            const lastBarX = barIndexToX(this.dataSource.length - 1, this.timeScale, cw);
            if (lastBarX > 0 && lastBarX < cw) {
              renderBarCountdown(ctx, lastBar.time, this.timeframe, this.theme, lastBarX, ch);
            }
          }

          for (const pane of this.paneManager.getAll()) {
            if (pane.type === 'indicator') {
              renderOscillatorPaneSeparator(ctx, this.theme, pane.yOffset, cw);
              const oscTicks = generatePriceTicks(
                { min: pane.scaleMin, max: pane.scaleMax, mode: 'linear' },
                pane.height, 2,
              );
              const offsetTicks = oscTicks.map(t => ({ ...t, y: t.y + pane.yOffset }));
              renderPriceAxis(ctx, offsetTicks, this.theme, cw, pane.yOffset, pane.height);
              renderGrid(ctx, offsetTicks, timeTicks, this.theme, cw, pane.yOffset, pane.yOffset + pane.height);

              // Reference lines (overbought/oversold, zero line)
              for (const indId of pane.indicatorIds) {
                const inst = this.indicatorEngine.get(indId);
                if (!inst) continue;
                const refLines = getReferenceLinesForIndicator(inst.indicator.name);
                if (refLines.length > 0) {
                  renderReferenceLines(ctx, refLines, this.theme, cw, pane.yOffset, pane.height, pane.scaleMin, pane.scaleMax);
                }
              }

              // Pane label — show indicator name
              const indNames = pane.indicatorIds
                .map(id => this.indicatorEngine.get(id)?.indicator.shortName)
                .filter(Boolean)
                .join(', ');
              if (indNames) {
                ctx.fillStyle = this.theme.textMuted;
                ctx.font = font(10);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(indNames, 6, pane.yOffset + 4);
              }

              // Pane control buttons (settings, hide, close)
              renderPaneControls(ctx, this.theme, pane.id, cw, pane.yOffset);
            }
          }
  }

  // ── Series Layer ──────────────────────────────────────────────────────────

  private renderSeriesLayer(
    ctx: CanvasRenderingContext2D, cw: number, mainPaneHeight: number,
    visibleBars: readonly Bar[], from: number, to: number,
  ): void {
          const gpuCandle = this.layers.candleRenderer;
          const maxVol = this.dataSource.getMaxVolume(from, to);

          if (gpuCandle && this.chartType === 'candlestick') {
            // ── GPU fast path: OHLCV → shader, 2 draw calls total ─────────
            const vw = this.layers.width;
            const vh = this.layers.height;
            if (this._showVolume) {
              gpuCandle.renderVolume(visibleBars, from, maxVol, this.timeScale, this.theme, cw, mainPaneHeight, vw, vh);
            }
            gpuCandle.renderCandles(visibleBars, from, this.timeScale, this.priceScale, this.theme, cw, mainPaneHeight, vw, vh);

            if (this._showVolumeProfile && visibleBars.length > 0) {
              const vpBins = computeVolumeProfile(visibleBars, this.priceScale.min, this.priceScale.max, 40);
              renderVolumeProfile(ctx, vpBins, this.priceScale, this.theme, cw, mainPaneHeight);
            }
          } else {
            // ── Canvas 2D path ─────────────────────────────────────────────
            if (this._showVolume) {
              renderVolume(ctx, visibleBars, from, maxVol, this.timeScale, this.theme, cw, mainPaneHeight);
            }

            if (this._showVolumeProfile && visibleBars.length > 0) {
              const vpBins = computeVolumeProfile(visibleBars, this.priceScale.min, this.priceScale.max, 40);
              renderVolumeProfile(ctx, vpBins, this.priceScale, this.theme, cw, mainPaneHeight);
            }

            this.renderSeries(ctx, visibleBars, from, cw, mainPaneHeight);
          }

          // Overlay indicators (SMA, EMA, Bollinger, etc.) — always render
          for (const inst of this.indicatorEngine.getOverlays()) {
            if (inst.indicator.customRender) {
              inst.indicator.customRender({
                ctx, outputs: inst.outputs, params: inst.params,
                timeScale: this.timeScale, priceScale: this.priceScale,
                chartWidth: cw, chartHeight: mainPaneHeight, precision: this.precision,
              });
            } else {
              renderIndicator({
                ctx, outputs: inst.outputs, plots: inst.indicator.plots,
                firstBarIndex: 0, timeScale: this.timeScale, chartWidth: cw,
                yOffset: 0, paneHeight: mainPaneHeight,
                scaleMin: this.priceScale.min, scaleMax: this.priceScale.max,
              });
            }
          }

          // Compare overlays
          const compareSymbols = this.compareManager.getAll();
          if (compareSymbols.length > 0) {
            renderCompareOverlays(ctx, compareSymbols, visibleBars, from, this.timeScale, cw, mainPaneHeight, this.priceScale.min, this.priceScale.max);
          }

          // Oscillator indicators (RSI, MACD, etc.) in separate panes
          for (const inst of this.indicatorEngine.getOscillators()) {
            const pane = this.paneManager.getPaneForIndicator(inst.id);
            if (!pane) continue;
            renderIndicator({
              ctx, outputs: inst.outputs, plots: inst.indicator.plots,
              firstBarIndex: 0, timeScale: this.timeScale, chartWidth: cw,
              yOffset: pane.yOffset, paneHeight: pane.height,
              scaleMin: pane.scaleMin, scaleMax: pane.scaleMax,
            });
          }

          // Bar markers (Buy/Sell signals, annotations)
          const barMarkers = this._barMarkers;
          if (barMarkers.length > 0) {
            ctx.font = font(9, 'bold');
            ctx.textAlign = 'center';
            for (const m of barMarkers) {
              const idx = this.dataSource.nearestIndex(m.time);
              if (idx < from || idx >= to) continue;
              const bar = this.dataSource.getBar(idx);
              if (!bar) continue;
              const x = barIndexToX(idx, this.timeScale, cw);
              const priceY = m.position === 'above'
                ? priceToY(bar.high, this.priceScale, mainPaneHeight) - 14
                : priceToY(bar.low, this.priceScale, mainPaneHeight) + 14;
              // Badge
              const tw = ctx.measureText(m.label).width + 6;
              ctx.fillStyle = m.color;
              ctx.beginPath();
              ctx.roundRect(x - tw / 2, priceY - 7, tw, 14, 3);
              ctx.fill();
              ctx.fillStyle = this.theme.badgeText ?? '#ffffff';
              ctx.textBaseline = 'middle';
              ctx.fillText(m.label, x, priceY);
            }
          }
  }

  // ── Crosshair Layer ───────────────────────────────────────────────────────

  private renderCrosshairLayer(
    ctx: CanvasRenderingContext2D, cw: number, mainPaneHeight: number,
    lastBar: Bar | undefined,
  ): void {
          // ── Price marker, order lines, position overlays ──────────────
          // These use complex paths (dashed lines, arrow badges, text) that
          // need Canvas 2D. Rendered on crosshair layer which is always 2D.
          if (this._showPriceLine && lastBar) {
            renderCurrentPriceMarker(ctx, lastBar, this.priceScale, this.theme, cw, mainPaneHeight, this.precision, this.timeframe);
          }

          // Price markers (bid/ask/mark/index labels on price axis)
          const priceMarkers = this._priceMarkers;
          if (priceMarkers.length > 0) {
            for (const m of priceMarkers) {
              const y = priceToY(m.price, this.priceScale, mainPaneHeight);
              if (y < 0 || y > mainPaneHeight) continue;
              // Dashed line across chart
              ctx.strokeStyle = m.color;
              ctx.lineWidth = 0.5;
              ctx.setLineDash([3, 3]);
              ctx.globalAlpha = 0.5;
              ctx.beginPath();
              ctx.moveTo(0, Math.round(y) + 0.5);
              ctx.lineTo(cw, Math.round(y) + 0.5);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.globalAlpha = 1;
              // Badge on price axis
              const label = `${m.label} ${formatPrice(m.price, this.precision)}`;
              ctx.font = font(9);
              const tw = ctx.measureText(label).width + 8;
              ctx.fillStyle = m.color;
              ctx.fillRect(cw, Math.round(y) - 8, tw + 4, 16);
              ctx.fillStyle = this.theme.badgeText ?? '#ffffff';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, cw + 4, Math.round(y));
            }
          }

          // Position overlays (Bybit-style zones)
          for (const pos of this._positionOverlays) {
            renderPositionOverlay(ctx, pos, this.priceScale, this.theme, cw, mainPaneHeight, this.precision);
          }

          // Order/position lines
          const orderLines = this.orderLineManager.getAll();
          if (orderLines.length > 0) {
            renderOrderLines(ctx, orderLines, this.priceScale, this.theme, cw, mainPaneHeight, this.precision);
          }

          // ── Crosshair ────────────────────────────────────────────────
          renderCrosshair(
            ctx, this.crosshair, this.priceScale, this.timeScale,
            this.theme, cw, mainPaneHeight, this.precision,
            (i) => this.dataSource.getBar(i)?.time,
            this._tradeMode,
          );

          // OHLCV legend (top-left) — show crosshair bar or latest bar
          if (this._showOhlcvLegend) {
            const legendBar = this.crosshair.bar ?? lastBar;
            if (legendBar) {
              renderOHLCVLegend(ctx, legendBar, this.theme, this.precision, 6, 4);
            }
          }

          // Overlay indicator legends (below OHLCV)
          const legendBarIdx = this.crosshair.visible ? this.crosshair.barIndex : this.dataSource.length - 1;
          if (this._showOverlayLegend) {
            const overlays = this.indicatorEngine.getOverlays();
            if (overlays.length > 0) {
              renderOverlayLegend(ctx, overlays, legendBarIdx, this.theme, 6, 20);
            }
          }

          // Oscillator pane legends
          if (this._showIndicatorLegend) {
            for (const inst of this.indicatorEngine.getOscillators()) {
              const pane = this.paneManager.getPaneForIndicator(inst.id);
              if (!pane) continue;
              renderIndicatorLegend(ctx, inst, legendBarIdx, this.theme, 6, pane.yOffset + 4);
            }
          }

  }

  // ── UI Layer (drawings + controls) ────────────────────────────────────────

  private renderUILayer(
    ctx: CanvasRenderingContext2D, cw: number, ch: number, mainPaneHeight: number,
  ): void {
          this.renderDrawings(ctx, cw, mainPaneHeight);

          // "Go to live" button when scrolled away from right edge
          if (!this.autoScroll && this.dataSource.length > 0) {
            const btnW = 28, btnH = 28, btnX = cw - btnW - 12, btnY = ch - btnH - 40;
            const r = 6;
            ctx.fillStyle = this.theme.crosshairLabel;
            ctx.beginPath();
            ctx.moveTo(btnX + r, btnY);
            ctx.lineTo(btnX + btnW - r, btnY);
            ctx.quadraticCurveTo(btnX + btnW, btnY, btnX + btnW, btnY + r);
            ctx.lineTo(btnX + btnW, btnY + btnH - r);
            ctx.quadraticCurveTo(btnX + btnW, btnY + btnH, btnX + btnW - r, btnY + btnH);
            ctx.lineTo(btnX + r, btnY + btnH);
            ctx.quadraticCurveTo(btnX, btnY + btnH, btnX, btnY + btnH - r);
            ctx.lineTo(btnX, btnY + r);
            ctx.quadraticCurveTo(btnX, btnY, btnX + r, btnY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = this.theme.textPrimary;
            ctx.font = font(16, 'bold');
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('»', btnX + btnW / 2, btnY + btnH / 2);

            // Store button bounds for click detection
            this._goLiveBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
          } else {
            this._goLiveBtn = null;
          }
  }

  private renderSeries(
    ctx: CanvasRenderingContext2D,
    bars: readonly Bar[],
    firstBarIndex: number,
    chartWidth: number,
    chartHeight: number,
  ): void {
    switch (this.chartType) {
      case 'candlestick':
        renderCandlesticks(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'heikin_ashi':
        renderHeikinAshi(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'line':
        renderLineSeries(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'area':
        renderAreaSeries(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'bar':
        renderBarSeries(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'baseline':
        // Baseline uses area with a reference line — fall back to area for now
        renderAreaSeries(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'hollow_candle':
        renderHollowCandles(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'line_markers':
        renderLineMarkers(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'step_line':
        renderStepLine(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'hlc_area':
        renderHlcArea(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'columns':
        renderColumns(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
      case 'high_low':
        renderHighLow(ctx, bars, firstBarIndex, this.timeScale, this.priceScale, this.theme, chartWidth, chartHeight);
        break;
    }
  }

  private renderDrawings(ctx: CanvasRenderingContext2D, chartWidth: number, chartHeight: number): void {
    const toPixel = (p: Point) => this.pointToPixel(p);

    // Render all drawings
    for (const drawing of this.drawingEngine.getAll()) {
      const tool = this.drawingEngine.getTool(drawing.toolName);
      if (!tool) continue;

      const pixelPoints = drawing.points.map(toPixel);

      // Inject real chart data into drawing options
      const dataInjectorCtx: import('./renderer/drawing-data-injector').DataInjectorContext = {
        nearestIndex: (t) => this.dataSource.nearestIndex(t),
        getRange: (f, t) => this.dataSource.getRange(f, t),
        precision: this.precision,
        priceScale: this.priceScale,
        mainPaneHeight: this.paneManager.getMain().height || this.chartHeight,
        barIndexToX: (barIndex) => barIndexToX(barIndex, this.timeScale, this.chartWidth),
      };
      let opts = injectDrawingData(drawing.toolName, drawing.points, pixelPoints, drawing.options, dataInjectorCtx);


      // Inject locked/hovered state — in non-interactive mode treat all as locked visually
      if (drawing.locked || !this._drawingInteraction) opts = { ...opts, _locked: true } as any;
      const isHovered = drawing.id === this._hoveredDrawingId;

      // Hover on locked drawing — show unlock icon
      if (isHovered && drawing.locked) {
        const cx = pixelPoints.reduce((s, p) => s + p.x, 0) / pixelPoints.length;
        const cy = pixelPoints.reduce((s, p) => s + p.y, 0) / pixelPoints.length;
        // Lock icon background
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();
        // Lock icon
        ctx.strokeStyle = '#90caf9';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.rect(cx - 5, cy - 2, 10, 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 4, Math.PI, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Hover highlight — subtle glow behind the drawing
      if (isHovered && drawing.id !== this.drawingEngine.selectedId) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = this.theme.textPrimary;
        ctx.lineWidth = (opts.lineWidth ?? 1.5) + 4;
        // Re-render just the stroke with wider line for glow effect
        if (pixelPoints.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(pixelPoints[0]!.x, pixelPoints[0]!.y);
          for (let pi = 1; pi < pixelPoints.length; pi++) {
            ctx.lineTo(pixelPoints[pi]!.x, pixelPoints[pi]!.y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      tool.render(ctx, pixelPoints, opts, chartWidth, chartHeight);

      // Render handles only on selected drawing (not locked)
      if (!drawing.locked && drawing.id === this.drawingEngine.selectedId) {
        const handles = tool.getHandles(pixelPoints);
        for (const handle of handles) {
          renderHandle(ctx, handle, drawing.options.color);
        }
      }
    }

    // Render drawing preview (during creation)
    const state = this.drawingEngine.state;
    if (state.mode === 'creating' && state.points.length > 0 && state.previewPoint) {
      const tool = this.drawingEngine.getTool(state.toolName);
      if (tool) {
        const allPoints = [...state.points, state.previewPoint].map(toPixel);
        ctx.globalAlpha = 0.6;
        tool.render(ctx, allPoints, { color: '#2962FF', lineWidth: 1.5, lineStyle: 'dashed' }, chartWidth, chartHeight);
        ctx.globalAlpha = 1;
      }
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type ThemeName = 'dark' | 'light' | 'colorblind-dark' | 'colorblind-light';

function resolveTheme(theme: ThemeName | Theme | undefined): Theme {
  if (!theme || theme === 'dark') return darkTheme;
  if (theme === 'light') return lightTheme;
  if (theme === 'colorblind-dark') return colorblindDarkTheme;
  if (theme === 'colorblind-light') return colorblindLightTheme;
  return theme;
}
