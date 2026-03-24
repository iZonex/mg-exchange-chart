// ── Keyboard Shortcuts ──────────────────────────────────────────────────────
// Handles keyboard events for chart interactions.

export interface KeyboardAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  action: string;
}

const DEFAULT_SHORTCUTS: KeyboardAction[] = [
  { key: 'Escape', action: 'cancel' },
  { key: 'Delete', action: 'delete' },
  { key: 'Backspace', action: 'delete' },
  { key: '+', action: 'zoom-in' },
  { key: '=', action: 'zoom-in' },
  { key: '-', action: 'zoom-out' },
  { key: 'ArrowLeft', action: 'scroll-left' },
  { key: 'ArrowRight', action: 'scroll-right' },
  { key: 'ArrowUp', action: 'zoom-in' },
  { key: 'ArrowDown', action: 'zoom-out' },
  { key: 'Home', action: 'scroll-start' },
  { key: 'End', action: 'scroll-end' },
  { key: 'z', ctrl: true, action: 'undo' },
];

export type KeyboardCallback = (action: string) => void;

export class KeyboardHandler {
  private element: HTMLElement;
  private callback: KeyboardCallback;
  private shortcuts: KeyboardAction[];

  constructor(element: HTMLElement, callback: KeyboardCallback) {
    this.element = element;
    this.callback = callback;
    this.shortcuts = DEFAULT_SHORTCUTS;

    // Make element focusable
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
    element.style.outline = 'none';

    this.onKeyDown = this.onKeyDown.bind(this);
    element.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown(e: KeyboardEvent): void {
    for (const shortcut of this.shortcuts) {
      if (
        e.key === shortcut.key &&
        !!e.ctrlKey === !!shortcut.ctrl &&
        !!e.shiftKey === !!shortcut.shift
      ) {
        e.preventDefault();
        this.callback(shortcut.action);
        return;
      }
    }
  }

  destroy(): void {
    this.element.removeEventListener('keydown', this.onKeyDown);
  }
}
