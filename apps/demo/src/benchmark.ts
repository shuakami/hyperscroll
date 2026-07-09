import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './benchmark.css';
import { HyperScroll } from '@hyperscroll/core';
import { Virtualizer, elementScroll, observeElementOffset, observeElementRect, measureElement } from '@tanstack/virtual-core';
import { renderChatMessage } from './chat-source.js';
 
const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};
 
const paneHyper = $('paneHyper');
const paneTanstack = $('paneTanstack');
const results = $('results');
 
interface Metrics {
  name: string;
  frames: number;
  avgMs: number;
  p95Ms: number;
  dropped: number;
  jumpAvgMs: number;
  heapMB: number | null;
  error?: string;
}
 
interface Driver {
  scrollStep(px: number): void;
  jumpTo(index: number): void;
  destroy(): void;
}
 
// ---------------------------------------------------------------- drivers
 
function makeHyperDriver(count: number): Driver {
  const engine = new HyperScroll(paneHyper, { dataSource: { count, renderToString: renderChatMessage } });
  return {
    scrollStep: (px) => engine.scrollBy(px),
    jumpTo: (i) => engine.scrollToIndex(i),
    destroy: () => {
      engine.destroy();
      paneHyper.innerHTML = '';
    },
  };
}
 
function makeTanstackDriver(count: number): Driver {
  const scroller = document.createElement('div');
  scroller.className = 'ts-scroller';
  const inner = document.createElement('div');
  inner.className = 'ts-inner';
  scroller.appendChild(inner);
  paneTanstack.appendChild(scroller);
 
  const pool = new Map<number, HTMLElement>();
  const v = new Virtualizer<HTMLDivElement, HTMLElement>({
    count,
    getScrollElement: () => scroller as HTMLDivElement,
    estimateSize: () => 60,
    overscan: 10,
    scrollToFn: elementScroll,
    observeElementOffset,
    observeElementRect,
    measureElement: (el, entry, instance) => measureElement(el, entry, instance),
    onChange: (instance) => {
      inner.style.height = `${instance.getTotalSize()}px`;
      const items = instance.getVirtualItems();
      const seen = new Set<number>();
      for (const item of items) {
        seen.add(item.index);
        let el = pool.get(item.index);
        if (!el) {
          const tmp = document.createElement('div');
          tmp.innerHTML = renderChatMessage(item.index);
          el = tmp.firstElementChild as HTMLElement;
          el.classList.add('ts-item');
          el.dataset.index = String(item.index);
          inner.appendChild(el);
          pool.set(item.index, el);
          instance.measureElement(el);
        }
        el.style.transform = `translateY(${item.start}px)`;
      }
      for (const [idx, el] of pool) {
        if (!seen.has(idx)) {
          el.remove();
          pool.delete(idx);
        }
      }
    },
  });
  const cleanup = v._didMount();
  v._willUpdate();
 
  return {
    scrollStep: (px) => {
      scroller.scrollTop += px;
    },
    jumpTo: (i) => v.scrollToIndex(i, { align: 'start' }),
    destroy: () => {
      cleanup();
      scroller.remove();
      paneTanstack.innerHTML = '';
    },
  };
}
 
// ---------------------------------------------------------------- protocol
 
function heapMB(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return mem ? mem.usedJSHeapSize / 1048576 : null;
}
 
function percentile(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[i] ?? 0;
}
 
