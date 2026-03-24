// ── Drawing Engine ──────────────────────────────────────────────────────────
// Manages all drawings on the chart: creation, editing, deletion, serialization.
// Implements a state machine for the active drawing tool.

import type { Point, DrawingOptions } from '../api/types';
import type { PixelPoint } from './primitives/hit-test';

// ── Drawing Instance ────────────────────────────────────────────────────────

export interface DrawingInstance {
  id: string;
  toolName: string;
  points: Point[];
  options: DrawingOptions;
  locked: boolean;
  visible: boolean;
}

// ── Drawing Tool Definition (internal) ──────────────────────────────────────

export interface InternalDrawingTool {
  name: string;
  icon: string;
  /** Number of clicks to create */
  pointCount: number;
  /** Render the drawing on canvas */
  render(
    ctx: CanvasRenderingContext2D,
    points: PixelPoint[],
    options: DrawingOptions,
    width: number,
    height: number,
  ): void;
  /** Hit test: is mouse near this drawing? Returns distance in pixels */
  hitTest(mouse: PixelPoint, points: PixelPoint[], threshold: number): boolean;
  /** Get handle positions (for editing) */
  getHandles(points: PixelPoint[]): PixelPoint[];
}

// ── State Machine ───────────────────────────────────────────────────────────

export type DrawingState =
  | { mode: 'idle' }
  | { mode: 'creating'; toolName: string; points: Point[]; previewPoint: Point | null }
  | { mode: 'editing'; drawingId: string; handleIndex: number }
  | { mode: 'moving'; drawingId: string; startMouse: Point; startPoints: Point[] };

// ── Engine ──────────────────────────────────────────────────────────────────

let nextId = 1;

export class DrawingEngine {
  private drawings = new Map<string, DrawingInstance>();
  private tools = new Map<string, InternalDrawingTool>();
  state: DrawingState = { mode: 'idle' };

  /** Currently selected drawing ID (persists across idle/edit/move states) */
  selectedId: string | null = null;

  /** Select a drawing. Returns the drawing or null. */
  select(id: string | null): DrawingInstance | null {
    this.selectedId = id;
    return id ? this.drawings.get(id) ?? null : null;
  }

  /** Get the currently selected drawing */
  getSelected(): DrawingInstance | null {
    return this.selectedId ? this.drawings.get(this.selectedId) ?? null : null;
  }

  /** Deselect */
  deselect(): void {
    this.selectedId = null;
  }

  /** Register a drawing tool */
  registerTool(tool: InternalDrawingTool): void {
    this.tools.set(tool.name, tool);
  }

  /** Get a registered tool */
  getTool(name: string): InternalDrawingTool | undefined {
    return this.tools.get(name);
  }

  // ── Creation ──────────────────────────────────────────────────────────────

  /** Start creating a drawing with the given tool */
  startCreating(toolName: string): void {
    if (!this.tools.has(toolName)) throw new Error(`Unknown tool: ${toolName}`);
    this.state = { mode: 'creating', toolName, points: [], previewPoint: null };
  }

  /** Add a point during creation. Returns true if drawing is complete. */
  addPoint(point: Point): DrawingInstance | null {
    if (this.state.mode !== 'creating') return null;
    const tool = this.tools.get(this.state.toolName)!;

    this.state.points.push(point);

    if (this.state.points.length >= tool.pointCount) {
      const drawing = this.createDrawing(this.state.toolName, this.state.points);
      this.state = { mode: 'idle' };
      return drawing;
    }
    return null;
  }

  /** Update preview point during creation (mouse move) */
  setPreviewPoint(point: Point | null): void {
    if (this.state.mode === 'creating') {
      this.state.previewPoint = point;
    }
  }

