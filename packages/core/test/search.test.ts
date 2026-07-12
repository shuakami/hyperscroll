import { describe, expect, it, vi } from 'vitest';
import { BitsetIndex, FilteredDataSource, SearchScanner } from '../src/search.js';
import type { DataSource } from '../src/types.js';
 
function makeSource(count: number): DataSource {
  return {
    count,
    renderToString: (i) => `<div>item ${i}</div>`,
    renderSeekToString: (i) => `<div>seek ${i}</div>`,
    estimateHeight: (i) => 10 + (i % 5),
  };
}
 
describe('SearchScanner', () => {
  it('streams matches in ascending order and reports completion', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 0);
      return 0;
    });
    const batches: number[][] = [];
    const done = new Promise<BitsetIndex>((resolve) => {
      const scanner = new SearchScanner(100_000, (i) => i % 9_973 === 0, {
        onMatches: (b) => batches.push([...b]),
        onDone: resolve,
      });
      scanner.start();
    });
    const matches = await done;
    expect([...matches]).toEqual([0, 9_973, 19_946, 29_919, 39_892, 49_865, 59_838, 69_811, 79_784, 89_757, 99_730]);
    expect(batches.flat()).toEqual([...matches]);
  });
 
  it('respects the match limit', async () => {
    const done = new Promise<BitsetIndex>((resolve) => {
      new SearchScanner(1_000_000, (i) => i % 2 === 0, { limit: 5, onDone: resolve }).start();
    });
    expect([...(await done)]).toEqual([0, 2, 4, 6, 8]);
  });
 
  it('cancel stops the scan without calling onDone', async () => {
    const onDone = vi.fn();
    const scanner = new SearchScanner(10_000_000, () => true, { budgetMs: 1, onDone });
    scanner.start();
    scanner.cancel();
    await new Promise((r) => setTimeout(r, 30));
    expect(onDone).not.toHaveBeenCalled();
    expect(scanner.done).toBe(false);
  });
});
 
describe('BitsetIndex', () => {
  it('rank/select agree with a reference list across block boundaries', () => {
    const n = 100_000;
    const bits = new BitsetIndex(n);
    const ref: number[] = [];
    let v = 0;
    // irregular ascending gaps crossing many 512-bit blocks
    for (let k = 1; v < n; k++) {
      bits.push(v);
      ref.push(v);
      v += 1 + ((k * k) % 700);
    }
    expect(bits.length).toBe(ref.length);
    for (let i = 0; i < ref.length; i += 37) {
      expect(bits.at(i)).toBe(ref[i]);
      expect(bits.indexOf(ref[i] as number)).toBe(i);
    }
    expect(bits.at(ref.length - 1)).toBe(ref[ref.length - 1]);
    expect(bits.indexOf(3)).toBe(-1);
  });
 
  it('memory is fixed by capacity: holds dense match sets without a cap', () => {
    const n = 2_000_000;
    const bits = new BitsetIndex(n);
    for (let i = 0; i < n; i += 2) bits.push(i);
    expect(bits.length).toBe(1_000_000);
    expect(bits.at(999_999)).toBe(1_999_998);
    expect(bits.indexOf(1_000_000)).toBe(500_000);
  });
 
  it('rejects non-ascending or out-of-range pushes', () => {
    const bits = new BitsetIndex(10);
    bits.push(4);
    expect(() => bits.push(4)).toThrow(RangeError);
    expect(() => bits.push(2)).toThrow(RangeError);
    expect(() => bits.push(10)).toThrow(RangeError);
  });
});
 
describe('FilteredDataSource', () => {
  it('projects the inner source through the match list', () => {
    const src = makeSource(1_000);
    const filtered = new FilteredDataSource(src, [3, 42, 999]);
    expect(filtered.count).toBe(3);
    expect(filtered.renderToString(1)).toBe('<div>item 42</div>');
    expect(filtered.renderSeekToString?.(1)).toBe('<div>seek 42</div>');
    expect(filtered.sourceIndex(2)).toBe(999);
    expect(filtered.estimateHeight?.(0)).toBe(10 + 3);
  });
 
  it('append and indexOf (binary search) work on a growing list', () => {
    const filtered = new FilteredDataSource(makeSource(1_000));
    expect(filtered.count).toBe(0);
    filtered.append([5, 10]);
    filtered.append([20, 500]);
    expect(filtered.count).toBe(4);
    expect(filtered.indexOf(20)).toBe(2);
    expect(filtered.indexOf(21)).toBe(-1);
    filtered.reset([7]);
    expect(filtered.count).toBe(1);
    expect(filtered.sourceIndex(0)).toBe(7);
  });
 
  it('throws on out-of-bounds access', () => {
    const filtered = new FilteredDataSource(makeSource(10), [1]);
    expect(() => filtered.renderToString(5)).toThrow(RangeError);
  });
});
