/**
 * Chunked message store over the QCE JSONP export format: binary-searched
 * global index -> chunk mapping, LRU-bounded chunk cache, deduplicated
 * script-injection loads, and Bloom accessors for search prefiltering.
 */
import { BloomFilter } from './bloom.js';

export interface QceRecord {
  id: string;
  ts: number;
  date: string;
  uid: string;
  name: string;
  nameLower: string;
  text: string;
  kind: string;
  html: string;
}

export interface QceChunkMeta {
  id: string;
  file: string;
  count: number;
  startTs: number;
  endTs: number;
  startDate: string;
  endDate: string;
  firstMsgId: string;
  lastMsgId: string;
  textBloom: string;
  senderBloom: string;
  bytes: number;
}

export interface QceManifest {
  format: string;
  version: number;
  exporter?: { name: string; version: string };
  exportTime: string;
  chat: { name: string; type: string };
  stats: { totalMessages: number; minDateKey: string; maxDateKey: string };
  chunking: { maxMessagesPerChunk: number };
  bloom: { textBits: number; textHashes: number; senderBits: number; senderHashes: number };
  senders: Array<{ uid: string; displayName: string; count: number }>;
  chunks: QceChunkMeta[];
}

interface QceChunkPayload {
  id: string;
  messages: QceRecord[];
}

declare global {
  interface Window {
    __QCE_MANIFEST__?: (m: QceManifest) => void;
    __QCE_CHUNK__?: (c: QceChunkPayload) => void;
  }
}

const LRU_CAPACITY = 6;

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => {
      el.remove();
      res();
    };
    el.onerror = () => {
      el.remove();
      rej(new Error(`failed to load ${src}`));
    };
    document.head.appendChild(el);
  });
}

export function loadManifest(baseUrl: string): Promise<QceManifest> {
  return new Promise((res, rej) => {
    window.__QCE_MANIFEST__ = (m) => {
      delete window.__QCE_MANIFEST__;
      res(m);
    };
    loadScript(`${baseUrl}/data/manifest.js`).catch(rej);
  });
}

export class ChunkStore {
  readonly manifest: QceManifest;
  readonly chunkStarts: number[];
  /** Called after any lazy chunk arrives, so the viewer can re-render. */
  onChunkLoaded: (() => void) | null = null;
  loadedCount = 0;

  private readonly baseUrl: string;
  private readonly cache = new Map<number, QceRecord[]>();
  private readonly pending = new Map<number, Promise<QceRecord[]>>();
  private waiter: ((c: QceChunkPayload) => void) | null = null;

  constructor(baseUrl: string, manifest: QceManifest) {
    this.baseUrl = baseUrl;
    this.manifest = manifest;
    this.chunkStarts = [];
    let acc = 0;
    for (const c of manifest.chunks) {
      this.chunkStarts.push(acc);
      acc += c.count;
    }
    window.__QCE_CHUNK__ = (c) => {
      this.waiter?.(c);
    };
  }

  chunkOf(index: number): number {
    let lo = 0;
    let hi = this.chunkStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.chunkStarts[mid]! <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /** Synchronous lookup; returns null (and schedules a load) when not cached. */
  get(index: number): QceRecord | null {
    const c = this.chunkOf(index);
    const records = this.cache.get(c);
    if (records) {
      // refresh LRU position
      this.cache.delete(c);
      this.cache.set(c, records);
      return records[index - this.chunkStarts[c]!] ?? null;
    }
    void this.load(c);
    return null;
  }

  isLoaded(chunk: number): boolean {
    return this.cache.has(chunk);
  }

  /** Loads a chunk (deduplicated), inserting into the LRU. */
  load(chunk: number): Promise<QceRecord[]> {
    const cached = this.cache.get(chunk);
    if (cached) return Promise.resolve(cached);
    const inflight = this.pending.get(chunk);
    if (inflight) return inflight;
    const meta = this.manifest.chunks[chunk]!;
    const p: Promise<QceRecord[]> = new Promise<QceRecord[]>((res, rej) => {
      const run = async (): Promise<void> => {
        // JSONP is inherently serial per callback: chain onto prior pendings.
        const prev = [...this.pending.values()].filter((x) => x !== p);
        await Promise.allSettled(prev);
        const done = new Promise<QceRecord[]>((r) => {
          this.waiter = (c) => {
            this.waiter = null;
            r(c.messages);
          };
        });
        await loadScript(`${this.baseUrl}/${meta.file}`);
        const messages = await done;
        this.cache.set(chunk, messages);
        this.loadedCount += 1;
        while (this.cache.size > LRU_CAPACITY) {
          const oldest = this.cache.keys().next().value;
          if (oldest === undefined) break;
          this.cache.delete(oldest);
        }
        this.onChunkLoaded?.();
        res(messages);
      };
      run().catch(rej);
    }).finally(() => this.pending.delete(chunk));
    this.pending.set(chunk, p);
    return p;
  }

  textBloomOf(chunk: number): BloomFilter {
    const { textBits, textHashes } = this.manifest.bloom;
    return BloomFilter.fromBase64(this.manifest.chunks[chunk]!.textBloom, textBits, textHashes);
  }

  senderBloomOf(chunk: number): BloomFilter {
    const { senderBits, senderHashes } = this.manifest.bloom;
    return BloomFilter.fromBase64(this.manifest.chunks[chunk]!.senderBloom, senderBits, senderHashes);
  }

  cacheSize(): number {
    return this.cache.size;
  }
}