  /** Cancel current creation */
  cancelCreating(): void {
    this.state = { mode: 'idle' };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  private createDrawing(toolName: string, points: Point[], options?: Partial<DrawingOptions>): DrawingInstance {
    const id = `drawing_${nextId++}`;
    const drawing: DrawingInstance = {
      id,
      toolName,
      points: [...points],
      options: {
        color: '#2962FF',
        lineWidth: 1.5,
        lineStyle: 'solid',
        ...options,
      },
      locked: false,
      visible: true,
    };
    this.drawings.set(id, drawing);
    return drawing;
  }

  /** Remove a drawing */
  remove(id: string): boolean {
    return this.drawings.delete(id);
  }

  /** Get a drawing by ID */
  get(id: string): DrawingInstance | undefined {
    return this.drawings.get(id);
  }

  /** Get all visible drawings */
  getAll(): DrawingInstance[] {
    return Array.from(this.drawings.values()).filter(d => d.visible);
  }

  /** Get all drawing instances (including hidden) for object list */
  getAllInstances(): DrawingInstance[] {
    return Array.from(this.drawings.values());
  }

  /** Update drawing points (after editing) */
  updatePoints(id: string, points: Point[]): void {
    const d = this.drawings.get(id);
    if (d) d.points = [...points];
  }

  /** Update drawing options */
  updateOptions(id: string, options: Partial<DrawingOptions>): void {
    const d = this.drawings.get(id);
    if (d) Object.assign(d.options, options);
  }

  /** Toggle lock */
  toggleLock(id: string): void {
    const d = this.drawings.get(id);
    if (d) d.locked = !d.locked;
  }

  /** Toggle visibility */
  toggleVisible(id: string): void {
    const d = this.drawings.get(id);
    if (d) d.visible = !d.visible;
  }

  // ── Editing ───────────────────────────────────────────────────────────────

  /** Start editing a handle */
  startEditing(drawingId: string, handleIndex: number): void {
    const d = this.drawings.get(drawingId);
    if (!d || d.locked) return;
    this.state = { mode: 'editing', drawingId, handleIndex };
  }

  /** Start moving an entire drawing */
  startMoving(drawingId: string, mousePoint: Point): void {
    const d = this.drawings.get(drawingId);
    if (!d || d.locked) return;
    this.state = { mode: 'moving', drawingId, startMouse: mousePoint, startPoints: [...d.points] };
  }

  /** Update during drag */
  dragTo(point: Point): void {
    if (this.state.mode === 'editing') {
      const d = this.drawings.get(this.state.drawingId);
      if (d && this.state.handleIndex < d.points.length) {
        d.points[this.state.handleIndex] = point;
      }
    } else if (this.state.mode === 'moving') {
      const d = this.drawings.get(this.state.drawingId);
      if (!d) return;
      const dx = point.price - this.state.startMouse.price;
      const dt = point.time - this.state.startMouse.time;
      d.points = this.state.startPoints.map(p => ({
        price: p.price + dx,
        time: p.time + dt,
      }));
    }
  }

  /** End editing/moving */
  endDrag(): void {
    if (this.state.mode === 'editing' || this.state.mode === 'moving') {
      this.state = { mode: 'idle' };
    }
  }

  // ── Hit Testing ───────────────────────────────────────────────────────────

  /** Find drawing at pixel position. Returns drawing ID or null. */
  hitTest(
    mouse: PixelPoint,
    pointToPixel: (p: Point) => PixelPoint,
    threshold: number,
  ): { drawingId: string; handleIndex: number } | { drawingId: string } | null {
    // Check in reverse order (topmost drawing first)
    const all = Array.from(this.drawings.values()).filter(d => d.visible);

    for (let i = all.length - 1; i >= 0; i--) {
      const drawing = all[i]!;
      const tool = this.tools.get(drawing.toolName);
      if (!tool) continue;

      const pixelPoints = drawing.points.map(pointToPixel);

      // Check handles first
      if (!drawing.locked) {
        const handles = tool.getHandles(pixelPoints);
        for (let h = 0; h < handles.length; h++) {
          const handle = handles[h]!;
          const dist = Math.sqrt((mouse.x - handle.x) ** 2 + (mouse.y - handle.y) ** 2);
          if (dist <= threshold) {
            return { drawingId: drawing.id, handleIndex: h };
          }
        }
      }

      // Check drawing body
      if (tool.hitTest(mouse, pixelPoints, threshold)) {
        return { drawingId: drawing.id };
      }
    }

    return null;
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  /** Serialize all drawings to JSON */
  serialize(): object[] {
    return Array.from(this.drawings.values()).map(d => ({
      id: d.id,
      toolName: d.toolName,
      points: d.points,
      options: d.options,
      locked: d.locked,
      visible: d.visible,
    }));
  }

  /** Load drawings from serialized data */
  deserialize(data: object[]): void {
    this.drawings.clear();
    for (const item of data as DrawingInstance[]) {
      this.drawings.set(item.id, {
        ...item,
        points: [...item.points],
        options: { ...item.options },
      });
    }
  }

  /** Move a drawing to a specific index (for z-order) */
  reorder(id: string, toIndex: number): void {
    const all = Array.from(this.drawings.entries());
    const fromIndex = all.findIndex(([k]) => k === id);
    if (fromIndex < 0 || fromIndex === toIndex) return;
    const [entry] = all.splice(fromIndex, 1);
    all.splice(Math.max(0, Math.min(toIndex, all.length)), 0, entry!);
    this.drawings.clear();
    for (const [k, v] of all) this.drawings.set(k, v);
  }

  /** Bring drawing to front (render last = topmost) */
  bringToFront(id: string): void {
    const d = this.drawings.get(id);
    if (!d) return;
    this.drawings.delete(id);
    this.drawings.set(id, d);
  }

  /** Send drawing to back (render first = bottommost) */
  sendToBack(id: string): void {
    this.reorder(id, 0);
  }

  /** Clear all drawings */
  clear(): void {
    this.drawings.clear();
    this.state = { mode: 'idle' };
  }
}
