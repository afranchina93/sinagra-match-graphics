import { toPng } from 'html-to-image';

const PNG_OPTIONS = {
  width: 1080,
  height: 1350,
  pixelRatio: 1,
  quality: 1,
  cacheBust: true,
};

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Genera il PNG lato server tramite Puppeteer.
 * Usato su iOS dove html-to-image non riesce a catturare le immagini.
 */
async function renderToPngViaServer(element: HTMLElement): Promise<Blob> {
  const res = await fetch('/api/generate-poster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html: element.outerHTML,
      baseUrl: window.location.origin,
    }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.blob();
}

export async function exportAsPng(element: HTMLElement, filename = 'formazione-ufficiale.png'): Promise<void> {
  if (isIOS()) {
    const blob = await renderToPngViaServer(element);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const png = await toPng(element, PNG_OPTIONS);
  const link = document.createElement('a');
  link.download = filename;
  link.href = png;
  link.click();
}

export async function exportAsBase64(element: HTMLElement): Promise<string> {
  if (isIOS()) {
    const blob = await renderToPngViaServer(element);
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return toPng(element, PNG_OPTIONS);
}
