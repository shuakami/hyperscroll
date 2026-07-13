/**
 * Graceful fallbacks for media that fails to load inside the message stream.
 * The engine injects raw HTML strings, so a delegated capture-phase `error`
 * listener swaps broken <img> elements for styled placeholders (coss ui /
 * Base UI empty-state look) instead of the browser's broken-image glyph.
 */

const ICON_IMAGE_OFF =
  '<line x1="2" y1="2" x2="22" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/>' +
  '<line x1="13.5" y1="13.5" x2="6" y2="21"/><line x1="18" y1="12" x2="21" y2="15"/>' +
  '<path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/>' +
  '<path d="M21 15V5a2 2 0 0 0-2-2H9"/>';
const ICON_VIDEO_OFF =
  '<path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l5.248-3.062A.5.5 0 0 1 22 7.87v8.196"/>' +
  '<path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"/><line x1="2" y1="2" x2="22" y2="22"/>';
const ICON_MAP_OFF =
  '<path d="M12.75 7.09a3 3 0 0 1 2.16 2.16"/>' +
  '<path d="M17.072 17.072c-1.634 2.17-3.527 3.912-4.471 4.727a1 1 0 0 1-1.202 0C9.539 20.193 5 15.993 5 10a7 7 0 0 1 1.056-3.697"/>' +
  '<path d="m2 2 20 20"/><path d="M8.475 2.818A7 7 0 0 1 19 10c0 1.183-.177 2.282-.456 3.294"/>' +
  '<path d="M9.13 9.13a3 3 0 0 0 3.74 3.74"/>';

type FallbackKind = 'image' | 'video' | 'map' | 'sticker';

const KIND_ICON: Record<FallbackKind, string> = {
  image: ICON_IMAGE_OFF,
  video: ICON_VIDEO_OFF,
  map: ICON_MAP_OFF,
  sticker: ICON_IMAGE_OFF,
};

const KIND_TEXT: Record<FallbackKind, string> = {
  image: 'Image unavailable',
  video: 'Video unavailable',
  map: 'Map unavailable',
  sticker: '',
};

function buildFallback(kind: FallbackKind, img: HTMLImageElement): HTMLElement {
  const el = document.createElement('div');
  el.className = `media-fallback mf-${kind}`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', KIND_TEXT[kind] || 'Sticker unavailable');
  const w = img.getAttribute('width');
  const h = img.getAttribute('height');
  if (w) el.style.width = `${w}px`;
  if (h) el.style.height = `${h}px`;
  const icon = document.createElement('span');
  icon.className = 'mf-icon';
  icon.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${KIND_ICON[kind]}</svg>`;
  el.appendChild(icon);
  const text = KIND_TEXT[kind];
  if (text) {
    const label = document.createElement('span');
    label.className = 'mf-text';
    label.textContent = text;
    el.appendChild(label);
  }
  return el;
}

function buildAvatarFallback(img: HTMLImageElement, className: string): HTMLElement {
  const el = document.createElement('span');
  el.className = `${className} avatar-fallback`;
  if (img.style.background) el.style.background = img.style.background;
  el.textContent = (img.alt.trim().charAt(0) || '?').toUpperCase();
  el.setAttribute('aria-label', img.alt);
  return el;
}

function replaceBrokenImage(img: HTMLImageElement): void {
  if (img.classList.contains('avatar')) {
    img.replaceWith(buildAvatarFallback(img, 'avatar'));
    return;
  }
  if (img.classList.contains('cavatar')) {
    img.replaceWith(buildAvatarFallback(img, 'cavatar'));
    return;
  }
  if (img.classList.contains('sticker')) {
    img.replaceWith(buildFallback('sticker', img));
    return;
  }
  if (!img.classList.contains('img')) return;
  const bubble = img.closest('.bubble');
  const kind: FallbackKind = bubble?.classList.contains('video-bubble')
    ? 'video'
    : bubble?.classList.contains('loc-bubble')
      ? 'map'
      : 'image';
  bubble?.classList.add('media-broken');
  img.replaceWith(buildFallback(kind, img));
}

/**
 * Attach the delegated fallback handler to a message viewport. Returns a
 * cleanup function. `error` events do not bubble, so the listener runs in
 * the capture phase to observe failures on any descendant image.
 */
export function installMediaFallback(root: HTMLElement): () => void {
  const onError = (e: Event): void => {
    const t = e.target;
    if (t instanceof HTMLImageElement) replaceBrokenImage(t);
  };
  root.addEventListener('error', onError, true);
  return () => root.removeEventListener('error', onError, true);
}
