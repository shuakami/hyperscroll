import { useEffect, useRef, useState } from 'react';
import type { DataSource } from '@hyperscroll/core';
import { FilteredDataSource, HyperScroll } from '@hyperscroll/core';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  MoveRightIcon,
  PanelLeftIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { MediaPreview, type MediaItem } from '@/components/ui/media-preview';
import { ChunkStore, loadManifest, type QceManifest } from './qce/chunk-store';

const BASE_URL = './qce-demo';
const QCE_REPO = 'https://github.com/shuakami/qq-chat-exporter';

const KIND_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['text', 'Text'],
  ['img', 'Images'],
  ['voice', 'Voice'],
  ['video', 'Videos'],
  ['file', 'Files'],
  ['link', 'Links'],
  ['code', 'Code'],
  ['poll', 'Polls'],
  ['location', 'Locations'],
  ['contact', 'Contacts'],
];

interface Filters {
  sender: string;
  kind: string;
  startMs: number;
  endMs: number;
}

const NO_FILTERS: Filters = { sender: '', kind: '', startMs: 0, endMs: 0 };

function hasFilters(f: Filters): boolean {
  return Boolean(f.sender || f.kind || f.startMs || f.endMs);
}

function GithubMark({ className }: { className?: string }): React.ReactElement {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function RustMark({ className }: { className?: string }): React.ReactElement {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.8346 11.7033l-1.0073-.6236a13.7268 13.7268 0 00-.0283-.2936l.8656-.8069a.3483.3483 0 00-.1154-.578l-1.1066-.414a8.4958 8.4958 0 00-.087-.2856l.6904-.9587a.3462.3462 0 00-.2257-.5446l-1.1663-.1894a9.3574 9.3574 0 00-.1407-.2622l.49-1.0761a.3437.3437 0 00-.0274-.3361.3486.3486 0 00-.3006-.154l-1.1845.0416a6.7444 6.7444 0 00-.1873-.2268l.2723-1.153a.3472.3472 0 00-.417-.4172l-1.1532.2724a14.0183 14.0183 0 00-.2278-.1873l.0415-1.1845a.3442.3442 0 00-.49-.328l-1.076.491c-.0872-.0476-.1742-.0952-.2623-.1407l-.1903-1.1673A.3483.3483 0 0016.256.955l-.9597.6905a8.4867 8.4867 0 00-.2855-.086l-.414-1.1066a.3483.3483 0 00-.5781-.1154l-.8069.8666a9.2936 9.2936 0 00-.2936-.0284L12.2946.1683a.3462.3462 0 00-.5892 0l-.6236 1.0073a13.7383 13.7383 0 00-.2936.0284L9.9803.3374a.3462.3462 0 00-.578.1154l-.4141 1.1065c-.0962.0274-.1903.0567-.2855.086L7.744.955a.3483.3483 0 00-.5447.2258L7.009 2.348a9.3574 9.3574 0 00-.2622.1407l-1.0762-.491a.3462.3462 0 00-.49.328l.0416 1.1845a7.9826 7.9826 0 00-.2278.1873L3.8413 3.425a.3472.3472 0 00-.4171.4171l.2713 1.1531c-.0628.075-.1255.1509-.1863.2268l-1.1845-.0415a.3462.3462 0 00-.328.49l.491 1.0761a9.167 9.167 0 00-.1407.2622l-1.1662.1894a.3483.3483 0 00-.2258.5446l.6904.9587a13.303 13.303 0 00-.087.2855l-1.1065.414a.3483.3483 0 00-.1155.5781l.8656.807a9.2936 9.2936 0 00-.0283.2935l-1.0073.6236a.3442.3442 0 000 .5892l1.0073.6236c.008.0982.0182.1964.0283.2936l-.8656.8079a.3462.3462 0 00.1155.578l1.1065.4141c.0273.0962.0567.1914.087.2855l-.6904.9587a.3452.3452 0 00.2268.5447l1.1662.1893c.0456.088.0922.1751.1408.2622l-.491 1.0762a.3462.3462 0 00.328.49l1.1834-.0415c.0618.0769.1235.1528.1873.2277l-.2713 1.1541a.3462.3462 0 00.4171.4161l1.153-.2713c.075.0638.151.1255.2279.1863l-.0415 1.1845a.3442.3442 0 00.49.327l1.0761-.49c.087.0486.1741.0951.2622.1407l.1903 1.1662a.3483.3483 0 00.5447.2268l.9587-.6904a9.299 9.299 0 00.2855.087l.414 1.1066a.3452.3452 0 00.5781.1154l.8079-.8656c.0972.0111.1954.0203.2936.0294l.6236 1.0073a.3472.3472 0 00.5892 0l.6236-1.0073c.0982-.0091.1964-.0183.2936-.0294l.8069.8656a.3483.3483 0 00.578-.1154l.4141-1.1066a8.4626 8.4626 0 00.2855-.087l.9587.6904a.3452.3452 0 00.5447-.2268l.1903-1.1662c.088-.0456.1751-.0931.2622-.1407l1.0762.49a.3472.3472 0 00.49-.327l-.0415-1.1845a6.7267 6.7267 0 00.2267-.1863l1.1531.2713a.3472.3472 0 00.4171-.416l-.2713-1.1542c.0628-.0749.1255-.1508.1863-.2278l1.1845.0415a.3442.3442 0 00.328-.49l-.49-1.076c.0475-.0872.0951-.1742.1407-.2623l1.1662-.1893a.3483.3483 0 00.2258-.5447l-.6904-.9587.087-.2855 1.1066-.414a.3462.3462 0 00.1154-.5781l-.8656-.8079c.0101-.0972.0202-.1954.0283-.2936l1.0073-.6236a.3442.3442 0 000-.5892zm-6.7413 8.3551a.7138.7138 0 01.2986-1.396.714.714 0 11-.2997 1.396zm-.3422-2.3142a.649.649 0 00-.7715.5l-.3573 1.6685c-1.1035.501-2.3285.7795-3.6193.7795a8.7368 8.7368 0 01-3.6951-.814l-.3574-1.6684a.648.648 0 00-.7714-.499l-1.473.3158a8.7216 8.7216 0 01-.7613-.898h7.1676c.081 0 .1356-.0141.1356-.088v-2.536c0-.074-.0536-.0881-.1356-.0881h-2.0966v-1.6077h2.2677c.2065 0 1.1065.0587 1.394 1.2088.0901.3533.2875 1.5044.4232 1.8729.1346.413.6833 1.2381 1.2685 1.2381h3.5716a.7492.7492 0 00.1296-.0131 8.7874 8.7874 0 01-.8119.9526zM6.8369 20.024a.714.714 0 11-.2997-1.396.714.714 0 01.2997 1.396zM4.1177 8.9972a.7137.7137 0 11-1.304.5791.7137.7137 0 011.304-.579zm-.8352 1.9813l1.5347-.6824a.65.65 0 00.33-.8585l-.3158-.7147h1.2432v5.6025H3.5669a8.7753 8.7753 0 01-.2834-3.348zm6.7343-.5437V8.7836h2.9601c.153 0 1.0792.1772 1.0792.8697 0 .575-.7107.7815-1.2948.7815zm10.7574 1.4862c0 .2187-.008.4363-.0243.651h-.9c-.09 0-.1265.0586-.1265.1477v.413c0 .973-.5487 1.1846-1.0296 1.2382-.4576.0517-.9648-.1913-1.0275-.4717-.2704-1.5186-.7198-1.8436-1.4305-2.4034.8817-.5599 1.799-1.386 1.799-2.4915 0-1.1936-.819-1.9458-1.3769-2.3153-.7825-.5163-1.6491-.6195-1.883-.6195H5.4682a8.7651 8.7651 0 014.907-2.7699l1.0974 1.151a.648.648 0 00.9182.0213l1.227-1.1743a8.7753 8.7753 0 016.0044 4.2762l-.8403 1.8982a.652.652 0 00.33.8585l1.6178.7188c.0283.2875.0425.577.0425.8717zm-9.3006-9.5993a.7128.7128 0 11.984 1.0316.7137.7137 0 01-.984-1.0316zm8.3389 6.71a.7107.7107 0 01.9395-.3625.7137.7137 0 11-.9405.3635z" />
    </svg>
  );
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

function skeletonHtml(i: number): string {
  return (
    `<div class="hs-item row" data-i="${i}"><div class="msg">` +
    `<span class="skel skel-avatar"></span>` +
    `<div class="body"><div class="name"><span class="skel skel-name"></span></div>` +
    `<span class="skel skel-bubble" style="width:${180 + ((i * 97) % 200)}px"></span></div>` +
    `</div></div>`
  );
}

/** Upscales a picsum thumbnail URL for full-size preview. */
function fullSizeSrc(src: string): string {
  const m = src.match(/^(https:\/\/picsum\.photos\/seed\/[^/]+)\/(\d+)\/(\d+)/);
  if (!m) return src;
  const w = Number(m[2]);
  const h = Number(m[3]);
  const scale = Math.min(4, Math.floor(1600 / Math.max(w, h)));
  return `${m[1]}/${w * Math.max(1, scale)}/${h * Math.max(1, scale)}`;
}

/** Synthesizes a small WAV blob so demo voice messages have a real download. */
function voiceWav(sec: number, seed: number): Blob {
  const rate = 8000;
  const n = rate * Math.max(1, Math.min(sec, 60));
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (off: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  let s = (seed || 1) >>> 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const noise = (s / 2 ** 32 - 0.5) * 0.3;
    const env = Math.sin((i / rate) * 2.4) ** 2;
    v.setInt16(44 + i * 2, (noise * env * 32767) | 0, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
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


  const [manifest, setManifest] = useState<QceManifest | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const filtersRef = useRef<Filters>(NO_FILTERS);
  const [query, setQuery] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [canNav, setCanNav] = useState(false);
  const [canClear, setCanClear] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadedChunks, setLoadedChunks] = useState(0);
  const [preview, setPreview] = useState<MediaItem | null>(null);

  function onViewportClick(e: React.MouseEvent): void {
    const target = e.target as HTMLElement;
    const voice = target.closest('.voice-bubble');
    if (voice) {
      const sec = Number(voice.getAttribute('data-sec') ?? 3);
      const seed = Number(voice.getAttribute('data-seed') ?? 1);
      const url = URL.createObjectURL(voiceWav(sec, seed));
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-${seed}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const videoBubble = target.closest('.video-bubble');
    if (videoBubble) {
      const img = videoBubble.querySelector('img');
      if (!img) return;
      const name = videoBubble.querySelector('.vname')?.textContent ?? 'video.mp4';
      setPreview({ type: 'video', src: fullSizeSrc(img.src), name });
      return;
    }
    const img = target.closest('img.img');
    if (img instanceof HTMLImageElement) {
      const seed = img.src.match(/seed\/(\d+)/)?.[1] ?? 'image';
      setPreview({ type: 'image', src: fullSizeSrc(img.src), name: `image-${seed}.jpg` });
    }
  }

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
    });
    engineRef.current = engine;
    let refreshQueued = false;
    store.onChunkLoaded = () => {
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

  function applyFilters(next: Filters): void {
    const engine = engineRef.current;
    const store = storeRef.current;
    if (!engine || !store) return;
    const run = ++filterRunRef.current;
    resetSearch();
    filtersRef.current = next;
    setFilters(next);
    if (!hasFilters(next)) {
      filterSourceRef.current = null;
      setFilterStatus('');
      engine.setDataSource(withHighlight(fullSourceOf(store)));
      return;
    }
    const src = new FilteredDataSource(fullSourceOf(store));
    filterSourceRef.current = src;
    engine.setDataSource(withHighlight(src));
    setFilterStatus('Filtering…');
    const senderLower = next.sender.toLowerCase();
    void (async () => {
      let skipped = 0;
      for (let c = 0; c < store.manifest.chunks.length; c++) {
        if (filterRunRef.current !== run) return;
        const meta = store.manifest.chunks[c]!;
        const outsideRange =
          (next.endMs > 0 && meta.startTs > next.endMs) ||
          (next.startMs > 0 && meta.endTs < next.startMs);
        if (outsideRange || (senderLower && !store.senderBloomOf(c).mayContain(senderLower))) {
          skipped += 1;
          continue;
        }
        const records = await store.load(c);
        if (filterRunRef.current !== run) return;
        const base = store.chunkStarts[c]!;
        const batch: number[] = [];
        for (let k = 0; k < records.length; k++) {
          const r = records[k]!;
          if (senderLower && r.nameLower !== senderLower) continue;
          if (next.kind && r.kind !== next.kind) continue;
          if (next.startMs > 0 && r.ts < next.startMs) continue;
          if (next.endMs > 0 && r.ts > next.endMs) continue;
          batch.push(base + k);
        }
        if (batch.length > 0) src.append(batch);
        engine.refresh();
        setFilterStatus(
          `${src.count.toLocaleString()} results, chunk ${c + 1} of ${store.manifest.chunks.length}, ${skipped} skipped`,
        );
      }
      if (filterRunRef.current !== run) return;
      engine.refresh();
      setFilterStatus(`${src.count.toLocaleString()} results, ${skipped} chunks skipped`);
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
      `${(s.cursor + 1).toLocaleString()} of ${n.toLocaleString()} matches${s.running ? ', searching…' : ''}`,
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
    const f = filtersRef.current;
    const sender = f.sender.toLowerCase();
    const t0 = performance.now();
    void (async () => {
      let firstJump = true;
      for (let c = 0; c < store.manifest.chunks.length; c++) {
        if (s.cancelled) return;
        const meta = store.manifest.chunks[c]!;
        const outsideRange =
          (f.endMs > 0 && meta.startTs > f.endMs) || (f.startMs > 0 && meta.endTs < f.startMs);
        if (outsideRange || !store.textBloomOf(c).mayContain(q)) {
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
          if (f.kind && r.kind !== f.kind) continue;
          if (f.startMs > 0 && r.ts < f.startMs) continue;
          if (f.endMs > 0 && r.ts > f.endMs) continue;
          if (r.text.toLowerCase().includes(q)) s.matches.push(base + k);
        }
        if (s.matches.length > 0 && firstJump) {
          firstJump = false;
          setCanNav(true);
          jumpToMatch(0);
        } else if (s.cursor < 0) {
          setSearchStatus(
            `Searching chunk ${c + 1} of ${store.manifest.chunks.length}, ${s.matches.length.toLocaleString()} matches, ${s.chunksSkipped} skipped`,
          );
        }
      }
      if (s.cancelled) return;
      s.running = false;
      const ms = performance.now() - t0;
      if (s.matches.length === 0) {
        setSearchStatus(
          `No matches, ${s.chunksSkipped} chunks skipped by Bloom, ${(ms / 1000).toFixed(1)}s`,
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
        <a href="./" className="block leading-tight">
          <span className="block font-semibold text-[15px] italic tracking-tight">QCE Viewer</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground italic tracking-wide">
            powered by <span className="text-foreground/70">HyperScroll</span>
          </span>
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
                <dd className="flex items-center gap-1.5 font-medium">
                  {fmtDate(stats.minDateKey)}
                  <MoveRightIcon className="size-3 text-muted-foreground" />
                  {fmtDate(stats.maxDateKey)}
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

            <div className="mt-8">
              <div className="font-medium text-muted-foreground text-xs">Search</div>
              <InputGroup className="mt-2 w-full">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  size="sm"
                  type="search"
                  placeholder="Search messages"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') runSearch();
                  }}
                />
              </InputGroup>
              <div className="mt-2 flex items-center gap-1.5">
                <Button size="sm" onClick={runSearch}>
                  Search
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous match"
                  disabled={!canNav}
                  onClick={() => jumpToMatch((searchRef.current?.cursor ?? 0) - 1)}
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next match"
                  disabled={!canNav}
                  onClick={() => jumpToMatch((searchRef.current?.cursor ?? 0) + 1)}
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Clear search"
                  disabled={!canClear}
                  onClick={() => {
                    setQuery('');
                    resetSearch();
                  }}
                >
                  <XIcon />
                </Button>
              </div>
              {searchStatus ? (
                <div className="mt-2 text-muted-foreground text-xs">{searchStatus}</div>
              ) : null}
            </div>

            <div className="mt-8">
              <div className="font-medium text-muted-foreground text-xs">Filter</div>
              <Select
                value={filters.sender}
                onValueChange={(v) => applyFilters({ ...filtersRef.current, sender: v ?? '' })}
              >
                <SelectTrigger size="sm" className="mt-2 w-full">
                  <SelectValue>{filters.sender || 'All senders'}</SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="">All senders</SelectItem>
                  {manifest.senders.map((sd) => (
                    <SelectItem key={sd.uid} value={sd.displayName}>
                      {sd.displayName}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <Select
                value={filters.kind}
                onValueChange={(v) => applyFilters({ ...filtersRef.current, kind: v ?? '' })}
              >
                <SelectTrigger size="sm" className="mt-2 w-full">
                  <SelectValue>
                    {KIND_OPTIONS.find(([k]) => k === filters.kind)?.[1] ?? 'All types'}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="">All types</SelectItem>
                  {KIND_OPTIONS.map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <DateRangePicker
                className="mt-2"
                startTime={dateStart}
                endTime={dateEnd}
                placeholder="All dates"
                defaultMonth={new Date(`${stats.minDateKey}T00:00:00`)}
                onChange={(s, e) => {
                  setDateStart(s);
                  setDateEnd(e);
                  applyFilters({
                    ...filtersRef.current,
                    startMs: s ? new Date(s).getTime() : 0,
                    endMs: e ? new Date(e).getTime() + 59_999 : 0,
                  });
                }}
              />
              {filterStatus ? (
                <div className="mt-2 text-muted-foreground text-xs">{filterStatus}</div>
              ) : null}
            </div>
          </>
        ) : null}

        <div className="mt-auto space-y-2 pt-6 text-muted-foreground text-xs">
          <a
            href={QCE_REPO}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground"
          >
            <GithubMark className="size-3.5" />
            shuakami/qq-chat-exporter
          </a>
          <div className="flex items-center gap-1.5">
            <RustMark className="size-3.5" />
            exporter {manifest?.exporter?.version ?? ''}
          </div>
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
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 left-2 z-10 md:hidden"
          aria-label="Toggle sidebar"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <PanelLeftIcon />
        </Button>

        <div className="relative min-h-0 flex-1" onClick={onViewportClick}>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-background to-transparent" />
          <div id="viewport" ref={viewportRef} className="qce-viewport h-full" />
        </div>
      </div>

      <MediaPreview item={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
