import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

const STATE_KEY = 'xp:state:v1';

function deriveAuthToken(key: string): string {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h) ^ key.charCodeAt(i);
  }
  return `v1:${(h >>> 0).toString(36)}:${key.length}`;
}

function getExpectedToken(): string {
  const key = process.env.ACCESS_KEY || process.env.VITE_ACCESS_KEY || 'productivity2026';
  return deriveAuthToken(key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== getExpectedToken()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const state = await kv.get(STATE_KEY);
      return res.status(200).json({ state: state ?? null });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid body' });
      }
      const stamped = { ...body, lastModified: Date.now() };
      await kv.set(STATE_KEY, stamped);
      return res.status(200).json({ state: stamped });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'Storage error', detail: message });
  }
}
