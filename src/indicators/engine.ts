// ── Indicator Engine ────────────────────────────────────────────────────────
// Manages indicator instances: computes outputs from bar data, caches results,
// and recomputes when data or params change.

import type { Bar, Indicator, IndicatorOutput } from '../api/types';

export interface IndicatorInstance {
  readonly id: string;
  readonly indicator: Indicator;
  params: Record<string, number | string | boolean>;
  outputs: IndicatorOutput[];
  visible: boolean;
}

let nextId = 1;

export class IndicatorEngine {
  private instances = new Map<string, IndicatorInstance>();

  /** Add an indicator with optional param overrides. Returns instance ID. */
  add(indicator: Indicator, paramOverrides?: Record<string, number | string | boolean>): string {
    const id = `ind_${nextId++}`;
    const params: Record<string, number | string | boolean> = {};
    for (const p of indicator.params) {
      params[p.name] = paramOverrides?.[p.name] ?? p.default;
    }
    this.instances.set(id, { id, indicator, params, outputs: [], visible: true });
    return id;
  }

  /** Remove an indicator by ID */
  remove(id: string): boolean {
    return this.instances.delete(id);
  }

  /** Update indicator params and clear cached output */
  updateParams(id: string, params: Record<string, number | string | boolean>): void {
    const inst = this.instances.get(id);
    if (!inst) return;
    Object.assign(inst.params, params);
    inst.outputs = []; // force recompute
  }

  /** Toggle indicator visibility */
  setVisible(id: string, visible: boolean): void {
    const inst = this.instances.get(id);
    if (inst) inst.visible = visible;
  }

  /** Recompute all indicators from bar data */
  compute(bars: readonly Bar[]): void {
    for (const inst of this.instances.values()) {
      inst.outputs = inst.indicator.calculate(bars as Bar[], inst.params);
    }
  }

  /** Get all active instances */
  getAll(): IndicatorInstance[] {
    return Array.from(this.instances.values());
  }

  /** Get overlay indicators (rendered on price chart) */
  getOverlays(): IndicatorInstance[] {
    return this.getAll().filter(i => i.indicator.overlay && i.visible);
  }

  /** Get oscillator indicators (rendered in separate panes) */
  getOscillators(): IndicatorInstance[] {
    return this.getAll().filter(i => !i.indicator.overlay && i.visible);
  }

  /** Get instance by ID */
  get(id: string): IndicatorInstance | undefined {
    return this.instances.get(id);
  }

  /** Get indicator output value at a specific bar index */
  getValueAt(id: string, barIndex: number): Record<string, number | undefined> | undefined {
    const inst = this.instances.get(id);
    if (!inst || barIndex < 0 || barIndex >= inst.outputs.length) return undefined;
    return inst.outputs[barIndex]?.values;
  }
}
