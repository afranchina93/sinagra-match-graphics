import { toJpeg } from 'html-to-image';

const JPEG_OPTIONS = {
  width: 1080,
  height: 1350,
  pixelRatio: 1,
  quality: 0.92,
  cacheBust: false, // disabilitato: usiamo pre-inline manuale
};

export interface FormationExportData {
  roster: never[];
  matchConfig: never;
  lineup: never;
  numberOverrides?: Record<string, number>;
}

export type PosterExportData = FormationExportData;

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Sostituisce temporaneamente tutti gli src delle <img> con data URL base64,
 * per evitare che html-to-image ri-fetchi le immagini (cosa che su iOS Safari
 * taint la canvas anche per immagini same-origin).
 * Restituisce una funzione che ripristina gli src originali.
 */
async function preinlineImages(element: HTMLElement): Promise<() => void> {
  const imgs = Array.from(element.querySelectorAll('img')) as HTMLImageElement[];
  const originals = new Map<HTMLImageElement, string>();

  await Promise.allSettled(imgs.map(async (img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;
    try {
      const res = await fetch(src, { mode: 'cors', credentials: 'same-origin' });
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      originals.set(img, src);
      img.setAttribute('src', dataUrl);
      // Aspetta che il browser decodifichi la nuova src prima di procedere
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }
    } catch {
      // lascia src originale se il fetch fallisce
    }
  }));

  return () => {
    for (const [img, src] of originals) {
      img.setAttribute('src', src);
    }
  };
}

function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function exportAsPng(
  element: HTMLElement | null,
  filename = 'formazione.jpg',
): Promise<void> {
  if (!element) throw new Error('Elemento poster non disponibile');
  const restore = await preinlineImages(element);
  try {
    const jpeg = await toJpeg(element, JPEG_OPTIONS);
    triggerDownload(jpeg, filename);
  } finally {
    restore();
  }
}

async function inlineImagesForPdf(element: HTMLElement): Promise<string> {
  const clone = element.cloneNode(true) as HTMLElement;
  const imgs = Array.from(clone.querySelectorAll('img'));
  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      img.setAttribute('src', await blobToDataUrl(blob));
    } catch {
      // lascia src originale se il fetch fallisce
    }
  }));
  return clone.outerHTML;
}

export async function exportAsDistintaPdf(
  sheetElement: HTMLElement,
  filename = 'distinta.pdf',
): Promise<void> {
  const html = await inlineImagesForPdf(sheetElement);
  const res = await fetch('/api/generate-distinta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

export async function exportAsBase64(
  element: HTMLElement | null,
): Promise<string> {
  if (!element) throw new Error('Elemento poster non disponibile');
  const restore = await preinlineImages(element);
  try {
    return await toJpeg(element, JPEG_OPTIONS);
  } finally {
    restore();
  }
}
