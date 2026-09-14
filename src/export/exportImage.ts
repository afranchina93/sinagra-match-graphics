import { toPng } from 'html-to-image';

export async function exportAsPng(element: HTMLElement, filename = 'formazione-ufficiale.png'): Promise<void> {
  const png = await toPng(element, {
    width: 1080,
    height: 1350,
    pixelRatio: 1,
    quality: 1,
    cacheBust: true,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = png;
  link.click();
}
