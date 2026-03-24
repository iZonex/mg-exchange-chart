// ── Indicator Settings Popup ─────────────────────────────────────────────────
// DOM popup for editing indicator params. Uses DOM API (no innerHTML)
// to prevent XSS from indicator/param names.

import type { IndicatorInstance } from '../../indicators/engine';

export type OnSettingsApply = (id: string, params: Record<string, any>) => void;
export type OnSettingsRemove = (id: string) => void;

export class IndicatorSettingsPopup {
  private el: HTMLDivElement;
  private instance: IndicatorInstance | null = null;
  private onApply: OnSettingsApply;
  private onRemove: OnSettingsRemove;

  constructor(container: HTMLElement, onApply: OnSettingsApply, onRemove: OnSettingsRemove) {
    this.onApply = onApply;
    this.onRemove = onRemove;

    this.el = document.createElement('div');
    this.el.style.cssText = `
      display:none; position:absolute; z-index:400;
      background:var(--panel, #2a2e35); border:1px solid var(--border, rgba(255,255,255,0.1));
      border-radius:8px; padding:14px 16px; min-width:220px;
      box-shadow:0 8px 24px rgba(0,0,0,0.5); font-size:12px; color:var(--text, #eaecef);
    `;
    container.appendChild(this.el);

    document.addEventListener('mousedown', (e) => {
      if (this.el.style.display !== 'none' && !this.el.contains(e.target as Node)) this.hide();
    });
  }

  show(x: number, y: number, instance: IndicatorInstance): void {
    this.instance = instance;
    const ind = instance.indicator;

    // Clear previous content
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);

    // Title
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600; margin-bottom:10px;';
    title.textContent = ind.name; // textContent — safe from XSS
    this.el.appendChild(title);

    // Param inputs
    for (const param of ind.params) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;';

      const label = document.createElement('label');
      label.style.color = '#b7bdc6';
      label.textContent = param.name; // textContent — safe
      row.appendChild(label);

      if (param.type === 'color') {
        const input = document.createElement('input');
        input.type = 'color';
        input.dataset.param = param.name;
        input.value = String(instance.params[param.name] ?? param.default);
        input.style.cssText = 'width:32px; height:20px; border:none; cursor:pointer;';
        row.appendChild(input);
      } else if (param.type === 'number') {
        const input = document.createElement('input');
        input.type = 'number';
        input.dataset.param = param.name;
        input.value = String(instance.params[param.name] ?? param.default);
        if (param.min !== undefined) input.min = String(param.min);
        if (param.max !== undefined) input.max = String(param.max);
        if (param.step !== undefined) input.step = String(param.step);
        input.style.cssText = 'width:60px; padding:3px 6px; background:#1e2329; color:#eaecef; border:1px solid rgba(255,255,255,0.1); border-radius:4px; font-size:11px;';
        row.appendChild(input);
      }

      this.el.appendChild(row);
    }

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:6px; margin-top:10px;';

    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    applyBtn.style.cssText = 'flex:1; padding:6px; background:#2962FF; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:11px;';
    applyBtn.addEventListener('click', () => {
      if (!this.instance) return;
      const params: Record<string, any> = {};
      this.el.querySelectorAll<HTMLInputElement>('[data-param]').forEach((input) => {
        const name = input.dataset.param!;
        params[name] = input.type === 'number' ? parseFloat(input.value) : input.value;
      });
      this.onApply(this.instance.id, params);
      this.hide();
    });
    btnRow.appendChild(applyBtn);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.style.cssText = 'padding:6px 10px; background:rgba(246,70,93,0.15); color:#f6465d; border:1px solid rgba(246,70,93,0.3); border-radius:4px; cursor:pointer; font-size:11px;';
    removeBtn.addEventListener('click', () => {
      if (!this.instance) return;
      this.onRemove(this.instance.id);
      this.hide();
    });
    btnRow.appendChild(removeBtn);

    this.el.appendChild(btnRow);

    this.el.style.display = 'block';
    this.el.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
    this.el.style.top = `${y}px`;
  }

  hide(): void {
    this.el.style.display = 'none';
    this.instance = null;
  }

  destroy(): void {
    this.el.remove();
  }
}
