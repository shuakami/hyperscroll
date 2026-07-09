import { useEffect, useRef, useState } from 'react';
import { FilteredDataSource, HyperScroll, SearchScanner } from '@hyperscroll/core';
import { highlightCode } from './highlight.js';

function Code({ children, title }: { children: string; title?: string }): React.ReactElement {
  return (
    <figure className="my-4 overflow-hidden rounded-md border border-border">
      {title ? (
        <figcaption className="border-border border-b bg-muted/40 px-4 py-2 font-mono text-muted-foreground text-xs">
          {title}
        </figcaption>
      ) : null}
      <pre
        className="overflow-x-auto bg-muted/20 p-4 font-mono text-[13px] leading-6"
        // Highlighter output is generated from the literal strings below; it
        // escapes all input before wrapping tokens in spans.
        dangerouslySetInnerHTML={{ __html: highlightCode(children.trim()) }}
      />
    </figure>
  );
}

interface PropRow {
  name: string;
  type: string;
  def?: string;
  desc: string;
}

function PropsTable({ rows }: { rows: PropRow[] }): React.ReactElement {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-border border-b">
            <th className="py-2 pr-4 font-medium text-muted-foreground text-xs">Prop</th>
            <th className="py-2 pr-4 font-medium text-muted-foreground text-xs">Type</th>
            <th className="py-2 pr-4 font-medium text-muted-foreground text-xs">Default</th>
            <th className="py-2 font-medium text-muted-foreground text-xs">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-border border-b">
              <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[13px]">{r.name}</td>
              <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[13px] text-muted-foreground">{r.type}</td>
              <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-[13px] text-muted-foreground">{r.def ?? '—'}</td>
              <td className="py-2.5 text-muted-foreground">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Bordered live-demo frame in the Base UI docs style: demo on top, code below. */
function DemoFrame({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="my-4 overflow-hidden rounded-md border border-border">
      {children}
    </div>
  );
}

function rowHtml(i: number): string {
  return `<div class="hs-item" style="border-bottom:1px solid var(--border);padding:8px 16px;font-family:var(--font-mono);font-size:13px;color:var(--foreground)">Row <b>#${i.toLocaleString()}</b></div>`;
}

/** 30M plain rows — the Quick start example, running for real. */
function BasicDemo(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const engine = new HyperScroll(el, {
      dataSource: { count: 30_000_000, renderToString: rowHtml },
      onAnchorChange: (a) => setAnchor(a.index),
    });
    return () => engine.destroy();
  }, []);
  return (
    <DemoFrame>
      <div ref={ref} className="h-64" />
      <div className="border-border border-t px-4 py-2 font-mono text-muted-foreground text-xs">
        30,000,000 rows · top row #{anchor.toLocaleString()}
      </div>
    </DemoFrame>
  );
}

