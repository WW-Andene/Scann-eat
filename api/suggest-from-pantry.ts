/**
 * Vercel Function: POST /api/suggest-from-pantry
 * Body: { pantry: string[] }
 * Response: SuggestedRecipes  (see ocr-parser.ts)
 *
 * Pantry-first recipe search — given the ingredients the user already
 * has, propose recipes that use most of them + standard pantry staples.
 *
 * GROQ_API_KEY must be set in Vercel project env vars.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

import { suggestRecipesFromPantry } from '../ocr-parser.ts';

export const config = { runtime: 'nodejs', maxDuration: 30 };

const MAX_BODY_BYTES = 64 * 1024;

async function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error(`Body too large (>${MAX_BODY_BYTES} bytes)`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJSON(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'Method not allowed' });
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw.toString('utf8')) as { pantry?: string[] };
    const pantry = (Array.isArray(body.pantry) ? body.pantry : [])
      .filter((s) => typeof s === 'string' && s.trim().length > 0)
      .slice(0, 20);
    if (pantry.length === 0) return sendJSON(res, 400, { error: 'Empty pantry' });

    const result = await suggestRecipesFromPantry(pantry);
    return sendJSON(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/suggest-from-pantry]', message);
    const publicMessage =
      /body too large/i.test(message) ? 'Request body too large'
      : /JSON/i.test(message) ? 'Invalid JSON body'
      : 'Pantry suggestion failed';
    return sendJSON(res, 500, { error: publicMessage });
  }
}
