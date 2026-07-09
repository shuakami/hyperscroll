'use client';

import { DownloadIcon, XIcon } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';

export interface MediaItem {
  type: 'image' | 'video';
  src: string;
  name: string;
}

export async function downloadUrl(src: string, name: string): Promise<void> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(src, '_blank', 'noreferrer');
  }
}

export function MediaPreview({
  item,
  onClose,
}: {
  item: MediaItem | null;
  onClose: () => void;
}): React.ReactElement | null {
  const [current, setCurrent] = React.useState<MediaItem | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (item) {
      setCurrent(item);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setCurrent(null), 240);
    return () => clearTimeout(t);
  }, [item]);

  React.useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, onClose]);

  if (!current) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal
      aria-label={current.name}
    >
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 bg-black/72 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Download"
          className="text-white hover:bg-white/12 hover:text-white"
          onClick={() => void downloadUrl(current.src, current.name)}
        >
          <DownloadIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          className="text-white hover:bg-white/12 hover:text-white"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>
      <figure
        className="pointer-events-none relative z-[5] flex max-h-[86vh] max-w-[90vw] flex-col items-center gap-3"
        style={{
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(10px)',
          opacity: visible ? 1 : 0,
          transition:
            'transform 480ms cubic-bezier(0.34, 1.28, 0.5, 1), opacity 220ms ease',
        }}
      >
        {current.type === 'video' ? (
          <div className="pointer-events-auto relative overflow-hidden rounded-xl">
            <img
              src={current.src}
              alt={current.name}
              className="max-h-[78vh] max-w-[90vw] object-contain"
              draggable={false}
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-black/56 backdrop-blur-sm">
                <span
                  className="ml-1"
                  style={{
                    borderTop: '9px solid transparent',
                    borderBottom: '9px solid transparent',
                    borderLeft: '14px solid white',
                  }}
                />
              </span>
            </span>
          </div>
        ) : (
          <img
            src={current.src}
            alt={current.name}
            className="pointer-events-auto max-h-[78vh] max-w-[90vw] rounded-xl object-contain"
            draggable={false}
          />
        )}
        <figcaption className="text-[13px] text-white/72">{current.name}</figcaption>
      </figure>
    </div>
  );
}
