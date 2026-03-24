import { describe, it, expect, beforeEach } from 'vitest';
import { DataSource } from '../src/core/data/data-source';
import type { Bar } from '../src/api/types';

function bar(time: number, close = 100, extra?: Partial<Bar>): Bar {
  return { time, open: close - 1, high: close + 2, low: close - 2, close, volume: 50, ...extra };
}

describe('DataSource', () => {
  let ds: DataSource;

  beforeEach(() => { ds = new DataSource(); });

  describe('setData', () => {
    it('sets bars and sorts by time', () => {
      ds.setData([bar(3), bar(1), bar(2)]);
      expect(ds.length).toBe(3);
      expect(ds.first!.time).toBe(1);
      expect(ds.last!.time).toBe(3);
    });

    it('replaces existing data', () => {
      ds.setData([bar(1), bar(2)]);
      ds.setData([bar(10)]);
      expect(ds.length).toBe(1);
      expect(ds.first!.time).toBe(10);
    });

    it('handles empty array', () => {
      ds.setData([]);
      expect(ds.length).toBe(0);
      expect(ds.first).toBeUndefined();
      expect(ds.last).toBeUndefined();
    });
  });

  describe('prepend', () => {
    it('adds bars before existing', () => {
      ds.setData([bar(10), bar(20)]);
      ds.prepend([bar(1), bar(5)]);
      expect(ds.length).toBe(4);
      expect(ds.first!.time).toBe(1);
    });

    it('filters out bars already present', () => {
      ds.setData([bar(10), bar(20)]);
      ds.prepend([bar(5), bar(10), bar(15)]);
      expect(ds.length).toBe(3); // 5 + 10 + 20 (15 filtered because >= 10)
    });

    it('no-op for empty array', () => {
      ds.setData([bar(10)]);
      ds.prepend([]);
      expect(ds.length).toBe(1);
    });

    it('no-op when all bars overlap', () => {
      ds.setData([bar(10), bar(20)]);
      ds.prepend([bar(10), bar(20)]);
      expect(ds.length).toBe(2);
    });
  });

  describe('updateLast', () => {
    it('updates existing last bar (same time)', () => {
      ds.setData([bar(10, 100)]);
      ds.updateLast(bar(10, 200));
      expect(ds.length).toBe(1);
      expect(ds.last!.close).toBe(200);
    });

    it('appends new bar (later time)', () => {
      ds.setData([bar(10)]);
      ds.updateLast(bar(20));
      expect(ds.length).toBe(2);
      expect(ds.last!.time).toBe(20);
    });

    it('ignores bar with earlier time', () => {
      ds.setData([bar(10), bar(20)]);
      ds.updateLast(bar(5));
      expect(ds.length).toBe(2);
    });

    it('works on empty datasource', () => {
      ds.updateLast(bar(10));
      expect(ds.length).toBe(1);
      expect(ds.first!.time).toBe(10);
    });
  });

  describe('getBar', () => {
    it('returns bar at index', () => {
      ds.setData([bar(1), bar(2), bar(3)]);
      expect(ds.getBar(0)!.time).toBe(1);
      expect(ds.getBar(2)!.time).toBe(3);
    });

    it('returns undefined for out-of-range', () => {
      ds.setData([bar(1)]);
      expect(ds.getBar(-1)).toBeUndefined();
      expect(ds.getBar(5)).toBeUndefined();
    });
  });

  describe('getBarByTime', () => {
    it('returns bar by exact time', () => {
      ds.setData([bar(100), bar(200), bar(300)]);
      expect(ds.getBarByTime(200)!.time).toBe(200);
    });

    it('returns undefined for non-existent time', () => {
      ds.setData([bar(100)]);
      expect(ds.getBarByTime(999)).toBeUndefined();
    });
  });

  describe('nearestIndex', () => {
    it('returns -1 for empty', () => {
      expect(ds.nearestIndex(100)).toBe(-1);
    });

    it('returns exact match index', () => {
      ds.setData([bar(10), bar(20), bar(30)]);
      expect(ds.nearestIndex(20)).toBe(1);
    });

    it('returns nearest index for between values', () => {
      ds.setData([bar(10), bar(20), bar(30)]);
      expect(ds.nearestIndex(19)).toBe(1); // closer to 20
      expect(ds.nearestIndex(11)).toBe(0); // closer to 10
      expect(ds.nearestIndex(25)).toBe(2); // closer to 30
    });

    it('handles before first bar', () => {
      ds.setData([bar(10), bar(20)]);
      expect(ds.nearestIndex(1)).toBe(0);
    });

    it('handles after last bar', () => {
      ds.setData([bar(10), bar(20)]);
      expect(ds.nearestIndex(100)).toBe(1);
    });
  });

  describe('getRange', () => {
    it('returns slice', () => {
      ds.setData([bar(1), bar(2), bar(3), bar(4), bar(5)]);
      const range = ds.getRange(1, 4);
      expect(range).toHaveLength(3);
      expect(range[0]!.time).toBe(2);
      expect(range[2]!.time).toBe(4);
    });

    it('clamps to bounds', () => {
      ds.setData([bar(1), bar(2)]);
      expect(ds.getRange(-5, 100)).toHaveLength(2);
    });

    it('returns empty for invalid range', () => {
      ds.setData([bar(1)]);
      expect(ds.getRange(5, 10)).toHaveLength(0);
    });
  });

  describe('getPriceRange', () => {
    it('returns min/max from bars', () => {
      ds.setData([
        bar(1, 100, { low: 95, high: 105 }),
        bar(2, 110, { low: 108, high: 115 }),
        bar(3, 90, { low: 85, high: 92 }),
      ]);
      const range = ds.getPriceRange(0, 3);
      expect(range!.min).toBe(85);
      expect(range!.max).toBe(115);
    });

    it('returns null for empty range', () => {
      expect(ds.getPriceRange(0, 0)).toBeNull();
    });
  });

  describe('getMaxVolume', () => {
    it('returns max volume in range', () => {
      ds.setData([
        bar(1, 100, { volume: 10 }),
        bar(2, 100, { volume: 50 }),
        bar(3, 100, { volume: 30 }),
      ]);
      expect(ds.getMaxVolume(0, 3)).toBe(50);
    });

    it('returns 0 for empty range', () => {
      expect(ds.getMaxVolume(0, 0)).toBe(0);
    });
  });

  describe('indexOfTime', () => {
    it('returns index for known time', () => {
      ds.setData([bar(10), bar(20), bar(30)]);
      expect(ds.indexOfTime(20)).toBe(1);
    });

    it('returns -1 for unknown time', () => {
      ds.setData([bar(10)]);
      expect(ds.indexOfTime(999)).toBe(-1);
    });
  });

  describe('getAllBars', () => {
    it('returns readonly array', () => {
      ds.setData([bar(1), bar(2)]);
      const all = ds.getAllBars();
      expect(all).toHaveLength(2);
    });
  });

  describe('getRangeByTime', () => {
    it('returns bars within time range', () => {
      ds.setData([bar(10), bar(20), bar(30), bar(40), bar(50)]);
      const range = ds.getRangeByTime(20, 40);
      expect(range.length).toBe(3);
      expect(range[0]!.time).toBe(20);
      expect(range[2]!.time).toBe(40);
    });

    it('returns empty array for empty datasource', () => {
      const range = ds.getRangeByTime(10, 50);
      expect(range).toHaveLength(0);
    });

    it('returns bars when timeFrom falls between bars', () => {
      ds.setData([bar(10), bar(20), bar(30), bar(40)]);
      // nearestIndex(15) returns 1 (bar time 20), bar[1].time=20 >= 15, from=1
      // nearestIndex(35) returns 3 (bar time 40), to=4
      // slice(1, 4) = bars at times [20, 30, 40]
      const range = ds.getRangeByTime(15, 35);
      expect(range.length).toBe(3);
      expect(range[0]!.time).toBe(20);
      expect(range[2]!.time).toBe(40);
    });

    it('handles range where startIdx bar is before timeFrom', () => {
      ds.setData([bar(10), bar(20), bar(30), bar(40)]);
      // nearestIndex(12) → returns 0 (bar time 10 is closer: |10-12|=2 vs |20-12|=8)
      // bar[0].time = 10 < 12, so from = startIdx + 1 = 1
      // nearestIndex(25) → returns 1 (bar time 20 is closer: |20-25|=5 vs |30-25|=5, tie goes to lo=2... wait)
      // Actually: nearestIndex(25): lo=0,hi=3. mid=1, 20<25, lo=2. mid=2, 30>=25, hi=2. lo==hi=2.
      // Check prev: |30-25|=5 vs |20-25|=5, not <, returns 2. to=3
      // slice(1, 3) = bars at times [20, 30]
      const range = ds.getRangeByTime(12, 25);
      expect(range.length).toBe(2);
      expect(range[0]!.time).toBe(20);
      expect(range[1]!.time).toBe(30);
    });

    it('returns single bar when range matches exactly one bar', () => {
      ds.setData([bar(10), bar(20), bar(30)]);
      const range = ds.getRangeByTime(20, 20);
      expect(range.length).toBe(1);
      expect(range[0]!.time).toBe(20);
    });

    it('returns all bars when range covers everything', () => {
      ds.setData([bar(10), bar(20), bar(30)]);
      const range = ds.getRangeByTime(0, 100);
      expect(range.length).toBe(3);
    });

    it('handles range after all bars', () => {
      ds.setData([bar(10), bar(20)]);
      // nearestIndex(100) returns 1 (last bar), bar[1].time=20 < 100 so from = 2
      // to = nearestIndex(200) + 1 = 2
      const range = ds.getRangeByTime(100, 200);
      expect(range).toHaveLength(0);
    });
  });

  describe('prepend to empty datasource', () => {
    it('works when datasource is empty', () => {
      ds.prepend([bar(10), bar(20)]);
      expect(ds.length).toBe(2);
      expect(ds.first!.time).toBe(10);
    });
  });
});
