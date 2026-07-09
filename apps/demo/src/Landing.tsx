import { useEffect, useRef, useState } from 'react';
import { GrainGradient } from '@paper-design/shaders-react';
import { HyperScroll } from '@hyperscroll/core';
import App from './App';
import { createChatSource } from './chat-source.js';

/** Live engine preview embedded in the hero — the real thing, not a mock. */
function HeroPreview(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const engine = new HyperScroll(el, {
      dataSource: createChatSource(30_000_000),
    });
    engine.scrollToIndex(14_999_990);
    return () => engine.destroy();
  }, []);
  return (
    <div
      ref={ref}
      className="hero-preview h-full"
      style={{
        maskImage:
          'linear-gradient(to bottom, transparent, black 14%, black 86%, transparent)',
      }}
    />
  );
}

/** Live FPS meter: counts real frames each second, so it tracks your scrolling. */
function FpsTicker(): React.ReactElement {
  const [value, setValue] = useState(60);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let ema = 60;
    let lastShown = 0;
    let lastInput = 0;
    const onInput = (): void => {
      lastInput = performance.now();
    };
    const step = (now: number): void => {
      const dt = now - last;
      last = now;
      // Gaps over 250ms are scheduler pauses (tab switch, screenshot), not jank.
      if (dt > 1 && dt < 250) {
        if (now - lastInput < 1000) {
          ema += (1000 / dt - ema) * 0.08;
        } else {
          // Idle: damp back down to the resting 60.
          ema += (60 - ema) * (1 - Math.exp(-dt / 350));
        }
        // Hysteresis: re-render only on moves of >=2 fps so the digits
        // don't flicker between adjacent values while scrolling.
        const shown = Math.round(ema);
        if (Math.abs(shown - lastShown) >= 2) {
          lastShown = shown;
          setValue(shown);
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    window.addEventListener('wheel', onInput, { passive: true });
    window.addEventListener('touchmove', onInput, { passive: true });
    window.addEventListener('scroll', onInput, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', onInput);
      window.removeEventListener('touchmove', onInput);
      window.removeEventListener('scroll', onInput, { capture: true });
    };
  }, []);
  return <span className="text-muted-foreground tabular-nums">{value} FPS</span>;
}

export default function Landing(): React.ReactElement {
  const [shaders, setShaders] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoVisible, setDemoVisible] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setShaders(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.body.style.overflow = demoOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [demoOpen]);

  const openDemo = (): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDemoOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setDemoVisible(true)));
  };

  const closeDemo = (): void => {
    setDemoVisible(false);
    closeTimer.current = setTimeout(() => setDemoOpen(false), 600);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <main className="flex-1 px-4 pt-4">
        <section className="relative mx-auto flex h-[calc(100dvh-2rem)] max-h-[960px] min-h-[600px] w-full max-w-[1400px] overflow-hidden rounded-2xl border border-border">
          {shaders ? (
            <GrainGradient
              className="absolute inset-0"
              colors={['#e8e8e8', '#c4c4c4', '#9a9a9a20']}
              colorBack="#00000000"
              softness={1}
              intensity={0.9}
              noise={0.5}
              speed={1}
              shape="corners"
              minPixelRatio={1}
              maxPixelCount={1920 * 1080}
            />
          ) : null}
          <div className="z-[2] flex size-full flex-col p-6 md:p-12">
            <nav className="flex items-center gap-4 text-sm">
              <span className="font-semibold tracking-tight">
                HyperScroll <span className="font-normal text-muted-foreground">@hyperscroll/core</span>
              </span>
              <span className="ml-auto flex items-center gap-4 text-muted-foreground">
                <a href="./docs.html" className="hover:text-foreground">Docs</a>
                <a href="./benchmark.html" className="hover:text-foreground">Benchmark</a>
              </span>
            </nav>
            <div className="grid min-h-0 flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              <div>
                <p className="w-fit rounded-full border border-foreground/20 px-3 py-1.5 font-medium text-foreground/70 text-xs">
                  the virtualization engine for unbounded chat history.
                </p>
                <h1 className="my-8 font-medium text-4xl leading-tighter tracking-tight xl:text-5xl">
                  Scroll thirty million
                  <br />
                  messages, at <FpsTicker />.
                </h1>
                <p className="mb-8 max-w-md text-muted-foreground text-sm leading-6">
                  Zero-dependency, anchor-positioned, constant-memory. The list on the
                  right is the real engine — scroll it.
                </p>
                <div className="flex w-fit flex-row flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={openDemo}
                    className="inline-flex justify-center rounded-full bg-foreground px-5 py-3 font-medium text-background text-sm tracking-tight transition-colors hover:bg-foreground/85"
                  >
                    Open demo
                  </button>
                  <a
                    href="./docs.html"
                    className="inline-flex justify-center rounded-full border border-border bg-background px-5 py-3 font-medium text-sm tracking-tight transition-colors hover:bg-muted/50"
                  >
                    Read the docs
                  </a>
                </div>
              </div>
              <div className="hidden h-[72%] min-h-[380px] lg:block">
                <HeroPreview />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1400px] px-2 py-16 md:px-8 lg:py-24">
          <p className="font-light text-2xl leading-snug tracking-tight md:text-3xl xl:text-4xl">
            HyperScroll is a <span className="font-medium">zero-dependency</span> virtualization
            engine for <span className="font-medium">dynamic-height</span> content — chat logs, IM
            exports, log streams. It holds no item state, asks a{' '}
            <span className="font-medium">data source</span> for HTML on demand, and renders
            datasets no offset-based virtualizer can reach.
          </p>
        </div>
      </main>

      <footer className="mt-20 overflow-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-6 md:px-12">
          <div className="flex flex-col justify-between gap-10 border-border border-t py-12 md:flex-row">
            <div className="flex flex-col gap-2 text-sm">
              <span className="font-semibold tracking-tight">HyperScroll</span>
              <span className="text-muted-foreground text-xs">Virtualization without a height ceiling.</span>
              <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-muted-foreground text-xs">
                © {new Date().getFullYear()}
                <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 fill-current">
                  <path d="M8.75.75V2h.985c.304 0 .603.08.867.231l1.29.736c.038.022.08.033.124.033h2.234a.75.75 0 0 1 0 1.5h-.427l2.111 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.006.005-.01.01-.045.04c-.21.176-.441.327-.686.45C14.556 10.78 13.88 11 13 11a4.5 4.5 0 0 1-2.023-.454 3.5 3.5 0 0 1-.686-.45l-.045-.04-.016-.015-.006-.006-.004-.004v-.001a.75.75 0 0 1-.154-.838L12.178 4.5h-.162c-.305 0-.604-.079-.868-.231l-1.29-.736a.245.245 0 0 0-.124-.033H8.75V13h2.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5h2.5V3.5h-.984a.245.245 0 0 0-.124.033l-1.289.737c-.265.15-.564.23-.869.23h-.162l2.112 4.692a.75.75 0 0 1-.154.838l-.53-.53.529.531-.001.002-.002.002-.006.006-.016.015-.045.04c-.21.176-.441.327-.686.45C4.556 10.78 3.88 11 3 11a4.5 4.5 0 0 1-2.023-.454 3.5 3.5 0 0 1-.686-.45l-.045-.04-.016-.015-.006-.006-.004-.004v-.001a.75.75 0 0 1-.154-.838L2.178 4.5H1.75a.75.75 0 0 1 0-1.5h2.234a.25.25 0 0 0 .125-.033l1.288-.737c.265-.15.564-.23.869-.23h.984V.75a.75.75 0 0 1 1.5 0Zm2.945 8.477c.285.135.718.273 1.305.273s1.02-.138 1.305-.273L13 6.327Zm-10 0c.285.135.718.273 1.305.273s1.02-.138 1.305-.273L3 6.327Z" />
                </svg>
                MIT License
              </span>
            </div>
            <div className="flex flex-wrap gap-10 text-sm md:gap-16">
              <div className="flex flex-col gap-2.5">
                <span className="font-medium text-muted-foreground text-xs">Docs</span>
                <a href="./docs.html#quick-start" className="w-fit text-muted-foreground hover:text-foreground">Quick start</a>
                <a href="./docs.html#anchor-model" className="w-fit text-muted-foreground hover:text-foreground">Anchor model</a>
                <a href="./docs.html#hyperscroll" className="w-fit text-muted-foreground hover:text-foreground">API reference</a>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="font-medium text-muted-foreground text-xs">Explore</span>
                <button type="button" onClick={openDemo} className="w-fit text-left text-muted-foreground hover:text-foreground">Demo</button>
                <a href="./benchmark.html" className="w-fit text-muted-foreground hover:text-foreground">Benchmark</a>
                <a href="./docs.html#searchscanner" className="w-fit text-muted-foreground hover:text-foreground">SearchScanner</a>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="font-medium text-muted-foreground text-xs">Package</span>
                <span className="font-mono text-muted-foreground text-xs">npm i @hyperscroll/core</span>
                <span className="font-mono text-muted-foreground text-xs">v0.1.0</span>
              </div>
            </div>
          </div>
          <div
            aria-hidden
            className="-mb-[0.28em] select-none bg-gradient-to-b from-foreground/[0.14] to-foreground/0 bg-clip-text text-center font-semibold text-[clamp(4rem,13vw,11.5rem)] text-transparent leading-none tracking-tighter"
          >
            HyperScroll
          </div>
        </div>
      </footer>

      {demoOpen ? (
        <div
          className="fixed inset-0 z-50 transition-opacity duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ opacity: demoVisible ? 1 : 0 }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-b from-background/60 to-background transition-[backdrop-filter] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ backdropFilter: demoVisible ? 'blur(24px)' : 'blur(0px)' }}
          />
          <div className="absolute inset-0 bg-background">
            <App onHome={closeDemo} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
