import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/publish-facebook
 * Body: { imageBase64: string, caption: string }
 *
 * 1. Carica la foto su Facebook tramite Graph API
 * 2. Pubblica il post sulla pagina Sinagra Calcio
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, caption } = req.body as { imageBase64?: string; caption?: string };

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const PAGE_ID    = process.env.FB_PAGE_ID;
  const PAGE_TOKEN = process.env.FB_PAGE_TOKEN;

  if (!PAGE_ID || !PAGE_TOKEN) {
    return res.status(500).json({ error: 'Facebook credentials not configured' });
  }

  try {
    // Converti base64 in Blob per l'upload
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 1. Upload foto (published: false → non pubblica subito)
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('source', blob, 'poster.png');
    formData.append('published', 'false');
    if (caption) formData.append('message', caption);
    formData.append('access_token', PAGE_TOKEN);

    const uploadRes = await fetch(
      `https://graph.facebook.com/v21.0/${PAGE_ID}/photos`,
      { method: 'POST', body: formData }
    );
    const uploadData = await uploadRes.json() as { id?: string; error?: { message: string } };

    if (!uploadRes.ok || !uploadData.id) {
      return res.status(502).json({
        error: 'Errore upload foto su Facebook',
        detail: uploadData.error?.message,
      });
    }

    const photoId = uploadData.id;

    // 2. Pubblica il post con la foto allegata
    const postRes = await fetch(
      `https://graph.facebook.com/v21.0/${PAGE_ID}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: caption ?? '',
          attached_media: [{ media_fbid: photoId }],
          access_token: PAGE_TOKEN,
        }),
      }
    );
    const postData = await postRes.json() as { id?: string; error?: { message: string } };

    if (!postRes.ok || !postData.id) {
      return res.status(502).json({
        error: 'Errore pubblicazione post su Facebook',
        detail: postData.error?.message,
      });
    }

    return res.status(200).json({ success: true, postId: postData.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto';
    return res.status(500).json({ error: message });
  }
}
