import { describe, it, expect, beforeEach } from 'vitest';
import { UndoStack } from '../src/core/undo';
import type { UndoAction } from '../src/core/undo';

describe('UndoStack', () => {
  let stack: UndoStack;

  beforeEach(() => { stack = new UndoStack(); });

  const action = (type: 'add' | 'remove' | 'modify' = 'add', id = 'd1'): UndoAction => ({
    type, drawingId: id, data: { some: 'state' },
  });

  describe('push', () => {
    it('adds action to undo stack', () => {
      stack.push(action());
      expect(stack.canUndo()).toBe(true);
    });

    it('clears redo stack on new push', () => {
      stack.push(action());
      stack.undo();
      expect(stack.canRedo()).toBe(true);
      stack.push(action('modify'));
      expect(stack.canRedo()).toBe(false);
    });

    it('respects MAX_UNDO = 50 limit', () => {
      for (let i = 0; i < 60; i++) stack.push(action('add', `d${i}`));
      let count = 0;
      while (stack.canUndo()) { stack.undo(); count++; }
      expect(count).toBe(50);
    });
  });

  describe('undo', () => {
    it('returns null when empty', () => {
      expect(stack.undo()).toBeNull();
    });

    it('returns last pushed action', () => {
      const a = action('modify', 'd5');
      stack.push(a);
      expect(stack.undo()).toEqual(a);
    });

    it('returns actions in LIFO order', () => {
      stack.push(action('add', 'd1'));
      stack.push(action('modify', 'd2'));
      stack.push(action('remove', 'd3'));
      expect(stack.undo()!.drawingId).toBe('d3');
      expect(stack.undo()!.drawingId).toBe('d2');
      expect(stack.undo()!.drawingId).toBe('d1');
      expect(stack.undo()).toBeNull();
    });

    it('moves action to redo stack', () => {
      stack.push(action());
      expect(stack.canRedo()).toBe(false);
      stack.undo();
      expect(stack.canRedo()).toBe(true);
    });
  });

  describe('redo', () => {
    it('returns null when empty', () => {
      expect(stack.redo()).toBeNull();
    });

    it('restores undone action', () => {
      const a = action();
      stack.push(a);
      stack.undo();
      expect(stack.redo()).toEqual(a);
      expect(stack.canUndo()).toBe(true);
    });

    it('works for multiple undo/redo cycles', () => {
      stack.push(action('add', 'd1'));
      stack.push(action('add', 'd2'));
      stack.undo(); // undo d2
      stack.undo(); // undo d1
      expect(stack.redo()!.drawingId).toBe('d1');
      expect(stack.redo()!.drawingId).toBe('d2');
      expect(stack.redo()).toBeNull();
    });
  });

  describe('canUndo / canRedo', () => {
    it('both false when empty', () => {
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(false);
    });

    it('canUndo true after push, canRedo false', () => {
      stack.push(action());
      expect(stack.canUndo()).toBe(true);
      expect(stack.canRedo()).toBe(false);
    });

    it('canRedo true after undo', () => {
      stack.push(action());
      stack.undo();
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(true);
    });
  });

  describe('clear', () => {
    it('clears both stacks', () => {
      stack.push(action());
      stack.push(action());
      stack.undo();
      stack.clear();
      expect(stack.canUndo()).toBe(false);
      expect(stack.canRedo()).toBe(false);
    });
  });
});
