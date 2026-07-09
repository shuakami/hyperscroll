import { describe, expect, it } from 'vitest';
import { HeightCache } from '../src/height-cache.js';
 
describe('HeightCache', () => {
  it('returns fallback before any measurement', () => {
    const c = new HeightCache(60);
    expect(c.get(123)).toBe(60);
    expect(c.average()).toBe(60);
  });
 
  it('stores and returns measured heights', () => {
    const c = new HeightCache(60);
    c.set(1, 100);
    expect(c.get(1)).toBe(100);
    expect(c.has(1)).toBe(true);
  });
 
  it('estimates unmeasured items with the running average', () => {
    const c = new HeightCache(60);
    c.set(1, 100);
    c.set(2, 200);
    expect(c.get(999)).toBe(150);
  });
 
  it('updates an existing entry without skewing the average', () => {
    const c = new HeightCache(60);
    c.set(1, 100);
    c.set(1, 300);
    expect(c.get(1)).toBe(300);
    expect(c.average()).toBe(300);
  });
 
  it('evicts oldest entries at capacity and keeps memory bounded', () => {
    const c = new HeightCache(60, 3);
    c.set(1, 10);
    c.set(2, 20);
    c.set(3, 30);
    c.set(4, 40);
    expect(c.size).toBe(3);
    expect(c.has(1)).toBe(false);
    expect(c.has(4)).toBe(true);
  });
 
  it('ignores non-positive heights', () => {
    const c = new HeightCache(60);
    c.set(1, 0);
    c.set(2, -5);
    expect(c.size).toBe(0);
    expect(c.average()).toBe(60);
  });
});
