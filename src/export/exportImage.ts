import { toJpeg } from 'html-to-image';
import type { Player, MatchConfig, Lineup } from '../domain/types';

const JPEG_OPTIONS = {
  width: 1080,
  height: 1350,
  pixelRatio: 1,
  quality: 0.92,
  cacheBust: true,
};

export interface FormationExportData {
  roster: Player[];
  matchConfig: MatchConfig;
  lineup: Lineup;
  numberOverrides?: Record<string, number>;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function renderFormationViaServer(data: FormationExportData): Promise<string> {
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const blob = await res.blob();
  return blobToDataUrl(blob);
}

function triggerDownload(dataUrl: string, filename: string): void {
  if (isIOS()) {
    // iOS Safari non supporta <a download>: apriamo in nuova scheda
    // per permettere salvataggio manuale (tieni premuto → salva immagine)
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(
        `<html><head><title>${filename}</title></head>` +
        `<body style="margin:0;background:#000">` +
        `<img src="${dataUrl}" style="width:100%;display:block">` +
        `</body></html>`
      );
    }
    return;
  }
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function exportAsPng(
  element: HTMLElement,
  filename = 'formazione.jpg',
  _serverData?: FormationExportData, // non più usato: usiamo sempre html-to-image
): Promise<void> {
  const jpeg = await toJpeg(element, JPEG_OPTIONS);
  triggerDownload(jpeg, filename);
}

async function inlineImages(element: HTMLElement): Promise<string> {
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
  const html = await inlineImages(sheetElement);
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
  serverData?: FormationExportData,
): Promise<string> {
  // Se l'elemento è disponibile usa sempre html-to-image (output identico al PC)
  if (element) return toJpeg(element, JPEG_OPTIONS);
  // Fallback server solo quando il ref è null (es. Facebook su mobile con modal chiuso)
  if (serverData) return renderFormationViaServer(serverData);
  throw new Error('Elemento poster non disponibile');
}
