/**
 * POST /api/generate-distinta
 * Body: { html: string }
 *
 * Riceve l'outerHTML del DistintaSheet già renderizzato dal frontend,
 * lo wrappa in una pagina HTML completa e genera un PDF A4 via Puppeteer.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { html } = req.body as { html?: string };
  if (!html) {
    res.status(400).json({ error: 'html required' });
    return;
  }

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; }
  </style>
</head>
<body>${html}</body>
</html>`;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(CHROMIUM_URL),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="distinta.pdf"');
    res.send(Buffer.from(pdf));
  } finally {
    await browser.close();
  }
}
