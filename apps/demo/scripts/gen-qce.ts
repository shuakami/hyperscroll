/**
 * Generates a QCE-format chunked dataset (`window.__QCE_MANIFEST__` /
 * `window.__QCE_CHUNK__` JSONP files) into public/qce-demo/, so the viewer
 * page exercises the exact loading protocol of a real chunked export.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { messageBrief, messageMeta, messageText, renderChatMessage } from '../src/chat-source.js';
import { BloomFilter } from '../src/qce/bloom.js';

const TOTAL = 50_000;
const PER_CHUNK = 2_000;
const TEXT_BITS = 16_384;
const TEXT_HASHES = 6;
const SENDER_BITS = 2_048;
const SENDER_HASHES = 4;

const outDir = resolve(import.meta.dirname, '../public/qce-demo/data');
mkdirSync(resolve(outDir, 'chunks'), { recursive: true });

function tsOf(i: number): number {
  const day = Math.floor(i / 197);
  return Date.UTC(2016, 0, 1 + day) + (i % 197) * 7 * 60_000;
}
function dateKeyOf(i: number): string {
  return new Date(tsOf(i)).toISOString().slice(0, 10);
}

interface ChunkMeta {
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

const chunksMeta: ChunkMeta[] = [];
const senderCounts = new Map<string, number>();

// Rare messages that exist in only a couple of chunks, so a Bloom-prefiltered
// search visibly skips most chunk loads.
const RARE: ReadonlyArray<readonly [number, string]> = [
  [3_141, 'Filed the postmortem for the chunk eviction incident, tagging everyone.'],
  [17_777, 'The postmortem doc is updated with the Bloom false-positive numbers.'],
  [8_808, 'Kagoshima meetup photos are in the shared album now.'],
  [41_204, 'Reserved the venue for the Kagoshima meetup, see you there.'],
  [26_500, 'zstd dictionary training cut the chunk size by 38 percent.'],
];
const rareByIndex = new Map(RARE.map(([i, t]) => [i, t]));
function esc2(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

for (let c = 0; c * PER_CHUNK < TOTAL; c++) {
  const start = c * PER_CHUNK;
  const end = Math.min(start + PER_CHUNK, TOTAL);
  const id = `c${String(c + 1).padStart(6, '0')}`;
  const textBloom = new BloomFilter(TEXT_BITS, TEXT_HASHES);
  const senderBloom = new BloomFilter(SENDER_BITS, SENDER_HASHES);
  const records: string[] = [];
  for (let i = start; i < end; i++) {
    const meta = messageMeta(i);
    const brief = messageBrief(i);
    const rare = rareByIndex.get(i);
    let text = messageText(i);
    let html = renderChatMessage(i);
    if (rare !== undefined && brief.kind !== 'sys') {
      html = html.replace(
        /<div class="bubble.*<\/div><\/div><\/div>$/,
        `<div class="bubble">${esc2(rare)}</div></div></div></div>`,
      );
      text = rare;
      meta.kind = 'text';
    }
    const nameLower = brief.user.toLowerCase();
    if (brief.user) {
      senderCounts.set(brief.user, (senderCounts.get(brief.user) ?? 0) + 1);
      senderBloom.addText(nameLower);
    }
    textBloom.addText(`${text.toLowerCase()} ${nameLower}`);
    records.push(
      JSON.stringify({
        id: `msg-${i}`,
        ts: tsOf(i),
        date: dateKeyOf(i),
        uid: brief.user,
        name: brief.user,
        nameLower,
        text,
        kind: meta.kind,
        html,
      }),
    );
  }
  const body = `window.__QCE_CHUNK__ && window.__QCE_CHUNK__({id:${JSON.stringify(id)},messages:[\n${records.join(',\n')}\n]});\n`;
  writeFileSync(resolve(outDir, 'chunks', `${id}.js`), body);
  chunksMeta.push({
    id,
    file: `data/chunks/${id}.js`,
    count: end - start,
    startTs: tsOf(start),
    endTs: tsOf(end - 1),
    startDate: dateKeyOf(start),
    endDate: dateKeyOf(end - 1),
    firstMsgId: `msg-${start}`,
    lastMsgId: `msg-${end - 1}`,
    textBloom: textBloom.toBase64(),
    senderBloom: senderBloom.toBase64(),
    bytes: body.length,
  });
}

const manifest = {
  format: 'qce-modern-html-chunked',
  version: 1,
  exportTime: new Date().toISOString(),
  chat: { name: 'HyperScroll dev group', type: 'group' },
  stats: {
    totalMessages: TOTAL,
    minDateKey: dateKeyOf(0),
    maxDateKey: dateKeyOf(TOTAL - 1),
  },
  chunking: { maxMessagesPerChunk: PER_CHUNK },
  bloom: {
    textBits: TEXT_BITS,
    textHashes: TEXT_HASHES,
    senderBits: SENDER_BITS,
    senderHashes: SENDER_HASHES,
  },
  senders: [...senderCounts.entries()].map(([name, count]) => ({
    uid: name,
    displayName: name,
    count,
  })),
  chunks: chunksMeta,
};

writeFileSync(
  resolve(outDir, 'manifest.js'),
  `window.__QCE_MANIFEST__ && window.__QCE_MANIFEST__(${JSON.stringify(manifest)});\n`,
);

console.log(`qce-demo: ${TOTAL} messages, ${chunksMeta.length} chunks -> ${outDir}`);