async function runProtocol(name: string, driver: Driver, count: number): Promise<Metrics> {
  const frameTimes: number[] = [];
  await new Promise<void>((resolve) => {
    let last = performance.now();
    const t0 = last;
    const tick = (now: number): void => {
      frameTimes.push(now - last);
      last = now;
      driver.scrollStep(18);
      if (now - t0 < 5000) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
 
  const jumpTimes: number[] = [];
  const rand = (n: number) => Math.floor(Math.abs(Math.sin(n * 999)) * (count - 1));
  for (let j = 0; j < 10; j++) {
    const t = performance.now();
    driver.jumpTo(rand(j));
    jumpTimes.push(performance.now() - t);
    await new Promise((r) => requestAnimationFrame(r));
  }
 
  frameTimes.shift();
  const sorted = [...frameTimes].sort((a, b) => a - b);
  const sum = frameTimes.reduce((a, b) => a + b, 0);
  return {
    name,
    frames: frameTimes.length,
    avgMs: sum / Math.max(frameTimes.length, 1),
    p95Ms: percentile(sorted, 0.95),
    dropped: frameTimes.filter((t) => t > 20).length,
    jumpAvgMs: jumpTimes.reduce((a, b) => a + b, 0) / jumpTimes.length,
    heapMB: heapMB(),
  };
}
 
function renderResults(rows: Metrics[], count: number): void {
  const fmt = (n: number) => n.toFixed(2);
  const ok = rows.filter((m) => !m.error);
  // Lower is better for every metric; mark per-column winner/loser.
  const cols: ((m: Metrics) => number | null)[] = [
    (m) => m.avgMs,
    (m) => m.p95Ms,
    (m) => m.dropped,
    (m) => m.jumpAvgMs,
    (m) => m.heapMB,
  ];
  const cls = (m: Metrics, col: number): string => {
    const get = cols[col];
    if (ok.length < 2 || !get) return '';
    const vals = ok.map((r) => get(r));
    if (vals.some((v) => v === null)) return '';
    const mine = get(m) as number;
    const min = Math.min(...(vals as number[]));
    const max = Math.max(...(vals as number[]));
    if (min === max) return '';
    return mine === min ? ' class="best"' : mine === max ? ' class="worst"' : '';
  };
  const ratio = (col: number): string => {
    const get = cols[col];
    if (ok.length < 2 || !get) return '';
    const vals = ok.map((r) => get(r));
    if (vals.some((v) => v === null || v === 0)) return '';
    const r = Math.max(...(vals as number[])) / Math.min(...(vals as number[]));
    return r >= 1.05
      ? ` <span class="ratio"><svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M6 2.5v7M2.8 5.7 6 2.5l3.2 3.2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${r.toFixed(1)}x</span>`
      : '';
  };
  results.innerHTML =
    `<h3>Results: ${count.toLocaleString()} dynamic-height messages</h3>` +
    `<table><thead><tr><th>Engine</th><th>Avg frame</th><th>P95 frame</th><th>Dropped (&gt;20ms)</th><th>Avg jump</th><th>JS heap</th></tr></thead><tbody>` +
    rows
      .map((m) =>
        m.error
          ? `<tr><td>${m.name}</td><td colspan="5" class="err">${m.error}</td></tr>`
          : `<tr><td>${m.name}</td>` +
            `<td${cls(m, 0)}>${fmt(m.avgMs)} ms${cls(m, 0).includes('best') ? ratio(0) : ''}</td>` +
            `<td${cls(m, 1)}>${fmt(m.p95Ms)} ms${cls(m, 1).includes('best') ? ratio(1) : ''}</td>` +
            `<td${cls(m, 2)}>${m.dropped}/${m.frames}</td>` +
            `<td${cls(m, 3)}>${fmt(m.jumpAvgMs)} ms${cls(m, 3).includes('best') ? ratio(3) : ''}</td>` +
            `<td${cls(m, 4)}>${m.heapMB === null ? 'n/a' : m.heapMB.toFixed(1) + ' MB'}${cls(m, 4).includes('best') ? ratio(4) : ''}</td></tr>`,
      )
      .join('') +
    `</tbody></table>` +
    (ok.length >= 2 ? `<p class="legend"><span class="best-dot"></span> faster / lower <span class="worst-dot"></span> slower / higher</p>` : '') +
    `<p class="note">Protocol: constant scroll for 5s (+18px per frame), then 10 random jumps. Both engines use the exact same message generator and styles. ` +
    `Note: TanStack must maintain a JS-side measurement cache, and total height is bound by the browser's ~33.5M-pixel scroll limit (30M rows × ~66px ≈ 2 billion px), so it degrades or fails outright at the 30M scale; HyperScroll's anchor model has no such limit.</p>`;
}
 
// ---------------------------------------------------------------- run
 
$('btnRun').addEventListener('click', async () => {
  const count = parseInt($<HTMLSelectElement>('benchCount').value, 10);
  results.innerHTML = '<em>Running… @hyperscroll/core</em>';
  const rows: Metrics[] = [];
 
  const hyper = makeHyperDriver(count);
  rows.push(await runProtocol('@hyperscroll/core', hyper, count));
  hyper.destroy();
 
  results.innerHTML = '<em>Running… @tanstack/virtual-core</em>';
  await new Promise((r) => setTimeout(r, 300));
  try {
    const ts = makeTanstackDriver(count);
    rows.push(await runProtocol('@tanstack/virtual-core', ts, count));
    ts.destroy();
  } catch (err) {
    rows.push({
      name: '@tanstack/virtual-core',
      frames: 0, avgMs: 0, p95Ms: 0, dropped: 0, jumpAvgMs: 0, heapMB: null,
      error: `Run failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
 
  renderResults(rows, count);
});
