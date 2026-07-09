import { describe, expect, it } from 'vitest';
import { indexToScrollTop, normalizeAnchor, scrollTopToIndex } from '../src/anchor.js';
 
const fixed = (h: number) => () => h;
 
describe('normalizeAnchor', () => {
  it('keeps an in-range anchor untouched', () => {
    expect(normalizeAnchor({ index: 5, offset: 10 }, 100, fixed(50))).toEqual({ index: 5, offset: 10 });
  });
 
  it('walks forward when offset exceeds item height', () => {
    expect(normalizeAnchor({ index: 0, offset: 125 }, 100, fixed(50))).toEqual({ index: 2, offset: 25 });
  });
 
  it('walks backward on negative offset', () => {
    expect(normalizeAnchor({ index: 10, offset: -75 }, 100, fixed(50))).toEqual({ index: 8, offset: 25 });
  });
 
  it('walks across variable heights', () => {
    const heights = [10, 20, 30, 40, 50];
    const at = (i: number) => heights[i] ?? 1;
    expect(normalizeAnchor({ index: 0, offset: 35 }, 5, at)).toEqual({ index: 2, offset: 5 });
    expect(normalizeAnchor({ index: 3, offset: -25 }, 5, at)).toEqual({ index: 2, offset: 5 });
    expect(normalizeAnchor({ index: 3, offset: -55 }, 5, at)).toEqual({ index: 0, offset: 5 });
  });
 
  it('clamps at the top', () => {
    expect(normalizeAnchor({ index: 0, offset: -999 }, 100, fixed(50))).toEqual({ index: 0, offset: 0 });
    expect(normalizeAnchor({ index: -5, offset: 0 }, 100, fixed(50))).toEqual({ index: 0, offset: 0 });
  });
 
  it('clamps at the bottom', () => {
    expect(normalizeAnchor({ index: 99, offset: 1e9 }, 100, fixed(50))).toEqual({ index: 99, offset: 0 });
    expect(normalizeAnchor({ index: 500, offset: 0 }, 100, fixed(50))).toEqual({ index: 99, offset: 0 });
  });
 
  it('handles empty sources', () => {
    expect(normalizeAnchor({ index: 3, offset: 7 }, 0, fixed(50))).toEqual({ index: 0, offset: 0 });
  });
 
  it('handles huge counts without iterating them (bounded by delta/height)', () => {
    const res = normalizeAnchor({ index: 50_000_000, offset: 100_000 }, 100_000_000, fixed(50));
    expect(res).toEqual({ index: 50_002_000, offset: 0 });
  });
});
 
describe('scrollbar mapping', () => {
  const COUNT = 30_000_000;
  const MAX = 3_000_000;
 
  it('maps extremes exactly', () => {
    expect(scrollTopToIndex(0, MAX, COUNT)).toBe(0);
    expect(scrollTopToIndex(MAX, MAX, COUNT)).toBe(COUNT - 1);
    expect(indexToScrollTop(0, MAX, COUNT)).toBe(0);
    expect(indexToScrollTop(COUNT - 1, MAX, COUNT)).toBe(MAX);
  });
 
  it('round-trips within thumb resolution', () => {
    for (const idx of [1, 12345, 9_490_119, 23_456_789, COUNT - 2]) {
      const st = indexToScrollTop(idx, MAX, COUNT);
      expect(Math.abs(scrollTopToIndex(st, MAX, COUNT) - idx)).toBeLessThanOrEqual(Math.ceil(COUNT / MAX));
    }
  });
 
  it('clamps out-of-range scrollTop', () => {
    expect(scrollTopToIndex(-100, MAX, COUNT)).toBe(0);
    expect(scrollTopToIndex(MAX + 100, MAX, COUNT)).toBe(COUNT - 1);
  });
 
  it('degenerate cases', () => {
    expect(scrollTopToIndex(500, 0, COUNT)).toBe(0);
    expect(scrollTopToIndex(500, MAX, 1)).toBe(0);
    expect(indexToScrollTop(5, 0, COUNT)).toBe(0);
  });
});
