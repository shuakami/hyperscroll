/**
 * Real audio playback for voice bubbles: synthesizes a deterministic
 * speech-like waveform (glottal pulse train through formant filters) per
 * message seed with the Web Audio API. No audio assets, works offline.
 */
 
let ctx: AudioContext | null = null;
let current: { stop: () => void; el: HTMLElement } | null = null;
 
function audioCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}
 
function mulberry(seed: number): () => number {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
 
export function stopVoice(): void {
  if (current) {
    current.stop();
    current.el.classList.remove('playing');
    current = null;
  }
}
 
export function toggleVoice(el: HTMLElement): void {
  if (current?.el === el) {
    stopVoice();
    return;
  }
  stopVoice();
 
  const sec = Math.min(Number(el.dataset['sec']) || 3, 60);
  const seed = Number(el.dataset['seed']) || 1;
  const ac = audioCtx();
  void ac.resume();
  const rand = mulberry(seed);
  const t0 = ac.currentTime + 0.05;
 
  const master = ac.createGain();
  master.gain.value = 0.5;
  master.connect(ac.destination);
 
  // Speaker voice: base pitch per seed, syllables as pitch+amplitude bursts.
  const basePitch = 95 + rand() * 90;
  const src = ac.createOscillator();
  src.type = 'sawtooth';
  const amp = ac.createGain();
  amp.gain.value = 0;
 
  // Two formant bandpass filters give it a vowel-ish timbre.
  const f1 = ac.createBiquadFilter();
  f1.type = 'bandpass';
  f1.Q.value = 6;
  const f2 = ac.createBiquadFilter();
  f2.type = 'bandpass';
  f2.Q.value = 8;
  src.connect(amp);
  amp.connect(f1);
  amp.connect(f2);
  f1.connect(master);
  f2.connect(master);
 
  let t = t0;
  const end = t0 + sec;
  while (t < end) {
    const syl = 0.09 + rand() * 0.18;
    const pause = rand() < 0.18 ? 0.12 + rand() * 0.25 : 0.02 + rand() * 0.05;
    const pitch = basePitch * (0.92 + rand() * 0.25);
    const vowelF1 = 300 + rand() * 500;
    const vowelF2 = 900 + rand() * 1500;
    src.frequency.setValueAtTime(pitch, t);
    src.frequency.linearRampToValueAtTime(pitch * (0.95 + rand() * 0.12), t + syl);
    f1.frequency.setValueAtTime(vowelF1, t);
    f2.frequency.setValueAtTime(vowelF2, t);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(0.6 + rand() * 0.3, t + 0.02);
    amp.gain.setValueAtTime(0.5 + rand() * 0.3, t + syl - 0.03);
    amp.gain.linearRampToValueAtTime(0, t + syl);
    t += syl + pause;
  }
 
  src.start(t0);
  src.stop(end + 0.1);
 
  const timer = window.setTimeout(() => {
    if (current?.el === el) stopVoice();
  }, (end - ac.currentTime) * 1000 + 150);
 
  el.classList.add('playing');
  current = {
    el,
    stop: () => {
      window.clearTimeout(timer);
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      master.disconnect();
    },
  };
}
