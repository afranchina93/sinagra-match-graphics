import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createCanvas, loadImage } from '@napi-rs/canvas';

/**
 * POST /api/publish-instagram
 * Body: { imageBase64: string }
 *
 * 1. Estende il poster 1080×1350 a 1080×1920 (Stories 9:16) centrando su sfondo nero
 * 2. Carica su Supabase Storage (bucket pubblico temp-posters)
 * 3. Crea un media container Instagram (STORIES)
 * 4. Polling status_code fino a FINISHED
 * 5. Pubblica la storia
 * 6. Elimina l'immagine da Supabase
 */

const STORY_W  = 1080;
const STORY_H  = 1920;
const POSTER_H = 1350;

async function extendToStory(base64Data: string): Promise<Buffer> {
  const posterBuf = Buffer.from(base64Data, 'base64');
  const posterImg = await loadImage(posterBuf);

  const canvas = createCanvas(STORY_W, STORY_H);
  const ctx = canvas.getContext('2d');

  // Sfondo nero
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  // Poster centrato verticalmente
  const yOffset = Math.round((STORY_H - POSTER_H) / 2);
  ctx.drawImage(posterImg, 0, yOffset, STORY_W, POSTER_H);

  return canvas.toBuffer('image/jpeg', 92);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64 } = req.body as { imageBase64?: string };
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const PAGE_TOKEN    = process.env.FB_PAGE_TOKEN;
  const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;
  const SUPABASE_URL  = process.env.SUPABASE_URL;
  const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY;

  if (!PAGE_TOKEN || !IG_ACCOUNT_ID || !SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Credenziali mancanti' });
  }

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  // 1. Estendi a 1080×1920
  const storyBuffer = await extendToStory(base64Data);

  const filename = `story-${Date.now()}.jpg`;

  // 2. Upload su Supabase Storage
  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/temp-posters/${filename}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
      body: storyBuffer,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return res.status(502).json({ error: 'Errore upload Supabase', detail: err });
  }

  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/temp-posters/${filename}`;

  try {
    // 3. Crea media container Instagram Stories
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          media_type: 'STORIES',
          access_token: PAGE_TOKEN,
        }),
      }
    );
    const containerData = await containerRes.json() as { id?: string; error?: { message: string } };

    if (!containerRes.ok || !containerData.id) {
      return res.status(502).json({
        error: 'Errore creazione container Instagram',
        detail: containerData.error?.message,
      });
    }

    // 4. Polling: aspetta che il container sia FINISHED prima di pubblicare
    let statusCode = 'IN_PROGRESS';
    for (let attempt = 0; attempt < 15; attempt++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(
        `https://graph.facebook.com/v21.0/${containerData.id}?fields=status_code&access_token=${PAGE_TOKEN}`
      );
      const statusData = await statusRes.json() as { status_code?: string };
      statusCode = statusData.status_code ?? 'IN_PROGRESS';
      if (statusCode === 'FINISHED') break;
      if (statusCode === 'ERROR' || statusCode === 'EXPIRED') break;
    }

    if (statusCode !== 'FINISHED') {
      return res.status(502).json({
        error: 'Errore elaborazione media Instagram',
        detail: `Status: ${statusCode}`,
      });
    }

    // 5. Pubblica la storia
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${IG_ACCOUNT_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: PAGE_TOKEN,
        }),
      }
    );
    const publishData = await publishRes.json() as { id?: string; error?: { message: string } };

    if (!publishRes.ok || !publishData.id) {
      return res.status(502).json({
        error: 'Errore pubblicazione storia Instagram',
        detail: publishData.error?.message,
      });
    }

    return res.status(200).json({ success: true, mediaId: publishData.id });
  } finally {
    // 6. Elimina l'immagine temporanea da Supabase
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/temp-posters/${filename}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SERVICE_KEY}` },
      }
    ).catch(() => { /* ignora errori di cleanup */ });
  }
}
