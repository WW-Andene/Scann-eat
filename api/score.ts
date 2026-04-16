/**
 * Vercel Function: POST /api/score
 * Body: { imageBase64: string, mime?: string }
 * Response: { product, audit, warnings }
 *
 * GROQ_API_KEY must be set in Vercel project env vars.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

import { parseLabel } from '../ocr-parser.ts';
import { scoreProduct } from '../scoring-engine.ts';

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // Pro plan only; Hobby silently caps at 10s
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
      imageBase64?: string;
      mime?: string;
    };
    if (!body.imageBase64) {
      return sendJSON(res, 400, { error: 'Missing imageBase64' });
    }

    const { product, warnings } = await parseLabel({
      base64: body.imageBase64,
      mime: body.mime ?? 'image/jpeg',
    });
    const audit = scoreProduct(product);

    return sendJSON(res, 200, { product, audit, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/score]', message);
    return sendJSON(res, 500, { error: message });
  }
}
