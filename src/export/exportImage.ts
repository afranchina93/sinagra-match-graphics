import { toPng } from 'html-to-image';

const PNG_OPTIONS = {
  width: 1080,
  height: 1350,
  pixelRatio: 1,
  quality: 1,
  cacheBust: true,
};

export async function exportAsPng(element: HTMLElement, filename = 'formazione-ufficiale.png'): Promise<void> {
  const png = await toPng(element, PNG_OPTIONS);
  const link = document.createElement('a');
  link.download = filename;
  link.href = png;
  link.click();
}

export async function exportAsBase64(element: HTMLElement): Promise<string> {
  return toPng(element, PNG_OPTIONS);
}
