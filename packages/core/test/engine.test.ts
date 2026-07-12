import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HyperScroll } from '../src/engine.js';
import type { DataSource } from '../src/types.js';
 
// jsdom does not lay out; give the engine deterministic geometry.
function stubGeometry(itemHeight: number, viewportHeight: number): void {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      if (this.classList.contains('hs-viewport')) return viewportHeight;
      if (this.classList.contains('hs-list')) return this.children.length * itemHeight;
      return itemHeight;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      const parent = this.parentElement;
      if (!parent) return 0;
      return Array.prototype.indexOf.call(parent.children, this) * itemHeight;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('hs-viewport') ? viewportHeight : itemHeight;
    },
  });
}
 
function makeSource(count: number): DataSource {
  return {
    count,
    renderToString: (i) => `<div class="hs-item" data-i="${i}">item ${i}</div>`,
    estimateHeight: () => 50,
  };
}
 
describe('HyperScroll engine (jsdom)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    stubGeometry(50, 500);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });
 
  function mount(count: number) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const engine = new HyperScroll(container, { dataSource: makeSource(count) });
    return { container, engine };
  }
 
  it('materializes only a small window of a 30M source', () => {
    const { engine } = mount(30_000_000);
    const stats = engine.getStats();
    expect(stats.renderedCount).toBeGreaterThan(0);
    expect(stats.renderedCount).toBeLessThan(300);
    expect(stats.range.start).toBe(0);
  });
 
  it('scrollToIndex jumps anywhere in O(window)', () => {
    const { engine } = mount(30_000_000);
    engine.scrollToIndex(15_000_000);
    const stats = engine.getStats();
    expect(stats.anchor.index).toBe(15_000_000);
    expect(stats.range.start).toBeLessThanOrEqual(15_000_000);
    expect(stats.range.end).toBeGreaterThan(15_000_000);
    expect(stats.renderedCount).toBeLessThan(300);
  });
 
  it('clamps scrollToIndex to the data source bounds', () => {
    const { engine } = mount(1000);
    engine.scrollToIndex(99_999);
    // clamped to the last index, then bottom-aligned (viewport 500 / item 50)
    expect(engine.getStats().anchor.index).toBe(990);
    engine.scrollToIndex(-5);
    expect(engine.getStats().anchor.index).toBe(0);
  });
 
  it('scrollBy walks the anchor by pixels', () => {
    const { engine } = mount(10_000);
    engine.scrollBy(125); // 2 items of 50px + 25px remainder
    const { anchor } = engine.getStats();
    expect(anchor.index).toBe(2);
    expect(anchor.offset).toBe(25);
  });
 
  it('wheel input moves the anchor', () => {
    const { container, engine } = mount(10_000);
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, cancelable: true }));
    expect(engine.getStats().anchor.index).toBe(6);
  });
 
  it('fires onAnchorChange and onRangeChange', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onAnchorChange = vi.fn();
    const onRangeChange = vi.fn();
    const engine = new HyperScroll(container, {
      dataSource: makeSource(1000),
      onAnchorChange,
      onRangeChange,
    });
    expect(onRangeChange).toHaveBeenCalled();
    engine.scrollBy(100);
    expect(onAnchorChange).toHaveBeenCalled();
  });
 
  it('smoothWheel drains the full delta (no residual loss)', () => {
    const { container, engine } = mount(10_000);
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, cancelable: true }));
    const { anchor } = engine.getStats();
    expect(anchor.index).toBe(6);
    expect(anchor.offset).toBeCloseTo(0, 6);
  });
 
  it('ignores the scrollbar echo of its own sync (no jump-back at the bottom)', () => {
    const { container, engine } = mount(30_000_000);
    engine.scrollToIndex(29_999_999);
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, cancelable: true }));
    const after = engine.getStats().anchor.index;
    expect(after).toBeLessThan(29_999_999);
    // scroll event fires async after our own scrollTop write; it must not
    // teleport the anchor back down.
    container.dispatchEvent(new Event('scroll'));
    expect(engine.getStats().anchor.index).toBe(after);
  });

  it('uses a compact render window while dragging the native scrollbar', () => {
    vi.useFakeTimers();
    const source = makeSource(30_000_000);
    source.renderSeekToString = (i) =>
      `<div class="hs-item" data-i="${i}" data-seek="true">item ${i}</div>`;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const engine = new HyperScroll(container, {
      dataSource: source,
      smoothWheel: false,
    });
    container.dispatchEvent(new Event('pointerdown'));
    container.scrollTop = 1_500_000;
    container.dispatchEvent(new Event('scroll'));

    const seeking = engine.getStats();
    expect(seeking.anchor.index).toBeGreaterThan(10_000_000);
    expect(seeking.range.start).toBe(seeking.anchor.index);
    expect(seeking.renderedCount).toBeLessThan(48);
    expect(container.querySelector('.hs-item')?.getAttribute('data-seek')).toBe('true');

    window.dispatchEvent(new Event('pointerup'));
    vi.runAllTimers();
    const settled = engine.getStats();
    expect(settled.range.start).toBeLessThan(settled.anchor.index);
    expect(settled.renderedCount).toBeGreaterThan(seeking.renderedCount);
    expect(container.querySelector('.hs-item')?.hasAttribute('data-seek')).toBe(false);
    vi.useRealTimers();
  });
 
  it('clamps at the bottom: last item bottom aligns with viewport bottom', () => {
    const { container, engine } = mount(10_000);
    engine.scrollToIndex(9_999);
    // viewport 500 / item 50 => anchor clamped 10 items above the end
    expect(engine.getStats().anchor).toEqual({ index: 9_990, offset: 0 });
    // wheeling further down must be a no-op (no creep/jump cycle)
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: 300, cancelable: true }));
    expect(engine.getStats().anchor).toEqual({ index: 9_990, offset: 0 });
    // wheeling up from the clamped bottom moves up normally
    container.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
    expect(engine.getStats().anchor.index).toBe(9_988);
  });
 
  it('destroy removes engine DOM and listeners', () => {
    const { container, engine } = mount(1000);
    engine.destroy();
    expect(container.querySelector('.hs-list')).toBeNull();
    expect(container.classList.contains('hs-viewport')).toBe(false);
    expect(() => container.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }))).not.toThrow();
  });
 
  it('handles an empty data source', () => {
    const { engine } = mount(0);
    expect(engine.getStats().renderedCount).toBe(0);
    engine.scrollBy(500);
    expect(engine.getStats().anchor).toEqual({ index: 0, offset: 0 });
  });
});
