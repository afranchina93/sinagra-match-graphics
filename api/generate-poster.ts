import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

/**
 * POST /api/generate-poster
 * Body: { html: string, baseUrl: string }
 *
 * Riceve l'outerHTML del poster e il baseUrl dell'app,
 * renderizza con Puppeteer (headless Chrome) e restituisce il PNG.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { html, baseUrl } = req.body as { html: string; baseUrl: string };
  if (!html || !baseUrl) return res.status(400).json({ error: 'missing html or baseUrl' });

  // I path assoluti (es. /assets/poster/background.webp) non si risolvono
  // quando il documento viene caricato con setContent() (nessuna origine).
  // Sostituiamo tutti i src="/..." e href="/..." con l'URL completo.
  const resolvedHtml = html.replace(/(src|href)="\/((?!\/)[^"]*)/g, `$1="${baseUrl}/$2`);

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 1080px; height: 1350px; overflow: hidden; }
  </style>
</head>
<body>${resolvedHtml}</body>
</html>`;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1080, height: 1350, deviceScaleFactor: 1 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30000 });

    // Screenshot dell'elemento radice del poster (primo figlio di body)
    const element = await page.$('body > div');
    if (!element) throw new Error('poster element not found');

    const screenshot = await element.screenshot({ type: 'png' });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="poster.png"');
    res.send(screenshot);
  } finally {
    await browser.close();
  }
}
