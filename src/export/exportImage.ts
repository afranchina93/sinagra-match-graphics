import { toPng } from 'html-to-image';

const PNG_OPTIONS = {
  width: 1080,
  height: 1350,
  pixelRatio: 1,
  quality: 1,
  cacheBust: true,
};

/**
 * Pre-converte tutte le <img> nel data URL corrispondente.
 * Su iOS, html-to-image non riesce a fare fetch delle immagini durante
 * la cattura del canvas — inlinarle prima risolve il problema.
 * Restituisce una funzione per ripristinare i src originali.
 */
async function inlineImages(element: HTMLElement): Promise<() => void> {
  const imgs = Array.from(element.querySelectorAll<HTMLImageElement>('img'));
  const originals = new Map<HTMLImageElement, string>();

  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      originals.set(img, src);
      img.src = dataUrl;
    } catch {
      // se il fetch fallisce, lascia l'immagine com'è
    }
  }));

  return () => {
    originals.forEach((src, img) => { img.src = src; });
  };
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
