import { describe, it, expect, beforeEach } from 'vitest';
import { DrawingEngine } from '../src/drawings/engine';
import type { DrawingInstance } from '../src/drawings/engine';

// Minimal tool for testing
const stubTool = {
  name: 'stub',
  icon: '',
  pointCount: 2,
  render() {},
  hitTest() { return false; },
  getHandles(points: any[]) { return points; },
};

describe('DrawingEngine', () => {
  let engine: DrawingEngine;

  beforeEach(() => {
    engine = new DrawingEngine();
    engine.registerTool(stubTool);
  });

  function addDrawing(id?: string): DrawingInstance {
    engine.startCreating('stub');
    engine.addPoint({ price: 100, time: 1000 });
    const result = engine.addPoint({ price: 200, time: 2000 });
    return result!;
  }

  describe('creation', () => {
    it('creates a drawing with 2 points', () => {
      const d = addDrawing();
      expect(d).toBeTruthy();
      expect(d.toolName).toBe('stub');
      expect(d.points).toHaveLength(2);
    });

    it('assigns unique IDs', () => {
      const d1 = addDrawing();
      const d2 = addDrawing();
      expect(d1.id).not.toBe(d2.id);
    });

    it('returns to idle after creation', () => {
      addDrawing();
      expect(engine.state.mode).toBe('idle');
    });
  });

  describe('getAllInstances', () => {
    it('returns all drawings including hidden', () => {
      const d1 = addDrawing();
      const d2 = addDrawing();
      engine.toggleVisible(d2.id);
      expect(engine.getAllInstances()).toHaveLength(2);
      expect(engine.getAll()).toHaveLength(1); // only visible
    });
  });

  describe('select / deselect', () => {
    it('selects a drawing', () => {
      const d = addDrawing();
      engine.select(d.id);
      expect(engine.getSelected()?.id).toBe(d.id);
    });

    it('deselects', () => {
      const d = addDrawing();
      engine.select(d.id);
      engine.deselect();
      expect(engine.getSelected()).toBeNull();
    });
  });

  describe('remove', () => {
    it('removes drawing', () => {
      const d = addDrawing();
      engine.remove(d.id);
      expect(engine.getAllInstances()).toHaveLength(0);
    });

    it('returns false for non-existent', () => {
      expect(engine.remove('nonexistent')).toBe(false);
    });
  });

  describe('toggleLock / toggleVisible', () => {
    it('toggles lock', () => {
      const d = addDrawing();
      expect(d.locked).toBe(false);
      engine.toggleLock(d.id);
      expect(engine.get(d.id)!.locked).toBe(true);
      engine.toggleLock(d.id);
      expect(engine.get(d.id)!.locked).toBe(false);
    });

    it('toggles visibility', () => {
      const d = addDrawing();
      expect(d.visible).toBe(true);
      engine.toggleVisible(d.id);
      expect(engine.get(d.id)!.visible).toBe(false);
    });
  });

  describe('updateOptions', () => {
    it('merges options', () => {
      const d = addDrawing();
      engine.updateOptions(d.id, { color: '#ff0000' });
      expect(engine.get(d.id)!.options.color).toBe('#ff0000');
    });
  });

  describe('reorder / bringToFront / sendToBack', () => {
    it('bringToFront moves drawing to end', () => {
      const d1 = addDrawing();
      const d2 = addDrawing();
      const d3 = addDrawing();
      engine.bringToFront(d1.id);
      const all = engine.getAllInstances();
      expect(all[all.length - 1]!.id).toBe(d1.id);
    });

    it('sendToBack moves drawing to start', () => {
      const d1 = addDrawing();
      const d2 = addDrawing();
      const d3 = addDrawing();
      engine.sendToBack(d3.id);
      const all = engine.getAllInstances();
      expect(all[0]!.id).toBe(d3.id);
    });

    it('reorder moves drawing to specific index', () => {
      const d1 = addDrawing();
      const d2 = addDrawing();
      const d3 = addDrawing();
      engine.reorder(d3.id, 0);
      const all = engine.getAllInstances();
      expect(all[0]!.id).toBe(d3.id);
    });
  });

  describe('serialization', () => {
    it('serialize and deserialize round-trips', () => {
      addDrawing();
      addDrawing();
      const data = engine.serialize();
      expect(data).toHaveLength(2);

      engine.clear();
      expect(engine.getAllInstances()).toHaveLength(0);

      engine.deserialize(data);
      expect(engine.getAllInstances()).toHaveLength(2);
    });

    it('preserves options through serialization', () => {
      const d = addDrawing();
      engine.updateOptions(d.id, { color: '#ff0000', lineWidth: 3 });
      const data = engine.serialize();
      engine.clear();
      engine.deserialize(data);
      const restored = engine.getAllInstances()[0]!;
      expect(restored.options.color).toBe('#ff0000');
      expect(restored.options.lineWidth).toBe(3);
    });
  });

  describe('editing', () => {
    it('startEditing / dragTo / endDrag updates point', () => {
      const d = addDrawing();
      engine.startEditing(d.id, 0);
      expect(engine.state.mode).toBe('editing');
      engine.dragTo({ price: 500, time: 5000 });
      expect(engine.get(d.id)!.points[0]!.price).toBe(500);
      engine.endDrag();
      expect(engine.state.mode).toBe('idle');
    });

    it('startMoving / dragTo moves all points', () => {
      const d = addDrawing();
      const origP0 = { ...d.points[0]! };
      engine.startMoving(d.id, { price: 100, time: 1000 });
      engine.dragTo({ price: 110, time: 1100 });
      expect(engine.get(d.id)!.points[0]!.price).toBe(origP0.price + 10);
      engine.endDrag();
    });

    it('cannot edit locked drawing', () => {
      const d = addDrawing();
      engine.toggleLock(d.id);
      engine.startEditing(d.id, 0);
      expect(engine.state.mode).toBe('idle');
    });
  });

  describe('clear', () => {
    it('removes all drawings and resets state', () => {
      addDrawing();
      addDrawing();
      engine.startCreating('stub');
      engine.clear();
      expect(engine.getAllInstances()).toHaveLength(0);
      expect(engine.state.mode).toBe('idle');
    });
  });

  describe('getTool', () => {
    it('returns registered tool', () => {
      expect(engine.getTool('stub')).toBe(stubTool);
    });

    it('returns undefined for unregistered tool', () => {
      expect(engine.getTool('nonexistent')).toBeUndefined();
    });
  });

  describe('startCreating with unknown tool', () => {
    it('throws for unregistered tool name', () => {
      expect(() => engine.startCreating('unknown_tool')).toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('addPoint when not creating', () => {
    it('returns null when not in creating mode', () => {
      expect(engine.addPoint({ price: 100, time: 1000 })).toBeNull();
    });
  });

  describe('setPreviewPoint', () => {
    it('sets preview point during creation', () => {
      engine.startCreating('stub');
      engine.setPreviewPoint({ price: 150, time: 1500 });
      expect((engine.state as any).previewPoint).toEqual({ price: 150, time: 1500 });
    });

    it('does nothing when not in creating mode', () => {
      engine.setPreviewPoint({ price: 150, time: 1500 });
      expect(engine.state.mode).toBe('idle');
    });
  });

  describe('cancelCreating', () => {
    it('cancels creation and returns to idle', () => {
      engine.startCreating('stub');
      engine.addPoint({ price: 100, time: 1000 });
      engine.cancelCreating();
      expect(engine.state.mode).toBe('idle');
    });
  });

  describe('select with null', () => {
    it('returns null when selecting null', () => {
      const result = engine.select(null);
      expect(result).toBeNull();
    });

    it('returns null for nonexistent id', () => {
      const result = engine.select('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getSelected with no selection', () => {
    it('returns null when nothing is selected', () => {
      expect(engine.getSelected()).toBeNull();
    });
  });

  describe('dragTo edge cases', () => {
    it('does nothing in idle mode', () => {
      expect(() => engine.dragTo({ price: 100, time: 1000 })).not.toThrow();
    });

    it('handles editing with out-of-range handleIndex', () => {
      const d = addDrawing();
      engine.startEditing(d.id, 999);
      // Should not throw, just no-op
      engine.dragTo({ price: 500, time: 5000 });
      expect(engine.get(d.id)!.points[0]!.price).toBe(100); // unchanged
      engine.endDrag();
    });

    it('handles moving a deleted drawing', () => {
      const d = addDrawing();
      engine.startMoving(d.id, { price: 100, time: 1000 });
      engine.remove(d.id);
      // Should not throw
      expect(() => engine.dragTo({ price: 200, time: 2000 })).not.toThrow();
      engine.endDrag();
    });
  });

  describe('endDrag in idle mode', () => {
    it('stays idle', () => {
      engine.endDrag();
      expect(engine.state.mode).toBe('idle');
    });
  });

  describe('updatePoints / updateOptions with nonexistent id', () => {
    it('updatePoints does nothing for unknown id', () => {
      expect(() => engine.updatePoints('nonexistent', [])).not.toThrow();
    });

    it('updateOptions does nothing for unknown id', () => {
      expect(() => engine.updateOptions('nonexistent', { color: '#fff' })).not.toThrow();
    });
  });

  describe('toggleLock / toggleVisible with nonexistent id', () => {
    it('toggleLock does nothing for unknown id', () => {
      expect(() => engine.toggleLock('nonexistent')).not.toThrow();
    });

    it('toggleVisible does nothing for unknown id', () => {
      expect(() => engine.toggleVisible('nonexistent')).not.toThrow();
    });
  });

  describe('startEditing / startMoving with nonexistent id', () => {
    it('startEditing does nothing for unknown id', () => {
      engine.startEditing('nonexistent', 0);
      expect(engine.state.mode).toBe('idle');
    });

    it('startMoving does nothing for unknown id', () => {
      engine.startMoving('nonexistent', { price: 100, time: 1000 });
      expect(engine.state.mode).toBe('idle');
    });

    it('startMoving does nothing for locked drawing', () => {
      const d = addDrawing();
      engine.toggleLock(d.id);
      engine.startMoving(d.id, { price: 100, time: 1000 });
      expect(engine.state.mode).toBe('idle');
    });
  });

  describe('bringToFront with nonexistent id', () => {
    it('does nothing for unknown id', () => {
      expect(() => engine.bringToFront('nonexistent')).not.toThrow();
    });
  });

  describe('reorder edge cases', () => {
    it('no-op when fromIndex equals toIndex', () => {
      const d1 = addDrawing();
      const d2 = addDrawing();
      engine.reorder(d1.id, 0);
      const all = engine.getAllInstances();
      expect(all[0]!.id).toBe(d1.id);
    });

    it('no-op for nonexistent id', () => {
      addDrawing();
      expect(() => engine.reorder('nonexistent', 0)).not.toThrow();
    });
  });
});
