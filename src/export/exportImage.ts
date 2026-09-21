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
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function exportAsPng(
  element: HTMLElement,
  filename = 'formazione.jpg',
  serverData?: FormationExportData,
): Promise<void> {
  if (isIOS() && serverData) {
    const dataUrl = await renderFormationViaServer(serverData);
    triggerDownload(dataUrl, filename);
    return;
  }
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
  element: HTMLElement,
  serverData?: FormationExportData,
): Promise<string> {
  if (isIOS() && serverData) {
    return renderFormationViaServer(serverData);
  }
  return toJpeg(element, JPEG_OPTIONS);
}
