// ── Context Menu ────────────────────────────────────────────────────────────
// Right-click context menu for drawings: Edit, Delete, Clone, Lock, Color.
// Uses DOM API (no innerHTML) to prevent XSS from user-provided content.

export interface ContextMenuItem {
  label: string;
  action: string;
  icon?: string;
  danger?: boolean;
  toggle?: boolean;
  active?: boolean;
}

export type ContextMenuCallback = (action: string, drawingId: string) => void;

export class ContextMenu {
  private el: HTMLDivElement;
  private drawingId: string | null = null;
  private callback: ContextMenuCallback;

  constructor(container: HTMLElement, callback: ContextMenuCallback) {
    this.callback = callback;

    this.el = document.createElement('div');
    this.el.style.cssText = `
      display:none; position:absolute; z-index:300;
      background:var(--panel, #2a2e35); border:1px solid var(--border, rgba(255,255,255,0.1));
      border-radius:6px; padding:4px 0; min-width:160px;
      box-shadow:0 4px 16px rgba(0,0,0,0.5); font-size:12px; color:var(--text, #eaecef);
    `;
    container.appendChild(this.el);

    document.addEventListener('mousedown', (e) => {
      if (!this.el.contains(e.target as Node)) this.hide();
    });
  }

  show(x: number, y: number, drawingId: string, items: ContextMenuItem[]): void {
    this.drawingId = drawingId;

    // Clear previous items using DOM API (safe from XSS)
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);

    for (const item of items) {
      const row = document.createElement('div');
      row.dataset.action = item.action;
      row.style.cssText = `
        padding:6px 14px; cursor:pointer; display:flex; align-items:center; gap:8px;
        color:${item.danger ? '#f6465d' : item.active ? '#2962FF' : '#b7bdc6'};
        transition:background .1s;
      `;
      row.addEventListener('mouseover', () => { row.style.background = 'rgba(255,255,255,0.06)'; });
      row.addEventListener('mouseout', () => { row.style.background = 'none'; });

      if (item.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.style.cssText = 'width:16px; text-align:center;';
        iconSpan.textContent = item.icon; // textContent — safe
        row.appendChild(iconSpan);
      }

      const labelSpan = document.createElement('span');
      labelSpan.textContent = item.label; // textContent — safe
      row.appendChild(labelSpan);

      if (item.toggle !== undefined) {
        const checkSpan = document.createElement('span');
        checkSpan.style.cssText = `margin-left:auto; color:${item.active ? '#2962FF' : '#5e6673'}`;
        checkSpan.textContent = item.active ? '\u2713' : '';
        row.appendChild(checkSpan);
      }

      row.addEventListener('click', () => {
        if (this.drawingId) this.callback(item.action, this.drawingId);
        this.hide();
      });

      this.el.appendChild(row);
    }

    this.el.style.display = 'block';
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
  }

  hide(): void {
    this.el.style.display = 'none';
    this.drawingId = null;
  }

  destroy(): void {
    this.el.remove();
  }
}

export function getDrawingContextMenuItems(locked: boolean): ContextMenuItem[] {
  return [
    { label: 'Edit', action: 'edit', icon: '\u270E' },
    { label: locked ? 'Unlock' : 'Lock', action: 'lock', icon: locked ? '\u{1F513}' : '\u{1F512}', toggle: true, active: locked },
    { label: 'Clone', action: 'clone', icon: '\u29C9' },
    { label: 'Color', action: 'color', icon: '\u25C9' },
    { label: 'Delete', action: 'delete', icon: '\u2715', danger: true },
  ];
}
