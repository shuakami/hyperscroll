import './style.css';
import type { DataSource } from '@hyperscroll/core';
import { FilteredDataSource, HyperScroll, SearchScanner } from '@hyperscroll/core';
import { createChatSource, messageMeta, USER_NAMES } from './chat-source.js';
 
const params = new URLSearchParams(location.search);
const TOTAL = Math.min(Math.max(parseInt(params.get('n') ?? '', 10) || 30_000_000, 1000), 100_000_000);
 
const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};
 
$('totalLabel').textContent = `${TOTAL.toLocaleString('zh-CN')} 条消息 · 零后端 · TypeScript 库`;
 
const hudIdx = $('hudIdx');
const hudNodes = $('hudNodes');
const hudWin = $('hudWin');
const hudBuild = $('hudBuild');
const hudMem = $('hudMem');
const hudFps = $('hudFps');
 
const fullSource = createChatSource(TOTAL);
 
let highlightQuery = '';
 
// Wraps a source so the active search keyword is wrapped in <mark> in text
// segments of the rendered HTML (tags/attributes are skipped).
function highlightHtml(html: string, q: string): string {
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let out = '';
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    const text = lt === -1 ? html.slice(i) : html.slice(i, lt);
    out += text.replace(re, (m) => `<mark class="hl">${m}</mark>`);
    if (lt === -1) break;
    const gt = html.indexOf('>', lt);
    out += html.slice(lt, gt === -1 ? html.length : gt + 1);
    i = gt === -1 ? html.length : gt + 1;
  }
  return out;
}
 
function withHighlight(src: DataSource): DataSource {
  return {
    get count() {
      return src.count;
    },
    renderToString: (i) =>
      highlightQuery ? highlightHtml(src.renderToString(i), highlightQuery) : src.renderToString(i),
  };
}
 
const engine = new HyperScroll($('viewport'), {
  dataSource: withHighlight(fullSource),
  keyboard: true,
  onAnchorChange(anchor) {
    hudIdx.textContent = `#${anchor.index.toLocaleString()}`;
  },
  onRangeChange(range, ms) {
    hudWin.textContent = `[${range.start.toLocaleString()} → ${range.end.toLocaleString()})`;
    hudBuild.textContent = `${ms.toFixed(1)} ms`;
    hudNodes.textContent = String(range.end - range.start);
  },
});
 
$('btnTop').onclick = () => engine.scrollToIndex(0);
$('btnMid').onclick = () => engine.scrollToIndex((TOTAL / 2) | 0);
$('btnEnd').onclick = () => engine.scrollToIndex(TOTAL - 1);
const jumpInput = $<HTMLInputElement>('jumpInput');
$('btnJump').onclick = () => {
  const v = parseInt(jumpInput.value, 10);
  if (!Number.isNaN(v)) engine.scrollToIndex(v);
};
jumpInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('btnJump').click();
});
 
// ---------------------------------------------------------- filter & search
//
// Two independent mechanisms:
// - Filter (sender/type): applies immediately on change — the message stream
//   shows only matching messages (streaming scan fills it in progressively).
// - Search (keyword): locates matches within the current filter and navigates
//   between them with prev/next. It never changes what is displayed.
 
const searchInput = $<HTMLInputElement>('searchInput');
const filterUser = $<HTMLSelectElement>('filterUser');
const filterKind = $<HTMLSelectElement>('filterKind');
const btnSearch = $<HTMLButtonElement>('btnSearch');
const btnPrev = $<HTMLButtonElement>('btnPrev');
const btnNext = $<HTMLButtonElement>('btnNext');
const btnClear = $<HTMLButtonElement>('btnClear');
const filterStatus = $('filterStatus');
const searchStatus = $('searchStatus');
 
for (const name of USER_NAMES) {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  filterUser.appendChild(opt);
}
 
let filterScanner: SearchScanner | null = null;
let filterSource: FilteredDataSource | null = null;
 
let searchScanner: SearchScanner | null = null;
let cursor = -1;
 
function filterPass(i: number, user: string, kind: string): boolean {
  const m = messageMeta(i);
  if (m.kind === 'sys') return false;
  if (user && m.user !== user) return false;
  if (kind && m.kind !== kind) return false;
  return true;
}
 
function queryPass(i: number, q: string): boolean {
  const m = messageMeta(i);
  return m.text.toLowerCase().includes(q) || m.user.toLowerCase().includes(q);
}
 
