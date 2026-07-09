import { useEffect, useRef, useState } from 'react';
import type { DataSource } from '@hyperscroll/core';
import { FilteredDataSource, HyperScroll } from '@hyperscroll/core';
import { ArrowDownIcon, ArrowUpIcon, PanelLeftIcon, SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ChunkStore, loadManifest, type QceManifest } from './qce/chunk-store';

const BASE_URL = './qce-demo';

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

function skeletonHtml(i: number): string {
  return (
    `<div class="hs-item row" data-i="${i}"><div class="msg">` +
    `<span class="skel skel-avatar"></span>` +
    `<div class="body"><div class="name"><span class="skel skel-name"></span></div>` +
    `<span class="skel skel-bubble" style="width:${180 + ((i * 97) % 200)}px"></span></div>` +
    `</div></div>`
  );
}

function fmtDate(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

interface SearchState {
  matches: number[];
  cursor: number;
  running: boolean;
  chunksScanned: number;
  chunksSkipped: number;
  cancelled: boolean;
}

export default function Qce(): React.ReactElement {
  const viewportRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HyperScroll | null>(null);
  const storeRef = useRef<ChunkStore | null>(null);
  const highlightRef = useRef('');
  const filterSourceRef = useRef<FilteredDataSource | null>(null);
  const searchRef = useRef<SearchState | null>(null);
  const filterRunRef = useRef(0);

  const hudIdx = useRef<HTMLElement>(null);
  const hudChunks = useRef<HTMLElement>(null);
  const hudCache = useRef<HTMLElement>(null);
  const hudBloom = useRef<HTMLElement>(null);

  const [manifest, setManifest] = useState<QceManifest | null>(null);
  const [filterSender, setFilterSender] = useState('');
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [canNav, setCanNav] = useState(false);
  const [canClear, setCanClear] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadedChunks, setLoadedChunks] = useState(0);

  function withHighlight(src: DataSource): DataSource {
    return {
      get count() {
        return src.count;
      },
      renderToString: (i) =>
        highlightRef.current
          ? highlightHtml(src.renderToString(i), highlightRef.current)
          : src.renderToString(i),
      estimateHeight: src.estimateHeight?.bind(src),
    };
  }

  useEffect(() => {
    let disposed = false;
    void loadManifest(BASE_URL).then((m) => {
      if (disposed) return;
      setManifest(m);
    });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!manifest) return;
    const el = viewportRef.current;
    if (!el) return;
    const store = new ChunkStore(BASE_URL, manifest);
    storeRef.current = store;
    const fullSource: DataSource = {
      count: manifest.stats.totalMessages,
      renderToString(i) {
        const rec = store.get(i);
        return rec ? rec.html : skeletonHtml(i);
      },
      estimateHeight: () => 64,
    };
    const engine = new HyperScroll(el, {
      dataSource: withHighlight(fullSource),
      keyboard: true,
      onAnchorChange(anchor) {
        if (hudIdx.current) hudIdx.current.textContent = `#${anchor.index.toLocaleString()}`;
      },
    });
    engineRef.current = engine;
    let refreshQueued = false;
    store.onChunkLoaded = () => {
      if (hudChunks.current) hudChunks.current.textContent = String(store.loadedCount);
      if (hudCache.current) hudCache.current.textContent = String(store.cacheSize());
      setLoadedChunks(store.loadedCount);
      if (refreshQueued) return;
      refreshQueued = true;
      requestAnimationFrame(() => {
        refreshQueued = false;
        engine.refresh();
      });
    };

    return () => {
      if (searchRef.current) searchRef.current.cancelled = true;
      engine.destroy();
      engineRef.current = null;
      storeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest]);

  function fullSourceOf(store: ChunkStore): DataSource {
    return {
      count: store.manifest.stats.totalMessages,
      renderToString(i) {
        const rec = store.get(i);
        return rec ? rec.html : skeletonHtml(i);
      },
      estimateHeight: () => 64,
    };
  }

  function resetSearch(): void {
    if (searchRef.current) searchRef.current.cancelled = true;
    searchRef.current = null;
    setSearchStatus('');
    setCanNav(false);
    setCanClear(false);
    if (highlightRef.current) {
      highlightRef.current = '';
      engineRef.current?.refresh();
    }
  }

  function applyFilter(sender: string): void {
    const engine = engineRef.current;
    const store = storeRef.current;
    if (!engine || !store) return;
    const run = ++filterRunRef.current;
    resetSearch();
    setFilterSender(sender);
    if (!sender) {
      filterSourceRef.current = null;
      setFilterStatus('');
      engine.setDataSource(withHighlight(fullSourceOf(store)));
      return;
    }
    const src = new FilteredDataSource(fullSourceOf(store));
    filterSourceRef.current = src;
    engine.setDataSource(withHighlight(src));
    setFilterStatus('Filtering…');
    const senderLower = sender.toLowerCase();
    void (async () => {
      let skipped = 0;
      for (let c = 0; c < store.manifest.chunks.length; c++) {
        if (filterRunRef.current !== run) return;
        if (!store.senderBloomOf(c).mayContain(senderLower)) {
          skipped += 1;
          continue;
        }
        const records = await store.load(c);
        if (filterRunRef.current !== run) return;
        const base = store.chunkStarts[c]!;
        const batch: number[] = [];
        for (let k = 0; k < records.length; k++) {
          if (records[k]!.nameLower === senderLower) batch.push(base + k);
        }
        if (batch.length > 0) src.append(batch);
        engine.refresh();
        setFilterStatus(
          `${src.count.toLocaleString()} results (chunk ${c + 1}/${store.manifest.chunks.length}, ${skipped} skipped by Bloom)`,
        );
      }
      if (filterRunRef.current !== run) return;
      engine.refresh();
      setFilterStatus(`${src.count.toLocaleString()} results (${skipped} chunks skipped by Bloom)`);
    })();
  }

  function jumpToMatch(pos: number): void {
    const s = searchRef.current;
    const engine = engineRef.current;
    if (!s || !engine) return;
    const n = s.matches.length;
    if (n === 0) return;
    s.cursor = ((pos % n) + n) % n;
    const srcIdx = s.matches[s.cursor]!;
    setSearchStatus(
      `${(s.cursor + 1).toLocaleString()} / ${n.toLocaleString()} matches${s.running ? ' (searching…)' : ''}`,
    );
    const filterSource = filterSourceRef.current;
    if (filterSource) {
      const p = filterSource.indexOf(srcIdx);
      if (p >= 0) engine.scrollToIndex(p, -8);
    } else {
      engine.scrollToIndex(srcIdx, -8);
    }
  }

  function runSearch(): void {
    const engine = engineRef.current;
    const store = storeRef.current;
    if (!engine || !store) return;
    const q = query.trim().toLowerCase();
    resetSearch();
    if (!q) return;
    setCanClear(true);
    highlightRef.current = q;
    engine.refresh();
    const s: SearchState = {
      matches: [],
      cursor: -1,
      running: true,
      chunksScanned: 0,
      chunksSkipped: 0,
      cancelled: false,
    };
    searchRef.current = s;
    const sender = filterSender.toLowerCase();
    const t0 = performance.now();
    void (async () => {
      let firstJump = true;
      for (let c = 0; c < store.manifest.chunks.length; c++) {
        if (s.cancelled) return;
        if (!store.textBloomOf(c).mayContain(q)) {
          s.chunksSkipped += 1;
          continue;
        }
        const records = await store.load(c);
        if (s.cancelled) return;
        s.chunksScanned += 1;
        const base = store.chunkStarts[c]!;
        for (let k = 0; k < records.length; k++) {
          const r = records[k]!;
          if (sender && r.nameLower !== sender) continue;
          if (r.text.toLowerCase().includes(q)) s.matches.push(base + k);
        }
        if (hudBloom.current)
          hudBloom.current.textContent = `${s.chunksSkipped} skipped / ${s.chunksScanned} scanned`;
        if (s.matches.length > 0 && firstJump) {
          firstJump = false;
          setCanNav(true);
          jumpToMatch(0);
        } else if (s.cursor < 0) {
          setSearchStatus(
            `Searching chunk ${c + 1}/${store.manifest.chunks.length} (${s.matches.length.toLocaleString()} matches, ${s.chunksSkipped} skipped by Bloom)`,
          );
        }
      }
      if (s.cancelled) return;
      s.running = false;
      const ms = performance.now() - t0;
      if (s.matches.length === 0) {
        setSearchStatus(
          `No matches (${s.chunksSkipped} chunks skipped by Bloom, ${(ms / 1000).toFixed(1)}s)`,
        );
      } else {
        jumpToMatch(Math.max(s.cursor, 0));
      }
    })();
  }

  const chat = manifest?.chat;
  const stats = manifest?.stats;

  return (
    <div className="relative flex h-dvh bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`absolute inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col overflow-y-auto bg-background px-5 py-6 transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <a href="./" className="font-semibold text-sm tracking-tight">
          HyperScroll <span className="font-normal text-muted-foreground">qce viewer</span>
        </a>

        <div className="mt-6">
          <div className="font-semibold text-base tracking-tight">{chat?.name ?? 'Loading…'}</div>
          {chat ? <div className="mt-0.5 text-muted-foreground text-xs">{chat.type} chat export</div> : null}
        </div>

        {manifest && stats ? (
          <>
            <dl className="mt-5 space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Messages</dt>
                <dd className="font-medium tabular-nums">{stats.totalMessages.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Range</dt>
                <dd className="font-medium">
                  {fmtDate(stats.minDateKey)} — {fmtDate(stats.maxDateKey)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Chunks</dt>
                <dd className="font-medium tabular-nums">
                  {manifest.chunks.length} × {manifest.chunking.maxMessagesPerChunk.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Chunk loads</dt>
                <dd className="font-medium tabular-nums">{loadedChunks}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Format</dt>
                <dd className="max-w-40 truncate font-medium">{manifest.format}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Exported</dt>
                <dd className="font-medium">{new Date(manifest.exportTime).toLocaleDateString()}</dd>
              </div>
            </dl>

            {filterStatus ? (
              <div className="mt-4 text-muted-foreground text-xs">{filterStatus}</div>
            ) : null}
          </>
        ) : null}

        <div className="mt-auto pt-6 text-muted-foreground text-xs">
          <a href="./docs.html" className="hover:text-foreground">docs</a>
          <span className="mx-1.5">/</span>
          <a href="./benchmark.html" className="hover:text-foreground">benchmark</a>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="absolute inset-0 z-20 bg-background/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Main */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <PanelLeftIcon />
          </Button>
          <InputGroup className="w-full min-w-0 flex-1 basis-48 md:w-80 md:flex-none">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              size="sm"
              type="search"
              placeholder="Search messages (Bloom-prefiltered)"
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
          <Select
            value={filterSender}
            onValueChange={(v) => applyFilter(v ?? '')}
          >
            <SelectTrigger size="sm" className="w-32 min-w-0 sm:w-36">
              <SelectValue>{filterSender || 'All senders'}</SelectValue>
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="">All senders</SelectItem>
              {(manifest?.senders ?? []).map((sd) => (
                <SelectItem key={sd.uid} value={sd.displayName}>
                  {sd.displayName}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!canNav}
            onClick={() => jumpToMatch((searchRef.current?.cursor ?? 0) - 1)}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={!canNav}
            onClick={() => jumpToMatch((searchRef.current?.cursor ?? 0) + 1)}
          >
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

        <div className="relative min-h-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-background to-transparent" />
          <div id="viewport" ref={viewportRef} className="qce-viewport h-full" />
        </div>

        <div className="pointer-events-none absolute right-2 bottom-2 z-20 rounded-xl bg-popover/90 p-2 font-mono text-[10px] text-muted-foreground leading-relaxed backdrop-blur sm:right-4 sm:bottom-4 sm:min-w-52 sm:p-3 sm:text-xs">
          <div>
            Current message <b className="font-semibold text-foreground" ref={hudIdx}>0</b>
          </div>
          <div>
            Chunk loads <b className="font-semibold text-foreground" ref={hudChunks}>0</b>
          </div>
          <div>
            LRU cache <b className="font-semibold text-foreground" ref={hudCache}>0</b>
          </div>
          <div>
            Bloom <b className="font-semibold text-foreground" ref={hudBloom}>-</b>
          </div>
        </div>
      </div>
    </div>
  );
}
