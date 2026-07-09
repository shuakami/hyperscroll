import type { DataSource } from '@hyperscroll/core';
import { highlightCode } from './highlight.js';
 
/**
 * Deterministic synthetic QQ-style chat data source. Messages are generated
 * from a seeded PRNG per index, so the source holds zero item state — the
 * same access pattern as reading sharded export JSON or an IndexedDB cursor.
 */
 
function rng(seed: number): () => number {
  let t = (seed + 0x6d2b79f5) | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
 
// [display name, fallback color, GitHub login for the real avatar]
const USERS: ReadonlyArray<readonly [string, string, string]> = [
  ['shuakami', '#e0536e', 'shuakami'],
  ['WanliZhong', '#5470e0', 'WanliZhong'],
  ['DIYgod', '#33a852', 'DIYgod'],
  ['Tsuki', '#a24fd0', 'Tsuk1ko'],
  ['yihong', '#e08b3a', 'yihong0618'],
  ['YunYouJun', '#2aa7b8', 'YunYouJun'],
  ['mashiro', '#7a6ff0', 'mashirozx'],
  ['Me', '#0099ff', 'octocat'],
];
 
export const AVATAR_BY_USER = new Map(USERS.map((u) => [u[0], u[2]]));
 
// A pool of natural, developer-flavoured chat lines. Search keywords below are
// intentionally present so the demo's search/filter has meaningful hits.
const LINES: readonly string[] = [
  'Just pushed the fix for the scroll anchoring bug, can you pull and try again?',
  'Nice, that feels way smoother now. No more jumping when I scroll up.',
  'Wait, how are you rendering 30 million rows without the browser choking?',
  'We never mount them all. Only a small window of DOM nodes is live at any time.',
  'The trick is the anchor model — position is (index, offset), not a giant scrollHeight.',
  'Right, otherwise you hit the ~33 million pixel scroll limit almost immediately.',
  'content-visibility does the heavy lifting for offscreen chunks, the rest is ours.',
  'Memory stays flat around a couple MB the whole time, which is honestly wild.',
  'I dragged the scrollbar all the way to the bottom and it landed exactly on the last message.',
  'Search across the full dataset finished in about 2.6 seconds here, 60fps the whole time.',
  'The highlight on matched keywords is a really nice touch.',
  'Can we make the bubbles a little rounder? Want it closer to the Vercel look.',
  'Done. White background, no header divider, matches the Base UI site now.',
  'Filtering by sender is instant — no button, it just re-streams the results.',
  'Yeah filter and search are two separate things now, glad we split them.',
  'How big does the export HTML get for a real 10M message chat?',
  'Big, but it opens fine because nothing is parsed until it scrolls into view.',
  'I love that there is zero backend. It is genuinely just a static file.',
  'Let me know if the smooth scrolling still feels off on your trackpad.',
  'Feels great here. The integer-pixel rounding fixed the blur on stop.',
  'Shipping this to the demo site now, link incoming.',
  'The benchmark against TanStack Virtual is brutal, ours uses a fraction of the memory.',
  'Good morning! Did the overnight stress test with 100M rows pass?',
  'It did. No leaks, heap stayed constant. Screenshot in the thread.',
  'Can you review the PR when you get a sec? Small diff, mostly the anchor clamp.',
  'Reviewing now. One nit on the naming but otherwise looks solid.',
  'Merged. Thanks for the quick turnaround everyone.',
  'This is going to be perfect for the log viewer use case too.',
  'Agreed, huge Nginx logs would be a great second demo.',
  'The keyboard navigation is a nice bonus, arrow keys just work.',
  'Should we add a jump-to-date control next?',
  'Maybe, but let us keep the core lean first.',
  'Honestly this is the smoothest million-row list I have ever used in a browser.',
  'The avatars loading from the CDN look clean against the white background.',
  'One more thing — can the HUD show the render window range?',
  'Already in there, bottom right. Shows the live start and end index.',
];
 
function pick<T>(arr: readonly T[], r: () => number): T {
  const v = arr[(r() * arr.length) | 0];
  if (v === undefined) throw new Error('empty array');
  return v;
}
 
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
 
// Date separators cycle through 3650 distinct days; Intl formatting is very
// slow (~0.25ms/call), so format each day at most once.
const dateCache: string[] = [];
function sysDateText(i: number): string {
  const day = ((i / 197) | 0) % 3650;
  let s = dateCache[day];
  if (s === undefined) {
    s = new Date(2016, 0, 1 + day).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    dateCache[day] = s;
  }
  return s;
}

// LINES is static, so escape once at module init instead of per message.
const ESCAPED_LINES: readonly string[] = LINES.map(esc);

function makeText(r: () => number): string {
  // Usually a single natural line; occasionally two for variety.
  let s = pick(ESCAPED_LINES, r);
  if (r() < 0.22) s += ' ' + pick(ESCAPED_LINES, r);
  return s;
}
 
function realImg(r: () => number): string {
  const w = 220 + ((r() * 140) | 0);
  const h = 150 + ((r() * 120) | 0);
  const seed = (r() * 1_000_000) | 0;
  return `<img class="img" loading="lazy" width="${w}" height="${h}" src="https://picsum.photos/seed/${seed}/${w}/${h}" alt="photo"/>`;
}
 
const SNIPPETS: readonly string[] = [
  "engine.scrollToIndex(29_999_999);\n// lands on the last message, no 33M px limit",
  "const src = new FilteredDataSource(full);\nsrc.append(matches);\nengine.setDataSource(src);",
  ".hs-item {\n  content-visibility: auto;\n  contain-intrinsic-size: auto 60px;\n}",
  "const scanner = new SearchScanner(total, pass, {\n  onMatches: (batch) => src.append(batch),\n});",
  "anchor = { index: 14_203_991, offsetPx: 18 };\n// position is (index, offset), not scrollTop",
  "npm i @hyperscroll/core\n# zero dependencies, 4 source files",
];
 
const FILES: ReadonlyArray<readonly [string, string]> = [
  ['bench-results-300k.csv', '18 KB'],
  ['stress-test-100M.log.zip', '42 MB'],
  ['profile-trace.json', '3.1 MB'],
  ['chat-export-2016.html', '812 MB'],
  ['hyperscroll-core-0.1.0.tgz', '9 KB'],
  ['heap-snapshot-after-scan.heapsnapshot', '58 MB'],
];
 
const LINKS: ReadonlyArray<readonly [string, string, string]> = [
  ['HyperScroll RFC: the anchor positioning model', 'github.com', 'Design notes on decoupling scroll position from scrollHeight.'],
  ['content-visibility: the CSS property that changed everything', 'web.dev', 'How browser-level rendering containment skips offscreen work.'],
  ['Why virtual scrolling breaks past 33 million pixels', 'blog.hyperscroll.dev', 'Browser max element height limits, measured across engines.'],
  ['TanStack Virtual vs HyperScroll: a memory story', 'blog.hyperscroll.dev', '1.7 MB vs 30.6 MB heap on the same 300k-row protocol.'],
  ['Succinct bitsets for streaming search results', 'github.com', '1 bit per candidate with O(1) rank/select navigation.'],
];
 
const PLACES: ReadonlyArray<readonly [string, string]> = [
  ['Shibuya Sky Observation Deck', '2-24-12 Shibuya, Tokyo'],
  ['Hangzhou West Lake', 'Xihu District, Hangzhou'],
  ['GitHub HQ', '88 Colin P Kelly Jr St, San Francisco'],
  ['Akihabara Electric Town', 'Sotokanda, Chiyoda City, Tokyo'],
  ['Shenzhen Bay Park', 'Nanshan District, Shenzhen'],
];
 
const POLLS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['Default dataset size for the public demo?', ['10 million', '30 million', '100 million']],
  ['Next demo after chat export?', ['Nginx log viewer', 'AI conversation replay', 'CSV explorer']],
  ['Ship the voice synthesis or keep it visual only?', ['Ship it', 'Keep visual']],
  ['Bubble corner radius?', ['12px', '16px', 'Full pill']],
];
 