// ----- filter: applies to the displayed stream immediately
 
function applyFilter(): void {
  filterScanner?.cancel();
  filterScanner = null;
  resetSearch();
  const user = filterUser.value;
  const kind = filterKind.value;
  if (!user && !kind) {
    filterSource = null;
    filterStatus.textContent = '';
    engine.setDataSource(withHighlight(fullSource));
    return;
  }
  const src = new FilteredDataSource(fullSource);
  filterSource = src;
  engine.setDataSource(withHighlight(src));
  filterStatus.textContent = '筛选中…';
  filterScanner = new SearchScanner(TOTAL, (i) => filterPass(i, user, kind), {
    onMatches(batch) {
      src.append(batch);
      engine.refresh();
    },
    onProgress(scanned) {
      filterStatus.textContent = `${src.count.toLocaleString()} 条 · 已扫描 ${Math.round((scanned / TOTAL) * 100)}%`;
    },
    onDone(matches) {
      filterStatus.textContent = `${matches.length.toLocaleString()} 条`;
    },
  });
  filterScanner.start();
}
 
filterUser.onchange = applyFilter;
filterKind.onchange = applyFilter;
 
// ----- search: keyword location within the current filter
 
function setSearchControls(enabled: boolean): void {
  btnPrev.disabled = !enabled;
  btnNext.disabled = !enabled;
}
 
function resetSearch(): void {
  searchScanner?.cancel();
  searchScanner = null;
  cursor = -1;
  searchStatus.textContent = '';
  setSearchControls(false);
  btnClear.disabled = true;
  if (highlightQuery) {
    highlightQuery = '';
    engine.refresh();
  }
}
 
function jumpToMatch(pos: number): void {
  const n = searchScanner?.matches.length ?? 0;
  if (n === 0 || !searchScanner) return;
  cursor = ((pos % n) + n) % n;
  const srcIdx = searchScanner.matches.at(cursor);
  searchStatus.textContent = `第 ${(cursor + 1).toLocaleString()} / ${n.toLocaleString()} 个${searchScanner?.done ? '' : '（搜索中…）'}`;
  if (filterSource) {
    const pos2 = filterSource.indexOf(srcIdx);
    if (pos2 >= 0) engine.scrollToIndex(pos2);
  } else {
    engine.scrollToIndex(srcIdx);
  }
}
 
function runSearch(): void {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    resetSearch();
    return;
  }
  resetSearch();
  btnClear.disabled = false;
  highlightQuery = q;
  engine.refresh();
  const user = filterUser.value;
  const kind = filterKind.value;
  const t0 = performance.now();
  let firstJump = true;
  searchScanner = new SearchScanner(
    TOTAL,
    (i) => filterPass(i, user, kind) && queryPass(i, q),
    {
      onMatches() {
        if (firstJump) {
          firstJump = false;
          setSearchControls(true);
          jumpToMatch(0);
        }
      },
      onProgress(scanned) {
        if (cursor < 0) {
          searchStatus.textContent = `搜索中 ${Math.round((scanned / TOTAL) * 100)}% · ${(searchScanner?.matches.length ?? 0).toLocaleString()} 个命中`;
        }
      },
      onDone(matches) {
        const ms = performance.now() - t0;
        if (matches.length === 0) {
          searchStatus.textContent = `无命中 · 扫描耗时 ${(ms / 1000).toFixed(1)}s`;
        } else if (cursor >= 0) {
          jumpToMatch(cursor);
        }
      },
    },
  );
  searchScanner.start();
}
 
btnSearch.onclick = runSearch;
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runSearch();
});
btnPrev.onclick = () => jumpToMatch(cursor - 1);
btnNext.onclick = () => jumpToMatch(cursor + 1);
btnClear.onclick = () => {
  searchInput.value = '';
  resetSearch();
};
 
interface PerfMemory { usedJSHeapSize: number }
let frames = 0;
let lastT = performance.now();
function fpsLoop(now: number): void {
  frames += 1;
  if (now - lastT >= 1000) {
    hudFps.textContent = String(Math.round((frames * 1000) / (now - lastT)));
    frames = 0;
    lastT = now;
    const mem = (performance as Performance & { memory?: PerfMemory }).memory;
    if (mem) hudMem.textContent = `${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB`;
  }
  requestAnimationFrame(fpsLoop);
}
requestAnimationFrame(fpsLoop);
