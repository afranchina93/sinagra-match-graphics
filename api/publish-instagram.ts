import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/publish-instagram
 * Body: { imageBase64: string }
 *
 * 1. Carica l'immagine su Supabase Storage (bucket pubblico temp-posters)
 * 2. Crea un media container Instagram (STORIES)
 * 3. Pubblica la storia
 * 4. Elimina l'immagine da Supabase
 */
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

  const filename = `story-${Date.now()}.png`;
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // 1. Upload su Supabase Storage
  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/temp-posters/${filename}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: buffer,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return res.status(502).json({ error: 'Errore upload Supabase', detail: err });
  }

  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/temp-posters/${filename}`;

  try {
    // 2. Crea media container Instagram Stories
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

    // 3. Pubblica la storia
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
    // 4. Elimina l'immagine temporanea da Supabase
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/temp-posters/${filename}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SERVICE_KEY}` },
      }
    ).catch(() => { /* ignora errori di cleanup */ });
  }
}
