import { toPng } from 'html-to-image';

const PNG_OPTIONS = {
  width: 1080,
  height: 1350,
  pixelRatio: 1,
  quality: 1,
  cacheBust: true,
};

/**
 * Converte un URL immagine in data URL PNG via canvas.
 * Risolve due problemi iOS:
 * 1. html-to-image non riesce a fare fetch dentro SVG foreignObject
 * 2. WebP in SVG foreignObject non è supportato su alcuni iOS
 */
async function srcToPngDataURL(src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  return new Promise<string>((resolve, reject) => {
    const tmp = new Image();
    tmp.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = tmp.naturalWidth;
      canvas.height = tmp.naturalHeight;
      const ctx = canvas.getContext('2d');
      URL.revokeObjectURL(blobUrl);
      if (!ctx) { reject(new Error('no canvas ctx')); return; }
      ctx.drawImage(tmp, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    tmp.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('img load error')); };
    tmp.src = blobUrl;
  });
}

async function inlineImages(element: HTMLElement): Promise<() => void> {
  const imgs = Array.from(element.querySelectorAll<HTMLImageElement>('img'));
  const originals = new Map<HTMLImageElement, string>();

  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;
    try {
      const dataUrl = await srcToPngDataURL(src);
      originals.set(img, src);
      img.setAttribute('src', dataUrl);
      // Aspetta che il browser aggiorni il rendering
      if (!img.complete) {
        await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
      }
    } catch {
      // se fallisce, html-to-image tenterà da solo
    }
  }));

  return () => { originals.forEach((src, img) => img.setAttribute('src', src)); };
}

async function renderToPng(element: HTMLElement): Promise<string> {
  const restore = await inlineImages(element);
  try {
    return await toPng(element, PNG_OPTIONS);
  } finally {
    restore();
  }
}

export async function exportAsPng(element: HTMLElement, filename = 'formazione-ufficiale.png'): Promise<void> {
  const png = await renderToPng(element);
  const link = document.createElement('a');
  link.download = filename;
  link.href = png;
  link.click();
}

export async function exportAsBase64(element: HTMLElement): Promise<string> {
  return renderToPng(element);
}