// [duration, base name, playable sample mp4]
const VIDEOS: ReadonlyArray<readonly [string, string, string]> = [
  ['0:42', 'screen-recording-scroll-test', 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4'],
  ['1:37', 'benchmark-run-300k', 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4'],
  ['0:15', 'jitter-repro-before-fix', 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4'],
  ['2:05', 'demo-walkthrough', 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_2MB.mp4'],
];

// Twemoji codepoints rendered as sticker messages (SVG assets via CDN).
const STICKERS: readonly string[] = [
  '1f602', '1f60d', '1f923', '1f44d', '1f389', '1f525', '1f649', '1f979', '1f4af', '1f921',
];

function stickerUrl(code: string): string {
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${code}.svg`;
}

// Meme-style image stickers bundled with the demo (relative to the page URL).
const IMG_STICKERS: readonly string[] = ['stickers/cat-plead.jpg'];

// File-type badge: extension label + accent color, keyed by extension.
const FILE_KINDS: Readonly<Record<string, readonly [string, string]>> = {
  csv: ['CSV', '#33a852'],
  zip: ['ZIP', '#e08b3a'],
  json: ['JSON', '#a24fd0'],
  html: ['HTML', '#e0536e'],
  tgz: ['TGZ', '#e08b3a'],
  heapsnapshot: ['HEAP', '#5470e0'],
  log: ['LOG', '#2aa7b8'],
  pdf: ['PDF', '#e0536e'],
  mp4: ['MP4', '#7a6ff0'],
};

function fileBadge(name: string): string {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  const [label, color] = FILE_KINDS[ext] ?? ['FILE', '#8a8a8a'];
  return `<span class="ficon" style="background:color-mix(in srgb, ${color} 14%, transparent);color:${color}">${label}</span>`;
}
 
export type MessageKind =
  | 'sys'
  | 'text'
  | 'img'
  | 'sticker'
  | 'voice'
  | 'code'
  | 'file'
  | 'link'
  | 'video'
  | 'location'
  | 'contact'
  | 'poll';
 
export interface MessageMeta {
  kind: MessageKind;
  /** Sender name ('' for system rows). */
  user: string;
  userColor: string;
  /** Searchable plain text ('' for image messages). */
  text: string;
  /** Inner bubble HTML (kind-specific). */
  html: string;
}
 
/**
 * Single generation path for both rendering and searching: the meta carries
 * the exact displayed text, so search results always match what's on screen.
 */
export function messageMeta(i: number): MessageMeta {
  const r = rng((i * 2654435761) % 2147483647);
  if (i % 197 === 0) {
    return { kind: 'sys', user: '', userColor: '', text: sysDateText(i), html: '' };
  }
  const u = pick(USERS, r);
  const t = r();
  if (t < 0.6) {
    let quote = '';
    let quoteText = '';
    if (r() < 0.14) {
      const q = pick(LINES, r);
      quoteText = `${pick(USERS, r)[0]}: ${q.slice(0, 40)}${q.length > 40 ? '…' : ''}`;
      quote = `<div class="quote">${esc(quoteText)}</div>`;
    }
    const text = makeText(r);
    return { kind: 'text', user: u[0], userColor: u[1], text: quoteText ? `${quoteText} ${text}` : text, html: `<div class="bubble">${quote}${text}</div>` };
  }
  if (t < 0.69) {
    // Some image messages carry a caption line, QQ "text with picture" style.
    const withText = r() < 0.35;
    const text = withText ? makeText(r) : '';
    const caption = withText ? `<div class="icaption">${text}</div>` : '';
    return { kind: 'img', user: u[0], userColor: u[1], text, html: `<div class="bubble img-bubble">${caption}${realImg(r)}</div>` };
  }
  if (t < 0.72) {
    if (r() < 0.5) {
      const src = pick(IMG_STICKERS, r);
      return {
        kind: 'sticker', user: u[0], userColor: u[1], text: '',
        html: `<div class="sticker-wrap"><img class="sticker sticker-img" loading="lazy" width="130" height="130" src="${src}" alt="sticker"/></div>`,
      };
    }
    const code = pick(STICKERS, r);
    return {
      kind: 'sticker', user: u[0], userColor: u[1], text: '',
      html: `<div class="sticker-wrap"><img class="sticker" loading="lazy" width="110" height="110" data-code="${code}" src="${stickerUrl(code)}" alt="sticker"/></div>`,
    };
  }
  if (t < 0.78) {
    const sec = (2 + r() * 40) | 0;
    const seed = (r() * 1_000_000) | 0;
    const bars = Array.from({ length: 14 + (sec % 10) }, (_, k) => {
      const h = 4 + (((Math.sin(seed + k * 1.7) + 1) / 2) * 12) | 0;
      return `<i style="height:${h}px"></i>`;
    }).join('');
    const text = `Voice message ${sec}s`;
    return {
      kind: 'voice', user: u[0], userColor: u[1], text,
      html:
        `<button type="button" class="bubble voice-bubble" data-sec="${sec}" data-seed="${seed}" aria-label="Play voice message, ${sec} seconds">` +
        `<span class="vplay"></span><span class="vbars">${bars}</span><span class="vsec">${sec}″</span>` +
        `<span class="vdl" role="button" aria-label="Download voice message" title="Download">` +
        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/></svg></span></button>`,
    };
  }
  if (t < 0.83) {
    const code = pick(SNIPPETS, r);
    return { kind: 'code', user: u[0], userColor: u[1], text: code, html: `<div class="bubble code-bubble"><pre>${highlightCode(code)}</pre></div>` };
  }
  if (t < 0.87) {
    const f = pick(FILES, r);
    return {
      kind: 'file', user: u[0], userColor: u[1], text: f[0],
      html:
        `<div class="bubble file-bubble">${fileBadge(f[0])}` +
        `<span class="fmeta"><span class="fname">${esc(f[0])}</span><span class="fsize">${f[1]}</span></span></div>`,
    };
  }
  if (t < 0.9) {
    const l = pick(LINKS, r);
    return {
      kind: 'link', user: u[0], userColor: u[1], text: `${l[0]} ${l[2]}`,
      html:
        `<div class="bubble link-bubble"><span class="ltitle">${esc(l[0])}</span>` +
        `<span class="ldesc">${esc(l[2])}</span><span class="ldomain">${esc(l[1])}</span></div>`,
    };
  }
  if (t < 0.94) {
    const v = pick(VIDEOS, r);
    const seed = (r() * 1_000_000) | 0;
    return {
      kind: 'video', user: u[0], userColor: u[1], text: v[1],
      html:
        `<div class="bubble video-bubble" data-mp4="${v[2]}">` +
        `<img class="img" loading="lazy" width="300" height="170" src="https://picsum.photos/seed/${seed}/300/170" alt="video"/>` +
        `<span class="vbadge"><i class="vtri"></i>${v[0]}</span>` +
        `<span class="vname">${esc(v[1])}.mp4</span></div>`,
    };
  }
  if (t < 0.965) {
    const p = pick(PLACES, r);
    const seed = (r() * 1_000_000) | 0;
    return {
      kind: 'location', user: u[0], userColor: u[1], text: `${p[0]} ${p[1]}`,
      html:
        `<div class="bubble loc-bubble">` +
        `<img class="img" loading="lazy" width="300" height="110" src="https://picsum.photos/seed/${seed}/300/110?grayscale" alt="map"/>` +
        `<span class="lpin"></span>` +
        `<span class="lname">${esc(p[0])}</span><span class="laddr">${esc(p[1])}</span></div>`,
    };
  }
  if (t < 0.985) {
    const c = pick(USERS, r);
    return {
      kind: 'contact', user: u[0], userColor: u[1], text: c[0],
      html:
        `<div class="bubble contact-bubble">` +
        `<img class="cavatar" loading="lazy" src="https://avatars.githubusercontent.com/${c[2]}?size=80" alt="${c[0]}"/>` +
        `<span class="cmeta"><span class="cname">${esc(c[0])}</span><span class="clabel">Contact card</span></span></div>`,
    };
  }
  const poll = pick(POLLS, r);
  const votes = poll[1].map(() => 1 + ((r() * 40) | 0));
  const total = votes.reduce((a, b) => a + b, 0);
  const opts = poll[1]
    .map((o, k) => {
      const pct = Math.round(((votes[k] ?? 0) / total) * 100);
      return `<span class="popt"><span class="pbar" style="width:${pct}%"></span><span class="plabel">${esc(o)}</span><span class="ppct">${pct}%</span></span>`;
    })
    .join('');
  return {
    kind: 'poll', user: u[0], userColor: u[1], text: poll[0],
    html:
      `<div class="bubble poll-bubble"><span class="ptitle">${esc(poll[0])}</span>${opts}` +
      `<span class="pcount">${total} votes</span></div>`,
  };
}
 
/**
 * Text-only generation path for search predicates: consumes the PRNG stream
 * exactly like `messageMeta` up to the point the text is determined, but
 * skips all HTML construction (bubble markup, waveform bars, syntax
 * highlighting) — an order of magnitude cheaper per scanned item.
 */
export function messageText(i: number): string {
  if (i % 197 === 0) return sysDateText(i);
  const r = rng((i * 2654435761) % 2147483647);
  pick(USERS, r);
  const t = r();
  if (t < 0.6) {
    let quoteText = '';
    if (r() < 0.14) {
      const q = pick(LINES, r);
      quoteText = `${pick(USERS, r)[0]}: ${q.slice(0, 40)}${q.length > 40 ? '…' : ''}`;
    }
    const text = makeText(r);
    return quoteText ? `${quoteText} ${text}` : text;
  }
  if (t < 0.69) {
    if (r() < 0.35) return makeText(r);
    return '';
  }
  if (t < 0.72) return '';
  if (t < 0.78) return `Voice message ${(2 + r() * 40) | 0}s`;
  if (t < 0.83) return pick(SNIPPETS, r);
  if (t < 0.87) return pick(FILES, r)[0];
  if (t < 0.9) {
    const l = pick(LINKS, r);
    return `${l[0]} ${l[2]}`;
  }
  if (t < 0.94) return pick(VIDEOS, r)[1];
  if (t < 0.965) {
    const p = pick(PLACES, r);
    return `${p[0]} ${p[1]}`;
  }
  if (t < 0.985) return pick(USERS, r)[0];
  return pick(POLLS, r)[0];
}

/**
 * Cheap metadata for filter predicates: derives kind and sender from the same
 * PRNG stream as `messageMeta` without building any message text or HTML.
 */
export function messageBrief(i: number): { kind: MessageKind; user: string } {
  if (i % 197 === 0) return { kind: 'sys', user: '' };
  const r = rng((i * 2654435761) % 2147483647);
  const u = pick(USERS, r);
  const t = r();
  const kind: MessageKind =
    t < 0.6
      ? 'text'
      : t < 0.69
        ? 'img'
        : t < 0.72
          ? 'sticker'
          : t < 0.78
            ? 'voice'
          : t < 0.83
            ? 'code'
            : t < 0.87
              ? 'file'
              : t < 0.9
                ? 'link'
                : t < 0.94
                  ? 'video'
                  : t < 0.965
                    ? 'location'
                    : t < 0.985
                      ? 'contact'
                      : 'poll';
  return { kind, user: u[0] };
}
 
export function renderChatMessage(i: number): string {
  const m = messageMeta(i);
  if (m.kind === 'sys') {
    return `<div class="hs-item sysrow" data-i="${i}"><span class="sys">${m.text}</span></div>`;
  }
  const me = m.user === 'Me';
  const login = AVATAR_BY_USER.get(m.user) ?? 'octocat';
  return (
    `<div class="hs-item row" data-i="${i}"><div class="msg${me ? ' me' : ''}">` +
    `<img class="avatar" src="https://avatars.githubusercontent.com/${login}?size=80" alt="${m.user}" loading="lazy" style="background:${m.userColor}"/>` +
    `<div class="body"><div class="name">${m.user} <span class="idx">#${i.toLocaleString()}</span></div>${m.html}</div>` +
    `</div></div>`
  );
}
 
export const USER_NAMES: readonly string[] = USERS.map((u) => u[0]);
 
export function createChatSource(count: number): DataSource {
  return { count, renderToString: renderChatMessage };
}
