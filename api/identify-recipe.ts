/**
 * Vercel Function: POST /api/identify-recipe
 * Body: { images: [{ base64, mime? }, ...] }
 * Response: IdentifiedRecipe  { name, servings, ingredients[], steps[], cook_time_min }
 *
 * Sibling of /api/identify-menu, but for recipe cards / cookbook pages /
 * handwritten recipes. The user photographs a recipe; the LLM extracts
 * the structured shape our recipe editor can pre-fill.
 *
 * GROQ_API_KEY must be set in Vercel project env vars.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

import { identifyRecipe } from '../ocr-parser.ts';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
};

const MAX_BODY_BYTES = 12 * 1024 * 1024;

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
  if (req.method !== 'POST') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }
  try {
    const raw = await readBody(req);
    const body = JSON.parse(raw.toString('utf8')) as {
      images?: Array<{ base64: string; mime?: string }>;
    };
    const images = (body.images ?? [])
      .filter((i) => typeof i?.base64 === 'string' && i.base64.length > 0)
      .map((i) => ({ base64: i.base64, mime: i.mime ?? 'image/jpeg' }));
    if (images.length === 0) return sendJSON(res, 400, { error: 'Missing images' });

    const result = await identifyRecipe(images);
    return sendJSON(res, 200, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/identify-recipe]', message);
    const publicMessage =
      /body too large/i.test(message) ? 'Request body too large'
      : /JSON/i.test(message) ? 'Invalid JSON body'
      : 'Recipe identification failed';
    return sendJSON(res, 500, { error: publicMessage });
  }
}