/** scrollToIndex — jump anywhere in O(window). */
function JumpDemo(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HyperScroll | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const engine = new HyperScroll(el, {
      dataSource: { count: 30_000_000, renderToString: rowHtml },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);
  const jump = (i: number): void => engineRef.current?.scrollToIndex(i);
  const btn =
    'rounded-md border border-border px-2.5 py-1 font-mono text-xs hover:bg-muted/50';
  return (
    <DemoFrame>
      <div className="flex items-center gap-2 border-border border-b px-4 py-2">
        <button type="button" className={btn} onClick={() => jump(0)}>scrollToIndex(0)</button>
        <button type="button" className={btn} onClick={() => jump(15_000_000)}>scrollToIndex(15_000_000)</button>
        <button type="button" className={btn} onClick={() => jump(29_999_999)}>scrollToIndex(29_999_999)</button>
      </div>
      <div ref={ref} className="h-56" />
    </DemoFrame>
  );
}

/** SearchScanner + FilteredDataSource — streamed filtering over 5M rows. */
function FilterDemo(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HyperScroll | null>(null);
  const scannerRef = useRef<SearchScanner | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('5,000,000 rows');
  const total = 5_000_000;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const engine = new HyperScroll(el, {
      dataSource: { count: total, renderToString: rowHtml },
    });
    engineRef.current = engine;
    return () => {
      scannerRef.current?.cancel();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  function run(q: string): void {
    setQuery(q);
    const engine = engineRef.current;
    if (!engine) return;
    scannerRef.current?.cancel();
    if (!q) {
      setStatus('5,000,000 rows');
      engine.setDataSource({ count: total, renderToString: rowHtml });
      return;
    }
    const src = new FilteredDataSource({ count: total, renderToString: rowHtml });
    engine.setDataSource(src);
    let last = 0;
    const scanner = new SearchScanner(total, (i) => String(i).includes(q), {
      onMatches(batch) {
        src.append(batch);
        const now = performance.now();
        if (now - last > 250) {
          last = now;
          engine.refresh();
        }
      },
      onProgress(scanned) {
        setStatus(`${src.count.toLocaleString()} matches (scanned ${Math.round((scanned / total) * 100)}%)`);
      },
      onDone(matches) {
        engine.refresh();
        setStatus(`${matches.length.toLocaleString()} matches`);
      },
    });
    scannerRef.current = scanner;
    scanner.start();
  }

  return (
    <DemoFrame>
      <div className="flex items-center gap-3 border-border border-b px-4 py-2">
        <input
          className="w-56 rounded-md border border-border px-2.5 py-1 font-mono text-xs outline-none focus:border-foreground/40"
          placeholder="Rows whose index contains…"
          value={query}
          onChange={(e) => run(e.target.value.replace(/\D/g, ''))}
        />
        <span className="font-mono text-muted-foreground text-xs">{status}</span>
      </div>
      <div ref={ref} className="h-56" />
    </DemoFrame>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }): React.ReactElement {
  return (
    <h2 id={id} className="mt-14 mb-3 scroll-mt-20 font-semibold text-xl tracking-tight">
      <a href={`#${id}`}>{children}</a>
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="my-3 text-[15px] text-muted-foreground leading-7">{children}</p>;
}

function InlineCode({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <code className="rounded border border-border bg-muted/40 px-1 py-0.5 font-mono text-[13px] text-foreground">
      {children}
    </code>
  );
}

const NAV: ReadonlyArray<readonly [string, ReadonlyArray<readonly [string, string]>]> = [
  [
    'Overview',
    [
      ['quick-start', 'Quick start'],
      ['why', 'Why HyperScroll'],
    ],
  ],
  [
    'Concepts',
    [
      ['anchor-model', 'Anchor model'],
      ['data-source', 'Data source'],
      ['render-window', 'Render window'],
    ],
  ],
  [
    'API reference',
    [
      ['hyperscroll', 'HyperScroll'],
      ['options', 'Options'],
      ['searchscanner', 'SearchScanner'],
      ['filtereddatasource', 'FilteredDataSource'],
      ['bitsetindex', 'BitsetIndex'],
    ],
  ],
  [
    'Guides',
    [['styling', 'Styling']],
  ],
];

function useActiveSection(ids: readonly string[]): string {
  const [active, setActive] = useState(ids[0] ?? '');
  useEffect(() => {
    let ticking = false;
    const update = (): void => {
      ticking = false;
      let current = ids[0] ?? '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 96) current = id;
      }
      setActive(current);
    };
    const onScroll = (): void => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ids]);
  return active;
}

const ALL_IDS: readonly string[] = NAV.flatMap(([, items]) => items.map(([id]) => id));

export default function Docs(): React.ReactElement {
  const active = useActiveSection(ALL_IDS);
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/90 px-6 py-3 backdrop-blur">
        <a href="./index.html" className="whitespace-nowrap font-semibold text-sm tracking-tight">
          HyperScroll <span className="font-normal text-muted-foreground">@hyperscroll/core</span>
        </a>
        <nav className="ml-auto flex items-center gap-4 text-muted-foreground text-sm">
          <a href="./index.html" className="hover:text-foreground">Demo</a>
          <a href="./benchmark.html" className="hover:text-foreground">Benchmark</a>
          <span className="text-foreground">Docs</span>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-10 px-6">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-44 shrink-0 overflow-y-auto py-8 md:block">
          {NAV.map(([group, items]) => (
            <div key={group} className="mb-6">
              <div className="mb-2 font-medium text-foreground text-xs">{group}</div>
              <ul className="flex flex-col gap-1">
                {items.map(([id, label]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className={`block py-0.5 text-sm ${
                        active === id
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <main className="min-w-0 max-w-3xl flex-1 pt-8 pb-24">
          <h1 className="font-semibold text-3xl tracking-tight">HyperScroll</h1>
          <P>
            Anchor-driven virtualization engine for rendering tens of millions of dynamic-height
            items — chat logs, IM history, log streams — in a single scroll view. Zero dependencies,
            framework-agnostic, works with plain CSS or Tailwind.
          </P>

          <H2 id="quick-start">Quick start</H2>
          <Code title="Terminal">{`npm i @hyperscroll/core`}</Code>
          <P>
            Create a <InlineCode>DataSource</InlineCode> that produces the HTML for an index on
            demand, then attach the engine to a container element. This exact code runs below —
            scroll it, drag the scrollbar:
          </P>
          <BasicDemo />
          <Code title="main.ts">{`
import { HyperScroll, type DataSource } from '@hyperscroll/core';

const source: DataSource = {
  count: 30_000_000,
  renderToString: (i) => \`<div class="hs-item">Row #\${i}</div>\`,
};

const engine = new HyperScroll(document.getElementById('viewport')!, {
  dataSource: source,
  onAnchorChange: (a) => console.log('top row', a.index),
});
`}</Code>

          <H2 id="why">Why HyperScroll</H2>
          <P>
            Every mainstream virtualizer (TanStack Virtual, react-virtuoso, Clusterize, HighTable)
            positions content off a real scroll offset, so total content height is capped by the
            browser&apos;s ~33.5M px maximum scroll height — 30M messages at ~66&nbsp;px each is
            about 2&nbsp;billion&nbsp;px. They also keep per-item measurement state in JS memory,
            which grows without bound with dataset size.
          </P>
          <P>
            HyperScroll never maps position to a scroll offset, keeps a bounded LRU height cache,
            and rebuilds a ~100-item window with a single <InlineCode>innerHTML</InlineCode> write —
            no virtual DOM, no diffing, no per-item JS objects. See the{' '}
            <a href="./benchmark.html" className="text-foreground underline underline-offset-2">
              live benchmark
            </a>{' '}
            against TanStack Virtual on identical data.
          </P>

          <H2 id="anchor-model">Anchor model</H2>
          <P>
            The engine&apos;s positional model is an <InlineCode>Anchor</InlineCode>: the item at
            the top of the viewport plus the number of pixels scrolled past its top edge. Content
            placement never depends on a real DOM scroll offset, which is what lets the engine
            bypass the browser&apos;s maximum scroll height.
          </P>
          <Code title="types.ts">{`
interface Anchor {
  index: number;   // item at the top of the viewport
  offset: number;  // pixels scrolled past the top of that item
}
`}</Code>
          <P>
            Input follows two paths: wheel, touch and keyboard mutate the anchor in pixels
            (precise), while the native scrollbar thumb maps linearly to index space (coarse
            teleport). Wheel deltas are eased over frames with time-based exponential decay and
            always settle on an integer pixel, so text is never subpixel-rendered.
          </P>

          <H2 id="data-source">Data source</H2>
          <P>
            The engine never holds item objects in memory — it asks the source to produce the HTML
            for an index on demand. Implementations may generate content, read from sharded JSON,
            or stream from IndexedDB with a cursor.
          </P>
          <PropsTable
            rows={[
              { name: 'count', type: 'number', desc: 'Total number of items. May be arbitrarily large (10^8+).' },
              { name: 'renderToString(index)', type: '(i: number) => string', desc: 'Outer HTML for the item. Must produce exactly one root element. Called only for items entering the render window.' },
              { name: 'estimateHeight?(index)', type: '(i: number) => number', desc: 'Optional pre-measure height estimate in px, used before first render.' },
            ]}
          />

          <H2 id="render-window">Render window</H2>
          <P>
            Only a window of roughly 100 items is materialized in the DOM at any time. Each item
            gets <InlineCode>content-visibility: auto</InlineCode>, delegating offscreen layout and
            paint skipping to the browser&apos;s native engine. Measured heights feed a bounded LRU
            cache (default 5000 entries) plus a running average, keeping the JS heap at a few MB
            for any dataset size.
          </P>

          <H2 id="hyperscroll">HyperScroll</H2>
          <P>
            <InlineCode>scrollToIndex</InlineCode> is an O(window) jump — it works the same at row
            0 and row 29,999,999. Try it:
          </P>
          <JumpDemo />
          <Code>{`new HyperScroll(container: HTMLElement, options: HyperScrollOptions)`}</Code>
          <PropsTable
            rows={[
              { name: 'scrollToIndex(index, offset?)', type: '(i: number, px?: number) => void', desc: 'Jump so that item index is at the viewport top (+offset px). O(window), works at any index.' },
              { name: 'scrollBy(px)', type: '(px: number) => void', desc: 'Pixel-precise relative scroll.' },
              { name: 'refresh()', type: '() => void', desc: 'Rebuild the window in place. Call after the data source content changes.' },
              { name: 'setDataSource(source)', type: '(s: DataSource) => void', desc: 'Swap the data source and reset the anchor to the top.' },
              { name: 'getStats()', type: '() => EngineDebugStats', desc: 'Current anchor, range, rendered count and last rebuild time.' },
              { name: 'destroy()', type: '() => void', desc: 'Detach all listeners and observers.' },
            ]}
          />

          <H2 id="options">Options</H2>
          <PropsTable
            rows={[
              { name: 'dataSource', type: 'DataSource', desc: 'Required. Produces item HTML on demand.' },
              { name: 'upCount', type: 'number', def: '40', desc: 'Items rendered above the anchor.' },
              { name: 'overscanPx', type: 'number', def: '2000', desc: 'Minimum pixels rendered below the viewport bottom.' },
              { name: 'scrollbarHeight', type: 'number', def: '3e6', desc: 'Virtual scrollbar track height in px. Must stay far below browser limits.' },
              { name: 'estimatedItemHeight', type: 'number', def: '60', desc: 'Fallback item height estimate before any measurement.' },
              { name: 'keyboard', type: 'boolean', def: 'false', desc: 'Attach PageUp/PageDown/Home/End/Arrow handling to the window.' },
              { name: 'smoothWheel', type: 'boolean', def: 'true', desc: 'Ease wheel deltas over frames instead of applying them instantly.' },
              { name: 'onAnchorChange', type: '(a: Anchor) => void', desc: 'Fired after every anchor movement (wheel, drag, jump).' },
              { name: 'onRangeChange', type: '(r: RenderRange, ms: number) => void', desc: 'Fired whenever the materialized window is rebuilt.' },
            ]}
          />

          <H2 id="searchscanner">SearchScanner</H2>
          <P>
            Incremental full-dataset scan that never blocks the main thread. The scanner walks all
            indices in time-sliced batches, testing each against a predicate, and streams matching
            indices into a <InlineCode>BitsetIndex</InlineCode>. Below, 5M rows are filtered live
            while the list stays scrollable at 60&nbsp;FPS:
          </P>
          <FilterDemo />
          <Code>{`
const scanner = new SearchScanner(total, (i) => text(i).includes(q), {
  onMatches: (batch) => src.append(batch),   // streamed as found
  onProgress: (scanned, total) => update(scanned / total),
  onDone: (matches) => console.log(matches.length),
});
scanner.start();
`}</Code>
          <PropsTable
            rows={[
              { name: 'matches', type: 'BitsetIndex', desc: 'Matches found so far (live, grows during the scan).' },
              { name: 'scanned', type: 'number', desc: 'Indices scanned so far.' },
              { name: 'done', type: 'boolean', desc: 'Whether the scan has completed.' },
              { name: 'start()', type: '() => void', desc: 'Begin the time-sliced scan.' },
              { name: 'cancel()', type: '() => void', desc: 'Stop the scan; no further callbacks fire.' },
            ]}
          />

          <H2 id="filtereddatasource">FilteredDataSource</H2>
          <P>
            A <InlineCode>DataSource</InlineCode> view over another source, restricted to a list of
            matching indices — used for filters. Pair it with a scanner and append matches as they
            stream in (that is exactly what the demo above does):
          </P>
          <Code>{`
const src = new FilteredDataSource(full);
engine.setDataSource(src);
scanner = new SearchScanner(full.count, pass, {
  onMatches: (batch) => { src.append(batch); engine.refresh(); },
});
`}</Code>
          <PropsTable
            rows={[
              { name: 'count', type: 'number', desc: 'Number of matches appended so far.' },
              { name: 'sourceIndex(i)', type: '(i: number) => number', desc: 'Map a filtered position to the underlying source index.' },
              { name: 'indexOf(sourceIndex)', type: '(s: number) => number', desc: 'Map a source index back to its filtered position, or -1.' },
              { name: 'append(batch)', type: '(b: readonly number[]) => void', desc: 'Append a batch of matching source indices.' },
              { name: 'reset(indices?)', type: '(b?: readonly number[]) => void', desc: 'Replace the match list.' },
            ]}
          />

          <H2 id="bitsetindex">BitsetIndex</H2>
          <P>
            Succinct monotone index list: 1 bit per candidate index with O(1) amortized{' '}
            <InlineCode>at</InlineCode>/<InlineCode>indexOf</InlineCode> via rank/select blocks.
            Holding 30M match indices costs ~4&nbsp;MB instead of ~240&nbsp;MB for a plain array.
          </P>

          <H2 id="styling">Styling</H2>
          <P>
            The engine writes plain HTML strings, so items are styled with ordinary CSS — plain
            stylesheets, Tailwind utility classes, or CSS variables all work. Two rules matter for
            performance:
          </P>
          <Code title="styles.css">{`
.hs-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 60px; /* match estimatedItemHeight */
}
`}</Code>
        </main>
      </div>
    </div>
  );
}
