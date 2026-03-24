// ── Undo/Redo Stack ─────────────────────────────────────────────────────────
// Simple undo/redo for drawing operations.

export interface UndoAction {
  type: 'add' | 'remove' | 'modify';
  drawingId: string;
  data: any; // serialized drawing state
}

const MAX_UNDO = 50;

export class UndoStack {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];

  push(action: UndoAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.redoStack = []; // clear redo on new action
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  undo(): UndoAction | null {
    const action = this.undoStack.pop();
    if (!action) return null;
    this.redoStack.push(action);
    return action;
  }

  redo(): UndoAction | null {
    const action = this.redoStack.pop();
    if (!action) return null;
    this.undoStack.push(action);
    return action;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
