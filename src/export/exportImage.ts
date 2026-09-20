import { toPng } from 'html-to-image';

const PNG_OPTIONS = {
  width: 1080,
  height: 1350,
  pixelRatio: 1,
  quality: 1,
  cacheBust: true,
};

/**
 * Su iOS Safari, html-to-image non carica correttamente i font nel contesto
 * SVG foreignObject al primo render. Il doppio-pass è il workaround ufficiale:
 * la prima chiamata inizializza font e risorse esterne, la seconda produce
 * l'immagine corretta.
 */
async function renderToPng(element: HTMLElement): Promise<string> {
  await document.fonts.ready;
  await toPng(element, PNG_OPTIONS).catch(() => {/* primo pass: ignora errori */});
  return toPng(element, PNG_OPTIONS);
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export async function exportAsPng(element: HTMLElement, filename = 'formazione-ufficiale.png'): Promise<void> {
  const png = await renderToPng(element);
  if (isIOS()) {
    // iOS Safari non supporta il download tramite <a download> — apre l'immagine
    // in una nuova scheda così l'utente può salvarla con "Tieni premuto → Salva immagine"
    const w = window.open();
    if (w) {
      w.document.write(`<img src="${png}" style="max-width:100%" />`);
      w.document.title = filename;
    }
    return;
  }
  const link = document.createElement('a');
  link.download = filename;
  link.href = png;
  link.click();
}

export async function exportAsBase64(element: HTMLElement): Promise<string> {
  return renderToPng(element);
}
