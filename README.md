# HyperScroll

[![banner](https://raw.githubusercontent.com/shuakami/hyperscroll/main/docs/banner.png)](https://shuakami.github.io/hyperscroll/)

Anchor-driven virtualization engine for tens of millions of dynamic-height items in a single scroll view. Zero dependencies, framework-agnostic, constant memory, 60 FPS.

[Live demo](https://shuakami.github.io/hyperscroll/) · [Documentation](https://shuakami.github.io/hyperscroll/docs.html) · [Benchmark](https://shuakami.github.io/hyperscroll/benchmark.html)

**Why**

Mainstream virtualizers (TanStack Virtual, react-virtuoso, Clusterize) position content off a real scroll offset, so total content height is capped by the browser's ~33.5M px max scroll height — 30M messages × ~66 px is 2 billion px, far past the ceiling. They also keep per-item measurement state that grows with dataset size.

HyperScroll's position is an anchor — `(item index, pixel offset)` — never a scroll offset. Content height is unbounded and memory stays constant.

**Install**

```sh
npm i @hyperscroll/core
```

**Quick start**

```ts
import { HyperScroll, type DataSource } from '@hyperscroll/core';

const source: DataSource = {
  count: 30_000_000,
  renderToString: (i) => `<div class="hs-item">message ${i}</div>`,
};

const engine = new HyperScroll(document.getElementById('viewport')!, {
  dataSource: source,
  keyboard: true,
  onAnchorChange: (a) => console.log('top item', a.index),
});

engine.scrollToIndex(15_000_000); // instant jump at any index
engine.scrollBy(500);             // pixel-precise scroll
engine.destroy();
```

The data source returns an HTML string per index — no VDOM, no per-item JS objects. Works with any framework (or none) and any styling approach.

**How it works**

- Anchor model — position is `(index, offset)`, never a scroll offset, so content height is unbounded
- Dual input paths — wheel/touch/keyboard mutate the anchor in pixels; the native scrollbar thumb maps linearly to index space
- Incremental windowing — during continuous scrolling the render window is extended and pruned in small batches; full rebuilds only happen on jumps
- Native culling — `content-visibility: auto` per item delegates offscreen layout/paint skipping to the browser
- Bounded memory — an LRU height cache plus a running average keeps heap at a few MB for any dataset size
- SearchScanner — non-blocking chunked scan; filter or search 30M items while scrolling stays at 60 FPS

**API**

| Export | Purpose |
| --- | --- |
| `HyperScroll` | The engine: `scrollToIndex`, `scrollBy`, `refresh`, `setDataSource`, `getStats`, `destroy` |
| `DataSource` | `{ count, renderToString(i), estimateHeight?(i) }` |
| `SearchScanner` | Chunked async predicate scan with `onMatches` / `onProgress` / `onDone` |
| `HeightCache` | LRU height memory used by the anchor normalizer |

Full reference with live examples in the [documentation](https://shuakami.github.io/hyperscroll/docs.html).

**Repository**

- `packages/core` — the engine (`@hyperscroll/core`), strict TypeScript, zero deps, unit-tested
- `apps/demo` — demo site: 30M-message chat, docs and a live benchmark against `@tanstack/virtual-core`

**Development**

```sh
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

**License**

[MIT](LICENSE)
