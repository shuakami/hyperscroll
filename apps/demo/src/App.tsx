import { useEffect, useRef, useState } from 'react';
import type { DataSource } from '@hyperscroll/core';
import { FilteredDataSource, HyperScroll, SearchScanner } from '@hyperscroll/core';
import { ArrowDownIcon, ArrowUpIcon, SearchIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { createChatSource, messageBrief, messageText, USER_NAMES } from './chat-source.js';
import { installMediaFallback } from './media-fallback.js';
import { stopVoice, toggleVoice } from './voice-player.js';
 
const params = new URLSearchParams(location.search);
const TOTAL = Math.min(Math.max(parseInt(params.get('n') ?? '', 10) || 30_000_000, 1000), 100_000_000);
 
const fullSource = createChatSource(TOTAL);
 
function filterPass(i: number, user: string, kind: string): boolean {
  const m = messageBrief(i);
  if (m.kind === 'sys') return false;
  if (user && m.user !== user) return false;
  if (kind && m.kind !== kind) return false;
  return true;
}
 
function queryPass(i: number, q: string): boolean {
  return messageText(i).toLowerCase().includes(q);
}
 
// Highlights matches in the message bubble only, never in sender names or
// other chrome, and never inside tags/attributes.
function highlightHtml(html: string, q: string): string {
  const at = html.indexOf('class="bubble');
  if (at === -1) return html;
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let out = html.slice(0, at);
  let i = at;
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
 
const KIND_LABELS: ReadonlyArray<readonly [string, string]> = [
  ['text', 'Text'],
  ['img', 'Image'],
  ['voice', 'Voice'],
  ['code', 'Code'],
  ['file', 'File'],
  ['link', 'Link'],
  ['video', 'Video'],
  ['location', 'Location'],
  ['contact', 'Contact'],
  ['poll', 'Poll'],
];
 
interface PerfMemory {
  usedJSHeapSize: number;
}
 
export default function App({ onHome }: { onHome?: () => void } = {}): React.ReactElement {
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HyperScroll | null>(null);
  const highlightRef = useRef('');
  const filterScannerRef = useRef<SearchScanner | null>(null);
  const filterSourceRef = useRef<FilteredDataSource | null>(null);
  const searchScannerRef = useRef<SearchScanner | null>(null);
  const cursorRef = useRef(-1);
 
  const hudIdx = useRef<HTMLElement>(null);
  const hudNodes = useRef<HTMLElement>(null);
  const hudWin = useRef<HTMLElement>(null);
  const hudBuild = useRef<HTMLElement>(null);
  const hudMem = useRef<HTMLElement>(null);
  const hudFps = useRef<HTMLElement>(null);
 
  const [filterUser, setFilterUser] = useState('');
  const [filterKind, setFilterKind] = useState('');
  const [query, setQuery] = useState('');
  const [jump, setJump] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [canNav, setCanNav] = useState(false);
  const [canClear, setCanClear] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const lastAnchorRef = useRef({ index: 0, offset: 0 });
  const collapsedRef = useRef(false);
  const accumRef = useRef(0);
  const programmaticRef = useRef(false);
  // Search hit whose source index the streaming filter hasn't appended yet;
  // the jump is retried as filter batches arrive.
  const pendingJumpRef = useRef(-1);

  function scrollTo(index: number, offset = 0): void {
    programmaticRef.current = true;
    engineRef.current?.scrollToIndex(index, offset);
  }

  // Land search hits slightly below the floating toolbar so the sender row
  // of the matched message is not hidden behind it.
  const JUMP_OFFSET = -56;
 
  function withHighlight(src: DataSource): DataSource {
    return {
      get count() {
        return src.count;
      },
      renderToString: (i) =>
        highlightRef.current
          ? highlightHtml(src.renderToString(i), highlightRef.current)
          : src.renderToString(i),
    };
  }
 
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const engine = new HyperScroll(el, {
      dataSource: withHighlight(fullSource),
      keyboard: true,
      onAnchorChange(anchor) {
        if (hudIdx.current) hudIdx.current.textContent = `#${anchor.index.toLocaleString()}`;
        if (programmaticRef.current) {
          // Programmatic jumps (search hits, Top/Middle/Bottom, Jump) are not
          // user scroll intent: resync the anchor and skip collapse logic.
          programmaticRef.current = false;
          lastAnchorRef.current = { index: anchor.index, offset: anchor.offset };
          accumRef.current = 0;
          return;
        }
        const last = lastAnchorRef.current;
        const delta =
          anchor.index === last.index
            ? anchor.offset - last.offset
            : (anchor.index - last.index) * 60;
        lastAnchorRef.current = { index: anchor.index, offset: anchor.offset };
        // Ignore sub-4px moves: anchor normalization jitter, not user intent.
        if (Math.abs(delta) >= 4) {
          const acc = accumRef.current;
          accumRef.current = acc === 0 || Math.sign(delta) === Math.sign(acc) ? acc + delta : delta;
        }
        const atTop = anchor.index === 0 && anchor.offset < 40;
        let next = collapsedRef.current;
        if (atTop || accumRef.current < -40) next = false;
        else if (accumRef.current > 60) next = true;
        if (next !== collapsedRef.current) {
          collapsedRef.current = next;
          setCollapsed(next);
        }
      },
      onRangeChange(range, ms) {
        if (hudWin.current)
          hudWin.current.textContent = `[${range.start.toLocaleString()} → ${range.end.toLocaleString()})`;
        if (hudBuild.current) hudBuild.current.textContent = `${ms.toFixed(1)} ms`;
        if (hudNodes.current) hudNodes.current.textContent = String(range.end - range.start);
      },
    });
    engineRef.current = engine;
 
    let frames = 0;
    let lastT = performance.now();
    let raf = 0;
    const fpsLoop = (now: number): void => {
      frames += 1;
      if (now - lastT >= 1000) {
        if (hudFps.current) hudFps.current.textContent = String(Math.round((frames * 1000) / (now - lastT)));
        frames = 0;
        lastT = now;
        const mem = (performance as Performance & { memory?: PerfMemory }).memory;
        if (mem && hudMem.current) hudMem.current.textContent = `${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB`;
      }
      raf = requestAnimationFrame(fpsLoop);
    };
    raf = requestAnimationFrame(fpsLoop);
 
    const onClick = (e: MouseEvent): void => {
      const bubble = (e.target as HTMLElement).closest<HTMLElement>('.voice-bubble');
      if (bubble) toggleVoice(bubble);
    };
    el.addEventListener('click', onClick);
    const removeFallback = installMediaFallback(el);
 
    return () => {
      removeFallback();
      el.removeEventListener('click', onClick);
      stopVoice();
      cancelAnimationFrame(raf);
      filterScannerRef.current?.cancel();
      searchScannerRef.current?.cancel();
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  function resetSearch(): void {
    searchScannerRef.current?.cancel();
    searchScannerRef.current = null;
    cursorRef.current = -1;
    pendingJumpRef.current = -1;
    setSearchStatus('');
    setCanNav(false);
    setCanClear(false);
    if (highlightRef.current) {
      highlightRef.current = '';
      engineRef.current?.refresh();
    }
  }
 
  function applyFilter(user: string, kind: string): void {
    const engine = engineRef.current;
    if (!engine) return;
    filterScannerRef.current?.cancel();
    filterScannerRef.current = null;
    resetSearch();
    if (!user && !kind) {
      filterSourceRef.current = null;
      setFilterStatus('');
      engine.setDataSource(withHighlight(fullSource));
      return;
    }
    const src = new FilteredDataSource(fullSource);
    filterSourceRef.current = src;
    const retryPendingJump = (): void => {
      const pending = pendingJumpRef.current;
      if (pending < 0) return;
      const p = src.indexOf(pending);
      if (p >= 0) {
        pendingJumpRef.current = -1;
        scrollTo(p, JUMP_OFFSET);
      }
    };
    engine.setDataSource(withHighlight(src));
    setFilterStatus('Filtering…');
    let lastRefresh = 0;
    let lastStatus = 0;
    const scanner = new SearchScanner(TOTAL, (i) => filterPass(i, user, kind), {
      onMatches(batch) {
        src.append(batch);
        // Throttle rebuilds: refreshing on every streamed batch causes frame
        // drops and visible jumps while the user is scrolling mid-scan.
        const now = performance.now();
        if (now - lastRefresh > 250) {
          lastRefresh = now;
          engine.refresh();
        }
        retryPendingJump();
      },
      onProgress(scanned) {
        const now = performance.now();
        if (now - lastStatus > 200) {
          lastStatus = now;
          setFilterStatus(`${src.count.toLocaleString()} results (scanned ${Math.round((scanned / TOTAL) * 100)}%)`);
        }
      },
      onDone(matches) {
        engine.refresh();
        setFilterStatus(`${matches.length.toLocaleString()} results`);
        retryPendingJump();
      },
    });
    filterScannerRef.current = scanner;
    scanner.start();
  }
 
  function jumpToMatch(pos: number): void {
    const scanner = searchScannerRef.current;
    const engine = engineRef.current;
    if (!scanner || !engine) return;
    const n = scanner.matches.length;
    if (n === 0) return;
    cursorRef.current = ((pos % n) + n) % n;
    const srcIdx = scanner.matches.at(cursorRef.current);
    setSearchStatus(
      `${(cursorRef.current + 1).toLocaleString()} / ${n.toLocaleString()} matches${scanner.done ? '' : ' (searching…)'}`,
    );
    const filterSource = filterSourceRef.current;
    if (filterSource) {
      const pos2 = filterSource.indexOf(srcIdx);
      if (pos2 >= 0) {
        pendingJumpRef.current = -1;
        scrollTo(pos2, JUMP_OFFSET);
      } else {
        pendingJumpRef.current = srcIdx;
      }
    } else {
      scrollTo(srcIdx, JUMP_OFFSET);
    }
  }
 
  function runSearch(): void {
    const engine = engineRef.current;
    if (!engine) return;
    const q = query.trim().toLowerCase();
    resetSearch();
    if (!q) return;
    setCanClear(true);
    highlightRef.current = q;
    engine.refresh();
    const user = filterUser;
    const kind = filterKind;
    const t0 = performance.now();
    let firstJump = true;
    const scanner = new SearchScanner(TOTAL, (i) => filterPass(i, user, kind) && queryPass(i, q), {
      onMatches() {
        if (firstJump) {
          firstJump = false;
          setCanNav(true);
          jumpToMatch(0);
        }
      },
      onProgress(scanned) {
        if (cursorRef.current < 0) {
          setSearchStatus(
            `Searching ${Math.round((scanned / TOTAL) * 100)}% (${(searchScannerRef.current?.matches.length ?? 0).toLocaleString()} matches)`,
          );
        }
      },
      onDone(matches) {
        const ms = performance.now() - t0;
        if (matches.length === 0) {
          setSearchStatus(`No matches (scanned in ${(ms / 1000).toFixed(1)}s)`);
        } else if (cursorRef.current >= 0) {
          jumpToMatch(cursorRef.current);
        }
      },
    });
    searchScannerRef.current = scanner;
    scanner.start();
  }
 
  function doJump(): void {
    const v = parseInt(jump, 10);
    if (!Number.isNaN(v)) scrollTo(v);
  }
 
  return (
    <div className="relative flex h-dvh flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-3 px-4 py-2.5">
        {onHome ? (
          <button
            type="button"
            onClick={onHome}
            className="whitespace-nowrap font-semibold text-sm tracking-tight"
          >
            HyperScroll <span className="hidden font-normal text-muted-foreground sm:inline">@hyperscroll/core</span>
          </button>
        ) : (
          <div className="whitespace-nowrap font-semibold text-sm tracking-tight">
            HyperScroll <span className="hidden font-normal text-muted-foreground sm:inline">@hyperscroll/core</span>
          </div>
        )}
        <Badge variant="secondary" className="hidden whitespace-nowrap sm:inline-flex">
          demo
        </Badge>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="link" size="sm" render={<a href="./docs.html" />}>
            Docs
          </Button>
          <Button variant="link" size="sm" render={<a href="./benchmark.html" />}>
            Benchmark
          </Button>
          <Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => scrollTo(0)}>
            Top
          </Button>
          <Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => scrollTo((TOTAL / 2) | 0)}>
            Middle
          </Button>
          <Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => scrollTo(TOTAL - 1)}>
            Bottom
          </Button>
          <Input
            className="hidden w-40 md:block"
            size="sm"
            type="number"
            placeholder="Jump to message #"
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doJump();
            }}
          />
          <Button className="hidden md:inline-flex" size="sm" onClick={doJump}>
            Jump
          </Button>
        </div>
      </header>
 
      <div className="relative min-h-0 flex-1">
      <div
        className={`absolute inset-x-0 top-0 z-20 flex flex-wrap items-center gap-2 bg-background px-4 pb-2.5 transition-[translate,opacity] duration-300 ease-out will-change-transform ${
          collapsed ? 'pointer-events-none -translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <span className="hidden whitespace-nowrap font-medium text-muted-foreground text-xs sm:inline">Filter</span>
        <Select
          value={filterUser}
          onValueChange={(v) => {
            const user = v ?? '';
            setFilterUser(user);
            applyFilter(user, filterKind);
          }}
        >
          <SelectTrigger size="sm" className="w-32 min-w-0 sm:w-36">
            <SelectValue>{filterUser || 'All senders'}</SelectValue>
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value="">All senders</SelectItem>
            {USER_NAMES.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Select
          value={filterKind}
          onValueChange={(v) => {
            const kind = v ?? '';
            setFilterKind(kind);
            applyFilter(filterUser, kind);
          }}
        >
          <SelectTrigger size="sm" className="w-32 min-w-0">
            <SelectValue>
              {KIND_LABELS.find(([k]) => k === filterKind)?.[1] ?? 'All types'}
            </SelectValue>
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value="">All types</SelectItem>
            {KIND_LABELS.map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        {filterStatus ? (
          <span className="truncate text-muted-foreground text-xs">{filterStatus}</span>
        ) : null}
 
        <Separator orientation="vertical" className="mx-2 hidden h-5 md:block" />
 
        <span className="hidden whitespace-nowrap font-medium text-muted-foreground text-xs sm:inline">Search</span>
        <InputGroup className="w-full min-w-0 flex-1 basis-48 md:w-72 md:flex-none">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            size="sm"
            type="search"
            placeholder="Find keyword (within current filter)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
          />
        </InputGroup>
        <Button size="sm" onClick={runSearch}>
          Search
        </Button>
        <Button variant="outline" size="icon-sm" disabled={!canNav} onClick={() => jumpToMatch(cursorRef.current - 1)}>
          <ArrowUpIcon />
        </Button>
        <Button variant="outline" size="icon-sm" disabled={!canNav} onClick={() => jumpToMatch(cursorRef.current + 1)}>
          <ArrowDownIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canClear}
          onClick={() => {
            setQuery('');
            resetSearch();
          }}
        >
          <XIcon />
        </Button>
        {searchStatus ? (
          <span className="truncate text-muted-foreground text-xs">{searchStatus}</span>
        ) : null}
      </div>
 
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-background to-transparent" />
        <div id="viewport" ref={viewportRef} className="h-full" />
      </div>
 
      <div className="pointer-events-none absolute right-2 bottom-2 z-20 rounded-xl bg-popover/90 p-2 font-mono text-[10px] text-muted-foreground leading-relaxed backdrop-blur sm:right-4 sm:bottom-4 sm:min-w-52 sm:p-3 sm:text-xs">
        <div>
          FPS <b className="text-base text-green-600" ref={hudFps}>--</b>
        </div>
        <div>
          Current message <b className="font-semibold text-foreground" ref={hudIdx}>0</b>
        </div>
        <div>
          Live DOM nodes <b className="font-semibold text-foreground" ref={hudNodes}>0</b>
        </div>
        <div>
          Render window <b className="font-semibold text-foreground" ref={hudWin}>-</b>
        </div>
        <div>
          Rebuild time <b className="font-semibold text-foreground" ref={hudBuild}>-</b>
        </div>
        <div>
          JS heap <b className="font-semibold text-foreground" ref={hudMem}>n/a</b>
        </div>
      </div>
 
    </div>
  );
}
